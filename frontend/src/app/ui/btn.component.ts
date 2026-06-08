/* ===========================================================================
   Overseas Mobility — button
   =========================================================================== */
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { IconComponent } from './icon.component';

@Component({
    selector: 'button[app-btn]',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [IconComponent],
    host: {
        class: 'btn',
        '[class.primary]': "variant === 'primary'",
        '[class.ghost]': "!variant || variant === 'ghost'",
        '[class.subtle]': "variant === 'subtle'",
        '[class.success]': "variant === 'success'",
        '[class.danger-o]': "variant === 'danger-o'",
        '[class.sm]': "size === 'sm'",
        '[class.lg]': "size === 'lg'",
    },
    template: `
        @if (icon) {
            <app-icon [name]="icon" [size]="iconSize" />
        }
        <ng-content />
        @if (iconRight) {
            <app-icon [name]="iconRight" [size]="iconSize" />
        }
    `,
})
export class BtnComponent {
    @Input() variant?: 'primary' | 'ghost' | 'subtle' | 'success' | 'danger-o';
    @Input() size?: 'sm' | 'lg' | '';
    @Input() icon?: string;
    @Input() iconRight?: string;

    get iconSize(): number {
        return this.size === 'sm' ? 14 : 16;
    }
}
