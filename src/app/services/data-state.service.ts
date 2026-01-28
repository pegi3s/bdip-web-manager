import { Injectable, signal, computed, inject } from '@angular/core';
import { MetadataItem } from '../models/metadata.model';
import { Ontology } from '../models/ontology';
import { DiafMapping, parseDiaf, serializeDiaf } from '../models/diaf.model';
import { FileSystemService } from './file-system.service';
import { GithubRepoService } from './github-repo.service';

export type EditorMode = 'metadata' | 'ontology';
export type SourceMode = 'local' | 'github' | null;

/**
 * Data State Service
 * Centralized state management for all loaded data using signals.
 */
@Injectable({
  providedIn: 'root',
})
export class DataStateService {
  private fileSystemService = inject(FileSystemService);
  private githubRepoService = inject(GithubRepoService);

  // Current editor mode
  readonly currentMode = signal<EditorMode>('metadata');

  // Raw data signals
  readonly metadata = signal<MetadataItem[]>([]);
  readonly ontology = signal<Ontology | null>(null);
  readonly diafMappings = signal<DiafMapping[]>([]);

  // Original data for change detection
  private originalMetadataJson = signal<string>('');
  private originalOboContent = signal<string>('');
  private originalDiafContent = signal<string>('');

  // Files loaded state
  readonly filesLoaded = signal(false);
  readonly sourceMode = signal<SourceMode>(null);

  // Selected items
  readonly selectedMetadataIndex = signal<number | null>(null);
  readonly selectedTermId = signal<string | null>(null);

  // Derived computeds
  readonly selectedMetadataItem = computed(() => {
    const index = this.selectedMetadataIndex();
    const items = this.metadata();
    return index !== null && index >= 0 && index < items.length
      ? items[index]
      : null;
  });

  readonly selectedTerm = computed(() => {
    const id = this.selectedTermId();
    const ont = this.ontology();
    return id && ont ? ont.findTermById(id) : null;
  });

  readonly softwareNames = computed(() => this.metadata().map((m) => m.name));

  readonly ontologyTermIds = computed(
    () => this.ontology()?.getAllOntologyTerms().map((t) => t.id) ?? []
  );

  // Change detection
  readonly hasUnsavedChanges = computed(() => {
    if (!this.filesLoaded()) return false;

    const currentMetadataJson = JSON.stringify(this.metadata(), null, 2);
    const currentOboContent = this.ontology()?.toString() ?? '';
    const currentDiafContent = serializeDiaf(this.diafMappings());

    return (
      currentMetadataJson !== this.originalMetadataJson() ||
      currentOboContent !== this.originalOboContent() ||
      currentDiafContent !== this.originalDiafContent()
    );
  });

  /**
   * Load files and parse data
   */
  loadData(
    metadataJson: string,
    oboContent: string,
    diafContent: string,
    sourceMode: SourceMode = 'local'
  ): void {
    try {
      const metadataItems: MetadataItem[] = JSON.parse(metadataJson);
      const ontology = new Ontology(oboContent);
      const mappings = parseDiaf(diafContent);

      this.metadata.set(metadataItems);
      this.ontology.set(ontology);
      this.diafMappings.set(mappings);

      // Store originals for change detection
      this.originalMetadataJson.set(metadataJson);
      this.originalOboContent.set(oboContent);
      this.originalDiafContent.set(diafContent);

      this.filesLoaded.set(true);
      this.sourceMode.set(sourceMode);

      // Select first item by default
      if (metadataItems.length > 0) {
        this.selectedMetadataIndex.set(0);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      throw error;
    }
  }

  /**
   * Update a metadata item
   */
  updateMetadataItem(index: number, item: MetadataItem): void {
    this.metadata.update((items) => {
      const newItems = [...items];
      newItems[index] = item;
      return newItems;
    });
  }

  /**
   * Add a new metadata item
   */
  addMetadataItem(item: MetadataItem): void {
    this.metadata.update((items) => [...items, item]);
    this.selectedMetadataIndex.set(this.metadata().length - 1);
  }

  /**
   * Remove a metadata item
   */
  removeMetadataItem(index: number): void {
    this.metadata.update((items) => items.filter((_, i) => i !== index));
    if (this.selectedMetadataIndex() === index) {
      this.selectedMetadataIndex.set(
        this.metadata().length > 0 ? Math.min(index, this.metadata().length - 1) : null
      );
    }
  }

  /**
   * Add a DIAF mapping
   */
  addDiafMapping(dioId: string, name: string): void {
    this.diafMappings.update((mappings) => [...mappings, { dioId, name }]);
  }

  /**
   * Remove a DIAF mapping
   */
  removeDiafMapping(dioId: string, name: string): void {
    this.diafMappings.update((mappings) =>
      mappings.filter((m) => !(m.dioId === dioId && m.name === name))
    );
  }

  /**
   * Get mappings for a specific term
   */
  getMappingsForTerm(dioId: string): DiafMapping[] {
    return this.diafMappings().filter((m) => m.dioId === dioId);
  }

  /**
   * Get mappings for a specific software
   */
  getMappingsForSoftware(name: string): DiafMapping[] {
    return this.diafMappings().filter((m) => m.name === name);
  }

  /**
   * Save all files
   */
  async saveAll(): Promise<boolean> {
    const metadataContent = JSON.stringify(this.metadata(), null, 2);
    const oboContent = this.ontology()?.toString() ?? '';
    const diafContent = serializeDiaf(this.diafMappings());

    if (this.sourceMode() === 'github') {
      const message = window.prompt('Commit message', 'Update metadata');
      if (!message || message.trim().length === 0) {
        return false;
      }

      await this.githubRepoService.commitChanges(
        message.trim(),
        metadataContent,
        oboContent,
        diafContent
      );

      this.originalMetadataJson.set(metadataContent);
      this.originalOboContent.set(oboContent);
      this.originalDiafContent.set(diafContent);
      return true;
    }

    const result = await this.fileSystemService.saveFiles(
      metadataContent,
      oboContent,
      diafContent
    );

    if (result) {
      // Update originals after successful save
      this.originalMetadataJson.set(metadataContent);
      this.originalOboContent.set(oboContent);
      this.originalDiafContent.set(diafContent);
    }

    return result;
  }

  /**
   * Reset all data
   */
  reset(): void {
    this.metadata.set([]);
    this.ontology.set(null);
    this.diafMappings.set([]);
    this.originalMetadataJson.set('');
    this.originalOboContent.set('');
    this.originalDiafContent.set('');
    this.filesLoaded.set(false);
    this.sourceMode.set(null);
    this.selectedMetadataIndex.set(null);
    this.selectedTermId.set(null);
    this.currentMode.set('metadata');
  }

  /**
   * Refresh ontology signal after in-place mutations
   */
  refreshOntology(): void {
    const current = this.ontology();
    if (!current) return;
    this.ontology.set(new Ontology(current.toString()));
  }
}
