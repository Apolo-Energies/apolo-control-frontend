import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { PageHeader } from '../../../shared/components/page-header/page-header';
import { Pagination } from '../../../shared/components/pagination/pagination';
import { TableSkeleton } from '../../../shared/components/table-skeleton/table-skeleton';
import { ListStateService } from '../../../core/services/list-state.service';
import { RechazoService } from '../../../core/services/rechazo.service';
import { NotificationService } from '../../../core/services/notification.service';
import {
  Rechazo,
  RechazoEstado,
  RechazoResultado,
  PlataformaRechazo,
  RECHAZO_ESTADO_LABEL,
  RECHAZO_RESULTADO_LABEL,
  PLATAFORMA_LABEL,
  RECHAZO_ESTADO_VALUES,
  RECHAZO_RESULTADO_VALUES,
} from '../../../core/models/rechazo.model';
import { Page } from '../../../core/models';

const STATE_KEY = 'rechazos';

interface PlataformaStat {
  plataforma: PlataformaRechazo;
  label: string;
  rechazados: number;
  incidencias: number;
  total: number;
}

@Component({
  selector: 'app-rejections',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeader, FormsModule, Pagination, TableSkeleton],
  templateUrl: './rejections.html',
})
export class Rejections implements OnDestroy {
  private readonly service = inject(RechazoService);
  private readonly notify  = inject(NotificationService);
  private readonly listState = inject(ListStateService);

  // ── Filtros ───────────────────────────────────────────────────────────────
  protected q         = signal('');
  protected estado    = signal<RechazoEstado | ''>('');
  protected resultado = signal<RechazoResultado | ''>('');
  protected plataforma = signal<PlataformaRechazo | ''>('');

  // ── Paginación ────────────────────────────────────────────────────────────
  protected page = signal(0);
  protected size = signal(20);

  // ── Datos ─────────────────────────────────────────────────────────────────
  protected readonly loading = signal(false);
  protected readonly data    = signal<Page<Rechazo> | null>(null);
  protected readonly rows    = computed(() => this.data()?.content ?? []);
  protected readonly total   = computed(() => this.data()?.totalElements ?? 0);
  protected readonly totalPages = computed(() => this.data()?.totalPages ?? 0);

  // ── Stats de plataformas ──────────────────────────────────────────────────
  protected readonly plataformaStats = computed<PlataformaStat[]>(() => {
    const items = this.rows();
    const map = new Map<PlataformaRechazo, PlataformaStat>();
    for (const r of items) {
      const p: PlataformaRechazo = r.plataforma ?? 'OTRO';
      if (!map.has(p)) {
        map.set(p, { plataforma: p, label: PLATAFORMA_LABEL[p], rechazados: 0, incidencias: 0, total: 0 });
      }
      const s = map.get(p)!;
      s.total++;
      if (r.estado === 'rechazado') s.rechazados++;
      if (r.estado === 'incidencia') s.incidencias++;
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  });

  // ── Labels ────────────────────────────────────────────────────────────────
  protected readonly estadoValues   = RECHAZO_ESTADO_VALUES;
  protected readonly resultadoValues = RECHAZO_RESULTADO_VALUES;
  protected readonly plataformaValues: PlataformaRechazo[] = ['ENERGY_EXPERT', 'RENOVAE', 'OTRO'];
  protected readonly estadoLabel    = RECHAZO_ESTADO_LABEL;
  protected readonly resultadoLabel = RECHAZO_RESULTADO_LABEL;
  protected readonly plataformaLabel = PLATAFORMA_LABEL;

  constructor() {
    const s = this.listState.get<{
      q: string; estado: string; resultado: string; plataforma: string; page: number; size: number;
    }>(STATE_KEY);
    if (s) {
      this.q.set(s.q);
      this.estado.set(s.estado as RechazoEstado | '');
      this.resultado.set(s.resultado as RechazoResultado | '');
      this.plataforma.set(s.plataforma as PlataformaRechazo | '');
      this.size.set(s.size);
      this.reload(s.page);
    } else {
      this.reload(0);
    }
  }

  ngOnDestroy(): void {
    this.listState.save(STATE_KEY, {
      q: this.q(),
      estado: this.estado(),
      resultado: this.resultado(),
      plataforma: this.plataforma(),
      page: this.page(),
      size: this.size(),
    });
  }

  protected applyFilters(): void { this.reload(0); }

  protected clearFilters(): void {
    this.q.set('');
    this.estado.set('');
    this.resultado.set('');
    this.plataforma.set('');
    this.reload(0);
  }

  protected goPage(p: number): void { this.reload(p); }

  protected onSizeChange(s: number): void { this.size.set(s); this.reload(0); }

  protected filterByPlataforma(p: PlataformaRechazo): void {
    this.plataforma.set(this.plataforma() === p ? '' : p);
    this.reload(0);
  }

  private reload(p: number): void {
    this.page.set(p);
    this.loading.set(true);
    this.service.list(
      { q: this.q(), estado: this.estado() || undefined, resultado: this.resultado() || undefined, plataforma: this.plataforma() || undefined },
      p,
      this.size(),
    ).subscribe({
      next:  (res) => { this.data.set(res); this.loading.set(false); },
      error: ()    => { this.notify.error('Error al cargar rechazos'); this.loading.set(false); },
    });
  }
}
