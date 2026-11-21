import { Component, Input } from '@angular/core';

@Component({
  standalone: true,
  selector: 'bw-stat-card',
  template: `
    <div class="card">
      <div class="label">{{ label }}</div>
      <div class="value" [class.text]="text" [style.color]="color">{{ shown }}</div>
      @if (hint) { <div class="hint">{{ hint }}</div> }
      @else if (value === null) { <div class="hint">Not available</div> }
    </div>`,
  styles: [`:host{display:block;min-width:0}
    .label{color:var(--text-2);font-size:13px}
    .value{font-size:28px;font-weight:700;margin-top:6px;overflow-wrap:anywhere}
    .value.text{font-size:18px;line-height:1.3}
    .hint{color:var(--text-2);font-size:12px;margin-top:2px}`],
})
export class StatCardComponent {
  @Input({ required: true }) label = '';
  @Input() value: number | string | null = null; // null = unknown, never shown as 0
  @Input() color = 'var(--text)';
  @Input() text = false;   // smaller font for text values (place, period)
  @Input() hint = '';
  get shown() {
    if (this.value === null) return '—';
    return typeof this.value === 'number' ? Number(this.value.toFixed(1)).toLocaleString() : this.value;
  }
}
