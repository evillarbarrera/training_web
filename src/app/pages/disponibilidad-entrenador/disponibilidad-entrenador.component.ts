import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { EntrenamientoService } from '../../services/entrenamientos.service';
import { MysqlService } from '../../services/mysql.service';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { PopupService } from '../../services/popup.service';
import Swal from 'sweetalert2';

interface BloqueHorario {
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  seleccionado: boolean;
  ocupado: boolean; // Reserved by student
  lockedByOtherClub?: boolean;
  club_id?: number | null;
}

interface DiaSemana {
  nombre: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  duracion: number;
}

@Component({
  selector: 'app-disponibilidad-entrenador',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: './disponibilidad-entrenador.component.html',
  styleUrls: ['./disponibilidad-entrenador.component.scss']
})
export class DisponibilidadEntrenadorComponent implements OnInit {

  userId: number | null = null;
  coachNombre = 'Entrenador';
  coachFoto: string | null = null;
  isLoading = true;

  clubes: any[] = [];
  selectedClubId: number | null = null;
  dias: DiaSemana[] = [];
  diaSeleccionado: string = '';
  bloquesPorDia: { [fecha: string]: BloqueHorario[] } = {};
  
  // Months navigation (for 6 months horizon)
  mesesDisponibles: { label: string, month: number, year: number }[] = [];
  selectedMonthLabel: string = '';
  diasFiltrados: DiaSemana[] = [];

  // Cache of existing availability keys "YYYY-MM-DD HH:MM:00-YYYY-MM-DD HH:MM:00" -> club_id
  disponibilidadExistente: Map<string, number> = new Map();
  hasSlotsWithoutClub = false;
  viewMode: 'calendar' | 'template' = 'calendar';

  // Default Week Config
  showDefaultModal = false;
  diasSemana = [
    { id: 1, name: 'Lunes' },
    { id: 2, name: 'Martes' },
    { id: 3, name: 'Miércoles' },
    { id: 4, name: 'Jueves' },
    { id: 5, name: 'Viernes' },
    { id: 6, name: 'Sábado' },
    { id: 0, name: 'Domingo' }
  ];
  templateBlocks: { [dayId: number]: { time: string, selected: boolean }[] } = {};
  selectedDayTemplate: number = 1; // Default Lunes

  // Copy Day in Calendar State
  showCopyDayModal = false;
  copySourceFecha = '';
  copyTargetFechas: string[] = [];

  // Target month replication
  targetReplicationMonthLabel: string = '';

  // Interactive Tutorial State
  showTutorial = false;
  currentTutorialStep = 0;
  tutorialTop = '0px';
  tutorialLeft = '0px';
  tutorialSteps = [
    { target: '.club-selector-web', title: '🏢 Selección de Recinto', content: 'Primero elige dónde harás tus clases. Si tu club no aparece, dale al botón "+" para registrarlo rápido.' },
    { target: '.month-tabs', title: '📅 Mes de Trabajo', content: 'Elige el mes que deseas configurar. Puedes proyectar tu disponibilidad hasta con 6 meses de anticipación.' },
    { target: '.day-tabs', title: '📆 Selección de Día', content: 'Navega por los días del mes y selecciona el que vas a editar.' },
    { target: '.blocks-grid', title: '⚡ Bloques Horarios', content: 'Pulsa directamente sobre cada bloque para activarlo o desactivarlo. Los bloques con 🔒 ya están reservados.' },
    { target: '.btn-template', title: '⚙️ Semana Base (PRO)', content: '¡Ahorra tiempo! Configura aquí tu horario semanal típico y úsalo de plantilla.' },
    { target: '.default-modal', title: '📅 Tu Plantilla Semanal', content: 'Aquí defines tu horario "ideal" para cada día. El sistema lo usará para rellenar tus próximos 30 días automáticamente.' },
    { target: '.template-day-tabs', title: '📆 Días de la Semana', content: 'Cambia entre Lunes, Martes, etc. para configurar el horario base de cada día por separado.' },
    { target: '.btn-primary-neon', title: '💾 Guardar Plantilla', content: 'No olvides guardar tus ajustes de plantilla antes de aplicarlos a tu calendario real.' },
    { target: '.btn-apply', title: '🪄 Aplicar Plantilla', content: '¡El toque final! Una vez tengas tu plantilla, úsala aquí para configurar todo el mes en un solo clic.' }
  ];

  // 1. Click & Drag State
  isDragging: boolean = false;
  dragSelectMode: boolean = true;

  // 2. Selector de Rango Rápido
  rangeHoraInicio: string = '16:00';
  rangeHoraFin: string = '21:00';
  horasOpciones: string[] = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'];

  // 3. Duración de Bloques
  selectedSlotDuration: number = 60; // 60 or 90

  // 4. Bloqueo por Torneo / Vacaciones / Día Libre
  diasBloqueados: Set<string> = new Set();

  // 5. Vista de Calendario (Día vs Matriz Semanal)
  calendarViewType: 'day' | 'week' = 'day';

  @HostListener('window:resize')
  onResize() {
    if (this.showTutorial) this.updateTutorialPosition();
  }

  @HostListener('window:mouseup')
  onMouseUp() {
    this.isDragging = false;
  }

  constructor(
    private entrenamientoService: EntrenamientoService,
    private mysqlService: MysqlService,
    private router: Router,
    private popupService: PopupService
  ) { }

  ngOnInit(): void {
    this.userId = Number(localStorage.getItem('userId'));
    if (!this.userId) {
      this.router.navigate(['/login']);
      return;
    }

    this.loadProfile();
    this.cargarClubes();

    this.crearSemanaDesdeHoy();
    this.generarBloquesSemana();
    this.cargarDisponibilidadExistente();
  }

