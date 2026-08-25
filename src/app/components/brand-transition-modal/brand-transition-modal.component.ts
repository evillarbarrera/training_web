import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-brand-transition-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="showModal" class="brand-modal-backdrop">
      <div class="brand-modal-card">
        <div class="logo-container">
          <span class="old-brand">PadelManager</span>
          <span class="arrow">➔</span>
          <span class="new-brand">Padel<span class="accent">Blox</span></span>
        </div>
        <h2>¡PadelManager evolucionó a PadelBlox!</h2>
        <p class="modal-body">
          Queremos informarte que tu perfil, historial deportivo, estadísticas y reservas de cancha siguen <strong>100% intactos</strong>. Mantenemos las mismas estrictas medidas de seguridad y el fiel compromiso de proteger tus datos personales conforme a la <strong>Ley N° 19.628</strong>.
        </p>
        <button class="btn-acknowledge" (click)="acknowledge()">
          Entendido, continuar a PadelBlox
        </button>
      </div>
    </div>
  `,
  styles: [`
    .brand-modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(8px);
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .brand-modal-card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 24px;
      max-width: 480px;
      width: 100%;
      padding: 32px 24px;
      text-align: center;
      color: #f8fafc;
      box-shadow: 0 20px 40px rgba(0,0,0,0.6);
      font-family: system-ui, -apple-system, sans-serif;
    }
    .logo-container {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      font-size: 20px;
      font-weight: 800;
      margin-bottom: 20px;
    }
    .old-brand { color: #94a3b8; text-decoration: line-through; opacity: 0.7; }
    .arrow { color: #ccff00; font-size: 22px; }
    .new-brand { color: #fff; }
    .accent { color: #ccff00; }
    h2 { font-size: 22px; margin: 0 0 12px 0; color: #ccff00; font-weight: 800; }
    .modal-body { font-size: 14px; line-height: 1.6; color: #cbd5e1; margin-bottom: 24px; }
    .btn-acknowledge {
      background: #ccff00;
      color: #0f172a;
      border: none;
      width: 100%;
      padding: 14px 20px;
      border-radius: 12px;
      font-weight: 800;
      font-size: 15px;
      cursor: pointer;
      transition: transform 0.1s;
    }
    .btn-acknowledge:hover { transform: translateY(-1px); }
  `]
})
export class BrandTransitionModalComponent implements OnInit {
  showModal = false;
  private apiUrl = environment.apiUrl;

  constructor(private authService: AuthService, private http: HttpClient) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (user && user.id && !user.brand_transition_acknowledged) {
      const ackLocally = localStorage.getItem(`padelblox_brand_ack_${user.id}`);
      if (!ackLocally) {
        this.showModal = true;
      }
    }
  }

  acknowledge(): void {
    const user = this.authService.getCurrentUser();
    if (user && user.id) {
      localStorage.setItem(`padelblox_brand_ack_${user.id}`, 'true');
      user.brand_transition_acknowledged = 1;
      this.authService.setCurrentUser(user);
      
      this.http.post(`${this.apiUrl}/user/acknowledge_transition.php`, {
        user_id: user.id
      }).subscribe();
    }
    this.showModal = false;
  }
}
