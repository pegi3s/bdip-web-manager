import {
  ChangeDetectionStrategy,
  Component,
  input,
  inject,
  signal,
  computed,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataStateService } from '../../services/data-state.service';
import { DiafMapping } from '../../models/diaf.model';

@Component({
  selector: 'app-diaf-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    <div class="diaf-editor" [class.full-view]="fullView()">
      @if (fullView()) {
        <div class="toolbar">
          <div class="search-box">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="search"
              placeholder="Search mappings..."
              [value]="searchQuery()"
              (input)="onSearch($event)"
            />
          </div>
        </div>
      }

      <div class="add-mapping">
        <select
          [ngModel]="newDioId()"
          (ngModelChange)="newDioId.set($event)"
        >
          <option value="">Select DIO ID...</option>
          @for (id of availableDioIds(); track id) {
            <option [value]="id">{{ id }}</option>
          }
        </select>
        <select
          [ngModel]="newSoftware()"
          (ngModelChange)="newSoftware.set($event)"
        >
          <option value="">Select software...</option>
          @for (name of softwareNames(); track name) {
            <option [value]="name">{{ name }}</option>
          }
        </select>
        <button
          type="button"
          class="btn btn-primary"
          (click)="onAdd()"
          [disabled]="!canAdd()"
        >
          Add
        </button>
      </div>

      <div class="mappings-table-container">
        <table class="mappings-table">
          <thead>
            <tr>
              <th>DIO ID</th>
              <th>Term Name</th>
              <th>Software</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (mapping of filteredMappings(); track mapping.dioId + mapping.name) {
              <tr>
                <td class="dio-id">{{ mapping.dioId }}</td>
                <td class="term-name">{{ getTermName(mapping.dioId) }}</td>
                <td class="software-name">{{ mapping.name }}</td>
                <td class="actions">
                  <button
                    type="button"
                    class="btn btn-ghost btn-icon"
                    (click)="onRemove(mapping)"
                    aria-label="Remove mapping"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="4" class="empty-row">
                  @if (searchQuery()) {
                    No mappings match "{{ searchQuery() }}"
                  } @else {
                    No mappings defined
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <div class="footer">
        {{ filteredMappings().length }} of {{ dataState.diafMappings().length }} mappings
      </div>
    </div>
  `,
  styles: `
    .diaf-editor {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
    }

    .diaf-editor.full-view {
      height: 100%;
    }

    .toolbar {
      display: flex;
      gap: var(--space-4);
    }

    .search-box {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      flex: 1;
      padding: var(--space-2) var(--space-3);
      background: var(--color-bg-tertiary);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
    }

    .search-box svg {
      color: var(--color-text-tertiary);
    }

    .search-box input {
      flex: 1;
      border: none;
      background: transparent;
      padding: 0;
    }

    .search-box input:focus {
      outline: none;
      box-shadow: none;
    }

    .add-mapping {
      display: flex;
      gap: var(--space-2);
    }

    .add-mapping select {
      flex: 1;
    }

    .mappings-table-container {
      flex: 1;
      overflow-y: auto;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
    }

    .mappings-table {
      width: 100%;
      border-collapse: collapse;
    }

    .mappings-table th,
    .mappings-table td {
      padding: var(--space-3);
      text-align: left;
      border-bottom: 1px solid var(--color-border);
    }

    .mappings-table th {
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-tertiary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      background: var(--color-surface);
      position: sticky;
      top: 0;
    }

    .mappings-table tr:hover td {
      background: var(--color-surface);
    }

    .dio-id {
      font-family: var(--font-family-mono);
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
    }

    .term-name {
      color: var(--color-text-secondary);
    }

    .software-name {
      font-weight: var(--font-weight-medium);
    }

    .actions {
      width: 40px;
      text-align: center;
    }

    .actions .btn-icon {
      color: var(--color-text-tertiary);
    }

    .actions .btn-icon:hover {
      color: var(--color-error);
      background: var(--color-error-muted);
    }

    .empty-row {
      text-align: center;
      color: var(--color-text-tertiary);
      padding: var(--space-8) !important;
    }

    .footer {
      font-size: var(--font-size-xs);
      color: var(--color-text-tertiary);
    }
  `,
})
export class DiafEditorComponent {
  fullView = input<boolean>(false);

  protected readonly dataState = inject(DataStateService);

  protected readonly searchQuery = signal('');
  protected readonly newDioId = signal('');
  protected readonly newSoftware = signal('');

  protected readonly softwareNames = this.dataState.softwareNames;

  protected readonly availableDioIds = computed(() => {
    const ontology = this.dataState.ontology();
    return ontology?.getAllOntologyTerms().map((t) => t.id) ?? [];
  });

  protected readonly filteredMappings = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const mappings = this.dataState.diafMappings();

    if (!query) return mappings;

    return mappings.filter(
      (m) =>
        m.dioId.toLowerCase().includes(query) ||
        m.name.toLowerCase().includes(query) ||
        this.getTermName(m.dioId).toLowerCase().includes(query)
    );
  });

  protected readonly canAdd = computed(
    () => this.newDioId() && this.newSoftware()
  );

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }

  getTermName(dioId: string): string {
    const ontology = this.dataState.ontology();
    const term = ontology?.findTermById(dioId);
    return term?.name ?? '';
  }

  onAdd(): void {
    const dioId = this.newDioId();
    const software = this.newSoftware();

    if (dioId && software) {
      this.dataState.addDiafMapping(dioId, software);
      this.newDioId.set('');
      this.newSoftware.set('');
    }
  }

  onRemove(mapping: DiafMapping): void {
    this.dataState.removeDiafMapping(mapping.dioId, mapping.name);
  }
}
