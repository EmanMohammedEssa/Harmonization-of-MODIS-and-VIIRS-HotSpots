import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DataService } from '../../core/data/data.service';
import { MONTHS, REGIONS } from '../../core/data/regions';
import { add } from '../../core/data/data-utils';
import { BarChartComponent, HeatmapComponent, LineChartComponent, compact } from '../../shared/components/charts.component';
import { StatCardComponent } from '../../shared/components/stat-card.component';
import { StateMessageComponent } from '../../shared/components/state-message.component';

interface YearAgg { modis: number | null; viirs: number | null; harm: number; anomaly: number; partial: boolean; }

@Component({
  standalone: true,
  selector: 'bw-fire-analysis-page',
  imports: [LineChartComponent, BarChartComponent, HeatmapComponent, StatCardComponent, StateMessageComponent],
  template: `
    @if (data.loading()) { <bw-state-message kind="loading" title="Loading data" text="Reading the file…" /> }
    @if (data.error()) { <bw-state-message kind="error" title="Could not load data" [text]="data.error()" /> }

    <div class="top">
      <p class="intro">These charts summarise the whole file for one area. Every chart has a short note on how to read it.</p>
      <label>Area
        <select (change)="region.set($any($event.target).value)">
          <option value="all" [selected]="region() === 'all'">Whole dataset</option>
          @for (r of regionKeys; track r) { <option [value]="r" [selected]="region() === r">{{ regions[r].label }}</option> }
        </select></label>
    </div>

    @if (a(); as s) {
      <section class="cards">
        <bw-stat-card label="Total detections" [value]="s.total" hint="Harmonized, all years" />
        <bw-stat-card label="Peak month" [text]="true" [value]="s.peakMonth" hint="Highest average" />
        <bw-stat-card label="Busiest full year" [text]="true" [value]="s.peakYear" [hint]="s.peakYearHint" />
        <bw-stat-card label="Hottest grid cell" [text]="true" [value]="s.topCell" [hint]="s.topCellHint" />
      </section>

      <section class="charts">
        <div class="card">
          <h3>1 · Detections per year</h3>
          <p class="explain">Each point adds up all grid cells in the area for one year. MODIS exists since 2003 and VIIRS since 2012, so they do not cover the same years.
            The <b>harmonized</b> line puts both satellites on one comparable scale. A * marks a year with incomplete data.</p>
          <bw-line-chart [labels]="s.yearLabels" [series]="s.yearSeries" label="Detections per year" />
        </div>

        <div class="card">
          <h3>2 · Fire season (average per month)</h3>
          <p class="explain">The average harmonized detections for each calendar month across all years. Tall bars show the months when fires usually peak.</p>
          <bw-bar-chart [labels]="s.monthLabels" [values]="s.monthAvg" label="Average detections per month" />
        </div>

        <div class="card wide">
          <h3>3 · Year × month heat map</h3>
          <p class="explain">Rows are years and columns are months. The redder a square, the more detections. Repeated red columns mean a seasonal pattern;
            an unusually red row means a bad year. Grey squares had no detections.</p>
          <bw-heatmap [rowLabels]="s.yearLabels" [colLabels]="s.monthShort" [values]="s.heat" label="Heat map of detections by year and month" />
        </div>

        <div class="card">
          <h3>4 · Anomaly per year</h3>
          <p class="explain">Anomaly = harmonized count minus the typical (median) level for the same cell and month.
            <b style="color:#FF7A30">Orange</b> bars: more fire than usual. <b style="color:#38BDF8">Blue</b> bars: less than usual.</p>
          <bw-bar-chart [labels]="s.yearLabels" [values]="s.anomalyByYear" label="Anomaly per year" />
        </div>

        <div class="card">
          <h3>5 · Top 10 grid cells</h3>
          <p class="explain">The 0.25° cells with the most detections in this area (all years). Each bar is that cell's total.</p>
          @for (c of s.top; track c.name) {
            <div class="hb"><span class="nm">{{ c.name }}</span>
              <div class="track"><div class="fill" [style.width.%]="c.pct"></div></div><b>{{ c.text }}</b></div>
          }
        </div>
      </section>
    } @else if (!data.loading() && !data.error()) {
      <bw-state-message kind="empty" title="No data" text="No rows found for this area. Load a data file from the Dashboard." />
    }`,
  styles: [`
    .top{display:flex;justify-content:space-between;align-items:flex-end;gap:var(--s2);flex-wrap:wrap;margin-bottom:var(--s2)}
    .intro{margin:0;color:var(--text-2);font-size:14px;max-width:560px}
    label{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--text-2);min-width:220px}
    select{background:var(--surface);color:var(--text);border:1px solid var(--border);border-radius:8px;padding:8px;font-size:14px}
    bw-state-message{display:block;margin-bottom:var(--s2)}
    .cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:var(--s2);margin-bottom:var(--s2)}
    .charts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--s2)}
    .wide{grid-column:1 / -1}
    h3{margin:0 0 4px;font-size:15px}
    .explain{margin:0 0 var(--s1);font-size:12.5px;line-height:1.5;color:var(--text-2)}
    .hb{display:flex;align-items:center;gap:8px;font-size:12px;margin-top:6px}
    .nm{width:120px;flex:none;color:var(--text-2)} .track{flex:1;height:10px;background:var(--surface);border-radius:5px;overflow:hidden}
    .fill{height:100%;background:var(--fire);border-radius:5px} .hb b{width:48px;text-align:right}
    @media(max-width:900px){.charts{grid-template-columns:minmax(0,1fr)}}
  `],
})
export class FireAnalysisPageComponent implements OnInit {
  data = inject(DataService);
  regions = REGIONS; regionKeys = Object.keys(REGIONS);
  region = signal('all');

