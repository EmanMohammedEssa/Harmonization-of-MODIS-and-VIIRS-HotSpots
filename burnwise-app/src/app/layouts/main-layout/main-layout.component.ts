import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { SidebarComponent } from '../sidebar/sidebar.component';

@Component({
  standalone: true,
  selector: 'bw-main-layout',
  imports: [RouterOutlet, SidebarComponent, HeaderComponent],
  template: `
    <div class="shell">
      <bw-sidebar [open]="menuOpen()" />
      <div class="main">
        <bw-header (toggleMenu)="menuOpen.set(!menuOpen())" />
        <main (click)="menuOpen.set(false)"><router-outlet /></main>
      </div>
    </div>`,
  styles: [`.shell{display:flex;min-height:100vh}.main{flex:1;min-width:0}
    main{padding:var(--s3)} @media(max-width:768px){main{padding:var(--s2)}}`],
})
export class MainLayoutComponent {
  menuOpen = signal(false);
}
