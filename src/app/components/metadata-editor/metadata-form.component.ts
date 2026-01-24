import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  signal,
  effect,
  computed,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgTemplateOutlet } from '@angular/common';
import {
  MetadataItem,
  MetadataStatus,
  AutoTest,
  RecommendedVersion,
  BugFoundItem,
  createEmptyAutoTest,
  createEmptyRecommendedVersion,
  createEmptyBugFoundItem,
} from '../../models/metadata.model';
import { ArrayFieldComponent } from '../shared/array-field.component';
import { DataStateService } from '../../services/data-state.service';
import { TermStanza } from '../../models/ontology';

@Component({
  selector: 'app-metadata-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, NgTemplateOutlet, ArrayFieldComponent],
  templateUrl: './metadata-form.component.html',
  styleUrl: './metadata-form.component.css',
})
export class MetadataFormComponent {
  item = input.required<MetadataItem>();
  itemChange = output<MetadataItem>();
  delete = output<void>();

  private readonly dataState = inject(DataStateService);

  // Local copy for form editing
  protected readonly formData = signal<MetadataItem | null>(null);

  // Active tab
  protected readonly activeTab = signal<string>('basic');

  protected readonly tabs = [
    { id: 'basic', label: 'Basic Info' },
    { id: 'categories', label: 'Categories' },
    { id: 'versions', label: 'Versions' },
    { id: 'urls', label: 'URLs' },
    { id: 'commands', label: 'Commands' },
    { id: 'tests', label: 'Tests' },
    { id: 'search', label: 'Search' },
    { id: 'alternatives', label: 'Alternatives' },
  ];

  protected readonly statusOptions: MetadataStatus[] = ['Usable', 'Unusable', 'Not_recommended'];

  protected readonly categorySearch = signal('');

  protected readonly allOntologyTerms = computed<TermStanza[]>(() => {
    return this.dataState.ontology()?.getAllOntologyTerms() ?? [];
  });

  protected readonly rootOntologyTerms = computed<TermStanza[]>(() => {
    return this.dataState.ontology()?.getRootTerms() ?? [];
  });

  protected readonly visibleCategoryIds = computed<Set<string>>(() => {
    const query = this.categorySearch().toLowerCase().trim();
    const ontology = this.dataState.ontology();
    if (!ontology) return new Set<string>();

    const allTerms = ontology.getAllOntologyTerms();
    if (!query) {
      return new Set(allTerms.map((term) => term.id));
    }

    const matches = allTerms.filter((term) => {
      const name = term.name ?? '';
      return (
        term.id.toLowerCase().includes(query) ||
        name.toLowerCase().includes(query)
      );
    });

    const visible = new Set<string>();
    const stack = [...matches];
    while (stack.length > 0) {
      const term = stack.pop();
      if (!term || visible.has(term.id)) continue;
      visible.add(term.id);
      term.getParents().forEach((parent) => stack.push(parent));
    }

    return visible;
  });

  protected readonly filteredRootOntologyTerms = computed<TermStanza[]>(() => {
    const visible = this.visibleCategoryIds();
    return this.rootOntologyTerms().filter((term) => visible.has(term.id));
  });

  protected readonly filteredOntologyTerms = computed<TermStanza[]>(() => {
    const query = this.categorySearch().toLowerCase();
    const terms = this.allOntologyTerms();
    if (!query) return terms;
    return terms.filter((term) => {
      const name = term.name ?? '';
      return (
        term.id.toLowerCase().includes(query) ||
        name.toLowerCase().includes(query)
      );
    });
  });

  protected readonly selectedCategoryIds = computed<string[]>(() => {
    const name = this.formData()?.name ?? '';
    if (!name) return [];
    return this.dataState.getMappingsForSoftware(name).map((m) => m.dioId);
  });

  constructor() {
    // Sync input to form data
    effect(() => {
      const inputItem = this.item();
      this.formData.set(structuredClone(inputItem));
    });
  }

  onTabChange(tabId: string): void {
    this.activeTab.set(tabId);
  }

  onCategorySearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.categorySearch.set(input.value);
  }

  isCategoryVisible(term: TermStanza): boolean {
    return this.visibleCategoryIds().has(term.id);
  }

  getVisibleCategoryChildren(term: TermStanza): TermStanza[] {
    const visible = this.visibleCategoryIds();
    return term.getChildren().filter((child) => visible.has(child.id));
  }


  onToggleCategory(termId: string, checked: boolean): void {
    const name = this.formData()?.name ?? '';
    if (!name) return;

    const hasMapping = this.dataState
      .getMappingsForSoftware(name)
      .some((m) => m.dioId === termId);

    if (checked && !hasMapping) {
      this.dataState.addDiafMapping(termId, name);
    } else if (!checked && hasMapping) {
      this.dataState.removeDiafMapping(termId, name);
    }
  }

  onCategoryCheckboxChange(termId: string, event: Event): void {
    const target = event.target as HTMLInputElement | null;
    if (!target) return;
    this.onToggleCategory(termId, target.checked);
  }

  isCategorySelected(termId: string): boolean {
    return this.selectedCategoryIds().includes(termId);
  }

  getCategoryInputId(termId: string): string {
    return `category-${termId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  }

  onFieldChange(): void {
    const data = this.formData();
    if (data) {
      this.itemChange.emit(structuredClone(data));
    }
  }

  onDelete(): void {
    this.delete.emit();
  }

  // Array field helpers
  onArrayAdd(field: keyof MetadataItem, value: string = ''): void {
    this.formData.update((data) => {
      if (!data) return data;
      const arr = data[field] as string[];
      return { ...data, [field]: [...arr, value] };
    });
    this.onFieldChange();
  }

  onArrayRemove(field: keyof MetadataItem, index: number): void {
    this.formData.update((data) => {
      if (!data) return data;
      const arr = data[field] as string[];
      return { ...data, [field]: arr.filter((_, i) => i !== index) };
    });
    this.onFieldChange();
  }

  onArrayUpdate(field: keyof MetadataItem, index: number, value: string): void {
    this.formData.update((data) => {
      if (!data) return data;
      const arr = [...(data[field] as string[])];
      arr[index] = value;
      return { ...data, [field]: arr };
    });
    this.onFieldChange();
  }

  // Bug found versions
  onAddBugFound(): void {
    this.formData.update((data) => {
      if (!data) return data;
      return {
        ...data,
        bug_found: [...data.bug_found, createEmptyBugFoundItem()],
      };
    });
    this.onFieldChange();
  }

  onRemoveBugFound(index: number): void {
    this.formData.update((data) => {
      if (!data) return data;
      return {
        ...data,
        bug_found: data.bug_found.filter((_, i) => i !== index),
      };
    });
    this.onFieldChange();
  }

  onUpdateBugFound(
    index: number,
    field: keyof BugFoundItem,
    value: string
  ): void {
    this.formData.update((data) => {
      if (!data) return data;
      const bugFound = [...data.bug_found];
      bugFound[index] = { ...bugFound[index], [field]: value };
      return { ...data, bug_found: bugFound };
    });
    this.onFieldChange();
  }

  // Recommended versions
  onAddRecommended(): void {
    this.formData.update((data) => {
      if (!data) return data;
      return {
        ...data,
        recommended: [...data.recommended, createEmptyRecommendedVersion()],
      };
    });
    this.onFieldChange();
  }

  onRemoveRecommended(index: number): void {
    this.formData.update((data) => {
      if (!data) return data;
      return {
        ...data,
        recommended: data.recommended.filter((_, i) => i !== index),
      };
    });
    this.onFieldChange();
  }

  onUpdateRecommended(
    index: number,
    field: keyof RecommendedVersion,
    value: string
  ): void {
    this.formData.update((data) => {
      if (!data) return data;
      const recommended = [...data.recommended];
      recommended[index] = { ...recommended[index], [field]: value };
      return { ...data, recommended };
    });
    this.onFieldChange();
  }

  // Auto tests
  onAddAutoTest(): void {
    this.formData.update((data) => {
      if (!data) return data;
      return {
        ...data,
        auto_tests: [...data.auto_tests, createEmptyAutoTest()],
      };
    });
    this.onFieldChange();
  }

  onRemoveAutoTest(index: number): void {
    this.formData.update((data) => {
      if (!data) return data;
      return {
        ...data,
        auto_tests: data.auto_tests.filter((_, i) => i !== index),
      };
    });
    this.onFieldChange();
  }

  onUpdateAutoTest(
    index: number,
    field: keyof AutoTest,
    value: string | string[]
  ): void {
    this.formData.update((data) => {
      if (!data) return data;
      const auto_tests = [...data.auto_tests];
      auto_tests[index] = { ...auto_tests[index], [field]: value };
      return { ...data, auto_tests };
    });
    this.onFieldChange();
  }

  onUpdateAutoTestInputFiles(index: number, value: string): void {
    const files = value
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s);
    this.onUpdateAutoTest(index, 'input_files', files);
  }

  // Custom searches
  onUpdateCustomSearch(
    field: keyof MetadataItem['custom_searches'],
    value: string
  ): void {
    this.formData.update((data) => {
      if (!data) return data;
      return {
        ...data,
        custom_searches: { ...data.custom_searches, [field]: value },
      };
    });
    this.onFieldChange();
  }

  // Alternatives
  onAddAlternativeDockerfile(): void {
    this.formData.update((data) => {
      if (!data) return data;
      const dockerfiles = data.alternatives?.dockerfiles ?? {};
      const newKey = `variant${Object.keys(dockerfiles).length + 1}`;
      return {
        ...data,
        alternatives: {
          ...data.alternatives,
          dockerfiles: { ...dockerfiles, [newKey]: '' },
        },
      };
    });
    this.onFieldChange();
  }

  onRemoveAlternativeDockerfile(key: string): void {
    this.formData.update((data) => {
      if (!data || !data.alternatives?.dockerfiles) return data;
      const { [key]: _, ...rest } = data.alternatives.dockerfiles;
      return {
        ...data,
        alternatives: { ...data.alternatives, dockerfiles: rest },
      };
    });
    this.onFieldChange();
  }

  onUpdateAlternativeDockerfile(
    oldKey: string,
    newKey: string,
    value: string
  ): void {
    this.formData.update((data) => {
      if (!data || !data.alternatives?.dockerfiles) return data;
      const dockerfiles = { ...data.alternatives.dockerfiles };
      if (oldKey !== newKey) {
        delete dockerfiles[oldKey];
      }
      dockerfiles[newKey] = value;
      return {
        ...data,
        alternatives: { ...data.alternatives, dockerfiles },
      };
    });
    this.onFieldChange();
  }

  getAlternativeKeys(): string[] {
    return Object.keys(this.formData()?.alternatives?.dockerfiles ?? {});
  }
}
