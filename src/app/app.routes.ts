import { Routes } from '@angular/router';
import { OntologyEditorComponent } from './ontology-editor/ontology-editor.component';
import { FileSelectionScreenComponent } from "./file-selection-screen/file-selection-screen.component";

export const routes: Routes = [
    {
        path: '',
        title: 'Bioinformatics Docker Images Project',
        // component: OntologyEditorComponent,
        component: FileSelectionScreenComponent
    },
];
