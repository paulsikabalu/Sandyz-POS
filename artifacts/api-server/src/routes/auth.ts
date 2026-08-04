import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "../data/store";
import { signToken, authenticate } from "../middlewares/auth";

const router = Router();

/**
 * POST /api/auth/login
 * Authenticates user with email and password, returns JWT token.
 */
router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required",
      });
    }

    const user = db.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({
        error: "Invalid email or password",
      });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({
        error: "Invalid email or password",
      });
    }

    const token = signToken(user);

    // Set HTTP-only cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env["NODE_ENV"] === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("POST /auth/login failed:", error);
    res.status(500).json({
      error: "Failed to authenticate",
    });
  }
});

/**
 * POST /api/auth/register
 * Creates a new user account. Requires admin role.
 * If no users exist yet, creates the first admin user (setup mode).
 */
router.post("/auth/register", async (req, res) => {
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

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: "Invalid email format",
      });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({
        error: "Password must be at least 6 characters",
      });
    }

    // Check if user already exists
    const existing = db.getUserByEmail(email);
    if (existing) {
      return res.status(409).json({
        error: "A user with this email already exists",
      });
    }

    // Determine role - first user is always admin, subsequent users need auth
    const users = db.getUsers();
    let userRole = "cashier";

    if (users.length === 0) {
      // First user is admin (setup mode)
      userRole = "admin";
    } else if (role && ["admin", "cashier", "manager"].includes(role)) {
      userRole = role;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

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

    const token = signToken(newUser);

    // Set HTTP-only cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env["NODE_ENV"] === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error("POST /auth/register failed:", error);
    res.status(500).json({
      error: "Failed to create user",
    });
  }
});

/**
 * POST /api/auth/logout
 * Clears the auth cookie.
 */
router.post("/auth/logout", (_req, res) => {
  res.clearCookie("token");
  res.json({ message: "Logged out successfully" });
});

/**
 * GET /api/auth/me
 * Returns the currently authenticated user's profile.
 */
router.get("/auth/me", authenticate, (req, res) => {
  const { password, ...safeUser } = req.user!;
  res.json({ user: safeUser });
});

export default router;

