import { Router } from 'express';
import * as laController from '../controllers/la.controller';
import { authorize } from '../middlewares/auth.middleware';
import { parseJsonFields, validateBody } from '../middlewares/validate.middleware';
import { uploadPdf } from '../middlewares/upload.middleware';
import { submitLearningAgreementSchema } from '../validators/examMapping.validators';
import { evaluateSchema } from '../validators/evaluation.validators';

// mergeParams: true -> eredita :applicationId dal router padre (application.routes).
// L'autenticazione e' gia' applicata dal router padre.
const router = Router({ mergeParams: true });

router.get('/', laController.list);
// Multipart: prima multer (file), poi parse del campo JSON, poi validazione.
router.post(
    '/',
    authorize('student'),
    uploadPdf,
    parseJsonFields('examMappings'),
    validateBody(submitLearningAgreementSchema),
    laController.submit,
);
router.get('/:laId/file', laController.download);
router.post(
    '/:laId/evaluate',
    authorize('lecturer'),
    validateBody(evaluateSchema),
    laController.evaluate,
);

export default router;


