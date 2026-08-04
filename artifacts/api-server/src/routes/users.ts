import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "../data/store";
import { authenticate, authorize } from "../middlewares/auth";

const router = Router();

// All user routes require authentication and admin role
router.use(authenticate);
router.use(authorize("admin"));

/**
 * GET /api/users
 * Returns all users (without passwords).
 */
router.get("/", (_req, res) => {
  try {
    const users = db.getUsers().map(({ password, ...safe }) => safe);
    res.json(users);
  } catch (error) {
    console.error("GET /users failed:", error);
    res.status(500).json({ error: "Failed to load users" });
  }
});

/**
 * GET /api/users/:id
 * Returns a single user (without password).
 */
router.get("/:id", (req, res) => {
  try {
    const user = db.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const { password, ...safeUser } = user;
    res.json(safeUser);
  } catch (error) {
    console.error("GET /users/:id failed:", error);
    res.status(500).json({ error: "Failed to load user" });
  }
});

/**
 * POST /api/users
 * Creates a new user (admin only).
 */
router.post("/", async (req, res) => {
  try {
    const { email, password, name, role } = req.body as {
      email?: string;
      password?: string;
      name?: string;
      role?: string;
    };

    if (!email || !password || !name) {
      return res.status(400).json({
        error: "Email, password and name are required",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: "Password must be at least 6 characters",
      });
    }

    const existing = db.getUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: "Email already exists" });
    }

    const validRoles = ["admin", "cashier", "manager"];
    const userRole = role && validRoles.includes(role) ? role : "cashier";

    const hashedPassword = await bcrypt.hash(password, 12);

    const users = db.getUsers();
    const newUser = {
      id: `u_${Date.now()}`,
      email: email.toLowerCase(),
      password: hashedPassword,
      name,
      role: userRole as "admin" | "cashier" | "manager",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    users.push(newUser);
    db.saveUsers(users);

    const { password: _, ...safeUser } = newUser;
    res.status(201).json(safeUser);
  } catch (error) {
    console.error("POST /users failed:", error);
    res.status(500).json({ error: "Failed to create user" });
  }
});

/**
 * PUT /api/users/:id
 * Updates a user's details.
 */
router.put("/:id", async (req, res) => {
  try {
    const { email, name, role, currentPassword, newPassword } = req.body as {
      email?: string;
      name?: string;
      role?: string;
      currentPassword?: string;
      newPassword?: string;
    };

    const users = db.getUsers();
    const index = users.findIndex((u) => u.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = users[index];

    // If changing password, verify current password
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({
          error: "Current password is required to set a new password",
        });
      }
      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({
          error: "New password must be at least 6 characters",
        });
      }
      users[index].password = await bcrypt.hash(newPassword, 12);
    }

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Invalid email format" });
      }
      const duplicate = users.find(
        (u) => u.email.toLowerCase() === email.toLowerCase() && u.id !== user.id
      );
      if (duplicate) {
        return res.status(409).json({ error: "Email already in use" });
      }
      users[index].email = email.toLowerCase();
    }

    if (name) users[index].name = name;
    if (role && ["admin", "cashier", "manager"].includes(role)) {
      users[index].role = role as "admin" | "cashier" | "manager";
    }

    users[index].updatedAt = Date.now();
    db.saveUsers(users);

    const { password: _, ...safeUser } = users[index];
    res.json(safeUser);
  } catch (error) {
    console.error("PUT /users/:id failed:", error);
    res.status(500).json({ error: "Failed to update user" });
  }
});

/**
 * DELETE /api/users/:id
 * Deletes a user (cannot delete yourself).
 */
router.delete("/:id", (req, res) => {
  try {
    if (req.params.id === req.user!.id) {
      return res.status(400).json({
        error: "Cannot delete your own account",
      });
    }

    const users = db.getUsers();
    const index = users.findIndex((u) => u.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ error: "User not found" });
    }

    users.splice(index, 1);
    db.saveUsers(users);

    res.status(204).send();
  } catch (error) {
    console.error("DELETE /users/:id failed:", error);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

export default router;

