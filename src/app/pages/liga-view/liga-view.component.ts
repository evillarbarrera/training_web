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

  get playoffsRounds(): { octavos: any[], cuartos: any[], semifinales: any[], final: any[] } {
    const list = this.categoriaActual?.playoffs || [];
    return {
      octavos: list.filter((m: any) => m.ronda_playoff === 'Octavos de Final' || m.ronda_playoff === 'Ronda Previa'),
      cuartos: list.filter((m: any) => m.ronda_playoff === 'Cuartos de Final'),
      semifinales: list.filter((m: any) => m.ronda_playoff === 'Semifinales'),
      final: list.filter((m: any) => m.ronda_playoff === 'Final')
    };
  }

  get tienePlayoffs(): boolean {
    return !!(this.categoriaActual?.playoffs && this.categoriaActual.playoffs.length > 0);
  }

  generarPlayoffsCategoria(): void {
    const cat = this.categoriaActual;
    if (!cat || !cat.id) return;

    const totalParejas = cat.parejas?.length || 17;
    const defaultClasifican = cat.parejas_clasifican_playoff || (totalParejas >= 12 ? 12 : (totalParejas >= 8 ? 8 : totalParejas));
    const defaultDirectos = defaultClasifican >= 12 ? 4 : (defaultClasifican === 10 ? 6 : (defaultClasifican === 14 ? 2 : 0));

    Swal.fire({
      title: '🏆 Configurar Fase Final (Playoffs)',
      html: `
        <div style="text-align: left; font-size: 0.9rem; color: #334155; font-family: inherit;">
          <p style="margin-bottom: 14px; font-size: 0.88rem; color: #64748b;">
            Configura el cuadro de eliminación directa para <strong>${cat.nombre}</strong> (${totalParejas} parejas registradas):
          </p>
          
          <div style="margin-bottom: 16px;">
            <label style="font-weight: 800; font-size: 0.82rem; color: #0f172a; display: block; margin-bottom: 6px;">
              1️⃣ Parejas que Clasifican a la Fase Final:
            </label>
            <select id="swal-total-clasifican" class="swal2-input" style="width: 100%; margin: 0; font-weight: 700; font-size: 0.88rem; height: 42px; border-radius: 10px; border-color: #cbd5e1;">
              <option value="12" ${defaultClasifican === 12 ? 'selected' : ''}>Top 12 Parejas (Recomendado con Previa)</option>
              <option value="999" ${defaultClasifican >= 999 || defaultClasifican === totalParejas ? 'selected' : ''}>Todas las parejas de la categoría (${totalParejas})</option>
              <option value="16" ${defaultClasifican === 16 ? 'selected' : ''}>Top 16 Parejas (Octavos de Final completos)</option>
              <option value="10" ${defaultClasifican === 10 ? 'selected' : ''}>Top 10 Parejas (6 directos + 2 cruces previa)</option>
              <option value="8" ${defaultClasifican === 8 ? 'selected' : ''}>Top 8 Parejas (Cuartos de Final directos)</option>
              <option value="4" ${defaultClasifican === 4 ? 'selected' : ''}>Top 4 Parejas (Semifinales directas)</option>
            </select>
          </div>

          <div style="margin-bottom: 16px;">
            <label style="font-weight: 800; font-size: 0.82rem; color: #0f172a; display: block; margin-bottom: 6px;">
              2️⃣ ¿Cuántos Primeros Lugares Pasan DIRECTO a Cuartos (BYE)?
            </label>
            <select id="swal-directos-cuartos" class="swal2-input" style="width: 100%; margin: 0; font-weight: 700; font-size: 0.88rem; height: 42px; border-radius: 10px; border-color: #cbd5e1;">
              <option value="4" ${defaultDirectos === 4 ? 'selected' : ''}>👑 Primeros 4 lugares (1º al 4º directo a 4tos; 5º al 12º a Previa)</option>
              <option value="2" ${defaultDirectos === 2 ? 'selected' : ''}>👑 Primeros 2 lugares (1º y 2º directo a 4tos; 3º al 14º a Previa)</option>
              <option value="6" ${defaultDirectos === 6 ? 'selected' : ''}>👑 Primeros 6 lugares (1º al 6º directo a 4tos; 7º al 10º a Previa)</option>
              <option value="0" ${defaultDirectos === 0 ? 'selected' : ''}>⚡ Ninguno (Todos arrancan en la misma ronda inicial)</option>
            </select>
          </div>

          <div id="swal-preview-box" style="background: #eff6ff; border: 1.5px solid #bfdbfe; border-radius: 12px; padding: 12px; font-size: 0.8rem; color: #1e40af; line-height: 1.45;">
            <strong>ℹ️ Resumen del Cuadro:</strong><br>
            • Se ordenarán automáticamente por la <strong>Tabla de Posiciones Consolidada</strong>.<br>
            • Los cabezas de serie con pase directo esperarán en Cuartos de Final.<br>
            • Los demás jugarán la Ronda Previa (Octavos) cruzándose el mejor contra el peor clasificado.
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonColor: '#0f172a',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: '⚡ Generar Cuadro de Playoffs',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      preConfirm: () => {
        const totalVal = (document.getElementById('swal-total-clasifican') as HTMLSelectElement).value;
        const directosVal = (document.getElementById('swal-directos-cuartos') as HTMLSelectElement).value;
        return {
          total: totalVal === '999' ? 999 : parseInt(totalVal, 10),
          directos: parseInt(directosVal, 10)
        };
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        const { total, directos } = result.value;
        this.ligaService.generarPlayoffs(cat.id, total, directos).subscribe({
          next: (res) => {
            if (res.success) {
              Swal.fire({
                title: '🏆 ¡Playoffs Generados!',
                text: res.mensaje || 'Cuadro de Playoffs creado exitosamente.',
                icon: 'success',
                timer: 2500,
                showConfirmButton: false
              });
              this.cargarLiga();
              this.activeTab = 'playoffs';
            } else {
              Swal.fire('Atención', res.error || 'Error al generar playoffs', 'warning');
            }
          },
          error: (err) => {
            console.error(err);
            Swal.fire('Error', 'Error de servidor al generar playoffs', 'error');
          }
        });
      }
    });
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
