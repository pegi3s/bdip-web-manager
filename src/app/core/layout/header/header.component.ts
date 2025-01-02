import { Component, ElementRef, Renderer2, Signal, signal } from "@angular/core";
import { NavigationEnd, RouterLink, Router } from '@angular/router';
import { ThemeService } from '../../../services/theme.service';
import { SvgIconComponent } from 'angular-svg-icon';

@Component({
    selector: "app-header",
    templateUrl: "./header.component.html",
    styleUrl: "./header.component.css",
    imports: [RouterLink, SvgIconComponent],
    host: { "[class.dark]": "isDarkTheme()" }
})
export class HeaderComponent {
  /* Disable transitions on first load to prevent the header from sliding in */
  protected enableTransitions = false;

  protected scrolled = true;
  protected isOverflowing = false;

  protected showMenu = false;
  protected showSearch = true;

  searchClicked: boolean = false;
  isDarkTheme: Signal<boolean>;
  currentSection = signal<string>('');

  private documentClickListener: Function | null = null;
  private windowResizeListener: Function | null = null;

  links = [
    { path: '/search', text: 'Containers', queryParams: { showAll: 'true' } },
    { path: '/getting-started', text: 'Getting Started' },
    { path: '/tutorials', text: 'Tutorials' },
  ];

  constructor(
    private themeService: ThemeService,
    private router: Router,
    private elementRef: ElementRef,
    private renderer: Renderer2,
  ) {
    this.isDarkTheme = this.themeService.isDarkTheme();
  }

  ngOnInit() {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.currentSection.set(event.url);
        this.showSearch = this.router.url.indexOf('/search') === -1;
        if (this.searchClicked) {
          this.searchClicked = false;
        }
      }
    });
  }

  matchPath(link: Path) {
    const pathMatch = this.currentSection().indexOf(link.path) !== -1;
    if (!pathMatch) {
      return false;
    }

    if (link.queryParams) {
      const currentQueryParams = this.router.parseUrl(this.router.url).queryParams as { [key: string]: any };
      return Object.keys(link.queryParams).every(key => link.queryParams && currentQueryParams[key] == link.queryParams[key]);
    }

    return true;
  }

  onSearchClick() {
    this.searchClicked = true;
    setTimeout(() => {
      this.router.navigate(['/search']);
    }, 600);
  }

  toggleMenu() {
    this.showMenu = !this.showMenu;

    // When the menu is shown, add a listener to close it when clicking outside,
    // clicking on a menu item, or resizing the window above 1024px
    if (this.showMenu) {
      this.documentClickListener = this.renderer.listen('document', 'click', (event) => {
        const clickedInside = this.elementRef.nativeElement.contains(event.target);
        if (!clickedInside) {
          this.showMenu = false;
          this.removeMenuListeners();
        } else if (event.target.tagName === 'A'|| event.target.tagName === 'IMG' || event.target.closest('.search-button') !== null) {
          this.showMenu = false;
          this.removeMenuListeners();
        }
      });
      this.windowResizeListener = this.renderer.listen('window', 'resize', (event) => {
        if (event.target.innerWidth > 1024) {
          this.showMenu = false;
          this.removeMenuListeners();
        }
      });
    } else {
      this.removeMenuListeners();
    }
  }

  removeMenuListeners() {
    if (this.documentClickListener) {
      this.documentClickListener();
      this.documentClickListener = null;
    }
    if (this.windowResizeListener) {
      this.windowResizeListener();
      this.windowResizeListener = null;
    }
  }
}

type Path = {
  path: string;
  text: string;
  queryParams?: { [key: string]: any };
}
