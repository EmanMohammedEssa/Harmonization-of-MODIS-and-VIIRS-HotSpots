import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DataService } from '../../core/data/data.service';
import { Filters, add, aggregate, extent, filterRows } from '../../core/data/data-utils';
import { MONTHS, REGIONS } from '../../core/data/regions';
import { Agg, Metric } from '../../core/models';
import { StatCardComponent } from '../../shared/components/stat-card.component';
import { StateMessageComponent } from '../../shared/components/state-message.component';
import { MapComponent } from '../map/map.component';

const METRICS: { id: Metric; label: string }[] = [
  { id: 'harmonized', label: 'Harmonized count' }, { id: 'modis', label: 'MODIS count' },
  { id: 'viirs', label: 'VIIRS count' }, { id: 'median', label: 'Median count' }, { id: 'anomaly', label: 'Anomaly' },
];
const toNum = (v: string) => (v === '' ? null : Number(v));

@Component({
  standalone: true,
  selector: 'bw-dashboard-page',
  imports: [StatCardComponent, StateMessageComponent, MapComponent],
  template: `
    @if (data.loading()) { <bw-state-message kind="loading" title="Loading data" text="Reading the file…" /> }
    @if (data.error()) { <bw-state-message kind="error" title="Could not load data" [text]="data.error()" /> }
    @if (data.notice()) { <bw-state-message kind="partial" title="Heads up" [text]="data.notice()" /> }

    @if (data.datasets().length) {
      <p class="status">Reading <b>{{ fileNames() }}</b> · {{ rows().length.toLocaleString() }} rows ·
        {{ years()[0] }}–{{ years()[years().length - 1] }}</p>
    }
    <section class="cards">
      <bw-stat-card label="Location" [text]="true" [value]="locationLabel()" [hint]="locationHint()" />
      <bw-stat-card label="Year" [text]="true" [value]="year() === null ? 'All years' : '' + year()" [hint]="yearHint()" />
      <bw-stat-card label="Month" [text]="true" [value]="month() === null ? 'All months' : months[month()! - 1]" />
      <bw-stat-card label="MODIS count" color="var(--accent)" [value]="sum().modis" />
      <bw-stat-card label="VIIRS count" color="var(--fire)" [value]="sum().viirs" />
      <bw-stat-card label="Harmonized count" [value]="sum().harmonized" />
      <bw-stat-card label="Median count" [value]="sum().median" hint="Baseline" />
      <bw-stat-card label="Anomaly" color="var(--danger)" [value]="sum().anomaly" />
      <bw-stat-card label="Data rows" [text]="true" [value]="sum().rows + ' rows'"
        [hint]="sum().partialRows ? sum().partialRows + ' from a partial year' : 'Complete years only'" />
    </section>

    <div class="card toolbar">
      <div class="fields">
        <label>Region (map area)
          <select (change)="setRegion($any($event.target).value)">
            <option value="all" [selected]="region() === 'all'">Whole dataset</option>
            @for (r of regionKeys; track r) { <option [value]="r" [selected]="region() === r">{{ regions[r].label }}</option> }
          </select></label>
        <label>Latitude (line)
          <select (change)="lat.set(num($event)); selected.set(null)">
            <option value="" [selected]="lat() === null">All</option>
            @for (v of latOpts(); track v) { <option [value]="v" [selected]="lat() === v">{{ v }}°N</option> }
          </select></label>
        <label>Longitude (line)
          <select (change)="lon.set(num($event)); selected.set(null)">
            <option value="" [selected]="lon() === null">All</option>
            @for (v of lonOpts(); track v) { <option [value]="v" [selected]="lon() === v">{{ v }}°E</option> }
          </select></label>
        <label>Year
          <select (change)="year.set(num($event))">
            <option value="" [selected]="year() === null">All</option>
            @for (y of years(); track y) { <option [value]="y" [selected]="year() === y">{{ y }}</option> }
          </select></label>
        <label>Month
          <select (change)="month.set(num($event))">
            <option value="" [selected]="month() === null">All</option>
            @for (m of months; track m; let i = $index) { <option [value]="i + 1" [selected]="month() === i + 1">{{ m }}</option> }
          </select></label>
        <label>Colour map by
          <select (change)="metric.set($any($event.target).value)">
            @for (m of metrics; track m.id) { <option [value]="m.id" [selected]="metric() === m.id">{{ m.label }}</option> }
          </select></label>
      </div>
      <div class="actions">
        <button (click)="reset()">Reset filters</button>
        @if (selected()) { <button (click)="selected.set(null)">Clear selected cell</button> }
        <span class="spacer"></span>
        <button class="primary" (click)="downloadExcel()" [disabled]="exporting() || !rows().length">
          {{ exporting() ? 'Preparing…' : '⬇ Download Excel' }}</button>
        <a class="btn" href="data/harmonized_monthly_AI.csv" download>Source CSV</a>
      </div>
      <p class="hint">The Excel file contains the rows that match the current filters. Click a square on the map to see only that cell in the cards.</p>
    </div>

    <bw-map [cells]="cells()" [metric]="metric()" [selected]="selected()" [view]="view()"
            [files]="data.datasets()" (pick)="onPick($event)" />

    <div class="card files">
      <h3>Data files</h3>
      <p class="hint">Load another CSV or Excel file with <code>lat_cell, lon_cell, year, month</code> and the count columns. Each file gets its own outline colour.</p>
      <input type="file" accept=".csv,.xlsx,.xls" (change)="onFile($event)" />
      @for (d of data.datasets(); track d.name) {
        <div class="file">
          <span class="sw" [style.background]="d.color"></span>
          <span class="nm">{{ d.name }}</span><small>{{ d.rows.length.toLocaleString() }} rows</small>
          <button (click)="data.remove(d.name)" aria-label="Remove file">✕</button>
        </div>
      }
      @if (!data.datasets().length && !data.loading()) { <button (click)="data.loadDefault()">Load bundled data</button> }
    </div>`,
  styles: [`
    .status{margin:0 0 var(--s2);font-size:12px;color:var(--text-2)} .status b{color:var(--text)}
    .cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:var(--s2);margin-bottom:var(--s2)}
    bw-state-message{display:block;margin-bottom:var(--s2)}
    bw-map{display:block;margin-bottom:var(--s2)}
    .toolbar{margin-bottom:var(--s2)}
    .fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:var(--s1) var(--s2)}
    h3{margin:0 0 var(--s1);font-size:15px}
    label{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--text-2);min-width:0}
    select{background:var(--surface);color:var(--text);border:1px solid var(--border);
      border-radius:8px;padding:9px 8px;font-size:14px;width:100%;box-sizing:border-box}
    select:focus{outline:none;border-color:var(--accent)}
    .actions{display:flex;gap:var(--s1);flex-wrap:wrap;align-items:center;margin-top:var(--s2)}
    .spacer{flex:1}
    button,.btn{background:var(--surface);color:var(--text);border:1px solid var(--border);border-radius:8px;padding:9px 14px;cursor:pointer;font-size:13px;text-decoration:none}
    button:hover,.btn:hover{border-color:var(--accent)}
    .primary{background:var(--fire);border-color:var(--fire);color:#fff;font-weight:600}
    button:disabled{opacity:.6;cursor:wait}
    .hint{font-size:12px;color:var(--text-2);margin:var(--s1) 0 0}
    input[type=file]{font-size:12px;color:var(--text-2);max-width:100%;margin-top:var(--s1)}
    .file{display:flex;align-items:center;gap:8px;margin-top:8px;font-size:13px}
    .sw{width:12px;height:12px;border-radius:50%;flex:none} .nm{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .file small{color:var(--text-2)} .file button{border:0;background:none;padding:0 4px}
    @media(max-width:520px){.cards{grid-template-columns:repeat(2,minmax(0,1fr))}.spacer{display:none}}
  `],
})
export class DashboardPageComponent implements OnInit {
  data = inject(DataService);
  months = MONTHS; regions = REGIONS; regionKeys = Object.keys(REGIONS); metrics = METRICS;

