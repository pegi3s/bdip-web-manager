import { Injectable } from "@angular/core";

import { Ontology } from "../obo/Ontology";
import { ImageMetadata } from "../models/image-metadata";

@Injectable({
  providedIn: "root"
})
export class ContainerLocalService {
  private ontology?: Ontology;
  private containers?: Map<string, Set<string>>;
  private containersMetadata?: Map<string, ImageMetadata>;

  private metadataDirectoryHandle?: FileSystemDirectoryHandle;
  private oboFileHandle?: FileSystemFileHandle;
  private diafFileHandle?: FileSystemFileHandle;
  private metadataJsonFileHandle?: FileSystemFileHandle;

  async setMetadataDirectoryHandle(handle: FileSystemHandle): Promise<void> {
    this.metadataDirectoryHandle = handle as FileSystemDirectoryHandle;

    const files = Array();
    for await (const entry of this.metadataDirectoryHandle.values()) {
      files.push(entry);
    }

    this.setMetadataFileHandles(files);
  }

  setMetadataFileHandles(handles: FileSystemHandle[]): void {
    handles.forEach(handle => {
      if (handle.kind === "file") {
        switch (this.getFileExtension(handle.name)) {
          case "obo":
            this.oboFileHandle = handle as FileSystemFileHandle;
            break;
          case "diaf":
            this.diafFileHandle = handle as FileSystemFileHandle;
            break;
          case "json":
            this.metadataJsonFileHandle = handle as FileSystemFileHandle;
            break;
        }
      }
    });
  }

  private getFileExtension(fileName: string): string {
    return fileName.split(".").pop()!!;
  }

  private getRawTextFile(fileHandle?: FileSystemFileHandle): Promise<string> | undefined {
    return fileHandle?.getFile().then((file) => file.text());
  }

  async getOntology(): Promise<Ontology | undefined> {
    if (this.ontology === undefined) {
      await this.getRawTextFile(this.oboFileHandle)?.then((data) => {
        this.ontology = new Ontology(data);
      });
    }

    return this.ontology;
  }

  /**
   * Parse the raw data from the DIAF file into a Map object where the key is the category
   * and the value is a Set of containers.
   *
   * @param {string} data The raw data from the DIAF file.
   * @returns {Map<string, Set<string>>} A Map object where the key is the category and the value is a Set of containers.
   */
  private parseContainers(data: string): Map<string, Set<string>> {
    const containers = new Map<string, Set<string>>();

    data.split("\n").forEach((element) => {
      if (!element) return;

      const [key, value] = element.split("\t");
      if (!containers.has(key)) {
        containers.set(key, new Set([value]));
      } else {
        containers.get(key)?.add(value);
      }
    });
    return containers;
  }

  /**
   * Retrieve a Map where:
   * - The key is the category of the ontology
   * - The value is a Set of the names of the containers that belong to that category
   *
   * @returns {Promise<Map<string, Set<string>>>} A Map object where the key is the category and the value is a Set of containers.
   */
  async getContainersMap(): Promise<Map<string, Set<string>> | undefined> {
    if (this.containers === undefined) {
      await this.getRawTextFile(this.diafFileHandle)?.then((data) => {
        this.containers = this.parseContainers(data);
      });
    }

    return this.containers;
  }

  /**
   * Fetches and processes container metadata.
   *
   * This method retrieves an array of `ImageMetadata` objects.
   * It then processes this array to create a `Map` where each key is the container's name and the value is its metadata.
   */
  async getContainersMetadata(): Promise<Map<string, ImageMetadata> | undefined> {
    if (this.containersMetadata === undefined) {
      await this.getRawTextFile(this.metadataJsonFileHandle)?.then((data) => {
        const metadataJson: ImageMetadata[] = JSON.parse(data);
        const map = new Map<string, ImageMetadata>();
        metadataJson.forEach((item: ImageMetadata) => {
          if (map.has(item.name)) {
            console.error(`Duplicate container name found: ${item.name}`);
          } else {
            map.set(item.name, item);
          }
        });
        this.containersMetadata = map;
      });
    }

    return this.containersMetadata;
  }
}
