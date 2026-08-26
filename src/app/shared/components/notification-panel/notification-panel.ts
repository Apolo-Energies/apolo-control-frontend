import { DatePipe, NgClass } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject,
} from '@angular/core';
import { NotificationInboxService } from '../../../core/services/notification-inbox.service';
import {
  AppNotification,
  NotificationAction,
  NotificationLevel,
  NotificationSystem,
} from '../../../core/models/notification.model';
import { Icon, IconName } from '../../icons/icon';

@Component({
  selector: 'app-notification-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, DatePipe, NgClass],
  templateUrl: './notification-panel.html',
})
export class NotificationPanel implements AfterViewInit, OnDestroy {
  protected readonly inbox = inject(NotificationInboxService);

  @ViewChild('sentinel') private sentinelEl?: ElementRef<HTMLElement>;
  @ViewChild('scrollContainer') private scrollContainerEl?: ElementRef<HTMLElement>;

  private observer?: IntersectionObserver;

  ngAfterViewInit(): void {
    if (!this.sentinelEl || !this.scrollContainerEl) return;
    this.observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) this.inbox.loadMore();
      },
      { root: this.scrollContainerEl.nativeElement, threshold: 0.1 }
    );
    this.observer.observe(this.sentinelEl.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  protected systemClass(system: NotificationSystem): string {
    return system === 'IMPAGOS'
      ? 'bg-warning-soft text-warning-fg'
      : 'bg-primary/10 text-primary';
  }

  protected levelIcon(level: NotificationLevel): IconName {
    switch (level) {
      case 'SUCCESS': return 'check-circle';
      case 'WARNING':
      case 'ERROR':   return 'alert-circle';
      default:        return 'info';
    }
  }

  protected levelIconClass(level: NotificationLevel): string {
    switch (level) {
      case 'SUCCESS': return 'text-success';
      case 'WARNING': return 'text-warning-fg';
      case 'ERROR':   return 'text-danger-fg';
      default:        return 'text-muted-foreground';
    }
  }

  protected onAction(action: NotificationAction, event: Event): void {
    this.inbox.handleAction(action, event);
  }

  protected onMarkRead(n: AppNotification): void {
    this.inbox.markRead(n.id);
    const nav = n.actions?.find(a => a.actionType === 'NAVIGATE');
    if (nav) this.inbox.navigateTo(nav.payload);
  }
}
