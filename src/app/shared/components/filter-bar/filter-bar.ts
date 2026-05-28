import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Icon } from '../../icons/icon';

@Component({
  selector: 'app-filter-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  templateUrl: './filter-bar.html',
})
export class FilterBar {
  readonly searchValue = input<string>('');
  readonly searchPlaceholder = input<string>('Buscar...');
  readonly searchChange = output<string>();

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchChange.emit(value);
  }
}
