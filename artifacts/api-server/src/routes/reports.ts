import { Router } from "express";
import { db } from "@workspace/db";
import { orders, orderItems, products } from "@workspace/db/schema";
import { authenticate, authorize } from "../middlewares/auth";
import { gte, lte, and, desc, eq } from "drizzle-orm";

const router = Router();

// All report routes require authentication
router.use(authenticate);

/**
 * GET /api/reports/sales
 * Returns sales report data with optional date range.
 * Query params: startDate (epoch ms), endDate (epoch ms)
 */
router.get("/sales", authorize("admin", "manager"), async (req, res) => {
  try {
    const startDate = req.query.startDate
      ? new Date(Number(req.query.startDate))
      : new Date(0);
    const endDate = req.query.endDate
      ? new Date(Number(req.query.endDate))
      : new Date();

    // Single JOIN query: orders + their items, filtered by date range
    const rows = await db
      .select({ order: orders, item: orderItems })
      .from(orders)
      .leftJoin(orderItems, eq(orderItems.orderId, orders.id))
      .where(and(gte(orders.createdAt, startDate), lte(orders.createdAt, endDate)))
      .orderBy(desc(orders.createdAt));

    // Group rows into order → items map
    const orderMap = new Map<
      string,
      { order: typeof orders.$inferSelect; items: typeof orderItems.$inferSelect[] }
    >();
    for (const row of rows) {
      if (!orderMap.has(row.order.id)) {
        orderMap.set(row.order.id, { order: row.order, items: [] });
      }
      if (row.item) {
        orderMap.get(row.order.id)!.items.push(row.item);
      }
    }

    const orderList = Array.from(orderMap.values());

    // ── Summary ───────────────────────────────────────────────────────────
    const totalOrders = orderList.length;
    const totalRevenue = orderList.reduce(
      (sum, { order }) => sum + Number(order.total),
      0
    );
    const totalItems = orderList.reduce(
      (sum, { items }) => sum + items.reduce((s, i) => s + i.qty, 0),
      0
    );

    // ── Payment breakdown ──────────────────────────────────────────────────
    const paymentBreakdown: Record<string, number> = {};
    for (const { order } of orderList) {
      paymentBreakdown[order.paymentMethod] =
        (paymentBreakdown[order.paymentMethod] ?? 0) + Number(order.total);
    }

    // ── Daily breakdown ────────────────────────────────────────────────────
    const dailyMap: Record<string, { orders: number; revenue: number }> = {};
    for (const { order } of orderList) {
      const dateKey = new Date(order.createdAt).toISOString().split("T")[0];
      if (!dailyMap[dateKey]) dailyMap[dateKey] = { orders: 0, revenue: 0 };
      dailyMap[dateKey].orders += 1;
      dailyMap[dateKey].revenue += Number(order.total);
    }

    // ── Top products ───────────────────────────────────────────────────────
    const productSales: Record<
      string,
      { name: string; qty: number; revenue: number }
    > = {};
    for (const { items } of orderList) {
      for (const item of items) {
        if (!productSales[item.productId]) {
          productSales[item.productId] = { name: item.name, qty: 0, revenue: 0 };
        }
        productSales[item.productId].qty += item.qty;
        productSales[item.productId].revenue +=
          Number(item.price) * item.qty;
      }
    }

    const topProducts = Object.entries(productSales)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);

    res.json({
      summary: {
        totalOrders,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalItems,
        averageOrderValue:
          totalOrders > 0
            ? Math.round((totalRevenue / totalOrders) * 100) / 100
            : 0,
      },
      paymentBreakdown,
      dailySales: Object.entries(dailyMap)
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      topProducts,
    });
  } catch (error) {
    console.error("GET /reports/sales failed:", error);
    res.status(500).json({ error: "Failed to generate sales report" });
  }
});

/**
 * GET /api/reports/stock
 * Returns stock report data from the products table.
 */
