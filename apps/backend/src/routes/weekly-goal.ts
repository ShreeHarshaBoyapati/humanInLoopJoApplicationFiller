import express from 'express';
import WeeklyGoalController from '../controllers/weekly-goal-controller.js';
import { authMiddleware } from '../middlewares/user.js';
import { updateWeeklyGoalValidation } from '../middlewares/weekly-goal.js';
import { asHandler } from '../types/api.js';

const router: express.Router = express.Router();

router.get('/', authMiddleware, asHandler(WeeklyGoalController.get));
router.put('/', authMiddleware, updateWeeklyGoalValidation, asHandler(WeeklyGoalController.update));

export default router;
