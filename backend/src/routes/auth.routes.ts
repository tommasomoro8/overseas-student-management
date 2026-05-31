import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { validateBody } from '../middlewares/validate.middleware';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { createStaffSchema, loginSchema, registerSchema } from '../validators/auth.validators';

const router = Router();

// Rotte pubbliche
router.post('/register', validateBody(registerSchema), authController.register);
router.post('/login', validateBody(loginSchema), authController.login);

// Rotte protette
router.get('/me', authenticate, authController.me);
router.post('/staff', authenticate, authorize('office'), validateBody(createStaffSchema), authController.createStaff);

export default router;