  a = computed(() => {
    const rows = this.data.datasets().flatMap(d => d.rows);
    const box = REGIONS[this.region()];
    const byYear = new Map<number, YearAgg>();
    const monthSum = new Array(12).fill(0), monthYears: Set<number>[] = Array.from({ length: 12 }, () => new Set<number>());
    const heat = new Map<string, number>(), cells = new Map<string, number>();
    let total = 0, n = 0;

    for (const r of rows) {
      if (box && (r.lat < box.latMin || r.lat > box.latMax || r.lon < box.lonMin || r.lon > box.lonMax)) continue;
      n++;
      const h = r.harmonized ?? 0;
      let y = byYear.get(r.year);
      if (!y) { y = { modis: null, viirs: null, harm: 0, anomaly: 0, partial: false }; byYear.set(r.year, y); }
      y.modis = add(y.modis, r.modis); y.viirs = add(y.viirs, r.viirs);
      y.harm += h; y.anomaly += r.anomaly ?? 0; if (r.partial) y.partial = true;
      monthSum[r.month - 1] += h; monthYears[r.month - 1].add(r.year);
      heat.set(`${r.year}-${r.month}`, (heat.get(`${r.year}-${r.month}`) ?? 0) + h);
      const ck = `${r.lat}|${r.lon}`; cells.set(ck, (cells.get(ck) ?? 0) + h);
      total += h;
    }
    if (!n) return null;

    const years = [...byYear.keys()].sort((p, q) => p - q);
    const yearLabels = years.map(y => (byYear.get(y)!.partial ? `${y}*` : `${y}`));
    const monthAvg = monthSum.map((s, i) => (monthYears[i].size ? s / monthYears[i].size : null));
    const peakM = monthAvg.reduce<number>((best, v, i) => (v !== null && v > (monthAvg[best] ?? -1) ? i : best), 0);
    const full = years.filter(y => !byYear.get(y)!.partial);
    const peakY = full.reduce<number | null>((b, y) => (b === null || byYear.get(y)!.harm > byYear.get(b)!.harm ? y : b), null);
    const topAll = [...cells.entries()].sort((p, q) => q[1] - p[1]).slice(0, 10);
    const maxTop = topAll[0]?.[1] || 1;
    const fmtCell = (k: string) => { const [la, lo] = k.split('|'); return `${la}°N, ${lo}°E`; };

    return {
      total: Math.round(total),
      peakMonth: MONTHS[peakM], peakYear: peakY === null ? '—' : String(peakY),
      peakYearHint: peakY === null ? '' : `${compact(byYear.get(peakY)!.harm)} detections`,
      topCell: topAll[0] ? fmtCell(topAll[0][0]) : '—', topCellHint: topAll[0] ? `${compact(topAll[0][1])} detections` : '',
      yearLabels,
      yearSeries: [
        { name: 'Harmonized', color: '#FF7A30', values: years.map(y => byYear.get(y)!.harm) },
        { name: 'MODIS', color: '#38BDF8', values: years.map(y => byYear.get(y)!.modis) },
        { name: 'VIIRS', color: '#A855F7', values: years.map(y => ((byYear.get(y)!.viirs ?? 0) > 0 ? byYear.get(y)!.viirs : null)) },
      ],
      monthLabels: MONTHS.map(m => m.slice(0, 3)), monthShort: MONTHS.map(m => m.slice(0, 3)), monthAvg,
      anomalyByYear: years.map(y => byYear.get(y)!.anomaly),
      heat: years.map(y => MONTHS.map((_, m) => (heat.has(`${y}-${m + 1}`) ? heat.get(`${y}-${m + 1}`)! : null))),
      top: topAll.map(([k, v]) => ({ name: fmtCell(k), text: compact(v), pct: (v / maxTop) * 100 })),
    };
  });

  ngOnInit() { if (!this.data.datasets().length) this.data.loadDefault(); }
}
