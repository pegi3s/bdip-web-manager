import { Component, inject } from '@angular/core';
import { ContainerService } from '../services/container.service';
import { TermStanza } from '../obo/TermStanza';
import { OntologyEditorElementComponent } from '../ontology-editor-element/ontology-editor-element.component';
import { Ontology } from '../obo/Ontology';

@Component({
  selector: 'app-ontology-editor',
  standalone: true,
  templateUrl: './ontology-editor.component.html',
  styleUrl: './ontology-editor.component.css',
  imports: [OntologyEditorElementComponent],
})
export class OntologyEditorComponent {
  containerService: ContainerService = inject(ContainerService);
  ontology?: Ontology;
  containers: Map<string, Set<string>> = new Map<string, Set<string>>();

  ngOnInit() {
    console.log('Loading categories...');
    this.containerService.getOntology(false).subscribe((ontology) => {
      this.ontology = ontology;
    });
    this.containerService.getContainersMap().subscribe((containers) => {
      this.containers = containers;
    });
  }

  getRootCategories(): TermStanza[] {
    if (this.ontology != null) {
      return this.ontology.getAllOntologyTerms().filter((term) => !term.hasParents());
    } else {
      return [];
    }
  }

  save(): void {
    if (this.ontology != null) {
      const file = this.ontology.toOBOFile();
      const url = URL.createObjectURL(file);

      // Create an anchor element with the generated URL and programmatically click it to force the download
      const a = document.createElement('a');
      a.href = url;
      a.download = 'dio.obo';
      a.click();

      URL.revokeObjectURL(url);
    }
  }
}