  year = signal<number | null>(null);
  month = signal<number | null>(null);
  region = signal<string>('all');
  lat = signal<number | null>(null);
  lon = signal<number | null>(null);
  metric = signal<Metric>('harmonized');
  selected = signal<{ lat: number; lon: number } | null>(null);
  exporting = signal(false);

  rows = computed(() => this.data.datasets().flatMap(d => d.rows));
  fileNames = computed(() => this.data.datasets().map(d => d.name).join(', '));
  years = computed(() => [...new Set(this.rows().map(r => r.year))].sort((a, b) => a - b));
  full = computed(() => extent(this.rows()));
  regionBox = computed(() => REGIONS[this.region()] ?? this.full());

  // Latitude / longitude lines that really exist in the file, inside the chosen region.
  latOpts = computed(() => {
    const b = this.regionBox(), s = new Set<number>();
    for (const r of this.rows()) if (r.lat >= b.latMin && r.lat <= b.latMax && r.lon >= b.lonMin && r.lon <= b.lonMax) s.add(r.lat);
    return [...s].sort((a, c) => c - a);
  });
  lonOpts = computed(() => {
    const b = this.regionBox(), s = new Set<number>();
    for (const r of this.rows()) if (r.lat >= b.latMin && r.lat <= b.latMax && r.lon >= b.lonMin && r.lon <= b.lonMax) s.add(r.lon);
    return [...s].sort((a, c) => a - c);
  });

