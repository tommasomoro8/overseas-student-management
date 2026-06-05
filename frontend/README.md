# Overseas Mobility — Frontend (Angular)

Frontend del progetto TAW "Overseas". Porting in **Angular 18** (standalone
components + signals) del prototipo React fornito come modello di UI/UX.

Replica fedelmente layout, flussi e macchina a stati della mobilità per i tre
ruoli — **Studente**, **Docente referente**, **Ufficio Overseas** — con dati
mock in memoria e un role-switcher in alto a destra (nessun login).

## Avvio in locale

```bash
npm install
npm start            # ng serve -> http://localhost:4200/
```

Build di produzione (output in `dist/frontend/browser`, target del Dockerfile):

```bash
npm run build
```

## Struttura

```
src/app/
  core/
    models.ts          # interfacce di dominio (Application, Exam, TimelineStep, ...)
    ovs-data.ts         # dati di riferimento + seed + actionStatus/fmtDate (porting di data.js)
    store.service.ts    # stato applicativo + azioni del workflow (signal store, porting di store.jsx)
  ui/                   # componenti condivisi: Icon, Badge, Btn, Modal, DropZone,
                        #   Timeline, ExamTable, ToastService/ToastHost
  features/
    appbar.component.ts        # barra superiore + role switcher
    lists.component.ts         # liste per ruolo (Studente/Docente/Ufficio)
    create.component.ts        # wizard "Nuova application" (3 step)
    detail/                    # dettaglio application
      application-detail.component.ts
      action-panel.component.ts   # pannello azioni contestuale (cuore della state machine)
      cards.component.ts          # MetaBar / DocsCard / ModsCard / DatesCard / Box
      modals.component.ts         # Decision / Modification / Scores modal
  app.component.ts      # shell + "router" guidato dallo store (route + role)
src/styles.css          # design system condiviso (porting 1:1 di styles.css)
```

## Note

- Lo stato è interamente in memoria (mock), come nel prototipo: ricaricando la
  pagina si riparte dal seed. È pensato per essere collegato in un secondo
  momento al backend REST (`/api/v1`) sostituendo le azioni in
  `core/store.service.ts` con chiamate HTTP.
- La navigazione non usa l'URL router di Angular: la view corrente è derivata
  dai signal `route`/`role` dello store, fedele al prototipo.
