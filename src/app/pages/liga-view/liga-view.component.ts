import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LigaService, Liga } from '../../services/liga.service';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { TablaPosicionesComponent } from './tabla-posiciones.component';
import { CargarResultadoModalComponent } from './cargar-resultado-modal.component';
import { InscribirParejaModalComponent } from './inscribir-pareja-modal.component';
import { ProgramarPartidoModalComponent } from './programar-partido-modal.component';
import { ProgramarJornadaSemanalModalComponent } from './programar-jornada-semanal-modal.component';
import { GenerarFixtureModalComponent } from './generar-fixture-modal.component';
import { CompartirWhatsAppModalComponent } from './compartir-whatsapp-modal.component';
import { AssetService } from '../../services/asset.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-liga-view',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    SidebarComponent, 
    TablaPosicionesComponent, 
    CargarResultadoModalComponent,
    InscribirParejaModalComponent,
    ProgramarPartidoModalComponent,
    ProgramarJornadaSemanalModalComponent,
    GenerarFixtureModalComponent,
    CompartirWhatsAppModalComponent
  ],
  templateUrl: './liga-view.component.html',
  styleUrls: ['./liga-view.component.scss']
})
export class LigaViewComponent implements OnInit {
  userId: number = 0;
  userRole: 'jugador' | 'entrenador' | 'administrador_club' | 'administrador' | 'staff_club' = 'administrador_club';
  userName: string = '';

  ligaId: number = 0;
  liga: Liga | null = null;
  categoriaSeleccionadaIndex: number = 0;
  filtroCategoriaFixtureId: number | null = null;
  categoriaParaGenerarFixture: any = null;
  grupoSeleccionadoId: number | null = null;
  activeTab: 'dashboard' | 'inscritos' | 'posiciones' | 'semana' | 'pendientes' | 'fixture' | 'playoffs' = 'dashboard';

  posicionesGrupo: any[] = [];
  partidoParaCargar: any = null;
  partidoParaProgramar: any = null;
  jornadaParaProgramarSemanal: any = null;
  mostrarConfigFixture: boolean = false;
  mostrarModalInscribir: boolean = false;
  mostrarModalGenerarFixture: boolean = false;
  parejaParaEditar: any = null;
  selectedJornadaNumero: number = 1;
  mostrarMenuOpciones: boolean = false;

  mostrarModalWhatsApp: boolean = false;
  jornadaParaWhatsApp: any = null;

  abrirModalCompartirWhatsApp(jornada?: any): void {
    this.jornadaParaWhatsApp = jornada || this.jornadaSeleccionadaActual;
    if (this.jornadaParaWhatsApp) {
      this.mostrarModalWhatsApp = true;
    } else {
      Swal.fire('Atención', 'No hay ninguna jornada seleccionada para compartir.', 'warning');
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    this.mostrarMenuOpciones = false;
  }

  toggleMenuOpciones(event?: Event): void {
    if (event) event.stopPropagation();
    this.mostrarMenuOpciones = !this.mostrarMenuOpciones;
  }

  cerrarMenuOpciones(): void {
    this.mostrarMenuOpciones = false;
  }

  get totalCapacidadParejas(): number {
    if (!this.liga?.categorias || this.liga.categorias.length === 0) return 16;
    return this.liga.categorias.reduce((acc, cat) => acc + (+cat.max_parejas || 16), 0);
  }

  get porcentajeCapacidadParejas(): number {
    const total = this.liga?.stats?.total_parejas || 0;
    const max = this.totalCapacidadParejas;
    if (!max) return 0;
    return Math.min(100, Math.round((total / max) * 100));
  }

  get porcentajePartidosJugados(): number {
    const jugados = this.liga?.stats?.partidos_jugados || 0;
    const total = this.liga?.stats?.total_partidos || 0;
    if (!total) return 0;
    return Math.min(100, Math.round((jugados / total) * 100));
  }

  get jornadaSeleccionadaActual(): any | null {
    const jornadas = this.todasLasJornadas;
    if (!jornadas || jornadas.length === 0) return null;
    return jornadas.find(j => j.numero_jornada === this.selectedJornadaNumero) || jornadas[0];
  }

  selectedDiaByJornada: { [jornadaId: number]: string } = {};

  getDiaSeleccionado(jornadaId: number): string {
    return this.selectedDiaByJornada[jornadaId] || 'ALL';
  }

  setDiaSeleccionado(jornadaId: number, fechaKey: string): void {
    this.selectedDiaByJornada[jornadaId] = fechaKey;
  }

  getDiasFiltrados(jornada: any): any[] {
    if (!jornada || !jornada.dias_grupos) return [];
    const sel = this.getDiaSeleccionado(jornada.id);
    if (sel === 'ALL') return jornada.dias_grupos;
    return jornada.dias_grupos.filter((d: any) => d.fechaKey === sel);
  }

  formatCanchaNombre(nombre?: string): string {
    if (!nombre) return '';
    return nombre.replace(/_/g, ' ');
  }

  // Inline Fixture Generation Properties
  genNumGrupos: number = 1;
  genClasificanModo: string = 'todas';
  genClasificanCant: number = 8;
  genFechaInicio: string = '';
  genDiasSemanaList: { nombre: string; selected: boolean }[] = [
    { nombre: 'Lunes', selected: true },
    { nombre: 'Martes', selected: true },
    { nombre: 'Miércoles', selected: true },
    { nombre: 'Jueves', selected: true },
    { nombre: 'Viernes', selected: true },
    { nombre: 'Sábado', selected: true },
    { nombre: 'Domingo', selected: true }
  ];
  genHorarios: string[] = ['18:00', '19:00', '20:00', '21:00', '22:00'];
  genNuevoHorario: string = '';
  genCanchasSeleccionadas: number[] = [];
  genRespetarRestricciones: boolean = true;
  genMaxPartidosPareja: number = 1;
  genLoading: boolean = false;

  loading: boolean = true;
  errorMsj: string = '';

  // Partidos de la Semana
  semanaOffset: number = 0;
  filtroCategoriaSemanaId: number | null = null;
  filtroEstadoSemana: 'todos' | 'pendientes' | 'jugados' = 'todos';
  semanasDisponibles: { offset: number; label: string; start: string; end: string }[] = [];
  diasSemanaVista: { label: string; dayName?: string; dayNum?: string; fechaKey: string; isToday: boolean; partidos: any[] }[] = [];
  statsSemana: { total: number; jugados: number; programados: number; sinHorario: number } = { total: 0, jugados: 0, programados: 0, sinHorario: 0 };
  
  // Tab Partidos Pendientes de Jornadas Anteriores
  filtroCategoriaPendientesId: number | null | undefined = null;
  filtroTipoPendiente: 'todos' | 'sin_horario' | 'sin_resultado' = 'todos';
  busquedaPendientes: string = '';
  soloJornadasAnteriores: boolean = true;
  jornadasSeleccionadasPendientes: number[] = [];
  partidosPendientesList: any[] = [];
  jornadasDisponiblesPendientes: { 
    numero: number; 
    nombre: string; 
    total: number; 
    sinHorario: number; 
    sinResultado: number; 
    esAnterior: boolean;
  }[] = [];

  get esAdminClub(): boolean {
    const r = (this.userRole || '').toLowerCase();
    return r === 'administrador_club' || r === 'administrador' || r.includes('admin');
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private ligaService: LigaService,
    private assetService: AssetService
  ) {}

  ngOnInit(): void {
    const userStr = localStorage.getItem('currentUser') || localStorage.getItem('user');
    const storedRole = localStorage.getItem('userRole');
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        this.userId = u.id;
        this.userRole = (storedRole || u.rol || 'administrador_club') as any;
        this.userName = `${u.nombre || ''} ${u.apellido || ''}`.trim();
      } catch (e) {
        console.error('Error parseando usuario:', e);
      }
    } else if (storedRole) {
      this.userRole = storedRole as any;
    }

