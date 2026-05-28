import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NgClass } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Icon, IconName } from '../../icons/icon';

export interface SidebarItem {
  label: string;
  url: string;
  icon: IconName;
  badge?: string | number | null;
  badgeTone?: 'info' | 'warning' | 'danger';
}

export interface SidebarSection {
  title?: string;
  items: SidebarItem[];
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
}
