import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LigaService } from '../../services/liga.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-programar-jornada-semanal-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-backdrop" (click)="cancelar()">
      <div class="modal-card animate-in" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="modal-header">
          <div class="header-title-box">
            <div class="header-icon-box">
              <span>📅</span>
            </div>
            <div>
              <h3>Programar Horarios — {{ jornada?.nombre || 'Jornada' }}</h3>
              <div class="header-subtitle-row">
                <span class="category-pill">Todas las Categorías</span>
                <span class="jornada-subtext">Agendamiento semanal completo con restricciones por jugador y parejas demo</span>
              </div>
            </div>
          </div>
          <button class="btn-close" (click)="cancelar()" aria-label="Cerrar">✕</button>
        </div>

        <div *ngIf="errorMsj" class="alert-error">
          <span>⚠️</span> {{ errorMsj }}
        </div>

        <div class="modal-body-scroll">
          <!-- Sección 1: Fecha de Inicio -->
          <div class="section-card">
            <div class="section-title">
              <span class="sec-icon">📆</span>
              <label>Primer día de la semana (Inicio de partidos) *</label>
            </div>
            <div class="input-with-icon">
              <input type="date" [(ngModel)]="fechaInicio" class="custom-input date-input" />
            </div>
          </div>

          <!-- Sección 2: Días Habilitados -->
          <div class="section-card">
            <div class="section-title">
              <span class="sec-icon">🗓️</span>
              <label>Días habilitados para programar partidos</label>
            </div>
            <div class="days-chips">
              <button 
                type="button" 
                *ngFor="let d of diasSemanaList" 
                class="chip-btn" 
                [class.active]="d.selected" 
                (click)="d.selected = !d.selected">
                <span class="chip-check" *ngIf="d.selected">✓</span>
                {{ d.nombre }}
              </button>
            </div>
          </div>

          <!-- Sección 3: Canchas a Utilizar -->
          <div class="section-card">
            <div class="section-title">
              <span class="sec-icon">🏟️</span>
              <label>Canchas disponibles del club</label>
            </div>
            <div class="canchas-chips" *ngIf="canchas && canchas.length > 0">
              <button 
                type="button" 
                *ngFor="let c of canchas" 
                class="chip-btn court-chip" 
                [class.active]="isCanchaSelected(c.id)" 
                (click)="toggleCancha(c.id)">
                <span class="cancha-dot">📍</span>
                {{ c.nombre }}
                <span class="chip-check" *ngIf="isCanchaSelected(c.id)">✓</span>
              </button>
            </div>
            <div *ngIf="!canchas || canchas.length === 0" class="empty-canchas-notice">
              <span>⚠️</span> Se utilizarán automáticamente las canchas registradas en la sede del club.
            </div>
          </div>

          <!-- Sección 4: Horarios de los Partidos -->
          <div class="section-card">
            <div class="section-title">
              <span class="sec-icon">⏰</span>
              <label>Horarios de los partidos</label>
            </div>
            
            <div class="time-chips-container" *ngIf="horarios.length > 0">
              <span *ngFor="let h of horarios; let i = index" class="time-tag">
                <span class="time-icon">🕐</span> {{ h }}
                <button type="button" (click)="eliminarHorario(i)" class="btn-remove-tag" title="Eliminar horario">✕</button>
              </span>
            </div>

            <div class="add-time-row">
              <input type="time" [(ngModel)]="nuevoHorario" class="custom-input time-input-short" />
              <button type="button" class="btn-add-time" (click)="agregarHorario()">
                <span>+</span> Agregar Hora
              </button>
            </div>
          </div>

          <!-- Sección 5: Límite de Partidos por Pareja por Semana -->
          <div class="section-card">
            <div class="section-title">
              <span class="sec-icon">🎾</span>
              <label>Máximo de partidos por pareja por semana</label>
            </div>
            <select [(ngModel)]="maxPartidosPorPareja" class="custom-input">
              <option [ngValue]="1">1 partido por semana por pareja (Recomendado)</option>
              <option [ngValue]="2">2 partidos por semana por pareja</option>
              <option [ngValue]="3">3 partidos por semana por pareja</option>
              <option [ngValue]="0">Sin límite (Agendar todos los partidos de la jornada)</option>
            </select>
          </div>

          <!-- Sección 6: Switch de Restricciones -->
          <div class="section-card toggle-card">
            <label class="toggle-switch-row">
              <div class="toggle-info">
                <span class="shield-icon">🛡️</span>
                <div>
                  <span class="toggle-title">Respetar restricciones de jugadores</span>
                  <span class="toggle-desc">Evalúa disponibilidades declaradas por cada pareja antes de agendar</span>
                </div>
              </div>
              <div class="switch-button">
                <input type="checkbox" [(ngModel)]="respetarRestricciones" id="toggle-restr" />
                <label for="toggle-restr" class="switch-slider"></label>
              </div>
            </label>
          </div>
        </div>

        <!-- Footer -->
        <div class="modal-footer">
          <button class="btn-cancel" (click)="cancelar()" [disabled]="loading">Cancelar</button>
          <button class="btn-save" (click)="guardar()" [disabled]="loading" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
            <span *ngIf="!loading">💾 Guardar y Aplicar Programación (Reservar Canchas)</span>
            <span *ngIf="loading" class="spinner-row">
              <span class="spinner-icon">🎾</span> Reservando canchas y agendando...
            </span>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @keyframes fadeIn {
      from { opacity: 0; transform: scale(0.96) translateY(10px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .modal-backdrop {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      padding: 20px;
    }

    .modal-card {
      background: #ffffff;
      border-radius: 24px;
      padding: 28px;
      max-width: 580px;
      width: 100%;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      animation: fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      border: 1px solid rgba(255, 255, 255, 0.8);
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid #f1f5f9;
    }

    .header-title-box {
      display: flex;
      align-items: center;
      gap: 14px;

      .header-icon-box {
        width: 48px;
        height: 48px;
        border-radius: 14px;
        background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
        border: 1px solid #bfdbfe;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.4rem;
        flex-shrink: 0;
      }

      h3 {
        margin: 0;
        font-size: 1.2rem;
        font-weight: 800;
        color: #0f172a;
        letter-spacing: -0.02em;
      }

      .header-subtitle-row {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 4px;
        flex-wrap: wrap;
      }

      .category-pill {
        font-size: 0.72rem;
        font-weight: 800;
        color: #2563eb;
        background: #eff6ff;
        border: 1px solid #bfdbfe;
        padding: 2px 8px;
        border-radius: 10px;
        text-transform: uppercase;
        letter-spacing: 0.03em;
      }

      .jornada-subtext {
        font-size: 0.78rem;
        color: #64748b;
        font-weight: 600;
      }
    }

    .btn-close {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      font-size: 1rem;
      cursor: pointer;
      color: #64748b;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      &:hover {
        background: #f1f5f9;
        color: #0f172a;
        transform: scale(1.05);
      }
    }

    .alert-error {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #b91c1c;
      padding: 12px 16px;
      border-radius: 14px;
      font-weight: 700;
      margin-bottom: 16px;
      font-size: 0.85rem;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .modal-body-scroll {
      overflow-y: auto;
      padding-right: 4px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      max-height: calc(90vh - 160px);

      &::-webkit-scrollbar {
        width: 6px;
      }
      &::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 4px;
      }
    }

    .section-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 16px;

      &.toggle-card {
        background: #ffffff;
        border-color: #cbd5e1;
      }
    }

    .section-title {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 10px;

      .sec-icon {
        font-size: 1rem;
      }

      label {
        font-weight: 800;
        font-size: 0.88rem;
        color: #0f172a;
        margin: 0;
      }
    }

    .custom-input {
      width: 100%;
      padding: 11px 14px;
      border-radius: 12px;
      border: 1px solid #cbd5e1;
      font-size: 0.9rem;
      font-weight: 700;
      color: #0f172a;
      background: #ffffff;
      box-sizing: border-box;
      outline: none;
      transition: all 0.2s ease;

      &:focus {
        border-color: #2563eb;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
      }
    }

    .days-chips, .canchas-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .chip-btn {
      padding: 8px 14px;
      border-radius: 12px;
      border: 1.5px solid #cbd5e1;
      background: #ffffff;
      font-weight: 700;
      font-size: 0.82rem;
      color: #475569;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);

      .chip-check {
        font-size: 0.75rem;
        font-weight: 900;
      }

      &:hover {
        border-color: #94a3b8;
        transform: translateY(-1px);
        background: #f1f5f9;
      }

      &.active {
        background: #0f172a;
        color: #a8ff00;
        border-color: #0f172a;
        box-shadow: 0 4px 10px rgba(15, 23, 42, 0.15);

        &.court-chip {
          color: #38bdf8;
        }
      }
    }

    .empty-canchas-notice {
      font-size: 0.8rem;
      font-weight: 700;
      color: #b45309;
      background: #fef3c7;
      padding: 10px 14px;
      border-radius: 12px;
    }

    .time-chips-container {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 12px;
    }

    .time-tag {
      background: #e0f2fe;
      border: 1px solid #bae6fd;
      color: #0369a1;
      font-weight: 800;
      padding: 6px 12px;
      border-radius: 10px;
      font-size: 0.85rem;
      display: flex;
      align-items: center;
      gap: 6px;

      .time-icon { font-size: 0.8rem; }

      .btn-remove-tag {
        background: none;
        border: none;
        color: #0369a1;
        cursor: pointer;
        font-weight: 900;
        font-size: 0.85rem;
        padding: 0;
        margin-left: 2px;
        line-height: 1;
        &:hover { color: #0284c7; }
      }
    }

    .add-time-row {
      display: flex;
      gap: 10px;
      align-items: center;

      .time-input-short {
        width: 150px;
      }

      .btn-add-time {
        background: #0f172a;
        color: #ffffff;
        border: none;
        border-radius: 12px;
        padding: 10px 16px;
        font-weight: 800;
        font-size: 0.82rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        transition: all 0.2s ease;

        &:hover {
          background: #1e293b;
          transform: translateY(-1px);
        }
      }
    }

    .toggle-switch-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
      user-select: none;

      .toggle-info {
        display: flex;
        align-items: center;
        gap: 10px;

        .shield-icon { font-size: 1.3rem; }

        .toggle-title {
          display: block;
          font-weight: 800;
          font-size: 0.88rem;
          color: #0f172a;
        }
        .toggle-desc {
          display: block;
          font-size: 0.76rem;
          color: #64748b;
          font-weight: 600;
          margin-top: 1px;
        }
      }

      .switch-button {
        position: relative;
        input {
          opacity: 0;
          width: 0;
          height: 0;
          position: absolute;
          &:checked + .switch-slider {
            background-color: #16a34a;
          }
          &:checked + .switch-slider:before {
            transform: translateX(20px);
          }
        }
        .switch-slider {
          display: block;
          width: 44px;
          height: 24px;
          background-color: #cbd5e1;
          border-radius: 20px;
          position: relative;
          transition: background-color 0.25s ease;
          cursor: pointer;

          &:before {
            content: "";
            position: absolute;
            height: 18px;
            width: 18px;
            left: 3px;
            bottom: 3px;
            background-color: white;
            border-radius: 50%;
            transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          }
        }
      }
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 20px;
      border-top: 1px solid #f1f5f9;
      padding-top: 18px;

      .btn-cancel {
        background: #f1f5f9;
        border: 1px solid #cbd5e1;
        color: #475569;
        padding: 12px 22px;
        border-radius: 12px;
        font-weight: 800;
        font-size: 0.88rem;
        cursor: pointer;
        transition: all 0.2s ease;
        &:hover { background: #e2e8f0; color: #0f172a; }
      }

      .btn-save {
        background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
        color: #a8ff00;
        border: none;
        padding: 12px 24px;
        border-radius: 12px;
        font-weight: 800;
        font-size: 0.92rem;
        cursor: pointer;
        box-shadow: 0 4px 14px rgba(15, 23, 42, 0.2);
        transition: all 0.2s ease;

        &:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(15, 23, 42, 0.3);
          background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
        }

        &:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .spinner-row {
          display: flex;
          align-items: center;
          gap: 8px;
          .spinner-icon {
            display: inline-block;
            animation: spin 1s linear infinite;
          }
        }
      }
    }
  `]
})
export class ProgramarJornadaSemanalModalComponent implements OnInit {
  @Input() jornada: any;
  @Input() canchas: any[] = [];
  @Output() cerrar = new EventEmitter<boolean>();

  fechaInicio: string = '';
  diasSemanaList: { nombre: string; selected: boolean }[] = [
    { nombre: 'Lunes', selected: true },
    { nombre: 'Martes', selected: true },
    { nombre: 'Miércoles', selected: true },
    { nombre: 'Jueves', selected: true },
    { nombre: 'Viernes', selected: true },
    { nombre: 'Sábado', selected: true },
    { nombre: 'Domingo', selected: true }
  ];

  horarios: string[] = ['18:00', '19:30', '21:00'];
  nuevoHorario: string = '';
  canchasSeleccionadas: number[] = [];
  respetarRestricciones: boolean = true;
  maxPartidosPorPareja: number = 1;

  loading: boolean = false;
  errorMsj: string = '';

  constructor(private ligaService: LigaService) {}

  ngOnInit(): void {
    const today = new Date();
    this.fechaInicio = today.toISOString().split('T')[0];
    if (this.canchas && this.canchas.length > 0) {
      this.canchasSeleccionadas = this.canchas.map(c => c.id);
    }
  }

  isCanchaSelected(id: number): boolean {
    return this.canchasSeleccionadas.includes(id);
  }

  toggleCancha(id: number): void {
    if (this.isCanchaSelected(id)) {
      this.canchasSeleccionadas = this.canchasSeleccionadas.filter(c => c !== id);
    } else {
      this.canchasSeleccionadas.push(id);
    }
  }

  agregarHorario(): void {
    if (this.nuevoHorario && !this.horarios.includes(this.nuevoHorario)) {
      this.horarios.push(this.nuevoHorario);
      this.horarios.sort();
      this.nuevoHorario = '';
    }
  }

  eliminarHorario(index: number): void {
    this.horarios.splice(index, 1);
  }

  cancelar(): void {
    this.cerrar.emit(false);
  }

  guardar(): void {
    if (!this.fechaInicio) {
      this.errorMsj = 'Debes seleccionar la fecha de inicio de la jornada';
      return;
    }

    const dias = this.diasSemanaList.filter(d => d.selected).map(d => d.nombre);
    if (dias.length === 0) {
      this.errorMsj = 'Debes seleccionar al menos un día habilitado para jugar';
      return;
    }

    if (this.canchasSeleccionadas.length === 0) {
      this.errorMsj = 'Debes seleccionar al menos una cancha disponible';
      return;
    }

    if (this.horarios.length === 0) {
      this.errorMsj = 'Debes ingresar al menos un horario de partido';
      return;
    }

    this.loading = true;
    this.errorMsj = '';

    const payload = {
      jornada_id: this.jornada?.id,
      jornada_ids: this.jornada?.jornada_ids || (this.jornada?.id ? [this.jornada.id] : []),
      fecha_inicio: this.fechaInicio,
      dias_semana: dias,
      horarios: this.horarios,
      canchas_ids: this.canchasSeleccionadas,
      respetar_restricciones: this.respetarRestricciones,
      max_partidos_por_pareja: this.maxPartidosPorPareja
    };

    this.ligaService.programarJornadaSemanal(payload).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success) {
          Swal.fire({
            title: '¡Jornada Programada!',
            text: res.mensaje || 'Los partidos fueron agendados exitosamente.',
            icon: 'success',
            timer: 2500,
            showConfirmButton: false
          });
          this.cerrar.emit(true);
        } else {
          this.errorMsj = res.error || 'Error al programar la jornada';
        }
      },
      error: (err) => {
        this.loading = false;
        this.errorMsj = 'Error de servidor al programar la jornada';
        console.error(err);
      }
    });
  }
}
