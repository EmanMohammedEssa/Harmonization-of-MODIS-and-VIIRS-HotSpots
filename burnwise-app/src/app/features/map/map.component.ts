import {
  AfterViewInit, Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy,
  Output, SimpleChanges, ViewChild, ViewEncapsulation,
} from '@angular/core';
import * as L from 'leaflet';
import { Agg, Metric } from '../../core/models';

const CELL = 0.25; // grid size in degrees. lat_cell / lon_cell are treated as the cell's south-west corner.
const LABELS: Record<Metric, string> = {
  harmonized: 'Harmonized count', modis: 'MODIS count', viirs: 'VIIRS count', median: 'Median count', anomaly: 'Anomaly',
};
const esc = (v: unknown) => String(v ?? '—').replace(/[&<>"']/g,
  c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const fmt = (v: number | null) => (v === null ? '—' : Number(v.toFixed(2)).toLocaleString());
const warm = (t: number) => `hsl(${55 - 55 * t} 95% ${62 - 24 * t}%)`;   // yellow -> orange -> deep red
const cool = (t: number) => `hsl(205 90% ${68 - 25 * t}%)`;             // for negative anomaly

@Component({
  standalone: true,
  selector: 'bw-map',
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="card map-card" [class.fs]="fs">
      <div #host class="map-host"></div>
      <button class="fsbtn" (click)="toggleFs()" [attr.aria-label]="fs ? 'Exit full screen' : 'Full screen'">{{ fs ? '✕' : '⛶' }}</button>
      <div class="legend">
        <div class="ttl">{{ title }}</div>
        <div class="bar"></div>
        <div class="scale"><span>0</span><span>{{ fmtMax }}</span></div>
        <small>Sum for the selected period · empty cells hidden</small>
        @if (metric === 'anomaly') { <small class="blue">Blue = below the typical level</small> }
        @for (f of files; track f.name) {
          <div class="file"><span class="sw" [style.border-color]="f.color"></span>{{ f.name }}</div>
        }
      </div>
      @if (!drawn) { <div class="empty">No detections for this selection.</div> }
    </div>`,
  styles: [`
    .map-card{position:relative;padding:0;overflow:hidden;height:clamp(460px,74vh,880px)}
    .map-card.fs{position:fixed;inset:0;z-index:1000;height:100vh;border-radius:0}
    .map-host{position:absolute;inset:0}
    .fsbtn{position:absolute;top:10px;right:10px;z-index:600;width:34px;height:34px;border-radius:8px;border:1px solid rgba(0,0,0,.2);
      background:#fff;color:#111;font-size:16px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.25)}
    .fsbtn:hover{background:#f1f5f9}
    .legend{position:absolute;bottom:26px;left:12px;z-index:500;max-width:calc(100% - 24px);
      background:rgba(11,18,32,.94);border:1px solid var(--border);border-radius:10px;padding:10px 14px;font-size:12px;
      box-shadow:0 6px 20px rgba(0,0,0,.35)}
    .legend .ttl{font-weight:600;font-size:13px;margin-bottom:6px}
    .legend .bar{height:9px;width:190px;max-width:100%;border-radius:5px;
      background:linear-gradient(90deg,hsl(55 95% 62%),hsl(28 95% 50%),hsl(0 95% 38%))}
    .legend .scale{display:flex;justify-content:space-between;margin:3px 0 5px;color:var(--text-2)}
    .legend small{display:block;color:var(--text-2)} .legend .blue{color:#38BDF8}
    .legend .file{margin-top:5px}
    .legend .sw{display:inline-block;width:10px;height:10px;border:2px solid;margin-right:6px;vertical-align:middle}
    .empty{position:absolute;top:14px;left:50%;transform:translateX(-50%);z-index:500;white-space:nowrap;
      background:rgba(11,18,32,.94);border:1px solid var(--border);border-radius:10px;padding:8px 14px;font-size:13px;color:var(--text)}
    .leaflet-popup-content-wrapper{background:#111c30;color:#F8FAFC;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.4)}
    .leaflet-popup-tip{background:#111c30}
    .leaflet-popup-content{margin:12px 14px;min-width:190px}
    .pop .ph{font-weight:700;font-size:14px;margin-bottom:6px;padding-bottom:6px;border-bottom:1px solid #243247}
    .pop .r{display:flex;justify-content:space-between;gap:18px;margin:3px 0;font-size:13px}
    .pop .r span{color:#94A3B8} .pop .r b{font-weight:600}
    .leaflet-tooltip{background:#111c30;color:#F8FAFC;border:1px solid #243247;border-radius:8px;box-shadow:none;font-size:12px}
    .leaflet-tooltip-top:before{border-top-color:#243247}
  `],
})
export class MapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() cells: Agg[] = [];
  @Input() metric: Metric = 'harmonized';
  @Input() files: { name: string; color: string }[] = [];
  @Input() selected: { lat: number; lon: number } | null = null;
  /** [[latMin, lonMin], [latMax, lonMax]] - the map re-zooms when this changes. */
  @Input() view: L.LatLngBoundsLiteral | null = null;
  @Output() pick = new EventEmitter<{ lat: number; lon: number } | null>();

  @ViewChild('host', { static: true }) host!: ElementRef<HTMLDivElement>;
  fs = false;
  private map?: L.Map;
  private layer = L.layerGroup();
  private ro?: ResizeObserver;

  get title() { return LABELS[this.metric]; }
  get max() { let m = 0; for (const c of this.cells) m = Math.max(m, Math.abs(c[this.metric] ?? 0)); return m; }
  get fmtMax() { return fmt(this.max); }
  get drawn() { return this.cells.some(c => !!c[this.metric]); }

  ngAfterViewInit() {
    const osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      { attribution: '© OpenStreetMap contributors', maxZoom: 19 });
    this.map = L.map(this.host.nativeElement, { center: [27, 31], zoom: 6, layers: [osm, this.layer] });
    L.control.scale({ imperial: false, position: 'bottomright' }).addTo(this.map);
    this.ro = new ResizeObserver(() => this.map?.invalidateSize());
    this.ro.observe(this.host.nativeElement);
    this.render(true);
  }

  ngOnChanges(c: SimpleChanges) { this.render(!!c['view']); }
  toggleFs() { this.fs = !this.fs; setTimeout(() => this.map?.invalidateSize(), 50); }

  private render(refit: boolean) {
    if (!this.map) return;
    this.layer.clearLayers();
    const max = this.max;
    for (const c of this.cells) {
      const v = c[this.metric];
      if (!v) continue; // empty cells stay hidden so the map is easier to read
      const t = max ? Math.sqrt(Math.min(Math.abs(v) / max, 1)) : 0;
      const sel = this.selected?.lat === c.lat && this.selected?.lon === c.lon;
      const multi = this.files.length > 1;
      const base = { color: sel ? '#111' : multi ? c.color : 'rgba(0,0,0,.35)', weight: sel ? 3 : multi ? 2 : 0.8 };
      const r = L.rectangle([[c.lat, c.lon], [c.lat + CELL, c.lon + CELL]], {
        ...base, fillColor: v < 0 ? cool(t) : warm(t), fillOpacity: 0.4 + 0.5 * t,
      });
      r.bindTooltip(`${c.lat}°N, ${c.lon}°E · <b>${fmt(v)}</b>`, { sticky: true });
      r.on('mouseover', () => r.setStyle({ weight: 3, color: '#111' }));
      r.on('mouseout', () => r.setStyle(base));
      r.bindPopup(`<div class="pop"><div class="ph">Cell ${esc(c.lat)}°N, ${esc(c.lon)}°E</div>
        <div class="r"><span>MODIS</span><b>${fmt(c.modis)}</b></div>
        <div class="r"><span>VIIRS</span><b>${fmt(c.viirs)}</b></div>
        <div class="r"><span>Harmonized</span><b>${fmt(c.harmonized)}</b></div>
        <div class="r"><span>Median</span><b>${fmt(c.median)}</b></div>
        <div class="r"><span>Anomaly</span><b>${fmt(c.anomaly)}</b></div>
        <div class="r"><span>Rows</span><b>${c.rows}${c.partialRows ? ` (${c.partialRows} partial-year)` : ''}</b></div></div>`);
      r.on('click', () => this.pick.emit({ lat: c.lat, lon: c.lon }));
      this.layer.addLayer(r);
    }
    if (refit && this.view) this.map.fitBounds(this.view, { padding: [20, 20] });
  }

  ngOnDestroy() { this.ro?.disconnect(); this.map?.remove(); }
}
