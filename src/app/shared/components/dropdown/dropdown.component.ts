import { Component, input, model, signal } from "@angular/core";
import { SvgIconComponent } from "angular-svg-icon";

@Component({
  selector: 'app-dropdown',
  imports: [SvgIconComponent],
  templateUrl: './dropdown.component.html',
  styleUrl: './dropdown.component.css'
})
export class DropdownComponent {
  items = input.required<DropdownItem[]>();
  selected = model.required<number>();

  isDropdownOpen = signal<boolean>(false);

  toggleDropdown() {
    this.isDropdownOpen.update(value => !value);
  }
}

interface DropdownItem {
  name: string;
  icon: string;
}
