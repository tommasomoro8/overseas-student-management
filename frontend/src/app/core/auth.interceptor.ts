/* ===========================================================================
   Overseas Mobility — interceptor JWT.
   Aggiunge "Authorization: Bearer <token>" alle chiamate e, su 401 a sessione
   attiva, esegue il logout (riportando l'app alla pagina di login).
   Aggiunge inoltre "X-Socket-Id" cosi' il backend non rispedisce all'autore di
   un'azione la notifica realtime che lo riguarda.
   =========================================================================== */
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { RealtimeService } from './realtime.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const auth = inject(AuthService);
    const realtime = inject(RealtimeService);
    const token = auth.token;
    const socketId = realtime.socketId();

    const setHeaders: Record<string, string> = {};
    if (token) setHeaders['Authorization'] = `Bearer ${token}`;
    if (socketId) setHeaders['X-Socket-Id'] = socketId;
    const authReq = Object.keys(setHeaders).length ? req.clone({ setHeaders }) : req;

    return next(authReq).pipe(
        catchError((err: unknown) => {
            if (err instanceof HttpErrorResponse && err.status === 401 && auth.isAuthenticated()) {
                // token scaduto/non valido durante una sessione attiva
                auth.logout();
            }
            return throwError(() => err);
        }),
    );
};
