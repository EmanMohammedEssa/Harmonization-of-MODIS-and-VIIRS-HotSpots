import { Component, Input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  standalone: true,
  selector: 'bw-sidebar',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <aside [class.open]="open">
      <a class="brand" routerLink="/dashboard" aria-label="Burnwise home">
        <svg viewBox="0 0 48 48" width="40" height="40" aria-hidden="true">
          <defs>
            <linearGradient id="bwbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFB02E"/><stop offset=".55" stop-color="#FF6A1F"/><stop offset="1" stop-color="#D92D20"/></linearGradient>
            <linearGradient id="bwfl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#FFE3CC"/></linearGradient>
          </defs>
          <rect width="48" height="48" rx="13" fill="url(#bwbg)"/>
          <ellipse cx="24" cy="25" rx="19" ry="7.5" transform="rotate(-28 24 25)" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1.6"/>
          <g transform="translate(10.6 9.6) scale(1.1)"><path fill="url(#bwfl)" d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></g>
          <circle cx="39.3" cy="13.6" r="3.1" fill="#0B1220"/><circle cx="39.3" cy="13.6" r="1.7" fill="#38BDF8"/>
        </svg>
        <span class="txt"><span class="name"><b>Burn</b>wise</span><small>Egypt fire monitoring</small></span>
      </a>
      <nav>
        @for (n of items; track n.path) {
          <a class="nav" [routerLink]="n.path" routerLinkActive="active">
            <i>{{ n.icon }}</i><span>{{ n.label }}</span>
          </a>
        }
      </nav>
    </aside>`,
  styles: [`
    aside{width:240px;height:100vh;position:sticky;top:0;background:var(--surface);
      border-right:1px solid var(--border);padding:var(--s2);box-sizing:border-box;transition:transform var(--ease),width var(--ease)}
    .brand{display:flex;align-items:center;gap:12px;text-decoration:none;margin:4px 0 var(--s3);padding:0 4px}
    .brand svg{flex:none;filter:drop-shadow(0 4px 10px rgba(255,106,31,.35))}
    .txt{display:flex;flex-direction:column;line-height:1.1;min-width:0}
    .name{font-size:21px;font-weight:800;letter-spacing:-.3px;color:var(--text)}
    .name b{background:linear-gradient(90deg,#FFB02E,#FF6A1F);-webkit-background-clip:text;background-clip:text;color:transparent}
    .txt small{font-size:11px;color:var(--text-2);margin-top:3px;letter-spacing:.3px;white-space:nowrap}
    nav{display:flex;flex-direction:column;gap:4px}
    .nav{display:flex;gap:12px;align-items:center;padding:10px 12px;border-radius:8px;
      color:var(--text-2);text-decoration:none;transition:background var(--ease),color var(--ease)}
    .nav:hover{background:var(--card);color:var(--text)}
    .nav.active{background:rgba(255,122,48,.14);color:var(--fire)}
    i{font-style:normal;width:20px;text-align:center}
    @media(max-width:1024px){aside{width:68px}.txt,.nav span{display:none}.brand{justify-content:center;padding:0}}
    @media(max-width:768px){aside{position:fixed;z-index:20;width:240px;transform:translateX(-100%)}
      aside.open{transform:none}.txt{display:flex}.nav span{display:inline}.brand{justify-content:flex-start;padding:0 4px}}
  `],
})
export class SidebarComponent {
  @Input() open = false;
  items = [
    { path: '/dashboard', label: 'Dashboard', icon: '▣' },
    { path: '/fire-analysis', label: 'Fire Analysis', icon: '◎' },
    { path: '/instructions', label: 'Instructions', icon: '?' },
  ];
}
