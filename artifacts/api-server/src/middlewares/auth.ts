import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db } from "../data/store";
import type { User, UserRole } from "../data/store";

// In production, use a proper secret from environment variables
const JWT_SECRET = process.env["JWT_SECRET"] ?? "sandyz-pos-jwt-secret-dev";
const JWT_EXPIRES_IN = "7d";

// Extend Express Request to include user info
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export type JwtPayload = {
  userId: string;
  email: string;
  role: UserRole;
};

/**
 * Sign a JWT token for the given user.
 */
export function signToken(user: User): string {
  const payload: JwtPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verify and decode a JWT token.
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Authentication middleware.
 * Extracts JWT from Authorization header or cookie and attaches user to request.
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  // Try Authorization header first, then cookie
  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.slice(7);
  }

  if (!token && req.cookies?.token) {
    token = req.cookies.token;
  }

  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  const user = db.getUserById(payload.userId);
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  req.user = user;
  next();
}

/**
 * Authorization middleware factory.
 * Returns middleware that checks if the authenticated user has one of the allowed roles.
 */
export function authorize(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        error: `Access denied. Required roles: ${roles.join(", ")}`,
      });
      return;
    }

    next();
  };
}

