import express from 'express';
import ResultController from '../controllers/result-controller.js';
import { authMiddleware } from '../middlewares/user.js';
import { asHandler } from '../types/api.js';

const router: express.Router = express.Router();

// Get paginated results for a job
router.get('/job/:jobId/results', authMiddleware, asHandler(ResultController.getByJobId));

// Get a specific result by ID
router.get('/result/:id', authMiddleware, asHandler(ResultController.getById));

export default router;
