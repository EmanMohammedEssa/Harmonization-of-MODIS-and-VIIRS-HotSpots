import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

@Component({
  standalone: true,
  selector: 'bw-header',
  template: `
    <header>
      <button class="menu" (click)="toggleMenu.emit()" aria-label="Menu">☰</button>
      <div class="titles">
        <small>Burnwise › {{ title() }}</small>
        <h1>{{ title() }}</h1>
      </div>
    </header>`,
  styles: [`
    header{display:flex;align-items:center;gap:var(--s2);padding:var(--s2) var(--s3);
      border-bottom:1px solid var(--border);background:var(--bg)}
    .titles{flex:1} small{color:var(--text-2)} h1{margin:2px 0 0;font-size:22px}
    button{background:none;border:none;color:var(--text);font-size:18px;cursor:pointer}
    .menu{display:none}
    @media(max-width:768px){.menu{display:block}header{padding:var(--s2)}}
  `],
})
export class HeaderComponent {
  @Output() toggleMenu = new EventEmitter<void>();
  title = signal('Dashboard');
  constructor() {
    const router = inject(Router);
    const readTitle = () => {
      let r = router.routerState.snapshot.root;
      while (r.firstChild) r = r.firstChild;
      this.title.set(r.data['title'] ?? 'Burnwise');
    };
    readTitle();
    router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(readTitle);
  }
}
