import { Component, Input } from '@angular/core';
export type MessageKind = 'loading' | 'empty' | 'error' | 'partial';
@Component({
  standalone: true,
  selector: 'bw-state-message',
  template: `
    <div class="card box" [class]="kind">
      <strong>{{ title }}</strong>
      <span>{{ text }}</span>
    </div>`,
  styles: [`.box{display:flex;flex-direction:column;gap:4px;border-left:4px solid var(--accent)}
    .error{border-left-color:var(--danger)} .partial{border-left-color:var(--fire)}
    span{color:var(--text-2);font-size:14px}`],
})
export class StateMessageComponent {
  @Input() kind: MessageKind = 'loading';
  @Input() title = '';
  @Input() text = '';
}
