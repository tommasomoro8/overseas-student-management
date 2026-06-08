/* ===========================================================================
   Overseas Mobility — Application detail page (port of detail.jsx)
   =========================================================================== */
import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { Application } from '../../core/models';
import { StoreService } from '../../core/store.service';
import { ActionBadgeComponent } from '../../ui/badge.component';
import { ExamTableComponent } from '../../ui/exam-table.component';
import { IconComponent } from '../../ui/icon.component';
import { TimelineComponent } from '../../ui/timeline.component';
import { ActionPanelComponent } from './action-panel.component';
import {
    DatesCardComponent,
    DocsCardComponent,
    MetaBarComponent,
    ModsCardComponent,
} from './cards.component';

@Component({
    selector: 'app-application-detail',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        IconComponent,
        ActionBadgeComponent,
        ExamTableComponent,
        TimelineComponent,
        MetaBarComponent,
        ActionPanelComponent,
        DatesCardComponent,
        ModsCardComponent,
        DocsCardComponent,
    ],
    template: `
        <div class="page">
            <button class="linkback" (click)="store.back()">
                <app-icon name="chevL" [size]="16" />Applications
            </button>
            <div class="detail">
                <div class="detail-main">
                    <div class="detail-head">
                        <div>
                            <h1>
                                <span class="flag">{{ app.institution.flag }}</span
                                >{{ app.institution.name }}
                            </h1>
                        </div>
                        <app-action-badge [app]="app" [role]="store.role()" />
                    </div>
                    <app-meta-bar [app]="app" [role]="store.role()" />
                    <app-action-panel [app]="app" />
                    <div class="card">
                        <div class="card-head">
                            <h3>Mapping esami{{ showScores ? ' e voti' : '' }}</h3>
                            <span class="ic"><app-icon name="grad" /></span>
                        </div>
                        <div class="card-pad" [style.padding-top.px]="app.exams.length ? 8 : 22">
                            <app-exam-table [exams]="app.exams" [showScore]="showScores" />
                        </div>
                    </div>
                    <app-dates-card [app]="app" />
                    <app-docs-card [app]="app" />
                    <app-mods-card [app]="app" />
                </div>
                <div class="tl-card">
                    <div class="card">
                        <div class="card-head">
                            <h3>Avanzamento</h3>
                            <span class="ic"><app-icon name="clock" /></span>
                        </div>
                        <div class="card-pad"><app-timeline [steps]="app.timeline" /></div>
                    </div>
                </div>
            </div>
        </div>
    `,
})
export class ApplicationDetailComponent {
    @Input({ required: true }) app!: Application;
    readonly store = inject(StoreService);

    get showScores(): boolean {
        return this.app.phase === 'after-returning' || this.app.phase === 'concluded';
    }
}
