import { Router } from 'express';
import authRoutes from './auth.routes';
import institutionRoutes from './institution.routes';
import applicationRoutes from './application.routes';
import userRoutes from './user.routes';

// Router radice: monta i sotto-router sotto /api/v1.
const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/institutions', institutionRoutes);
router.use('/applications', applicationRoutes);

export default router;
