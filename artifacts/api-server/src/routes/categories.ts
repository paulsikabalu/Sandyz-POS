import { Router } from "express";
import { db, type Category } from "../data/store";

const router = Router();

// GET /api/categories
router.get("/", async (_req, res) => {
  try {
    const categories = db.getCategories();
    res.json(categories);
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

    const newCategory: Category = {
      id: `cat_${now}`,
      section: String(section),
      name: String(name),
      description: String(description ?? ""),
      sortOrder: Number(sortOrder ?? 0),
      createdAt: now,
      updatedAt: now,
    };

    const categories = db.getCategories();
    categories.push(newCategory);
    db.saveCategories(categories);

    res.status(201).json(newCategory);
  } catch (error) {
    console.error("POST /categories failed:", error);
    res.status(500).json({ error: "Failed to create category" });
  }
});

// PUT /api/categories/:id
router.put("/:id", async (req, res) => {
  try {
    const { section, name, description, sortOrder } = req.body;
    const categories = db.getCategories();
    const index = categories.findIndex(c => c.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ error: "Category not found" });
    }

    const existing = categories[index];
    const updated: Category = {
      ...existing,
      section: section !== undefined ? String(section) : existing.section,
      name: name !== undefined ? String(name) : existing.name,
      description: description !== undefined ? String(description) : existing.description,
      sortOrder: sortOrder !== undefined ? Number(sortOrder) : existing.sortOrder,
      updatedAt: Date.now(),
    };

    categories[index] = updated;
    db.saveCategories(categories);

    res.json(updated);
  } catch (error) {
    console.error("PUT /categories failed:", error);
    res.status(500).json({ error: "Failed to update category" });
  }
});

// DELETE /api/categories/:id
router.delete("/:id", async (req, res) => {
  try {
    const categories = db.getCategories();
    const index = categories.findIndex(c => c.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ error: "Category not found" });
    }

    categories.splice(index, 1);
    db.saveCategories(categories);

    res.status(204).send();
  } catch (error) {
    console.error("DELETE /categories failed:", error);
    res.status(500).json({ error: "Failed to delete category" });
  }
});

export default router;