  loadProfile(): void {
    if (!this.userId) return;
    this.mysqlService.getPerfil(this.userId).subscribe({
      next: (res) => {
        if (res.success) {
          this.coachNombre = res.user.nombre || 'Entrenador';
          this.coachFoto = res.user.foto_perfil || res.user.link_foto || null;
        }
      },
      error: (err: any) => console.error(err)
    });
  }

  /* =============================
     INIT & GENERATION
  ============================== */

  crearSemanaDesdeHoy() {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const TOTAL_DIAS_ADELANTE = 210; // ~7 months horizon
    const nombresDias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const nombresMeses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    this.dias = [];
    this.mesesDisponibles = [];

    for (let i = 0; i < TOTAL_DIAS_ADELANTE; i++) {
        const fecha = new Date(hoy);
        fecha.setDate(hoy.getDate() + i);
        
        const mLabel = `${nombresMeses[fecha.getMonth()]} ${fecha.getFullYear()}`;
        
        // Add to mesesDisponibles ONLY if it's the current month or future
        if (!this.mesesDisponibles.some(m => m.label === mLabel)) {
            this.mesesDisponibles.push({ label: mLabel, month: fecha.getMonth(), year: fecha.getFullYear() });
        }

        this.dias.push({
            nombre: nombresDias[fecha.getDay()],
            fecha: this.getLocalISODate(fecha),
            hora_inicio: '07:00',
            hora_fin: '22:00',
            duracion: this.selectedSlotDuration
        });
    }

    if (this.mesesDisponibles.length > 0) {
        // First month available will be the current one starting from today
        this.selectedMonthLabel = this.mesesDisponibles[0].label;
        this.diaSeleccionado = this.getLocalISODate(hoy);
        this.filtrarDiasPorMes();
    }
}

filtrarDiasPorMes() {
    this.diasFiltrados = this.dias.filter(d => {
        const dObj = new Date(d.fecha + 'T00:00:00');
        const mLabel = `${['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][dObj.getMonth()]} ${dObj.getFullYear()}`;
        return mLabel === this.selectedMonthLabel;
    });

    if (this.diasFiltrados.length > 0) {
        // Only change selection if current isn't in filtered list
        if (!this.diasFiltrados.some(df => df.fecha === this.diaSeleccionado)) {
            this.diaSeleccionado = this.diasFiltrados[0].fecha;
        }
    }
}

onMonthChange() {
    this.filtrarDiasPorMes();
}

