import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';

// Assicura l'esistenza della cartella di upload all'avvio del modulo.
fs.mkdirSync(env.UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, env.UPLOAD_DIR);
    },
    // Nome file generato dal server (UUID): nessun rischio di path traversal o collisione.
    filename: (_req, _file, cb) => {
        cb(null, `${randomUUID()}.pdf`);
    },
});

function fileFilter(_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback): void {
    const isPdf =
        file.mimetype === 'application/pdf' &&
        path.extname(file.originalname).toLowerCase() === '.pdf';
    if (!isPdf) {
        cb(new AppError(400, 'Sono ammessi solo file PDF'));
        return;
    }
    cb(null, true);
}

const upload = multer({
    storage,
    limits: { fileSize: env.MAX_UPLOAD_BYTES },
    fileFilter,
});

/**
 * Middleware di upload per un singolo PDF (campo form "file").
 * Converte gli errori di multer (es. file troppo grande) in AppError(400),
 * altrimenti diventerebbero un 500 generico.
 */
export function uploadPdf(req: Request, res: Response, next: NextFunction): void {
    upload.single('file')(req, res, (err: unknown) => {
        if (err instanceof multer.MulterError) {
            return next(new AppError(400, `Upload non valido: ${err.message}`));
        }
        if (err) {
            return next(err); // AppError dal fileFilter, o errore inatteso
        }
        next();
    });
}

/**
 * Risolve il percorso assoluto del file salvato, mantenendolo dentro UPLOAD_DIR
 * (path.basename rimuove eventuali componenti di traversal).
 */
export function resolveUploadPath(storedName: string): string {
    return path.join(path.resolve(env.UPLOAD_DIR), path.basename(storedName));
}

/** Invia in download un PDF salvato (con il nome originale), dopo i controlli di autorizzazione. */
export function sendPdfDownload(res: Response, storedName: string, originalName: string): void {
    const absPath = resolveUploadPath(storedName);
    if (!fs.existsSync(absPath)) {
        throw new AppError(404, 'File non trovato sul server');
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(originalName)}"`,
    );
    const stream = fs.createReadStream(absPath);
    stream.on('error', () => res.destroy());
    stream.pipe(res);
}
