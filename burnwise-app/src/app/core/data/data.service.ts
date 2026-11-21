import { Injectable, signal } from '@angular/core';
import { Dataset } from '../models';
import { PALETTE, parseCsv, toRows } from './data-utils';

/**
 * Single access point for data. Components never read files themselves.
 * To switch to the real ASP.NET API later, change only this class.
 */
@Injectable({ providedIn: 'root' })
export class DataService {
  datasets = signal<Dataset[]>([]);
  loading = signal(false);
  error = signal('');
  notice = signal('');
  private colorIdx = 0;

  async loadDefault() {
    this.loading.set(true); this.error.set('');
    try {
      const res = await fetch('data/harmonized_monthly_AI.csv');
      const text = res.ok ? await res.text() : '';
      if (!text.startsWith('lat_cell') && !text.startsWith('\uFEFFlat_cell')) {
        throw new Error(`Could not load data/harmonized_monthly_AI.csv (HTTP ${res.status}). Check that the file is deployed.`);
      }
      this.add('harmonized_monthly_AI.csv', parseCsv(text));
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Could not load the data.');
    } finally { this.loading.set(false); }
  }

  private async readObjs(file: File): Promise<Record<string, unknown>[]> {
    if (/\.csv$/i.test(file.name)) return parseCsv(await file.text());
    const XLSX = await import('xlsx'); // loaded only when an Excel file is picked
    const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    return XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]], { defval: null });
  }

  async loadFile(file: File) {
    this.loading.set(true); this.error.set(''); this.notice.set('');
    try { this.add(file.name, await this.readObjs(file)); }
    catch (e) { this.error.set(`${file.name}: ${e instanceof Error ? e.message : 'could not be read.'}`); }
    finally { this.loading.set(false); }
  }

  remove(name: string) { this.datasets.update(d => d.filter(x => x.name !== name)); }

  private add(name: string, objs: Record<string, unknown>[]) {
    const color = PALETTE[this.colorIdx++ % PALETTE.length];
    const { rows, skipped } = toRows(objs, color);
    this.datasets.update(d => [...d.filter(x => x.name !== name), { name, color, rows }]);
    if (skipped) this.notice.set(`${name}: ${skipped} rows skipped (missing lat/lon/year/month).`);
  }
}