  box = computed(() => {
    const b = this.regionBox(), la = this.lat(), lo = this.lon();
    return { latMin: la ?? b.latMin, latMax: la ?? b.latMax, lonMin: lo ?? b.lonMin, lonMax: lo ?? b.lonMax };
  });
  view = computed(() => { const b = this.box(); return [[b.latMin, b.lonMin], [b.latMax + 0.25, b.lonMax + 0.25]] as [[number, number], [number, number]]; });

  filters = computed<Filters>(() => ({ year: this.year(), month: this.month(), ...this.box() }));
  cells = computed(() => aggregate(this.rows(), this.filters()));

  /** Totals for the whole filtered region, or only for the clicked cell. */
  sum = computed(() => {
    const s = this.selected();
    const t = { modis: null, viirs: null, harmonized: null, median: null, anomaly: null, rows: 0, partialRows: 0 } as
      { modis: number | null; viirs: number | null; harmonized: number | null; median: number | null; anomaly: number | null; rows: number; partialRows: number };
    for (const c of this.cells()) {
      if (s && (c.lat !== s.lat || c.lon !== s.lon)) continue;
      t.modis = add(t.modis, c.modis); t.viirs = add(t.viirs, c.viirs); t.harmonized = add(t.harmonized, c.harmonized);
      t.median = add(t.median, c.median); t.anomaly = add(t.anomaly, c.anomaly);
      t.rows += c.rows; t.partialRows += c.partialRows;
    }
    return t;
  });

  locationLabel = computed(() => {
    const s = this.selected();
    if (s) return `${s.lat}°N, ${s.lon}°E`;
    const parts = [this.region() === 'all' ? 'Whole dataset' : REGIONS[this.region()].label];
    if (this.lat() !== null) parts.push(`lat ${this.lat()}°N`);
    if (this.lon() !== null) parts.push(`lon ${this.lon()}°E`);
    return parts.join(' · ');
  });
  locationHint = computed(() => this.selected() ? 'Selected cell (0.25°)' : `${this.cells().length} cells`);
  yearHint = computed(() => {
    const y = this.years();
    return this.year() === null && y.length ? `${y[0]} – ${y[y.length - 1]}` : '';
  });

  async downloadExcel() {
    this.exporting.set(true);
    try {
      const out = filterRows(this.rows(), this.filters()).map(r => ({
        lat_cell: r.lat, lon_cell: r.lon, year: r.year, month: r.month,
        modis_count: r.modis, viirs_count: r.viirs, harmonized_count: r.harmonized,
        median_count: r.median, anomaly: r.anomaly, is_partial_year: r.partial,
      }));
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(out), 'harmonized_monthly');
      const tag = [this.region() !== 'all' ? this.region() : '', this.year() ?? '', this.month() ?? ''].filter(x => x !== '').join('_');
      XLSX.writeFile(wb, `burnwise_harmonized_monthly${tag ? '_' + tag : ''}.xlsx`);
    } finally { this.exporting.set(false); }
  }

  ngOnInit() { if (!this.data.datasets().length) this.data.loadDefault(); }

  num(e: Event) { return toNum((e.target as HTMLSelectElement).value); }
  setRegion(r: string) { this.region.set(r); this.lat.set(null); this.lon.set(null); this.selected.set(null); }
  onPick(p: { lat: number; lon: number } | null) {
    const s = this.selected();
    this.selected.set(s && p && s.lat === p.lat && s.lon === p.lon ? null : p);
  }
  reset() { this.year.set(null); this.month.set(null); this.region.set('all'); this.lat.set(null); this.lon.set(null); this.selected.set(null); }
  async onFile(e: Event) {
    const input = e.target as HTMLInputElement;
    for (const f of Array.from(input.files ?? [])) await this.data.loadFile(f);
    input.value = '';
  }
}
