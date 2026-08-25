import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LigaService } from '../../services/liga.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-generar-fixture-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-backdrop">
      <div class="modal-card animate-in">
        <div class="modal-header">
          <div class="header-title-box">
            <span class="header-icon">⚡</span>
            <div>
              <h3>Generar Fixture — {{ categoria?.nombre }}</h3>
              <span class="category-pill">Configuración Inicial de Competición</span>
            </div>
          </div>
          <button class="btn-close" (click)="cancelar()" aria-label="Cerrar">✕</button>
        </div>

        <div *ngIf="errorMsj" class="alert-error">{{ errorMsj }}</div>

        <!-- 1. Distribución de Grupos -->
        <div class="form-group">
          <label>🏆 Cantidad de Grupos en los que se dividirá la categoría</label>
          <select [(ngModel)]="numGrupos" class="custom-input">
            <option [ngValue]="1">1 Grupo Único (Todos contra todos)</option>
            <option [ngValue]="2">2 Grupos (Distribución Víbora / Snake)</option>
            <option [ngValue]="3">3 Grupos</option>
            <option [ngValue]="4">4 Grupos</option>
          </select>
          <small class="hint-text">Se organizarán las {{ categoria?.parejas_count || 0 }} parejas inscritas en el sistema Round-Robin.</small>
        </div>

        <div class="form-group">
          <label>🎖️ Cantidad de parejas que clasifican a la Fase Final (Playoffs)</label>
          <select [(ngModel)]="numClasificanModo" class="custom-input">
            <option value="todas">Todas las parejas inscritas</option>
            <option value="4">Primeras 4 parejas (Semifinales)</option>
            <option value="8">Primeras 8 parejas (Cuartos de final)</option>
            <option value="12">Primeras 12 parejas (Octavos con Bye)</option>
            <option value="16">Primeras 16 parejas (Octavos de final)</option>
            <option value="custom">Ingresar otra cantidad personalizada...</option>
          </select>

          <div *ngIf="numClasificanModo === 'custom'" style="margin-top: 10px;">
            <input 
              type="number" 
              min="2" 
              [(ngModel)]="numClasificanCant" 
              class="custom-input" 
              placeholder="Ej. Escribe 6, 10, 20..." 
            />
          </div>
          <small class="hint-text">Define cuántas parejas de la tabla de posiciones avanzarán al cuadro eliminatorio.</small>
        </div>

        <!-- Checkbox Auto-programar Semana 1 -->
        <div class="form-group checkbox-row border-top-sep">
          <label class="toggle-label main-toggle">
            <input type="checkbox" [(ngModel)]="programarSemana1" />
            <span>🗓️ Programar horarios de la Primera Semana de inmediato</span>
          </label>
        </div>

        <!-- Filtros de la Primera Semana -->
        <div class="semana-1-container" *ngIf="programarSemana1">
          <div class="form-group">
            <label>📅 Primer día de la Primera Semana *</label>
            <input type="date" [(ngModel)]="fechaInicio" class="custom-input" />
          </div>

          <!-- Días Habilitados -->
          <div class="form-group">
            <label>🗓️ Días habilitados para jugar</label>
            <div class="days-chips">
              <button 
                type="button" 
                *ngFor="let d of diasSemanaList" 
                class="chip-btn" 
                [class.active]="d.selected" 
                (click)="d.selected = !d.selected">
                {{ d.nombre }}
              </button>
            </div>
          </div>

          <!-- Canchas a Utilizar -->
          <div class="form-group">
            <label>🏟️ Canchas disponibles del club</label>
            <div class="canchas-chips">
              <button 
                type="button" 
                *ngFor="let c of canchas" 
                class="chip-btn" 
                [class.active]="isCanchaSelected(c.id)" 
                (click)="toggleCancha(c.id)">
                📍 {{ c.nombre }}
              </button>
            </div>
          </div>

          <!-- Horarios de Preferencia -->
          <div class="form-group">
            <label>⏰ Horarios de los partidos</label>
            <div class="time-chips-container">
              <span *ngFor="let h of horarios; let i = index" class="time-tag">
                {{ h }}
                <button type="button" (click)="eliminarHorario(i)" class="btn-remove-tag">✕</button>
              </span>
            </div>
            <div class="add-time-row">
              <input type="time" [(ngModel)]="nuevoHorario" class="custom-input time-input-short" />
              <button type="button" class="btn-add-time" (click)="agregarHorario()">+ Agregar Hora</button>
            </div>
          </div>

          <!-- Toggle Restricciones -->
          <div class="form-group checkbox-row">
            <label class="toggle-label">
              <input type="checkbox" [(ngModel)]="respetarRestricciones" />
              <span>🛡️ Respetar restricciones horarias de las parejas</span>
            </label>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-cancel" (click)="cancelar()" [disabled]="loading">Cancelar</button>
          <button class="btn-save" (click)="guardar()" [disabled]="loading">
            {{ loading ? 'Generando...' : '⚡ Generar Fixture' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      padding: 16px;
    }
    .modal-card {
      background: #ffffff;
      border-radius: 20px;
      padding: 24px;
      max-width: 560px;
      width: 100%;
      box-shadow: 0 20px 40px rgba(0,0,0,0.15);
      max-height: 90vh;
      overflow-y: auto;
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    .header-title-box {
      display: flex;
      align-items: center;
      gap: 12px;
      .header-icon { font-size: 1.8rem; }
      h3 { margin: 0; font-size: 1.15rem; font-weight: 800; color: #0f172a; }
      .category-pill { font-size: 0.75rem; font-weight: 700; color: #16a34a; background: #dcfce7; padding: 2px 8px; border-radius: 12px; }
    }
    .btn-close { background: none; border: none; font-size: 1.2rem; cursor: pointer; color: #64748b; }
    .alert-error { background: #fee2e2; color: #b91c1c; padding: 10px 14px; border-radius: 10px; font-weight: 700; margin-bottom: 16px; font-size: 0.85rem; }
    .form-group {
      margin-bottom: 18px;
      label { display: block; font-weight: 700; font-size: 0.85rem; color: #334155; margin-bottom: 6px; }
    }
    .hint-text { color: #64748b; font-size: 0.78rem; font-weight: 600; display: block; margin-top: 4px; }
    .custom-input {
      width: 100%;
      padding: 10px 14px;
      border-radius: 10px;
      border: 1px solid #cbd5e1;
      font-size: 0.9rem;
      font-weight: 600;
      box-sizing: border-box;
    }
    .border-top-sep {
      border-top: 1px dashed #e2e8f0;
      padding-top: 16px;
    }
    .main-toggle { font-weight: 800 !important; color: #0f172a !important; }
    .semana-1-container {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 16px;
      margin-bottom: 18px;
    }
    .days-chips, .canchas-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .chip-btn {
      padding: 6px 14px;
      border-radius: 12px;
      border: 1px solid #cbd5e1;
      background: #ffffff;
      font-weight: 700;
      font-size: 0.8rem;
      color: #475569;
      cursor: pointer;
      &.active {
        background: #0f172a;
        color: #a8ff00;
        border-color: #0f172a;
      }
    }
    .time-chips-container {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 10px;
    }
    .time-tag {
      background: #e0f2fe;
      color: #0369a1;
      font-weight: 800;
      padding: 4px 10px;
      border-radius: 8px;
      font-size: 0.85rem;
      display: flex;
      align-items: center;
      gap: 6px;
      .btn-remove-tag { background: none; border: none; color: #0369a1; cursor: pointer; font-weight: 900; font-size: 0.8rem; }
    }
    .add-time-row {
      display: flex;
      gap: 10px;
      .time-input-short { width: 140px; }
      .btn-add-time {
        background: #ffffff;
        border: 1px solid #cbd5e1;
        border-radius: 10px;
        padding: 8px 14px;
        font-weight: 700;
        cursor: pointer;
        &:hover { background: #e2e8f0; }
      }
    }
    .toggle-label {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      font-size: 0.85rem;
      font-weight: 600;
      color: #334155;
      input { width: 18px; height: 18px; cursor: pointer; }
    }
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 24px;
      border-top: 1px solid #e2e8f0;
      padding-top: 16px;
      .btn-cancel {
        background: #f1f5f9;
        border: 1px solid #cbd5e1;
        color: #475569;
        padding: 10px 20px;
        border-radius: 10px;
        font-weight: 700;
        cursor: pointer;
      }
      .btn-save {
        background: #0f172a;
        color: #a8ff00;
        border: none;
        padding: 10px 20px;
        border-radius: 10px;
        font-weight: 800;
        cursor: pointer;
        &:hover { background: #1e293b; }
      }
    }
  `]
})
export class GenerarFixtureModalComponent implements OnInit {
  @Input() categoria: any;
  @Input() canchas: any[] = [];
  @Output() cerrar = new EventEmitter<boolean>();

  numGrupos: number = 2;
  numClasificanModo: string = 'todas';
  numClasificanCant: number = 8;
  programarSemana1: boolean = true;
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

  loading: boolean = false;
  errorMsj: string = '';

  constructor(private ligaService: LigaService) {}

  ngOnInit(): void {
    const today = new Date();
    this.fechaInicio = today.toISOString().split('T')[0];
    if (this.canchas && this.canchas.length > 0) {
      this.canchasSeleccionadas = this.canchas.map(c => c.id);
    }
    // Si hay pocas parejas (ej <= 4), sugerir 1 grupo
    if (this.categoria && (this.categoria.parejas_count || 0) <= 6) {
      this.numGrupos = 1;
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
    if (!this.categoria || !this.categoria.id) {
      this.errorMsj = 'Categoría no válida';
      return;
    }

    if (this.programarSemana1) {
      if (!this.fechaInicio) {
        this.errorMsj = 'Debes seleccionar la fecha de inicio de la primera semana';
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
    }

    this.loading = true;
    this.errorMsj = '';

    // 1. Generar Fixture
    this.ligaService.generarFixture(this.categoria.id, this.numGrupos).subscribe({
      next: (res) => {
        if (res.success) {
          // Si el usuario quiere programar semana 1 de inmediato:
          if (this.programarSemana1) {
            // Cargar datos actualizados de la liga para obtener el ID de la Jornada 1
            this.ligaService.obtenerLiga(this.categoria.liga_id || this.categoria.id).subscribe({
              next: (resLiga) => {
                const catActualizada = resLiga?.liga?.categorias?.find((c: any) => c.id === this.categoria.id);
                const jornada1 = catActualizada?.jornadas?.find((j: any) => j.numero_jornada === 1) || catActualizada?.jornadas?.[0];

                if (jornada1 && jornada1.id) {
                  const payloadJ1 = {
                    jornada_id: jornada1.id,
                    fecha_inicio: this.fechaInicio,
                    dias_semana: this.diasSemanaList.filter(d => d.selected).map(d => d.nombre),
                    horarios: this.horarios,
                    canchas_ids: this.canchasSeleccionadas,
                    respetar_restricciones: this.respetarRestricciones
                  };

                  this.ligaService.programarJornadaSemanal(payloadJ1).subscribe({
                    next: () => {
                      this.loading = false;
                      Swal.fire({
                        title: '¡Fixture & Semana 1 Creados!',
                        text: 'El fixture y los horarios de la primera semana han sido generados exitosamente.',
                        icon: 'success',
                        timer: 2500,
                        showConfirmButton: false
                      });
                      this.cerrar.emit(true);
                    },
                    error: () => {
                      this.loading = false;
                      this.cerrar.emit(true);
                    }
                  });
                } else {
                  this.loading = false;
                  this.cerrar.emit(true);
                }
              },
              error: () => {
                this.loading = false;
                this.cerrar.emit(true);
              }
            });
          } else {
            this.loading = false;
            Swal.fire({
              title: '¡Fixture Generado!',
              text: 'Se han creado los grupos y partidos del fixture.',
              icon: 'success',
              timer: 2000,
              showConfirmButton: false
            });
            this.cerrar.emit(true);
          }
        } else {
          this.loading = false;
          this.errorMsj = res.error || 'Error al generar fixture';
        }
      },
      error: (err) => {
        this.loading = false;
        this.errorMsj = err.error?.error || 'Error de conexión al generar fixture';
        console.error(err);
      }
    });
  }
}
