/* ===========================================================================
   Overseas Mobility — toast viewport (renders ToastService.toasts)
   =========================================================================== */
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IconComponent } from './icon.component';
import { ToastService } from './toast.service';

@Component({
    selector: 'app-toast-host',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [IconComponent],
    template: `
        <div class="toast-wrap">
            @for (t of toast.toasts(); track t.id) {
                <div class="toast">
                    <span class="tk"><app-icon name="check" [size]="16" /></span>
                    {{ t.msg }}
                </div>
            }
        </div>
    `,
})
export class ToastHostComponent {
    readonly toast = inject(ToastService);
}
