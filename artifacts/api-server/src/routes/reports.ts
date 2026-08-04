import { Router } from "express";
import { db } from "../data/store";
import { authenticate, authorize } from "../middlewares/auth";

const router = Router();

// All report routes require authentication
router.use(authenticate);

/**
 * GET /api/reports/sales
 * Returns sales report data with optional date range.
 * Query params: startDate (timestamp), endDate (timestamp)
 */
router.get("/sales", authorize("admin", "manager"), (_req, res) => {
  try {
    const orders = db.getOrders();
    const startDate = _req.query.startDate
      ? Number(_req.query.startDate)
      : 0;
    const endDate = _req.query.endDate
      ? Number(_req.query.endDate)
      : Date.now();

    const filteredOrders = orders.filter(
      (o) => o.timestamp >= startDate && o.timestamp <= endDate
    );

// Summary
    const totalOrders = filteredOrders.length;
    const totalRevenue = filteredOrders.reduce(
      (sum, o) => sum + Number(o.total),
      0
    );
    const totalItems = filteredOrders.reduce(
      (sum, o) => sum + o.items.reduce((s, i) => s + i.qty, 0),
      0
    );

    // Payment method breakdown
    const paymentBreakdown: Record<string, number> = {};
    for (const order of filteredOrders) {
      paymentBreakdown[order.paymentMethod] =
        (paymentBreakdown[order.paymentMethod] ?? 0) + Number(order.total);
    }

    // Daily breakdown
    const dailyMap: Record<string, { orders: number; revenue: number }> = {};
    for (const order of filteredOrders) {
      const dateKey = new Date(order.timestamp).toISOString().split("T")[0];
      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = { orders: 0, revenue: 0 };
      }
      dailyMap[dateKey].orders += 1;
      dailyMap[dateKey].revenue += Number(order.total);
    }

    // Top products
    const productSales: Record<string, { name: string; qty: number; revenue: number }> = {};
    for (const order of filteredOrders) {
      for (const item of order.items) {
        if (!productSales[item.productId]) {
          productSales[item.productId] = {
            name: item.name,
            qty: 0,
            revenue: 0,
          };
        }
        productSales[item.productId].qty += item.qty;
        productSales[item.productId].revenue += Number(item.price) * item.qty;
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
        averageOrderValue: totalOrders > 0
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
 * Returns stock report data.
 */
router.get("/stock", authorize("admin", "manager"), (_req, res) => {
  try {
    const products = db.getProducts();

    const totalProducts = products.length;
    const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
    const outOfStock = products.filter((p) => p.stock === 0).length;
    const lowStock = products.filter((p) => p.stock > 0 && p.stock <= 5).length;

    // By section
    const sectionBreakdown: Record<
      string,
      { count: number; totalStock: number; outOfStock: number; lowStock: number }
    > = {};
    for (const product of products) {
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
      if (product.stock === 0) sectionBreakdown[product.section].outOfStock += 1;
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
      lowStockItems: products
        .filter((p) => p.stock > 0 && p.stock <= 5)
        .sort((a, b) => a.stock - b.stock),
      outOfStockItems: products
        .filter((p) => p.stock === 0)
        .sort((a, b) => a.name.localeCompare(b.name)),
    });
  } catch (error) {
    console.error("GET /reports/stock failed:", error);
    res.status(500).json({ error: "Failed to generate stock report" });
  }
});

/**
 * GET /api/reports/orders
 * Returns order history with pagination.
 * Query params: page, limit, status, startDate, endDate
 */
router.get("/orders", authorize("admin", "manager", "cashier"), (req, res) => {
  try {
    const orders = db.getOrders();
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const startDate = req.query.startDate ? Number(req.query.startDate) : 0;
    const endDate = req.query.endDate ? Number(req.query.endDate) : Date.now();

    let filtered = orders.filter(
      (o) => o.timestamp >= startDate && o.timestamp <= endDate
    );

    // Sort by newest first
    filtered.sort((a, b) => b.timestamp - a.timestamp);

    const total = filtered.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    res.json({
      orders: paginated,
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
});

export default router;

