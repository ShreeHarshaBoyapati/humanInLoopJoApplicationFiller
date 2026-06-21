import express from 'express';
import DashboardController from '../controllers/dashboard-controller.js';
import { authMiddleware } from '../middlewares/user.js';
import { dashboardValidation } from '../middlewares/dashboard.js';
import { asHandler } from '../types/api.js';

const router: express.Router = express.Router();

router.get('/onboarding', authMiddleware, asHandler(DashboardController.onboarding));
router.get('/', authMiddleware, dashboardValidation, asHandler(DashboardController.get));

export default router;