router.get("/stock", authorize("admin", "manager"), async (_req, res) => {
  try {
    const productList = await db.select().from(products);

    const totalProducts = productList.length;
    const totalStock = productList.reduce((sum, p) => sum + p.stock, 0);
    const outOfStock = productList.filter((p) => p.stock === 0).length;
    const lowStock = productList.filter(
      (p) => p.stock > 0 && p.stock <= 5
    ).length;

    // By section
    const sectionBreakdown: Record<
      string,
      { count: number; totalStock: number; outOfStock: number; lowStock: number }
    > = {};
    for (const product of productList) {
      if (!sectionBreakdown[product.section]) {
        sectionBreakdown[product.section] = {
          count: 0,
          totalStock: 0,
          outOfStock: 0,
          lowStock: 0,
        };
      }
      sectionBreakdown[product.section].count += 1;
      sectionBreakdown[product.section].totalStock += product.stock;
      if (product.stock === 0)
        sectionBreakdown[product.section].outOfStock += 1;
      if (product.stock > 0 && product.stock <= 5)
        sectionBreakdown[product.section].lowStock += 1;
    }

    res.json({
      summary: {
        totalProducts,
        totalStock,
        outOfStock,
        lowStock,
        stockHealthPercentage:
          totalProducts > 0
            ? Math.round(
                ((totalProducts - outOfStock - lowStock) / totalProducts) * 100
              )
            : 0,
      },
      sectionBreakdown,
      lowStockItems: productList
        .filter((p) => p.stock > 0 && p.stock <= 5)
        .sort((a, b) => a.stock - b.stock)
        .map((p) => ({ ...p, price: Number(p.price) })),
      outOfStockItems: productList
        .filter((p) => p.stock === 0)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((p) => ({ ...p, price: Number(p.price) })),
    });
  } catch (error) {
    console.error("GET /reports/stock failed:", error);
    res.status(500).json({ error: "Failed to generate stock report" });
  }
});

/**
 * GET /api/reports/orders
 * Returns paginated order history from the database.
 * Query params: page, limit, startDate, endDate
 */
router.get(
  "/orders",
  authorize("admin", "manager", "cashier"),
  async (req, res) => {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
      const startDate = req.query.startDate
        ? new Date(Number(req.query.startDate))
        : new Date(0);
      const endDate = req.query.endDate
        ? new Date(Number(req.query.endDate))
        : new Date();

      // Fetch orders in date range (newest first) with items via JOIN
      const rows = await db
        .select({ order: orders, item: orderItems })
        .from(orders)
        .leftJoin(orderItems, eq(orderItems.orderId, orders.id))
        .where(
          and(gte(orders.createdAt, startDate), lte(orders.createdAt, endDate))
        )
        .orderBy(desc(orders.createdAt));

      // Group into order objects
      const orderMap = new Map<
        string,
        { order: typeof orders.$inferSelect; items: typeof orderItems.$inferSelect[] }
      >();
      for (const row of rows) {
        if (!orderMap.has(row.order.id)) {
          orderMap.set(row.order.id, { order: row.order, items: [] });
        }
        if (row.item) orderMap.get(row.order.id)!.items.push(row.item);
      }

      const allOrders = Array.from(orderMap.values());
      const total = allOrders.length;
      const totalPages = Math.max(1, Math.ceil(total / limit));
      const start = (page - 1) * limit;
      const paginated = allOrders.slice(start, start + limit);

      res.json({
        orders: paginated.map(({ order, items }) => ({
          id: order.id,
          orderNumber: order.orderNumber,
          timestamp: new Date(order.createdAt).getTime(),
          items: items.map((i) => ({
            productId: i.productId,
            name: i.name,
            qty: i.qty,
            price: Number(i.price),
          })),
          subtotal: Number(order.subtotal),
          tax: Number(order.tax),
          total: Number(order.total),
          paymentMethod: order.paymentMethod,
          tableId: order.tableId,
          serviceType: order.serviceType,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      });
    } catch (error) {
      console.error("GET /reports/orders failed:", error);
      res.status(500).json({ error: "Failed to load orders" });
    }
  }
);

export default router;
