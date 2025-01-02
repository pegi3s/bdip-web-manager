import { Component, computed, signal } from "@angular/core";
import { FilePickerComponent } from "../file-picker/file-picker.component";

@Component({
    selector: 'app-file-selection-screen',
    imports: [
        FilePickerComponent
    ],
    templateUrl: './file-selection-screen.component.html',
    styleUrl: './file-selection-screen.component.css'
})
export class FileSelectionScreenComponent {
  readonly filesToUpload: string[] = ["dio.obo", "dio.diaf", "metadata.json"];

  readonly selectedFiles = signal<FileSystemHandle[]>([]);

  readonly showContinueButton = computed(() => {
    return this.selectedFiles().filter((h) => h.kind === "directory").length === 1
      || this.selectedFiles().filter((h) => h.kind === "file").length === this.filesToUpload.length;
  });

  onFileSelected(handle: FileSystemHandle): void {
    if (handle.kind === "directory") {
      // Remove previous directory handle and set the new one
      const newHandles = this.selectedFiles().filter((h) => h.kind !== "directory");
      newHandles.push(handle);
      this.selectedFiles.set(newHandles);
    } else {
      // Remove previous file handle with the same extension and set the new one
      const newHandles = this.selectedFiles().filter((h) => h.kind !== "file" || this.getFileExtension(h.name) !== this.getFileExtension(handle.name));
      newHandles.push(handle);
      this.selectedFiles.set(newHandles);
    }
  }

  onContinue(): void {
    // Set handlers in service
  }

  private getFileExtension(fileName: string): string {
    return fileName.split(".").pop()!!;
  }
}
