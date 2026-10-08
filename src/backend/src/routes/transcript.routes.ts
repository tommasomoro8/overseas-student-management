import { Router } from 'express';
import * as transcriptController from '../controllers/tor.controller';
import { authorize } from '../middlewares/auth.middleware';
import { parseJsonFields, validateBody } from '../middlewares/validate.middleware';
import { uploadPdf } from '../middlewares/upload.middleware';
import { uploadTranscriptSchema } from '../validators/examMapping.validators';
import { evaluateSchema } from '../validators/evaluation.validators';

// mergeParams: true -> eredita :applicationId dal router padre (application.routes).
const router = Router({ mergeParams: true });

router.get('/', transcriptController.list);
// Multipart: prima multer (file), poi parse del campo JSON "results", poi validazione.
router.post(
    '/',
    authorize('student'),
    uploadPdf,
    parseJsonFields('results'),
    validateBody(uploadTranscriptSchema),
    transcriptController.upload,
);
router.get('/:torId/file', transcriptController.download);
router.post(
    '/:torId/evaluate',
    authorize('lecturer'),
    validateBody(evaluateSchema),
    transcriptController.evaluate,
);

export default router;