  getLocalISODate(date: Date): string {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  generarBloquesSemana() {
    this.bloquesPorDia = {};
    this.dias.forEach(dia => {
      this.bloquesPorDia[dia.fecha] = this.generarBloquesDia(
        dia.fecha,
        dia.hora_inicio,
        dia.hora_fin,
        dia.duracion
      );
    });
  }

  generarBloquesDia(fecha: string, horaInicio: string, horaFin: string, duracion: number): BloqueHorario[] {
    const bloques: BloqueHorario[] = [];
    let inicio = new Date(`${fecha}T${horaInicio}:00`);
    const fin = new Date(`${fecha}T${horaFin}:00`);

    while (inicio < fin) {
      const finBloque = new Date(inicio.getTime() + duracion * 60000);
      if (finBloque > fin) break;

      const key = `${fecha} ${this.formatTime(inicio)}-${fecha} ${this.formatTime(finBloque)}`;
      const savedClubId = this.disponibilidadExistente.get(key);
      const isThisClub = savedClubId === Number(this.selectedClubId);
      const isOtherClub = savedClubId && savedClubId !== Number(this.selectedClubId);

      bloques.push({
        fecha,
        hora_inicio: this.formatTime(inicio).slice(0, 5), // "HH:MM"
        hora_fin: this.formatTime(finBloque).slice(0, 5),
        seleccionado: isThisClub || false,
        ocupado: false,
        lockedByOtherClub: isOtherClub || false,
        club_id: savedClubId
      });

      inicio = finBloque;
    }
    return bloques;
  }

  /* =============================
     DATA LOADING
  ============================== */

  cargarClubes(): void {
    this.entrenamientoService.getClubes().subscribe({
      next: (res) => {
        this.clubes = res;
        if (res.length > 0 && !this.selectedClubId) {
          this.selectedClubId = res[0].id;
        }
      }
    });
  }

  get selectedClub() {
    return this.clubes.find(c => Number(c.id) === Number(this.selectedClubId));
  }

  get activeClubes() {
    const usedClubIds = new Set(this.disponibilidadExistente.values());
    if (this.selectedClubId) usedClubIds.add(Number(this.selectedClubId));
    return this.clubes.filter(c => usedClubIds.has(Number(c.id)));
  }

  selectClub(id: number) {
    this.selectedClubId = id;
    this.onClubChange();
  }

  setMode(mode: 'calendar' | 'template') {
    this.viewMode = mode;
    if (mode === 'template') {
      if (!this.templateBlocks || Object.keys(this.templateBlocks).length === 0) {
        this.openDefaultModal();
      }
    }
  }

  prevMonth() {
    const currentIndex = this.mesesDisponibles.findIndex(m => m.label === this.selectedMonthLabel);
    if (currentIndex > 0) {
      this.selectedMonthLabel = this.mesesDisponibles[currentIndex - 1].label;
      this.filtrarDiasPorMes();
    }
  }

  nextMonth() {
    const currentIndex = this.mesesDisponibles.findIndex(m => m.label === this.selectedMonthLabel);
    if (currentIndex < this.mesesDisponibles.length - 1) {
      this.selectedMonthLabel = this.mesesDisponibles[currentIndex + 1].label;
      this.filtrarDiasPorMes();
    }
  }

  isHoy(fecha: string): boolean {
    return fecha === this.getLocalISODate(new Date());
  }

  isFinDeSemana(fecha: string): boolean {
    const d = new Date(fecha + 'T00:00:00');
    const day = d.getDay();
    return day === 0 || day === 6;
  }

  irAHoy() {
    const hoy = new Date();
    const hoyIso = this.getLocalISODate(hoy);
    const nombresMeses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const mLabel = `${nombresMeses[hoy.getMonth()]} ${hoy.getFullYear()}`;
    
    const existeMes = this.mesesDisponibles.some(m => m.label === mLabel);
    if (existeMes) {
      this.selectedMonthLabel = mLabel;
      this.filtrarDiasPorMes();
    }
    this.diaSeleccionado = hoyIso;
  }

  get diaSeleccionadoObj(): DiaSemana | undefined {
    return this.dias.find(d => d.fecha === this.diaSeleccionado);
  }

  get copySourceDiaNombre(): string {
    const dia = this.dias.find(d => d.fecha === this.copySourceFecha);
    return dia ? dia.nombre : '';
  }

  get HorasActivasMes(): number {
    if (!this.diasFiltrados) return 0;
    let total = 0;
    this.diasFiltrados.forEach(d => {
      const bloques = this.bloquesPorDia[d.fecha];
      if (bloques) {
        total += bloques.filter(b => b.seleccionado).length;
      }
    });
    return total;
  }

  get ReservasMes(): number {
    if (!this.diasFiltrados) return 0;
    let total = 0;
    this.diasFiltrados.forEach(d => {
      const bloques = this.bloquesPorDia[d.fecha];
      if (bloques) {
        total += bloques.filter(b => b.ocupado).length;
      }
    });
    return total;
  }

  get diasConHorarioCount(): number {
    if (!this.diasFiltrados) return 0;
    return this.diasFiltrados.filter(d => {
      const bloques = this.bloquesPorDia[d.fecha];
      return bloques && bloques.some(b => b.seleccionado);
    }).length;
  }

  getHorasActivasDia(fecha: string): number {
    const bloques = this.bloquesPorDia[fecha];
    if (!bloques) return 0;
    return bloques.filter(b => b.seleccionado).length;
  }

  tieneReservasDia(fecha: string): boolean {
    const bloques = this.bloquesPorDia[fecha];
    if (!bloques) return false;
    return bloques.some(b => b.ocupado);
  }

  getHorasTemplateDia(dayId: number): number {
    const blocks = this.templateBlocks[dayId];
    if (!blocks) return 0;
    return blocks.filter(b => b.selected).length;
  }

  get cambiosPendientesCount(): number {
    if (!this.selectedClubId) return 0;
    let count = 0;
    Object.values(this.bloquesPorDia).forEach(bloques => {
      bloques.forEach(b => {
        const key = `${b.fecha} ${b.hora_inicio}:00-${b.fecha} ${b.hora_fin}:00`;
        const existiaId = this.disponibilidadExistente.get(key);
        const existia = existiaId === Number(this.selectedClubId);
        if (b.seleccionado !== existia) {
          count++;
        }
      });
    });
    return count;
  }

  descartarCambios() {
    this.popupService.confirm('Descartar Cambios', '¿Deseas revertir los cambios no guardados a su estado original?')
      .then(conf => {
        if (conf) {
          this.generarBloquesSemana();
          this.cargarReservasExistentes();
        }
      });
  }

  onClubChange(): void {
    if (this.selectedClubId) {
      this.selectedClubId = Number(this.selectedClubId);
    }
    this.cargarDisponibilidadExistente();
  }

  cargarDisponibilidadExistente() {
    this.isLoading = true;
    if (!this.userId) return;
    this.hasSlotsWithoutClub = false;
    this.disponibilidadExistente.clear();

    this.entrenamientoService.getDisponibilidad(this.userId).subscribe({
      next: (data: any[]) => {
        data.forEach(d => {
          const key = `${d.fecha_inicio}-${d.fecha_fin}`;
          this.disponibilidadExistente.set(key, Number(d.club_id));

          if (!d.club_id || d.club_id === 0) {
            this.hasSlotsWithoutClub = true;
          }
        });

        // Re-generate to apply selection state
        this.generarBloquesSemana();

        // Load reservations to mark occupied blocks
        this.cargarReservasExistentes();
      },
      error: (err: any) => {
        console.error('Error loading disponibilidad:', err);
        this.isLoading = false;
      }
    });
  }

  cargarReservasExistentes() {
    if (!this.userId) return;

    this.entrenamientoService.getReservasEntrenador(this.userId).subscribe({
      next: (data: any) => {
        const reservas = [
          ...(data.reservas_tradicionales || []),
          ...(data.packs_grupales || [])
        ];

        // Mark blocks as occupied if they match a reservation time
        Object.keys(this.bloquesPorDia).forEach(fecha => {
          this.bloquesPorDia[fecha].forEach(bloque => {
            const tieneReserva = reservas.some(reserva => {
              if (!reserva.fecha || !reserva.hora_inicio) return false;

              const fechaReserva = reserva.fecha;
              const horaReserva = String(reserva.hora_inicio).slice(0, 5); // "HH:MM"

              // Only block if confirmed or active (not cancelled)
              const status = reserva.estado || reserva.estado_grupo;
              if (status === 'cancelado') return false;

              return fechaReserva === fecha && horaReserva === bloque.hora_inicio;
            });

            if (tieneReserva) {
              bloque.ocupado = true;
            }
          });
        });

        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Error loading reservations:', err);
        this.isLoading = false;
      }
    });
  }

  /* =============================
     INTERACTION
  ============================== */

  toggleBloque(b: BloqueHorario) {
    if (b.ocupado || b.lockedByOtherClub) return;
    b.seleccionado = !b.seleccionado;
  }

  seleccionarTodos() {
    const bloques = this.bloquesPorDia[this.diaSeleccionado];
    if (bloques) {
      bloques.forEach(b => {
        if (!b.ocupado && !b.lockedByOtherClub) b.seleccionado = true;
      });
    }
  }

  deseleccionarTodos() {
    const bloques = this.bloquesPorDia[this.diaSeleccionado];
    if (bloques) {
      bloques.forEach(b => {
        if (!b.ocupado && !b.lockedByOtherClub) b.seleccionado = false;
      });
    }
  }

  get todosSeleccionados(): boolean {
    const bloques = this.bloquesPorDia[this.diaSeleccionado];
    if (!bloques) return false;
    return bloques.every(b => b.seleccionado || b.ocupado || b.lockedByOtherClub);
  }

  seleccionarDia(fecha: string) {
    this.diaSeleccionado = fecha;
  }

  get bloquesActuales() {
    return this.bloquesPorDia[this.diaSeleccionado] || [];
  }

  /* =============================
     CLICK & DRAG (EFECTO PINCEL)
  ============================== */
  onBlockMouseDown(bloque: BloqueHorario, event: MouseEvent) {
    if (bloque.ocupado || bloque.lockedByOtherClub) return;
    event.preventDefault();
    this.isDragging = true;
    this.dragSelectMode = !bloque.seleccionado;
    bloque.seleccionado = this.dragSelectMode;
  }

  onBlockMouseEnter(bloque: BloqueHorario) {
    if (this.isDragging && !bloque.ocupado && !bloque.lockedByOtherClub) {
      bloque.seleccionado = this.dragSelectMode;
    }
  }

  /* =============================
     SELECTOR DE RANGO ("DE X A Y")
  ============================== */
  aplicarRangoHoras(fecha: string) {
    const bloques = this.bloquesPorDia[fecha];
    if (!bloques) return;
    if (this.rangeHoraInicio >= this.rangeHoraFin) {
      this.popupService.error('Rango Inválido', 'La hora de inicio debe ser anterior a la hora de fin.');
      return;
    }
    let marcados = 0;
    bloques.forEach(b => {
      if (!b.ocupado && !b.lockedByOtherClub) {
        if (b.hora_inicio >= this.rangeHoraInicio && b.hora_fin <= this.rangeHoraFin) {
          b.seleccionado = true;
          marcados++;
        }
      }
    });
    this.popupService.success('Rango Aplicado', `Se habilitaron ${marcados} horas para el ${fecha}`);
  }

  aplicarRangoATodoElMes() {
    if (this.rangeHoraInicio >= this.rangeHoraFin) {
      this.popupService.error('Rango Inválido', 'La hora de inicio debe ser anterior a la hora de fin.');
      return;
    }
    this.popupService.confirm('Aplicar Rango al Mes', `¿Deseas habilitar el rango ${this.rangeHoraInicio} - ${this.rangeHoraFin} en todos los días de ${this.selectedMonthLabel}?`)
      .then(conf => {
        if (conf) {
          this.diasFiltrados.forEach(d => {
            const bloques = this.bloquesPorDia[d.fecha];
            if (bloques) {
              bloques.forEach(b => {
                if (!b.ocupado && !b.lockedByOtherClub) {
                  if (b.hora_inicio >= this.rangeHoraInicio && b.hora_fin <= this.rangeHoraFin) {
                    b.seleccionado = true;
                  }
                }
              });
            }
          });
          this.popupService.success('Rango Aplicado', `Rango aplicado a todo el mes de ${this.selectedMonthLabel}`);
        }
      });
  }

  /* =============================
     REPLICADOR DE SEMANA COMPLETA
  ============================== */
  get diasSemanaActiva(): DiaSemana[] {
    if (!this.diaSeleccionado) return [];
    const selDate = new Date(this.diaSeleccionado + 'T00:00:00');
    const dayOfWeek = selDate.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    
    const monday = new Date(selDate);
    monday.setDate(selDate.getDate() + diffToMonday);

    const weekDays: DiaSemana[] = [];
    const nombresDias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const iso = this.getLocalISODate(d);
      const found = this.dias.find(item => item.fecha === iso);
      if (found) {
        weekDays.push(found);
      } else {
        weekDays.push({
          nombre: nombresDias[d.getDay()],
          fecha: iso,
          hora_inicio: '07:00',
          hora_fin: '22:00',
          duracion: this.selectedSlotDuration
        });
      }
    }
    return weekDays;
  }

