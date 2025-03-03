import { Component, inject, signal } from "@angular/core";
import { TermStanza } from '../obo/TermStanza';
import { OntologyEditorElementComponent } from '../ontology-editor-element/ontology-editor-element.component';
import { Ontology } from '../obo/Ontology';
import { ContainerLocalService } from "../services/container-local.service";
import { SvgIconComponent } from "angular-svg-icon";
import { Router } from "@angular/router";

@Component({
    selector: 'app-ontology-editor',
    templateUrl: './ontology-editor.component.html',
    styleUrl: './ontology-editor.component.css',
  imports: [OntologyEditorElementComponent, SvgIconComponent]
})
export class OntologyEditorComponent {
  containerService: ContainerLocalService = inject(ContainerLocalService);
  readonly router = inject(Router);

  readonly ontology = signal<Ontology | undefined>(undefined);
  readonly containers = signal<Map<string, Set<string>> | undefined>(undefined);

  async ngOnInit() {
    console.log('Loading categories...');
    this.loadData().then((loaded) => {
      if (loaded) {
        console.log('Loaded categories');
      } else {
        this.router.navigate(['/']);
      }
    });
  }

  async loadData(): Promise<boolean> {
    this.ontology.set(await this.containerService.getOntology(true));
    this.containers.set(await this.containerService.getContainersMap(true));
    await this.containerService.getContainersMetadata(true);

    // Was the data loaded?
    return this.ontology() != undefined && this.containers() != undefined;
  }

  getRootCategories(): TermStanza[] {
    if (this.ontology() != null) {
      return this.ontology()!!.getAllOntologyTerms().filter((term) => !term.hasParents());
    } else {
      return [];
    }
  }

  async save(): Promise<void> {
    if (this.ontology() != null && this.containers() != null) {
      await this.containerService.saveOBOFile(this.ontology()!);
      await this.containerService.saveDIAFFile(this.containers()!);
      await this.containerService.saveMetadataFile();
    }
  }
}
