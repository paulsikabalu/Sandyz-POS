import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import productsRouter from "./products.js";
import ordersRouter from "./orders.js";
import authRouter from "./auth.js";
import usersRouter from "./users.js";
import reportsRouter from "./reports.js";
import settingsRouter from "./settings.js";
import categoriesRouter from "./categories.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use('/products', productsRouter);
router.use('/orders', ordersRouter);
router.use(authRouter);
router.use('/users', usersRouter);
router.use('/reports', reportsRouter);
router.use('/settings', settingsRouter);
router.use('/categories', categoriesRouter);

export default router;
