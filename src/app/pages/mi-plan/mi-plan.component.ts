import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { environment } from '../../../environments/environment';
import { CurrencyService } from '../../services/currency.service';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-mi-plan',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: './mi-plan.component.html',
  styleUrls: ['./mi-plan.component.scss']
})
export class MiPlanComponent implements OnInit {
  isLoading = true;
  sub: any = null;
  plans: any[] = [];
  coachId: number = 0;
  coachNombre: string = '';
  coachFoto: string = '';
  userRole: 'jugador' | 'entrenador' | 'administrador_club' | 'administrador' | 'staff_club' = 'entrenador';

  // Currency & Location
  isInternational = false;
  currencySymbol = '$';
  currencyCode = 'CLP';

  constructor(
    public currencyService: CurrencyService,
    private router: Router
  ) { }

  ngOnInit(): void {
    const storedRole = localStorage.getItem('userRole') || '';
    const storedUserId = localStorage.getItem('userId');
    
    // 🔐 SEGURIDAD: Los usuarios de Staff no pueden gestionar el plan/pago
    if (!storedUserId || storedRole.toLowerCase().includes('staff')) {
        this.router.navigate(['/club-home']);
        return;
    }

        this.userRole = storedRole as any;
        this.coachId = Number(storedUserId);
    this.coachNombre = localStorage.getItem('userName') || 'Mi Academia';
    this.coachFoto = localStorage.getItem('userFoto') || '';
    this.detectCurrency();
    this.checkPaymentReturn();
    this.loadSubscription();
    this.loadPlansData();
  }

