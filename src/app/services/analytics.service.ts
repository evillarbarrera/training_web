import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { environment } from '../../environments/environment';

declare let gtag: Function;

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient, private router: Router) {
    this.initTracking();
  }

  private initTracking() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      const url = event.urlAfterRedirects;
      this.logVisit(url);
      
      // Integración con Google Analytics (gtag)
      if (typeof gtag === 'function') {
        gtag('config', 'G-Q20DYE2X1V', {
          'page_path': url,
          'page_title': this.formatPageTitle(url)
        });
      }
    });
  }

  private formatPageTitle(url: string): string {
    if (url === '/' || url === '') return 'PadelBlox | Inicio';
    const path = url.split('?')[0].substring(1);
    const formattedPath = path.split(/[\/-]/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    return `PadelBlox | ${formattedPath}`;
  }

  private logVisit(page: string) {
    const userId = localStorage.getItem('userId');
    const userRole = localStorage.getItem('userRole') || 'visitante';
    
    // Detectar dispositivo
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const dispositivo = isMobile ? 'Mobile' : 'PC';
    
    if (page.includes('admin-dashboard')) return;

    const payload = {
      pagina: page,
      usuario_id: userId ? Number(userId) : null,
      rol: userRole,
      dispositivo: dispositivo
    };

    this.http.post(`${this.apiUrl}/admin/log_visit.php`, payload).subscribe({
      error: (err) => console.log('Analytics Error:', err)
    });
  }

  trackEvent(eventName: string, eventParams: any = {}) {
    if (typeof gtag === 'function') {
      gtag('event', eventName, eventParams);
    }
  }
}
