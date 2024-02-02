import { Component } from '@angular/core';
import { ThemeToggleComponent } from '../../../shared/components/theme-toggle/theme-toggle.component';
import { SvgIconComponent } from 'angular-svg-icon';

@Component({
  selector: "app-footer",
  imports: [SvgIconComponent, ThemeToggleComponent],
  templateUrl: "./footer.component.html",
  standalone: true,
  styleUrl: "./footer.component.css"
})
export class FooterComponent {

}
