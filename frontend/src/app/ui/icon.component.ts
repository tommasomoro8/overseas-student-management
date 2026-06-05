/* ===========================================================================
   Overseas Mobility — inline stroke icons (port of ui.jsx Icon)
   =========================================================================== */
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
    selector: 'app-icon',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <svg
            [attr.width]="size"
            [attr.height]="size"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.9"
            stroke-linecap="round"
            stroke-linejoin="round"
            style="display:block"
        >
            @switch (name) {
                @case ('chevR') {
                    <polyline points="9 18 15 12 9 6" />
                }
                @case ('chevL') {
                    <polyline points="15 18 9 12 15 6" />
                }
                @case ('arrowR') {
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                }
                @case ('plus') {
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                }
                @case ('check') {
                    <polyline points="20 6 9 17 4 12" />
                }
                @case ('x') {
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                }
                @case ('file') {
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                }
                @case ('upload') {
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                }
                @case ('download') {
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                }
                @case ('cal') {
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                }
                @case ('map') {
                    <circle cx="12" cy="10" r="3" />
                    <path d="M12 21s-6-5.7-6-10a6 6 0 0 1 12 0c0 4.3-6 10-6 10z" />
                }
                @case ('user') {
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                }
                @case ('grad') {
                    <path d="M22 10L12 5 2 10l10 5 10-5z" />
                    <path d="M6 12v5c0 1 2.7 2 6 2s6-1 6-2v-5" />
                }
                @case ('search') {
                    <circle cx="11" cy="11" r="7" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                }
                @case ('clock') {
                    <circle cx="12" cy="12" r="9" />
                    <polyline points="12 7 12 12 15 14" />
                }
                @case ('edit') {
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z" />
                }
                @case ('swap') {
                    <polyline points="17 1 21 5 17 9" />
                    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                    <polyline points="7 23 3 19 7 15" />
                    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                }
                @case ('list') {
                    <line x1="8" y1="6" x2="21" y2="6" />
                    <line x1="8" y1="12" x2="21" y2="12" />
                    <line x1="8" y1="18" x2="21" y2="18" />
                    <circle cx="3.5" cy="6" r="1" fill="currentColor" stroke="none" />
                    <circle cx="3.5" cy="12" r="1" fill="currentColor" stroke="none" />
                    <circle cx="3.5" cy="18" r="1" fill="currentColor" stroke="none" />
                }
                @case ('lock') {
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                }
                @case ('globe') {
                    <circle cx="12" cy="12" r="9" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <path d="M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z" />
                }
                @case ('inbox') {
                    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
                    <path
                        d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"
                    />
                }
                @case ('book') {
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                }
                @case ('logout') {
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                }
            }
        </svg>
    `,
})
export class IconComponent {
    @Input({ required: true }) name!: string;
    @Input() size = 18;
}
