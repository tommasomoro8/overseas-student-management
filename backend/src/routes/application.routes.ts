import { Router } from 'express';
import * as applicationController from '../controllers/application.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { createApplicationSchema, mobilityDatesSchema } from '../validators/application.validators';
import learningAgreementRoutes from './learningAgreement.routes';
import transcriptRoutes from './transcript.routes';

const router = Router();

// Tutte le rotte (incluse le sotto-risorse) richiedono autenticazione.
router.use(authenticate);

router.get('/', applicationController.list);
router.get('/:applicationId', applicationController.detail);

// Creazione domanda
router.post(
    '/',
    authorize('student'),
    validateBody(createApplicationSchema),
    applicationController.create,
);

// Approvazione pre-partenza (solo ufficio)
router.post(
    '/:applicationId/pre-departure-approval',
    authorize('office'),
    applicationController.preDepartureApproval,
);

// Inserimento date mobilità
router.post(
    '/:applicationId/mobility-dates',
    authorize('student'),
    validateBody(mobilityDatesSchema),
    applicationController.mobilityDates,
);

// chiusura definitiva (solo ufficio)
router.post('/:applicationId/close', authorize('office'), applicationController.close);

// Sotto-risorse (documenti versionati): il Learning Agreement contiene il mapping esami
router.use('/:applicationId/learning-agreements', learningAgreementRoutes);
router.use('/:applicationId/transcripts', transcriptRoutes);

export default router;
