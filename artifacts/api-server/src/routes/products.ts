import { Router } from "express";
import { db } from "@workspace/db";
import { products } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

/** Serialize a raw product row, converting numeric (string) columns to numbers. */
function serializeProduct(row: any) {
  return {
    ...row,
    price: Number(row.price),
  };
}

// GET /api/products
router.get("/", async (_req, res) => {
  try {
    const result = await db.select().from(products);

    res.json(result.map(serializeProduct));
  } catch (error) {
    console.error("GET /products failed:", error);

    res.status(500).json({
      error: "Failed to load products",
    });
  }
});

// POST /api/products
router.post("/", async (req, res) => {
  try {
    const { name, price, category, image, stock, unit, section } = req.body;

    if (!name || price == null || !category) {
      return res.status(400).json({
        error: "name, price and category are required",
      });
    }

    const newProduct = {
      id: `p_${Date.now()}`,
      name: String(name),
      price: String(price),
      category: String(category),
      section: String(section ?? "General"),
      image: String(image ?? ""),
      stock: Number(stock ?? 0),
      unit: String(unit ?? "pieces"),
    };

    await db.insert(products).values(newProduct);

    res.status(201).json(serializeProduct(newProduct));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create product" });
  }
});

// PUT /api/products/:id
router.put("/:id", async (req, res) => {
  try {
    const updates = req.body;

    const updated = await db
      .update(products)
      .set({
        ...(updates.name !== undefined && {
          name: String(updates.name),
        }),
        ...(updates.price !== undefined && {
          price: String(updates.price),
        }),
        ...(updates.category !== undefined && {
          category: String(updates.category),
        }),
        ...(updates.section !== undefined && {
          section: String(updates.section),
        }),
        ...(updates.image !== undefined && {
          image: String(updates.image),
        }),
        ...(updates.stock !== undefined && {
          stock: Number(updates.stock),
        }),
        ...(updates.unit !== undefined && {
          unit: String(updates.unit),
        }),
      })
      .where(eq(products.id, req.params.id))
      .returning();

    if (!updated.length) {
      return res.status(404).json({
        error: "Product not found",
      });
    }

    res.json(serializeProduct(updated[0]));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update product" });
  }
});

// DELETE /api/products/:id
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await db
      .delete(products)
      .where(eq(products.id, req.params.id))
      .returning();

    if (!deleted.length) {
      return res.status(404).json({
        error: "Product not found",
      });
    }

    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete product" });
  }
});

// POST /api/products/:id/stock
router.post("/:id/stock", async (req, res) => {
  try {
    const qty = Number(req.body.quantity);

    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({
        error: "quantity must be a positive number",
      });
    }

    const existing = await db
      .select()
      .from(products)
      .where(eq(products.id, req.params.id));

    if (!existing.length) {
      return res.status(404).json({
        error: "Product not found",
      });
    }

    const product = existing[0];

    const updated = await db
      .update(products)
      .set({
        stock: product.stock + qty,
      })
      .where(eq(products.id, req.params.id))
      .returning();

    res.json(serializeProduct(updated[0]));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update stock" });
  }
});

export default router;