import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { DataStateService } from '../../services/data-state.service';
import { MetadataFormComponent } from './metadata-form.component';
import { MetadataItem, MetadataStatus, createEmptyMetadataItem } from '../../models/metadata.model';

@Component({
  selector: 'app-metadata-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MetadataFormComponent],
  templateUrl: './metadata-editor.component.html',
  styleUrl: './metadata-editor.component.css',
})
export class MetadataEditorComponent {
  protected readonly dataState = inject(DataStateService);

  protected readonly searchQuery = signal('');

  protected readonly filteredItems = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const items = this.dataState.metadata();

    if (!query) return items;

    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query)
    );
  });

  protected readonly selectedIndex = this.dataState.selectedMetadataIndex;
  protected readonly selectedItem = this.dataState.selectedMetadataItem;

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }

  onSelectItem(index: number): void {
    // Find the actual index in the full list
    const filteredItem = this.filteredItems()[index];
    const actualIndex = this.dataState.metadata().indexOf(filteredItem);
    this.dataState.selectedMetadataIndex.set(actualIndex);
  }

  onAddItem(): void {
    const newItem = createEmptyMetadataItem();
    newItem.name = 'new-image';
    this.dataState.addMetadataItem(newItem);
  }

  onDeleteItem(index: number): void {
    const item = this.dataState.metadata()[index];
    const confirmed = window.confirm(
      `Are you sure you want to delete "${item.name}"?`
    );
    if (confirmed) {
      this.dataState.removeMetadataItem(index);
    }
  }

  onItemChange(item: MetadataItem): void {
    const index = this.selectedIndex();
    if (index !== null) {
      this.dataState.updateMetadataItem(index, item);
    }
  }

  getStatusClass(status: MetadataStatus): string {
    switch (status) {
      case 'Usable':
        return 'badge-success';
      case 'Unusable':
        return 'badge-error';
      case 'Not_recommended':
        return 'badge-warning';
      default:
        return '';
    }
  }

  isItemSelected(item: MetadataItem): boolean {
    const selectedIdx = this.selectedIndex();
    if (selectedIdx === null) return false;
    return this.dataState.metadata()[selectedIdx] === item;
  }
}
