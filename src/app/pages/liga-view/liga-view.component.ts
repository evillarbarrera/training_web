import { Component, OnInit } from '@angular/core';
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
    GenerarFixtureModalComponent
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
  grupoSeleccionadoId: number | null = null;
  activeTab: 'inscritos' | 'posiciones' | 'fixture' | 'playoffs' = 'inscritos';

  posicionesGrupo: any[] = [];
  partidoParaCargar: any = null;
  partidoParaProgramar: any = null;
  jornadaParaProgramarSemanal: any = null;
  mostrarConfigFixture: boolean = false;
  mostrarModalInscribir: boolean = false;
  mostrarModalGenerarFixture: boolean = false;
  parejaParaEditar: any = null;
  selectedJornadaNumero: number = 1;

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

  // Inline Fixture Generation Properties
  genNumGrupos: number = 2;
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
  genHorarios: string[] = ['18:00', '19:30', '21:00'];
  genNuevoHorario: string = '';
  genCanchasSeleccionadas: number[] = [];
  genRespetarRestricciones: boolean = true;
  genMaxPartidosPareja: number = 1;
  genLoading: boolean = false;

  loading: boolean = true;
  errorMsj: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private ligaService: LigaService
  ) {}

  ngOnInit(): void {
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
      const u = JSON.parse(userStr);
      this.userId = u.id;
      this.userRole = u.rol || 'administrador_club';
      this.userName = `${u.nombre || ''} ${u.apellido || ''}`;
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

  get hasAnyFixture(): boolean {
    return !!this.liga?.categorias?.some((c: any) => c.jornadas && c.jornadas.length > 0);
  }

  get todasLasJornadas(): any[] {
    if (!this.liga?.categorias) return [];
    const map = new Map<number, any>();
    this.liga.categorias.forEach((cat: any) => {
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
              partidos: []
            });
          } else {
            if (!map.get(num).jornadas_ids.includes(j.id)) {
              map.get(num).jornadas_ids.push(j.id);
            }
          }
          if (j.partidos) {
            j.partidos.forEach((m: any) => {
              map.get(num).partidos.push({
                ...m,
                categoria_nombre: cat.nombre,
                categoria_genero: cat.genero
              });
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
        let dayKey = '9999-99-99';
        let dayLabel = '⚠️ Pendientes de Programación Semanal';

        if (m.fecha_hora) {
          const dtStr = m.fecha_hora.replace(' ', 'T');
          const dt = new Date(dtStr);
          if (!isNaN(dt.getTime())) {
            const year = dt.getFullYear();
            const month = String(dt.getMonth() + 1).padStart(2, '0');
            const day = String(dt.getDate()).padStart(2, '0');
            const diaSemanaStr = diasNombresEs[dt.getDay()];
            dayKey = `${year}-${month}-${day}`;
            dayLabel = `📅 ${diaSemanaStr} ${day}/${month}/${year}`;
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

    return result;
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
      // 1. Generar fixture de todas las categorías de la liga en una sola llamada atómica
      await this.ligaService.generarFixturePorLiga(this.ligaId, this.genNumGrupos).toPromise();

      // 2. Obtener la liga actualizada para recuperar todos los IDs de la Jornada 1
      const resLiga: any = await this.ligaService.obtenerLiga(this.ligaId, this.selectedClubId || undefined, this.userId || undefined).toPromise();
      
      if (resLiga && resLiga.success && resLiga.liga) {
        this.liga = resLiga.liga;
        const j1Ids: number[] = [];

        this.liga?.categorias?.forEach((cat: any) => {
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
          
          Swal.fire({
            title: '¡Fixture General & Semana 1 Creados!',
            text: `Se agendó la Jornada 1 para las ${this.liga?.categorias?.length || 0} categorías de la liga.`,
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
      this.mostrarConfigFixture = false;
      this.cargarLiga();
    }
  }

  generarPlayoffsCategoria(): void {
    const cat = this.categoriaActual;
    if (!cat || !cat.id) return;

    let cant = 8;
    if (this.genClasificanModo === 'todas') {
      cant = 999;
    } else if (this.genClasificanModo === 'custom') {
      cant = this.genClasificanCant || 8;
    } else {
      cant = parseInt(this.genClasificanModo) || 8;
    }

    const textoCant = cant >= 999 ? 'todas las parejas inscritas' : `las primeras ${cant} parejas clasificados`;

    Swal.fire({
      title: '🏆 Generar Playoffs',
      html: `¿Deseas generar el cuadro de eliminación directa para <strong>${cat.nombre}</strong> cruzando ${textoCant}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#0f172a',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Sí, generar playoffs',
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        this.ligaService.generarPlayoffs(cat.id, cant).subscribe({
          next: (res) => {
            if (res.success) {
              Swal.fire({
                title: '¡Playoffs Generados!',
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

  seleccionarCategoria(index: number): void {
    this.categoriaSeleccionadaIndex = index;
    const cat = this.categoriaActual;
    if (cat && cat.id) {
      this.seleccionarGrupo(null);
    } else {
      this.posicionesGrupo = [];
    }
  }

  get categoriaActual(): any {
    return this.liga?.categorias ? this.liga.categorias[this.categoriaSeleccionadaIndex] : null;
  }

  seleccionarGrupo(grupoId: number | null): void {
    this.grupoSeleccionadoId = grupoId;
    const catId = this.categoriaActual ? this.categoriaActual.id : null;
    this.ligaService.obtenerTablaPosiciones(grupoId, catId).subscribe({
      next: (res) => {
        if (res.success) {
          this.posicionesGrupo = res.posiciones || [];
        }
      }
    });
  }

  generarFixtureCategoria(): void {
    const cat = this.categoriaActual;
    if (!cat) return;
    this.mostrarModalGenerarFixture = true;
  }

  cerrarModalGenerarFixture(actualizado: boolean): void {
    this.mostrarModalGenerarFixture = false;
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
      title: '¿Eliminar pareja?',
      html: `¿Estás seguro de eliminar a la pareja <strong>"${nom}"</strong> de la categoría <strong>${this.categoriaActual?.nombre || ''}</strong>?<br><br><small style="color: #64748b;">Se desvinculará de la lista de inscritos.</small>`,
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
                text: 'La pareja fue eliminada correctamente.',
                icon: 'success',
                timer: 2000,
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
}
