import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  signal,
  inject,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { TermStanza } from '../../models/ontology';
import { DataStateService } from '../../services/data-state.service';

@Component({
  selector: 'app-ontology-tree',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet],
  template: `
    <div class="tree" role="tree" aria-label="Ontology terms">
      <div
        class="root-drop-zone"
        role="button"
        tabindex="0"
        [class.drag-over]="rootDragOver()"
        (dragover)="onRootDragOver($event)"
        (dragleave)="onRootDragLeave()"
        (drop)="onRootDrop($event)"
        (keydown)="onRootKeydown($event)"
      >
        Drop here to make root
      </div>

      @for (term of terms(); track term.id) {
        <ng-container
          [ngTemplateOutlet]="treeNode"
          [ngTemplateOutletContext]="{ term: term, level: 0 }"
        />
      }
    </div>

    <ng-template #treeNode let-term="term" let-level="level">
      <div
        class="tree-item"
        role="treeitem"
        [attr.aria-level]="level + 1"
        [attr.aria-expanded]="term.hasChildren() ? isExpanded(term.id) : null"
        [attr.aria-selected]="selectedId() === term.id"
        [style.padding-left.px]="level * 20"
      >
        <div
          class="tree-item-content"
          role="button"
          tabindex="0"
          [class.selected]="selectedId() === term.id"
          [class.has-children]="term.hasChildren()"
          [class.drag-over]="dragOverId() === term.id"
          draggable="true"
          (dragstart)="onDragStart($event, term.id)"
          (dragend)="onDragEnd()"
          (dragover)="onDragOver($event, term.id)"
          (dragleave)="onDragLeave(term.id)"
          (drop)="onDrop($event, term.id)"
          (click)="onSelect(term)"
          (keydown)="onKeydown($event, term)"
        >
          @if (term.hasChildren()) {
            <button
              type="button"
              class="expand-btn"
              (click)="toggleExpand(term.id, $event)"
              [attr.aria-label]="isExpanded(term.id) ? 'Collapse' : 'Expand'"
            >
              <svg
                class="expand-icon"
                [class.expanded]="isExpanded(term.id)"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          } @else {
            <span class="expand-placeholder"></span>
          }

          <span class="term-name">{{ term.name || term.id }}</span>

          @if (getMappingsCount(term.id) > 0) {
            <span class="badge badge-accent badge-sm">
              {{ getMappingsCount(term.id) }}
            </span>
          }
        </div>
      </div>

      @if (term.hasChildren() && isExpanded(term.id)) {
        <div class="tree-group" role="group">
          @for (child of term.getChildren(); track child.id) {
            <ng-container
              [ngTemplateOutlet]="treeNode"
              [ngTemplateOutletContext]="{ term: child, level: level + 1 }"
            />
          }
        </div>
      }
    </ng-template>
  `,
  styles: `
    .tree {
      font-size: var(--font-size-sm);
      display: flex;
      flex-direction: column;
    }

    .root-drop-zone {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-2) var(--space-3);
      border: 1px dashed var(--color-border);
      border-radius: var(--radius-md);
      margin-bottom: var(--space-2);
      font-size: var(--font-size-xs);
      color: var(--color-text-tertiary);
      background: color-mix(in srgb, var(--color-surface) 70%, transparent);
      transition: all var(--transition-fast);
    }

    .root-drop-zone.drag-over {
      border-color: var(--color-accent);
      color: var(--color-text-primary);
      background: color-mix(in srgb, var(--color-accent) 12%, transparent);
    }

    .tree-item {
      display: flex;
      flex-direction: column;
    }

    .tree-item-content {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      padding: var(--space-2) var(--space-2);
      width: 100%;
      text-align: left;
      background: transparent;
      border: 1px solid transparent;
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: background var(--transition-fast);
    }

    .tree-item-content:hover {
      background: var(--color-surface-hover);
    }

    .tree-item-content.selected {
      background: var(--color-accent-muted);
      border-color: color-mix(in srgb, var(--color-accent) 40%, transparent);
    }

    .tree-item-content.drag-over {
      border-color: var(--color-accent);
      background: color-mix(in srgb, var(--color-accent) 12%, transparent);
    }

    .expand-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      padding: 0;
      background: transparent;
      border: none;
      border-radius: var(--radius-sm);
      cursor: pointer;
      color: var(--color-text-tertiary);
      transition: all var(--transition-fast);
    }

    .expand-btn:hover {
      background: var(--color-surface);
      color: var(--color-text-primary);
    }

    .expand-icon {
      transition: transform var(--transition-fast);
    }

    .expand-icon.expanded {
      transform: rotate(90deg);
    }

    .expand-placeholder {
      width: 20px;
    }

    .term-name {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .badge-sm {
      font-size: var(--font-size-xs);
      padding: 0 var(--space-2);
    }
  `,
})
export class OntologyTreeComponent {
  terms = input.required<TermStanza[]>();
  selectedId = input<string | null>(null);
  selectTerm = output<string>();
  moveTerm = output<{ termId: string; newParentId: string | null }>();

  private dataState = inject(DataStateService);
  private expandedIds = signal<Set<string>>(new Set());
  private draggingId = signal<string | null>(null);
  protected readonly dragOverId = signal<string | null>(null);
  protected readonly rootDragOver = signal(false);

  isExpanded(id: string): boolean {
    return this.expandedIds().has(id);
  }

  toggleExpand(id: string, event: Event): void {
    event.stopPropagation();
    this.expandedIds.update((set) => {
      const newSet = new Set(set);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }

  onSelect(term: TermStanza): void {
    this.selectTerm.emit(term.id);
  }

  onKeydown(event: KeyboardEvent, term: TermStanza): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.onSelect(term);
    }
  }

  onDragStart(event: DragEvent, termId: string): void {
    this.draggingId.set(termId);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', termId);
    }
  }

  onDragEnd(): void {
    this.draggingId.set(null);
    this.dragOverId.set(null);
    this.rootDragOver.set(false);
  }

  onDragOver(event: DragEvent, termId: string): void {
    event.preventDefault();
    if (this.draggingId() === termId) return;
    this.dragOverId.set(termId);
  }

  onDragLeave(termId: string): void {
    if (this.dragOverId() === termId) {
      this.dragOverId.set(null);
    }
  }

  onDrop(event: DragEvent, newParentId: string): void {
    event.preventDefault();
    const termId = event.dataTransfer?.getData('text/plain') ?? null;
    if (!termId || termId === newParentId) return;
    this.moveTerm.emit({ termId, newParentId });
    this.dragOverId.set(null);
    this.rootDragOver.set(false);
  }

  onRootDragOver(event: DragEvent): void {
    event.preventDefault();
    this.rootDragOver.set(true);
  }

  onRootDragLeave(): void {
    this.rootDragOver.set(false);
  }

  onRootDrop(event: DragEvent): void {
    event.preventDefault();
    const termId = event.dataTransfer?.getData('text/plain') ?? null;
    if (!termId) return;
    this.moveTerm.emit({ termId, newParentId: null });
    this.rootDragOver.set(false);
  }

  onRootKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const selectedId = this.selectedId();
      if (selectedId) {
        this.moveTerm.emit({ termId: selectedId, newParentId: null });
      }
    }
  }

  getMappingsCount(termId: string): number {
    return this.dataState.getMappingsForTerm(termId).length;
  }
}
