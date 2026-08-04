import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import bcrypt from "bcryptjs";
import router from "./routes";
import { logger } from "./lib/logger";
import { db } from "./data/store";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Seed default data if no users exist
(async () => {
  try {
    const users = db.getUsers();
    if (users.length === 0) {
      // Seed default users with different roles
      const adminPass = await bcrypt.hash("admin123", 12);
      const cashierPass = await bcrypt.hash("cashier123", 12);
      const managerPass = await bcrypt.hash("manager123", 12);

      const seedUsers = [
        {
          id: "u_admin",
          email: "admin@sandyz.com",
          password: adminPass,
          name: "Admin User",
          role: "admin" as const,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: "u_cashier1",
          email: "cashier@sandyz.com",
          password: cashierPass,
          name: "Cashier User",
          role: "cashier" as const,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: "u_manager1",
          email: "manager@sandyz.com",
          password: managerPass,
          name: "Manager User",
          role: "manager" as const,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      db.saveUsers(seedUsers);
      logger.info(
        {
          users: seedUsers.map(u => ({ email: u.email, role: u.role, password: u.id === "u_admin" ? "admin123" : u.id === "u_cashier1" ? "cashier123" : "manager123" })),
        },
        "Default users created",
      );
    }

    // Seed default settings if none exist
    const existingSettings = db.getSettings();
    if (existingSettings.length === 0) {
      const defaultSettings = [
        { key: "tax_rate", value: "5" },
        { key: "currency", value: "K" },
        { key: "store_name", value: "Sandyz Restaurant" },
        { key: "default_service_type", value: "dine-in" },
        { key: "low_stock_threshold", value: "5" },
      ];
      for (const s of defaultSettings) {
        db.upsertSetting(s.key, s.value);
      }
      logger.info({ settings: defaultSettings }, "Default settings created");
    }
  } catch (error) {
    logger.error({ error }, "Failed to seed default data");
  }
})();

app.use("/api", router);

export default app;
