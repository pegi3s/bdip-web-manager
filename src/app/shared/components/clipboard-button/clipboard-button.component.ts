import { Component, ElementRef, input, signal } from "@angular/core";
import { SvgIconComponent } from 'angular-svg-icon';
import ClipboardJS from 'clipboard';

@Component({
    selector: 'app-clipboard-button',
    imports: [SvgIconComponent],
    templateUrl: './clipboard-button.component.html',
    styleUrl: './clipboard-button.component.css'
})
export class ClipboardButtonComponent {
  /* Input */
  element = input<ElementRef<any>>();
  text = input<string>();

  /* State */
  copied = signal<boolean>(false);

  /**
   * Copies the content of the element or text to the clipboard.
   * After copying, it sets a `copied` flag to true for 1 second to indicate success.
   */
  onCopyToClipboard() {
    if (this.element()) {
      ClipboardJS.copy(this.element()?.nativeElement);
      document.getSelection()?.removeAllRanges();
    } else if (this.text()) {
      ClipboardJS.copy(this.text()!);
    }

    this.copied.set(true);
    setTimeout(() => {
      this.copied.set(false);
    }, 1000);
  }
}