  replicarSemanaATodoElMes() {
    const semanaBase = this.diasSemanaActiva;
    if (semanaBase.length === 0) return;

    const patternMap = new Map<number, Map<string, boolean>>();
    semanaBase.forEach(d => {
      const dObj = new Date(d.fecha + 'T00:00:00');
      const dayOfWeek = dObj.getDay();
      const bloques = this.bloquesPorDia[d.fecha] || [];
      const slots = new Map<string, boolean>();
      bloques.forEach(b => slots.set(b.hora_inicio, b.seleccionado));
      patternMap.set(dayOfWeek, slots);
    });

    const targetDays = this.diasFiltrados.filter(d => !semanaBase.some(sb => sb.fecha === d.fecha));

    if (targetDays.length === 0) {
      this.popupService.info('Sin semanas adicionales', 'No hay otras semanas en este mes para replicar.');
      return;
    }

    this.popupService.confirm(
      'Replicar Semana Completa',
      `¿Deseas clonar los horarios de esta semana a las ${targetDays.length} fechas restantes de ${this.selectedMonthLabel}?`
    ).then(conf => {
      if (conf) {
        targetDays.forEach(td => {
          const tdObj = new Date(td.fecha + 'T00:00:00');
          const dayOfWeek = tdObj.getDay();
          const sourceSlots = patternMap.get(dayOfWeek);
          const bloquesDestino = this.bloquesPorDia[td.fecha];

          if (sourceSlots && bloquesDestino) {
            bloquesDestino.forEach(b => {
              if (!b.ocupado && !b.lockedByOtherClub) {
                const sel = sourceSlots.get(b.hora_inicio);
                if (sel !== undefined) {
                  b.seleccionado = sel;
                }
              }
            });
          }
        });
        this.popupService.success('¡Semana Replicada!', `Se actualizaron ${targetDays.length} días de ${this.selectedMonthLabel}.`);
      }
    });
  }

