import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { DataStateService } from './services/data-state.service';

/**
 * Guard to check if files are loaded before accessing editor routes
 */
export const filesLoadedGuard = () => {
  const dataState = inject(DataStateService);
  const router = inject(Router);

  if (!dataState.filesLoaded()) {
    return router.createUrlTree(['/']);
  }
  return true;
};

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/file-selector/file-selector.component').then(
        (m) => m.FileSelectorComponent
      ),
  },
  {
    path: 'metadata',
    loadComponent: () =>
      import('./components/metadata-editor/metadata-editor.component').then(
        (m) => m.MetadataEditorComponent
      ),
    canActivate: [filesLoadedGuard],
  },
  {
    path: 'ontology',
    loadComponent: () =>
      import('./components/ontology-editor/ontology-editor.component').then(
        (m) => m.OntologyEditorComponent
      ),
    canActivate: [filesLoadedGuard],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
