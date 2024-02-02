import { Component, inject, input, Signal } from "@angular/core";
import { ThemeService } from '../../../services/theme.service';

@Component({
    selector: 'app-logo-marquee',
    imports: [],
    templateUrl: './logo-marquee.component.html',
    styleUrl: './logo-marquee.component.css',
    host: { '[class.dark]': 'isDarkTheme()' }
})
export class LogoMarqueeComponent {
  /* Inputs */
  logos = input.required<string[]>();

  /* Services */
  private themeService: ThemeService = inject(ThemeService);
  isDarkTheme: Signal<boolean>;

  constructor() {
    this.isDarkTheme = this.themeService.isDarkTheme();
  }
}
