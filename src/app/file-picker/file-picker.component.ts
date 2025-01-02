import { Component, input, output, signal } from "@angular/core";
import { SvgIconComponent } from "angular-svg-icon";

@Component({
    selector: "app-file-picker",
    imports: [
        SvgIconComponent
    ],
    templateUrl: "./file-picker.component.html",
    styleUrl: "./file-picker.component.css"
})
export class FilePickerComponent {
  readonly pickDirectory = input<boolean>(false);
  readonly expectedFile = input.required<string[]>();
  readonly filenameHint = input.required<string>();

  readonly fileSelected = output<FileSystemHandle>();

  readonly fileSystemHandle = signal<FileSystemHandle | undefined>(undefined);


  // https://developer.chrome.com/docs/capabilities/web-apis/file-system-access#drag_and_drop_integration
  dragoverHandler(event: DragEvent): void {
    event.preventDefault();
  }

  async dropHandler(event: DragEvent): Promise<void> {
    event.preventDefault();

    const fileHandlesPromises = Array.from(event.dataTransfer!!.items)
      .filter((item) => item.kind === "file")
      .map((item) => item.getAsFileSystemHandle());

    if (fileHandlesPromises.length != 1) {
      alert("Submit only 1");
    }

    const handle = (await fileHandlesPromises[0])!!;

    if (this.pickDirectory() && handle.kind === "directory") {
      const dirHandle = handle as FileSystemDirectoryHandle;

      // const entries = Array.fromAsync(dirHandle.entries());
      const entries = Array();
      for await (const filename of dirHandle.keys()) {
        entries.push(filename);
      }

      if (this.expectedFile().every((file) => entries.includes(file))) {
        this.fileSystemHandle.set(dirHandle);
        this.fileSelected.emit(dirHandle);
      }
    }
    // In files, only check file extension
    else if (!this.pickDirectory() && handle.kind === "file" && this.getFileExtension(handle.name) === this.getFileExtension(this.expectedFile()[0])) {
      const fileHandle = handle as FileSystemFileHandle;
      this.fileSystemHandle.set(fileHandle);
      this.fileSelected.emit(fileHandle);
    }
  }

  private getFileExtension(fileName: string): string {
    return fileName.split(".").pop()!!;
  }
}
