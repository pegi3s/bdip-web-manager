import { ChangeDetectionStrategy, Component, inject, signal, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { FileSystemService } from '../../services/file-system.service';
import { DataStateService } from '../../services/data-state.service';
import { SvgIconComponent } from "angular-svg-icon";

type DropZone = 'folder' | 'obo' | 'diaf' | 'metadata';

@Component({
  selector: 'app-file-selector',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SvgIconComponent],
  templateUrl: './file-selector.component.html',
  styleUrl: './file-selector.component.css',
})
export class FileSelectorComponent {
  private fileSystemService = inject(FileSystemService);
  private dataStateService = inject(DataStateService);
  private router = inject(Router);

  @ViewChild('folderInput') folderInput!: ElementRef<HTMLInputElement>;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  protected readonly supportsFileSystemAccess = this.fileSystemService.supportsFileSystemAccess;
  protected readonly isLoading = signal(false);
  protected readonly error = signal<string | null>(null);

  // Individual drag states
  protected readonly isDragOverFolder = signal(false);
  protected readonly isDragOverObo = signal(false);
  protected readonly isDragOverDiaf = signal(false);
  protected readonly isDragOverMetadata = signal(false);

  // Track which files are loaded (with validation)
  protected readonly loadedFiles = signal({
    obo: false,
    diaf: false,
    metadata: false,
  });

  // Track pending file contents
  private pendingFiles = {
    obo: null as string | null,
    diaf: null as string | null,
    metadata: null as string | null,
  };

  protected readonly currentFileAccept = signal('.json,.obo,.diaf');
  private currentFileType: 'obo' | 'diaf' | 'metadata' = 'metadata';

  async onSelectFolder(): Promise<void> {
    // If File System Access API is supported, use it
    if (this.supportsFileSystemAccess()) {
      this.isLoading.set(true);
      this.error.set(null);

      try {
        const result = await this.fileSystemService.openFolder();
        if (result) {
          this.dataStateService.loadData(result.metadata, result.obo, result.diaf);
          await this.router.navigate(['/metadata']);
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          this.error.set((err as Error).message);
        }
      } finally {
        this.isLoading.set(false);
      }
    } else {
      // Fallback: trigger folder input
      this.folderInput.nativeElement.click();
    }
  }

  onSelectSingleFile(type: 'obo' | 'diaf' | 'metadata'): void {
    this.currentFileType = type;

    if (type === 'obo') {
      this.currentFileAccept.set('.obo');
    } else if (type === 'diaf') {
      this.currentFileAccept.set('.diaf');
    } else {
      this.currentFileAccept.set('.json');
    }

    // Small delay to let the accept attribute update
    setTimeout(() => {
      this.fileInput.nativeElement.click();
    }, 0);
  }

  onDragOver(event: DragEvent, zone: DropZone): void {
    event.preventDefault();
    event.stopPropagation();
    this.setDragState(zone, true);
  }

  onDragLeave(event: DragEvent, zone: DropZone): void {
    event.preventDefault();
    event.stopPropagation();
    this.setDragState(zone, false);
  }

  private setDragState(zone: DropZone, value: boolean): void {
    switch (zone) {
      case 'folder':
        this.isDragOverFolder.set(value);
        break;
      case 'obo':
        this.isDragOverObo.set(value);
        break;
      case 'diaf':
        this.isDragOverDiaf.set(value);
        break;
      case 'metadata':
        this.isDragOverMetadata.set(value);
        break;
    }
  }

  async onDropFolder(event: DragEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOverFolder.set(false);

    const items = event.dataTransfer?.items;
    if (!items || items.length === 0) return;

    this.isLoading.set(true);
    this.error.set(null);

    try {
      // Check if it's a folder drop using webkitGetAsEntry API
      const firstItem = items[0];
      const entry = firstItem.webkitGetAsEntry?.();

      if (entry?.isDirectory) {
        // It's a folder - read files from it
        const dirEntry = entry as FileSystemDirectoryEntry;
        const files = await this.readFilesFromDirectory(dirEntry);
        
        if (files.length > 0) {
          const result = await this.fileSystemService.readFilesFromList(this.arrayToFileList(files));
          if (result) {
            this.dataStateService.loadData(result.metadata, result.obo, result.diaf);
            await this.router.navigate(['/metadata']);
          } else {
            this.error.set('Folder must contain metadata.json, dio.obo, and dio.diaf');
          }
        } else {
          this.error.set('Folder is empty or could not be read');
        }
      } else {
        // It's files - check if all 3 required files are present
        const files = event.dataTransfer?.files;
        if (files && files.length > 0) {
          const result = await this.fileSystemService.readFilesFromList(files);
          if (result) {
            this.dataStateService.loadData(result.metadata, result.obo, result.diaf);
            await this.router.navigate(['/metadata']);
          } else {
            this.error.set('Please drop a folder containing metadata.json, dio.obo, and dio.diaf');
          }
        }
      }
    } catch (err) {
      this.error.set((err as Error).message);
    } finally {
      this.isLoading.set(false);
    }
  }