  checkPaymentReturn(): void {
    if (typeof window === 'undefined' || !window.location.search) return;

    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment_status') || params.get('status') || params.get('collection_status');
    const paymentId = params.get('payment_id') || params.get('collection_id');
    const planId = params.get('plan_id') ? Number(params.get('plan_id')) : 0;

    if (paymentStatus === 'success' || paymentStatus === 'approved') {
      this.isLoading = true;
      const token = localStorage.getItem('token');
      const authValue = token ? `Bearer ${token}` : '';

      fetch(`${environment.apiUrl}/subscriptions/confirm_subscription_payment.php`, {
        method: 'POST',
        headers: {
          'Authorization': authValue,
          'X-Authorization': authValue,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: this.coachId,
          plan_id: planId,
          payment_id: paymentId,
          status: paymentStatus
        })
      })
      .then(r => r.json())
      .then(res => {
        window.history.replaceState({}, document.title, window.location.pathname);
        if (res.success) {
          Swal.fire({
            title: '¡PAGO CONFIRMADO! 🎉',
            html: `
              <p>Tu mensualidad ha sido renovada exitosamente por <b>1 mes</b>.</p>
              <p style="font-size: 14px; color: #22c55e; font-weight: bold; margin-top: 10px;">
                ${res.message || 'Tu acceso se encuentra completamente activo.'}
              </p>
            `,
            icon: 'success',
            confirmButtonText: 'EXCELENTE ⚡',
            confirmButtonColor: '#0f172a'
          });
        }
        this.loadSubscription();
      })
      .catch(() => {
        window.history.replaceState({}, document.title, window.location.pathname);
        this.loadSubscription();
      });
    } else if (paymentStatus === 'failure' || paymentStatus === 'error') {
      window.history.replaceState({}, document.title, window.location.pathname);
      Swal.fire({
        title: 'Pago No Completado',
        text: 'La transacción no pudo ser aprobada o fue cancelada por el usuario.',
        icon: 'warning',
        confirmButtonText: 'ENTENDIDO'
      });
    }
  }

  detectCurrency(): void {
    this.currencyService.detectLocation().subscribe(country => {
      this.isInternational = country !== 'CL';
      this.currencySymbol = this.isInternational ? 'USD $' : '$';
      this.currencyCode = this.isInternational ? 'USD' : 'CLP';
    });
  }

  loadSubscription() {
    this.isLoading = true;
    const token = localStorage.getItem('token');
    const authValue = token ? `Bearer ${token}` : '';
    const clubId = localStorage.getItem('selectedClubId') || '';
    fetch(`${environment.apiUrl}/subscriptions/get_subscription_status.php?user_id=${this.coachId}&role=${this.userRole}&club_id=${clubId}`, {
      headers: {
        'Authorization': authValue,
        'X-Authorization': authValue
      }
    })
      .then(r => r.json())
      .then(res => {
        this.sub = res;
        this.isLoading = false;
      })
      .catch(err => {
        console.error('Error loading sub:', err);
        this.isLoading = false;
      });
  }

  loadPlansData() {
    const token = localStorage.getItem('token');
    const authValue = token ? `Bearer ${token}` : '';
    const clubId = localStorage.getItem('selectedClubId') || '';
    fetch(`${environment.apiUrl}/subscriptions/get_plans.php?role=${this.userRole}&coach_id=${this.coachId}&club_id=${clubId}`, {
      headers: {
        'Authorization': authValue,
        'X-Authorization': authValue
      }
    })
      .then(r => r.json())
      .then(res => {
        this.plans = res;
      })
      .catch(() => {
        if (this.userRole.includes('club') || this.userRole === 'administrador_club') {
          this.plans = [
            { id: 4, name: 'GESTIÓN DE CLUB', price_clp: 49990, description: 'Plan integral para la gestión completa del club: canchas, reservas, ventas e inventario con 3 meses gratis.' }
          ];
        } else {
          this.plans = [
            { id: 1, name: 'EMPRENDEDOR', price_clp: 0, description: 'Hasta 5 alumnos, con comisión' },
            { id: 2, name: 'INICIAL 20', price_clp: 19990, description: 'Hasta 20 alumnos, sin comisión' },
            { id: 3, name: 'PRO 40', price_clp: 29990, description: 'Hasta 40 alumnos, sin comisión' },
            { id: 4, name: 'ELITE ILIMITADO', price_clp: 49990, description: 'Alumnos ilimitados, sin comisión' }
          ];
        }
      });
  }

  loadPlans() {
    if (this.sub?.is_free_test_club) {
      Swal.fire({
        title: 'Club de Prueba Oficial 🎾',
        text: 'PowerPadel cuenta con servicio 100% gratuito permanente sin cobros mensuales ni comisiones.',
        icon: 'success',
        confirmButtonColor: '#0f172a',
        confirmButtonText: 'Entendido'
      });
      return;
    }

    if (this.plans.length > 0) {
      this.mostrarSelectorDePlanes();
    } else {
        this.loadPlansData();
        setTimeout(() => this.mostrarSelectorDePlanes(), 500);
    }
  }

  mostrarSelectorDePlanes() {
    const isClub = this.userRole.includes('club') || this.userRole === 'administrador_club';
    const modalTitle = isClub ? 'Activar Plan Club 🎾' : 'Elige tu Plan de Academia 💎';
    const modalSubtitle = isClub 
      ? 'Selecciona tu plan para desbloquear la gestión completa de tu club (canchas, reservas y torneos):'
      : 'Selecciona el plan que mejor se adapte a tu academia y alumnos:';

    const plansHtml = this.plans.map((p, index) => {
      const isSelected = index === 0;
      const formattedPrice = this.isInternational 
        ? `USD $${this.currencyService.getUsdAmount(p.price_clp)}` 
        : `$${Number(p.price_clp).toLocaleString('es-CL')}`;
      const currencySuffix = this.isInternational ? '/ mes' : 'CLP / mes';

      return `
        <div class="swal-plan-card ${isSelected ? 'selected' : ''}" id="card-plan-${p.id}" 
             onclick="window.selectSwalPlan(${p.id})">
          <input type="radio" name="planId" id="plan-${p.id}" value="${p.id}" ${isSelected ? 'checked' : ''} style="display:none">
          
          <div class="plan-card-top">
            <div class="plan-info-left">
              <div class="plan-name-row">
                <span class="plan-name-txt">${p.name}</span>
                ${isClub ? '<span class="plan-tag-badge">PLAN OFICIAL</span>' : (p.id === 3 ? '<span class="plan-tag-badge">POPULAR</span>' : '')}
              </div>
              <p class="plan-desc-txt">${p.description}</p>
            </div>

            <div class="plan-price-box">
              <div class="price-main-val">${formattedPrice}</div>
              <div class="price-period-sub">${currencySuffix}</div>
            </div>
          </div>

          <div class="plan-card-footer">
            <div class="plan-features-mini">
              <span><i class="fas fa-check-circle"></i> Acceso Total</span>
              <span><i class="fas fa-check-circle"></i> 0% Comisión</span>
              <span><i class="fas fa-shield-alt"></i> Soporte 24/7</span>
            </div>
            <div class="radio-indicator">
              <div class="radio-dot"></div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Window helper to toggle selection visually
    (window as any).selectSwalPlan = (id: number) => {
      document.querySelectorAll('.swal-plan-card').forEach(el => el.classList.remove('selected'));
      const card = document.getElementById(`card-plan-${id}`);
      if (card) card.classList.add('selected');
      const radio = document.getElementById(`plan-${id}`) as HTMLInputElement;
      if (radio) radio.checked = true;
    };

    Swal.fire({
      title: `<span style="font-size: 22px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px;">${modalTitle}</span>`,
      html: `
        <div style="text-align: left; padding: 4px 0 8px 0;">
          <p style="font-size: 13.5px; color: #64748b; margin: 0 0 18px 0; line-height: 1.5;">${modalSubtitle}</p>
          <div class="swal-plans-wrapper">${plansHtml}</div>
          
          <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 16px; padding: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 11.5px; color: #475569; font-weight: 600;">
            <i class="fas fa-lock" style="color: #10b981;"></i>
            <span>Pago seguro encriptado vía ${this.isInternational ? 'PayPal' : 'Mercado Pago (Webpay Plus, Redcompra, Débito y Crédito)'}</span>
          </div>
        </div>
        <style>
          .swal-plans-wrapper {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          .swal-plan-card {
            background: #ffffff;
            border: 2px solid #e2e8f0;
            border-radius: 14px;
            padding: 16px 18px;
            cursor: pointer;
            transition: all 0.2s ease-in-out;
            text-align: left;
            position: relative;
          }
          .swal-plan-card:hover {
            border-color: #cbd5e1;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);
          }
          .swal-plan-card.selected {
            border-color: #0f172a !important;
            background: #f8fafc !important;
            box-shadow: 0 0 0 1px #0f172a, 0 6px 16px rgba(15, 23, 42, 0.08) !important;
          }
          .plan-card-top {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 16px;
          }
          .plan-info-left {
            flex: 1;
            min-width: 0;
          }
          .plan-name-row {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 4px;
          }
          .plan-name-txt {
            font-size: 16px;
            font-weight: 900;
            color: #0f172a;
            letter-spacing: -0.3px;
          }
          .plan-tag-badge {
            background: #0f172a;
            color: #ccff00;
            font-size: 9px;
            font-weight: 900;
            padding: 2px 7px;
            border-radius: 6px;
            letter-spacing: 0.5px;
            text-transform: uppercase;
          }
          .plan-desc-txt {
            font-size: 12px;
            color: #64748b;
            margin: 0;
            line-height: 1.4;
          }
          .plan-price-box {
            flex-shrink: 0;
            text-align: right;
            white-space: nowrap;
          }
          .price-main-val {
            font-size: 21px;
            font-weight: 900;
            color: #0f172a;
            letter-spacing: -0.5px;
            line-height: 1.1;
          }
          .price-period-sub {
            font-size: 11px;
            font-weight: 700;
            color: #94a3b8;
            margin-top: 2px;
          }
          .plan-card-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 12px;
            padding-top: 10px;
            border-top: 1px solid #f1f5f9;
          }
          .plan-features-mini {
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 11px;
            font-weight: 600;
            color: #475569;
          }
          .plan-features-mini i {
            color: #10b981;
            font-size: 11px;
            margin-right: 3px;
          }
          .radio-indicator {
            width: 18px;
            height: 18px;
            border-radius: 50%;
            border: 2px solid #cbd5e1;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
          }
          .swal-plan-card.selected .radio-indicator {
            border-color: #0f172a;
            background: #0f172a;
          }
          .swal-plan-card.selected .radio-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: #ccff00;
          }
          .swal2-actions {
            display: flex !important;
            flex-direction: row !important;
            align-items: center !important;
            justify-content: flex-end !important;
            gap: 12px !important;
            width: 100% !important;
          }
          .swal-btn-continue {
            background: #0f172a !important;
            color: #ffffff !important;
            font-weight: 800 !important;
            font-size: 13.5px !important;
            padding: 12px 24px !important;
            border-radius: 10px !important;
            box-shadow: 0 4px 12px rgba(15, 23, 42, 0.2) !important;
            cursor: pointer !important;
          }
          .swal-btn-continue:hover {
            background: #1e293b !important;
          }
          .swal-btn-cancel {
            background: #f1f5f9 !important;
            color: #475569 !important;
            font-weight: 700 !important;
            font-size: 13px !important;
            padding: 12px 20px !important;
            border-radius: 10px !important;
            cursor: pointer !important;
          }
          .swal-btn-cancel:hover {
            background: #e2e8f0 !important;
            color: #0f172a !important;
          }
        </style>
      `,
      width: '560px',
      showConfirmButton: true,
      confirmButtonText: 'Continuar al Pago Seguro ⚡',
      customClass: {
        confirmButton: 'swal-btn-continue',
        cancelButton: 'swal-btn-cancel'
      },
      showDenyButton: false,
      showCancelButton: true,
      cancelButtonText: 'Volver',
      reverseButtons: false,
      buttonsStyling: false,
      preConfirm: () => {
        const selected = (document.querySelector('input[name="planId"]:checked') as HTMLInputElement);
        if (!selected) {
          Swal.showValidationMessage('Por favor selecciona un plan');
          return false;
        }
        return selected.value;
      }
    }).then((result) => {
      if (result.isConfirmed) {
        this.vincularReal(Number(result.value));
      }
    });
  }

  cambiarTarjeta() {
    const isEdit = !!(this.sub && this.sub.card_last_four);
    const existingHolder = (this.sub && this.sub.card_holder) || '';
    const existingBrand = (this.sub && this.sub.card_brand) || 'Visa';
    const existingLastFour = (this.sub && this.sub.card_last_four) || '••••';

    Swal.fire({
      title: `<span style="font-size: 20px; font-weight: 900; color: #0f172a;">${isEdit ? 'Actualizar Tarjeta de Pago 💳' : 'Registrar Tarjeta Segura 💳'}</span>`,
      html: `
        <div style="text-align: left; padding: 5px 0;">
          <p style="font-size: 13px; color: #64748b; margin-bottom: 16px;">
            Ingresa los datos de tu tarjeta de crédito o débito para la facturación de comisiones y cobros de Padelblox.
          </p>

          <!-- Tarjeta Visual Interactiva -->
          <div id="swal-card-preview" style="
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            border-radius: 16px;
            padding: 18px 22px;
            color: #ffffff;
            margin-bottom: 18px;
            box-shadow: 0 10px 25px rgba(15, 23, 42, 0.25);
            position: relative;
            overflow: hidden;
          ">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
              <span style="font-size: 11px; font-weight: 800; letter-spacing: 1px; color: #ccff00; text-transform: uppercase;">PADELBLOX SECURE PAY</span>
              <span id="preview-brand-badge" style="font-size: 12px; font-weight: 900; color: #fff; background: rgba(255,255,255,0.15); padding: 2px 10px; border-radius: 6px;">${existingBrand}</span>
            </div>
            
            <div id="preview-card-number" style="font-size: 19px; font-weight: 800; letter-spacing: 3px; font-family: monospace; margin-bottom: 16px;">
              ${isEdit ? ('•••• •••• •••• ' + existingLastFour) : '•••• •••• •••• ••••'}
            </div>

            <div style="display: flex; justify-content: space-between; align-items: flex-end;">
              <div>
                <div style="font-size: 9px; text-transform: uppercase; color: #94a3b8; font-weight: 700;">Titular de la Tarjeta</div>
                <div id="preview-card-holder" style="font-size: 13px; font-weight: 800; text-transform: uppercase; color: #f8fafc; letter-spacing: 0.5px;">
                  ${existingHolder || 'NOMBRE TITULAR'}
                </div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 9px; text-transform: uppercase; color: #94a3b8; font-weight: 700;">Vence</div>
                <div id="preview-card-exp" style="font-size: 13px; font-weight: 800; color: #f8fafc; font-family: monospace;">
                  ${(this.sub && this.sub.card_expiry) || 'MM/AA'}
                </div>
              </div>
            </div>
          </div>

          <!-- Formulario Inputs -->
          <div style="display: flex; flex-direction: column; gap: 12px;">
            <div>
              <label style="display: block; font-size: 11px; font-weight: 800; color: #475569; text-transform: uppercase; margin-bottom: 5px;">Nombre del Titular</label>
              <input id="swal-card-holder" type="text" placeholder="Como figura en la tarjeta" value="${existingHolder}" style="
                width: 100%; box-sizing: border-box; padding: 11px 14px; border: 1.5px solid #cbd5e1; border-radius: 10px; font-size: 13px; font-weight: 700; outline: none; text-transform: uppercase;
              ">
            </div>

            <div>
              <label style="display: block; font-size: 11px; font-weight: 800; color: #475569; text-transform: uppercase; margin-bottom: 5px;">Número de Tarjeta</label>
              <input id="swal-card-num" type="text" placeholder="0000 0000 0000 0000" maxlength="19" style="
                width: 100%; box-sizing: border-box; padding: 11px 14px; border: 1.5px solid #cbd5e1; border-radius: 10px; font-size: 14px; font-weight: 800; outline: none; letter-spacing: 1px; font-family: monospace;
              ">
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div>
                <label style="display: block; font-size: 11px; font-weight: 800; color: #475569; text-transform: uppercase; margin-bottom: 5px;">Vencimiento</label>
                <input id="swal-card-exp" type="text" placeholder="MM/AA" maxlength="5" value="${(this.sub && this.sub.card_expiry) || ''}" style="
                  width: 100%; box-sizing: border-box; padding: 11px 14px; border: 1.5px solid #cbd5e1; border-radius: 10px; font-size: 13px; font-weight: 800; outline: none; text-align: center; font-family: monospace;
                ">
              </div>

              <div>
                <label style="display: block; font-size: 11px; font-weight: 800; color: #475569; text-transform: uppercase; margin-bottom: 5px;">Código CVV</label>
                <input id="swal-card-cvv" type="password" placeholder="•••" maxlength="4" style="
                  width: 100%; box-sizing: border-box; padding: 11px 14px; border: 1.5px solid #cbd5e1; border-radius: 10px; font-size: 13px; font-weight: 800; outline: none; text-align: center; font-family: monospace;
                ">
              </div>
            </div>
          </div>

          <!-- Seguridad y Opciones -->
          <div style="display: flex; align-items: center; gap: 8px; margin-top: 15px; font-size: 11px; color: #64748b; font-weight: 600;">
            <i class="fas fa-shield-alt" style="color: #10b981; font-size: 14px;"></i>
            <span>Cifrado TLS/SSL de 256 bits. Transacción protegida.</span>
          </div>

          <div style="margin-top: 14px; padding-top: 12px; border-top: 1px dashed #e2e8f0; text-align: center;">
            <a href="javascript:void(0)" id="swal-link-webpay" style="font-size: 12px; color: #0284c7; font-weight: 800; text-decoration: none;">
              ¿Deseas pagar tu mensualidad directamente por Webpay / Mercado Pago? Haz clic aquí ⚡
            </a>
          </div>
        </div>
      `,
      width: '500px',
      showConfirmButton: true,
      confirmButtonText: isEdit ? 'ACTUALIZAR TARJETA SEGURA 🔒' : 'VINCULAR TARJETA SEGURA 🔒',
      showCancelButton: true,
      cancelButtonText: 'Cancelar',
      customClass: {
        confirmButton: 'swal-btn-continue',
        cancelButton: 'swal-btn-cancel'
      },
      buttonsStyling: false,
      didOpen: () => {
        const numInput = document.getElementById('swal-card-num') as HTMLInputElement;
        const holderInput = document.getElementById('swal-card-holder') as HTMLInputElement;
        const expInput = document.getElementById('swal-card-exp') as HTMLInputElement;
        const previewNum = document.getElementById('preview-card-number');
        const previewHolder = document.getElementById('preview-card-holder');
        const previewExp = document.getElementById('preview-card-exp');
        const previewBrand = document.getElementById('preview-brand-badge');
        const linkWebpay = document.getElementById('swal-link-webpay');

        if (linkWebpay) {
          linkWebpay.addEventListener('click', () => {
            Swal.close();
            this.loadPlans();
          });
        }

        if (numInput && previewNum && previewBrand) {
          numInput.addEventListener('input', (e: any) => {
            let val = e.target.value.replace(/\D/g, '').substring(0, 16);
            let formatted = val.match(/.{1,4}/g)?.join(' ') || val;
            numInput.value = formatted;
            previewNum.textContent = formatted || '•••• •••• •••• ••••';

            if (val.startsWith('4')) {
              previewBrand.textContent = 'VISA';
            } else if (/^(5[1-5]|222[1-9]|22[3-9]|2[3-6]|27[01]|2720)/.test(val)) {
              previewBrand.textContent = 'MASTERCARD';
            } else if (/^3[47]/.test(val)) {
              previewBrand.textContent = 'AMEX';
            } else {
              previewBrand.textContent = 'REDCOMPRA';
            }
          });
        }

        if (holderInput && previewHolder) {
          holderInput.addEventListener('input', (e: any) => {
            previewHolder.textContent = e.target.value.toUpperCase() || 'NOMBRE TITULAR';
          });
        }

        if (expInput && previewExp) {
          expInput.addEventListener('input', (e: any) => {
            let val = e.target.value.replace(/\D/g, '').substring(0, 4);
            if (val.length >= 3) {
              val = val.substring(0, 2) + '/' + val.substring(2, 4);
            }
            expInput.value = val;
            previewExp.textContent = val || 'MM/AA';
          });
        }
      },
      preConfirm: () => {
        const holder = (document.getElementById('swal-card-holder') as HTMLInputElement)?.value.trim();
        const num = (document.getElementById('swal-card-num') as HTMLInputElement)?.value.replace(/\D/g, '');
        const exp = (document.getElementById('swal-card-exp') as HTMLInputElement)?.value.trim();
        const cvv = (document.getElementById('swal-card-cvv') as HTMLInputElement)?.value.trim();
        const brand = document.getElementById('preview-brand-badge')?.textContent || 'Visa';

        if (!holder) {
          Swal.showValidationMessage('Por favor ingresa el nombre del titular');
          return false;
        }
        if (!num || num.length < 13) {
          Swal.showValidationMessage('Por favor ingresa un número de tarjeta válido (mínimo 13 dígitos)');
          return false;
        }
        if (!exp || exp.length < 4) {
          Swal.showValidationMessage('Por favor ingresa la fecha de vencimiento (MM/AA)');
          return false;
        }
        if (!cvv || cvv.length < 3) {
          Swal.showValidationMessage('Por favor ingresa el código CVV');
          return false;
        }

        return {
          card_holder: holder,
          card_number: num,
          card_expiry: exp,
          card_cvv: cvv,
          card_brand: brand
        };
      }
    }).then((res) => {
      if (res.isConfirmed && res.value) {
        this.guardarTarjetaSegura(res.value);
      }
    });
  }

  guardarTarjetaSegura(cardData: any) {
    this.isLoading = true;
    const token = localStorage.getItem('token');
    const authValue = token ? `Bearer ${token}` : '';

    fetch(`${environment.apiUrl}/subscriptions/save_payment_card.php`, {
      method: 'POST',
      headers: {
        'Authorization': authValue,
        'X-Authorization': authValue,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        coach_id: this.coachId,
        user_id: this.coachId,
        card_holder: cardData.card_holder,
        card_number: cardData.card_number,
        card_expiry: cardData.card_expiry,
        card_brand: cardData.card_brand
      })
    })
    .then(r => r.json())
    .then(res => {
      this.isLoading = false;
      if (res.success) {
        if (!this.sub) this.sub = {};
        this.sub.card_last_four = res.card_last_four;
        this.sub.card_brand = res.card_brand;
        this.sub.card_holder = res.card_holder;
        this.sub.card_expiry = res.card_expiry;
        this.sub.has_payment_method = true;

        Swal.fire({
          title: '¡TARJETA REGISTRADA! 🔒',
          html: `
            <div style="font-size: 14px; color: #475569; line-height: 1.5;">
              <p>Tu tarjeta <b>${res.card_brand}</b> terminada en <b>**** ${res.card_last_four}</b> ha sido vinculada correctamente para facturación interna y comisiones.</p>
              <div style="margin-top: 12px; padding: 10px; background: #ecfdf5; border-radius: 8px; color: #047857; font-weight: 700;">
                ✅ Estado de pago: Activo y Protegido
              </div>
            </div>
          `,
          icon: 'success',
          confirmButtonText: 'ENTENDIDO ⚡',
          confirmButtonColor: '#0f172a'
        });
        this.loadSubscription();
      } else {
        Swal.fire({
          title: 'Atención',
          text: res.message || 'No se pudo guardar la tarjeta.',
          icon: 'warning',
          confirmButtonText: 'Aceptar'
        });
      }
    })
    .catch(() => {
      this.isLoading = false;
      Swal.fire({
        title: 'Error de Conexión',
        text: 'Ocurrió un error al registrar la tarjeta. Por favor inténtalo nuevamente.',
        icon: 'error',
        confirmButtonText: 'Aceptar'
      });
    });
  }

  vincularReal(planId: number) {
    if (this.sub?.is_free_test_club) {
      Swal.fire({
        title: 'Club de Prueba Oficial 🎾',
        text: 'PowerPadel cuenta con servicio 100% gratuito sin necesidad de pagar el plan.',
        icon: 'success',
        confirmButtonColor: '#0f172a',
        confirmButtonText: 'Entendido'
      });
      return;
    }

    if (this.isInternational) {
      this.iniciarFlujoPaypal(planId);
      return;
    }

    this.isLoading = true;
    const token = localStorage.getItem('token');
    const authValue = token ? `Bearer ${token}` : '';
    const clubId = localStorage.getItem('selectedClubId') || 0;
    
    const body = {
      coach_id: this.coachId,
      user_id: this.coachId,
      plan_id: planId,
      club_id: clubId,
      origin: window.location.origin + window.location.pathname,
      force_payment: (this.sub && this.sub.days_remaining === 0)
    };

    fetch(`${environment.apiUrl}/subscriptions/create_subscription_link.php`, {
      method: 'POST',
      headers: {
        'Authorization': authValue,
        'X-Authorization': authValue,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })
    .then(r => r.json())
    .then(res => {
      this.isLoading = false;
      if (res.success && res.redirect) {
        window.location.href = res.init_point;
      } else if (res.success && !res.redirect) {
        Swal.fire({ title: '¡Éxito!', text: 'Plan activado correctamente.', icon: 'success' });
        this.loadSubscription();
      } else {
        Swal.fire({ title: 'Atención', text: res.message || 'Error al conectar.', icon: 'info' });
      }
    })
    .catch(err => {
      this.isLoading = false;
      Swal.fire({ title: 'Error', text: 'No se pudo iniciar el pago.', icon: 'error' });
    });
  }

  // --- NUEVA LÓGICA PAYPAL ---

  iniciarFlujoPaypal(planId: number) {
    Swal.fire({
      title: 'SUSCRIPCIÓN PAYPAL 💵',
      text: 'Se habilitará el botón de PayPal para que actives tu cobro mensual en dólares.',
      icon: 'info',
      confirmButtonText: 'MOSTRAR BOTÓN',
      confirmButtonColor: '#0070ba'
    }).then(() => {
        this.renderPaypalButton(planId);
    });
  }

  renderPaypalButton(planId: number) {
    const container = document.getElementById('paypal-button-container');
    if (!container) return;
    container.innerHTML = ''; 

    if (!(window as any).paypal) {
        const script = document.createElement('script');
        script.src = `https://www.paypal.com/sdk/js?client-id=AaDdNdD9u3UQPHwYkECkzduiGXAll7ZEKrqG-jIUgJhyQNHzaqGXf4bssmnARVdXAjPqgJN5MGZ4e10p&vault=true&intent=subscription`;
        script.onload = () => this.buildPaypalButton(planId);
        document.body.appendChild(script);
    } else {
        this.buildPaypalButton(planId);
    }
  }

  buildPaypalButton(planId: number) {
    const planIds: any = {
        1: 'P-PLAN_EMPRENDEDOR_ID',
        2: 'P-7W798993Y3711311RM6S5Q2Y',
        3: 'P-3N798993BA817112RM6S5Q2Y',
        4: 'P-9A798993CK917113RM6S5Q2Y'
    };

    (window as any).paypal.Buttons({
      style: { shape: 'pill', color: 'gold', layout: 'vertical', label: 'subscribe' },
      createSubscription: (data: any, actions: any) => {
        return actions.subscription.create({ 'plan_id': planIds[planId] });
      },
      onApprove: (data: any, actions: any) => {
        this.isLoading = true;
        const token = localStorage.getItem('token');
        const authValue = token ? `Bearer ${token}` : '';
        fetch(`${environment.apiUrl}/subscriptions/confirm_subscription_payment.php`, {
          method: 'POST',
          headers: {
            'Authorization': authValue,
            'X-Authorization': authValue,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            user_id: this.coachId,
            plan_id: planId,
            paypal_sub_id: data.subscriptionID || data.orderID,
            status: 'approved'
          })
        })
        .then(r => r.json())
        .then(res => {
          Swal.fire({ 
            title: '¡ÉXITO!', 
            text: res.message || 'Suscripción activada con PayPal por 1 mes adicional.', 
            icon: 'success' 
          });
          this.loadSubscription();
        })
        .catch(() => {
          Swal.fire({ title: '¡ÉXITO!', text: 'Suscripción activada con PayPal.', icon: 'success' });
          this.loadSubscription();
        });
      },
      onError: (err: any) => {
        Swal.fire({ title: 'Error', text: 'No se pudo activar PayPal.', icon: 'error' });
      }
    }).render('#paypal-button-container');
  }

  cambiarPlan(planId: number) {
    this.vincularReal(planId);
  }
}
