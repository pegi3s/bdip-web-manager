import { Component, ElementRef, inject, Inject } from "@angular/core";
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { AutoTests, BugFound, ImageMetadata, Recommended } from "../models/image-metadata";
import { Dialog, DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { NgForOf, NgIf } from "@angular/common";
import { ThemeService } from "../services/theme.service";

@Component({
  selector: 'app-image-metadata-dialog',
  imports: [
    ReactiveFormsModule,
    NgForOf
  ],
  templateUrl: './image-metadata-dialog.component.html',
  styleUrl: './image-metadata-dialog.component.css',
  host: { "[class.dark]": "isDarkTheme()" }
})
export class ImageMetadataDialogComponent {
  form!: FormGroup;

  readonly themeService: ThemeService = inject(ThemeService);
  readonly isDarkTheme = this.themeService.isDarkTheme();

  constructor(
    public dialogRef: DialogRef<ImageMetadata>,
    @Inject(DIALOG_DATA) public data: { metadata: ImageMetadata },
    private fb: FormBuilder,
    private elementRef: ElementRef
  ) {}

  ngOnInit(): void {
    this.initForm();
    // Add global listener to handle ESC key
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        this.onCancel();
      }
    });
  }

  initForm(): void {
    this.form = this.fb.group({
      name: [this.data.metadata.name, Validators.required],
      description: [this.data.metadata.description, Validators.required],
      status: [this.data.metadata.status, Validators.required],
      recommended: this.fb.array(
        this.data.metadata.recommended.map(rec => this.createRecommendedFormGroup(rec))
      ),
      latest: [this.data.metadata.latest, Validators.required],
      bug_found: this.fb.array(
        this.data.metadata.bug_found.map(bug => this.createBugFoundFormGroup(bug))
      ),
      not_working: this.fb.array(
        this.data.metadata.not_working.map(ver => this.fb.control(ver))
      ),
      no_longer_tested: this.fb.array(
        this.data.metadata.no_longer_tested.map(ver => this.fb.control(ver))
      ),
      manual_url: [this.data.metadata.manual_url],
      source_url: [this.data.metadata.source_url],
      comments: this.fb.array(
        this.data.metadata.comments.map(comment => this.fb.control(comment))
      ),
      gui: [this.data.metadata.gui],
      gui_command: [this.data.metadata.gui_command],
      podman: [this.data.metadata.podman],
      singularity: [this.data.metadata.singularity],
      invocation_general: [this.data.metadata.invocation_general],
      usual_invocation_specific: [this.data.metadata.usual_invocation_specific],
      usual_invocation_specific_comments: this.fb.array(
        this.data.metadata.usual_invocation_specific_comments.map(comment => this.fb.control(comment))
      ),
      test_invocation_specific: [this.data.metadata.test_invocation_specific],
      test_data_url: [this.data.metadata.test_data_url],
      test_results_url: [this.data.metadata.test_results_url],
      icon: [this.data.metadata.icon],
      input_data_type: this.fb.array(
        this.data.metadata.input_data_type.map(type => this.fb.control(type))
      ),
      auto_tests: this.fb.array(
        this.data.metadata.auto_tests.map(test => this.createAutoTestsFormGroup(test))
      )
    });
  }

  createRecommendedFormGroup(recommended?: Recommended): FormGroup {
    return this.fb.group({
      version: [recommended?.version || '', Validators.required],
      date: [recommended?.date || '', Validators.required]
    });
  }

  createBugFoundFormGroup(bugFound?: BugFound): FormGroup {
    return this.fb.group({
      version: [bugFound?.version || '', Validators.required],
      description: [bugFound?.description || '', Validators.required]
    });
  }

  createAutoTestsFormGroup(autoTest?: AutoTests): FormGroup {
    return this.fb.group({
      docker_image: [autoTest?.docker_image || '', Validators.required],
      input_files: this.fb.array(
        autoTest?.input_files.map(file => this.fb.control(file)) || []
      ),
      output_dir: [autoTest?.output_dir || ''],
      output_file: [autoTest?.output_file || ''],
      add_config: [autoTest?.add_config || ''],
      commands: [autoTest?.commands || '', Validators.required]
    });
  }

  // Helper methods for form arrays
  get recommendedArray(): FormArray {
    return this.form.get('recommended') as FormArray;
  }

  get bugFoundArray(): FormArray {
    return this.form.get('bug_found') as FormArray;
  }

  get notWorkingArray(): FormArray {
    return this.form.get('not_working') as FormArray;
  }

  get noLongerTestedArray(): FormArray {
    return this.form.get('no_longer_tested') as FormArray;
  }

  get commentsArray(): FormArray {
    return this.form.get('comments') as FormArray;
  }

  get usualInvocationSpecificCommentsArray(): FormArray {
    return this.form.get('usual_invocation_specific_comments') as FormArray;
  }

  get inputDataTypeArray(): FormArray {
    return this.form.get('input_data_type') as FormArray;
  }

  get autoTestsArray(): FormArray {
    return this.form.get('auto_tests') as FormArray;
  }

  getInputFilesArray(index: number): FormArray {
    return (this.autoTestsArray.at(index) as FormGroup).get('input_files') as FormArray;
  }

  // Methods to add new items to arrays
  addRecommended(): void {
    this.recommendedArray.push(this.createRecommendedFormGroup());
  }

  addBugFound(): void {
    this.bugFoundArray.push(this.createBugFoundFormGroup());
  }

  addNotWorking(): void {
    this.notWorkingArray.push(this.fb.control(''));
  }

  addNoLongerTested(): void {
    this.noLongerTestedArray.push(this.fb.control(''));
  }

  addComment(): void {
    this.commentsArray.push(this.fb.control(''));
  }

  addUsualInvocationSpecificComment(): void {
    this.usualInvocationSpecificCommentsArray.push(this.fb.control(''));
  }

  addInputDataType(): void {
    this.inputDataTypeArray.push(this.fb.control(''));
  }

  addAutoTest(): void {
    this.autoTestsArray.push(this.createAutoTestsFormGroup());
  }

  addInputFile(autoTestIndex: number): void {
    this.getInputFilesArray(autoTestIndex).push(this.fb.control(''));
  }

  // Methods to remove items from arrays
  removeRecommended(index: number): void {
    this.recommendedArray.removeAt(index);
  }

  removeBugFound(index: number): void {
    this.bugFoundArray.removeAt(index);
  }

  removeNotWorking(index: number): void {
    this.notWorkingArray.removeAt(index);
  }

  removeNoLongerTested(index: number): void {
    this.noLongerTestedArray.removeAt(index);
  }

  removeComment(index: number): void {
    this.commentsArray.removeAt(index);
  }

  removeUsualInvocationSpecificComment(index: number): void {
    this.usualInvocationSpecificCommentsArray.removeAt(index);
  }

  removeInputDataType(index: number): void {
    this.inputDataTypeArray.removeAt(index);
  }

  removeAutoTest(index: number): void {
    this.autoTestsArray.removeAt(index);
  }

  removeInputFile(autoTestIndex: number, inputFileIndex: number): void {
    this.getInputFilesArray(autoTestIndex).removeAt(inputFileIndex);
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.form.valid) {
      console.log(this.form.value);
      this.dialogRef.close(this.form.value);
    } else {
      this.markFormGroupTouched(this.form);
    }
  }

  // Helper method to mark all controls as touched for validation display
  markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      } else if (control instanceof FormArray) {
        control.controls.forEach(arrayControl => {
          if (arrayControl instanceof FormGroup) {
            this.markFormGroupTouched(arrayControl);
          } else {
            arrayControl.markAsTouched();
          }
        });
      }
    });
  }
}
