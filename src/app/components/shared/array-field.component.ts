import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-array-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    <div class="array-field">
      @for (item of items(); track $index; let i = $index) {
        <div class="array-item">
          @if (multiline()) {
            <textarea
              [ngModel]="item"
              (ngModelChange)="onUpdate(i, $event)"
              rows="2"
            ></textarea>
          } @else {
            <input
              type="text"
              [ngModel]="item"
              (ngModelChange)="onUpdate(i, $event)"
            />
          }
          <button
            type="button"
            class="btn btn-ghost btn-icon"
            (click)="onRemove(i)"
            aria-label="Remove item"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      }

      <div class="add-item">
        @if (multiline()) {
          <textarea
            [ngModel]="newValue()"
            (ngModelChange)="newValue.set($event)"
            [placeholder]="placeholder()"
            rows="2"
          ></textarea>
        } @else {
          <input
            type="text"
            [ngModel]="newValue()"
            (ngModelChange)="newValue.set($event)"
            [placeholder]="placeholder()"
            (keydown.enter)="onAdd()"
          />
        }
        <button
          type="button"
          class="btn btn-secondary"
          (click)="onAdd()"
          [disabled]="!newValue().trim()"
        >
          Add
        </button>
      </div>
    </div>
  `,
  styles: `
    .array-field {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }

    .array-item {
      display: flex;
      gap: var(--space-2);
      align-items: center;
    }

    .array-item input,
    .array-item textarea {
      flex: 1;
    }

    .array-item .btn-icon {
      flex-shrink: 0;
    }

    .array-item .btn-icon:hover {
      color: var(--color-error);
      background: var(--color-error-muted);
    }

    .add-item {
      display: flex;
      gap: var(--space-2);
      align-items: flex-start;
    }

    .add-item input,
    .add-item textarea {
      flex: 1;
    }

    .add-item .btn {
      flex-shrink: 0;
    }
  `,
})
export class ArrayFieldComponent {
  items = input.required<string[]>();
  placeholder = input<string>('Add item...');
  multiline = input<boolean>(false);

  add = output<string>();
  remove = output<number>();
  update = output<{ index: number; value: string }>();

  protected readonly newValue = signal('');

  onAdd(): void {
    const value = this.newValue().trim();
    if (value) {
      this.add.emit(value);
      this.newValue.set('');
    }
  }

  onRemove(index: number): void {
    this.remove.emit(index);
  }

  onUpdate(index: number, value: string): void {
    this.update.emit({ index, value });
  }
}
