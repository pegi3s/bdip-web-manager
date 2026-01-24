import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { DataStateService } from '../../services/data-state.service';
import { FileSystemService } from '../../services/file-system.service';
import { SvgIconComponent } from "angular-svg-icon";

@Component({
  selector: 'app-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, SvgIconComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
})
export class HeaderComponent {
  protected readonly dataState = inject(DataStateService);
  protected readonly fileSystem = inject(FileSystemService);
  private readonly router = inject(Router);

  async onSave(): Promise<void> {
    await this.dataState.saveAll();
  }

  async onClose(): Promise<void> {
    if (this.dataState.hasUnsavedChanges()) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to close?'
      );
      if (!confirmed) return;
    }
    this.dataState.reset();
    await this.router.navigate(['/']);
  }
}
