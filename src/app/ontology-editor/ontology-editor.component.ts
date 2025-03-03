import { Component, computed, inject, Signal } from "@angular/core";
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

  ontology!: Signal<Ontology | undefined>;
  containers!: Signal<Map<string, Set<string>>>;
  isDataLoaded = computed(() => this.ontology() != undefined && this.containers().size !== 0)

  async ngOnInit() {
    this.loadData();
    // Wait for the data to be loaded
    await new Promise((resolve) => setTimeout(resolve, 100));
    // If the data is not loaded, redirect to the home page
    if (!this.isDataLoaded()) {
      this.router.navigate(['/']);
    }
  }

  loadData(): void {
    this.ontology = this.containerService.getOntology(true);
    this.containers = this.containerService.getContainersMap(true);
    this.containerService.getContainersMetadata(true);
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
      await this.containerService.saveOBOFile();
      await this.containerService.saveDIAFFile();
      await this.containerService.saveMetadataFile();
    }
  }
}
