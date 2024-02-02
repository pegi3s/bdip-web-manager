import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FileSelectionScreenComponent } from './file-selection-screen.component';

describe('FilePickerComponent', () => {
  let component: FileSelectionScreenComponent;
  let fixture: ComponentFixture<FileSelectionScreenComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FileSelectionScreenComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FileSelectionScreenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
