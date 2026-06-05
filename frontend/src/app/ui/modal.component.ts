/* ===========================================================================
   Overseas Mobility — Modal (port of ui.jsx Modal)
   Body is the default slot; footer buttons go in <... modalFooter>.
   =========================================================================== */
import {
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    HostListener,
    Input,
    Output,
} from '@angular/core';
import { IconComponent } from './icon.component';

@Component({
    selector: 'app-modal',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [IconComponent],
    template: `
        <div class="scrim" (mousedown)="onClose.emit()">
            <div
                class="modal"
                [style.max-width.px]="wide ? 720 : null"
                (mousedown)="$event.stopPropagation()"
            >
                <div class="modal-head">
                    <h3>{{ title }}</h3>
                    <button class="iconbtn" (click)="onClose.emit()">
                        <app-icon name="x" [size]="20" />
                    </button>
                </div>
                <div class="modal-body"><ng-content /></div>
                <div class="modal-foot"><ng-content select="[modalFooter]" /></div>
            </div>
        </div>
    `,
})
export class ModalComponent {
    @Input() title = '';
    @Input() wide = false;
    @Output() onClose = new EventEmitter<void>();

    @HostListener('document:keydown.escape')
    onEsc(): void {
        this.onClose.emit();
    }
}
