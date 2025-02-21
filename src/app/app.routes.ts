import { Routes } from "@angular/router";
import { FileSelectionScreenComponent } from "./file-selection-screen/file-selection-screen.component";
import { OntologyEditorComponent } from "./ontology-editor/ontology-editor.component";

export const routes: Routes = [
  {
    path: "",
    title: "Bioinformatics Docker Images Project",
    component: FileSelectionScreenComponent
  },
  {
    path: "editor",
    title: "Bioinformatics Docker Images Project",
    component: OntologyEditorComponent
  }
];
