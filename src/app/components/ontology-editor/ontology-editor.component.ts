import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  computed,
  effect,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataStateService } from '../../services/data-state.service';
import { OntologyTreeComponent } from './ontology-tree.component';

@Component({
  selector: 'app-ontology-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, OntologyTreeComponent],
  templateUrl: './ontology-editor.component.html',
  styleUrl: './ontology-editor.component.css',
})
export class OntologyEditorComponent {
  protected readonly dataState = inject(DataStateService);

  protected readonly activeTab = signal<'tree'>('tree');
  protected readonly searchQuery = signal('');
  protected readonly isCreating = signal(false);
  protected readonly draftName = signal('');
  protected readonly draftDefinition = signal('');
  protected readonly formTouched = signal(false);
  protected readonly createParentId = signal<string | null>(null);

  protected readonly rootTerms = computed(() => {
    const ontology = this.dataState.ontology();
    return ontology?.getRootTerms() ?? [];
  });

  protected readonly allTerms = computed(() => {
    const ontology = this.dataState.ontology();
    return ontology?.getAllOntologyTerms() ?? [];
  });

  protected readonly filteredTerms = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const terms = this.allTerms();

    if (!query) return null; // Show tree view

    return terms.filter(
      (term) =>
        term.id.toLowerCase().includes(query) ||
        term.name?.toLowerCase().includes(query) ||
        term.definition?.toLowerCase().includes(query)
    );
  });

  protected readonly selectedTerm = this.dataState.selectedTerm;
  protected readonly selectedTermId = this.dataState.selectedTermId;

  protected readonly isFormValid = computed(() => {
    return this.draftName().trim().length > 0 && this.draftDefinition().trim().length > 0;
  });

  constructor() {
    effect(() => {
      if (this.isCreating()) return;
      const term = this.selectedTerm();
      this.draftName.set(term?.name ?? '');
      this.draftDefinition.set(term?.definition ?? '');
      this.formTouched.set(false);
    });
  }

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }

  onSelectTerm(termId: string): void {
    if (this.isCreating()) {
      this.onCancelCreate();
    }
    this.dataState.selectedTermId.set(termId);
  }

  onAddTerm(): void {
    const ontology = this.dataState.ontology();
    if (!ontology) return;

    this.isCreating.set(true);
    this.createParentId.set(null);
    this.draftName.set('');
    this.draftDefinition.set('');
    this.formTouched.set(false);
    this.dataState.selectedTermId.set(null);
  }

  onDeleteTerm(): void {
    const term = this.selectedTerm();
    const ontology = this.dataState.ontology();
    if (!term || !ontology) return;

    const hasChildren = term.hasChildren();
    const message = hasChildren
      ? `Delete "${term.name}"? This will also delete all child terms.`
      : `Delete "${term.name}"?`;

    if (window.confirm(message)) {
      ontology.removeTerm(term);
      this.dataState.refreshOntology();
      this.dataState.selectedTermId.set(null);
    }
  }

  onMoveTerm(event: { termId: string; newParentId: string | null }): void {
    const ontology = this.dataState.ontology();
    if (!ontology) return;
    const moved = ontology.moveTerm(event.termId, event.newParentId);
    if (moved) {
      this.dataState.refreshOntology();
    }
  }

  onNameInput(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) return;
    this.draftName.set(input.value);
  }

  onDefinitionInput(event: Event): void {
    const input = event.target as HTMLTextAreaElement | null;
    if (!input) return;
    this.draftDefinition.set(input.value);
  }

  onSaveTerm(): void {
    const ontology = this.dataState.ontology();
    if (!ontology) return;
    this.formTouched.set(true);
    if (!this.isFormValid()) return;

    const name = this.draftName().trim();
    const definition = this.draftDefinition().trim();

    if (this.isCreating()) {
      const newId = ontology.getNextId();
      const parentId = this.createParentId();
      ontology.createTerm(newId, name, definition, parentId ?? undefined);
      this.dataState.refreshOntology();
      this.dataState.selectedTermId.set(newId);
      this.isCreating.set(false);
      this.createParentId.set(null);
      return;
    }

    const term = this.selectedTerm();
    if (!term) return;
    term.name = name;
    term.definition = definition;
    this.dataState.refreshOntology();
  }

  onCancelCreate(): void {
    this.isCreating.set(false);
    this.createParentId.set(null);
    const term = this.selectedTerm();
    this.draftName.set(term?.name ?? '');
    this.draftDefinition.set(term?.definition ?? '');
    this.formTouched.set(false);
  }

  getMappingsCount(termId: string): number {
    return this.dataState.getMappingsForTerm(termId).length;
  }
}
