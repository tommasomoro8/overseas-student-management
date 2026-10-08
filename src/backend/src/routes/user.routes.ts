import { Router } from 'express';
import * as userController from '../controllers/user.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// Tutte le rotte richiedono autenticazione.
router.use(authenticate);

router.get('/lecturers', userController.listLecturers);

export default router;
