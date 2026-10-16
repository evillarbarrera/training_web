import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AssetService } from '../../services/asset.service';

export interface CanchaLive {
  cancha_id: number;
  cancha_nombre: string;
  cancha_tipo: string;
  estado: 'en_juego' | 'proximo_turno' | 'disponible';
  estado_label: string;
  hora_inicio: string;
  hora_fin: string;
  tiempo_transcurrido?: string;
  tiempo_para_inicio?: string;
  dupla1: string;
  dupla2: string;
  j1_nombre?: string;
  j2_nombre?: string;
  j3_nombre?: string;
  j4_nombre?: string;
  sets: Array<{ t1: number; t2: number }>;
  game_t1: string;
  game_t2: string;
  punto_oro: boolean;
  marcador_texto: string;
  smartwatch_sync: boolean;
  smartwatch_golpes?: number;
  smartwatch_fc?: number;
  tipo_evento: string;
}

export interface TurnoItem {
  id: number;
  cancha_id: number;
  cancha_nombre: string;
  cancha_tipo: string;
  hora_inicio: string;
  hora_fin: string;
  horario: string;
  dupla1: string;
  dupla2: string;
  tipo: string;
  en_juego: boolean;
}

export interface CanchaCarteleraItem {
  cancha_id: number;
  cancha_nombre: string;
  pista_numero: number;
  cancha_tipo?: string;
  horario: string;
  dupla1: string;
  dupla2: string;
  tipo: string;
  en_juego: boolean;
  proximo_horario?: string;
  proxima_dupla?: string;
  estado: 'en_juego' | 'proximo_turno' | 'disponible';
}

export interface PosicionItem {
  posicion: number;
  pareja: string;
  categoria: string;
  pj: number;
  pg: number;
  pp: number;
  dif_sets: string | number;
  puntos: number;
}

export interface CompeticionSlice {
  id: number | string;
  liga_id?: number;
  nombre: string;
  liga_nombre?: string;
  categoria: string;
  tabla: PosicionItem[];
}

export interface MenuItem {
  id?: number;
  nombre: string;
  categoria: string;
  precio_formateado: string;
  imagen?: string;
  stock?: number;
}

export interface SponsorItem {
  nombre: string;
  tagline: string;
  icono: string;
}

@Component({
  selector: 'app-club-tv',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './club-tv.component.html',
  styleUrls: ['./club-tv.component.scss']
})
export class ClubTvComponent implements OnInit, OnDestroy {
  clubParam: string = '';
  isLoading: boolean = true;
  errorMessage: string = '';

  // Data
  clubData: any = null;
  canchas: CanchaLive[] = [];
  proximosTurnos: TurnoItem[] = [];
  canchasCartelera: CanchaCarteleraItem[] = [];
  competicionNombre: string = 'Liga Oficial';
  tablaPosiciones: PosicionItem[] = [];
  competiciones: CompeticionSlice[] = [];
  currentCompIndex: number = 0;
  progressAnimationKey: number = 0;
  cafeteriaMenu: MenuItem[] = [];
  sponsors: SponsorItem[] = [];

  // Clock & Date
  currentTime: string = '';
  currentDate: string = '';

  // Mode and Display Controls
  viewMode: 'split' | 'carousel' = 'split'; // 'split' (Multipantalla) or 'carousel' (Rotativo gigante)
  currentSlide: number = 0; // 0: Canchas, 1: Turnos, 2: Posiciones, 3: Cafetería & Sponsors
  totalSlides: number = 4;
  isPaused: boolean = false;
  isFullscreen: boolean = false;
  controlsVisible: boolean = true;