  private readFilesFromDirectory(dirEntry: FileSystemDirectoryEntry): Promise<File[]> {
    return new Promise((resolve, reject) => {
      const reader = dirEntry.createReader();
      const files: File[] = [];

      const readEntries = () => {
        reader.readEntries(
          async (entries) => {
            if (entries.length === 0) {
              resolve(files);
              return;
            }

            for (const entry of entries) {
              if (entry.isFile) {
                const fileEntry = entry as FileSystemFileEntry;
                const file = await this.getFileFromEntry(fileEntry);
                files.push(file);
              }
            }

            // Continue reading if there are more entries
            readEntries();
          },
          (error) => reject(error)
        );
      };

      readEntries();
    });
  }

  private getFileFromEntry(fileEntry: FileSystemFileEntry): Promise<File> {
    return new Promise((resolve, reject) => {
      fileEntry.file(resolve, reject);
    });
  }

  async onDropFile(event: DragEvent, type: 'obo' | 'diaf' | 'metadata'): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    this.setDragState(type, false);

    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    // Validate file type
    if (!this.isValidFileForType(file, type)) {
      const expectedExt = type === 'metadata' ? '.json' : `.${type}`;
      this.error.set(`Expected a ${expectedExt} file, but got "${file.name}"`);
      return;
    }

    await this.processFile(file, type);
  }

  private isValidFileForType(file: File, type: 'obo' | 'diaf' | 'metadata'): boolean {
    const fileName = file.name.toLowerCase();

    switch (type) {
      case 'obo':
        return fileName.endsWith('.obo');
      case 'diaf':
        return fileName.endsWith('.diaf');
      case 'metadata':
        return fileName.endsWith('.json');
      default:
        return false;
    }
  }

  async onFolderInputChange(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files || files.length === 0) return;

    this.isLoading.set(true);
    this.error.set(null);

    try {
      const result = await this.fileSystemService.readFilesFromList(files);
      if (result) {
        this.dataStateService.loadData(result.metadata, result.obo, result.diaf);
        await this.router.navigate(['/metadata']);
      } else {
        this.error.set('Folder must contain metadata.json, dio.obo, and dio.diaf');
      }
    } catch (err) {
      this.error.set((err as Error).message);
    } finally {
      this.isLoading.set(false);
      input.value = '';
    }
  }

  async onFileInputChange(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    // Validate file type
    if (!this.isValidFileForType(file, this.currentFileType)) {
      const expectedExt = this.currentFileType === 'metadata' ? '.json' : `.${this.currentFileType}`;
      this.error.set(`Expected a ${expectedExt} file, but got "${file.name}"`);
      input.value = '';
      return;
    }

    await this.processFile(file, this.currentFileType);
    input.value = '';
  }

  private async processFile(file: File, type: 'obo' | 'diaf' | 'metadata'): Promise<void> {
    try {
      const content = await this.readFileContent(file);

      // Store the content
      this.pendingFiles[type] = content;

      // Update loaded state
      this.loadedFiles.update((state) => ({
        ...state,
        [type]: true,
      }));

      // Clear any previous error
      this.error.set(null);

      // Check if all files are loaded
      if (this.pendingFiles.obo && this.pendingFiles.diaf && this.pendingFiles.metadata) {
        this.dataStateService.loadData(
          this.pendingFiles.metadata,
          this.pendingFiles.obo,
          this.pendingFiles.diaf
        );
        await this.router.navigate(['/metadata']);
      }
    } catch (err) {
      this.error.set((err as Error).message);
    }
  }

  private readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
      reader.readAsText(file);
    });
  }

  private arrayToFileList(files: File[]): FileList {
    const dataTransfer = new DataTransfer();
    files.forEach((file) => dataTransfer.items.add(file));
    return dataTransfer.files;
  }
}
