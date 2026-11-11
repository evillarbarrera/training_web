import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MysqlService } from '../../services/mysql.service';
import { AlumnoService } from '../../services/alumno.service';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { PopupService } from '../../services/popup.service';

@Component({
  selector: 'app-jugador-calendario',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: './jugador-calendario.component.html',
  styleUrls: ['./jugador-calendario.component.scss']
})
export class JugadorCalendarioComponent implements OnInit {
  // View State
  vistaActual: 'activas' | 'historial' = 'activas';
  tipoFiltro: 'todos' | 'clases' | 'canchas' | 'grupales' = 'todos';
  isLoading = true;
  userId: number | null = null;

  // Pagination
  itemsPerPage = 10;
  currentPage = 1;

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.calcularItemsPerPage();
  }

  private calcularItemsPerPage() {
    if (window.innerWidth >= 992) {
      this.itemsPerPage = 12;
      return;
    }
    if (window.innerWidth >= 768) {
      this.itemsPerPage = 8;
      return;
    }
    this.itemsPerPage = 6;
  }

  // User Data
  jugadorNombre: string = 'Jugador';
  jugadorFoto: string | null = null;

  // Data
  reservasFuturas: any[] = [];
  reservasPasadas: any[] = [];

  // Modal Invitation
  showModalInvitacion = false;
  selectedReserva: any = null;
  emailInvitado: string = '';

  constructor(
    private mysqlService: MysqlService,
    private alumnoService: AlumnoService,
    private router: Router,
    private popupService: PopupService
  ) { }

  ngOnInit(): void {
    this.userId = Number(localStorage.getItem('userId'));
    if (!this.userId) {
      this.router.navigate(['/login']);
      return;
    }
    this.calcularItemsPerPage();
    this.loadUserProfile();
    this.loadReservas();
  }

  loadUserProfile(): void {
    if (!this.userId) return;
    this.mysqlService.getPerfil(this.userId).subscribe({
      next: (res) => {
        if (res.success && res.user) {
          this.jugadorNombre = res.user.nombre;
          this.jugadorFoto = res.user.foto_perfil || res.user.foto || null;
        }
      },
      error: (err) => console.error('Error loading profile:', err)
    });
  }

  cambiarVista(vista: 'activas' | 'historial'): void {
    this.vistaActual = vista;
    this.currentPage = 1;
  }

  cambiarFiltro(filtro: 'todos' | 'clases' | 'canchas' | 'grupales'): void {
    this.tipoFiltro = filtro;
    this.currentPage = 1;
  }

  get filteredReservas(): any[] {
    const source = this.vistaActual === 'activas' ? this.reservasFuturas : this.reservasPasadas;
    if (this.tipoFiltro === 'todos') return source;
    if (this.tipoFiltro === 'canchas') {
      return source.filter(r => r.tipo === 'cancha');
    }
    if (this.tipoFiltro === 'grupales') {
      return source.filter(r => r.tipo === 'grupal' || r.tipo === 'pack_grupal' || r.tipo === 'clase grupal' || (r.cantidad_personas > 1 && r.tipo !== 'cancha'));
    }
    if (this.tipoFiltro === 'clases') {
      return source.filter(r => r.tipo !== 'cancha');
    }
    return source;
  }

  get paginatedReservas(): any[] {
    const source = this.filteredReservas;
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return source.slice(start, start + this.itemsPerPage);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredReservas.length / this.itemsPerPage) || 1;
  }

  get totalProximas(): number {
    return this.reservasFuturas.length;
  }

  get totalEstaSemana(): number {
    const now = new Date();
    const inSevenDays = new Date();
    inSevenDays.setDate(now.getDate() + 7);
    return this.reservasFuturas.filter(r => {
      const d = new Date((r.fecha || '') + 'T' + (r.hora_inicio || '00:00'));
      return d >= now && d <= inSevenDays;
    }).length;
  }

  get totalGrupalesActivas(): number {
    return this.reservasFuturas.filter(r => r.tipo === 'grupal' || r.cantidad_personas > 1).length;
  }

  get totalHistorial(): number {
    return this.reservasPasadas.length;
  }

  getRelativeTime(fechaStr: string, horaStr?: string): string {
    if (!fechaStr) return '';
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const parts = fechaStr.split('-');
    if (parts.length !== 3) return fechaStr;
    const targetDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    targetDate.setHours(0, 0, 0, 0);

    const diffDays = Math.round((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Mañana';
    if (diffDays === 2) return 'Pasado mañana';
    if (diffDays > 2 && diffDays <= 7) return `En ${diffDays} días`;
    if (diffDays < 0) {
      if (diffDays === -1) return 'Ayer';
      return 'Finalizada';
    }
    return `En ${diffDays} días`;
  }

  nextPage() {
    if (this.currentPage < this.totalPages) this.currentPage++;
  }

  prevPage() {
    if (this.currentPage > 1) this.currentPage--;
  }

  irAAgendar(): void {
    this.router.navigate(['/jugador-reservas']);
  }

  irAReservarCancha(): void {
    this.router.navigate(['/clubes-reservar']);
  }

  loadReservas(): void {
    if (!this.userId) return;
    this.isLoading = true;

    this.mysqlService.getReservasJugador(this.userId).subscribe({
      next: (res: any) => {
        let allReservas = [];
        if (Array.isArray(res)) {
          allReservas = res;
        } else {
          const individuales = res.reservas_individuales || [];
          const grupales = res.entrenamientos_grupales || [];
          const canchas = res.reservas_cancha || [];
          const combined = [...individuales, ...grupales];
          canchas.forEach((c: any) => {
            if (!combined.some(x => Number(x.reserva_id) === Number(c.reserva_id) && x.tipo === 'cancha')) {
              combined.push(c);
            }
          });
          allReservas = combined;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        this.reservasFuturas = allReservas.filter(r => {
          const rDate = new Date((r.fecha || '') + 'T' + (r.hora_inicio || '00:00'));
          return rDate >= today;
        }).sort((a, b) => new Date((a.fecha || '') + 'T' + (a.hora_inicio || '00:00')).getTime() - new Date((b.fecha || '') + 'T' + (b.hora_inicio || '00:00')).getTime());

        this.reservasPasadas = allReservas.filter(r => {
          const rDate = new Date((r.fecha || '') + 'T' + (r.hora_inicio || '00:00'));
          return rDate < today;
        }).sort((a, b) => new Date((b.fecha || '') + 'T' + (b.hora_inicio || '00:00')).getTime() - new Date((a.fecha || '') + 'T' + (a.hora_inicio || '00:00')).getTime());

        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Error loading reservations:', err);
        this.isLoading = false;
      }
    });
  }

  cancelarReserva(reserva: any): void {


    // Determine ID
    const id = reserva.id || reserva.reserva_id || reserva.inscripcion_id;

    if (!id) {
      console.error('No se encontró ID válido para cancelar:', reserva);
      this.popupService.error('Error', 'No se pudo identificar la reserva. Contacta a soporte.');
      return;
    }

    this.popupService.confirm(
      '¿Estás seguro?',
      "Cancelarás tu reserva y dejarás el horario libre."
    ).then((result) => {
      if (result) {
        if (!this.userId) return;

        // Check if it is a group enrollment (not a physical slot yet)
        if (reserva.inscripcion_id) {
          this.mysqlService.cancelarInscripcionGrupal(reserva.inscripcion_id, this.userId).subscribe({
            next: (res) => {
              this.popupService.success('¡Cancelada!', res.message || 'Tu cupo ha sido liberado.');
              this.loadReservas();
            },
            error: (err) => {
              console.error('Error canceling group:', err);
              this.popupService.error('Error', err.error?.error || 'No se pudo cancelar.');
            }
          });
        } else {
          // Normal Reservation (even if it's marked as grupal, we use the reserva_id)
          this.mysqlService.cancelarReserva(id, this.userId).subscribe({
            next: () => {
              this.popupService.success('¡Cancelada!', 'Tu reserva ha sido cancelada.');
              this.loadReservas();
            },
            error: (err: any) => {
              console.error('Error canceling reservation:', err);
              const msg = err.error?.error || 'No se pudo cancelar la reserva.';
              this.popupService.error('Error', msg);
            }
          });
        }
      }
    });
  }

  // --- Invitation Logic ---

  abrirModalInvitacion(reserva: any) {
    this.selectedReserva = reserva;
    this.emailInvitado = '';
    this.showModalInvitacion = true;
  }

  cerrarModal() {
    this.showModalInvitacion = false;
    this.selectedReserva = null;
  }

  enviarInvitacion() {
    if (!this.emailInvitado || !this.emailInvitado.includes('@')) {
      this.popupService.warning('Error', 'Ingresa un email válido');
      return;
    }

    if (!this.selectedReserva || !this.selectedReserva.pack_jugador_id) {
      this.popupService.error('Error', 'No se pudo identificar el pack para esta reserva.');
      return;
    }

    this.popupService.info('Enviando...', 'Espera un momento mientras procesamos la invitación.');

    this.alumnoService.invitarJugador(this.selectedReserva.pack_jugador_id, this.emailInvitado).subscribe({
      next: (res: any) => {
        this.popupService.success('¡Listo!', res.message || 'Jugador agregado al equipo.');
        this.cerrarModal();
        this.loadReservas();
      },
      error: (err: any) => {
        console.error(err);
        this.popupService.error('Error', err.error?.error || 'No se pudo invitar al jugador.');
      }
    });
  }

  // Navigation
  irAInicio(): void { this.router.navigate(['/jugador-home']); }
  irACalendario(): void { } // Self
  irAReservas(): void { this.router.navigate(['/jugador-reservas']); }
  irAPerfil(): void { this.router.navigate(['/perfil']); }
  logout(): void {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('userId');
    this.router.navigate(['/login']);
  }
}
