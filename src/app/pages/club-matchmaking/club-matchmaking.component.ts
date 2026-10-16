import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ClubesService } from '../../services/clubes.service';
import { AssetService } from '../../services/asset.service';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-club-matchmaking',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, SidebarComponent],
  templateUrl: './club-matchmaking.component.html',
  styleUrls: ['./club-matchmaking.component.scss']
})
export class ClubMatchmakingComponent implements OnInit {
  activeTab: 'partidos' | 'horarios_matriz' | 'jugadores' = 'partidos';
  
  // Clubs
  clubes: any[] = [];
  selectedClubId: number = 0;
  
  // Sidebar & User Context
  userId: number = 0;
  userName: string = 'Administrador';
  userFoto: string | null = null;
  userRole: any = 'administrador_club';

  // ==========================================
  // TAB 1: MATCHMAKING / POSIBLES PARTIDOS
  // ==========================================
  fechaSeleccionada: string = new Date().toISOString().split('T')[0];
  filtroCategoriaPartido: string = 'todas';
  filtroFranjaPartido: 'todas' | 'manana' | 'tarde' | 'noche' = 'todas';
  posiblesPartidos: any[] = [];
  isLoadingPartidos: boolean = false;
  totalPartidosSugeridos: number = 0;
  diaSemanaLabel: string = '';
  isBookingMatch: boolean = false;
  vistaModo: 'tarjetas' | 'lista' = 'tarjetas';

  setVistaModo(modo: 'tarjetas' | 'lista'): void {
    this.vistaModo = modo;
  }

  // Swap Modal
  showSwapModal: boolean = false;
  currentMatchForSwap: any = null;

  // ==========================================
  // TAB 2: MATRIZ DE DÍAS Y HORARIOS
  // ==========================================
  searchMatriz: string = '';
  filtroDiaMatriz: string = 'todos';
  filtroFranjaMatriz: string = 'todas';
  filtroHoraMatriz: string = 'todas';
  filtroCategoriaMatriz: string = 'todas';
  filtroPosicionMatriz: string = 'todas';
  filteredMatrizJugadores: any[] = [];
  paginatedMatrizJugadores: any[] = [];
  currentPageMatriz: number = 1;
  pageSizeMatriz: number = 12;
  horariosDisponiblesList: string[] = ['08:00', '09:30', '11:00', '12:30', '17:00', '18:30', '19:30', '20:00', '21:00', '21:30'];

  // ==========================================
  // TAB 3: JUGADORES & PREFERENCIAS (FICHAS)
  // ==========================================
  jugadores: any[] = [];
  filteredJugadores: any[] = [];
  paginatedJugadores: any[] = [];
  currentPage: number = 1;
  pageSize: number = 12;
  isLoadingJugadores: boolean = false;

  stats: any = {
    total_jugadores: 0,
    distribucion_categorias: {},
    distribucion_franjas: {},
    distribucion_posiciones: {},
    horario_pico: '19:30 - 21:00',
    dia_mas_demandado: 'Miércoles y Jueves'
  };

  // Filters Tab 3
  searchJugador: string = '';
  filtroCategoria: string = 'todas';
  filtroPosicion: string = 'todas';
  filtroFranja: string = 'todas';

  // Edit Modal
  showEditModal: boolean = false;
  selectedJugador: any = null;
  editForm: any = {
    usuario_id: 0,
    categoria: '4ª',
    posicion: 'Ambos',
    brazo_habil: 'Diestro',
    dias_preferidos: ['1', '3', '5'],
    franja_horaria: 'tarde',
    horario_habitual: '19:30',
    activo_matchmaking: 1,
    notas: ''
  };
  isSavingPref: boolean = false;

  diasSemanaList = [
    { val: '1', label: 'Lunes', short: 'Lun' },
    { val: '2', label: 'Martes', short: 'Mar' },
    { val: '3', label: 'Miércoles', short: 'Mié' },
    { val: '4', label: 'Jueves', short: 'Jue' },
    { val: '5', label: 'Viernes', short: 'Vie' },
    { val: '6', label: 'Sábado', short: 'Sáb' },
    { val: '0', label: 'Domingo', short: 'Dom' }
  ];

