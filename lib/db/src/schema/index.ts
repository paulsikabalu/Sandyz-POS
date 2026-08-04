import {
  pgTable,
  text,
  integer,
  timestamp,
  uuid,
  numeric,
  bigint,
} from "drizzle-orm/pg-core";

export const products = pgTable("products", {
  id: text("id").primaryKey(),

  name: text("name").notNull(),

  section: text("section").notNull(),

  category: text("category").notNull(),

  image: text("image").notNull(),

  stock: integer("stock").notNull(),

  unit: text("unit").notNull(),

  price: numeric("price", {
    precision: 10,
    scale: 2,
  }).notNull(),
});

export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),

  orderNumber: text("order_number").notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),

  subtotal: numeric("subtotal", {
    precision: 10,
    scale: 2,
  }).notNull(),

  tax: numeric("tax", {
    precision: 10,
    scale: 2,
  }).notNull(),

  total: numeric("total", {
    precision: 10,
    scale: 2,
  }).notNull(),

  paymentMethod: text("payment_method").notNull(),

  tableId: text("table_id"),

  serviceType: text("service_type"),
});

export const orderItems = pgTable("order_items", {
  id: uuid("id").defaultRandom().primaryKey(),

  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, {
      onDelete: "cascade",
    }),

  productId: text("product_id")
    .notNull()
    .references(() => products.id, {
      onDelete: "restrict",
    }),

  name: text("name").notNull(),

  qty: integer("qty").notNull(),

  price: numeric("price", {
    precision: 10,
    scale: 2,
  }).notNull(),
});

export const categories = pgTable("categories", {
  id: text("id").primaryKey(),

  section: text("section").notNull(),

  name: text("name").notNull(),

  description: text("description").notNull(),

  sortOrder: integer("sort_order").notNull(),

  // Epoch milliseconds, matching the JSON-backed Category type
  createdAt: bigint("created_at", { mode: "number" }).notNull(),

  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});

// Inferred types

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;

export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
