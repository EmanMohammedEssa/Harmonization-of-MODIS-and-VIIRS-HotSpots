import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  standalone: true,
  selector: 'bw-instructions-page',
  imports: [RouterLink],
  template: `
    <div class="wrap">
      <div class="card hero">
        <h2>How to use Burnwise</h2>
        <p>Burnwise shows satellite fire detections (MODIS and VIIRS) over Egypt on a map, split into
          0.25° grid squares and months. Use the filters to explore a place and a period, and read the
          numbers in the cards.</p>
      </div>

      <div class="grid">
        <div class="card">
          <h3>1 · Dashboard</h3>
          <ol>
            <li>Open <a routerLink="/dashboard">Dashboard</a>. The data loads by itself; the line above the cards shows the file name and number of rows.</li>
            <li>Choose a <b>Region</b> to zoom the map to an area, or pick a <b>Latitude</b> / <b>Longitude</b> line to see one row or column of squares.</li>
            <li>Choose a <b>Year</b> and a <b>Month</b>. Leave them on <i>All</i> to add up every year or month.</li>
            <li>Use <b>Colour map by</b> to colour the squares by Harmonized, MODIS, VIIRS, Median or Anomaly.</li>
            <li>Click a square to see its values. The cards then show only that square. Click it again, or press <i>Clear selected cell</i>, to go back.</li>
            <li><b>Download Excel</b> saves the rows that match your filters. <b>Source CSV</b> downloads the full data file.</li>
            <li>The ⛶ button on the map opens it full screen.</li>
          </ol>
        </div>

        <div class="card">
          <h3>2 · Fire Analysis</h3>
          <ol>
            <li>Open <a routerLink="/fire-analysis">Fire Analysis</a> and choose an <b>Area</b>.</li>
            <li>The four cards at the top give the total, the peak month, the busiest full year and the hottest square.</li>
            <li>Under each chart there is a short note on how to read it:
              detections per year, fire season by month, a year × month heat map, anomaly per year and the top 10 squares.</li>
            <li>A <b>*</b> after a year (for example 2026*) means that year has incomplete data, so compare it carefully.</li>
          </ol>
        </div>

        <div class="card">
          <h3>3 · Using your own data</h3>
          <ol>
            <li>On the Dashboard, scroll to <b>Data files</b> and choose a <code>.csv</code> or <code>.xlsx</code> file.</li>
            <li>Required columns: <code>lat_cell</code>, <code>lon_cell</code>, <code>year</code>, <code>month</code>. Other columns are optional.</li>
            <li>Each file gets its own outline colour on the map. Use ✕ to remove a file.</li>
            <li>Loaded files are kept only while the page is open. To change the default data, replace <code>public/data/harmonized_monthly_AI.csv</code>.</li>
          </ol>
        </div>

        <div class="card">
          <h3>4 · What the columns mean</h3>
          <dl>
            <dt>lat_cell, lon_cell</dt><dd>Position of a 0.25° grid square (about 28 km).</dd>
            <dt>year, month</dt><dd>The period of the measurement.</dd>
            <dt>modis_count</dt><dd>Fire detections by the MODIS satellite (since 2003).</dd>
            <dt>viirs_count</dt><dd>Fire detections by the VIIRS satellite (since 2012).</dd>
            <dt>harmonized_count</dt><dd>MODIS and VIIRS put on one comparable scale.</dd>
            <dt>median_count</dt><dd>The typical (median) level for that square and month.</dd>
            <dt>anomaly</dt><dd>Harmonized minus median. Above 0 means more fire than usual; below 0 means less.</dd>
            <dt>is_partial_year</dt><dd>True when that year does not have all its months yet.</dd>
          </dl>
        </div>

        <div class="card wide">
          <h3>Good to know</h3>
          <ul>
            <li>Values in the cards are <b>sums</b> over the chosen period, not averages.</li>
            <li>Regions are approximate rectangles. For exact areas use the Latitude and Longitude filters.</li>
            <li>Squares with no detections are hidden on the map to keep it readable.</li>
            <li>If the map is empty, check the filters (press <i>Reset filters</i>) and make sure the data line above the cards shows rows.</li>
            <li>Works on phones, tablets and laptops. On a small screen use the ☰ button to open the menu.</li>
          </ul>
        </div>
      </div>
    </div>`,
  styles: [`
    .wrap{max-width:1100px}
    .hero{margin-bottom:var(--s2)} .hero h2{margin:0 0 6px;font-size:20px}
    .hero p{margin:0;color:var(--text-2);line-height:1.6;font-size:14px}
    .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--s2)}
    .wide{grid-column:1 / -1}
    h3{margin:0 0 var(--s1);font-size:15px}
    ol,ul{margin:0;padding-left:20px;font-size:13.5px;line-height:1.65;color:var(--text-2)}
    li{margin-bottom:5px} li b,li i{color:var(--text)}
    a{color:var(--fire)}
    code{background:var(--surface);padding:1px 6px;border-radius:5px;font-size:12px;color:var(--text)}
    dl{margin:0;display:grid;grid-template-columns:max-content 1fr;gap:8px 14px;font-size:13.5px}
    dt{color:var(--text);font-weight:600;font-family:ui-monospace,monospace;font-size:12.5px}
    dd{margin:0;color:var(--text-2);line-height:1.5}
    @media(max-width:900px){.grid{grid-template-columns:minmax(0,1fr)}}
    @media(max-width:520px){dl{grid-template-columns:1fr}dd{margin-bottom:6px}}
  `],
})
export class InstructionsPageComponent {}
