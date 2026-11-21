import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpEventType } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { AlumnoService } from '../../services/alumno.service';
import { MysqlService } from '../../services/mysql.service';
import { PopupService } from '../../services/popup.service';
import { AnalyticsService } from '../../services/analytics.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-alumnos',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: './alumnos.component.html',
  styleUrls: ['./alumnos.component.scss']
})
export class AlumnosComponent implements OnInit {
  alumnos: any[] = [];
  alumnosFiltrados: any[] = [];
  isLoading = true;
  userId: number | null = null;
  searchTerm = '';
  coachNombre = 'Entrenador'; // Default
  coachFoto: string | null = null;
  loadingMessage = 'Cargando alumnos...';

  // Creación y Asociación de Alumno
  nuevoAlumno = { nombre: '', email: '' };
  isCreatingAlumno = false;
  modalTab: 'asociar' | 'crear' = 'asociar';

  // Búsqueda de Jugadores Existentes para Asociar
  searchJugadorTerm = '';
  jugadoresEncontrados: any[] = [];
  isSearchingJugadores = false;
  asociandoId: number | null = null;
  isAsociandoEmail = false;
  private searchTimeout: any = null;

  // Interactive Tutorial State
  showTutorial = false;
  currentTutorialStep = 0;
  tutorialTop = '0px';
  tutorialLeft = '0px';
  tutorialSteps = [
    { target: '.create-btn', title: '👤 Registrar Nuevo Alumno', content: 'Haz clic aquí para dar de alta a un jugador nuevo. Le enviaremos un correo con sus datos de acceso.' },
    { target: '.modal-content', title: '📝 Datos del Alumno', content: 'Ingresa el nombre y correo del alumno. El sistema generará su clave automáticamente.' },
    { target: '.search-bar', title: '🔍 Busque Ágil', content: 'Encuentra a cualquier alumno rápidamente escribiendo su nombre aquí.' },
    { target: '.sort-btn:last-child', title: '⚠️ Alerta de Saldo', content: 'Usa este filtro para ver quiénes están por quedarse sin clases. ¡Ideal para gestionar cobranzas!' },
    { target: '.alumno-card:first-child', title: '🪪 Perfil del Alumno', content: 'Aquí puedes ver el resumen de cada jugador y su estado actual.' },
    { target: '.alumno-card:first-child .session-info', title: '📊 Indicadores Técnicos', content: 'Pag: Totales pagadas / Res: Reservas hechas / Grup: Reservas en grupos / Pend: Clases disponibles para usar.' },
    { target: '.alumno-card:first-child .action-btn', title: '📋 Gestión Directa', content: 'Evalúa el nivel del alumno o revisa su historial de clases detallado desde este botón.' }
  ];

  // Paginación y Ordenamiento
  currentPage = 1;
  itemsPerPage = 12;
  pagedAlumnos: any[] = [];
  sortCriteria: 'nombre' | 'saldo' = 'nombre';
  filterTab: 'todos' | 'pendientes' | 'sin_credito' = 'todos';

  get totalConCreditos(): number {
    return this.alumnos.filter(a => Number(a.sesiones_pendientes) > 0).length;
  }

  get totalSaldoBajo(): number {
    return this.alumnos.filter(a => Number(a.sesiones_pendientes) <= 1).length;
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.calcularItemsPerPage();
  }

  private calcularItemsPerPage() {
    if (window.innerWidth >= 1400) {
      this.itemsPerPage = 12; // 4 columns
    } else if (window.innerWidth >= 900) {
      this.itemsPerPage = 9; // 3 columns
    } else if (window.innerWidth >= 600) {
      this.itemsPerPage = 6; // 2 columns
    } else {
      this.itemsPerPage = 6; // Mobile
    }
    this.updatePagedAlumnos();
  }

