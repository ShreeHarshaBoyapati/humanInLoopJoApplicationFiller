import express from 'express';
import user from './user.js';
import job from './job.js';
import ai from './ai.js';
import apiKey from './api-key.js';
const router: express.Router = express.Router();

router.use('/user', user);
router.use('/job', job);
router.use('/ai', ai);
router.use('/api-key', apiKey);

export default router;
