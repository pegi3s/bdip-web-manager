import { computed, Injectable, Signal, signal, WritableSignal } from "@angular/core";
import { Theme } from '../shared/enums/theme';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly _theme: WritableSignal<Theme>;
  private readonly theme: Signal<Theme>;
  private readonly darkTheme: Signal<boolean>;

  constructor() {
    const localTheme = localStorage.getItem('theme');
    // If the user has set a theme, use it. Otherwise, use the system theme.
    this._theme = signal<Theme>(localTheme ? localTheme as Theme : Theme.SYSTEM);

    const finalTheme = this._theme() === Theme.SYSTEM ? window.matchMedia('(prefers-color-scheme: dark)').matches ? Theme.DARK : Theme.LIGHT : this._theme();
    // Add data-theme attribute to the host element
    document.body.setAttribute('data-theme', finalTheme);

    this.darkTheme = computed(() => this._theme() === Theme.SYSTEM ? window.matchMedia('(prefers-color-scheme: dark)').matches : this._theme() === Theme.DARK);
    this.theme = this._theme.asReadonly();

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
    prefersDark.addEventListener('change', (mediaQuery) => {
      this.toggleTheme();
    });
  }

  toggleTheme(manual: boolean = false): void {
    if (manual) {
      if (this._theme() === Theme.LIGHT) {
        this._theme.set(Theme.DARK);
      } else if (this._theme() === Theme.DARK) {
        this._theme.set(Theme.SYSTEM);
      } else {
        this._theme.set(Theme.LIGHT);
      }
    }

    let theme = this._theme();
    if (this._theme() === Theme.SYSTEM) {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? Theme.DARK : Theme.LIGHT;
      localStorage.removeItem('theme');
    } else {
      localStorage.setItem('theme', this._theme());
    }

    document.body.setAttribute('data-theme', theme);
  }

  isDarkTheme(): Signal<boolean> {
    return this.darkTheme;
  }

  getTheme(): Signal<Theme> {
    return this.theme;
  }
}
