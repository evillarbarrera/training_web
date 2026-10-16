import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-hard-gate',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './hard-gate.component.html',
  styleUrls: ['./hard-gate.component.scss']
})
export class HardGateComponent implements OnInit {
  @Input() activePage: string = '';

  isLocked = false;
  isLoading = true;
  message = '';
  role = '';
  isClub = false;

  constructor(private router: Router) {}

  ngOnInit(): void {
    const currentPath = window.location.pathname || this.router.url || '';
    if (this.activePage === 'mi-plan' || currentPath.includes('mi-plan') || currentPath.includes('login') || currentPath.includes('register')) {
      this.isLoading = false;
      return;
    }

    const role = (localStorage.getItem('userRole') || '').toLowerCase();
    this.role = role;
    this.isClub = (role.includes('club') || role.includes('admin') || role === 'administrador_club' || role === 'staff_club');

    // Super Admin y Jugadores nunca son bloqueados
    if (role === 'administrador' || role === 'superadmin' || role === 'jugador' || role === 'alumno') {
      this.isLoading = false;
      return;
    }

    // Apply Hard Gate to coaches AND club administrators / staff
    if (role.includes('entrenador') || role.includes('coach') || this.isClub) {
      this.checkSubscription();
    } else {
      this.isLoading = false;
    }
  }

  checkSubscription() {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      this.isLoading = false;
      return;
    }

    const token = localStorage.getItem('token');
    const authValue = token ? `Bearer ${token}` : '';
    fetch(`${environment.apiUrl}/subscriptions/get_subscription_status.php?user_id=${userId}&role=${this.role}`, {
      headers: {
        'Authorization': authValue,
        'X-Authorization': authValue
      }
    })
      .then(r => r.json())
      .then(res => {
        // Bloquear si el status es inactive, blocked o past_due
        if (res.status === 'inactive' || res.status === 'blocked' || res.status === 'past_due') {
          this.isLocked = true;
          this.message = res.message || 'Tu suscripción requiere atención.';
          if (res.is_club !== undefined) {
            this.isClub = res.is_club;
          }
        }
        this.isLoading = false;
      })
      .catch(() => {
        this.isLoading = false;
      });
  }

  goToPlans() {
    this.router.navigate(['/mi-plan']);
  }
}

