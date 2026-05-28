import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Icon } from '../../icons/icon';

@Component({
  selector: 'app-pagination',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  templateUrl: './pagination.html',
})
export class Pagination {
  readonly page = input.required<number>();
  readonly pageSize = input.required<number>();
  readonly totalElements = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly pageSizes = input<readonly number[]>([10, 20, 50, 100]);

  readonly pageChange = output<number>();
  readonly pageSizeChange = output<number>();

  protected readonly Math = Math;

  protected readonly rangeStart = computed(() => {
    if (this.totalElements() === 0) {
      return 0;
    }
    return this.page() * this.pageSize() + 1;
  });

  protected readonly rangeEnd = computed(() => {
    const end = (this.page() + 1) * this.pageSize();
    return Math.min(end, this.totalElements());
  });

  protected onPageChange(target: number): void {
    if (target < 0 || target >= this.totalPages()) {
      return;
    }
    this.pageChange.emit(target);
  }

  protected onSizeChange(event: Event): void {
    const size = Number((event.target as HTMLSelectElement).value);
    if (!Number.isNaN(size)) {
      this.pageSizeChange.emit(size);
    }
  }
}
