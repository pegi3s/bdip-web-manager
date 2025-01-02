import { Component, computed, inject, Signal } from "@angular/core";
import { ThemeService } from '../../../services/theme.service';
import { Theme } from '../../enums/theme';
import { SvgIconComponent } from 'angular-svg-icon';

@Component({
    selector: "app-theme-toggle",
    imports: [SvgIconComponent],
    templateUrl: "./theme-toggle.component.html",
    styleUrl: "./theme-toggle.component.css",
    host: { "[class.dark]": "isDarkTheme()" }
})
export class ThemeToggleComponent {
  themeService: ThemeService = inject(ThemeService);
  isDarkTheme: Signal<boolean>;
  theme: Signal<Theme>;
  themeIcon: Signal<string>;

  constructor() {
    this.isDarkTheme = this.themeService.isDarkTheme();
    this.theme = this.themeService.getTheme();
    this.themeIcon = computed(() => this.getThemeIcon(this.theme()));
  }

  getThemeIcon(theme: Theme): string {
    if (theme === Theme.LIGHT) {
      return 'assets/icons/material-symbols/light_mode_24dp_E8EAED_FILL1_wght400_GRAD0_opsz24.svg';
    } else if (theme === Theme.DARK) {
      return 'assets/icons/material-symbols/dark_mode_24dp_E8EAED_FILL1_wght400_GRAD0_opsz24.svg';
    } else {
      return 'assets/icons/material-symbols/desktop_windows_24dp_E8EAED_FILL1_wght400_GRAD0_opsz24.svg';
    }
  }
}
