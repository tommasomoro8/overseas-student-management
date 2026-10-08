import { Router } from 'express';
import * as institutionController from '../controllers/institution.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { institutionSchema } from '../validators/institution.validators';

const router = Router();

// Tutte le rotte richiedono autenticazione; la scrittura e' riservata all'ufficio.
router.use(authenticate);

router.get('/', institutionController.list);
router.get('/:id', institutionController.getOne);
router.post(
    '/',
    authorize('office'),
    validateBody(institutionSchema),
    institutionController.create,
);
router.put(
    '/:id',
    authorize('office'),
    validateBody(institutionSchema),
    institutionController.update,
);
router.delete('/:id', authorize('office'), institutionController.remove);

export default router;
