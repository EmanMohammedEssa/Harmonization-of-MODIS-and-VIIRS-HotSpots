import { Component, Input, OnChanges } from '@angular/core';

export interface Series { name: string; color: string; values: (number | null)[]; }
const W = 640, H = 260, L = 52, R = 12, T = 12, B = 30;

export const compact = (v: number) =>
  Math.abs(v) >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : Math.abs(v) >= 1e3 ? (v / 1e3).toFixed(1) + 'k' : String(Math.round(v * 10) / 10);

function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v))), n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}
function domain(vals: number[]) {
  let mx = 0, mn = 0;
  for (const v of vals) { if (v > mx) mx = v; if (v < mn) mn = v; }
  const hi = mx > 0 ? niceMax(mx) : 0, lo = mn < 0 ? -niceMax(-mn) : 0;
  return { lo, hi: hi === 0 && lo === 0 ? 1 : hi };
}
interface Tick { y: number; label: string; }
interface XTick { x: number; label: string; }

abstract class Axes {
  readonly W = W; readonly H = H; readonly L = L; readonly R = R; readonly B = B;
  yTicks: Tick[] = []; xTicks: XTick[] = [];
  protected y = (v: number) => 0;
  protected buildY(lo: number, hi: number) {
    this.y = (v: number) => T + (H - T - B) * (1 - (v - lo) / (hi - lo));
    this.yTicks = [0, 1, 2, 3, 4].map(i => { const v = lo + (hi - lo) * i / 4; return { y: this.y(v), label: compact(v) }; });
  }
  protected buildX(labels: string[], pos: (i: number) => number) {
    const step = Math.ceil(labels.length / 12);
    this.xTicks = labels.map((l, i) => ({ x: pos(i), label: l })).filter((_, i) => i % step === 0);
  }
}

const SVG_STYLES = `
  :host{display:block} svg{width:100%;height:auto;display:block}
  .grid{stroke:rgba(148,163,184,.18);stroke-width:1} .zero{stroke:rgba(148,163,184,.5);stroke-width:1}
  .tick{fill:#94A3B8;font-size:11px} .legend{display:flex;gap:14px;flex-wrap:wrap;margin-bottom:6px;font-size:12px;color:var(--text-2)}
  .legend i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:5px}`;

@Component({
  standalone: true, selector: 'bw-line-chart',
  template: `
    <div class="legend">@for (s of series; track s.name) { <span><i [style.background]="s.color"></i>{{ s.name }}</span> }</div>
    <svg [attr.viewBox]="'0 0 ' + W + ' ' + H" role="img" [attr.aria-label]="label">
      @for (t of yTicks; track t.y) {
        <line class="grid" [attr.x1]="L" [attr.x2]="W - R" [attr.y1]="t.y" [attr.y2]="t.y" />
        <text class="tick" text-anchor="end" [attr.x]="L - 6" [attr.y]="t.y + 4">{{ t.label }}</text>
      }
      @for (t of xTicks; track t.x) { <text class="tick" text-anchor="middle" [attr.x]="t.x" [attr.y]="H - 8">{{ t.label }}</text> }
      @for (p of paths; track p.name) {
        <path [attr.d]="p.d" fill="none" [attr.stroke]="p.color" stroke-width="2" stroke-linejoin="round" />
        @for (pt of p.pts; track pt.x) { <circle [attr.cx]="pt.x" [attr.cy]="pt.y" r="3" [attr.fill]="p.color"><title>{{ p.name }} · {{ pt.label }}: {{ pt.text }}</title></circle> }
      }
    </svg>`,
  styles: [SVG_STYLES],
})
export class LineChartComponent extends Axes implements OnChanges {
  @Input() labels: string[] = [];
  @Input() series: Series[] = [];
  @Input() label = 'Line chart';
  paths: { name: string; color: string; d: string; pts: { x: number; y: number; label: string; text: string }[] }[] = [];

  ngOnChanges() {
    const all = this.series.flatMap(s => s.values.filter((v): v is number => v !== null));
    const { lo, hi } = domain(all);
    this.buildY(lo, hi);
    const n = this.labels.length;
    const x = (i: number) => L + (n <= 1 ? (W - L - R) / 2 : (W - L - R) * i / (n - 1));
    this.buildX(this.labels, x);
    this.paths = this.series.map(s => {
      let d = '', start = true; const pts: { x: number; y: number; label: string; text: string }[] = [];
      s.values.forEach((v, i) => {
        if (v === null) { start = true; return; }
        const px = x(i), py = this.y(v);
        d += `${start ? 'M' : 'L'}${px.toFixed(1)},${py.toFixed(1)} `; start = false;
        pts.push({ x: px, y: py, label: this.labels[i], text: compact(v) });
      });
      return { name: s.name, color: s.color, d, pts };
    });
  }
}

