import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
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

  private readonly _collapsed = signal(new Set<number>());

  protected isCollapsed(i: number): boolean {
    return this._collapsed().has(i);
  }

  protected toggleSection(i: number): void {
    const next = new Set(this._collapsed());
    next.has(i) ? next.delete(i) : next.add(i);
    this._collapsed.set(next);
  }
}
