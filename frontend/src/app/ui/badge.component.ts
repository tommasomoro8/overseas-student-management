/* ===========================================================================
   Overseas Mobility — Badge + ActionBadge (port of ui.jsx)
   =========================================================================== */
import { ChangeDetectionStrategy, Component, Input, computed, input } from '@angular/core';
import { Application, Role } from '../core/models';
import { actionStatus } from '../core/ovs-data';

@Component({
    selector: 'app-badge',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <span class="badge {{ kind || 'neutral' }}">
            <ng-content />
        </span>
    `,
})
export class BadgeComponent {
    @Input() kind?: string;
}

@Component({
    selector: 'app-action-badge',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [BadgeComponent],
    template: `<app-badge [kind]="status().kind">{{ status().label }}</app-badge>`,
})
export class ActionBadgeComponent {
    readonly app = input.required<Application>();
    readonly role = input.required<Role>();
    readonly status = computed(() => actionStatus(this.app(), this.role()));
}
