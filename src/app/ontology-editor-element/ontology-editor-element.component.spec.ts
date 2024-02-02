import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OntologyEditorElementComponent } from './ontology-editor-element.component';

describe('OntologyEditorElementComponent', () => {
  let component: OntologyEditorElementComponent;
  let fixture: ComponentFixture<OntologyEditorElementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OntologyEditorElementComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(OntologyEditorElementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
