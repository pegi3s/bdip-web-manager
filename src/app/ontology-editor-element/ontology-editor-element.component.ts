import { Component, HostBinding, HostListener, Input, inject, input } from '@angular/core';
import { TermStanza } from '../obo/TermStanza';
import { Ontology } from '../obo/Ontology';
import { SvgIconComponent } from "angular-svg-icon";
import { ImageMetadataDialogComponent } from "../image-metadata-dialog/image-metadata-dialog.component";
import { Dialog } from "@angular/cdk/dialog";
import { ContainerLocalService } from "../services/container-local.service";
import { ImageMetadata } from "../models/image-metadata";

@Component({
    selector: 'app-ontology-editor-element',
    imports: [
        SvgIconComponent
    ],
    templateUrl: './ontology-editor-element.component.html',
    styleUrl: './ontology-editor-element.component.css'
})
export class OntologyEditorElementComponent {
  ontology = input<Ontology>();
  category = input<TermStanza>();
  containers = input<Map<string, Set<string>>>();

  dialog: Dialog = inject(Dialog);
  containerService: ContainerLocalService = inject(ContainerLocalService);

  @HostBinding('class.open') opened = false;

  @HostListener('click', ['$event'])
  onInput(event: any) {
    const isOuterElement = () => event.target.closest('app-ontology-editor-element') === event.currentTarget;
    const isClickInHeader = () => event.target.closest('.dummy') == null && event.target.closest('.name') !== null;
    const hasChildren = () => this.category()?.hasChildren() || this.containers()?.get(this.category()?.id || "")?.size != 0;
    if (!isOuterElement() || !hasChildren() || (this.opened && !isClickInHeader())) {
      return;
    }
    this.opened = !this.opened;
  }

  async createEditContainer(name?: string) {
    const metadata = name ?
      await this.containerService.getContainerMetadata(name) :
      {
        name: "",
        description: "",
        status: "Usable",
        recommended: [],
        latest: "",
        bug_found: [],
        not_working: [],
        no_longer_tested: [],
        manual_url: "",
        source_url: "",
        comments: [],
        gui: false,
        gui_command: "",
        podman: "untested",
        singularity: "untested",
        invocation_general: "",
        usual_invocation_specific: "",
        usual_invocation_specific_comments: [],
        test_invocation_specific: "",
        test_data_url: "",
        test_results_url: "",
        icon: "",
        input_data_type: [],
        auto_tests: []
      } as ImageMetadata;

    const dialogRef = this.dialog.open(ImageMetadataDialogComponent, {
      width: '800px',
      maxHeight: '90vh',
      data: { metadata }
    });

    dialogRef.closed.subscribe(result => {
      if (result) {
        this.containerService.setContainerMetadata(result as ImageMetadata);
      }
    });
  }

  removeStanza() {
    if (this.category()) {
      this.ontology()?.removeTerm(this.category()!);
    }
  }
}
