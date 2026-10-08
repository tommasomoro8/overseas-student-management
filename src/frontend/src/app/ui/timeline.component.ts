/* ===========================================================================
   Overseas Mobility — Timeline (port of ui.jsx Timeline)
   =========================================================================== */
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TimelineStep } from '../core/models';
import { fmtDate } from '../core/ovs-data';

@Component({
    selector: 'app-timeline',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="tl">
            @for (s of steps; track s.id; let i = $index) {
                <div class="tl-item" [class.fut]="s.state === 'future'">
                    <div class="tl-rail">
                        <div class="tl-node {{ s.state }}"></div>
                        @if (i < steps.length - 1) {
                            <div
                                class="tl-line"
                                [class.done]="s.state === 'done'"
                                [class.dashed]="
                                    s.state !== 'done' && steps[i + 1].state === 'future'
                                "
                            ></div>
                        }
                    </div>
                    <div class="tl-body">
                        @if (s.at) {
                            <div class="tl-when">
                                {{ fmtDate(s.at, true) }}
                                @if (s.by) {
                                    <span>
                                        · <span class="by">{{ byLabel[s.by] || s.by }}</span></span
                                    >
                                }
                            </div>
                        }
                        <div class="tl-label">{{ s.label }}</div>
                        @if (s.note) {
                            <div class="muted" style="font-size:12.5px;margin-top:3px">
                                {{ s.note }}
                            </div>
                        }
                    </div>
                </div>
            }
        </div>
    `,
})
export class TimelineComponent {
    @Input({ required: true }) steps!: TimelineStep[];
    readonly fmtDate = fmtDate;
    readonly byLabel: Record<string, string> = {
        te: 'da te',
        studente: 'dallo studente',
        docente: 'dal docente',
        ufficio: "dall'ufficio",
    };
}
