/* ===========================================================================
   Overseas Mobility — DropZone: seleziona un PDF reale ed emette il File via (picked).
   Il pulsante "file di esempio" genera un PDF minimo valido (utile per la demo).
   =========================================================================== */
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { IconComponent } from './icon.component';

@Component({
    selector: 'app-dropzone',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [IconComponent],
    template: `
        <div>
            <div
                class="drop"
                [class.over]="over"
                (click)="fileRef.click()"
                (dragover)="$event.preventDefault(); over = true"
                (dragleave)="over = false"
                (drop)="onDrop($event)"
            >
                <input
                    #fileRef
                    type="file"
                    [attr.accept]="accept || '.pdf'"
                    style="display:none"
                    (change)="onChange(fileRef.files)"
                />
                <div class="dic"><app-icon name="upload" [size]="26" /></div>
                <div class="dt">Trascina il PDF o clicca per selezionarlo</div>
                <div class="ds">{{ hint || 'Formato PDF, max 10 MB' }}</div>
            </div>
            <button
                type="button"
                (click)="$event.stopPropagation(); emitDemo()"
                style="background:none;border:none;cursor:pointer;color:var(--text-3);font-size:12.5px;font-weight:600;margin-top:9px;text-decoration:underline;text-underline-offset:3px"
            >
                oppure usa un file di esempio (demo)
            </button>
        </div>
    `,
})
export class DropzoneComponent {
    @Input() hint?: string;
    @Input() accept?: string;
    @Input() sampleName?: string;
    @Output() picked = new EventEmitter<File>();

    over = false;

    onDrop(e: DragEvent): void {
        e.preventDefault();
        this.over = false;
        this.handle(e.dataTransfer?.files?.[0]);
    }

    onChange(files: FileList | null): void {
        this.handle(files?.[0]);
    }

    emitDemo(): void {
        const name = this.sampleName || 'documento_demo.pdf';
        const file = new File(['%PDF-1.4\n% Overseas demo document\n'], name, {
            type: 'application/pdf',
        });
        this.picked.emit(file);
    }

    private handle(file: File | null | undefined): void {
        if (!file) return;
        this.picked.emit(file);
    }
}
