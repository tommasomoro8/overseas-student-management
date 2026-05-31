import { Router } from 'express';
import authRoutes from './auth.routes';

// Router radice: monta i sotto-router sotto /api/v1.
const router = Router();

router.use('/auth', authRoutes);

export default router;