    this.route.params.subscribe(params => {
      this.ligaId = +params['id'];
      if (this.ligaId) {
        this.cargarLiga();
      }
    });
  }

  selectedClubId: number | null = null;

  cargarLiga(): void {
    this.loading = true;
    this.ligaService.obtenerLiga(this.ligaId, this.selectedClubId || undefined, this.userId || undefined).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success && res.liga) {
          this.liga = res.liga;
          this.procesarTodasLasJornadas();
          this.procesarSemanaActual();
          this.procesarPartidosPendientes();
          if (this.liga?.club_id_activo) {
            this.selectedClubId = this.liga.club_id_activo;
          }
          if (this.liga?.canchas && this.liga.canchas.length > 0) {
            this.genCanchasSeleccionadas = this.liga.canchas.map((c: any) => c.id);
          } else {
            this.genCanchasSeleccionadas = [];
          }
          if (!this.genFechaInicio) {
            this.genFechaInicio = new Date().toISOString().split('T')[0];
          }
          if (this.liga?.categorias && this.liga.categorias.length > 0) {
            this.seleccionarCategoria(this.categoriaSeleccionadaIndex);
          }
        } else {
          this.errorMsj = res.error || 'Liga no encontrada';
        }
      },
      error: (err) => {
        this.loading = false;
        this.errorMsj = 'Error al cargar la liga';
        console.error(err);
      }
    });
  }

  onClubChange(clubId: any): void {
    this.selectedClubId = +clubId;
    this.cargarLiga();
  }

  isGenCanchaSelected(id: number): boolean {
    return this.genCanchasSeleccionadas.includes(id);
  }

  toggleGenCancha(id: number): void {
    if (this.isGenCanchaSelected(id)) {
      this.genCanchasSeleccionadas = this.genCanchasSeleccionadas.filter(c => c !== id);
    } else {
      this.genCanchasSeleccionadas.push(id);
    }
  }

  agregarGenHorario(): void {
    if (this.genNuevoHorario && !this.genHorarios.includes(this.genNuevoHorario)) {
      this.genHorarios.push(this.genNuevoHorario);
      this.genHorarios.sort();
      this.genNuevoHorario = '';
    }
  }

  eliminarGenHorario(index: number): void {
    this.genHorarios.splice(index, 1);
  }

  get categoriaActualFixture(): any {
    if (!this.filtroCategoriaFixtureId || !this.liga?.categorias) return null;
    return this.liga.categorias.find((c: any) => c.id === this.filtroCategoriaFixtureId) || null;
  }

  get hasFixtureForCurrentFilter(): boolean {
    if (this.filtroCategoriaFixtureId) {
      const cat = this.categoriaActualFixture;
      return !!(cat && cat.jornadas && cat.jornadas.length > 0);
    }
    return !!this.liga?.categorias?.some((c: any) => c.jornadas && c.jornadas.length > 0);
  }

  get hasAnyFixture(): boolean {
    return !!this.liga?.categorias?.some((c: any) => c.jornadas && c.jornadas.length > 0);
  }

  seleccionarCategoriaFixture(catId?: number | null): void {
    this.filtroCategoriaFixtureId = catId || null;
    this.procesarTodasLasJornadas();
    if (this.todasLasJornadasList.length > 0) {
      this.selectedJornadaNumero = this.todasLasJornadasList[0].numero_jornada;
    } else {
      this.selectedJornadaNumero = 1;
    }
  }

  todasLasJornadasList: any[] = [];

  procesarTodasLasJornadas(): void {
    if (!this.liga?.categorias) {
      this.todasLasJornadasList = [];
      return;
    }

    const categorias = this.filtroCategoriaFixtureId
      ? this.liga.categorias.filter((cat: any) => cat.id === this.filtroCategoriaFixtureId)
      : this.liga.categorias;

    const map = new Map<number, any>();
    categorias.forEach((cat: any) => {
      if (cat.jornadas) {
        cat.jornadas.forEach((j: any) => {
          const num = parseInt(j.numero_jornada, 10) || 1;
          if (!map.has(num)) {
            map.set(num, {
              id: j.id,
              numero_jornada: num,
              nombre: j.nombre,
              fecha_limite: j.fecha_limite,
              jornadas_ids: [j.id],
              partidos: [],
              partidos_jugados: 0,
              partidos_sin_cancha: 0,
              partidos_total: 0
            });
          } else {
            if (!map.get(num).jornadas_ids.includes(j.id)) {
              map.get(num).jornadas_ids.push(j.id);
            }
          }
          if (j.partidos) {
            const jObj = map.get(num);
            j.partidos.forEach((m: any) => {
              jObj.partidos.push({
                ...m,
                categoria_nombre: cat.nombre,
                categoria_genero: cat.genero
              });
              jObj.partidos_total++;
              if (m.estado === 'Jugado') {
                jObj.partidos_jugados++;
              }
              const isUnscheduled = !m.fecha_hora || 
                                    m.fecha_hora.startsWith('0000') || 
                                    m.fecha_hora === '0000-00-00 00:00:00' || 
                                    !m.cancha_id || 
                                    Number(m.cancha_id) === 0;
              if (isUnscheduled) {
                jObj.partidos_sin_cancha++;
              }
            });
          }
        });
      }
    });

    const result = Array.from(map.values()).sort((a, b) => a.numero_jornada - b.numero_jornada);
    const diasNombresEs = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

    result.forEach(j => {
      const diasMap = new Map<string, { label: string; fechaKey: string; partidos: any[] }>();

      j.partidos.forEach((m: any) => {
        let dayKey = '0000-00-00';
        let dayLabel = '⚠️ Sin Horario / Pendiente';

        const isUnscheduled = !m.fecha_hora || 
                              m.fecha_hora.startsWith('0000') || 
                              m.fecha_hora === '0000-00-00 00:00:00' || 
                              !m.cancha_id || 
                              Number(m.cancha_id) === 0;

        if (!isUnscheduled && m.fecha_hora) {
          const dtStr = m.fecha_hora.replace(' ', 'T');
          const dt = new Date(dtStr);
          if (!isNaN(dt.getTime())) {
            const year = dt.getFullYear();
            const month = String(dt.getMonth() + 1).padStart(2, '0');
            const day = String(dt.getDate()).padStart(2, '0');
            const diaSemanaStr = diasNombresEs[dt.getDay()];
            dayKey = `${year}-${month}-${day}`;
            dayLabel = `${diaSemanaStr} ${day}/${month}`;
          }
        }

        if (!diasMap.has(dayKey)) {
          diasMap.set(dayKey, {
            fechaKey: dayKey,
            label: dayLabel,
            partidos: []
          });
        }
        diasMap.get(dayKey)!.partidos.push(m);
      });

      const diasList = Array.from(diasMap.values()).sort((a, b) => a.fechaKey.localeCompare(b.fechaKey));
      diasList.forEach(d => {
        d.partidos.sort((a: any, b: any) => {
          const tA = a.fecha_hora || '';
          const tB = b.fecha_hora || '';
          if (tA !== tB) return tA.localeCompare(tB);
          const cA = a.cancha_nombre || '';
          const cB = b.cancha_nombre || '';
          return cA.localeCompare(cB);
        });
      });

      j.dias_grupos = diasList;
    });

    this.todasLasJornadasList = result;
  }

  get todasLasJornadas(): any[] {
    return this.todasLasJornadasList;
  }

  trackByJornada(index: number, item: any): any {
    return item?.numero_jornada || item?.id || index;
  }

  trackByPartido(index: number, item: any): any {
    return item?.id || index;
  }

  trackByDia(index: number, item: any): any {
    return item?.fechaKey || index;
  }

  diasSemanaList: string[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  isDiaCatSeleccionado(cat: any, dia: string): boolean {
    if (!cat || !cat.dias_juego) return false;
    return cat.dias_juego.includes(dia);
  }

  toggleDiaCat(cat: any, dia: string): void {
    if (!cat) return;
    if (!cat.dias_juego) {
      cat.dias_juego = [];
    }
    const idx = cat.dias_juego.indexOf(dia);
    if (idx > -1) {
      cat.dias_juego.splice(idx, 1);
    } else {
      cat.dias_juego.push(dia);
    }
  }

  async generarFixtureConParametros(): Promise<void> {
    if (!this.liga || !this.liga.categorias || this.liga.categorias.length === 0) return;

    if (this.liga.canchas && this.liga.canchas.length > 0) {
      this.genCanchasSeleccionadas = this.liga.canchas.map((c: any) => c.id);
    }

    if (!this.genFechaInicio) {
      Swal.fire('Atención', 'Debes ingresar el primer día de inicio de la primera semana.', 'warning');
      return;
    }

    const dias = this.genDiasSemanaList.filter(d => d.selected).map(d => d.nombre);
    if (dias.length === 0) {
      Swal.fire('Atención', 'Debes seleccionar al menos un día habilitado para jugar.', 'warning');
      return;
    }

    if (this.genCanchasSeleccionadas.length === 0) {
      Swal.fire('Atención', 'No se encontraron canchas disponibles registradas en el club para asignar los partidos.', 'warning');
      return;
    }

    if (this.genHorarios.length === 0) {
      Swal.fire('Atención', 'Debes definir al menos un horario de partido.', 'warning');
      return;
    }

    this.genLoading = true;

    try {
      // 0. Guardar configuración de días asignados por categoría antes de generar
      const payloadSave = {
        id: this.ligaId,
        nombre: this.liga.nombre,
        fecha_inicio: this.liga.fecha_inicio,
        fecha_fin: this.liga.fecha_fin,
        categorias: this.liga.categorias
      };
      await this.ligaService.guardarLiga(payloadSave).toPromise();

      // 1. Generar fixture de la categoría seleccionada o de toda la liga
      if (this.filtroCategoriaFixtureId) {
        await this.ligaService.generarFixture(this.filtroCategoriaFixtureId, this.genNumGrupos).toPromise();
      } else {
        await this.ligaService.generarFixturePorLiga(this.ligaId, this.genNumGrupos).toPromise();
      }

      // 2. Obtener la liga actualizada para recuperar todos los IDs de la Jornada 1
      const resLiga: any = await this.ligaService.obtenerLiga(this.ligaId, this.selectedClubId || undefined, this.userId || undefined).toPromise();
      
      if (resLiga && resLiga.success && resLiga.liga) {
        this.liga = resLiga.liga;
        this.procesarTodasLasJornadas();
        const j1Ids: number[] = [];

        const catsToProgram = this.filtroCategoriaFixtureId
          ? this.liga?.categorias?.filter((c: any) => c.id === this.filtroCategoriaFixtureId)
          : this.liga?.categorias;

        catsToProgram?.forEach((cat: any) => {
          const j1 = cat.jornadas?.find((j: any) => parseInt(j.numero_jornada, 10) === 1) || cat.jornadas?.[0];
          if (j1 && j1.id) j1Ids.push(j1.id);
        });

        if (j1Ids.length > 0) {
          const payloadJ1 = {
            jornada_ids: j1Ids,
            fecha_inicio: this.genFechaInicio,
            dias_semana: dias,
            horarios: this.genHorarios,
            canchas_ids: this.genCanchasSeleccionadas,
            respetar_restricciones: this.genRespetarRestricciones,
            max_partidos_por_pareja: this.genMaxPartidosPareja
          };

          await this.ligaService.programarJornadaSemanal(payloadJ1).toPromise();
          
          const catNombre = this.categoriaActualFixture?.nombre;
          Swal.fire({
            title: this.filtroCategoriaFixtureId ? `¡Fixture (${catNombre}) & Semana 1 Creados!` : '¡Fixture General & Semana 1 Creados!',
            text: this.filtroCategoriaFixtureId 
              ? `Se agendó la Jornada 1 para ${catNombre}.` 
              : `Se agendó la Jornada 1 para las ${this.liga?.categorias?.length || 0} categorías de la liga.`,
            icon: 'success',
            timer: 2500,
            showConfirmButton: false
          });
        }
      }
    } catch (err) {
      console.error('Error generando fixture general:', err);
      Swal.fire('Error', 'Ocurrió un problema al generar los fixtures de las categorías.', 'error');
    } finally {
      this.genLoading = false;
      this.cargarLiga();
    }
  }

  confirmarBorrarFixture(categoriaId?: number): void {
    if (!this.esAdminClub) {
      Swal.fire('Acceso Restringido', 'Solo el administrador del club puede borrar el fixture.', 'warning');
      return;
    }

    const targetCatId = categoriaId !== undefined ? categoriaId : (this.filtroCategoriaFixtureId || undefined);
    const catObj = targetCatId ? this.liga?.categorias?.find((c: any) => c.id === targetCatId) : null;

    const isTodaLaLiga = !targetCatId;
    const titulo = isTodaLaLiga 
      ? '¿Borrar Fixture General de TODAS las Categorías?' 
      : `¿Borrar Fixture de "${catObj?.nombre || 'esta categoría'}"?`;
    
    const texto = isTodaLaLiga
      ? '<p style="color: #334155; font-size: 0.95rem; margin-bottom: 10px;">Estás a punto de eliminar el fixture de <strong>toda la liga</strong>.</p><div style="color: #dc2626; font-weight: 700; font-size: 0.85rem; background: #fee2e2; padding: 12px; border-radius: 10px; border: 1px solid #fecaca; text-align: left; line-height: 1.4;">⚠️ <strong>¡Atención!</strong> Se eliminarán todos los partidos del fixture, las jornadas y todas las reservas en canchas de TODAS las categorías. Esta acción no se puede deshacer.</div><p style="color: #64748b; font-size: 0.82rem; margin-top: 10px; margin-bottom: 0;">¿Deseas continuar?</p>'
      : `<p style="color: #334155; font-size: 0.95rem; margin-bottom: 10px;">Estás a punto de eliminar el fixture de la categoría <strong>"${catObj?.nombre || ''}"</strong>.</p><div style="color: #dc2626; font-weight: 700; font-size: 0.85rem; background: #fee2e2; padding: 12px; border-radius: 10px; border: 1px solid #fecaca; text-align: left; line-height: 1.4;">⚠️ <strong>¡Atención!</strong> Se eliminarán los partidos del fixture, las jornadas y las reservas en canchas de esta categoría. Las demás categorías permanecerán intactas.</div><p style="color: #64748b; font-size: 0.82rem; margin-top: 10px; margin-bottom: 0;">¿Deseas continuar?</p>`;

    Swal.fire({
      title: titulo,
      html: texto,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      confirmButtonText: '🗑️ Sí, borrar fixture',
      cancelButtonText: 'Cancelar',
      focusCancel: true
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: 'Eliminando fixture...',
          text: 'Por favor espera un momento.',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        this.ligaService.borrarFixture(isTodaLaLiga ? this.ligaId : undefined, targetCatId).subscribe({
          next: (res) => {
            if (res.success) {
              Swal.fire({
                title: '¡Fixture Eliminado!',
                text: res.mensaje || 'Fixture y reservas borradas correctamente.',
                icon: 'success',
                timer: 2500,
                showConfirmButton: false
              });
              this.cargarLiga();
            } else {
              Swal.fire('Error', res.error || 'No se pudo eliminar el fixture.', 'error');
            }
          },
          error: (err) => {
            console.error('Error al borrar fixture:', err);
            Swal.fire('Error', 'Ocurrió un fallo al intentar eliminar el fixture.', 'error');
          }
        });
      }
    });
  }

  limpiarDemos(): void {
    if (!this.ligaId) return;
    if (!this.esAdminClub) {
      Swal.fire('Acceso Restringido', 'Solo el administrador del club puede limpiar parejas demo.', 'warning');
      return;
    }

    Swal.fire({
      title: '¿Limpiar Parejas Demo?',
      html: '<p style="color: #334155; font-size: 0.95rem; margin-bottom: 10px;">Se eliminarán todas las parejas demo ficticias y sus partidos asociados.</p><div style="color: #b45309; font-weight: 700; font-size: 0.85rem; background: #fffdf5; padding: 12px; border-radius: 10px; border: 1px solid #fde68a; text-align: left; line-height: 1.4;">🧹 Esto dejará tu liga lista y limpia para registrar a los jugadores reales inscritos.</div><p style="color: #64748b; font-size: 0.82rem; margin-top: 10px; margin-bottom: 0;">¿Deseas continuar?</p>',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: '🧹 Sí, eliminar demos',
      cancelButtonText: 'Cancelar',
      focusCancel: true
    }).then((result) => {
      if (result.isConfirmed) {
        this.ligaService.limpiarDemos(this.ligaId!).subscribe({
          next: (res) => {
            if (res.success) {
              Swal.fire({
                title: '¡Demos Limpiados!',
                text: res.mensaje || 'Se han eliminado las parejas demo exitosamente.',
                icon: 'success',
                timer: 2500,
                showConfirmButton: false
              });
              this.cargarLiga();
            } else {
              Swal.fire('Error', res.error || 'No se pudieron eliminar los demos.', 'error');
            }
          },
          error: () => {
            Swal.fire('Error', 'Error de conexión al limpiar parejas demo.', 'error');
          }
        });
      }
    });
  }

  vistaPlayoffs: 'bracket' | 'lista' = 'bracket';
  modoSimulacionPlayoffs: boolean = false;
  simTotalClasifican: number = 999;
  simDirectosCuartos: number = -1;
  playoffsSimuladosList: any[] = [];

  get playoffsRounds(): { playin: any[], octavos: any[], cuartos: any[], semifinales: any[], final: any[] } {
    const list = this.modoSimulacionPlayoffs ? this.playoffsSimuladosList : (this.categoriaActual?.playoffs || []);
    return {
      playin: list.filter((m: any) => m.ronda_playoff === 'Dieciseisavos de Final' || m.ronda_playoff === 'Repechaje (Play-In)'),
      octavos: list.filter((m: any) => m.ronda_playoff === 'Octavos de Final' || m.ronda_playoff === 'Ronda Previa'),
      cuartos: list.filter((m: any) => m.ronda_playoff === 'Cuartos de Final'),
      semifinales: list.filter((m: any) => m.ronda_playoff === 'Semifinales'),
      final: list.filter((m: any) => m.ronda_playoff === 'Final')
    };
  }

  get tienePlayoffs(): boolean {
    return !!(this.categoriaActual?.playoffs && this.categoriaActual.playoffs.length > 0);
  }

  calcularDirectosOptimos(n: number): number {
    // Estándar Oficial FIP (potencia de 2 más cercana):
    // - Si N <= 2: 0 (Final)
    // - Si N == 3: 1 BYE a la Final
    // - Si N == 4: 0 (Semis completas)
    // - Si 5 <= N <= 7: (8 - N) BYEs a Semis
    // - Si N == 8: 0 (Cuartos completos)
    // - Si 9 <= N <= 15: (16 - N) BYEs a Cuartos (ej. 12 -> 4 BYEs, 14 -> 2 BYEs, 15 -> 1 BYE)
    // - Si N == 16: 0 (Octavos completos)
    // - Si 17 <= N <= 31: (32 - N) BYEs a Octavos (ej. 17 -> 15 BYEs, 20 -> 12 BYEs, 24 -> 8 BYEs)
    // - Si N >= 32: 0 (Dieciseisavos completos)
    if (n <= 2) return 0;
    if (n === 3) return 1;
    if (n === 4) return 0;
    if (n <= 7) return 8 - n;
    if (n === 8) return 0;
    if (n <= 15) return 16 - n;
    if (n === 16) return 0;
    if (n <= 31) return 32 - n;
    return 0;
  }

  getSimTotalClasificadosEfectivos(): number {
    const total = this.categoriaActual?.parejas?.length || 12;
    return +this.simTotalClasifican >= 999 || +this.simTotalClasifican > total
      ? total
      : +this.simTotalClasifican;
  }

  get opcionesDirectosSimulacion(): { value: number; label: string }[] {
    const n = this.getSimTotalClasificadosEfectivos();
    return this.generarOpcionesDirectos(n);
  }

  generarOpcionesDirectos(n: number): { value: number; label: string }[] {
    const fip = this.calcularDirectosOptimos(n);
    const options: { value: number; label: string }[] = [];

    if (n > 16) {
      // Siguiente fase: Octavos de Final (Fase inicial: 16avos)
      const fipLabel = fip > 0 ? `⭐ Estándar Oficial FIP (Automático: ${fip} BYE a Octavos)` : '⭐ Estándar Oficial FIP (16avos completos)';
      options.push({ value: -1, label: fipLabel });

      // Opciones manuales de BYEs a Octavos (1..15)
      const candidatas = [1, 2, 3, 4, 6, 8, 10, 12, 14, 15, fip].filter((v, idx, arr) => v > 0 && v <= 15 && arr.indexOf(v) === idx).sort((a, b) => a - b);
      candidatas.forEach(k => {
        options.push({
          value: k,
          label: k === 1 ? '👑 1º lugar directo a Octavos (1 BYE)' : `👑 Primeros ${k} directo a Octavos (${k} BYE)`
        });
      });
      options.push({ value: 0, label: '⚡ Ninguno a Octavos (16avos completos)' });
    } else if (n > 8) {
      // Siguiente fase: Cuartos de Final (4tos) (Fase inicial: Octavos)
      const fipLabel = fip > 0 ? `⭐ Estándar Oficial FIP (Automático: ${fip} BYE a 4tos)` : '⭐ Estándar Oficial FIP (Octavos completos)';
      options.push({ value: -1, label: fipLabel });

      const maxDirectos = Math.min(7, n - 2);
      for (let k = 1; k <= maxDirectos; k++) {
        options.push({
          value: k,
          label: k === 1 ? '👑 1º lugar directo a 4tos (1 BYE)' : `👑 Primeros ${k} directo a 4tos (${k} BYE)`
        });
      }
      options.push({ value: 0, label: '⚡ Ninguno a 4tos (Octavos completos)' });
    } else if (n > 4) {
      // Siguiente fase: Semifinales (Fase inicial: Cuartos)
      const fipLabel = fip > 0 ? `⭐ Estándar Oficial FIP (Automático: ${fip} BYE a Semis)` : '⭐ Estándar Oficial FIP (Cuartos completos)';
      options.push({ value: -1, label: fipLabel });

      const maxDirectos = Math.min(3, n - 2);
      for (let k = 1; k <= maxDirectos; k++) {
        options.push({
          value: k,
          label: k === 1 ? '👑 1º lugar directo a Semis (1 BYE)' : `👑 Primeros ${k} directo a Semis (${k} BYE)`
        });
      }
      options.push({ value: 0, label: '⚡ Ninguno a Semis (Cuartos completos)' });
    } else {
      // Siguiente fase: Final
      options.push({ value: -1, label: '⭐ Estándar Oficial FIP (Automático)' });
      if (n === 3) {
        options.push({ value: 1, label: '👑 1º lugar directo a la Final (1 BYE)' });
      }
      options.push({ value: 0, label: '⚡ Semifinales completas' });
    }

    return options;
  }

  toggleSimulacionPlayoffs(): void {
    const cat = this.categoriaActual;
    if (!cat || !cat.id) return;

    if (this.modoSimulacionPlayoffs) {
      this.modoSimulacionPlayoffs = false;
      return;
    }

    const totalParejas = cat.parejas?.length || 12;
    this.simTotalClasifican = 999; // Por defecto simular con TODAS las parejas de la categoría
    this.simDirectosCuartos = -1;  // -1 = Estándar Oficial FIP automático

    if (this.posicionesGrupo && this.posicionesGrupo.length > 0 && !this.grupoSeleccionadoId) {
      this.modoSimulacionPlayoffs = true;
      this.recalcularBracketSimulado();
    } else {
      this.ligaService.obtenerTablaPosiciones(null, cat.id).subscribe({
        next: (res) => {
          this.posicionesGrupo = (res && res.success && res.posiciones) ? res.posiciones : [];
          this.modoSimulacionPlayoffs = true;
          this.recalcularBracketSimulado();
        },
        error: () => {
          this.modoSimulacionPlayoffs = true;
          this.recalcularBracketSimulado();
        }
      });
    }
  }

  onSimTotalChange(): void {
    this.simDirectosCuartos = -1; // Volver al Estándar Oficial FIP al cambiar cantidad de clasificados
    this.recalcularBracketSimulado();
  }

  generarEstructuraPlayoffs(list: any[], reqClasificados: number, reqDirectos: number): {
    n: number;
    directos: number;
    targetFase: string;
    matches: any[];
    eliminadas: any[];
  } {
    const total = list.length;
    if (total < 2) {
      return { n: total, directos: 0, targetFase: '4tos', matches: [], eliminadas: [] };
    }

    let n = +reqClasificados >= 999 || +reqClasificados > total ? total : +reqClasificados;
    let directos = +reqDirectos;

    const clasificados = list.slice(0, n).map((p: any, idx: number) => {
      const rawName = p.nombre_pareja || `${p.p1_nombre || p.nombre_externo1 || 'J1'} / ${p.p2_nombre || p.nombre_externo2 || 'J2'}`;
      return {
        id: p.id || p.pareja_id || (idx + 1),
        seed: idx + 1,
        rawName,
        nombre: `${idx + 1}º ${rawName}`,
        puntos: p.puntos
      };
    });

    const eliminadas = list.slice(n).map((p: any, idx: number) => ({
      seed: n + idx + 1,
      nombre: p.nombre_pareja || 'Pareja'
    }));

    const simMatches: any[] = [];
    let targetFase = '4tos';

    if (n > 16) {
      // ==========================================
      // CASO 1: DIECISEISAVOS DE FINAL (17 a 32 parejas)
      // Los BYEs van DIRECTOS A OCTAVOS (nadie pasa directo a Cuartos desde 16avos)
      // ==========================================
      targetFase = 'Octavos';
      const fipOptimo = this.calcularDirectosOptimos(n); // 32 - n
      if (directos < 0) {
        directos = fipOptimo;
      } else {
        directos = Math.max(directos, Math.max(0, 32 - n));
      }
      directos = Math.min(directos, 15);

      const num16avos = 16 - directos;
      const directToOctavosCount = directos;

      const octavosEntries: {
        id: number | null;
        seed: number;
        nombre: string;
        isPlayInWinner?: boolean;
        playInCode?: string;
        playInLabel?: string;
        isBye?: boolean;
      }[] = [];

      for (let i = 0; i < directToOctavosCount; i++) {
        const team = clasificados[i];
        if (team) {
          octavosEntries.push({
            id: team.id,
            seed: team.seed,
            nombre: team.nombre,
            isBye: true
          });
        }
      }

      const playInTeams = clasificados.slice(directToOctavosCount, directToOctavosCount + 2 * num16avos);
      const playInMatchesCreated: {
        code: string;
        p1: any;
        p2: any;
        targetOctavosCode: string;
        targetOctavosSlot: 1 | 2;
      }[] = [];

      for (let pIdx = 0; pIdx < num16avos; pIdx++) {
        const tA = playInTeams[pIdx];
        const tB = playInTeams[playInTeams.length - 1 - pIdx];
        const piCode = `PI${pIdx + 1}`;
        octavosEntries.push({
          id: null,
          seed: tA?.seed || (directToOctavosCount + pIdx + 1),
          nombre: `Ganador 16avos ${pIdx + 1} (${tA?.seed}º vs ${tB?.seed}º)`,
          isPlayInWinner: true,
          playInCode: piCode,
          playInLabel: `${tA?.seed}º/${tB?.seed}º`
        });
        playInMatchesCreated.push({
          code: piCode,
          p1: tA,
          p2: tB,
          targetOctavosCode: '',
          targetOctavosSlot: 2
        });
      }

      const directOct = octavosEntries.filter(e => !e.isPlayInWinner);
      const playInOct = octavosEntries.filter(e => e.isPlayInWinner).reverse();
      const orderedOctavosSlots = [...directOct, ...playInOct];

      const octavosConfig = [
        { code: 'PREV1', q: 'Q1' as const, slot: 1 as const },
        { code: 'PREV2', q: 'Q1' as const, slot: 2 as const },
        { code: 'PREV3', q: 'Q2' as const, slot: 1 as const },
        { code: 'PREV4', q: 'Q2' as const, slot: 2 as const },
        { code: 'PREV5', q: 'Q3' as const, slot: 1 as const },
        { code: 'PREV6', q: 'Q3' as const, slot: 2 as const },
        { code: 'PREV7', q: 'Q4' as const, slot: 1 as const },
        { code: 'PREV8', q: 'Q4' as const, slot: 2 as const },
      ];

      const quartersMap: {
        [key in 'Q1' | 'Q2' | 'Q3' | 'Q4']: {
          p1_id: number | null;
          p1_nombre: string;
          p1_bye: boolean;
          p2_id: number | null;
          p2_nombre: string;
          p2_bye: boolean;
          next: string;
        }
      } = {
        Q1: { p1_id: null, p1_nombre: 'Ganador Octavos 1', p1_bye: false, p2_id: null, p2_nombre: 'Ganador Octavos 2', p2_bye: false, next: 'S1' },
        Q2: { p1_id: null, p1_nombre: 'Ganador Octavos 3', p1_bye: false, p2_id: null, p2_nombre: 'Ganador Octavos 4', p2_bye: false, next: 'S1' },
        Q3: { p1_id: null, p1_nombre: 'Ganador Octavos 5', p1_bye: false, p2_id: null, p2_nombre: 'Ganador Octavos 6', p2_bye: false, next: 'S2' },
        Q4: { p1_id: null, p1_nombre: 'Ganador Octavos 7', p1_bye: false, p2_id: null, p2_nombre: 'Ganador Octavos 8', p2_bye: false, next: 'S2' }
      };

      const octavosMatchesTemp: any[] = [];
      for (let k = 0; k < 8; k++) {
        const cfg = octavosConfig[k];
        const entry1 = orderedOctavosSlots[k];
        const entry2 = orderedOctavosSlots[15 - k];

        if (entry1?.isPlayInWinner && entry1.playInCode) {
          const pi = playInMatchesCreated.find(x => x.code === entry1.playInCode);
          if (pi) { pi.targetOctavosCode = cfg.code; pi.targetOctavosSlot = 1; }
        }
        if (entry2?.isPlayInWinner && entry2.playInCode) {
          const pi = playInMatchesCreated.find(x => x.code === entry2.playInCode);
          if (pi) { pi.targetOctavosCode = cfg.code; pi.targetOctavosSlot = 2; }
        }

        octavosMatchesTemp.push({
          es_simulacion: true,
          ronda_playoff: 'Octavos de Final',
          pareja1_id: entry1?.id || null,
          pareja2_id: entry2?.id || null,
          pareja1_nombre: entry1?.nombre || 'Por definir',
          pareja2_nombre: entry2?.nombre || 'Por definir',
          meta_playoff: {
            bracket_code: cfg.code,
            next_bracket: cfg.q,
            next_slot: cfg.slot,
            seed1_label: entry1?.nombre,
            seed2_label: entry2?.nombre,
            seed1_is_bye: entry1?.isBye || false,
            seed2_is_bye: entry2?.isBye || false
          }
        });

        const s1Short = entry1?.isPlayInWinner ? `16avos (${entry1.playInLabel})` : `${entry1?.seed}º`;
        const s2Short = entry2?.isPlayInWinner ? `16avos (${entry2.playInLabel})` : `${entry2?.seed}º`;
        const winnerLabel = `Ganador Octavos ${k + 1} (${s1Short} vs ${s2Short})`;
        if (cfg.slot === 1) {
          quartersMap[cfg.q].p1_nombre = winnerLabel;
        } else {
          quartersMap[cfg.q].p2_nombre = winnerLabel;
        }
      }

      playInMatchesCreated.forEach(pi => {
        simMatches.push({
          es_simulacion: true,
          ronda_playoff: 'Dieciseisavos de Final',
          pareja1_id: pi.p1?.id || null,
          pareja2_id: pi.p2?.id || null,
          pareja1_nombre: pi.p1?.nombre || 'Por definir',
          pareja2_nombre: pi.p2?.nombre || 'Por definir',
          meta_playoff: {
            bracket_code: pi.code,
            next_bracket: pi.targetOctavosCode || 'PREV1',
            next_slot: pi.targetOctavosSlot,
            seed1_label: pi.p1?.nombre,
            seed2_label: pi.p2?.nombre
          }
        });
      });

      simMatches.push(...octavosMatchesTemp);

      (['Q1', 'Q2', 'Q3', 'Q4'] as const).forEach((qCode) => {
        const q = quartersMap[qCode];
        simMatches.push({
          es_simulacion: true,
          ronda_playoff: 'Cuartos de Final',
          pareja1_id: null,
          pareja2_id: null,
          pareja1_nombre: q.p1_nombre,
          pareja2_nombre: q.p2_nombre,
          meta_playoff: {
            bracket_code: qCode,
            next_bracket: q.next
          }
        });
      });

      simMatches.push(
        { es_simulacion: true, ronda_playoff: 'Semifinales', pareja1_nombre: 'Ganador Cuartos 1 (Q1)', pareja2_nombre: 'Ganador Cuartos 2 (Q2)' },
        { es_simulacion: true, ronda_playoff: 'Semifinales', pareja1_nombre: 'Ganador Cuartos 3 (Q3)', pareja2_nombre: 'Ganador Cuartos 4 (Q4)' },
        { es_simulacion: true, ronda_playoff: 'Final', pareja1_nombre: 'Ganador Semifinal 1', pareja2_nombre: 'Ganador Semifinal 2' }
      );

    } else if (n > 8) {
      // ==========================================
      // CASO 2: OCTAVOS DE FINAL (9 a 16 parejas)
      // Los BYEs van DIRECTOS A CUARTOS (4tos)
      // ==========================================
      targetFase = '4tos';
      const fipOptimo = this.calcularDirectosOptimos(n); // 16 - n
      if (directos < 0) {
        directos = fipOptimo;
      } else {
        directos = Math.max(directos, 16 - n);
      }
      directos = Math.min(directos, 7);

      const qOpenSlots = 8 - directos;
      const octavosCapacity = qOpenSlots * 2;

      const octavosEntries: {
        id: number | null;
        seed: number;
        nombre: string;
      }[] = [];

      for (let i = 0; i < octavosCapacity; i++) {
        const team = clasificados[directos + i];
        if (team) {
          octavosEntries.push({ id: team.id, seed: team.seed, nombre: team.nombre });
        }
      }

      const quarterSlotForTop8: { [seedPos: number]: { q: 'Q1' | 'Q2' | 'Q3' | 'Q4'; slot: 1 | 2 } } = {
        1: { q: 'Q1', slot: 1 },
        2: { q: 'Q4', slot: 1 },
        3: { q: 'Q3', slot: 1 },
        4: { q: 'Q2', slot: 1 },
        5: { q: 'Q2', slot: 2 },
        6: { q: 'Q3', slot: 2 },
        7: { q: 'Q4', slot: 2 },
        8: { q: 'Q1', slot: 2 }
      };

      const quartersMap: {
        [key in 'Q1' | 'Q2' | 'Q3' | 'Q4']: {
          p1_id: number | null;
          p1_nombre: string;
          p1_bye: boolean;
          p2_id: number | null;
          p2_nombre: string;
          p2_bye: boolean;
          next: string;
        }
      } = {
        Q1: { p1_id: null, p1_nombre: 'Por definir', p1_bye: false, p2_id: null, p2_nombre: 'Por definir', p2_bye: false, next: 'S1' },
        Q2: { p1_id: null, p1_nombre: 'Por definir', p1_bye: false, p2_id: null, p2_nombre: 'Por definir', p2_bye: false, next: 'S1' },
        Q3: { p1_id: null, p1_nombre: 'Por definir', p1_bye: false, p2_id: null, p2_nombre: 'Por definir', p2_bye: false, next: 'S2' },
        Q4: { p1_id: null, p1_nombre: 'Por definir', p1_bye: false, p2_id: null, p2_nombre: 'Por definir', p2_bye: false, next: 'S2' }
      };

      for (let s = 1; s <= directos; s++) {
        const team = clasificados[s - 1];
        const target = quarterSlotForTop8[s];
        if (team && target) {
          if (target.slot === 1) {
            quartersMap[target.q].p1_id = team.id;
            quartersMap[target.q].p1_nombre = team.nombre;
            quartersMap[target.q].p1_bye = true;
          } else {
            quartersMap[target.q].p2_id = team.id;
            quartersMap[target.q].p2_nombre = team.nombre;
            quartersMap[target.q].p2_bye = true;
          }
        }
      }

      const octavosMatchesTemp: any[] = [];
      for (let k = 0; k < qOpenSlots; k++) {
        const top8SlotNum = directos + 1 + k;
        const entry1 = octavosEntries[k];
        const entry2 = octavosEntries[octavosEntries.length - 1 - k];
        const target = quarterSlotForTop8[top8SlotNum] || { q: 'Q1', slot: 2 };
        const prevNum = k + 1;
        const code = `PREV${prevNum}`;

        octavosMatchesTemp.push({
          es_simulacion: true,
          ronda_playoff: 'Octavos de Final',
          pareja1_id: entry1?.id || null,
          pareja2_id: entry2?.id || null,
          pareja1_nombre: entry1?.nombre || 'Por definir',
          pareja2_nombre: entry2?.nombre || 'Por definir',
          meta_playoff: {
            bracket_code: code,
            next_bracket: target.q,
            next_slot: target.slot,
            seed1_label: entry1?.nombre,
            seed2_label: entry2?.nombre
          }
        });

        const winnerLabel = `Ganador Octavos ${prevNum} (${entry1?.seed}º vs ${entry2?.seed}º)`;
        if (target.slot === 1) {
          quartersMap[target.q].p1_nombre = winnerLabel;
        } else {
          quartersMap[target.q].p2_nombre = winnerLabel;
        }
      }

      simMatches.push(...octavosMatchesTemp);

      (['Q1', 'Q2', 'Q3', 'Q4'] as const).forEach((qCode) => {
        const q = quartersMap[qCode];
        simMatches.push({
          es_simulacion: true,
          ronda_playoff: 'Cuartos de Final',
          pareja1_id: q.p1_id,
          pareja2_id: q.p2_id,
          pareja1_nombre: q.p1_nombre,
          pareja2_nombre: q.p2_nombre,
          meta_playoff: {
            bracket_code: qCode,
            next_bracket: q.next,
            seed1_label: q.p1_bye ? q.p1_nombre : '',
            seed2_label: q.p2_bye ? q.p2_nombre : '',
            seed1_is_bye: q.p1_bye,
            seed2_is_bye: q.p2_bye
          }
        });
      });

      simMatches.push(
        { es_simulacion: true, ronda_playoff: 'Semifinales', pareja1_nombre: 'Ganador Cuartos 1 (Q1)', pareja2_nombre: 'Ganador Cuartos 2 (Q2)' },
        { es_simulacion: true, ronda_playoff: 'Semifinales', pareja1_nombre: 'Ganador Cuartos 3 (Q3)', pareja2_nombre: 'Ganador Cuartos 4 (Q4)' },
        { es_simulacion: true, ronda_playoff: 'Final', pareja1_nombre: 'Ganador Semifinal 1', pareja2_nombre: 'Ganador Semifinal 2' }
      );

    } else if (n > 4) {
      // ==========================================
      // CASO 3: CUARTOS DE FINAL (5 a 8 parejas)
      // Los BYEs van DIRECTOS A SEMIFINALES
      // ==========================================
      targetFase = 'Semis';
      const fipOptimo = this.calcularDirectosOptimos(n); // 8 - n
      if (directos < 0) {
        directos = fipOptimo;
      } else {
        directos = Math.max(directos, 8 - n);
      }
      directos = Math.min(directos, 3);

      if (directos === 0 && n === 8) {
        simMatches.push(
          { es_simulacion: true, ronda_playoff: 'Cuartos de Final', pareja1_id: clasificados[0]?.id, pareja2_id: clasificados[7]?.id, pareja1_nombre: clasificados[0]?.nombre, pareja2_nombre: clasificados[7]?.nombre, meta_playoff: { bracket_code: 'Q1', next_bracket: 'S1', next_slot: 1 } },
          { es_simulacion: true, ronda_playoff: 'Cuartos de Final', pareja1_id: clasificados[3]?.id, pareja2_id: clasificados[4]?.id, pareja1_nombre: clasificados[3]?.nombre, pareja2_nombre: clasificados[4]?.nombre, meta_playoff: { bracket_code: 'Q2', next_bracket: 'S1', next_slot: 2 } },
          { es_simulacion: true, ronda_playoff: 'Cuartos de Final', pareja1_id: clasificados[2]?.id, pareja2_id: clasificados[5]?.id, pareja1_nombre: clasificados[2]?.nombre, pareja2_nombre: clasificados[5]?.nombre, meta_playoff: { bracket_code: 'Q3', next_bracket: 'S2', next_slot: 1 } },
          { es_simulacion: true, ronda_playoff: 'Cuartos de Final', pareja1_id: clasificados[1]?.id, pareja2_id: clasificados[6]?.id, pareja1_nombre: clasificados[1]?.nombre, pareja2_nombre: clasificados[6]?.nombre, meta_playoff: { bracket_code: 'Q4', next_bracket: 'S2', next_slot: 2 } },
          { es_simulacion: true, ronda_playoff: 'Semifinales', pareja1_nombre: 'Ganador Cuartos 1 (Q1)', pareja2_nombre: 'Ganador Cuartos 2 (Q2)' },
          { es_simulacion: true, ronda_playoff: 'Semifinales', pareja1_nombre: 'Ganador Cuartos 3 (Q3)', pareja2_nombre: 'Ganador Cuartos 4 (Q4)' },
          { es_simulacion: true, ronda_playoff: 'Final', pareja1_nombre: 'Ganador Semifinal 1', pareja2_nombre: 'Ganador Semifinal 2' }
        );
      } else {
        const semisMap = {
          S1: { p1_id: null as number | null, p1_nombre: 'Ganador Cuartos 1', p1_bye: false, p2_id: null as number | null, p2_nombre: 'Ganador Cuartos 2', p2_bye: false },
          S2: { p1_id: null as number | null, p1_nombre: 'Ganador Cuartos 3', p1_bye: false, p2_id: null as number | null, p2_nombre: 'Ganador Cuartos 4', p2_bye: false }
        };

        const semiSlotForTop4: { [seed: number]: { s: 'S1' | 'S2'; slot: 1 | 2 } } = {
          1: { s: 'S1', slot: 1 },
          2: { s: 'S2', slot: 1 },
          3: { s: 'S2', slot: 2 },
          4: { s: 'S1', slot: 2 }
        };

        for (let s = 1; s <= directos; s++) {
          const team = clasificados[s - 1];
          const target = semiSlotForTop4[s];
          if (team && target) {
            if (target.slot === 1) {
              semisMap[target.s].p1_id = team.id;
              semisMap[target.s].p1_nombre = team.nombre;
              semisMap[target.s].p1_bye = true;
            } else {
              semisMap[target.s].p2_id = team.id;
              semisMap[target.s].p2_nombre = team.nombre;
              semisMap[target.s].p2_bye = true;
            }
          }
        }

        const qMatchesCount = 4 - directos;
        const qTeams = clasificados.slice(directos, directos + 2 * qMatchesCount);

        for (let k = 0; k < qMatchesCount; k++) {
          const t1 = qTeams[k];
          const t2 = qTeams[qTeams.length - 1 - k];
          const topSeedSlot = directos + 1 + k;
          const target = semiSlotForTop4[topSeedSlot] || { s: 'S1', slot: 2 };
          const qCode = `Q${k + 1}`;

          simMatches.push({
            es_simulacion: true,
            ronda_playoff: 'Cuartos de Final',
            pareja1_id: t1?.id || null,
            pareja2_id: t2?.id || null,
            pareja1_nombre: t1?.nombre || 'Por definir',
            pareja2_nombre: t2?.nombre || 'Por definir',
            meta_playoff: {
              bracket_code: qCode,
              next_bracket: target.s,
              next_slot: target.slot
            }
          });

          const winnerLabel = `Ganador Cuartos ${k + 1} (${t1?.seed}º vs ${t2?.seed}º)`;
          if (target.slot === 1) {
            semisMap[target.s].p1_nombre = winnerLabel;
          } else {
            semisMap[target.s].p2_nombre = winnerLabel;
          }
        }

        simMatches.push(
          {
            es_simulacion: true,
            ronda_playoff: 'Semifinales',
            pareja1_id: semisMap.S1.p1_id,
            pareja2_id: semisMap.S1.p2_id,
            pareja1_nombre: semisMap.S1.p1_nombre,
            pareja2_nombre: semisMap.S1.p2_nombre,
            meta_playoff: { bracket_code: 'S1', next_bracket: 'F1', seed1_is_bye: semisMap.S1.p1_bye, seed2_is_bye: semisMap.S1.p2_bye }
          },
          {
            es_simulacion: true,
            ronda_playoff: 'Semifinales',
            pareja1_id: semisMap.S2.p1_id,
            pareja2_id: semisMap.S2.p2_id,
            pareja1_nombre: semisMap.S2.p1_nombre,
            pareja2_nombre: semisMap.S2.p2_nombre,
            meta_playoff: { bracket_code: 'S2', next_bracket: 'F1', seed1_is_bye: semisMap.S2.p1_bye, seed2_is_bye: semisMap.S2.p2_bye }
          },
          { es_simulacion: true, ronda_playoff: 'Final', pareja1_nombre: 'Ganador Semifinal 1', pareja2_nombre: 'Ganador Semifinal 2' }
        );
      }

    } else if (n >= 4) {
      targetFase = 'la Final';
      simMatches.push(
        { es_simulacion: true, ronda_playoff: 'Semifinales', pareja1_id: clasificados[0]?.id, pareja2_id: clasificados[3]?.id, pareja1_nombre: clasificados[0]?.nombre, pareja2_nombre: clasificados[3]?.nombre },
        { es_simulacion: true, ronda_playoff: 'Semifinales', pareja1_id: clasificados[1]?.id, pareja2_id: clasificados[2]?.id, pareja1_nombre: clasificados[1]?.nombre, pareja2_nombre: clasificados[2]?.nombre },
        { es_simulacion: true, ronda_playoff: 'Final', pareja1_nombre: 'Ganador Semifinal 1', pareja2_nombre: 'Ganador Semifinal 2' }
      );
    } else {
      targetFase = 'la Final';
      simMatches.push({
        es_simulacion: true,
        ronda_playoff: 'Final',
        pareja1_id: clasificados[0]?.id,
        pareja2_id: clasificados[1]?.id,
        pareja1_nombre: clasificados[0]?.nombre,
        pareja2_nombre: clasificados[1]?.nombre
      });
    }

    return { n, directos, targetFase, matches: simMatches, eliminadas };
  }

  recalcularBracketSimulado(): void {
    const cat = this.categoriaActual;
    const list = (this.posicionesGrupo && this.posicionesGrupo.length > 0) ? this.posicionesGrupo : (cat?.parejas || []);
    const res = this.generarEstructuraPlayoffs(list, +this.simTotalClasifican, +this.simDirectosCuartos);
    this.playoffsSimuladosList = res.matches;
  }

  programarFasePlayoff(ronda: 'Dieciseisavos de Final' | 'Repechaje (Play-In)' | 'Octavos de Final' | 'Cuartos de Final' | 'Semifinales' | 'Final', matches?: any[]): void {
    const cat = this.categoriaActual;
    if (!cat || !cat.id) return;

    const listaPartidos = matches || (cat.playoffs || []).filter((m: any) =>
      m.ronda_playoff === ronda ||
      (ronda === 'Dieciseisavos de Final' && m.ronda_playoff === 'Repechaje (Play-In)') ||
      (ronda === 'Octavos de Final' && m.ronda_playoff === 'Ronda Previa')
    );
    const partidoIds = listaPartidos.map((m: any) => +m.id).filter((id: number) => id > 0);

    this.jornadaParaProgramarSemanal = {
      es_playoff: true,
      categoria_id: cat.id,
      ronda_playoff: ronda,
      nombre: `${ronda} — ${cat.nombre}`,
      numero_jornada: 1,
      partido_ids: partidoIds,
      dias_preferidos: (cat.dias_juego && cat.dias_juego.length > 0) ? cat.dias_juego : []
    };
  }

  async ejecutarGeneracionYProgramacionPlayoffs(
    catId: number,
    total: number,
    directos: number,
    programacionConfig?: {
      programarAhora: boolean;
      fases: { ronda: string; fecha_inicio: string; dias_semana: string[] }[];
      horarios: string[];
      canchas_ids: number[];
    }
  ): Promise<void> {
    Swal.fire({
      title: '🏆 Generando Cuadro y Programando...',
      text: 'Creando llaves eliminatorias y asignando canchas y horarios.',
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); }
    });

    try {
      const res: any = await this.ligaService.generarPlayoffs(catId, total, directos).toPromise();
      if (!res || !res.success) {
        Swal.fire('Atención', res?.error || 'Error al generar playoffs', 'warning');
        return;
      }

      let msgExtra = '';
      if (programacionConfig && programacionConfig.programarAhora && programacionConfig.fases.length > 0) {
        let totalProg = 0;
        for (const f of programacionConfig.fases) {
          if (!f.fecha_inicio || !f.dias_semana || f.dias_semana.length === 0) continue;
          const resProg: any = await this.ligaService.programarJornadaSemanal({
            categoria_id: catId,
            ronda_playoff: f.ronda,
            fecha_inicio: f.fecha_inicio,
            dias_semana: f.dias_semana,
            horarios: programacionConfig.horarios,
            canchas_ids: programacionConfig.canchas_ids,
            respetar_restricciones: true,
            max_partidos_por_pareja: 0,
            duracion_minutos: 90
          }).toPromise();
          if (resProg && resProg.success) {
            totalProg += (resProg.programados || 0);
          }
        }
        if (totalProg > 0) {
          msgExtra = ` Se asignaron automáticamente horario y cancha a ${totalProg} partido(s) en la semana definida.`;
        }
      }

      this.modoSimulacionPlayoffs = false;
      Swal.fire({
        title: '🏆 ¡Playoffs Creados y Programados!',
        text: (res.mensaje || 'Cuadro de Playoffs creado exitosamente.') + msgExtra,
        icon: 'success',
        timer: 3000,
        showConfirmButton: false
      });
      this.cargarLiga();
      this.activeTab = 'playoffs';
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Error de servidor al generar o programar los playoffs.', 'error');
      this.cargarLiga();
    }
  }

  confirmarPlayoffsDesdeSimulacion(): void {
    this.generarPlayoffsCategoria(+this.simTotalClasifican, +this.simDirectosCuartos);
  }

  borrarPlayoffsCategoria(): void {
    const cat = this.categoriaActual;
    if (!cat || !cat.playoffs || cat.playoffs.length === 0) return;

    Swal.fire({
      title: '¿Borrar Cuadro de Playoffs?',
      html: `<p style="color:#334155; font-size:0.92rem;">Se eliminarán únicamente los <strong>${cat.playoffs.length} partidos de Fase Final (Playoffs)</strong> de <strong>${cat.nombre}</strong>.</p><div style="background:#f0fdf4; border:1px solid #bbf7d0; color:#15803d; padding:10px 12px; border-radius:10px; font-size:0.82rem; font-weight:700;">✅ Todos los partidos, resultados y posiciones de la Fase Regular se mantienen 100% intactos.</div>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      confirmButtonText: '🗑️ Sí, borrar cuadro de Playoffs',
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    }).then(async (result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: 'Eliminando cuadro de Playoffs...',
          text: 'Por favor espera un momento.',
          allowOutsideClick: false,
          didOpen: () => { Swal.showLoading(); }
        });
        try {
          for (const m of cat.playoffs) {
            if (m && m.id) {
              await this.ligaService.eliminarPartido(+m.id).toPromise();
            }
          }
          Swal.fire({
            title: '¡Cuadro de Playoffs Eliminado!',
            text: 'Se eliminaron las llaves de Fase Final sin afectar los partidos regulares.',
            icon: 'success',
            timer: 2200,
            showConfirmButton: false
          });
          this.cargarLiga();
        } catch (err) {
          console.error(err);
          Swal.fire('Error', 'Ocurrió un problema al eliminar los partidos de playoffs.', 'error');
          this.cargarLiga();
        }
      }
    });
  }

  generarPlayoffsCategoria(initTotal?: number, initDirectos?: number): void {
    const cat = this.categoriaActual;
    if (!cat || !cat.id) return;

    // Asegurar que tenemos la tabla de posiciones consolidada de la categoría
    const abrirModalConRanking = (rankingList: any[]) => {
      const list = rankingList && rankingList.length > 0 ? rankingList : (cat.parejas || []);
      const totalParejas = list.length || (cat.parejas?.length || 12);
      const defaultClasifican = initTotal !== undefined ? initTotal : 999; // Por defecto clasificar a TODAS las parejas inscritas
      const defaultDirectos = initDirectos !== undefined ? initDirectos : -1; // -1 = Estándar Oficial FIP

      const catDias = (cat.dias_juego && Array.isArray(cat.dias_juego) && cat.dias_juego.length > 0)
        ? cat.dias_juego
        : ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
      const diasTodos = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

      const addDaysIso = (baseIso: string, add: number): string => {
        const dt = new Date(baseIso + 'T12:00:00');
        dt.setDate(dt.getDate() + add);
        return dt.toISOString().split('T')[0];
      };
      const baseTodayIso = new Date().toISOString().split('T')[0];
      const canchasClub = this.liga?.canchas || [];

      const construirSimulacionHtml = (reqClasificados: number, reqDirectos: number): string => {
        if (list.length < 2) {
          return `<div style="color: #dc2626; font-weight: 700;">Se necesitan al menos 2 parejas inscritas para simular el cuadro.</div>`;
        }

        const est = this.generarEstructuraPlayoffs(list, reqClasificados, reqDirectos);
        const playInMatches = est.matches.filter(m => m.ronda_playoff === 'Dieciseisavos de Final' || m.ronda_playoff === 'Repechaje (Play-In)');
        const octavosMatches = est.matches.filter(m => m.ronda_playoff === 'Octavos de Final');
        const cuartosMatches = est.matches.filter(m => m.ronda_playoff === 'Cuartos de Final');
        const semisMatches = est.matches.filter(m => m.ronda_playoff === 'Semifinales');

        const rowMatch = (label: string, p1Html: string, p2Html: string, dest: string = '') => `
          <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; background:#ffffff; border:1px solid #e2e8f0; border-radius:8px; padding:6px 10px; margin-bottom:5px; font-size:0.78rem;">
            <span style="font-weight:800; color:#475569; min-width:64px; font-size:0.72rem;">${label}</span>
            <div style="flex:1; display:flex; align-items:center; justify-content:space-between; gap:6px; overflow:hidden;">
              <span style="font-weight:700; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:45%;">${p1Html}</span>
              <span style="font-weight:800; color:#94a3b8; font-size:0.7rem;">VS</span>
              <span style="font-weight:700; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:45%; text-align:right;">${p2Html}</span>
            </div>
            ${dest ? `<span style="font-size:0.68rem; font-weight:700; color:#2563eb; background:#eff6ff; padding:2px 6px; border-radius:5px; white-space:nowrap;">→ ${dest}</span>` : ''}
          </div>
        `;

        let badgeDirectos = 'Cuadro Directo';
        if (est.directos > 0) {
          const destFase = est.targetFase || 'siguiente fase';
          if (est.n > 16) {
            badgeDirectos = `${est.directos} Directos a ${destFase} (BYE) + ${playInMatches.length} en 16avos`;
          } else if (est.n > 8) {
            badgeDirectos = `${est.directos} Directos a ${destFase} (BYE) + ${octavosMatches.length} en Octavos`;
          } else if (est.n > 4) {
            badgeDirectos = `${est.directos} Directos a ${destFase} (BYE) + ${cuartosMatches.length} en Cuartos`;
          } else {
            badgeDirectos = `${est.directos} Directos a ${destFase} (BYE)`;
          }
        } else if (playInMatches.length > 0) {
          badgeDirectos = `${playInMatches.length} llave(s) 16avos + 8 Octavos`;
        } else if (octavosMatches.length > 0) {
          badgeDirectos = `${octavosMatches.length} llaves de Octavos`;
        }

        let html = `
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
            <strong style="color:#1e3a8a; font-size:0.82rem;">🔮 Simulación en Vivo con Ranking Actual (${est.n} de ${totalParejas} parejas)</strong>
            <span style="font-size:0.72rem; font-weight:700; color:#1d4ed8; background:#dbeafe; padding:2px 8px; border-radius:99px;">
              ${badgeDirectos}
            </span>
          </div>
        `;

        if (playInMatches.length > 0) {
          html += `<div style="font-weight:800; font-size:0.73rem; color:#7c3aed; text-transform:uppercase; letter-spacing:0.03em; margin:6px 0 4px;">🔥 Dieciseisavos de Final (${playInMatches.length} partido${playInMatches.length > 1 ? 's' : ''})</div>`;
          playInMatches.forEach((m, i) => {
            html += rowMatch(`16avos #${i + 1}`, m.pareja1_nombre, m.pareja2_nombre, m.meta_playoff?.next_bracket || 'Octavos');
          });
        }

        if (octavosMatches.length > 0) {
          html += `<div style="font-weight:800; font-size:0.73rem; color:#475569; text-transform:uppercase; letter-spacing:0.03em; margin:6px 0 4px;">⚡ Octavos de Final / Ronda Previa (${octavosMatches.length} partidos)</div>`;
          octavosMatches.forEach((m, i) => {
            html += rowMatch(`Octavos #${i + 1}`, m.pareja1_nombre, m.pareja2_nombre, m.meta_playoff?.next_bracket || '4tos');
          });
        }

        if (cuartosMatches.length > 0) {
          html += `<div style="font-weight:800; font-size:0.73rem; color:#b45309; text-transform:uppercase; letter-spacing:0.03em; margin:10px 0 4px;">👑 Cuartos de Final (4 llaves)</div>`;
          cuartosMatches.forEach((m, i) => {
            html += rowMatch(`Cuartos Q${i + 1}`, m.pareja1_nombre, m.pareja2_nombre, m.meta_playoff?.next_bracket || 'Semis');
          });
        } else if (semisMatches.length > 0) {
          html += `<div style="font-weight:800; font-size:0.73rem; color:#475569; text-transform:uppercase; letter-spacing:0.03em; margin:6px 0 4px;">🏆 Semifinales Directas</div>`;
          semisMatches.forEach((m, i) => {
            html += rowMatch(`Semifinal S${i + 1}`, m.pareja1_nombre, m.pareja2_nombre, 'Final');
          });
        }

        if (est.eliminadas.length > 0) {
          const elimStr = est.eliminadas.map(e => `${e.seed}º ${e.nombre}`).join(' · ');
          html += `<div style="margin-top:6px; font-size:0.72rem; color:#dc2626;"><strong>Fuera del corte (${est.eliminadas.length}):</strong> ${elimStr}</div>`;
        } else {
          html += `<div style="margin-top:6px; font-size:0.72rem; color:#15803d; font-weight:700;">✅ ¡Las ${est.n} parejas entran al cuadro eliminatorio!</div>`;
        }

        return html;
      };

      const renderFaseRow = (idx: number, rondaKey: string, label: string, defaultDate: string) => {
        const diasChecks = diasTodos.map(d => {
          const checked = catDias.includes(d) ? 'checked' : '';
          return `
            <label style="display:inline-flex; align-items:center; gap:3px; font-size:0.72rem; font-weight:700; background:#ffffff; border:1px solid #cbd5e1; border-radius:7px; padding:3px 7px; cursor:pointer;">
              <input type="checkbox" class="swal-fase-dia-${idx}" value="${d}" ${checked} style="margin:0;" />
              ${d.slice(0, 3)}
            </label>
          `;
        }).join('');

        return `
          <div class="swal-fase-row" data-ronda="${rondaKey}" data-idx="${idx}" style="background:#ffffff; border:1px solid #e2e8f0; border-radius:10px; padding:9px 11px; margin-bottom:7px;">
            <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap; margin-bottom:6px;">
              <strong style="font-size:0.78rem; color:#0f172a;">${label}</strong>
              <div style="display:flex; align-items:center; gap:6px;">
                <span style="font-size:0.72rem; font-weight:700; color:#475569;">Semana / Inicio:</span>
                <input type="date" id="swal-fase-fecha-${idx}" value="${defaultDate}" style="height:28px; border-radius:7px; border:1px solid #cbd5e1; padding:0 8px; font-size:0.75rem; font-weight:700; color:#0f172a;" />
              </div>
            </div>
            <div style="display:flex; align-items:center; gap:4px; flex-wrap:wrap;">
              <span style="font-size:0.7rem; font-weight:800; color:#64748b; margin-right:3px;">Días:</span>
              ${diasChecks}
            </div>
          </div>
        `;
      };

      const construirFasesProgramacionHtml = (reqClasificados: number, reqDirectos: number): string => {
        const est = this.generarEstructuraPlayoffs(list, reqClasificados, reqDirectos);
        const fasesActivas: { ronda: string; label: string }[] = [];
        if (est.matches.some(m => m.ronda_playoff === 'Dieciseisavos de Final' || m.ronda_playoff === 'Repechaje (Play-In)')) {
          fasesActivas.push({ ronda: 'Dieciseisavos de Final', label: '🔥 Fase 0: Dieciseisavos de Final' });
        }
        if (est.matches.some(m => m.ronda_playoff === 'Octavos de Final')) {
          fasesActivas.push({ ronda: 'Octavos de Final', label: '1️⃣ Fase 1: Octavos de Final / Ronda Previa' });
        }
        if (est.matches.some(m => m.ronda_playoff === 'Cuartos de Final')) {
          fasesActivas.push({ ronda: 'Cuartos de Final', label: '2️⃣ Fase 2: Cuartos de Final' });
        }
        if (est.matches.some(m => m.ronda_playoff === 'Semifinales')) {
          fasesActivas.push({ ronda: 'Semifinales', label: '3️⃣ Fase 3: Semifinales' });
        }
        if (est.matches.some(m => m.ronda_playoff === 'Final')) {
          fasesActivas.push({ ronda: 'Final', label: '🏆 Fase 4: Gran Final' });
        }

        return fasesActivas.map((f, i) => renderFaseRow(i, f.ronda, f.label, addDaysIso(baseTodayIso, i * 7))).join('');
      };

      const canchasChecksHtml = canchasClub.length > 0
        ? canchasClub.map((c: any) => `
            <label style="display:inline-flex; align-items:center; gap:4px; font-size:0.74rem; font-weight:700; background:#ffffff; border:1px solid #cbd5e1; border-radius:8px; padding:4px 8px; cursor:pointer;">
              <input type="checkbox" class="swal-playoff-cancha" value="${c.id}" checked style="margin:0;" />
              📍 ${c.nombre}
            </label>
          `).join('')
        : `<span style="font-size:0.74rem; color:#64748b;">Se asignarán automáticamente las canchas activas del club.</span>`;

      const construirOpcionesDirectosHtml = (reqClasificados: number, selectedVal: number): string => {
        const tVal = reqClasificados >= 999 || reqClasificados > totalParejas ? totalParejas : reqClasificados;
        const opts = this.generarOpcionesDirectos(tVal);
        return opts.map(o => `<option value="${o.value}" ${selectedVal === o.value ? 'selected' : ''}>${o.label}</option>`).join('');
      };

      Swal.fire({
        title: '🏆 Configurar y Programar Fase Final',
        width: '720px',
        html: `
          <div style="text-align: left; font-size: 0.9rem; color: #334155; font-family: inherit;">
            <p style="margin-bottom: 12px; font-size: 0.85rem; color: #64748b;">
              Configura el cuadro de eliminación directa y define los días, horarios y canchas de cada fase para <strong>${cat.nombre}</strong> (${totalParejas} parejas):
            </p>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
              <div>
                <label style="font-weight: 800; font-size: 0.78rem; color: #0f172a; display: block; margin-bottom: 5px;">
                  1️⃣ Parejas que Clasifican:
                </label>
                <select id="swal-total-clasifican" class="swal2-input" style="width: 100%; margin: 0; font-weight: 700; font-size: 0.83rem; height: 40px; border-radius: 10px; border-color: #cbd5e1; padding: 0 10px;">
                  <option value="999" ${defaultClasifican >= 999 ? 'selected' : ''}>Todas las parejas (${totalParejas})</option>
                  ${totalParejas >= 32 ? `<option value="32" ${defaultClasifican === 32 ? 'selected' : ''}>Top 32 (16avos completos)</option>` : ''}
                  ${totalParejas >= 24 ? `<option value="24" ${defaultClasifican === 24 ? 'selected' : ''}>Top 24 (8 BYE a Octavos + 8 en 16avos)</option>` : ''}
                  ${totalParejas >= 20 ? `<option value="20" ${defaultClasifican === 20 ? 'selected' : ''}>Top 20 (12 BYE a Octavos + 4 en 16avos)</option>` : ''}
                  ${totalParejas >= 18 ? `<option value="18" ${defaultClasifican === 18 ? 'selected' : ''}>Top 18 (14 BYE a Octavos + 2 en 16avos)</option>` : ''}
                  <option value="16" ${defaultClasifican === 16 ? 'selected' : ''}>Top 16 (Octavos completos)</option>
                  <option value="14" ${defaultClasifican === 14 ? 'selected' : ''}>Top 14 (2 BYE a 4tos + 6 Octavos)</option>
                  <option value="12" ${defaultClasifican === 12 ? 'selected' : ''}>Top 12 (4 BYE a 4tos + 4 Octavos)</option>
                  <option value="10" ${defaultClasifican === 10 ? 'selected' : ''}>Top 10 (6 BYE a 4tos + 2 Octavos)</option>
                  <option value="8" ${defaultClasifican === 8 ? 'selected' : ''}>Top 8 (Cuartos directos)</option>
                  <option value="4" ${defaultClasifican === 4 ? 'selected' : ''}>Top 4 (Semifinales directas)</option>
                </select>
              </div>

              <div>
                <label style="font-weight: 800; font-size: 0.78rem; color: #0f172a; display: block; margin-bottom: 5px;">
                  2️⃣ Pases Directos (BYE a siguiente fase):
                </label>
                <select id="swal-directos-cuartos" class="swal2-input" style="width: 100%; margin: 0; font-weight: 700; font-size: 0.83rem; height: 40px; border-radius: 10px; border-color: #cbd5e1; padding: 0 10px;">
                  ${construirOpcionesDirectosHtml(defaultClasifican, defaultDirectos)}
                </select>
              </div>
            </div>

            <!-- SECCIÓN 3: PROGRAMACIÓN DE SEMANA, DÍAS, HORARIOS Y CANCHAS POR FASE -->
            <div style="background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 12px; padding: 12px; margin-bottom: 12px;">
              <label style="display:flex; align-items:center; justify-content:space-between; cursor:pointer; margin-bottom:8px;">
                <span style="font-weight:800; font-size:0.83rem; color:#14532d;">📅 3️⃣ Definir Semana, Días, Horarios y Canchas por cada Fase</span>
                <input type="checkbox" id="swal-programar-ahora" checked style="width:18px; height:18px; accent-color:#16a34a;" />
              </label>

              <div id="swal-programacion-container">
                <div id="swal-fases-list">
                  ${construirFasesProgramacionHtml(defaultClasifican, defaultDirectos)}
                </div>

                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top:8px; background:#ffffff; border:1px solid #dcfce7; border-radius:10px; padding:9px 11px;">
                  <div>
                    <label style="font-weight:800; font-size:0.73rem; color:#0f172a; display:block; margin-bottom:4px;">⏰ Horarios (bloques de 90 min):</label>
                    <input type="text" id="swal-playoff-horarios" value="18:00, 19:30, 21:00" style="width:100%; height:32px; border-radius:7px; border:1px solid #cbd5e1; padding:0 8px; font-size:0.76rem; font-weight:700; color:#0f172a; box-sizing:border-box;" />
                  </div>
                  <div>
                    <label style="font-weight:800; font-size:0.73rem; color:#0f172a; display:block; margin-bottom:4px;">🏟️ Canchas a utilizar:</label>
                    <div style="display:flex; flex-wrap:wrap; gap:4px; max-height:60px; overflow-y:auto;">
                      ${canchasChecksHtml}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div id="swal-preview-box" style="background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 12px; font-size: 0.8rem; color: #1e293b; line-height: 1.4; max-height: 230px; overflow-y: auto;">
              ${construirSimulacionHtml(defaultClasifican, defaultDirectos)}
            </div>
          </div>
        `,
        showCancelButton: true,
        confirmButtonColor: '#0f172a',
        cancelButtonColor: '#94a3b8',
        confirmButtonText: '⚡ Confirmar Cuadro y Agendar Canchas',
        cancelButtonText: 'Cancelar',
        reverseButtons: true,
        didOpen: () => {
          const selTotal = document.getElementById('swal-total-clasifican') as HTMLSelectElement;
          const selDirectos = document.getElementById('swal-directos-cuartos') as HTMLSelectElement;
          const previewBox = document.getElementById('swal-preview-box');
          const fasesListBox = document.getElementById('swal-fases-list');
          const chkProg = document.getElementById('swal-programar-ahora') as HTMLInputElement;
          const progContainer = document.getElementById('swal-programacion-container');

          chkProg?.addEventListener('change', () => {
            if (progContainer) {
              progContainer.style.display = chkProg.checked ? 'block' : 'none';
            }
          });

          const actualizarVistaPrevia = (autoAdjustDirectos: boolean = false) => {
            if (!selTotal || !selDirectos || !previewBox) return;
            const tVal = selTotal.value === '999' ? totalParejas : parseInt(selTotal.value, 10);
            if (autoAdjustDirectos) {
              selDirectos.innerHTML = construirOpcionesDirectosHtml(tVal, -1);
              selDirectos.value = '-1';
            }
            const dVal = parseInt(selDirectos.value, 10);
            const est = this.generarEstructuraPlayoffs(list, tVal, dVal);
            previewBox.innerHTML = construirSimulacionHtml(tVal, dVal);
            if (fasesListBox) {
              fasesListBox.innerHTML = construirFasesProgramacionHtml(tVal, dVal);
            }
          };

          selTotal?.addEventListener('change', () => actualizarVistaPrevia(true));
          selDirectos?.addEventListener('change', () => actualizarVistaPrevia(false));
        },
        preConfirm: () => {
          const totalVal = (document.getElementById('swal-total-clasifican') as HTMLSelectElement).value;
          const directosVal = (document.getElementById('swal-directos-cuartos') as HTMLSelectElement).value;
          const programarAhora = (document.getElementById('swal-programar-ahora') as HTMLInputElement)?.checked ?? false;
          const horariosRaw = (document.getElementById('swal-playoff-horarios') as HTMLInputElement)?.value || '18:00, 19:30, 21:00';
          const horarios = horariosRaw.split(',').map(s => s.trim()).filter(Boolean);

          const canchas_ids: number[] = [];
          document.querySelectorAll('.swal-playoff-cancha:checked').forEach((el: any) => {
            const cid = parseInt(el.value, 10);
            if (cid > 0) canchas_ids.push(cid);
          });

          const fases: { ronda: string; fecha_inicio: string; dias_semana: string[] }[] = [];
          document.querySelectorAll('.swal-fase-row').forEach((rowEl: any) => {
            const ronda = rowEl.getAttribute('data-ronda');
            const idx = rowEl.getAttribute('data-idx');
            const fechaInput = document.getElementById(`swal-fase-fecha-${idx}`) as HTMLInputElement;
            const fecha_inicio = fechaInput?.value || baseTodayIso;
            const dias_semana: string[] = [];
            document.querySelectorAll(`.swal-fase-dia-${idx}:checked`).forEach((dEl: any) => {
              if (dEl.value) dias_semana.push(dEl.value);
            });
            if (ronda) {
              fases.push({ ronda, fecha_inicio, dias_semana });
            }
          });

          return {
            total: totalVal === '999' ? 999 : parseInt(totalVal, 10),
            directos: parseInt(directosVal, 10),
            programacionConfig: {
              programarAhora,
              fases,
              horarios,
              canchas_ids
            }
          };
        }
      }).then((result) => {
        if (result.isConfirmed && result.value) {
          const { total, directos, programacionConfig } = result.value;
          this.ejecutarGeneracionYProgramacionPlayoffs(cat.id, total, directos, programacionConfig);
        }
      });
    };

    if (this.posicionesGrupo && this.posicionesGrupo.length > 0 && !this.grupoSeleccionadoId) {
      abrirModalConRanking(this.posicionesGrupo);
    } else {
      this.ligaService.obtenerTablaPosiciones(null, cat.id).subscribe({
        next: (res) => {
          const pos = (res && res.success && res.posiciones) ? res.posiciones : [];
          this.posicionesGrupo = pos;
          abrirModalConRanking(pos);
        },
        error: () => {
          abrirModalConRanking([]);
        }
      });
    }
  }

  editarLiga(): void {
    if (this.ligaId) {
      this.router.navigate(['/liga-config', this.ligaId]);
    }
  }

  eliminarLiga(): void {
    if (!this.liga) return;

    Swal.fire({
      title: '¿Eliminar Liga?',
      html: `¿Estás seguro de eliminar la liga <strong>"${this.liga.nombre}"</strong>?<br><br><small style="color: #ef4444;">Se eliminarán permanentemente todos sus partidos, categorías y parejas registradas.</small>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Sí, eliminar liga',
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        this.ligaService.eliminarLiga(this.ligaId).subscribe({
          next: (res) => {
            if (res.success) {
              Swal.fire({
                title: '¡Eliminada!',
                text: 'La liga ha sido eliminada correctamente.',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
              });
              this.router.navigate(['/ligas']);
            } else {
              Swal.fire('Error', res.error || 'Error al eliminar la liga', 'error');
            }
          },
          error: (err) => {
            console.error(err);
            Swal.fire('Error', 'Error de servidor al eliminar la liga', 'error');
          }
        });
      }
    });
  }

  eliminarCategoriaActual(): void {
    const cat = this.categoriaActual;
    if (!cat || !cat.id) {
      Swal.fire('Atención', 'No hay ninguna categoría seleccionada para eliminar.', 'warning');
      return;
    }

    const numParejas = cat.parejas_count || (cat.parejas ? cat.parejas.length : 0);

    Swal.fire({
      title: '¿Eliminar Categoría?',
      html: `¿Estás seguro de eliminar la categoría <strong>"${cat.nombre}"</strong>?<br><br><small style="color: #ef4444; font-weight: 600;">⚠️ Se eliminarán permanentemente las ${numParejas} pareja(s) inscritas, sus partidos, fixture y tabla de posiciones asociadas.</small>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Sí, eliminar categoría e inscritos',
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: 'Eliminando categoría...',
          text: 'Por favor espera un momento.',
          allowOutsideClick: false,
          didOpen: () => { Swal.showLoading(); }
        });

        this.ligaService.eliminarCategoria(cat.id).subscribe({
          next: (res) => {
            if (res.success) {
              Swal.fire({
                title: '¡Categoría Eliminada!',
                text: 'La categoría y todos sus inscritos y partidos fueron eliminados.',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
              });
              this.categoriaSeleccionadaIndex = 0;
              this.cargarLiga();
            } else {
              Swal.fire('Error', res.error || 'Error al eliminar categoría', 'error');
            }
          },
          error: (err) => {
            console.error(err);
            Swal.fire('Error', 'Error de servidor al eliminar categoría', 'error');
          }
        });
      }
    });
  }

  cambiarTab(tab: 'dashboard' | 'inscritos' | 'posiciones' | 'semana' | 'pendientes' | 'fixture' | 'playoffs'): void {
    this.activeTab = tab;
    if (tab === 'posiciones') {
      this.cargarPosiciones();
    } else if (tab === 'semana') {
      this.procesarSemanaActual();
    } else if (tab === 'pendientes') {
      this.procesarPartidosPendientes();
    }
  }

  cargarPosiciones(): void {
    const cat = this.categoriaActual;
    const catId = cat ? cat.id : null;
    const grupoId = this.grupoSeleccionadoId || null;
    if (!catId && !grupoId) {
      this.posicionesGrupo = [];
      return;
    }
    this.ligaService.obtenerTablaPosiciones(grupoId, catId).subscribe({
      next: (res) => {
        if (res.success) {
          this.posicionesGrupo = res.posiciones || [];
        } else {
          this.posicionesGrupo = [];
        }
      },
      error: (err) => {
        console.error('Error al cargar posiciones:', err);
        this.posicionesGrupo = [];
      }
    });
  }

  seleccionarCategoria(index: number): void {
    this.categoriaSeleccionadaIndex = index;
    this.paginaActualInscritos = 1;
    this.searchTermInscritos = '';
    this.grupoSeleccionadoId = null;
    this.modoSimulacionPlayoffs = false;
    this.cargarPosiciones();
  }

  searchTermInscritos: string = '';
  vistaInscritos: 'tabla' | 'cards' = 'tabla';
  paginaActualInscritos: number = 1;
  itemsPorPaginaInscritos: number = 8;

  get totalPaginasInscritos(): number {
    return Math.ceil(this.parejasFiltradas.length / this.itemsPorPaginaInscritos) || 1;
  }

  get paginasArrayInscritos(): number[] {
    return Array.from({ length: this.totalPaginasInscritos }, (_, i) => i + 1);
  }

  get parejasPaginadas(): any[] {
    const inicio = (this.paginaActualInscritos - 1) * this.itemsPorPaginaInscritos;
    return this.parejasFiltradas.slice(inicio, inicio + this.itemsPorPaginaInscritos);
  }

  get inicioRegistroInscritos(): number {
    if (this.parejasFiltradas.length === 0) return 0;
    return (this.paginaActualInscritos - 1) * this.itemsPorPaginaInscritos + 1;
  }

  get finRegistroInscritos(): number {
    return Math.min(this.paginaActualInscritos * this.itemsPorPaginaInscritos, this.parejasFiltradas.length);
  }

  cambiarPaginaInscritos(pag: number): void {
    if (pag >= 1 && pag <= this.totalPaginasInscritos) {
      this.paginaActualInscritos = pag;
    }
  }

  get categoriaActual(): any {
    return this.liga?.categorias ? this.liga.categorias[this.categoriaSeleccionadaIndex] : null;
  }

  get porcentajeOcupacionCategoria(): number {
    const cat = this.categoriaActual;
    if (!cat) return 0;
    const count = cat.parejas_count || (cat.parejas ? cat.parejas.length : 0);
    const max = +cat.max_parejas || 16;
    return Math.min(100, Math.round((count / max) * 100));
  }

  get parejasFiltradas(): any[] {
    const parejas = this.categoriaActual?.parejas || [];
    if (!this.searchTermInscritos || !this.searchTermInscritos.trim()) {
      return parejas;
    }
    const term = this.searchTermInscritos.toLowerCase().trim();
    return parejas.filter((p: any) => {
      const nomPareja = (p.nombre_pareja || '').toLowerCase();
      const p1 = ((p.p1_nom || '') + ' ' + (p.p1_ape || '') + ' ' + (p.nombre_externo1 || '')).toLowerCase();
      const p2 = ((p.p2_nom || '') + ' ' + (p.p2_ape || '') + ' ' + (p.nombre_externo2 || '')).toLowerCase();
      return nomPareja.includes(term) || p1.includes(term) || p2.includes(term);
    });
  }

  getInitials(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  seleccionarGrupo(grupoId: number | null): void {
    this.grupoSeleccionadoId = grupoId;
    this.cargarPosiciones();
  }

  generarFixtureCategoria(cat?: any): void {
    this.categoriaParaGenerarFixture = cat || this.categoriaActualFixture || this.categoriaActual;
    if (!this.categoriaParaGenerarFixture) {
      if (this.liga?.categorias && this.liga.categorias.length > 0) {
        this.categoriaParaGenerarFixture = this.liga.categorias[0];
      }
    }
    if (this.categoriaParaGenerarFixture) {
      this.mostrarModalGenerarFixture = true;
    } else {
      Swal.fire('Atención', 'No hay ninguna categoría disponible para generar fixture.', 'warning');
    }
  }

  cerrarModalGenerarFixture(actualizado: boolean): void {
    this.mostrarModalGenerarFixture = false;
    this.categoriaParaGenerarFixture = null;
    if (actualizado) {
      this.cargarLiga();
    }
  }

  abrirModalResultado(partido: any): void {
    this.partidoParaCargar = partido;
  }

  cerrarModalResultado(actualizado: boolean): void {
    this.partidoParaCargar = null;
    if (actualizado) {
      this.cargarLiga();
    }
  }

  abrirModalProgramar(partido: any): void {
    this.partidoParaProgramar = partido;
  }

  cerrarModalProgramar(actualizado: boolean): void {
    this.partidoParaProgramar = null;
    if (actualizado) {
      this.cargarLiga();
    }
  }

  abrirModalInscribir(): void {
    this.parejaParaEditar = null;
    this.mostrarModalInscribir = true;
  }

  editarPareja(pareja: any, event: Event): void {
    event.stopPropagation();
    this.parejaParaEditar = pareja;
    this.mostrarModalInscribir = true;
  }

  eliminarPareja(pareja: any, event: Event): void {
    event.stopPropagation();
    if (!pareja.id) return;
    const nom = pareja.nombre_pareja || 'esta pareja';

    Swal.fire({
      title: '¿Eliminar pareja de la liga?',
      html: `¿Estás seguro de eliminar a la pareja <strong>"${nom}"</strong> de la categoría <strong>${this.categoriaActual?.nombre || ''}</strong>?<br><br><small style="color: #ef4444; font-weight: 500;">⚠️ Si existe un fixture de partidos generado para esta pareja, sus partidos y reservas serán eliminados automáticamente.</small>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Sí, eliminar pareja',
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        this.ligaService.eliminarPareja(pareja.id).subscribe({
          next: (res) => {
            if (res.success) {
              Swal.fire({
                title: '¡Eliminada!',
                text: res.mensaje || 'La pareja y sus partidos asociados fueron eliminados correctamente.',
                icon: 'success',
                timer: 2500,
                showConfirmButton: false
              });
              this.cargarLiga();
            } else {
              Swal.fire('Error', res.error || 'Error al eliminar pareja', 'error');
            }
          },
          error: (err) => {
            console.error(err);
            Swal.fire('Error', 'Error de conexión al eliminar la pareja', 'error');
          }
        });
      }
    });
  }

  abrirModalProgramarJornada(jornada: any): void {
    this.jornadaParaProgramarSemanal = {
      ...jornada,
      jornada_ids: jornada.jornadas_ids || (jornada.id ? [jornada.id] : [])
    };
  }

  cerrarModalProgramarJornada(actualizado: boolean): void {
    this.jornadaParaProgramarSemanal = null;
    if (actualizado) {
      this.cargarLiga();
    }
  }

  cerrarModalInscribir(actualizado: boolean): void {
    this.mostrarModalInscribir = false;
    this.parejaParaEditar = null;
    if (actualizado) {
      this.cargarLiga();
    }
  }

  autoCompletarJornadas(jornada?: any): void {
    const isSingle = !!jornada;
    const catNom = this.filtroCategoriaFixtureId ? (this.categoriaActualFixture?.nombre || this.categoriaActual?.nombre) : null;
    const titulo = isSingle 
      ? `¿Completar partidos de la Jornada #${jornada.numero_jornada}?` 
      : (catNom ? `¿Completar partidos faltantes de "${catNom}"?` : '¿Completar partidos faltantes de TODA la Liga?');
    const texto = isSingle
      ? `Se identificarán las parejas que no tienen partido asignado en la Jornada #${jornada.numero_jornada} y se emparejarán automáticamente sin alterar ningún partido existente.`
      : `Se generarán todos los partidos faltantes para las parejas inscritas en todas las jornadas, <strong>respetando al 100% todos los partidos que ya tienen cancha, fecha o resultados</strong>.`;

    Swal.fire({
      title: titulo,
      html: texto,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Sí, completar partidos',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: 'Completando partidos...',
          text: 'Por favor espera un momento.',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        let params: any = {};
        if (isSingle) {
          params = { jornada_id: jornada.id };
        } else if (this.filtroCategoriaFixtureId) {
          params = { categoria_id: this.filtroCategoriaFixtureId };
        } else if (this.categoriaActual?.id && this.activeTab !== 'fixture') {
          params = { categoria_id: this.categoriaActual.id };
        } else {
          params = { liga_id: this.ligaId };
        }

        console.group('⚡ [PADELBLOX] COMPLETAR PARTIDOS FALTANTES');
        console.log('📤 Parámetros enviados a la API:', params);
        console.log('📌 Es jornada individual:', isSingle, jornada ? `Jornada #${jornada.numero_jornada} (ID ${jornada.id})` : 'Toda la categoría / liga');

        this.ligaService.autoCompletarJornadas(params).subscribe({
          next: (res) => {
            console.log('📥 Respuesta recibida del Servidor:', res);
            if (res.success) {
              console.log(`✅ Partidos agregados: ${res.partidos_agregados}`);
              console.log('📋 Detalles del proceso:', res.detalles);
              if (res.partidos_creados) {
                console.table(res.partidos_creados);
              }
              console.groupEnd();

              Swal.fire({
                title: '¡Completado!',
                text: res.mensaje || 'Partidos completados correctamente.',
                icon: 'success',
                timer: 3000,
                showConfirmButton: false
              });
              this.cargarLiga();
            } else {
              console.error('❌ Error devuelto por la API:', res.error);
              console.groupEnd();
              Swal.fire('Error', res.error || 'No se pudieron completar los partidos.', 'error');
            }
          },
          error: (err) => {
            console.error('❌ Error HTTP / Conexión al completar partidos:', err);
            console.groupEnd();
            Swal.fire('Error', 'Error de conexión al completar partidos.', 'error');
          }
        });
      }
    });
  }

  confirmarLimpiarSinHorario(jornada?: any): void {
    if (!this.esAdminClub) {
      Swal.fire('Acceso Restringido', 'Solo el administrador del club puede realizar esta acción.', 'warning');
      return;
    }

    const isSingle = !!jornada;
    const catNom = this.filtroCategoriaFixtureId ? (this.categoriaActualFixture?.nombre || this.categoriaActual?.nombre) : null;
    const titulo = isSingle
      ? `¿Limpiar partidos sin horario de la Jornada #${jornada.numero_jornada}?`
      : (catNom ? `¿Limpiar partidos sin horario de "${catNom}"?` : '¿Limpiar partidos sin horario de TODA la Liga?');
    const texto = `<p style="color: #334155; font-size: 0.95rem; margin-bottom: 10px;">Esta acción eliminará de forma segura <strong>únicamente los partidos pendientes que NO tienen cancha, fecha ni marcador asignado</strong>.</p><div style="color: #15803d; font-weight: 700; font-size: 0.85rem; background: #f0fdf4; padding: 12px; border-radius: 10px; border: 1px solid #bbf7d0; text-align: left; line-height: 1.4;">✅ Todos los partidos ya agendados o jugados permanecerán 100% intactos.</div><p style="color: #64748b; font-size: 0.82rem; margin-top: 10px; margin-bottom: 0;">¿Deseas continuar?</p>`;

    Swal.fire({
      title: titulo,
      html: texto,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: '🧹 Sí, limpiar pendientes',
      cancelButtonText: 'Cancelar',
      focusCancel: true
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: 'Limpiando partidos pendientes...',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        let params: any = {};
        if (isSingle) {
          params = { jornada_id: jornada.id };
        } else if (this.filtroCategoriaFixtureId) {
          params = { categoria_id: this.filtroCategoriaFixtureId };
        } else {
          params = { liga_id: this.ligaId };
        }

        console.group('🧹 [PADELBLOX] LIMPIAR PARTIDOS SIN HORARIO');
        console.log('📤 Parámetros enviados para limpieza:', params);

        this.ligaService.limpiarPartidosSinHorario(params).subscribe({
          next: (res) => {
            console.log('📥 Respuesta del servidor al limpiar:', res);
            console.groupEnd();
            if (res.success) {
              Swal.fire({
                title: '¡Limpieza Exitosa!',
                text: res.mensaje || 'Se limpiaron los partidos pendientes sin horario.',
                icon: 'success',
                timer: 2500,
                showConfirmButton: false
              });
              this.cargarLiga();
            } else {
              Swal.fire('Error', res.error || 'No se pudieron limpiar los partidos.', 'error');
            }
          },
          error: (err) => {
            console.error('❌ Error HTTP al limpiar partidos:', err);
            console.groupEnd();
            Swal.fire('Error', 'Error de conexión al limpiar partidos.', 'error');
          }
        });
      }
    });
  }



  eliminarPartidoIndividual(partido: any, event: Event): void {
    event.stopPropagation();
    if (!partido?.id) return;

    Swal.fire({
      title: '¿Eliminar partido?',
      text: 'Se eliminará este partido del fixture y se liberará su cancha si ya estaba programada.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Sí, eliminar partido',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.ligaService.eliminarPartido(partido.id).subscribe({
          next: (res) => {
            if (res.success) {
              Swal.fire({
                title: 'Eliminado',
                text: 'El partido ha sido eliminado correctamente.',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
              });
              this.cargarLiga();
            } else {
              Swal.fire('Error', res.error || 'No se pudo eliminar el partido.', 'error');
            }
          },
          error: (err) => {
            console.error(err);
            Swal.fire('Error', 'Error al eliminar el partido.', 'error');
          }
        });
      }
    });
  }

  desprogramarPartido(partido: any, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    if (!partido?.id) return;

    const p1 = partido.pareja1_nombre || 'Pareja 1';
    const p2 = partido.pareja2_nombre || 'Pareja 2';

    Swal.fire({
      title: '¿Quitar fecha y cancha?',
      html: `¿Estás seguro de dejar este partido sin fecha ni cancha asignada?<br><br><b>${p1}</b> vs <b>${p2}</b><br><br><small style="color: #64748b;">La reserva de la pista será cancelada y el partido pasará a estar pendiente para agendarlo cuando desees.</small>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, dejar sin cancha',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: 'Liberando cancha...',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        this.ligaService.programarPartido(partido.id, null, null).subscribe({
          next: (res) => {
            if (res.success) {
              Swal.fire({
                title: '¡Cancha liberada!',
                text: 'El partido quedó sin fecha ni cancha fijada.',
                icon: 'success',
                timer: 1800,
                showConfirmButton: false
              });
              this.cargarLiga();
            } else {
              Swal.fire('Error', res.error || 'No se pudo desprogramar el partido.', 'error');
            }
          },
          error: (err) => {
            console.error(err);
            Swal.fire('Error', 'Error de conexión al desprogramar el partido.', 'error');
          }
        });
      }
    });
  }

  // ==========================================
  // VISTA: PARTIDOS DE LA SEMANA (CRONOLÓGICO)
  // ==========================================

  get lunesSemanaSeleccionada(): Date {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0: Dom, 1: Lun, ...
    const distToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + distToMonday + (this.semanaOffset * 7));
    monday.setHours(0, 0, 0, 0);
    return monday;
  }

  get domingoSemanaSeleccionada(): Date {
    const sunday = new Date(this.lunesSemanaSeleccionada);
    sunday.setDate(sunday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return sunday;
  }

  get textoRangoSemana(): string {
    const lun = this.lunesSemanaSeleccionada;
    const dom = this.domingoSemanaSeleccionada;
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const dLun = String(lun.getDate()).padStart(2, '0');
    const mLun = meses[lun.getMonth()];
    const dDom = String(dom.getDate()).padStart(2, '0');
    const mDom = meses[dom.getMonth()];
    const anio = dom.getFullYear();

    if (this.semanaOffset === 0) {
      return `Semana Actual (${dLun} ${mLun} - ${dDom} ${mDom} ${anio})`;
    } else if (this.semanaOffset === 1) {
      return `Próxima Semana (${dLun} ${mLun} - ${dDom} ${mDom} ${anio})`;
    } else if (this.semanaOffset === -1) {
      return `Semana Anterior (${dLun} ${mLun} - ${dDom} ${mDom} ${anio})`;
    } else {
      return `${dLun} ${mLun} - ${dDom} ${mDom} ${anio}`;
    }
  }

  cambiarSemanaOffset(delta: number): void {
    this.semanaOffset += delta;
    this.procesarSemanaActual();
  }

  irSemanaActual(): void {
    this.semanaOffset = 0;
    this.procesarSemanaActual();
  }

  setFiltroCategoriaSemana(catId?: number | null): void {
    this.filtroCategoriaSemanaId = catId || null;
    this.procesarSemanaActual();
  }

  setFiltroEstadoSemana(estado: 'todos' | 'pendientes' | 'jugados'): void {
    this.filtroEstadoSemana = estado;
    this.procesarSemanaActual();
  }

  procesarSemanaActual(): void {
    if (!this.liga?.categorias) {
      this.diasSemanaVista = [];
      this.statsSemana = { total: 0, jugados: 0, programados: 0, sinHorario: 0 };
      return;
    }

    const startOfWeek = this.lunesSemanaSeleccionada;
    const endOfWeek = this.domingoSemanaSeleccionada;
    const todayStr = new Date().toISOString().split('T')[0];

    // 1. Recopilar todos los partidos de todas las categorías y jornadas de la liga
    const todosPartidos: any[] = [];

    this.liga.categorias.forEach((cat: any) => {
      // Si hay filtro de categoría en la pestaña semana
      if (this.filtroCategoriaSemanaId && cat.id !== this.filtroCategoriaSemanaId) {
        return;
      }

      if (cat.jornadas) {
        cat.jornadas.forEach((j: any) => {
          if (j.partidos) {
            j.partidos.forEach((m: any) => {
              todosPartidos.push({
                ...m,
                categoria_nombre: cat.nombre,
                categoria_genero: cat.genero,
                jornada_numero: j.numero_jornada,
                jornada_nombre: j.nombre
              });
            });
          }
        });
      }

      // Playoffs si aplican
      if (cat.playoffs) {
        cat.playoffs.forEach((po: any) => {
          todosPartidos.push({
            ...po,
            categoria_nombre: cat.nombre,
            categoria_genero: cat.genero,
            es_playoff: 1,
            jornada_nombre: po.ronda_playoff || 'Playoff'
          });
        });
      }
    });

    // 2. Filtrar por estado si aplica
    let partidosFiltrados = todosPartidos.filter(m => {
      if (this.filtroEstadoSemana === 'jugados') {
        return m.estado === 'Jugado' || m.estado === 'Walkover';
      } else if (this.filtroEstadoSemana === 'pendientes') {
        return m.estado !== 'Jugado' && m.estado !== 'Walkover';
      }
      return true;
    });

    // 3. Crear los 7 días de la semana (Lunes a Domingo)
    const diasNombres = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const diasShort = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];
    const diasArray: { label: string; dayName: string; dayNum: string; fechaKey: string; isToday: boolean; partidos: any[] }[] = [];

    for (let i = 0; i < 7; i++) {
      const curDate = new Date(startOfWeek);
      curDate.setDate(startOfWeek.getDate() + i);
      const year = curDate.getFullYear();
      const month = String(curDate.getMonth() + 1).padStart(2, '0');
      const day = String(curDate.getDate()).padStart(2, '0');
      const fechaKey = `${year}-${month}-${day}`;
      const isToday = fechaKey === todayStr;
      const label = `${diasNombres[i]} ${day}/${month}`;

      diasArray.push({
        label,
        dayName: diasShort[i],
        dayNum: `${day}/${month}`,
        fechaKey,
        isToday,
        partidos: []
      });
    }

    let totSemana = 0;
    let jugSemana = 0;
    let progSemana = 0;

    partidosFiltrados.forEach((m: any) => {
      const isUnscheduled = !m.fecha_hora || 
                            m.fecha_hora.startsWith('0000') || 
                            m.fecha_hora === '0000-00-00 00:00:00';

      // No colocar los partidos sin asignar en los partidos de la semana
      if (isUnscheduled) {
        return;
      }

      const dtStr = m.fecha_hora.replace(' ', 'T');
      const dt = new Date(dtStr);
      if (isNaN(dt.getTime())) return;

      // Verificar si cae dentro de la semana seleccionada
      if (dt >= startOfWeek && dt <= endOfWeek) {
        const year = dt.getFullYear();
        const month = String(dt.getMonth() + 1).padStart(2, '0');
        const day = String(dt.getDate()).padStart(2, '0');
        const mKey = `${year}-${month}-${day}`;

        const diaObj = diasArray.find(d => d.fechaKey === mKey);
        if (diaObj) {
          diaObj.partidos.push(m);
          totSemana++;
          if (m.estado === 'Jugado' || m.estado === 'Walkover') {
            jugSemana++;
          } else {
            progSemana++;
          }
        }
      }
    });

    // Ordenar partidos dentro de cada día por hora y cancha
    diasArray.forEach(d => {
      d.partidos.sort((a, b) => {
        const tA = a.fecha_hora || '';
        const tB = b.fecha_hora || '';
        if (tA !== tB) return tA.localeCompare(tB);
        const cA = a.cancha_nombre || '';
        const cB = b.cancha_nombre || '';
        return cA.localeCompare(cB);
      });
    });

    this.diasSemanaVista = diasArray.filter(d => d.partidos.length > 0);
    this.statsSemana = {
      total: totSemana,
      jugados: jugSemana,
      programados: progSemana,
      sinHorario: 0
    };
  }

  getPlayerPhotoUrl(foto: string | null | undefined, name: string): string {
    if (foto && typeof foto === 'string' && foto.trim() !== '' && !foto.includes('imagen_defecto') && !foto.includes('placeholder')) {
      return this.assetService.getAssetUrl(foto, 'perfil');
    }
    const safeName = encodeURIComponent(name || 'Jugador');
    return `https://ui-avatars.com/api/?name=${safeName}&background=0f172a&color=ccff00&bold=true&size=64`;
  }

  onImgFallback(event: any, name: string): void {
    if (event && event.target) {
      const safeName = encodeURIComponent(name || 'Jugador');
      event.target.src = `https://ui-avatars.com/api/?name=${safeName}&background=0f172a&color=ccff00&bold=true&size=64`;
    }
  }

  abrirModalWhatsAppSemana(): void {
    const partidosDeLaSemana: any[] = [];
    this.diasSemanaVista.forEach(d => {
      partidosDeLaSemana.push(...d.partidos);
    });

    const jornadaVirtual = {
      numero_jornada: this.semanaOffset === 0 ? 'Actual' : (this.semanaOffset > 0 ? `+${this.semanaOffset}` : `${this.semanaOffset}`),
      nombre: `Semana: ${this.textoRangoSemana}`,
      partidos: partidosDeLaSemana
    };

    this.abrirModalCompartirWhatsApp(jornadaVirtual);
  }

  // --- MÉTODOS PESTAÑA: PARTIDOS PENDIENTES DE JORNADAS ANTERIORES ---
  procesarPartidosPendientes(): void {
    if (!this.liga?.categorias) {
      this.partidosPendientesList = [];
      this.jornadasDisponiblesPendientes = [];
      return;
    }

    const todosPendientes: any[] = [];
    const jornadasMap = new Map<number, {
      numero: number;
      nombre: string;
      total: number;
      sinHorario: number;
      sinResultado: number;
      esAnterior: boolean;
    }>();

    this.liga.categorias.forEach((cat: any) => {
      if (!cat.jornadas || cat.jornadas.length === 0) return;

      // 1. Determinar cuál es la última jornada programada para esta categoría
      let maxJornadaProgramada = 0;
      cat.jornadas.forEach((j: any) => {
        const numJ = parseInt(j.numero_jornada, 10) || 1;
        const tienePartidoProgramado = j.partidos?.some((p: any) => 
          p.cancha_id && Number(p.cancha_id) > 0 && 
          p.fecha_hora && !p.fecha_hora.startsWith('0000') && p.fecha_hora !== '0000-00-00 00:00:00'
        );
        if (tienePartidoProgramado && numJ > maxJornadaProgramada) {
          maxJornadaProgramada = numJ;
        }
      });

      // Límite: jornadas estrictamente anteriores a la última programada
      const limiteJornada = maxJornadaProgramada > 1 ? maxJornadaProgramada : (cat.jornadas.length > 1 ? 2 : 1);

      cat.jornadas.forEach((j: any) => {
        const numJ = parseInt(j.numero_jornada, 10) || 1;
        const esAnterior = (numJ < limiteJornada);

        // Registrar jornada en el mapa de jornadas disponibles
        if (!jornadasMap.has(numJ)) {
          jornadasMap.set(numJ, {
            numero: numJ,
            nombre: j.nombre || ('Jornada #' + numJ),
            total: 0,
            sinHorario: 0,
            sinResultado: 0,
            esAnterior: esAnterior
          });
        } else if (esAnterior) {
          jornadasMap.get(numJ)!.esAnterior = true;
        }

        if (j.partidos) {
          j.partidos.forEach((p: any) => {
            const esJugado = p.estado === 'Jugado' || p.estado === 'Walkover' || (p.pareja_ganadora_id && Number(p.pareja_ganadora_id) > 0);
            if (esJugado) return; // Ya disputado con resultado

            const isSinHorario = !p.cancha_id || Number(p.cancha_id) === 0 || 
                                 !p.fecha_hora || p.fecha_hora.startsWith('0000') || p.fecha_hora === '0000-00-00 00:00:00';

            const tipoPend = isSinHorario ? 'sin_horario' : 'sin_resultado';

            todosPendientes.push({
              ...p,
              categoria_id: cat.id,
              categoria_nombre: cat.nombre,
              categoria_genero: cat.genero,
              numero_jornada: numJ,
              jornada_nombre: j.nombre || ('Jornada #' + numJ),
              jornada_fecha_limite: j.fecha_limite,
              es_jornada_anterior: esAnterior,
              limite_jornada: limiteJornada,
              tipo_pendiente: tipoPend,
              motivo_pendiente: isSinHorario 
                ? '⚠️ Sin Cancha ni Horario asignado' 
                : '⏰ Con horario pero sin marcador oficial'
            });

            // Actualizar contadores de la jornada
            const jEntry = jornadasMap.get(numJ)!;
            jEntry.total++;
            if (isSinHorario) {
              jEntry.sinHorario++;
            } else {
              jEntry.sinResultado++;
            }
          });
        }
      });
    });

    // Ordenar cronológicamente por número de jornada y luego ID
    todosPendientes.sort((a, b) => {
      if (a.numero_jornada !== b.numero_jornada) {
        return a.numero_jornada - b.numero_jornada;
      }
      return a.id - b.id;
    });

    this.partidosPendientesList = todosPendientes;
    this.jornadasDisponiblesPendientes = Array.from(jornadasMap.values()).sort((a, b) => a.numero - b.numero);
  }

  isJornadaSeleccionada(num: number): boolean {
    return this.jornadasSeleccionadasPendientes.includes(num);
  }

  toggleJornadaSeleccionada(num: number): void {
    const idx = this.jornadasSeleccionadasPendientes.indexOf(num);
    if (idx > -1) {
      this.jornadasSeleccionadasPendientes.splice(idx, 1);
    } else {
      this.jornadasSeleccionadasPendientes.push(num);
      this.jornadasSeleccionadasPendientes.sort((a, b) => a - b);
    }
  }

  seleccionarSoloJornada(num: number, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    this.jornadasSeleccionadasPendientes = [num];
  }

  limpiarFiltroJornadas(): void {
    this.jornadasSeleccionadasPendientes = [];
  }

  seleccionarTodasAnteriores(): void {
    this.soloJornadasAnteriores = true;
    this.jornadasSeleccionadasPendientes = [];
  }

  seleccionarTodasJornadas(): void {
    this.soloJornadasAnteriores = false;
    this.jornadasSeleccionadasPendientes = [];
  }

  getPendientesCountPorJornada(numJornada: number): number {
    let list = this.partidosPendientesList.filter(p => p.numero_jornada === numJornada);
    if (this.filtroCategoriaPendientesId) {
      list = list.filter(p => p.categoria_id === this.filtroCategoriaPendientesId);
    }
    return list.length;
  }

  get textoJornadasSeleccionadas(): string {
    if (this.jornadasSeleccionadasPendientes.length === 0) {
      return this.soloJornadasAnteriores ? 'Todas las jornadas anteriores' : 'Todas las jornadas de la liga';
    }
    if (this.jornadasSeleccionadasPendientes.length === 1) {
      return `Jornada #${this.jornadasSeleccionadasPendientes[0]}`;
    }
    return `Jornadas #${this.jornadasSeleccionadasPendientes.join(', #')} (${this.jornadasSeleccionadasPendientes.length} seleccionadas)`;
  }

  get totalPartidosPendientesGlobal(): number {
    if (this.soloJornadasAnteriores) {
      return this.partidosPendientesList.filter(p => p.es_jornada_anterior).length;
    }
    return this.partidosPendientesList.length;
  }

  get statsPendientes(): { total: number; sinHorario: number; sinResultado: number; categoriasConPendientes: number } {
    let list = this.partidosPendientesList;

    if (this.jornadasSeleccionadasPendientes && this.jornadasSeleccionadasPendientes.length > 0) {
      list = list.filter(p => this.jornadasSeleccionadasPendientes.includes(p.numero_jornada));
    } else if (this.soloJornadasAnteriores) {
      list = list.filter(p => p.es_jornada_anterior);
    }

    if (this.filtroCategoriaPendientesId) {
      list = list.filter(p => p.categoria_id === this.filtroCategoriaPendientesId);
    }

    const catSet = new Set<number>();
    let sinH = 0;
    let sinR = 0;
    list.forEach(p => {
      catSet.add(p.categoria_id);
      if (p.tipo_pendiente === 'sin_horario') {
        sinH++;
      } else {
        sinR++;
      }
    });

    return {
      total: list.length,
      sinHorario: sinH,
      sinResultado: sinR,
      categoriasConPendientes: catSet.size
    };
  }

  get partidosPendientesFiltrados(): any[] {
    let list = this.partidosPendientesList;

    if (this.jornadasSeleccionadasPendientes && this.jornadasSeleccionadasPendientes.length > 0) {
      list = list.filter(p => this.jornadasSeleccionadasPendientes.includes(p.numero_jornada));
    } else if (this.soloJornadasAnteriores) {
      list = list.filter(p => p.es_jornada_anterior);
    }

    if (this.filtroCategoriaPendientesId) {
      list = list.filter(p => p.categoria_id === this.filtroCategoriaPendientesId);
    }

    if (this.filtroTipoPendiente !== 'todos') {
      list = list.filter(p => p.tipo_pendiente === this.filtroTipoPendiente);
    }

    if (this.busquedaPendientes && this.busquedaPendientes.trim() !== '') {
      const q = this.busquedaPendientes.toLowerCase().trim();
      list = list.filter(p => 
        (p.pareja1_nombre && p.pareja1_nombre.toLowerCase().includes(q)) ||
        (p.pareja2_nombre && p.pareja2_nombre.toLowerCase().includes(q)) ||
        (p.categoria_nombre && p.categoria_nombre.toLowerCase().includes(q)) ||
        (p.jornada_nombre && p.jornada_nombre.toLowerCase().includes(q))
      );
    }

    return list;
  }

  compartirWhatsAppPendientes(): void {
    const list = this.partidosPendientesFiltrados;
    if (!list || list.length === 0) return;

    const jDesc = this.jornadasSeleccionadasPendientes.length > 0
      ? `JORNADA(S) ${this.jornadasSeleccionadasPendientes.slice().sort((a, b) => a - b).join(', ')}`
      : (this.soloJornadasAnteriores ? 'JORNADAS ANTERIORES' : 'TODAS LAS JORNADAS');

    let text = `🎾 *PARTIDOS PENDIENTES [${jDesc}] - ${this.liga?.nombre || 'LIGA'}*\n\n`;
    text += `Estimadas parejas, les recordamos los partidos pendientes de revisión:\n\n`;

    list.forEach((p, idx) => {
      text += `*${idx + 1}. [Jornada #${p.numero_jornada}] ${p.categoria_nombre}*\n`;
      text += `⚔️ ${p.pareja1_nombre} vs ${p.pareja2_nombre}\n`;
      if (p.cancha_nombre && p.fecha_hora && !p.fecha_hora.startsWith('0000')) {
        const dt = new Date(p.fecha_hora.replace(' ', 'T'));
        const fStr = `${dt.getDate()}/${dt.getMonth() + 1} ${dt.getHours()}:${String(dt.getMinutes()).padStart(2, '0')}`;
        text += `⏰ ${fStr} hrs en ${p.cancha_nombre} (Resultado pendiente)\n`;
      } else {
        text += `⚠️ *Sin fecha ni cancha asignada*\n`;
      }
      text += `\n`;
    });

    text += `Por favor coordinar su partido a la brevedad. ¡Gracias! 🏆`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  }

  getTextoWhatsAppPartido(p: any): string {
    if (!p) return '';
    let text = `🎾 *COORDINACIÓN DE PARTIDO - ${this.liga?.nombre || 'LIGA'}*\n`;
    text += `📌 *Jornada #${p.numero_jornada} • ${p.categoria_nombre}*\n\n`;
    text += `⚔️ *${p.pareja1_nombre}*\n      vs\n⚔️ *${p.pareja2_nombre}*\n\n`;

    if (p.cancha_nombre && p.fecha_hora && !p.fecha_hora.startsWith('0000')) {
      const dt = new Date(p.fecha_hora.replace(' ', 'T'));
      const fStr = `${dt.getDate()}/${dt.getMonth() + 1} ${dt.getHours()}:${String(dt.getMinutes()).padStart(2, '0')}`;
      text += `📍 *Cancha:* ${p.cancha_nombre}\n`;
      text += `⏰ *Horario:* ${fStr} hrs\n`;
      text += `⚠️ *Estado:* Pendiente de cargar marcador / resultado.\n\n`;
      text += `Estimados jugadores, recuerden confirmar el resultado oficial del partido a la organización. ¡Mucho éxito! 🏆`;
    } else {
      text += `⚠️ *Estado:* Partido pendiente sin fecha ni cancha fijada.\n\n`;
      text += `Estimados jugadores, favor coordinar entre ustedes el día y horario disponible para su partido en el club para reservarles la cancha. ¡Muchas gracias! 🎾`;
    }

    return text;
  }

  compartirWhatsAppPartidoIndividual(p: any, event?: Event): void {
    if (event) event.stopPropagation();
    const text = this.getTextoWhatsAppPartido(p);
    if (!text) return;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  }

  copiarTextoCoordinacionPartido(p: any, event?: Event): void {
    if (event) event.stopPropagation();
    const text = this.getTextoWhatsAppPartido(p);
    if (!text) return;

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: '¡Mensaje copiado para WhatsApp!',
          showConfirmButton: false,
          timer: 2000
        });
      }).catch(() => {
        this.fallbackCopyText(text);
      });
    } else {
      this.fallbackCopyText(text);
    }
  }

  compartirWhatsAppPorJornada(numJornada: number, event?: Event): void {
    if (event) event.stopPropagation();
    let list = this.partidosPendientesList.filter(p => p.numero_jornada === numJornada);
    if (this.filtroCategoriaPendientesId) {
      list = list.filter(p => p.categoria_id === this.filtroCategoriaPendientesId);
    }
    if (!list || list.length === 0) {
      Swal.fire('Atención', `No hay partidos pendientes en la Jornada #${numJornada}`, 'info');
      return;
    }

    let text = `🎾 *PARTIDOS PENDIENTES [JORNADA #${numJornada}] - ${this.liga?.nombre || 'LIGA'}*\n\n`;
    text += `Estimadas parejas, les recordamos los partidos pendientes de la Jornada #${numJornada}:\n\n`;

    list.forEach((p, idx) => {
      text += `*${idx + 1}. ${p.categoria_nombre}*\n`;
      text += `⚔️ ${p.pareja1_nombre} vs ${p.pareja2_nombre}\n`;
      if (p.cancha_nombre && p.fecha_hora && !p.fecha_hora.startsWith('0000')) {
        const dt = new Date(p.fecha_hora.replace(' ', 'T'));
        const fStr = `${dt.getDate()}/${dt.getMonth() + 1} ${dt.getHours()}:${String(dt.getMinutes()).padStart(2, '0')}`;
        text += `⏰ ${fStr} hrs en ${p.cancha_nombre} (Resultado pendiente)\n`;
      } else {
        text += `⚠️ *Sin fecha ni cancha fijada*\n`;
      }
      text += `\n`;
    });

    text += `Por favor coordinar su partido a la brevedad. ¡Gracias! 🏆`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  }

  copiarWhatsAppPendientes(event?: Event): void {
    if (event) event.stopPropagation();
    const list = this.partidosPendientesFiltrados;
    if (!list || list.length === 0) return;

    const jDesc = this.jornadasSeleccionadasPendientes.length > 0
      ? `JORNADA(S) ${this.jornadasSeleccionadasPendientes.slice().sort((a, b) => a - b).join(', ')}`
      : (this.soloJornadasAnteriores ? 'JORNADAS ANTERIORES' : 'TODAS LAS JORNADAS');

    let text = `🎾 *PARTIDOS PENDIENTES [${jDesc}] - ${this.liga?.nombre || 'LIGA'}*\n\n`;
    text += `Estimadas parejas, les recordamos los partidos pendientes de revisión:\n\n`;

    list.forEach((p, idx) => {
      text += `*${idx + 1}. [Jornada #${p.numero_jornada}] ${p.categoria_nombre}*\n`;
      text += `⚔️ ${p.pareja1_nombre} vs ${p.pareja2_nombre}\n`;
      if (p.cancha_nombre && p.fecha_hora && !p.fecha_hora.startsWith('0000')) {
        const dt = new Date(p.fecha_hora.replace(' ', 'T'));
        const fStr = `${dt.getDate()}/${dt.getMonth() + 1} ${dt.getHours()}:${String(dt.getMinutes()).padStart(2, '0')}`;
        text += `⏰ ${fStr} hrs en ${p.cancha_nombre} (Resultado pendiente)\n`;
      } else {
        text += `⚠️ *Sin fecha ni cancha asignada*\n`;
      }
      text += `\n`;
    });

    text += `Por favor coordinar su partido a la brevedad. ¡Gracias! 🏆`;

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: '¡Listado copiado al portapapeles!',
          showConfirmButton: false,
          timer: 2000
        });
      }).catch(() => {
        this.fallbackCopyText(text);
      });
    } else {
      this.fallbackCopyText(text);
    }
  }

  private fallbackCopyText(text: string): void {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: '¡Texto copiado!',
        showConfirmButton: false,
        timer: 2000
      });
    } catch (err) {
      Swal.fire('Error', 'No se pudo copiar el texto automáticamente.', 'error');
    }
    document.body.removeChild(textArea);
  }

  getPendientesSinHorarioCountPorJornada(numJornada: number): number {
    let list = this.partidosPendientesList.filter(p => p.numero_jornada === numJornada && p.tipo_pendiente === 'sin_horario');
    if (this.filtroCategoriaPendientesId) {
      list = list.filter(p => p.categoria_id === this.filtroCategoriaPendientesId);
    }
    return list.length;
  }

  getPendientesSinResultadoCountPorJornada(numJornada: number): number {
    let list = this.partidosPendientesList.filter(p => p.numero_jornada === numJornada && p.tipo_pendiente === 'sin_resultado');
    if (this.filtroCategoriaPendientesId) {
      list = list.filter(p => p.categoria_id === this.filtroCategoriaPendientesId);
    }
    return list.length;
  }
}
