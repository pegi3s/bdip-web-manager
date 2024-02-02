import { Component, input, model } from "@angular/core";
import { SvgIconComponent } from "angular-svg-icon";

@Component({
    selector: 'app-stepper',
    imports: [SvgIconComponent],
    templateUrl: './stepper.component.html',
    styleUrl: './stepper.component.css'
})
export class StepperComponent {
  /* Input */
  steps = input.required<Step[]>();
  currentStep = model.required<number>();
  previousStep: number = -1; // Used to avoid animations when skipping steps

  setStep(stepNumber: number) {
    this.previousStep = this.currentStep();
    this.currentStep.set(stepNumber);
  }

  isAdjacent(stepNumber: number): boolean {
    return Math.abs(stepNumber - this.previousStep) === 1;
  }
}

export interface Step {
  name: string;
  icon?: string;
}