  constructor(
    private alumnoService: AlumnoService,
    private mysqlService: MysqlService,
    private analyticsService: AnalyticsService,
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
    this.loadProfile();
    this.loadAlumnos();
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
      error: (err) => console.error(err)
    });
  }

  loadAlumnos(): void {
    if (!this.userId) return;
    this.loadingMessage = 'Cargando alumnos...';
    this.isLoading = true;
    this.alumnoService.getAlumnos(this.userId).subscribe({
      next: (res) => {
        this.alumnos = (res || []).map(a => {
          const p1 = a.foto_perfil && String(a.foto_perfil).length > 5 ? a.foto_perfil : null;
          const p2 = a.foto && String(a.foto).length > 5 ? a.foto : null;
          let fotoRaw = p1 || p2;
          let fotoUrl = "";

          if (fotoRaw && !fotoRaw.includes('imagen_defecto')) {
            if (!fotoRaw.startsWith('http')) {
              let cleanPath = fotoRaw.startsWith('/') ? fotoRaw.substring(1) : fotoRaw;
              if (!cleanPath.includes('/')) {
                cleanPath = `uploads/perfiles/${cleanPath}`;
              }
              if (!cleanPath.startsWith('prd/') && !cleanPath.startsWith('dev/')) {
                cleanPath = `prd/${cleanPath}`;
              }
              fotoUrl = `https://api.padelmanager.cl/${cleanPath}`;
            } else {
              fotoUrl = fotoRaw;
            }
          } else {
            fotoUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(a.jugador_nombre)}&background=ccff00&color=000`;
          }

          return {
            ...a,
            sesiones_pagadas: Number(a.sesiones_pagadas),
            sesiones_reservadas: a.sesiones_reservadas,
            sesiones_grupales: a.sesiones_grupales,
            sesiones_pendientes: Number(a.sesiones_pendientes || a.sesiones_restantes || 0),
            pack_nombre: a.pack_nombres,
            foto: fotoUrl
          };
        });
        this.filtrarAlumnos();
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
      }
    });
  }

  filtrarAlumnos(): void {
    let filtered = this.alumnos;

    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(a =>
        (a.jugador_nombre || '').toLowerCase().includes(term) ||
        (a.jugador_email || '').toLowerCase().includes(term)
      );
    }

    if (this.filterTab === 'pendientes') {
      filtered = filtered.filter(a => Number(a.sesiones_pendientes) > 0);
    } else if (this.filterTab === 'sin_credito') {
      filtered = filtered.filter(a => Number(a.sesiones_pendientes) <= 0);
    }

    this.alumnosFiltrados = this.aplicarOrdenamiento(filtered);
    this.currentPage = 1;
    this.updatePagedAlumnos();
  }

  cambiarFiltro(tab: 'todos' | 'pendientes' | 'sin_credito'): void {
    this.filterTab = tab;
    this.filtrarAlumnos();
  }

  cambiarOrden(criteria: 'nombre' | 'saldo'): void {
    this.sortCriteria = criteria;
    this.alumnosFiltrados = this.aplicarOrdenamiento(this.alumnosFiltrados);
    this.currentPage = 1;
    this.updatePagedAlumnos();
  }

  aplicarOrdenamiento(list: any[]): any[] {
    if (this.sortCriteria === 'nombre') {
      return [...list].sort((a, b) => a.jugador_nombre.localeCompare(b.jugador_nombre));
    } else {
      return [...list].sort((a, b) => (Number(a.sesiones_restantes) || 0) - (Number(b.sesiones_restantes) || 0));
    }
  }

  updatePagedAlumnos(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.pagedAlumnos = this.alumnosFiltrados.slice(startIndex, endIndex);
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePagedAlumnos();
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePagedAlumnos();
    }
  }

  get totalPages(): number {
    return Math.ceil(this.alumnosFiltrados.length / this.itemsPerPage);
  }

  volver(): void {
    this.router.navigate(['/entrenador-home']);
  }

  irAEvaluar(alumno: any): void {
    if (!alumno.jugador_id) return;
    this.router.navigate(['/evaluar', alumno.jugador_id]);
  }

  verClases(alumno: any): void {
    this.router.navigate(['/clases', alumno.jugador_id]);
  }

  verProgreso(alumno: any): void {
    this.router.navigate(['/progreso', alumno.jugador_id]);
  }

  irAAgendar(alumno: any): void {
    if (alumno?.jugador_nombre) {
      localStorage.setItem('preselectAlumnoNombre', alumno.jugador_nombre);
    }
    if (alumno?.jugador_id) {
      localStorage.setItem('preselectAlumnoId', String(alumno.jugador_id));
    }
    this.router.navigate(['/entrenador-agendar']);
  }

  mostrarModalAsociar(): void {
    this.isCreatingAlumno = true;
    this.modalTab = 'asociar';
    this.searchJugadorTerm = '';
    this.jugadoresEncontrados = [];
    this.isSearchingJugadores = false;
  }

  mostrarModalCrear(): void {
    this.isCreatingAlumno = true;
    this.modalTab = 'crear';
    this.nuevoAlumno = { nombre: '', email: '' }; // Reset
  }

  cambiarTabModal(tab: 'asociar' | 'crear'): void {
    this.modalTab = tab;
    if (tab === 'asociar' && this.nuevoAlumno.email && !this.searchJugadorTerm) {
      this.searchJugadorTerm = this.nuevoAlumno.email;
      this.onSearchJugadorInput();
    } else if (tab === 'crear' && this.searchJugadorTerm && this.searchJugadorTerm.includes('@') && !this.nuevoAlumno.email) {
      this.nuevoAlumno.email = this.searchJugadorTerm.trim();
    }
  }

  cerrarModalCrear(): void {
    this.isCreatingAlumno = false;
    this.searchJugadorTerm = '';
    this.jugadoresEncontrados = [];
    this.isSearchingJugadores = false;
    this.asociandoId = null;
    this.isAsociandoEmail = false;
  }

  onSearchJugadorInput(): void {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    const term = (this.searchJugadorTerm || '').trim();
    if (term.length < 2) {
      this.jugadoresEncontrados = [];
      this.isSearchingJugadores = false;
      return;
    }

    this.isSearchingJugadores = true;
    this.searchTimeout = setTimeout(() => {
      this.alumnoService.buscarJugadoresExistentes(term).subscribe({
        next: (res: any[]) => {
          this.jugadoresEncontrados = (res || []).filter(u => Number(u.id) !== Number(this.userId));
          this.isSearchingJugadores = false;
        },
        error: () => {
          this.jugadoresEncontrados = [];
          this.isSearchingJugadores = false;
        }
      });
    }, 250);
  }

  yaEstaAsociado(jugador: any): boolean {
    if (!jugador) return false;
    const jId = Number(jugador.id || jugador.jugador_id || 0);
    const jEmail = (jugador.usuario || jugador.email || '').trim().toLowerCase();
    return this.alumnos.some(a =>
      (jId > 0 && Number(a.jugador_id) === jId) ||
      (jEmail && (a.jugador_email || '').trim().toLowerCase() === jEmail)
    );
  }

  esEmailValido(text: string): boolean {
    const clean = (text || '').trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean);
  }

  getNombreCompletoBusqueda(u: any): string {
    const n = (u?.nombre || '').trim();
    const ap = (u?.apellido || '').trim();
    if (ap && !n.toLowerCase().includes(ap.toLowerCase())) {
      return `${n} ${ap}`.trim();
    }
    return n || u?.usuario || 'Jugador';
  }

  getAvatarJugadorBusqueda(u: any): string {
    const p1 = u?.foto_perfil && String(u.foto_perfil).length > 5 ? u.foto_perfil : null;
    const p2 = u?.foto && String(u.foto).length > 5 ? u.foto : null;
    const fotoRaw = p1 || p2;
    const fullName = this.getNombreCompletoBusqueda(u);

    if (fotoRaw && !fotoRaw.includes('imagen_defecto')) {
      if (!fotoRaw.startsWith('http')) {
        let cleanPath = fotoRaw.startsWith('/') ? fotoRaw.substring(1) : fotoRaw;
        if (!cleanPath.includes('/')) {
          cleanPath = `uploads/perfiles/${cleanPath}`;
        }
        if (!cleanPath.startsWith('prd/') && !cleanPath.startsWith('dev/')) {
          cleanPath = `prd/${cleanPath}`;
        }
        return `https://api.padelmanager.cl/${cleanPath}`;
      }
      return fotoRaw;
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=ccff00&color=000`;
  }

  asociarJugadorDeLista(jugador: any): void {
    if (!this.userId || !jugador) return;
    if (this.yaEstaAsociado(jugador)) {
      this.popupService.info('Ya asociado', 'Este jugador ya forma parte de tu lista de alumnos.');
      return;
    }

    const nombreCompleto = this.getNombreCompletoBusqueda(jugador);
    const emailJugador = (jugador.usuario || jugador.email || '').trim();
    this.asociandoId = Number(jugador.id);

    this.alumnoService.crearAlumno({
      nombre: nombreCompleto,
      email: emailJugador,
      alumno_id: Number(jugador.id),
      entrenador_id: this.userId,
      only_associate: true
    }).subscribe({
      next: (res) => {
        this.asociandoId = null;
        if (res.success) {
          this.analyticsService.trackEvent('associate_player', { rol: 'alumno', origin: 'entrenador' });
          this.popupService.success(
            '¡Jugador Asociado!',
            `${nombreCompleto} fue vinculado a tu lista de jugadores. Ya puedes realizar reservas y asignarle packs.`
          );
          this.loadAlumnos();
        }
      },
      error: (err) => {
        this.asociandoId = null;
        const msg = err.error?.error || 'No se pudo asociar la cuenta del jugador';
        this.popupService.error('Error', msg);
      }
    });
  }

  asociarPorCorreoDirecto(): void {
    const email = (this.searchJugadorTerm || '').trim();
    if (!this.esEmailValido(email) || !this.userId) {
      this.popupService.error('Correo inválido', 'Ingresa un correo electrónico válido para buscar y asociar la cuenta.');
      return;
    }

    // Si está en los resultados ya cargados, usamos ese registro
    const matchInResults = this.jugadoresEncontrados.find(
      u => (u.usuario || '').trim().toLowerCase() === email.toLowerCase()
    );
    if (matchInResults) {
      this.asociarJugadorDeLista(matchInResults);
      return;
    }

    // Si no está aún en la lista local, consultamos primero get_users para confirmar que existe
    this.isAsociandoEmail = true;
    this.alumnoService.buscarJugadoresExistentes(email).subscribe({
      next: (users: any[]) => {
        const exactMatch = (users || []).find(
          u => (u.usuario || '').trim().toLowerCase() === email.toLowerCase()
        );

        if (!exactMatch) {
          this.isAsociandoEmail = false;
          this.popupService.error(
            'Cuenta no encontrada',
            `No existe ningún jugador registrado con el correo "${email}". Puedes cambiar a la pestaña "Crear Cuenta Nueva" para registrarlo.`
          );
          return;
        }

        this.isAsociandoEmail = false;
        this.asociarJugadorDeLista(exactMatch);
      },
      error: () => {
        this.isAsociandoEmail = false;
        this.popupService.error('Error', 'No se pudo verificar el correo del jugador.');
      }
    });
  }

  crearAlumno(): void {
    if (!this.nuevoAlumno.nombre || !this.nuevoAlumno.email) {
      this.popupService.error('Campos incompletos', 'Por favor completa todos los campos');
      return;
    }

    if (!this.userId) return;

    this.isLoading = true;
    this.loadingMessage = 'Registrando alumno y enviando correo...';
    
    this.alumnoService.crearAlumno({
      ...this.nuevoAlumno,
      entrenador_id: this.userId
    }).subscribe({
      next: (res) => {
        if (res.success) {
          this.analyticsService.trackEvent('create_player', { rol: 'alumno', origin: 'entrenador' });
          if (res.already_exists) {
            this.popupService.success(
              '¡Jugador Asociado!',
              'La cuenta ya existía en PadelBlox y ha sido asociada a tu lista de jugadores para realizar reservas.'
            );
          } else {
            const mailMsg = res.mail_sent ? 'y se ha enviado el correo de bienvenida.' : 'pero ha fallado el envío del correo (revisar configuración).';
            this.popupService.success('Alumno Creado', `El alumno se registró con éxito ${mailMsg}`);
          }
          this.cerrarModalCrear();
          this.loadAlumnos(); // Refrescar lista
        }
      },
      error: (err) => {
        this.isLoading = false;
        const msg = err.error?.error || 'Error al crear alumno';
        this.popupService.error('Error', msg);
      }
    });
  }

  // --- TUTORIAL METHODS ---
  startTutorial() {
    this.showTutorial = true;
    this.currentTutorialStep = 0;
    setTimeout(() => this.updateTutorialPosition(), 50);
  }

  closeTutorial() {
    this.showTutorial = false;
    this.cerrarModalCrear();
    localStorage.setItem('tutorial_alumnos_done', 'true');
  }

  nextTutorialStep() {
    if (this.currentTutorialStep < this.tutorialSteps.length - 1) {
      this.currentTutorialStep++;
      
      // Step 1: Open modal (target: .modal-content)
      if (this.currentTutorialStep === 1) {
        this.mostrarModalCrear();
      } else {
        this.cerrarModalCrear();
      }

      setTimeout(() => this.updateTutorialPosition(), 50);
    } else {
      this.closeTutorial();
    }
  }

  updateTutorialPosition() {
    const step = this.tutorialSteps[this.currentTutorialStep];
    const el = document.querySelector(step.target);
    if (el) {
      const rect = el.getBoundingClientRect();
      const cardHeight = 180;
      const cardWidth = 320;
      
      let top = rect.bottom + 15;
      let left = rect.left + (rect.width / 2) - (cardWidth / 2);

      // Adjust if it goes off screen
      if (top + cardHeight > window.innerHeight) top = rect.top - cardHeight - 15;
      if (left + cardWidth > window.innerWidth) left = window.innerWidth - cardWidth - 20;
      if (left < 0) left = 20;

      this.tutorialTop = `${top}px`;
      this.tutorialLeft = `${left}px`;
      
      el.scrollIntoView({ behavior: 'auto', block: 'center' });
      el.classList.add('tutorial-highlight');
      setTimeout(() => el.classList.remove('tutorial-highlight'), 2000);
    }
  }
}
