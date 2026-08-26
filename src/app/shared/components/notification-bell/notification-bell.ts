import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  inject,
} from '@angular/core';
import { NotificationInboxService } from '../../../core/services/notification-inbox.service';
import { Icon } from '../../icons/icon';
import { NotificationPanel } from '../notification-panel/notification-panel';

@Component({
  selector: 'app-notification-bell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, NotificationPanel],
  templateUrl: './notification-bell.html',
})
export class NotificationBell {
  protected readonly inbox = inject(NotificationInboxService);
  private readonly el = inject(ElementRef);

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!(this.el.nativeElement as HTMLElement).contains(event.target as Node)) {
      this.inbox.closePanel();
    }
  }
}
