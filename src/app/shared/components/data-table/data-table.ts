import { ChangeDetectionStrategy, Component, contentChild, input, TemplateRef } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

export interface TableColumn {
  key: string;
  header: string;
  width?: string;
  align?: 'left' | 'right' | 'center';
  className?: string;
}

@Component({
  selector: 'app-data-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet],
  templateUrl: './data-table.html',
})
export class DataTable {
  readonly columns = input.required<TableColumn[]>();
  readonly rows = input.required<readonly Record<string, unknown>[]>();

  protected readonly cellTemplate = contentChild<TemplateRef<unknown>>('cell');

  protected getCell(row: Record<string, unknown>, key: string): unknown {
    return row[key];
  }
}