  /* =============================
     DURACIÓN DE BLOQUES (60m vs 90m)
  ============================== */
  cambiarDuracionBloque(nuevaDuracion: number) {
    if (this.selectedSlotDuration === nuevaDuracion) return;
    this.selectedSlotDuration = nuevaDuracion;
    this.dias.forEach(d => d.duracion = nuevaDuracion);
    this.generarBloquesSemana();
    this.cargarReservasExistentes();
    this.popupService.info('Formato de Clase', `Grilla ajustada a bloques de ${nuevaDuracion} minutos.`);
  }

  /* =============================
     BLOQUEO POR TORNEO / DÍA LIBRE
  ============================== */
  bloquearDiaPorTorneo(fecha: string) {
    this.popupService.confirm('Bloquear Día', '¿Marcar este día como no laborable por Torneo o Día Libre? Se cerrarán las horas libres sin alterar reservas de alumnos.')
      .then(conf => {
        if (conf) {
          const bloques = this.bloquesPorDia[fecha];
          if (bloques) {
            bloques.forEach(b => {
              if (!b.ocupado && !b.lockedByOtherClub) {
                b.seleccionado = false;
              }
            });
          }
          this.diasBloqueados.add(fecha);
          this.popupService.success('Día Bloqueado', 'Día marcado como fuera de servicio por Torneo / Libre.');
        }
      });
  }

  desbloquearDia(fecha: string) {
    this.diasBloqueados.delete(fecha);
    this.popupService.info('Día Desbloqueado', 'Ahora puedes configurar horarios para este día.');
  }

  isDiaBloqueado(fecha: string): boolean {
    return this.diasBloqueados.has(fecha);
  }

  /* =============================
     MATRIZ SEMANAL (7 COLUMNAS)
  ============================== */
  setCalendarViewType(type: 'day' | 'week') {
    this.calendarViewType = type;
  }

  prevSemana() {
    if (!this.diaSeleccionado) return;
    const d = new Date(this.diaSeleccionado + 'T00:00:00');
    d.setDate(d.getDate() - 7);
    this.diaSeleccionado = this.getLocalISODate(d);
  }

  nextSemana() {
    if (!this.diaSeleccionado) return;
    const d = new Date(this.diaSeleccionado + 'T00:00:00');
    d.setDate(d.getDate() + 7);
    this.diaSeleccionado = this.getLocalISODate(d);
  }

  get horasMatriz(): string[] {
    const primerDia = this.diaSeleccionado || (this.diasFiltrados[0]?.fecha);
    const bloques = this.bloquesPorDia[primerDia] || [];
    return bloques.map(b => b.hora_inicio);
  }

  getBloqueEnMatriz(fecha: string, hora: string): BloqueHorario | undefined {
    const bloques = this.bloquesPorDia[fecha];
    if (!bloques) return undefined;
    return bloques.find(b => b.hora_inicio === hora);
  }

  /* --- ACCIONES RÁPIDAS DE TURNOS PARA DÍA ACTIVO --- */
  aplicarTurnoManana(fecha: string) {
    const bloques = this.bloquesPorDia[fecha];
    if (!bloques) return;
    bloques.forEach(b => {
      if (!b.ocupado && !b.lockedByOtherClub) {
        const hour = parseInt(b.hora_inicio.split(':')[0], 10);
        b.seleccionado = (hour >= 8 && hour < 13);
      }
    });
  }

  aplicarTurnoTarde(fecha: string) {
    const bloques = this.bloquesPorDia[fecha];
    if (!bloques) return;
    bloques.forEach(b => {
      if (!b.ocupado && !b.lockedByOtherClub) {
        const hour = parseInt(b.hora_inicio.split(':')[0], 10);
        b.seleccionado = (hour >= 16 && hour < 21);
      }
    });
  }

  aplicarDiaCompleto(fecha: string) {
    const bloques = this.bloquesPorDia[fecha];
    if (!bloques) return;
    bloques.forEach(b => {
      if (!b.ocupado && !b.lockedByOtherClub) {
        const hour = parseInt(b.hora_inicio.split(':')[0], 10);
        b.seleccionado = (hour >= 8 && hour < 21);
      }
    });
  }

  limpiarDia(fecha: string) {
    const bloques = this.bloquesPorDia[fecha];
    if (!bloques) return;
    bloques.forEach(b => {
      if (!b.ocupado && !b.lockedByOtherClub) {
        b.seleccionado = false;
      }
    });
  }

  /* --- MODAL Y COPIA DE DÍA A OTRAS FECHAS --- */
  abrirCopiarDiaModal(fecha: string) {
    this.copySourceFecha = fecha;
    this.copyTargetFechas = [];
    this.showCopyDayModal = true;
  }

  toggleCopyTargetFecha(fecha: string) {
    const idx = this.copyTargetFechas.indexOf(fecha);
    if (idx > -1) {
      this.copyTargetFechas.splice(idx, 1);
    } else {
      this.copyTargetFechas.push(fecha);
    }
  }

  seleccionarTodosTargetFechas() {
    this.copyTargetFechas = this.diasFiltrados
      .map(d => d.fecha)
      .filter(f => f !== this.copySourceFecha);
  }

