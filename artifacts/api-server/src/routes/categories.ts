import { Router } from "express";
import { db } from "@workspace/db";
import { categories } from "@workspace/db/schema";
import { eq, asc } from "drizzle-orm";

const router = Router();

// GET /api/categories
router.get("/", async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(categories)
      .orderBy(asc(categories.sortOrder), asc(categories.name));
    res.json(rows);
  } catch (error) {
    console.error("GET /categories failed:", error);
    res.status(500).json({ error: "Failed to load categories" });
  }
});

// POST /api/categories
router.post("/", async (req, res) => {
  try {
    const { section, name, description, sortOrder } = req.body;

    if (!section || !name) {
      return res.status(400).json({ error: "section and name are required" });
    }

    const now = Date.now();

    const [created] = await db
      .insert(categories)
      .values({
        id: `cat_${now}_${Math.random().toString(36).slice(2, 8)}`,
        section: String(section),
        name: String(name),
        description: String(description ?? ""),
        sortOrder: Number(sortOrder ?? 0),
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    res.status(201).json(created);
  } catch (error) {
    console.error("POST /categories failed:", error);
    res.status(500).json({ error: "Failed to create category" });
  }
});

// PUT /api/categories/:id
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { section, name, description, sortOrder } = req.body;

    const existing = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id));

    if (!existing[0]) {
      return res.status(404).json({ error: "Category not found" });
    }

    const updates: Partial<{
      section: string;
      name: string;
      description: string;
      sortOrder: number;
      updatedAt: number;
    }> = { updatedAt: Date.now() };

    if (section !== undefined) updates.section = String(section);
    if (name !== undefined) updates.name = String(name);
    if (description !== undefined) updates.description = String(description);
    if (sortOrder !== undefined) updates.sortOrder = Number(sortOrder);

    const [updated] = await db
      .update(categories)
      .set(updates)
      .where(eq(categories.id, id))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error("PUT /categories/:id failed:", error);
    res.status(500).json({ error: "Failed to update category" });
  }
});

// DELETE /api/categories/:id
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id));

    if (!existing[0]) {
      return res.status(404).json({ error: "Category not found" });
    }

    await db.delete(categories).where(eq(categories.id, id));

    res.status(204).end();
  } catch (error) {
    console.error("DELETE /categories/:id failed:", error);
    res.status(500).json({ error: "Failed to delete category" });
  }
});

export default router;
