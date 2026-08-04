import { Router } from "express";
import { db } from "@workspace/db";
import { orders, orderItems, products } from "@workspace/db/schema";
import { eq, desc, sql } from "drizzle-orm";

const router = Router();

/**
 * Serialize a raw DB order row + its items into the API shape.
 * Converts numeric (string) columns into real numbers and maps
 * createdAt -> timestamp (ms) so the frontend receives consistent types.
 */
function serializeOrder(orderRow: any, items: any[] = []) {
  const createdAt = orderRow.createdAt
    ? new Date(orderRow.createdAt).getTime()
    : Date.now();

  return {
    id: orderRow.id,
    orderNumber: orderRow.orderNumber,
    timestamp: createdAt,
    items: items.map((item) => ({
      productId: item.productId,
      name: item.name,
      qty: item.qty,
      price: Number(item.price),
    })),
    subtotal: Number(orderRow.subtotal),
    tax: Number(orderRow.tax),
    total: Number(orderRow.total),
    paymentMethod: orderRow.paymentMethod,
    tableId: orderRow.tableId,
    serviceType: orderRow.serviceType,
  };
}

/** Load the items for a given order (deterministic order by id). */
async function loadOrderItems(orderId: string) {
  return db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId))
    .orderBy(desc(orderItems.id));
}

// GET /api/orders
router.get("/", async (_req, res) => {
  try {
    const rows = await db.select().from(orders).orderBy(desc(orders.createdAt));
    const result = [];

    for (const row of rows) {
      const items = await loadOrderItems(row.id);
      result.push(serializeOrder(row, items));
    }

    res.json(result);
  } catch (error) {
    console.error("GET /orders failed:", error);
    res.status(500).json({ error: "Failed to load orders" });
  }
});

// POST /api/orders
router.post("/", async (req, res) => {
  try {
    const { items, tableId, serviceType, paymentMethod } = req.body as {
      items: { productId: string; qty: number }[];
      tableId: string;
      serviceType?: string;
      paymentMethod: string;
    };

    if (!items?.length || !tableId || !paymentMethod) {
      return res.status(400).json({
        error: "items, tableId and paymentMethod are required",
      });
    }

    const orderLines: {
      productId: string;
      name: string;
      qty: number;
      price: number;
    }[] = [];

    // Validate stock
    for (const item of items) {
      const productRows = await db
        .select()
        .from(products)
        .where(eq(products.id, item.productId));

      const product = productRows[0];

      if (!product) {
        return res.status(400).json({
          error: `Product ${item.productId} not found`,
        });
      }

      if (product.stock < item.qty) {
        return res.status(400).json({
          error: `Insufficient stock for ${product.name} (available: ${product.stock})`,
        });
      }

      orderLines.push({
        productId: product.id,
        name: product.name,
        qty: item.qty,
        price: Number(product.price),
      });
    }

    // Totals
    const subtotal = orderLines.reduce(
      (sum, item) => sum + item.price * item.qty,
      0,
    );

    const tax = subtotal * 0.05;
    const total = subtotal + tax;

    const orderNumber = `#${Date.now()}`;

    // Run the order creation atomically so a failure mid-way can't leave
    // partial data (stock deducted but no order, or order without items).
    const order = await db.transaction(async (tx) => {
      // Deduct stock
      for (const item of items) {
        const productRows = await tx
          .select()
          .from(products)
          .where(eq(products.id, item.productId));

        const product = productRows[0];

        await tx
          .update(products)
          .set({
            stock: product.stock - item.qty,
          })
          .where(eq(products.id, item.productId));
      }

      // Create order (store as numeric strings — Postgres numeric columns)
      const insertedOrder = await tx
        .insert(orders)
        .values({
          orderNumber,
          subtotal: subtotal.toFixed(2),
          tax: tax.toFixed(2),
          total: total.toFixed(2),
          paymentMethod: String(paymentMethod),
          tableId: String(tableId),
          serviceType: String(serviceType ?? "dine-in"),
        })
        .returning();

      const createdOrder = insertedOrder[0];

      // Create order items
      await tx.insert(orderItems).values(
        orderLines.map((item) => ({
          orderId: createdOrder.id,
          productId: item.productId,
          name: item.name,
          qty: item.qty,
          price: item.price.toFixed(2),
        })),
      );

      return createdOrder;
    });

    res.status(201).json(serializeOrder(order, orderLines));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create order" });
  }
});

// GET /api/orders/:id
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const rows = await db.select().from(orders).where(eq(orders.id, id));
    if (!rows[0]) {
      return res.status(404).json({ error: "Order not found" });
    }
    const items = await loadOrderItems(id);
    res.json(serializeOrder(rows[0], items));
  } catch (error) {
    console.error("GET /orders/:id failed:", error);
    res.status(500).json({ error: "Failed to load order" });
  }
});

// PUT /api/orders/:id — update mutable fields (payment method, table, service type)
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentMethod, tableId, serviceType } = req.body as {
      paymentMethod?: string;
      tableId?: string;
      serviceType?: string;
    };

    const rows = await db.select().from(orders).where(eq(orders.id, id));
    if (!rows[0]) {
      return res.status(404).json({ error: "Order not found" });
    }

    const updates: Partial<{ paymentMethod: string; tableId: string; serviceType: string }> = {};
    if (paymentMethod !== undefined) updates.paymentMethod = String(paymentMethod);
    if (tableId !== undefined) updates.tableId = String(tableId);
    if (serviceType !== undefined) updates.serviceType = String(serviceType);

    const items = await loadOrderItems(id);

    if (Object.keys(updates).length === 0) {
      return res.json(serializeOrder(rows[0], items));
    }

    const updated = await db
      .update(orders)
      .set(updates)
      .where(eq(orders.id, id))
      .returning();

    res.json(serializeOrder(updated[0], items));
  } catch (error) {
    console.error("PUT /orders/:id failed:", error);
    res.status(500).json({ error: "Failed to update order" });
  }
});

// DELETE /api/orders/:id — cancel order and restore product stock
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const orderRows = await db.select().from(orders).where(eq(orders.id, id));
    if (!orderRows[0]) {
      return res.status(404).json({ error: "Order not found" });
    }

    const items = await loadOrderItems(id);

    await db.transaction(async (tx) => {
      // Restore stock for each line item
      for (const item of items) {
        await tx
          .update(products)
          .set({ stock: sql`${products.stock} + ${item.qty}` })
          .where(eq(products.id, item.productId));
      }
      // Delete order — cascades to order_items
      await tx.delete(orders).where(eq(orders.id, id));
    });

    res.status(204).end();
  } catch (error) {
    console.error("DELETE /orders/:id failed:", error);
    res.status(500).json({ error: "Failed to delete order" });
  }
});

export default router;
