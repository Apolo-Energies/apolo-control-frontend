import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-table-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './table-skeleton.html',
})
export class TableSkeleton {
  readonly cols = input<number>(6);
  readonly rows = input<number>(8);

  protected readonly colArray = computed(() =>
    Array.from({ length: this.cols() }, (_, i) => i),
  );
  protected readonly rowArray = computed(() =>
    Array.from({ length: this.rows() }, (_, i) => i),
  );
}
