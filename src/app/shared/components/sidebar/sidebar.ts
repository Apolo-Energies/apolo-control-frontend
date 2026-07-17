import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { NgClass } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { Icon, IconName } from '../../icons/icon';

export interface SidebarChild {
  label: string;
  url: string;
  icon: IconName;
  badge?: string | number | null;
  badgeTone?: 'info' | 'warning' | 'danger';
}

export interface SidebarItem extends SidebarChild {
  children?: SidebarChild[];
}

export interface SidebarSection {
  title?: string;
  switchable?: boolean;
  switchIcon?: IconName;
  items: SidebarItem[];
  collapsible?: boolean;
}

@Component({
  selector: 'app-sidebar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, NgClass, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
})
export class Sidebar {
  readonly sections = input.required<SidebarSection[]>();
  readonly mobileOpen = input<boolean>(false);

  readonly closeMobile = output<void>();
  readonly logoutClick = output<void>();

  private readonly router = inject(Router);

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(e => (e as NavigationEnd).urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  protected readonly switchableSections = computed(() =>
    this.sections().filter(s => s.switchable),
  );

  protected readonly staticSections = computed(() =>
    this.sections().filter(s => !s.switchable),
  );

  protected readonly activeSwitchable = computed(() => {
    const url = this.currentUrl();
    const switchable = this.switchableSections();
    for (const section of switchable) {
      if (this.urlMatchesSection(url, section)) return section;
    }
    return switchable[0] ?? null;
  });

  protected isActiveSection(section: SidebarSection): boolean {
    return this.activeSwitchable() === section;
  }

  protected navigateTo(section: SidebarSection): void {
    const firstUrl = section.items[0]?.url;
    if (firstUrl) void this.router.navigateByUrl(firstUrl);
  }

  private urlMatchesSection(url: string, section: SidebarSection): boolean {
    for (const item of section.items) {
      if (this.urlMatchesItem(url, item.url)) return true;
      if (item.children) {
        for (const child of item.children) {
          if (this.urlMatchesItem(url, child.url)) return true;
        }
      }
    }
    return false;
  }

  private urlMatchesItem(url: string, itemUrl: string): boolean {
    return url === itemUrl || url.startsWith(itemUrl + '/') || url.startsWith(itemUrl + '?');
  }
}
