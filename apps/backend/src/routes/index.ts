import express from 'express';
import user from './user.js';
import job from './job.js';
const router: express.Router = express.Router();

router.use('/user', user);
router.use('/job', job);

export default router;
