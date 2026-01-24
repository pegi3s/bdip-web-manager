import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  inject,
  computed,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TermStanza } from '../../models/ontology';
import { DataStateService } from '../../services/data-state.service';

@Component({
  selector: 'app-term-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    <div class="term-form">
      <div class="form-header">
        <h2>{{ term().name || 'New Term' }}</h2>
        <button
          type="button"
          class="btn btn-danger"
          (click)="onDelete()"
          aria-label="Delete this term"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
          Delete
        </button>
      </div>

      <div class="form-grid">
        <div class="form-group">
          <label for="term-id">ID *</label>
          <input
            type="text"
            id="term-id"
            [ngModel]="term().id"
            (ngModelChange)="onUpdateId($event)"
            placeholder="DIO:0000001"
            [class.invalid]="!isValidId()"
          />
          @if (!isValidId()) {
            <span class="error-message">ID must be in format DIO:XXXXXXX</span>
          }
        </div>

        <div class="form-group">
          <label for="term-name">Name</label>
          <input
            type="text"
            id="term-name"
            [ngModel]="term().name"
            (ngModelChange)="onUpdateName($event)"
            placeholder="Term name"
          />
        </div>

        <div class="form-group full-width">
          <label for="term-definition">Definition</label>
          <textarea
            id="term-definition"
            [ngModel]="term().definition"
            (ngModelChange)="onUpdateDefinition($event)"
            rows="3"
            placeholder="Description of this term..."
          ></textarea>
        </div>

        <div class="form-group full-width">
          <label>Parents</label>
          <div class="parents-list">
            @for (parent of term().getParents(); track parent.id) {
              <div class="parent-tag">
                <span class="parent-id">{{ parent.id }}</span>
                <span class="parent-name">{{ parent.name }}</span>
                <button
                  type="button"
                  class="btn btn-ghost btn-icon btn-sm"
                  (click)="onRemoveParent(parent)"
                  aria-label="Remove parent"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            } @empty {
              <span class="no-parents">No parents (root term)</span>
            }
          </div>

          <div class="add-parent">
            <select
              [ngModel]="selectedParentId"
              (ngModelChange)="selectedParentId = $event"
            >
              <option value="">Select parent to add...</option>
              @for (t of availableParents(); track t.id) {
                <option [value]="t.id">{{ t.id }} - {{ t.name }}</option>
              }
            </select>
            <button
              type="button"
              class="btn btn-secondary"
              (click)="onAddParent()"
              [disabled]="!selectedParentId"
            >
              Add
            </button>
          </div>
        </div>

        <div class="form-group full-width">
          <label>Children</label>
          <div class="children-list">
            @for (child of term().getChildren(); track child.id) {
              <span class="child-tag">
                {{ child.id }} - {{ child.name }}
              </span>
            } @empty {
              <span class="no-children">No children</span>
            }
          </div>
        </div>

        <div class="form-group full-width">
          <label>DIAF Mappings</label>
          <div class="mappings-list">
            @for (mapping of getMappings(); track mapping.name) {
              <div class="mapping-tag">
                <span class="mapping-name">{{ mapping.name }}</span>
                <button
                  type="button"
                  class="btn btn-ghost btn-icon btn-sm"
                  (click)="onRemoveMapping(mapping.name)"
                  aria-label="Remove mapping"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            } @empty {
              <span class="no-mappings">No software mappings</span>
            }
          </div>

          <div class="add-mapping">
            <select
              [ngModel]="selectedSoftware"
              (ngModelChange)="selectedSoftware = $event"
            >
              <option value="">Select software to map...</option>
              @for (name of availableSoftware(); track name) {
                <option [value]="name">{{ name }}</option>
              }
            </select>
            <button
              type="button"
              class="btn btn-secondary"
              (click)="onAddMapping()"
              [disabled]="!selectedSoftware"
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: `
    .term-form {
      max-width: 800px;
    }

    .form-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--space-6);
    }

    .form-header h2 {
      font-size: var(--font-size-2xl);
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: var(--space-4);
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }

    .form-group.full-width {
      grid-column: 1 / -1;
    }

    .form-group label {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-secondary);
    }

    .form-group textarea {
      resize: vertical;
    }

    .error-message {
      font-size: var(--font-size-xs);
      color: var(--color-error);
    }

    .parents-list,
    .children-list,
    .mappings-list {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      min-height: 36px;
      align-items: center;
    }

    .parent-tag,
    .mapping-tag {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-1) var(--space-2);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      font-size: var(--font-size-sm);
    }

    .parent-id {
      font-family: var(--font-family-mono);
      font-size: var(--font-size-xs);
      color: var(--color-text-tertiary);
    }

    .child-tag {
      display: inline-flex;
      padding: var(--space-1) var(--space-2);
      background: var(--color-surface);
      border-radius: var(--radius-md);
      font-size: var(--font-size-sm);
    }

    .no-parents,
    .no-children,
    .no-mappings {
      font-size: var(--font-size-sm);
      color: var(--color-text-tertiary);
      font-style: italic;
    }

    .add-parent,
    .add-mapping {
      display: flex;
      gap: var(--space-2);
      margin-top: var(--space-2);
    }

    .add-parent select,
    .add-mapping select {
      flex: 1;
    }

    .btn-sm {
      padding: var(--space-1);
    }

    .btn-sm:hover {
      color: var(--color-error);
      background: var(--color-error-muted);
    }

    @media (max-width: 640px) {
      .form-grid {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class TermFormComponent {
  term = input.required<TermStanza>();
  termUpdated = output<void>();
  delete = output<void>();

  private dataState = inject(DataStateService);

  protected selectedParentId = '';
  protected selectedSoftware = '';

  protected readonly availableParents = computed(() => {
    const ontology = this.dataState.ontology();
    const currentTerm = this.term();
    if (!ontology) return [];

    // Exclude current term and its descendants
    const descendants = this.getDescendants(currentTerm);
    const currentParentIds = new Set(currentTerm.getParents().map((p) => p.id));

    return ontology
      .getAllOntologyTerms()
      .filter(
        (t) =>
          t.id !== currentTerm.id &&
          !descendants.has(t.id) &&
          !currentParentIds.has(t.id)
      );
  });

  protected readonly availableSoftware = computed(() => {
    const allNames = this.dataState.softwareNames();
    const currentMappings = new Set(this.getMappings().map((m) => m.name));
    return allNames.filter((name) => !currentMappings.has(name));
  });

  isValidId(): boolean {
    return /^DIO:\d{7}$/.test(this.term().id);
  }

  getMappings() {
    return this.dataState.getMappingsForTerm(this.term().id);
  }

  onUpdateId(value: string): void {
    this.term().id = value;
    this.termUpdated.emit();
  }

  onUpdateName(value: string): void {
    this.term().name = value;
    this.termUpdated.emit();
  }

  onUpdateDefinition(value: string): void {
    this.term().definition = value;
    this.termUpdated.emit();
  }

  onAddParent(): void {
    if (!this.selectedParentId) return;

    const ontology = this.dataState.ontology();
    const parent = ontology?.findTermById(this.selectedParentId);
    if (parent) {
      this.term().addParent(parent);
      parent.addChild(this.term());
      this.selectedParentId = '';
      this.termUpdated.emit();
    }
  }

  onRemoveParent(parent: TermStanza): void {
    this.term().removeParent(parent);
    parent.removeChild(this.term());
    this.termUpdated.emit();
  }

  onAddMapping(): void {
    if (!this.selectedSoftware) return;
    this.dataState.addDiafMapping(this.term().id, this.selectedSoftware);
    this.selectedSoftware = '';
  }

  onRemoveMapping(name: string): void {
    this.dataState.removeDiafMapping(this.term().id, name);
  }

  onDelete(): void {
    this.delete.emit();
  }

  private getDescendants(term: TermStanza): Set<string> {
    const descendants = new Set<string>();
    const queue = [...term.getChildren()];

    while (queue.length > 0) {
      const child = queue.shift()!;
      if (!descendants.has(child.id)) {
        descendants.add(child.id);
        queue.push(...child.getChildren());
      }
    }

    return descendants;
  }
}
