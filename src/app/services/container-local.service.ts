import { Injectable } from "@angular/core";

import { Ontology } from "../obo/Ontology";
import { ImageMetadata } from "../models/image-metadata";

@Injectable({
  providedIn: "root"
})
export class ContainerLocalService {
  private metadataDirectoryHandle?: FileSystemDirectoryHandle;
  private oboFileHandle?: FileSystemFileHandle;
  private diafFileHandle?: FileSystemFileHandle;
  private metadataJsonFileHandle?: FileSystemFileHandle;

  private ontology?: Ontology;
  private containers?: Map<string, Set<string>>;
  private containersMetadata?: Map<string, ImageMetadata>;

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
        switch (handle.name) {
          case "dio.obo":
            this.oboFileHandle = handle as FileSystemFileHandle;
            break;
          case "dio.diaf":
            this.diafFileHandle = handle as FileSystemFileHandle;
            break;
          case "metadata.json":
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

  async saveFile(extension: string, content: Blob): Promise<void> {
    let fileHandle: FileSystemFileHandle | undefined;
    switch (extension) {
      case "obo":
        fileHandle = this.oboFileHandle;
        break;
      case "diaf":
        fileHandle = this.diafFileHandle;
        break;
      case "json":
        fileHandle = this.metadataJsonFileHandle;
        break;
    }

    const writable = await fileHandle!!.createWritable();
    await writable.write(content);
    await writable.close();
  }

  async getOntology(reload: boolean = false): Promise<Ontology | undefined> {
    if (this.ontology === undefined || reload) {
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
  async getContainersMap(reload: boolean = false): Promise<Map<string, Set<string>> | undefined> {
    if (this.containers === undefined || reload) {
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
  async getContainersMetadata(reload: boolean = false): Promise<Map<string, ImageMetadata> | undefined> {
    if (this.containersMetadata === undefined) {
      const data = await this.getRawTextFile(this.metadataJsonFileHandle);
      if (data) {
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
      }
    }

    return this.containersMetadata;
  }

  async getContainerMetadata(name: string): Promise<ImageMetadata | undefined> {
    if (this.containersMetadata === undefined) {
      await this.getContainersMetadata();
    }

    return this.containersMetadata?.get(name.trim());
  }

  setContainerMetadata(metadata: ImageMetadata): void {
    const name = metadata.name.trim();
    this.containersMetadata!.set(name, metadata);
  }

  async saveOBOFile(ontology?: Ontology): Promise<void> {
    if (ontology === undefined) {
      ontology = await this.getOntology();
    }
    await this.saveFile('obo', ontology!.toOBOFile());
  }

  async saveDIAFFile(containers?: Map<string, Set<string>>): Promise<void> {
    if (containers === undefined) {
      containers = await this.getContainersMap();
    }
    // Create a DIAF mapping by swapping keys and values.
    const diafMap = new Map<string, Set<string>>();
    containers!.forEach((values, key) => {
      values.forEach(value => {
        if (!diafMap.has(value)) {
          diafMap.set(value, new Set<string>());
        }
        diafMap.get(value)!.add(key);
      });
    });

    // Sort the DIAF map and build the file content.
    const sortedDiafMap = new Map([...diafMap.entries()].sort());
    let diafContent = '';
    sortedDiafMap.forEach((terms, category) => {
      Array.from(terms).sort().forEach(term => {
        diafContent += `${term}\t${category}\n`;
      });
    });

    await this.saveFile('diaf', new Blob([diafContent], { type: 'text/plain' }));
  }

  async saveMetadataFile(): Promise<void> {
    // Sort map and get values as an array.
    const sortedMetadata = new Map([...this.containersMetadata!.entries()].sort())
    const data = Array.from(sortedMetadata.values());
    // Save JSON data
    const jsonBlob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    // TODO: gatk-4 comments Unicode \u2060 -> fix
    await this.saveFile('json', jsonBlob);
  }
}