  deseleccionarTodosTargetFechas() {
    this.copyTargetFechas = [];
  }

  seleccionarMismoDiaSemana() {
    if (!this.copySourceFecha) return;
    const dObj = new Date(this.copySourceFecha + 'T00:00:00');
    const dayOfWeek = dObj.getDay();

    this.copyTargetFechas = this.diasFiltrados
      .filter(d => {
        if (d.fecha === this.copySourceFecha) return false;
        const targetObj = new Date(d.fecha + 'T00:00:00');
        return targetObj.getDay() === dayOfWeek;
      })
      .map(d => d.fecha);
  }

  seleccionarDiasLaborales() {
    this.copyTargetFechas = this.diasFiltrados
      .filter(d => {
        if (d.fecha === this.copySourceFecha) return false;
        const targetObj = new Date(d.fecha + 'T00:00:00');
        const day = targetObj.getDay();
        return day >= 1 && day <= 5;
      })
      .map(d => d.fecha);
  }

  seleccionarFinesDeSemana() {
    this.copyTargetFechas = this.diasFiltrados
      .filter(d => {
        if (d.fecha === this.copySourceFecha) return false;
        const targetObj = new Date(d.fecha + 'T00:00:00');
        const day = targetObj.getDay();
        return day === 0 || day === 6;
      })
      .map(d => d.fecha);
  }

  ejecutarCopiarDia() {
    if (!this.copySourceFecha || this.copyTargetFechas.length === 0) {
      this.popupService.error('Recinto o Día no seleccionado', 'Selecciona al menos un día de destino.');
      return;
    }

    const sourceBloques = this.bloquesPorDia[this.copySourceFecha];
    if (!sourceBloques) return;

    const sourceMap = new Map<string, boolean>();
    sourceBloques.forEach(b => {
      sourceMap.set(b.hora_inicio, b.seleccionado);
    });

    this.copyTargetFechas.forEach(targetFecha => {
      const targetBloques = this.bloquesPorDia[targetFecha];
      if (targetBloques) {
        targetBloques.forEach(tb => {
          if (!tb.ocupado && !tb.lockedByOtherClub) {
            const isSel = sourceMap.get(tb.hora_inicio);
            if (isSel !== undefined) {
              tb.seleccionado = isSel;
            }
          }
        });
      }
    });

    this.popupService.success('Horario Copiado', `Configuración copiada a ${this.copyTargetFechas.length} días.`);
    this.showCopyDayModal = false;
  }

  isDiaCompleto(fecha: string): boolean {
    const bloques = this.bloquesPorDia[fecha];
    if (!bloques || bloques.length === 0) return false;
    return bloques.every(b => b.seleccionado || b.ocupado || b.lockedByOtherClub);
  }

  /* =============================
     SAVING
  ============================== */

  guardarDisponibilidad() {
    if (!this.selectedClubId) {
      this.popupService.error('Recinto Obligatorio', 'Debes seleccionar un club/recinto antes de guardar tu disponibilidad.');
      return;
    }

    const crear: any[] = [];
    const eliminar: any[] = [];

    // Analyze all days
    Object.values(this.bloquesPorDia).forEach(bloques => {
      bloques.forEach(b => {
        const key = `${b.fecha} ${b.hora_inicio}:00-${b.fecha} ${b.hora_fin}:00`;
        const existiaId = this.disponibilidadExistente.get(key);
        const existia = existiaId === Number(this.selectedClubId);

        if (b.seleccionado && !existia) {
          crear.push({
            profesor_id: this.userId,
            fecha_inicio: `${b.fecha} ${b.hora_inicio}:00`,
            fecha_fin: `${b.fecha} ${b.hora_fin}:00`,
            club_id: this.selectedClubId
          });
        }

        if (!b.seleccionado && existia) {
          eliminar.push({
            profesor_id: this.userId,
            fecha_inicio: `${b.fecha} ${b.hora_inicio}:00`,
            fecha_fin: `${b.fecha} ${b.hora_fin}:00`,
            club_id: this.selectedClubId
          });
        }
      });
    });

    if (crear.length === 0 && eliminar.length === 0) {
      this.popupService.info('Sin cambios', 'No hay cambios para guardar.');
      return;
    }

    this.isLoading = true;
    this.entrenamientoService.syncDisponibilidad({ crear, eliminar }).subscribe({
      next: () => {
        this.popupService.success('Guardado', 'Horario actualizado correctamente');

        // Refresh local state
        this.hasSlotsWithoutClub = false;
        this.disponibilidadExistente.clear();
        this.dias = []; // Reset days to regenerate everything cleanly
        this.crearSemanaDesdeHoy();
        this.cargarDisponibilidadExistente(); // Reload fresh from DB
      },
      error: (err: any) => {
        console.error('Error syncing disponibilidad:', err);
        this.popupService.error('Error', 'No se pudieron guardar los cambios');
        this.isLoading = false;
      }
    });
  }

  migrateSlots() {
    if (!this.selectedClubId) {
      this.popupService.error('Error', 'Selecciona un club para vincular');
      return;
    }
    this.popupService.confirm('Vincular Horarios', 'Tienes horarios guardados que no están asociados a ningún club. ¿Deseas vincularlos todos al club seleccionado actualmente?')
      .then(conf => {
        if (conf) {
          this.isLoading = true;
          this.entrenamientoService.migrateAvailability(this.userId!, this.selectedClubId!).subscribe({
            next: (res: any) => {
              this.popupService.success('Éxito', res.message || 'Horarios vinculados correctamente');
              this.cargarDisponibilidadExistente();
            },
            error: () => {
              this.isLoading = false;
              this.popupService.error('Error', 'No se pudieron vincular los horarios');
            }
          });
        }
      });
  }

  /* =============================
     DEFAULT WEEK CONFIG
  ============================== */

