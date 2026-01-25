import { Injectable, signal, computed } from '@angular/core';

/**
 * File System Service
 * Handles file operations with File System Access API (Chrome/Edge)
 * and fallback for unsupported browsers (Firefox/Safari)
 */

export interface FileHandles {
  metadataHandle?: FileSystemFileHandle;
  oboHandle?: FileSystemFileHandle;
  diafHandle?: FileSystemFileHandle;
  directoryHandle?: FileSystemDirectoryHandle;
}

@Injectable({
  providedIn: 'root',
})
export class FileSystemService {
  // Check if File System Access API is supported
  readonly supportsFileSystemAccess = signal(
    'showOpenFilePicker' in window && 'showSaveFilePicker' in window
  );

  // Store file handles for direct save
  private fileHandles = signal<FileHandles>({});

  // Track loaded file names for display
  readonly loadedFiles = signal<{
    metadata?: string;
    obo?: string;
    diaf?: string;
    directory?: string;
  }>({});

  /**
   * Open a folder and find the required files
   */
  async openFolder(): Promise<{
    metadata: string;
    obo: string;
    diaf: string;
  } | null> {
    if (!this.supportsFileSystemAccess()) {
      console.warn('File System Access API not supported');
      return null;
    }

    try {
      const dirHandle = await window.showDirectoryPicker({
        mode: 'readwrite',
      });

      const handles = await this.findRequiredHandles(dirHandle);
      const { metadataHandle, oboHandle, diafHandle, sourceDirectory } = handles;

      if (!metadataHandle || !oboHandle || !diafHandle) {
        throw new Error(
          'Folder must contain metadata.json, dio.obo, and dio.diaf files'
        );
      }

      this.fileHandles.set({
        metadataHandle,
        oboHandle,
        diafHandle,
        directoryHandle: sourceDirectory ?? dirHandle,
      });

      this.loadedFiles.set({
        metadata: 'metadata.json',
        obo: 'dio.obo',
        diaf: 'dio.diaf',
        directory: sourceDirectory
          ? `${dirHandle.name}/${sourceDirectory.name}`
          : dirHandle.name,
      });

      const metadataContent = await this.readFileHandle(metadataHandle);
      const oboContent = await this.readFileHandle(oboHandle);
      const diafContent = await this.readFileHandle(diafHandle);

      return {
        metadata: metadataContent,
        obo: oboContent,
        diaf: diafContent,
      };
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        return null; // User cancelled
      }
      throw error;
    }
  }

  /**
   * Open individual files using file picker
   */
  async openFiles(): Promise<{
    metadata: string;
    obo: string;
    diaf: string;
  } | null> {
    if (!this.supportsFileSystemAccess()) {
      return null;
    }

    try {
      const [metadataHandle] = await window.showOpenFilePicker({
        types: [
          {
            description: 'JSON Files',
            accept: { 'application/json': ['.json'] },
          },
        ],
        multiple: false,
      });

      const [oboHandle] = await window.showOpenFilePicker({
        types: [
          {
            description: 'OBO Files',
            accept: { 'text/plain': ['.obo'] },
          },
        ],
        multiple: false,
      });

      const [diafHandle] = await window.showOpenFilePicker({
        types: [
          {
            description: 'DIAF Files',
            accept: { 'text/plain': ['.diaf'] },
          },
        ],
        multiple: false,
      });

      this.fileHandles.set({
        metadataHandle,
        oboHandle,
        diafHandle,
      });

      this.loadedFiles.set({
        metadata: metadataHandle.name,
        obo: oboHandle.name,
        diaf: diafHandle.name,
      });

      const metadataContent = await this.readFileHandle(metadataHandle);
      const oboContent = await this.readFileHandle(oboHandle);
      const diafContent = await this.readFileHandle(diafHandle);

      return {
        metadata: metadataContent,
        obo: oboContent,
        diaf: diafContent,
      };
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Read files from a File list (drag & drop or fallback input)
   */
  async readFilesFromList(
    files: FileList
  ): Promise<{ metadata: string; obo: string; diaf: string } | null> {
    let metadataFile: File | undefined;
    let oboFile: File | undefined;
    let diafFile: File | undefined;

    const metadataCandidates: Array<{ file: File; score: number }> = [];
    const oboCandidates: Array<{ file: File; score: number }> = [];
    const diafCandidates: Array<{ file: File; score: number }> = [];

    const isMetadataPath = (path: string | undefined): boolean => {
      if (!path) return false;
      const normalized = path.replace(/\\/g, '/').toLowerCase();
      return normalized.includes('/metadata/') || normalized.startsWith('metadata/');
    };

    const scoreForPath = (path: string | undefined): number => {
      if (!path) return 0;
      return isMetadataPath(path) ? 2 : 0;
    };

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const relativePath = this.getRelativePath(file);

      if (file.name === 'metadata.json') {
        metadataCandidates.push({ file, score: scoreForPath(relativePath) });
      } else if (file.name === 'dio.obo' || file.name.endsWith('.obo')) {
        oboCandidates.push({ file, score: scoreForPath(relativePath) });
      } else if (file.name === 'dio.diaf' || file.name.endsWith('.diaf')) {
        diafCandidates.push({ file, score: scoreForPath(relativePath) });
      }
    }

    metadataFile = this.pickBestCandidate(metadataCandidates);
    oboFile = this.pickBestCandidate(oboCandidates);
    diafFile = this.pickBestCandidate(diafCandidates);

    if (!metadataFile || !oboFile || !diafFile) {
      return null;
    }

    this.loadedFiles.set({
      metadata: metadataFile.name,
      obo: oboFile.name,
      diaf: diafFile.name,
    });

    // Clear handles since we can't save directly in fallback mode
    this.fileHandles.set({});

    const metadataContent = await this.readFile(metadataFile);
    const oboContent = await this.readFile(oboFile);
    const diafContent = await this.readFile(diafFile);

    return {
      metadata: metadataContent,
      obo: oboContent,
      diaf: diafContent,
    };
  }

  /**
   * Save files using File System Access API
   */
  async saveFiles(
    metadataContent: string,
    oboContent: string,
    diafContent: string
  ): Promise<boolean> {
    const handles = this.fileHandles();

    if (handles.metadataHandle && handles.oboHandle && handles.diafHandle) {
      // Direct save with File System Access API
      await this.writeFileHandle(handles.metadataHandle, metadataContent);
      await this.writeFileHandle(handles.oboHandle, oboContent);
      await this.writeFileHandle(handles.diafHandle, diafContent);
      return true;
    } else {
      // Fallback: trigger downloads
      this.downloadFile('metadata.json', metadataContent, 'application/json');
      this.downloadFile('dio.obo', oboContent, 'text/plain');
      this.downloadFile('dio.diaf', diafContent, 'text/plain');
      return true;
    }
  }

  /**
   * Check if we can save directly (have file handles)
   */
  canSaveDirectly(): boolean {
    const handles = this.fileHandles();
    return !!(handles.metadataHandle && handles.oboHandle && handles.diafHandle);
  }

  private async readFileHandle(handle: FileSystemFileHandle): Promise<string> {
    const file = await handle.getFile();
    return await file.text();
  }

  private getRelativePath(file: File): string | undefined {
    const fileWithPath = file as File & { webkitRelativePath?: string; relativePath?: string };
    return fileWithPath.relativePath || fileWithPath.webkitRelativePath || undefined;
  }

  private pickBestCandidate(
    candidates: Array<{ file: File; score: number }>
  ): File | undefined {
    if (candidates.length === 0) return undefined;
    return candidates.reduce((best, current) =>
      current.score > best.score ? current : best
    ).file;
  }

  private async findRequiredHandles(
    dirHandle: FileSystemDirectoryHandle
  ): Promise<{
    metadataHandle: FileSystemFileHandle;
    oboHandle: FileSystemFileHandle;
    diafHandle: FileSystemFileHandle;
    sourceDirectory?: FileSystemDirectoryHandle;
  }> {
    let metadataHandle: FileSystemFileHandle | undefined;
    let oboHandle: FileSystemFileHandle | undefined;
    let diafHandle: FileSystemFileHandle | undefined;
    let metadataDirectory: FileSystemDirectoryHandle | undefined;

    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'file') {
        if (entry.name === 'metadata.json') {
          metadataHandle = entry;
        } else if (entry.name === 'dio.obo') {
          oboHandle = entry;
        } else if (entry.name === 'dio.diaf') {
          diafHandle = entry;
        }
      } else if (entry.kind === 'directory' && entry.name === 'metadata') {
        metadataDirectory = entry;
      }
    }

    if (metadataHandle && oboHandle && diafHandle) {
      return { metadataHandle, oboHandle, diafHandle };
    }

    if (metadataDirectory) {
      let subMetadataHandle: FileSystemFileHandle | undefined;
      let subOboHandle: FileSystemFileHandle | undefined;
      let subDiafHandle: FileSystemFileHandle | undefined;

      for await (const entry of metadataDirectory.values()) {
        if (entry.kind === 'file') {
          if (entry.name === 'metadata.json') {
            subMetadataHandle = entry;
          } else if (entry.name === 'dio.obo') {
            subOboHandle = entry;
          } else if (entry.name === 'dio.diaf') {
            subDiafHandle = entry;
          }
        }
      }

      if (subMetadataHandle && subOboHandle && subDiafHandle) {
        return {
          metadataHandle: subMetadataHandle,
          oboHandle: subOboHandle,
          diafHandle: subDiafHandle,
          sourceDirectory: metadataDirectory,
        };
      }
    }

    throw new Error('Folder must contain metadata.json, dio.obo, and dio.diaf files');
  }

  private async writeFileHandle(
    handle: FileSystemFileHandle,
    content: string
  ): Promise<void> {
    const writable = await handle.createWritable();
    await writable.write(content);
    await writable.close();
  }

  private async readFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }

  private downloadFile(
    filename: string,
    content: string,
    mimeType: string
  ): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
