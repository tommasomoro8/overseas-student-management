/* ===========================================================================
   Overseas Mobility — ExamTable (port of ui.jsx ExamTable)
   =========================================================================== */
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { Exam } from '../core/models';

@Component({
    selector: 'app-exam-table',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (exams.length === 0) {
            <div class="muted" style="font-size:13.5px">Nessun esame caricato.</div>
        } @else {
            <table class="exam-tbl">
                <thead>
                    <tr>
                        <th style="width:44%">Corso all'estero</th>
                        <th style="width:44%">Corrispondenza piano di studi</th>
                        <th style="width:12%;text-align:right">{{ showScore ? 'Voto' : 'CFU' }}</th>
                    </tr>
                </thead>
                <tbody>
                    @for (e of exams; track $index) {
                        <tr>
                            <td>
                                <div class="title">{{ e.foreignName }}</div>
                                <div class="code">
                                    {{ e.foreignCode }} · {{ e.foreignCredits }} cr
                                </div>
                            </td>
                            <td>
                                <div class="title">{{ e.cfTitle }}</div>
                                <div class="code">{{ e.cfCode }} · {{ e.cfCredits }} CFU</div>
                            </td>
                            <td style="text-align:right">
                                @if (showScore) {
                                    @if (e.score != null && e.score !== '') {
                                        <span class="score-pill">{{ e.score }}</span>
                                    } @else {
                                        <span class="muted">—</span>
                                    }
                                } @else {
                                    <span class="cr">{{ e.cfCredits }}</span>
                                }
                            </td>
                        </tr>
                    }
                </tbody>
            </table>
        }
    `,
})
export class ExamTableComponent {
    @Input({ required: true }) exams!: Exam[];
    @Input() showScore = false;
}
