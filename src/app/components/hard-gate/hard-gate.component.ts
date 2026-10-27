import { Component, Input, OnInit, OnChanges, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-hard-gate',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './hard-gate.component.html',
  styleUrls: ['./hard-gate.component.scss']
})
export class HardGateComponent implements OnInit, OnChanges, OnDestroy {
  @Input() activePage: string = '';

  isLocked = false;
  isLoading = true;
  message = '';
  role = '';
  isClub = false;
  private routerSub?: Subscription;

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.evaluateGate();
    this.routerSub = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.evaluateGate();
      });
  }

  ngOnChanges(): void {
    this.evaluateGate();
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  evaluateGate(): void {
    const currentPath = window.location.pathname || this.router.url || '';
    if (this.activePage === 'mi-plan' || currentPath.includes('mi-plan') || currentPath.includes('login') || currentPath.includes('register')) {
      this.isLocked = false;
      this.isLoading = false;
      return;
    }

    const role = (localStorage.getItem('userRole') || '').toLowerCase();
    this.role = role;
    this.isClub = (role.includes('club') || role.includes('admin') || role === 'administrador_club' || role === 'staff_club');

    // Super Admin y Jugadores nunca son bloqueados
    if (role === 'administrador' || role === 'superadmin' || role === 'jugador' || role === 'alumno') {
      this.isLocked = false;
      this.isLoading = false;
      return;
    }

    // Apply Hard Gate to coaches AND club administrators / staff
    if (role.includes('entrenador') || role.includes('coach') || this.isClub) {
      this.checkSubscription();
    } else {
      this.isLocked = false;
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
    const clubId = this.isClub ? (localStorage.getItem('selectedClubId') || '') : '';
    fetch(`${environment.apiUrl}/subscriptions/get_subscription_status.php?user_id=${userId}&role=${this.role}&club_id=${clubId}`, {
      headers: {
        'Authorization': authValue,
        'X-Authorization': authValue
      }
    })
      .then(r => r.json())
      .then(res => {
        const isExempt = res.is_free_test_club || res.is_unlimited_coach;
        const isDaysExpired = !isExempt && (res.days_remaining !== undefined && Number(res.days_remaining) <= 0);

        // Bloquear si el status es inactive, blocked o past_due, is_blocked es true, o tiene 0 días restantes
        if (res.status === 'inactive' || res.status === 'blocked' || res.status === 'past_due' || res.is_blocked || isDaysExpired) {
          this.isLocked = true;
          this.message = res.message || 'Tu periodo de prueba o mensualidad ha finalizado (0 días restantes). Para continuar utilizando la plataforma debes activar tu plan.';
          if (res.is_club !== undefined) {
            this.isClub = res.is_club;
          }
        } else {
          this.isLocked = false;
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

