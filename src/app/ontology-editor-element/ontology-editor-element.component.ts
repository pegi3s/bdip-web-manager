import { Component, HostBinding, HostListener, Input, inject, input } from '@angular/core';
import { TermStanza } from '../obo/TermStanza';
import { Ontology } from '../obo/Ontology';
import { SvgIconComponent } from "angular-svg-icon";

@Component({
  selector: 'app-ontology-editor-element',
  standalone: true,
  imports: [
    SvgIconComponent
  ],
  templateUrl: './ontology-editor-element.component.html',
  styleUrl: './ontology-editor-element.component.css',
})
export class OntologyEditorElementComponent {
  ontology = input<Ontology>();
  category = input<TermStanza>();
  containers = input<Map<string, Set<string>>>();

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

  addStanza() {
    console.log('Adding stanza...');
  }

  removeStanza() {
    if (this.category()) {
      this.ontology()?.removeTerm(this.category()!);
    }
  }
}
