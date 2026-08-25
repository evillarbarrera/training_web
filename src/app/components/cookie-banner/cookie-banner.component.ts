import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-cookie-banner',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div *ngIf="showBanner" class="cookie-banner-overlay">
      <div class="cookie-banner-card">
        <div class="cookie-header">
          <span class="cookie-icon">🍪</span>
          <h3>Preferencias de Privacidad y Cookies</h3>
        </div>
        <p class="cookie-desc">
          En <strong>PadelBlox</strong> utilizamos cookies propias y de terceros para garantizar el correcto funcionamiento del sitio, personalizar tu experiencia y analizar el tráfico de acuerdo a la Ley N° 19.628 de Protección de Datos Personales.
        </p>
        
        <div *ngIf="showConfig" class="cookie-config-panel">
          <div class="config-item">
            <div>
              <strong>Cookies Estrictamente Necesarias</strong>
              <p>Requeridas para la autenticación, seguridad y reservas.</p>
            </div>
            <input type="checkbox" checked disabled>
          </div>
          <div class="config-item">
            <div>
              <strong>Cookies de Rendimiento y Analítica</strong>
              <p>Nos ayudan a medir el rendimiento de la plataforma.</p>
            </div>
            <input type="checkbox" [(ngModel)]="analyticsCookies">
          </div>
          <div class="config-item">
            <div>
              <strong>Cookies de Marketing y Promociones</strong>
              <p>Para enviarte novedades personalizadas de clubes y torneos.</p>
            </div>
            <input type="checkbox" [(ngModel)]="marketingCookies">
          </div>
        </div>

        <div class="cookie-actions">
          <button class="btn-accept" (click)="acceptAll()">Aceptar todas</button>
          <button class="btn-reject" (click)="rejectOptional()">Rechazar no esenciales</button>
          <button class="btn-config" (click)="toggleConfig()">
            {{ showConfig ? 'Ocultar configuración' : 'Configurar cookies' }}
          </button>
          <button *ngIf="showConfig" class="btn-save" (click)="saveCustom()">Guardar selección</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .cookie-banner-overlay {
      position: fixed;
      bottom: 20px;
      right: 20px;
      left: 20px;
      max-width: 540px;
      margin: 0 auto;
      z-index: 99999;
    }
    .cookie-banner-card {
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 16px;
      padding: 20px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      color: #f8fafc;
      font-family: system-ui, -apple-system, sans-serif;
    }
    .cookie-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 8px;
    }
    .cookie-icon { font-size: 24px; }
    .cookie-header h3 { margin: 0; font-size: 17px; font-weight: 700; color: #ccff00; }
    .cookie-desc { font-size: 13px; line-height: 1.5; color: #94a3b8; margin: 0 0 16px 0; }
    .cookie-config-panel {
      background: #1e293b;
      padding: 12px;
      border-radius: 10px;
      margin-bottom: 16px;
    }
    .config-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid #334155;
    }
    .config-item:last-child { border-bottom: none; }
    .config-item strong { display: block; font-size: 13px; color: #e2e8f0; }
    .config-item p { margin: 2px 0 0 0; font-size: 11px; color: #64748b; }
    .config-item input { accent-color: #ccff00; width: 16px; height: 16px; }
    .cookie-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    button {
      border: none;
      padding: 9px 14px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 12px;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    button:hover { opacity: 0.9; }
    .btn-accept { background: #ccff00; color: #000; }
    .btn-reject { background: #334155; color: #f8fafc; }
    .btn-config { background: transparent; color: #94a3b8; text-decoration: underline; }
    .btn-save { background: #22c55e; color: #fff; }
  `]
})
export class CookieBannerComponent implements OnInit {
  showBanner = false;
  showConfig = false;
  analyticsCookies = false;
  marketingCookies = false;

  ngOnInit(): void {
    const consent = localStorage.getItem('padelblox_cookie_consent');
    if (!consent) {
      this.showBanner = true;
    }
  }

  toggleConfig(): void {
    this.showConfig = !this.showConfig;
  }

  acceptAll(): void {
    this.savePreferences(true, true);
  }

  rejectOptional(): void {
    this.savePreferences(false, false);
  }

  saveCustom(): void {
    this.savePreferences(this.analyticsCookies, this.marketingCookies);
  }

  private savePreferences(analytics: boolean, marketing: boolean): void {
    const preference = {
      necessary: true,
      analytics,
      marketing,
      updated_at: new Date().toISOString()
    };
    localStorage.setItem('padelblox_cookie_consent', JSON.stringify(preference));
    this.showBanner = false;
  }
}
