// One row of harmonized_monthly.csv: a 0.25° grid cell for one month.
// null = unknown / missing in the file. Never coerced to 0.
export interface CellRow {
  lat: number;            // lat_cell
  lon: number;            // lon_cell
  year: number;
  month: number;          // 1-12
  modis: number | null;       // modis_count
  viirs: number | null;       // viirs_count
  harmonized: number | null;  // harmonized_count
  median: number | null;      // median_count
  anomaly: number | null;
  partial: boolean;       // is_partial_year
  color: string;          // colour of the file this row came from
}

export interface Dataset { name: string; color: string; rows: CellRow[]; }

export type Metric = 'harmonized' | 'modis' | 'viirs' | 'median' | 'anomaly';

// A cell after summing every row that passes the current filters.
export interface Agg {
  lat: number; lon: number; color: string;
  modis: number | null; viirs: number | null; harmonized: number | null;
  median: number | null; anomaly: number | null;
  rows: number; partialRows: number;
}
