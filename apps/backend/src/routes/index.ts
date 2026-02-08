import express from 'express';
import user from './user.js';
const router: express.Router = express.Router();

router.use('/user', user);

export default router;
