import { Component, ElementRef, effect, viewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './core/layout/header/header.component';
import { FooterComponent } from './core/layout/footer/footer.component';
import { fromEvent, map } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, FooterComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  host: { '[style.--header-height]': 'headerHeight+"px"' }
})
export class AppComponent {
  private appHeaderElem = viewChild(HeaderComponent, {read: ElementRef});
  protected headerHeight: number = 115;

  constructor() {
    effect(() => {
      this.headerHeight = this.appHeaderElem()?.nativeElement.offsetHeight;
    });

    /* Do it this way or hardcode it in CSS? */
    const offsetHeight$ = fromEvent(window, 'resize').pipe(
      map(() => {
        const style = getComputedStyle(this.appHeaderElem()?.nativeElement);
        return this.getHeaderHeight(style);
      })
    );

    offsetHeight$.subscribe(height => {
      this.headerHeight = height;
    });
  }

  getHeaderHeight(headerStyle: CSSStyleDeclaration): number {
    const innerHeight = parseInt(headerStyle.getPropertyValue('--height'));
    const padding = parseInt(headerStyle.getPropertyValue('--vertical-main-margin')) * 2;
    return innerHeight + padding;
  }
}
