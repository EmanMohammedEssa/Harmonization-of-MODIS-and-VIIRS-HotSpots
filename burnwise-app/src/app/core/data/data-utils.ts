import { Agg, CellRow } from '../models';

export const PALETTE = ['#38BDF8', '#22C55E', '#A855F7', '#EAB308', '#EC4899', '#14B8A6'];

/** Fast CSV reader for plain (unquoted) numeric files like harmonized_monthly.csv. */
export function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/);
  const head = (lines[0] ?? '').replace(/^\uFEFF/, '').split(',').map(h => h.trim());
  const out: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i]) continue;
    const p = lines[i].split(',');
    const o: Record<string, string> = {};
    for (let j = 0; j < head.length; j++) o[head[j]] = p[j];
    out.push(o);
  }
  return out;
}

const ALIASES: Record<string, string[]> = {
  lat: ['lat_cell', 'lat', 'latitude'],
  lon: ['lon_cell', 'lon', 'lng', 'long', 'longitude'],
  year: ['year'], month: ['month'],
  modis: ['modis_count', 'modis'], viirs: ['viirs_count', 'viirs'],
  harmonized: ['harmonized_count', 'harmonized'], median: ['median_count', 'median'],
  anomaly: ['anomaly'],
  partial: ['is_partial_year', 'partial'],
};
const norm = (k: string) => k.trim().toLowerCase().replace(/[\s-]/g, '_');
const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

/** Maps raw sheet rows (CSV or Excel) to typed rows. Rows without lat/lon/year/month are skipped. */
export function toRows(objs: Record<string, unknown>[], color: string): { rows: CellRow[]; skipped: number } {
  if (!objs.length) throw new Error('The file has no data rows.');
  const keys = Object.keys(objs[0]);
  const col: Record<string, string | undefined> = {};
  for (const f of Object.keys(ALIASES)) col[f] = keys.find(k => ALIASES[f].includes(norm(k)));
  const missing = ['lat', 'lon', 'year', 'month'].filter(f => !col[f]);
  if (missing.length) throw new Error(`Missing required column(s): ${missing.map(m => ALIASES[m][0]).join(', ')}. Found: ${keys.join(', ')}`);

  const rows: CellRow[] = [];
  let skipped = 0;
  for (const o of objs) {
    const lat = num(o[col['lat']!]), lon = num(o[col['lon']!]);
    const year = num(o[col['year']!]), month = num(o[col['month']!]);
    if (lat === null || lon === null || year === null || month === null || month < 1 || month > 12) { skipped++; continue; }
    const get = (f: string) => (col[f] ? num(o[col[f]!]) : null);
    rows.push({
      lat, lon, year, month, color,
      modis: get('modis'), viirs: get('viirs'), harmonized: get('harmonized'),
      median: get('median'), anomaly: get('anomaly'),
      partial: col['partial'] ? /^(true|1|yes)$/i.test(String(o[col['partial']!])) : false,
    });
  }
  return { rows, skipped };
}

export const add = (a: number | null, b: number | null) => (b === null ? a : (a ?? 0) + b);

export interface Filters {
  year: number | null; month: number | null;
  latMin: number; latMax: number; lonMin: number; lonMax: number;
}

/** Filters rows and sums them per cell (and per source file). */
export function aggregate(rows: CellRow[], f: Filters): Agg[] {
  const map = new Map<string, Agg>();
  for (const r of rows) {
    if (f.year !== null && r.year !== f.year) continue;
    if (f.month !== null && r.month !== f.month) continue;
    if (r.lat < f.latMin || r.lat > f.latMax || r.lon < f.lonMin || r.lon > f.lonMax) continue;
    const key = `${r.color}|${r.lat}|${r.lon}`;
    let a = map.get(key);
    if (!a) {
      a = { lat: r.lat, lon: r.lon, color: r.color, modis: null, viirs: null, harmonized: null,
            median: null, anomaly: null, rows: 0, partialRows: 0 };
      map.set(key, a);
    }
    a.modis = add(a.modis, r.modis); a.viirs = add(a.viirs, r.viirs);
    a.harmonized = add(a.harmonized, r.harmonized); a.median = add(a.median, r.median);
    a.anomaly = add(a.anomaly, r.anomaly);
    a.rows++; if (r.partial) a.partialRows++;
  }
  return [...map.values()];
}

export function extent(rows: CellRow[]) {
  let latMin = Infinity, latMax = -Infinity, lonMin = Infinity, lonMax = -Infinity;
  for (const r of rows) { // plain loop: Math.min(...rows) would overflow the stack on 100k+ rows
    if (r.lat < latMin) latMin = r.lat; if (r.lat > latMax) latMax = r.lat;
    if (r.lon < lonMin) lonMin = r.lon; if (r.lon > lonMax) lonMax = r.lon;
  }
  return rows.length ? { latMin, latMax, lonMin, lonMax } : { latMin: 21, latMax: 32, lonMin: 24, lonMax: 37 };
}

/** Rows that pass the filters (used for the Excel export). */
export function filterRows(rows: CellRow[], f: Filters): CellRow[] {
  return rows.filter(r =>
    (f.year === null || r.year === f.year) && (f.month === null || r.month === f.month) &&
    r.lat >= f.latMin && r.lat <= f.latMax && r.lon >= f.lonMin && r.lon <= f.lonMax);
}