@Component({
  standalone: true, selector: 'bw-bar-chart',
  template: `
    <svg [attr.viewBox]="'0 0 ' + W + ' ' + H" role="img" [attr.aria-label]="label">
      @for (t of yTicks; track t.y) {
        <line class="grid" [attr.x1]="L" [attr.x2]="W - R" [attr.y1]="t.y" [attr.y2]="t.y" />
        <text class="tick" text-anchor="end" [attr.x]="L - 6" [attr.y]="t.y + 4">{{ t.label }}</text>
      }
      <line class="zero" [attr.x1]="L" [attr.x2]="W - R" [attr.y1]="zeroY" [attr.y2]="zeroY" />
      @for (b of bars; track b.x) {
        <rect [attr.x]="b.x" [attr.y]="b.y" [attr.width]="b.w" [attr.height]="b.h" rx="2" [attr.fill]="b.fill"><title>{{ b.label }}: {{ b.text }}</title></rect>
      }
      @for (t of xTicks; track t.x) { <text class="tick" text-anchor="middle" [attr.x]="t.x" [attr.y]="H - 8">{{ t.label }}</text> }
    </svg>`,
  styles: [SVG_STYLES],
})
export class BarChartComponent extends Axes implements OnChanges {
  @Input() labels: string[] = [];
  @Input() values: (number | null)[] = [];
  @Input() color = '#FF7A30';
  @Input() negColor = '#38BDF8';
  @Input() label = 'Bar chart';
  bars: { x: number; y: number; w: number; h: number; fill: string; label: string; text: string }[] = [];
  zeroY = 0;

  ngOnChanges() {
    const { lo, hi } = domain(this.values.filter((v): v is number => v !== null));
    this.buildY(lo, hi);
    this.zeroY = this.y(0);
    const n = this.labels.length, band = (W - L - R) / Math.max(n, 1), bw = band * 0.7;
    this.buildX(this.labels, i => L + band * i + band / 2);
    this.bars = [];
    this.values.forEach((v, i) => {
      if (v === null) return;
      const yv = this.y(v);
      this.bars.push({ x: L + band * i + (band - bw) / 2, y: Math.min(yv, this.zeroY), w: bw,
        h: Math.max(Math.abs(yv - this.zeroY), 1), fill: v < 0 ? this.negColor : this.color,
        label: this.labels[i], text: compact(v) });
    });
  }
}

@Component({
  standalone: true, selector: 'bw-heatmap',
  template: `
    <svg [attr.viewBox]="'0 0 ' + vw + ' ' + vh" role="img" [attr.aria-label]="label">
      @for (c of colLabels; track c; let j = $index) { <text class="tick" text-anchor="middle" [attr.x]="left + cw * j + cw / 2" y="12">{{ c }}</text> }
      @for (r of rowLabels; track r; let i = $index) {
        <text class="tick" text-anchor="end" [attr.x]="left - 6" [attr.y]="top + rh * i + rh * 0.75">{{ r }}</text>
      }
      @for (c of cells; track c.k) {
        <rect [attr.x]="c.x" [attr.y]="c.y" [attr.width]="cw - 1" [attr.height]="rh - 1" rx="2" [attr.fill]="c.fill" [attr.fill-opacity]="c.op"><title>{{ c.text }}</title></rect>
      }
    </svg>
    <div class="scale"><span>less</span><div class="bar"></div><span>more</span></div>`,
  styles: [SVG_STYLES, `.scale{display:flex;align-items:center;gap:8px;font-size:11px;color:var(--text-2);margin-top:6px}
    .bar{height:8px;width:140px;border-radius:4px;background:linear-gradient(90deg,hsl(40 95% 58% / .25),hsl(0 95% 48%))}`],
})
export class HeatmapComponent implements OnChanges {
  @Input() rowLabels: string[] = [];
  @Input() colLabels: string[] = [];
  @Input() values: (number | null)[][] = []; // [row][col]
  @Input() label = 'Heat map';
  readonly left = 44; readonly top = 20; readonly rh = 15; readonly vw = 640;
  get cw() { return (this.vw - this.left - 4) / Math.max(this.colLabels.length, 1); }
  vh = 100;
  cells: { k: string; x: number; y: number; fill: string; op: number; text: string }[] = [];

  ngOnChanges() {
    let max = 0;
    for (const row of this.values) for (const v of row) if (v !== null && v > max) max = v;
    this.vh = this.top + this.rh * this.rowLabels.length + 4;
    this.cells = [];
    this.values.forEach((row, i) => row.forEach((v, j) => {
      const t = max && v ? Math.sqrt(Math.min(v / max, 1)) : 0;
      this.cells.push({
        k: `${i}-${j}`, x: this.left + this.cw * j, y: this.top + this.rh * i,
        fill: v === null ? 'transparent' : t ? `hsl(${40 - 40 * t} 95% ${58 - 10 * t}%)` : '#94A3B8',
        op: v === null ? 0 : t ? 0.25 + 0.75 * t : 0.1,
        text: `${this.rowLabels[i]} · ${this.colLabels[j]}: ${v === null ? 'no data' : compact(v)}`,
      });
    }));
  }
}