  openDefaultModal() {
    this.isLoading = true;
    this.initTemplateBlocks();
    this.entrenamientoService.getDefaultConfig(this.userId!).subscribe({
      next: (res) => {
        // Expand ranges to blocks
        res.forEach(range => {
          const dayId = range.dia_semana;
          const start = range.hora_inicio;
          const end = range.hora_fin;
          const clubId = range.club_id;

          if (this.templateBlocks[dayId] && (clubId == this.selectedClubId)) {
            this.templateBlocks[dayId].forEach(b => {
              if (b.time >= start && b.time < end) {
                b.selected = true;
              }
            });
          }
        });
        this.showDefaultModal = true;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.popupService.error('Error', 'No se pudo cargar la configuración');
      }
    });
  }

  initTemplateBlocks() {
    this.templateBlocks = {};
    const horas: string[] = [];
    for (let h = 7; h < 22; h++) {
      const hh = h < 10 ? '0' + h : h;
      horas.push(`${hh}:00`);
      // Si quieres bloques de 30 min, podrías añadir `${hh}:30` aquí
    }

    this.diasSemana.forEach(d => {
      this.templateBlocks[d.id] = horas.map(h => ({ time: h, selected: false }));
    });
  }

  toggleTemplateBlock(dayId: number, block: any) {
    block.selected = !block.selected;
  }

  seleccionarTodoDiaTemplate(dayId: number) {
    this.templateBlocks[dayId].forEach(b => b.selected = true);
  }

  deseleccionarTodoDiaTemplate(dayId: number) {
    this.templateBlocks[dayId].forEach(b => b.selected = false);
  }

  aplicarTurnoMananaTemplate(dayId: number) {
    if (!this.templateBlocks[dayId]) return;
    this.templateBlocks[dayId].forEach(b => {
      const hour = parseInt(b.time.split(':')[0], 10);
      b.selected = (hour >= 8 && hour < 13);
    });
  }

  aplicarTurnoTardeTemplate(dayId: number) {
    if (!this.templateBlocks[dayId]) return;
    this.templateBlocks[dayId].forEach(b => {
      const hour = parseInt(b.time.split(':')[0], 10);
      b.selected = (hour >= 16 && hour < 21);
    });
  }

  aplicarDiaCompletoTemplate(dayId: number) {
    if (!this.templateBlocks[dayId]) return;
    this.templateBlocks[dayId].forEach(b => {
      const hour = parseInt(b.time.split(':')[0], 10);
      b.selected = (hour >= 8 && hour < 21);
    });
  }

  copiarTemplateAOtrosDias(sourceDayId: number) {
    if (!this.templateBlocks[sourceDayId]) return;
    const sourceBlocks = this.templateBlocks[sourceDayId];
    this.diasSemana.forEach(d => {
      if (d.id !== sourceDayId) {
        this.templateBlocks[d.id] = sourceBlocks.map(b => ({ ...b }));
      }
    });
    this.popupService.success('Plantilla Duplicada', `Se copió la configuración del día seleccionado a toda la semana.`);
  }

  async saveDefaultConfig() {
    if (!this.selectedClubId) {
      this.popupService.error('Recinto Obligatorio', 'Debes seleccionar un club/recinto para tu plantilla.');
      return;
    }

    this.isLoading = true;
    const config: any[] = [];

    // Compress selected blocks back to ranges
    Object.keys(this.templateBlocks).forEach(dayKey => {
      const dayId = parseInt(dayKey);
      const blocks = this.templateBlocks[dayId];

      let currentRange: any = null;

      blocks.forEach((b, idx) => {
        if (b.selected) {
          if (!currentRange) {
            currentRange = {
              dia_semana: dayId,
              club_id: this.selectedClubId,
              hora_inicio: b.time,
              duracion_bloque: 60
            };
          }
        } else {
          if (currentRange) {
            currentRange.hora_fin = b.time;
            config.push(currentRange);
            currentRange = null;
          }
        }

        // Si es el último bloque y está seleccionado
        if (idx === blocks.length - 1 && currentRange) {
          // Asumimos fin a la hora siguiente del último bloque
          const lastH = parseInt(b.time.split(':')[0]);
          currentRange.hora_fin = (lastH + 1 < 10 ? '0' : '') + (lastH + 1) + ':00';
          config.push(currentRange);
        }
      });
    });

    const payload = {
      entrenador_id: this.userId,
      club_id: this.selectedClubId, // Added for backend deletion safety
      config: config
    };

    this.entrenamientoService.saveDefaultConfig(payload).subscribe({
      next: () => {
        this.popupService.success('Éxito', 'Plantilla semanal guardada');
        this.showDefaultModal = false;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.popupService.error('Error', 'No se pudo guardar la configuración');
      }
    });
  }