  categoriasList = ['1ª', '2ª', '3ª', '4ª', '5ª', '6ª', 'Iniciación'];

  constructor(
    private clubesService: ClubesService,
    public assetService: AssetService
  ) {}

  getAvatarUrl(foto: string | null | undefined, nombre?: string): string {
    if (!foto || foto === 'assets/images/placeholder_avatar.png' || foto.trim() === '') {
      return this.generateInitialsSvg(nombre || 'PB');
    }
    return this.assetService.getAssetUrl(foto, 'perfil');
  }

  generateInitialsSvg(name: string): string {
    const initials = this.getInitials(name || 'PB');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
      <rect width="100" height="100" rx="50" fill="#0f172a"/>
      <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="38" fill="#ccff00">${initials}</text>
    </svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  getInitials(name: string): string {
    if (!name) return 'PB';
    const parts = name.trim().split(' ').filter(p => p.length > 0);
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  onAvatarError(event: any, nombre?: string): void {
    const target = event.target as HTMLImageElement;
    if (target) {
      target.src = this.generateInitialsSvg(nombre || 'PB');
    }
  }

  ngOnInit(): void {
    this.userId = Number(localStorage.getItem('userId')) || 0;
    this.userRole = localStorage.getItem('userRole') || 'administrador_club';
    this.userName = localStorage.getItem('userName') || localStorage.getItem('nombre') || 'Administrador';
    this.userFoto = localStorage.getItem('userFoto') || localStorage.getItem('foto') || null;
    this.cargarClubes();
  }

  cargarClubes(): void {
    const adminId = this.userRole && this.userRole.includes('admin') ? this.userId : undefined;
    this.clubesService.getClubes(adminId).subscribe({
      next: (res: any[]) => {
        if (res && res.length > 0) {
          this.clubes = res;
          this.selectedClubId = res[0].id || res[0].club_id || 0;
          this.cargarDatos();
        }
      },
      error: (err) => {
        console.error('Error cargando clubes:', err);
      }
    });
  }

  selectClub(clubId: number): void {
    this.selectedClubId = clubId;
    this.cargarDatos();
  }

  onClubChange(): void {
    this.cargarDatos();
  }

  setTab(tab: 'partidos' | 'horarios_matriz' | 'jugadores'): void {
    this.activeTab = tab;
    if (tab === 'partidos' && this.posiblesPartidos.length === 0) {
      this.cargarPosiblesPartidos();
    } else if ((tab === 'horarios_matriz' || tab === 'jugadores') && this.jugadores.length === 0) {
      this.cargarJugadores();
    }
  }

  cargarDatos(): void {
    if (this.activeTab === 'partidos') {
      this.cargarPosiblesPartidos();
    } else {
      this.cargarJugadores();
    }
  }

  // ==========================================
  // TAB 1: PARTIDOS DEL DÍA Y FILTROS
  // ==========================================
  cargarPosiblesPartidos(): void {
    this.isLoadingPartidos = true;
    this.clubesService.getPosiblesPartidos(
      this.selectedClubId,
      this.fechaSeleccionada,
      this.filtroCategoriaPartido !== 'todas' ? this.filtroCategoriaPartido : '',
      ''
    ).subscribe({
      next: (res: any) => {
        this.isLoadingPartidos = false;
        if (res && res.success) {
          this.posiblesPartidos = res.partidos || [];
          this.totalPartidosSugeridos = res.total_partidos_sugeridos || this.posiblesPartidos.length;
          this.diaSemanaLabel = res.dia_semana || '';
        }
      },
      error: (err) => {
        this.isLoadingPartidos = false;
        console.error('Error cargando posibles partidos:', err);
      }
    });
  }

  setFiltroFranjaPartido(franja: 'todas' | 'manana' | 'tarde' | 'noche'): void {
    this.filtroFranjaPartido = franja;
  }

  get partidosFiltrados(): any[] {
    if (!this.posiblesPartidos || this.posiblesPartidos.length === 0) return [];

    return this.posiblesPartidos.filter(m => {
      // Category filter
      const matchCat = this.filtroCategoriaPartido === 'todas' || 
        m.categoria.toLowerCase().includes(this.filtroCategoriaPartido.toLowerCase());

      // Franja filter
      let matchFranja = true;
      const hIni = m.hora_inicio ? parseInt(m.hora_inicio.split(':')[0], 10) : 19;

      if (this.filtroFranjaPartido === 'manana') {
        matchFranja = m.franja === 'manana' || (hIni >= 7 && hIni < 12);
      } else if (this.filtroFranjaPartido === 'tarde') {
        matchFranja = m.franja === 'tarde' || m.franja === 'mediodia' || (hIni >= 12 && hIni < 19);
      } else if (this.filtroFranjaPartido === 'noche') {
        matchFranja = m.franja === 'noche' || (hIni >= 19 && hIni <= 24);
      }

      return matchCat && matchFranja;
    });
  }

  get countPartidosManana(): number {
    return this.posiblesPartidos.filter(m => {
      const hIni = m.hora_inicio ? parseInt(m.hora_inicio.split(':')[0], 10) : 19;
      return m.franja === 'manana' || (hIni >= 7 && hIni < 12);
    }).length;
  }

  get countPartidosTarde(): number {
    return this.posiblesPartidos.filter(m => {
      const hIni = m.hora_inicio ? parseInt(m.hora_inicio.split(':')[0], 10) : 19;
      return m.franja === 'tarde' || m.franja === 'mediodia' || (hIni >= 12 && hIni < 19);
    }).length;
  }

  get countPartidosNoche(): number {
    return this.posiblesPartidos.filter(m => {
      const hIni = m.hora_inicio ? parseInt(m.hora_inicio.split(':')[0], 10) : 19;
      return m.franja === 'noche' || (hIni >= 19 && hIni <= 24);
    }).length;
  }

  setFechaQuick(offsetDays: number): void {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + offsetDays);
    this.fechaSeleccionada = targetDate.toISOString().split('T')[0];
    this.cargarPosiblesPartidos();
  }

  setFechaFinDeSemana(): void {
    const now = new Date();
    const day = now.getDay();
    const distanceToSaturday = (6 - day + 7) % 7 || 7;
    const saturday = new Date();
    saturday.setDate(now.getDate() + distanceToSaturday);
    this.fechaSeleccionada = saturday.toISOString().split('T')[0];
    this.cargarPosiblesPartidos();
  }

  confirmarYReservarPartido(match: any): void {
    if (!match || !match.cancha) {
      Swal.fire('Error', 'No hay una cancha disponible asignada.', 'error');
      return;
    }

    Swal.fire({
      title: '¿Confirmar y Reservar Partido?',
      html: `
        <div style="text-align: left; font-size: 0.95rem; line-height: 1.6;">
          <p><strong>📅 Fecha:</strong> ${match.dia_nombre} ${match.fecha}</p>
          <p><strong>⏰ Horario:</strong> ${match.hora_inicio} - ${match.hora_fin} hrs</p>
          <p><strong>🏟️ Cancha:</strong> ${match.cancha.nombre}</p>
          <p><strong>🏷️ Nivel:</strong> ${match.categoria} Categoría</p>
          <hr style="margin: 10px 0; border: 0; border-top: 1px solid #eee;">
          <p><strong>Pareja 1:</strong> ${match.pareja1.jugador1.nombre} & ${match.pareja1.jugador2.nombre}</p>
          <p><strong>Pareja 2:</strong> ${match.pareja2.jugador1.nombre} & ${match.pareja2.jugador2.nombre}</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, Reservar Cancha',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.isBookingMatch = true;

        const payload = {
          cancha_id: match.cancha.id,
          fecha: match.fecha,
          hora_inicio: match.hora_inicio + ':00',
          hora_fin: match.hora_fin + ':00',
          categoria: match.categoria,
          jugador1_id: match.pareja1.jugador1.id,
          jugador2_id: match.pareja1.jugador2.id,
          jugador3_id: match.pareja2.jugador1.id,
          jugador4_id: match.pareja2.jugador2.id,
          jugador1_nombre: match.pareja1.jugador1.nombre,
          jugador2_nombre: match.pareja1.jugador2.nombre,
          jugador3_nombre: match.pareja2.jugador1.nombre,
          jugador4_nombre: match.pareja2.jugador2.nombre
        };

        this.clubesService.crearPartidoSugerido(payload).subscribe({
          next: (res: any) => {
            this.isBookingMatch = false;
            if (res && res.success) {
              Swal.fire({
                icon: 'success',
                title: '¡Partido Reservado con Éxito!',
                text: 'La cancha y los 4 jugadores han sido registrados en el calendario.',
                confirmButtonColor: '#10b981'
              });
              this.cargarPosiblesPartidos();
            }
          },
          error: (err) => {
            this.isBookingMatch = false;
            const msg = err.error?.error || 'No se pudo reservar el partido.';
            Swal.fire('Error', msg, 'error');
          }
        });
      }
    });
  }

  copiarConvocatoriaWhatsApp(match: any): void {
    if (navigator.clipboard && match.whatsapp_text) {
      navigator.clipboard.writeText(match.whatsapp_text).then(() => {
        Swal.fire({
          icon: 'success',
          title: '¡Texto Copiado!',
          text: 'Mensaje de convocatoria copiado al portapapeles listo para enviar por WhatsApp.',
          timer: 2000,
          showConfirmButton: false
        });
      });
    }
  }

  enviarWhatsAppDirecto(match: any): void {
    const encoded = encodeURIComponent(match.whatsapp_text || '');
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  }

  // ==========================================
  // TAB 2 & 3: JUGADORES, PREFERENCIAS & MATRIZ
  // ==========================================
  cargarJugadores(): void {
    this.isLoadingJugadores = true;
    this.clubesService.getJugadoresPreferencias(
      this.selectedClubId,
      '',
      '',
      '',
      ''
    ).subscribe({
      next: (res: any) => {
        this.isLoadingJugadores = false;
        if (res && res.success) {
          this.jugadores = res.jugadores || [];
          this.stats = res.stats || this.stats;
          this.filtrarJugadores();
          this.filtrarMatriz();
        }
      },
      error: (err) => {
        this.isLoadingJugadores = false;
        console.error('Error cargando preferencias de jugadores:', err);
      }
    });
  }

  // --- FILTRO Y PAGINACIÓN PARA TAB 3 (FICHAS) ---
  filtrarJugadores(): void {
    this.filteredJugadores = this.jugadores.filter(j => {
      const matchSearch = !this.searchJugador || 
        j.nombre.toLowerCase().includes(this.searchJugador.toLowerCase()) ||
        (j.email && j.email.toLowerCase().includes(this.searchJugador.toLowerCase())) ||
        (j.telefono && j.telefono.includes(this.searchJugador));

      const matchCat = this.filtroCategoria === 'todas' || 
        j.categoria.toLowerCase().includes(this.filtroCategoria.toLowerCase());

      const matchPos = this.filtroPosicion === 'todas' || 
        j.posicion.toLowerCase() === this.filtroPosicion.toLowerCase() ||
        j.posicion === 'Ambos';

      const matchFranja = this.filtroFranja === 'todas' || 
        j.franja_horaria === this.filtroFranja;

      return matchSearch && matchCat && matchPos && matchFranja;
    });

    this.currentPage = 1;
    this.actualizarPaginacionJugadores();
  }

  actualizarPaginacionJugadores(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.paginatedJugadores = this.filteredJugadores.slice(start, end);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredJugadores.length / this.pageSize) || 1;
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.actualizarPaginacionJugadores();
    }
  }

  getPagesArray(): number[] {
    const pages: number[] = [];
    const total = this.totalPages;
    for (let i = 1; i <= total; i++) {
      pages.push(i);
    }
    return pages;
  }

  // --- FILTRO Y PAGINACIÓN PARA TAB 2 (MATRIZ) ---
  setFiltroDiaMatriz(dia: string): void {
    this.filtroDiaMatriz = dia;
    this.filtrarMatriz();
  }

  setFiltroFranjaMatriz(franja: string): void {
    this.filtroFranjaMatriz = franja;
    this.filtrarMatriz();
  }

  setFiltroHoraMatriz(hora: string): void {
    this.filtroHoraMatriz = hora;
    this.filtrarMatriz();
  }

  limpiarFiltrosMatriz(): void {
    this.searchMatriz = '';
    this.filtroDiaMatriz = 'todos';
    this.filtroFranjaMatriz = 'todas';
    this.filtroHoraMatriz = 'todas';
    this.filtroCategoriaMatriz = 'todas';
    this.filtroPosicionMatriz = 'todas';
    this.filtrarMatriz();
  }

  countJugadoresPorDia(diaVal: string): number {
    if (!this.jugadores || this.jugadores.length === 0) return 0;
    return this.jugadores.filter(j => this.getHorarioDia(j, diaVal) !== null).length;
  }

  countJugadoresPorFranja(franjaVal: string): number {
    if (!this.jugadores || this.jugadores.length === 0) return 0;
    return this.jugadores.filter(j => {
      if (this.filtroDiaMatriz !== 'todos') {
        const hora = this.getHorarioDia(j, this.filtroDiaMatriz);
        return hora !== null && this.getFranjaFromHora(hora) === franjaVal;
      }
      return j.franja_horaria === franjaVal || 
        (j.horarios_por_dia && Object.values(j.horarios_por_dia).some((h: any) => h && this.getFranjaFromHora(h) === franjaVal));
    }).length;
  }

  filtrarMatriz(): void {
    this.filteredMatrizJugadores = this.jugadores.filter(j => {
      const matchSearch = !this.searchMatriz || 
        j.nombre.toLowerCase().includes(this.searchMatriz.toLowerCase()) ||
        (j.email && j.email.toLowerCase().includes(this.searchMatriz.toLowerCase())) ||
        (j.telefono && j.telefono.includes(this.searchMatriz));

      // Day filter
      let matchDia = true;
      if (this.filtroDiaMatriz !== 'todos') {
        matchDia = this.getHorarioDia(j, this.filtroDiaMatriz) !== null;
      }

      // Franja filter
      let matchFranja = true;
      if (this.filtroFranjaMatriz !== 'todas') {
        if (this.filtroDiaMatriz !== 'todos') {
          const horaDia = this.getHorarioDia(j, this.filtroDiaMatriz);
          matchFranja = horaDia !== null && this.getFranjaFromHora(horaDia) === this.filtroFranjaMatriz;
        } else {
          matchFranja = j.franja_horaria === this.filtroFranjaMatriz || 
            (j.horarios_por_dia && Object.values(j.horarios_por_dia).some((h: any) => h && this.getFranjaFromHora(h) === this.filtroFranjaMatriz));
        }
      }

      // Exact Hour filter
      let matchHora = true;
      if (this.filtroHoraMatriz !== 'todas') {
        if (this.filtroDiaMatriz !== 'todos') {
          matchHora = this.getHorarioDia(j, this.filtroDiaMatriz) === this.filtroHoraMatriz;
        } else {
          matchHora = j.horario_habitual === this.filtroHoraMatriz ||
            (j.horarios_por_dia && Object.values(j.horarios_por_dia).some((h: any) => h === this.filtroHoraMatriz));
        }
      }

      const matchCat = this.filtroCategoriaMatriz === 'todas' || 
        j.categoria.toLowerCase().includes(this.filtroCategoriaMatriz.toLowerCase());

      const matchPos = this.filtroPosicionMatriz === 'todas' || 
        j.posicion.toLowerCase() === this.filtroPosicionMatriz.toLowerCase() ||
        j.posicion === 'Ambos';

      return matchSearch && matchDia && matchFranja && matchHora && matchCat && matchPos;
    });

    this.currentPageMatriz = 1;
    this.actualizarPaginacionMatriz();
  }

  actualizarPaginacionMatriz(): void {
    const start = (this.currentPageMatriz - 1) * this.pageSizeMatriz;
    const end = start + this.pageSizeMatriz;
    this.paginatedMatrizJugadores = this.filteredMatrizJugadores.slice(start, end);
  }

  get totalPagesMatriz(): number {
    return Math.ceil(this.filteredMatrizJugadores.length / this.pageSizeMatriz) || 1;
  }

  setPageMatriz(page: number): void {
    if (page >= 1 && page <= this.totalPagesMatriz) {
      this.currentPageMatriz = page;
      this.actualizarPaginacionMatriz();
    }
  }

  getPagesArrayMatriz(): number[] {
    const pages: number[] = [];
    const total = this.totalPagesMatriz;
    for (let i = 1; i <= total; i++) {
      pages.push(i);
    }
    return pages;
  }

  isDiaJugador(j: any, val: string): boolean {
    return j.dias_preferidos && j.dias_preferidos.includes(val);
  }

  getHorarioDia(j: any, diaVal: string): string | null {
    if (j.horarios_por_dia && j.horarios_por_dia[diaVal]) {
      return j.horarios_por_dia[diaVal];
    }
    if (j.dias_preferidos && j.dias_preferidos.includes(diaVal)) {
      return j.horario_habitual || '19:30';
    }
    return null;
  }

  getFranjaFromHora(hora: string | null): string {
    if (!hora) return '';
    const h = parseInt(hora.split(':')[0], 10);
    if (h < 12) return 'manana';
    if (h < 16) return 'mediodia';
    if (h < 20) return 'tarde';
    return 'noche';
  }

  getFranjaLabel(hora: string | null): string {
    if (!hora) return '';
    const franja = this.getFranjaFromHora(hora);
    if (franja === 'manana') return 'Mañana';
    if (franja === 'mediodia') return 'Mediodía';
    if (franja === 'tarde') return 'Tarde';
    return 'Noche';
  }

  abrirEditarPreferencia(j: any): void {
    this.selectedJugador = j;
    this.editForm = {
      usuario_id: j.id,
      club_id: this.selectedClubId,
      categoria: j.categoria || '4ª',
      posicion: j.posicion || 'Ambos',
      brazo_habil: j.brazo_habil || 'Diestro',
      dias_preferidos: j.dias_preferidos && Array.isArray(j.dias_preferidos) ? [...j.dias_preferidos] : ['1', '3', '5'],
      franja_horaria: j.franja_horaria || 'tarde',
      horario_habitual: j.horario_habitual || '19:30',
      activo_matchmaking: j.activo_matchmaking !== undefined ? j.activo_matchmaking : 1,
      notas: j.notas || ''
    };
    this.showEditModal = true;
  }

  cerrarEditarPreferencia(): void {
    this.showEditModal = false;
    this.selectedJugador = null;
  }

  toggleDiaPreferido(val: string): void {
    const idx = this.editForm.dias_preferidos.indexOf(val);
    if (idx > -1) {
      this.editForm.dias_preferidos.splice(idx, 1);
    } else {
      this.editForm.dias_preferidos.push(val);
    }
  }

  isDiaSelected(val: string): boolean {
    return this.editForm.dias_preferidos && this.editForm.dias_preferidos.includes(val);
  }

  guardarPreferencia(): void {
    this.isSavingPref = true;
    this.clubesService.saveJugadorPreferencia(this.editForm).subscribe({
      next: (res: any) => {
        this.isSavingPref = false;
        if (res && res.success) {
          Swal.fire({
            icon: 'success',
            title: '¡Preferencias Guardadas!',
            text: 'Las preferencias del jugador han sido actualizadas.',
            timer: 1800,
            showConfirmButton: false
          });
          this.cerrarEditarPreferencia();
          this.cargarJugadores();
        }
      },
      error: (err) => {
        this.isSavingPref = false;
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudieron guardar las preferencias.'
        });
      }
    });
  }

  abrirWhatsAppJugador(j: any): void {
    const tel = (j.telefono || '').replace(/\D/g, '');
    if (!tel) {
      Swal.fire({
        icon: 'info',
        title: 'Sin Teléfono',
        text: 'El jugador no tiene registrado un número telefónico.'
      });
      return;
    }
    const msg = encodeURIComponent(`Hola ${j.nombre}, te contactamos de PadelBlox para coordinar tus próximos partidos de pádel en categoría ${j.categoria}.`);
    window.open(`https://wa.me/${tel}?text=${msg}`, '_blank');
  }
}