  private clockInterval: any = null;
  private refreshInterval: any = null;
  private carouselInterval: any = null;
  private compRotationInterval: any = null;
  private controlsTimeout: any = null;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    public assetService: AssetService
  ) {}

  getClubLogo(logo: string | null | undefined): string {
    return this.assetService.getAssetUrl(logo, 'club');
  }

  onLogoError(event: any): void {
    if (event && event.target) {
      event.target.src = 'assets/images/logo-circular.png';
    }
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      let clubId = params['clubId'] || params['id'];

      // Si no se proporcionó id en la ruta o es inválido, usar el club de la sesión activa
      if (!clubId || clubId === 'undefined' || clubId === 'null') {
        const storedSelected = localStorage.getItem('selectedClubId');
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
        clubId = storedSelected || currentUser?.club_id;
      }

      this.clubParam = clubId ? String(clubId) : '';

      if (!this.clubParam) {
        this.isLoading = false;
        this.errorMessage = 'No se ha detectado el identificador de la sede para proyectar en modo TV. Por favor accede seleccionando un club desde el panel.';
        return;
      }

      this.initTv();
    });

    this.startClock();
    this.resetControlsTimeout();
  }

  ngOnDestroy(): void {
    this.clearIntervals();
  }

  @HostListener('document:mousemove')
  @HostListener('document:keydown')
  onUserInteraction(): void {
    this.controlsVisible = true;
    this.resetControlsTimeout();
  }

  @HostListener('document:fullscreenchange')
  onFullscreenChange(): void {
    this.isFullscreen = !!document.fullscreenElement;
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'f' || event.key === 'F') {
      this.toggleFullscreen();
    } else if (event.key === 'm' || event.key === 'M') {
      this.toggleViewMode();
    } else if (event.key === ' ') {
      this.togglePause();
      event.preventDefault();
    } else if (event.key === 'ArrowRight') {
      this.nextSlide();
    } else if (event.key === 'ArrowLeft') {
      this.prevSlide();
    }
  }

  private initTv(): void {
    this.fetchData();

    // Auto-refresh de datos cada 15 segundos
    this.refreshInterval = setInterval(() => {
      this.fetchData(true);
    }, 15000);

    // Auto-rotación en modo carrusel cada 15 segundos
    this.carouselInterval = setInterval(() => {
      if (this.viewMode === 'carousel' && !this.isPaused) {
        this.nextSlide();
      }
    }, 15000);
  }

  fetchData(background: boolean = false): void {
    if (!background) {
      this.isLoading = true;
    }

    const apiUrl = environment.apiUrl || 'https://api.padelmanager.cl/prd';
    const endpoint = `${apiUrl}/clubes/get_tv_dashboard.php?club_id=${encodeURIComponent(this.clubParam)}`;

    this.http.get<any>(endpoint).subscribe({
      next: (res) => {
        if (res && res.status === 'success') {
          this.clubData = res.club || {};
          this.canchas = res.canchas_en_vivo || [];
          this.proximosTurnos = res.proximos_turnos || [];
          this.buildCanchasCartelera();
          this.cafeteriaMenu = res.cafeteria_menu || [];
          this.sponsors = res.sponsors || [];

          if (res.competiciones && res.competiciones.length > 0) {
            this.competiciones = res.competiciones;
            if (this.currentCompIndex >= this.competiciones.length) {
              this.currentCompIndex = 0;
            }
            this.syncActiveComp();
            if (!this.compRotationInterval && this.competiciones.length > 1) {
              this.startCompRotation();
            }
          } else if (res.competicion && res.competicion.tabla?.length > 0) {
            this.setupSingleFallbackComp(res.competicion);
          } else {
            this.competiciones = [];
            this.tablaPosiciones = [];
            this.competicionNombre = res.competicion?.nombre || `Ranking Oficial ${this.clubData?.nombre || 'Club'}`;
          }
          this.errorMessage = '';
        } else {
          if (!background) {
            this.errorMessage = res?.message || 'No se pudieron cargar los datos de la TV.';
          }
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error al cargar TV Dashboard:', err);
        if (!background) {
          this.errorMessage = 'Conectando con el servidor del club...';
        }
        this.isLoading = false;
      }
    });
  }

  cleanCourtName(name: string): string {
    if (!name) return 'Pista';
    return name.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
  }

  /**
   * Genera el tablero con las pistas reales configuradas en el club
   */
  buildCanchasCartelera(): void {
    // 1. Filtrar canchas de pádel (excluyendo mesas de pool u otras actividades)
    const padelCourts = this.canchas.filter(c => {
      const nom = (c.cancha_nombre || '').toLowerCase();
      return !nom.includes('pool') && !nom.includes('mesa');
    });

    const courtsToUse = padelCourts.length > 0 ? padelCourts : this.canchas;
    const result: CanchaCarteleraItem[] = [];

    // Mapear estrictamente las pistas configuradas en este club
    for (let i = 0; i < courtsToUse.length; i++) {
      const court = courtsToUse[i];
      const courtId = court ? court.cancha_id : (i + 1);
      const rawName = court ? court.cancha_nombre : `Pista ${i + 1}`;
      const cleanName = this.cleanCourtName(rawName);
      const numPista = i + 1;

      // Buscar turnos programados para esta pista en proximosTurnos
      const turnosDeCancha = this.proximosTurnos.filter(t => {
        if (t.cancha_id && court && t.cancha_id === court.cancha_id) return true;
        const tNom = (t.cancha_nombre || '').toLowerCase();
        const cNom = rawName.toLowerCase();
        return tNom.includes(`pista ${numPista}`) || tNom.includes(`pista_${numPista}`) || tNom === cNom;
      });

      if (turnosDeCancha.length > 0) {
        const tActual = turnosDeCancha[0];
        const tSiguiente = turnosDeCancha[1];

        result.push({
          cancha_id: courtId,
          cancha_nombre: cleanName,
          pista_numero: numPista,
          cancha_tipo: court?.cancha_tipo || 'Pádel Cristal',
          horario: tActual.horario || `${tActual.hora_inicio} - ${tActual.hora_fin}`,
          dupla1: tActual.dupla1 || 'Jugador 1',
          dupla2: tActual.dupla2 || 'Jugador 2',
          tipo: tActual.tipo || 'Liga Padelblox',
          en_juego: !!tActual.en_juego,
          estado: tActual.en_juego ? 'en_juego' : 'proximo_turno',
          proximo_horario: tSiguiente ? tSiguiente.horario : undefined,
          proxima_dupla: tSiguiente ? (tSiguiente.dupla2 ? `${tSiguiente.dupla1} vs ${tSiguiente.dupla2}` : tSiguiente.dupla1) : undefined
        });
      } else if (court && court.dupla1 && court.dupla1 !== 'Pista Libre') {
        result.push({
          cancha_id: courtId,
          cancha_nombre: cleanName,
          pista_numero: numPista,
          cancha_tipo: court?.cancha_tipo || 'Pádel Cristal',
          horario: court.hora_inicio ? `${court.hora_inicio} - ${court.hora_fin}` : 'Turno Activo',
          dupla1: court.dupla1,
          dupla2: court.dupla2 || '',
          tipo: court.tipo_evento || 'Partido Club',
          en_juego: court.estado === 'en_juego',
          estado: court.estado,
          proximo_horario: undefined,
          proxima_dupla: undefined
        });
      } else {
        result.push({
          cancha_id: courtId,
          cancha_nombre: cleanName,
          pista_numero: numPista,
          cancha_tipo: court?.cancha_tipo || 'Pádel Cristal',
          horario: 'Disponible',
          dupla1: 'Pista Libre',
          dupla2: 'Sin partidos asignados',
          tipo: 'Disponible',
          en_juego: false,
          estado: 'disponible',
          proximo_horario: undefined,
          proxima_dupla: undefined
        });
      }
    }

    this.canchasCartelera = result;
  }

  private setupSingleFallbackComp(defaultCompeticion: any): void {
    if (defaultCompeticion) {
      this.competicionNombre = defaultCompeticion?.nombre || 'Liga Oficial';
      this.tablaPosiciones = defaultCompeticion?.tabla || [];
      this.competiciones = [{
        id: 1,
        nombre: this.competicionNombre,
        categoria: 'General',
        tabla: this.tablaPosiciones
      }];
      this.syncActiveComp();
    }
  }

  getActiveCompCategory(): string {
    const current = this.competiciones[this.currentCompIndex];
    return current ? (current.categoria || 'Oficial') : 'Oficial';
  }

  private startClock(): void {
    this.updateClock();
    this.clockInterval = setInterval(() => {
      this.updateClock();
    }, 1000);
  }

  private updateClock(): void {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    this.currentTime = `${hours}:${minutes}:${seconds}`;

    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const diaNom = dias[now.getDay()];
    const diaNum = now.getDate();
    const mesNom = meses[now.getMonth()];
    this.currentDate = `${diaNom} ${diaNum} de ${mesNom}`;
  }

  toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.warn('Error al activar pantalla completa:', err);
      });
    } else {
      document.exitFullscreen().catch(err => {
        console.warn('Error al salir de pantalla completa:', err);
      });
    }
  }

  toggleViewMode(): void {
    this.viewMode = (this.viewMode === 'split') ? 'carousel' : 'split';
  }

  togglePause(): void {
    this.isPaused = !this.isPaused;
  }

  nextSlide(): void {
    this.currentSlide = (this.currentSlide + 1) % this.totalSlides;
  }

  prevSlide(): void {
    this.currentSlide = (this.currentSlide - 1 + this.totalSlides) % this.totalSlides;
  }

  setSlide(index: number): void {
    this.currentSlide = index;
  }

  nextComp(): void {
    if (this.competiciones.length > 1) {
      this.currentCompIndex = (this.currentCompIndex + 1) % this.competiciones.length;
      this.progressAnimationKey++;
      this.syncActiveComp();
      this.startCompRotation();
    }
  }

  prevComp(): void {
    if (this.competiciones.length > 1) {
      this.currentCompIndex = (this.currentCompIndex - 1 + this.competiciones.length) % this.competiciones.length;
      this.progressAnimationKey++;
      this.syncActiveComp();
      this.startCompRotation();
    }
  }

  selectComp(index: number): void {
    if (index >= 0 && index < this.competiciones.length) {
      this.currentCompIndex = index;
      this.progressAnimationKey++;
      this.syncActiveComp();
      this.startCompRotation();
    }
  }

  private syncActiveComp(): void {
    const current = this.competiciones[this.currentCompIndex];
    if (current) {
      this.competicionNombre = current.nombre;
      this.tablaPosiciones = current.tabla || [];
    }
  }

  private startCompRotation(): void {
    this.clearIntervalCompRotation();
    if (this.competiciones.length > 1) {
      this.compRotationInterval = setInterval(() => {
        if (!this.isPaused) {
          this.currentCompIndex = (this.currentCompIndex + 1) % this.competiciones.length;
          this.progressAnimationKey++;
          this.syncActiveComp();
        }
      }, 10000); // Rota de categoría cada 10 segundos suavemente
    }
  }

  private clearIntervalCompRotation(): void {
    if (this.compRotationInterval) {
      clearInterval(this.compRotationInterval);
      this.compRotationInterval = null;
    }
  }

  private resetControlsTimeout(): void {
    if (this.controlsTimeout) {
      clearTimeout(this.controlsTimeout);
    }
    this.controlsTimeout = setTimeout(() => {
      this.controlsVisible = false;
    }, 4500);
  }

  private clearIntervals(): void {
    if (this.clockInterval) clearInterval(this.clockInterval);
    if (this.refreshInterval) clearInterval(this.refreshInterval);
    if (this.carouselInterval) clearInterval(this.carouselInterval);
    if (this.compRotationInterval) clearInterval(this.compRotationInterval);
    if (this.controlsTimeout) clearTimeout(this.controlsTimeout);
  }

  get canchasActivasCount(): number {
    return this.canchas.filter(c => c.estado === 'en_juego').length;
  }

  getItemIcon(item: MenuItem): string {
    const nom = (item?.nombre || '').toLowerCase();
    const cat = (item?.categoria || '').toLowerCase();

    if (nom.includes('coca') || nom.includes('pepsi') || nom.includes('fanta') || nom.includes('sprite')) return '🥤';
    if (nom.includes('agua') || nom.includes('cachantún') || nom.includes('cachantun') || nom.includes('mineral')) return '💧';
    if (nom.includes('gatorade') || nom.includes('powerade') || nom.includes('isotónica') || nom.includes('isotonica') || nom.includes('red bull') || nom.includes('monster')) return '⚡';
    if (nom.includes('cerveza') || nom.includes('corona') || nom.includes('heineken') || nom.includes('stella') || nom.includes('beer')) return '🍺';
    if (nom.includes('café') || nom.includes('cafe') || nom.includes('espresso') || nom.includes('cappuccino') || nom.includes('té') || nom.includes('te')) return '☕';
    if (nom.includes('overgrip') || nom.includes('grip')) return '🎾';
    if (nom.includes('pelota') || nom.includes('tubo') || nom.includes('bola')) return '🎾';
    if (nom.includes('pala') || nom.includes('paleta')) return '🏓';
    if (nom.includes('americano') || nom.includes('torneo') || nom.includes('inscripción') || nom.includes('inscripcion')) return '🏆';
    if (nom.includes('sándwich') || nom.includes('sandwich') || nom.includes('barra') || nom.includes('snack') || nom.includes('piqueo') || nom.includes('galleta')) return '🥪';

    if (cat.includes('bebida') || cat.includes('bar')) return '🥤';
    if (cat.includes('accesorio') || cat.includes('tienda') || cat.includes('pádel') || cat.includes('padel')) return '🎾';
    if (cat.includes('americano') || cat.includes('torneo')) return '🏆';
    if (cat.includes('cafetería') || cat.includes('cafeteria')) return '☕';
    if (cat.includes('snack') || cat.includes('comida')) return '🥪';
    return '✨';
  }

  getItemCategoryClass(item: MenuItem): string {
    const cat = (item?.categoria || '').toLowerCase();
    const nom = (item?.nombre || '').toLowerCase();

    if (cat.includes('bebida') || cat.includes('bar') || nom.includes('coca') || nom.includes('agua') || nom.includes('cachantún') || nom.includes('cerveza')) {
      return 'cat-bebida';
    }
    if (cat.includes('accesorio') || cat.includes('tienda') || nom.includes('overgrip') || nom.includes('pelota') || nom.includes('pala')) {
      return 'cat-tienda';
    }
    if (cat.includes('americano') || cat.includes('torneo') || nom.includes('americano')) {
      return 'cat-torneo';
    }
    if (cat.includes('snack') || cat.includes('comida') || cat.includes('cafetería')) {
      return 'cat-snack';
    }
    return 'cat-default';
  }

  getItemBadge(item: MenuItem): string | null {
    const nom = (item?.nombre || '').toLowerCase();
    if (nom.includes('coca-cola zero') || nom.includes('zero')) return 'Zero Azúcar';
    if (nom.includes('cachantún') || nom.includes('mineral')) return 'Fría ❄️';
    if (nom.includes('bullpadel') || nom.includes('adidas')) return 'Oficial ⭐';
    if (nom.includes('americano')) return 'Cupos Limitados 🔥';
    return null;
  }
}