  applyDefaultConfig() {
    this.isLoading = true;
    // Primero verificamos si hay algo configurado
    this.entrenamientoService.getDefaultConfig(this.userId!).subscribe({
      next: (res) => {
        if (res.length === 0) {
          this.isLoading = false;
          this.popupService.info('Sin Plantilla', 'Primero debes configurar y guardar tu semana por defecto.');
          return;
        }

        const selectedMonthObj = this.mesesDisponibles.find(m => m.label === this.selectedMonthLabel);
        const hoy = new Date();
        let dateStart = this.getLocalISODate(hoy);
        let daysAhead = 30;
        let msg = `Esto generará automáticamente tus bloques de disponibilidad para los próximos 30 días. ¿Continuar?`;

        if (selectedMonthObj) {
            // First day of selected month
            let startOfSelected = new Date(selectedMonthObj.year, selectedMonthObj.month, 1);
            
            // If it's the current month, start from today
            if (selectedMonthObj.month === hoy.getMonth() && selectedMonthObj.year === hoy.getFullYear()) {
                dateStart = this.getLocalISODate(hoy);
                const lastDay = new Date(selectedMonthObj.year, selectedMonthObj.month + 1, 0).getDate();
                daysAhead = lastDay - hoy.getDate() + 1;
                msg = `Aplicaremos tu plantilla para los días restantes de ${this.selectedMonthLabel}. ¿Continuar?`;
            } else {
                dateStart = this.getLocalISODate(startOfSelected);
                const lastDay = new Date(selectedMonthObj.year, selectedMonthObj.month + 1, 0).getDate();
                daysAhead = lastDay;
                msg = `¿Deseas aplicar tu plantilla base a TODO el mes de ${this.selectedMonthLabel} (${daysAhead} días)?`;
            }
        }

        this.popupService.confirm('Aplicar Plantilla', msg)
          .then(conf => {
            if (conf) {
              this.entrenamientoService.applyDefaultConfig({ 
                entrenador_id: this.userId, 
                days_ahead: daysAhead, 
                date_start: dateStart 
              }).subscribe({
                next: () => {
                  this.popupService.success('Completado', `Horarios aplicados para ${this.selectedMonthLabel}.`);
                  this.disponibilidadExistente.clear();
                  this.cargarDisponibilidadExistente();
                },
                error: (err) => {
                  this.isLoading = false;
                  this.popupService.error('Error', 'No se pudo aplicar la plantilla');
                }
              });
            } else {
              this.isLoading = false;
            }
          });
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  /* =============================
     HELPERS
  ============================== */

  abrirModalNuevoClub() {
    Swal.fire({
      title: 'Registrar nuevo Recinto',
      html: `
        <div class="swal-form" style="display: flex; flex-direction: column; gap: 10px; text-align: left;">
          <div>
            <label style="font-size: 12px; color: #666;">Nombre del Club</label>
            <input id="swal-nombre" class="swal2-input" placeholder="Nombre" style="margin: 5px 0; width: 100%;">
          </div>
          <div>
            <label style="font-size: 12px; color: #666;">Comuna</label>
            <input id="swal-comuna" class="swal2-input" placeholder="Comuna" style="margin: 5px 0; width: 100%;">
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Crear y Seleccionar',
      confirmButtonColor: '#ccff00',
      customClass: {
        confirmButton: 'swal-btn-confirm'
      },
      preConfirm: () => {
        const nombre = (document.getElementById('swal-nombre') as HTMLInputElement).value;
        const comuna = (document.getElementById('swal-comuna') as HTMLInputElement).value;
        if (!nombre) return Swal.showValidationMessage('El nombre es obligatorio');
        return { nombre, comuna };
      }
    }).then((result) => {
      if (result.isConfirmed) {
        this.isLoading = true;
        const clubData = {
          nombre: result.value.nombre,
          comuna: result.value.comuna,
          admin_id: this.userId,
          rol: 'entrenador' // IMPORTANTE: El entrenador crea el club pero mantiene su rol
        };

        this.mysqlService.postApi('clubes/add_club.php', clubData).subscribe({
          next: (res: any) => {
            if (res.success) {
              this.popupService.success('¡Éxito!', 'Club creado y vinculado a tu perfil de entrenador.');
              this.selectedClubId = res.id;
              this.cargarClubes(); // Recargar lista
            } else {
              this.isLoading = false;
              this.popupService.error('Error', res.error || 'No se pudo crear el club');
            }
          },
          error: (err) => {
            this.isLoading = false;
            this.popupService.error('Error', 'Error de conexión');
            console.error(err);
          }
        });
      }
    });
  }

  private formatTime(date: Date): string {
    return date.toTimeString().slice(0, 8); // "HH:MM:SS"
  }

  // --- TUTORIAL METHODS ---
  startTutorial() {
    this.showTutorial = true;
    this.currentTutorialStep = 0;
    setTimeout(() => this.updateTutorialPosition(), 50);
  }

  closeTutorial() {
    this.showTutorial = false;
    localStorage.setItem('tutorial_disponibilidad_done', 'true');
  }

  nextTutorialStep() {
    if (this.currentTutorialStep < this.tutorialSteps.length - 1) {
      this.currentTutorialStep++;
      
      // Step logic: Open Modal
      if (this.currentTutorialStep === 5) {
        this.openDefaultModal();
      }
      // Step logic: Close Modal when moving past template steps
      if (this.currentTutorialStep === 8) {
        this.showDefaultModal = false;
      }
      
      const waitTime = (this.currentTutorialStep === 5) ? 400 : 100;
      setTimeout(() => this.updateTutorialPosition(), waitTime);
    } else {
      this.closeTutorial();
    }
  }

  updateTutorialPosition() {
    const step = this.tutorialSteps[this.currentTutorialStep];
    const el = document.querySelector(step.target);
    if (el) {
      const rect = el.getBoundingClientRect();
      const cardHeight = 220;
      const cardWidth = 340;
      
      let top = rect.bottom + 20;
      let left = rect.left + (rect.width / 2) - (cardWidth / 2);

      // Adjust if it goes off screen
      if (top + cardHeight > window.innerHeight) top = rect.top - cardHeight - 20;
      if (left + cardWidth > window.innerWidth) left = window.innerWidth - cardWidth - 20;
      if (left < 0) left = 20;

      this.tutorialTop = `${top + window.scrollY}px`;
      this.tutorialLeft = `${left + window.scrollX}px`;
      
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('tutorial-highlight');
      setTimeout(() => el.classList.remove('tutorial-highlight'), 3000);
    } else {
      // Self-healing: skip step if element not found
      if (this.currentTutorialStep < this.tutorialSteps.length - 1) {
        this.nextTutorialStep();
      }
    }
  }
}
