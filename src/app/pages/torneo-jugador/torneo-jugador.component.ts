import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { ApiService } from '../../services/api.service';
import { ClubesService } from '../../services/clubes.service';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { TablaPosicionesComponent } from '../liga-view/tabla-posiciones.component';

@Component({
    selector: 'app-torneo-jugador',
    standalone: true,
    imports: [CommonModule, FormsModule, SidebarComponent, TablaPosicionesComponent],
    templateUrl: './torneo-jugador.component.html',
    styleUrls: ['./torneo-jugador.component.scss']
})
export class TorneoJugadorComponent implements OnInit {
    userId: number = 0;
    userName: string = '';
    userFoto: string | null = null;
    userRole: any = 'jugador';

    activeTab: 'mis-torneos' | 'disponibles' | 'historial' = 'mis-torneos';
    myTournaments: any[] = [];
    isLoadingMyTournaments: boolean = false;

    get misTorneosActivos(): any[] {
        const today = new Date().toISOString().split('T')[0];
        return this.myTournaments.filter(t => {
            const fecha = t.fecha || t.fecha_inicio || '';
            const fechaFin = (t.fecha_fin && t.fecha_fin !== '0000-00-00') ? t.fecha_fin : (fecha || '2099-12-31');
            const estado = (t.estado || '').toLowerCase();
            if (estado === 'cerrado' || estado === 'finalizado') return false;
            return fechaFin >= today;
        });
    }

    get misTorneosHistorial(): any[] {
        const today = new Date().toISOString().split('T')[0];
        return this.myTournaments.filter(t => {
            const fecha = t.fecha || t.fecha_inicio || '';
            const fechaFin = (t.fecha_fin && t.fecha_fin !== '0000-00-00') ? t.fecha_fin : (fecha || '2099-12-31');
            const estado = (t.estado || '').toLowerCase();
            if (estado === 'cerrado' || estado === 'finalizado') return true;
            return fechaFin < today;
        });
    }

    // Pagination for Historial Tab
    historyPage: number = 1;
    historyPageSize: number = 5;

    get totalHistoryPages(): number {
        return Math.ceil(this.misTorneosHistorial.length / this.historyPageSize) || 1;
    }

    get paginatedHistoryTournaments(): any[] {
        const start = (this.historyPage - 1) * this.historyPageSize;
        return this.misTorneosHistorial.slice(start, start + this.historyPageSize);
    }

    changeHistoryPage(page: number): void {
        if (page >= 1 && page <= this.totalHistoryPages) {
            this.historyPage = page;
        }
    }

    // Available tournaments & filters
    availableTournaments: any[] = [];
    isLoading: boolean = false;
    userRegion: string = '';
    userComuna: string = '';
    selectedCompetitionFilter: 'todos' | 'torneo' | 'liga' | 'americano' = 'todos';
    searchTerm: string = '';

    // Competition Detail Modal state
    selectedCompeticionDetail: any = null;
    showDetailModal: boolean = false;
    loadingCompDetail: boolean = false;
    compDetailTab: 'inscritos' | 'fixture' | 'posiciones' = 'inscritos';
    selectedCategoryIdx: number = 0;
    selectedJornadaIdx: number = 0;

    // Bracket Modal State (for playoffs)
    selectedTournamentBracket: any = null;
    bracketRounds: any = { octavos: [], cuartos: [], semi: [], final: [] };
    showBracketModal: boolean = false;

    constructor(
        private apiService: ApiService,
        private clubesService: ClubesService,
        private router: Router
    ) { }

    ngOnInit(): void {
        const user = this.apiService.getCurrentUser();
        if (user) {
            this.userId = user.id;
            this.userName = user.nombre || 'Jugador';
            this.userFoto = user.foto || null;
            this.userRole = user.rol || 'jugador';

            this.loadUserData();
            this.loadMyTournaments();
        } else {
            this.router.navigate(['/login']);
        }
    }

    loadUserData(): void {
        this.apiService.getPerfil(this.userId).subscribe({
            next: (res) => {
                if (res.success && res.user) {
                    this.userName = res.user.nombre || this.userName;
                    this.userFoto = res.user.foto_perfil || this.userFoto;
                    this.userRole = res.user.rol || this.userRole;
                }
                if (res.direccion) {
                    this.userRegion = res.direccion.region || '';
                    this.userComuna = res.direccion.comuna || '';
                }
                this.loadAvailableTournaments();
            },
            error: (err) => {
                console.error('Error loading profile', err);
                this.loadAvailableTournaments();
            }
        });
    }

    loadMyTournaments(): void {
        if (!this.userId) return;
        this.isLoadingMyTournaments = true;
        this.clubesService.getMisTorneosCompleto(this.userId).subscribe({
            next: (res) => {
                this.myTournaments = res || [];
                this.isLoadingMyTournaments = false;
            },
            error: (err) => {
                console.error('Error loading my tournaments', err);
                this.myTournaments = [];
                this.isLoadingMyTournaments = false;
            }
        });
    }

    loadAvailableTournaments(showAll: boolean = false): void {
        this.isLoading = true;
        this.clubesService.getTorneosPublicos(this.userRegion, this.userComuna, showAll).subscribe({
            next: (res: any[]) => {
                const rawList = Array.isArray(res) ? res : [];
                this.availableTournaments = [...rawList];

                // Ensure ligas are included
                this.clubesService.getLigas().subscribe({
                    next: (resLigas: any) => {
                        const ligasArr = resLigas?.ligas || (Array.isArray(resLigas) ? resLigas : []);
                        if (Array.isArray(ligasArr) && ligasArr.length > 0) {
                            const existingIds = new Set(this.availableTournaments.filter(t => t.table_source === 'liga').map(t => Number(t.id)));
                            for (const l of ligasArr) {
                                if (!existingIds.has(Number(l.id))) {
                                    this.availableTournaments.push({
                                        ...l,
                                        table_source: 'liga',
                                        tipo: 'Liga',
                                        club_id: Number(l.club_id) > 0 ? Number(l.club_id) : 0,
                                        imagen: l.imagen_url || '',
                                        fecha_display: l.fecha_inicio || '',
                                        fecha: l.fecha_inicio || '',
                                        inscritos: l.total_parejas || 0
                                    });
                                }
                            }
                        }
                        this.processClubesConCompetencias();
                        this.isLoading = false;
                    },
                    error: () => {
                        this.processClubesConCompetencias();
                        this.isLoading = false;
                    }
                });
            },
            error: (err) => {
                console.error('Error loading tournaments', err);
                this.isLoading = false;
            }
        });
    }

    clubesConCompetencias: any[] = [];
    selectedClubId: number | null = null;

    processClubesConCompetencias(): void {
        this.clubesService.getClubes().subscribe({
            next: (res: any[]) => {
                const allClubs = Array.isArray(res) ? res : [];
                this.clubesConCompetencias = allClubs.map(c => {
                    const clubId = Number(c.id);
                    const clubComps = this.availableTournaments.filter(t => {
                        const tClubId = Number(t.club_id);
                        if (tClubId === clubId) return true;
                        if (c.nombre && t.club_nombre && t.club_nombre.toLowerCase().includes(c.nombre.toLowerCase())) return true;
                        return false;
                    });

                    const numAmericanos = clubComps.filter(t => (t.table_source === 'americanos' || t.tipo === 'Americano' || t.tipo_torneo === 'americano')).length;
                    const numTorneos = clubComps.filter(t => (t.table_source === 'v2' || t.tipo === 'Torneo' || t.tipo_torneo === 'v2')).length;
                    const numLigas = clubComps.filter(t => (t.table_source === 'liga' || t.tipo === 'Liga')).length;

                    return {
                        ...c,
                        numAmericanos,
                        numTorneos,
                        numLigas,
                        totalCompeticiones: numAmericanos + numTorneos + numLigas
                    };
                }).filter(c => c.totalCompeticiones > 0);
            },
            error: (err) => {
                console.error('Error fetching clubes con competencias', err);
            }
        });
    }

    filterByClub(clubId: number | null): void {
        this.selectedClubId = (this.selectedClubId === clubId) ? null : clubId;
    }

    getSelectedClubName(): string {
        if (!this.selectedClubId) return '';
        const found = this.clubesConCompetencias.find(c => Number(c.id) === Number(this.selectedClubId));
        return found?.nombre || '';
    }

    get filteredAvailableTournaments(): any[] {
        let list = this.availableTournaments;

        if (this.selectedClubId) {
            list = list.filter(t => {
                const tClubId = Number(t.club_id);
                if (tClubId === this.selectedClubId) return true;
                const selectedClub = this.clubesConCompetencias.find(c => Number(c.id) === Number(this.selectedClubId));
                if (selectedClub && t.club_nombre && t.club_nombre.toLowerCase().includes(selectedClub.nombre.toLowerCase())) return true;
                return false;
            });
        }

        if (this.selectedCompetitionFilter === 'torneo') {
            list = list.filter(t => (t.table_source === 'v2' || t.tipo === 'Torneo' || t.tipo_torneo === 'v2'));
        } else if (this.selectedCompetitionFilter === 'liga') {
            list = list.filter(t => (t.table_source === 'liga' || t.tipo === 'Liga'));
        } else if (this.selectedCompetitionFilter === 'americano') {
            list = list.filter(t => (t.table_source === 'americanos' || t.tipo === 'Americano' || t.tipo_torneo === 'americano'));
        }

        if (this.searchTerm && this.searchTerm.trim() !== '') {
            const term = this.searchTerm.toLowerCase().trim();
            list = list.filter(t =>
                (t.nombre && t.nombre.toLowerCase().includes(term)) ||
                (t.club_nombre && t.club_nombre.toLowerCase().includes(term)) ||
                (t.comuna && t.comuna.toLowerCase().includes(term))
            );
        }

        return list;
    }

    isEnrolled(comp: any): boolean {
        if (!comp) return false;
        const compId = Number(comp.id);
        const compTipo = (comp.tipo || comp.tipo_torneo || comp.table_source || '').toLowerCase();

        return this.myTournaments.some(t => {
            const tId = Number(t.id);
            const tTipo = (t.tipo || t.tipo_torneo || t.table_source || '').toLowerCase();
            if (tId === compId) {
                if (compTipo.includes('liga') && tTipo.includes('liga')) return true;
                if (compTipo.includes('americano') && tTipo.includes('americano')) return true;
                if (!compTipo.includes('liga') && !compTipo.includes('americano') && !tTipo.includes('liga') && !tTipo.includes('americano')) return true;
            }
            return false;
        });
    }

    selectedCompeticionOrigin: any = null;

    getEnrolledCategoryName(comp?: any): string {
        const target = comp || this.selectedCompeticionOrigin || this.selectedCompeticionDetail;
        if (!target) return '';
        if (this.currentDetailCategory?.nombre) return this.currentDetailCategory.nombre;
        if (this.selectedCompeticionOrigin?.categoria_nombre) return this.selectedCompeticionOrigin.categoria_nombre;
        if (target.categoria_nombre) return target.categoria_nombre;
        if (target.categoria) return target.categoria;
        const compId = Number(target.id);
        const compTipo = (target.tipo || target.tipo_torneo || target.table_source || '').toLowerCase();

        const found = this.myTournaments.find(t => {
            const tId = Number(t.id);
            const tTipo = (t.tipo || t.tipo_torneo || t.table_source || '').toLowerCase();
            if (tId === compId) {
                if (compTipo.includes('liga') && tTipo.includes('liga')) return true;
                if (compTipo.includes('americano') && tTipo.includes('americano')) return true;
                if (!compTipo.includes('liga') && !compTipo.includes('americano') && !tTipo.includes('liga') && !tTipo.includes('americano')) return true;
            }
            return false;
        });
        return found?.categoria_nombre || found?.categoria || '';
    }

    getMatchTimestamp(match: any): number {
        if (!match) return Infinity;
        const rawStr = match.fecha_hora || match.fecha;
        if (!rawStr) return Infinity;
        const datePart = rawStr.includes(' ') ? rawStr.split(' ')[0] : rawStr;
        if (!datePart.match(/^\d{4}-\d{2}-\d{2}$/)) return Infinity;
        const [y, m, d] = datePart.split('-').map((v: string) => parseInt(v, 10));
        let hour = 0, min = 0;
        const horaStr = match.hora || (rawStr.includes(' ') ? rawStr.split(' ')[1] : '');
        if (horaStr && horaStr.includes(':')) {
            const parts = horaStr.split(':');
            hour = parseInt(parts[0], 10) || 0;
            min = parseInt(parts[1], 10) || 0;
        }
        return new Date(y, m - 1, d, hour, min).getTime();
    }

    getUpcomingMatch(comp: any): any {
        if (!comp || !comp.partidos || !Array.isArray(comp.partidos)) return null;
        const pending = comp.partidos.filter((p: any) => {
            const estado = (p.estado || '').toLowerCase();
            const isPlayed = estado === 'jugado' || estado === 'finalizado' || estado === 'walkover' || (p.resultado_t1 !== null && p.resultado_t1 !== undefined);
            return !isPlayed;
        });
        if (pending.length === 0) return null;
        pending.sort((a: any, b: any) => this.getMatchTimestamp(a) - this.getMatchTimestamp(b));
        return pending[0];
    }

    get globalUpcomingMatch(): { torneo: any; match: any } | null {
        if (!this.misTorneosActivos || this.misTorneosActivos.length === 0) return null;
        const allUpcoming: { torneo: any; match: any; timestamp: number }[] = [];

        for (const t of this.misTorneosActivos) {
            const match = this.getUpcomingMatch(t);
            if (match) {
                const timestamp = this.getMatchTimestamp(match);
                allUpcoming.push({ torneo: t, match, timestamp });
            }
        }

        if (allUpcoming.length === 0) return null;
        allUpcoming.sort((a, b) => a.timestamp - b.timestamp);
        return { torneo: allUpcoming[0].torneo, match: allUpcoming[0].match };
    }

    openCompeticionDetail(comp: any): void {
        const id = comp.id;
        const tipo = comp.table_source || comp.tipo_torneo || comp.tipo || 'v2';

        this.selectedCompeticionOrigin = comp;
        this.loadingCompDetail = true;
        this.showDetailModal = true;

        this.clubesService.getCompeticionDetalle(id, tipo).subscribe({
            next: (res: any) => {
                this.loadingCompDetail = false;
                if (res.success && res.competicion) {
                    this.selectedCompeticionDetail = res.competicion;
                    this.compDetailTab = 'inscritos';
                    this.soloMisPartidosFixture = true;

                    let targetIdx = 0;
                    const originCatId = Number(comp.categoria_id || comp.id_categoria);
                    const originCatName = (comp.categoria_nombre || comp.categoria || '').toLowerCase().trim();

                    if (res.competicion.categorias && res.competicion.categorias.length > 0) {
                        if (originCatId) {
                            const foundIdx = res.competicion.categorias.findIndex(
                                (c: any) => Number(c.id) === originCatId || Number(c.categoria_id) === originCatId
                            );
                            if (foundIdx !== -1) targetIdx = foundIdx;
                        } else if (originCatName) {
                            const foundIdx = res.competicion.categorias.findIndex(
                                (c: any) => (c.nombre || '').toLowerCase().trim() === originCatName
                            );
                            if (foundIdx !== -1) targetIdx = foundIdx;
                        }
                    }
                    this.selectedCategoryIdx = targetIdx;
                    this.selectedJornadaIdx = 0;
                } else {
                    Swal.fire('Aviso', res.error || 'No se pudo obtener el detalle de la competición.', 'info');
                    this.showDetailModal = false;
                }
            },
            error: (err: any) => {
                this.loadingCompDetail = false;
                Swal.fire('Error', 'No se pudo conectar con el servidor', 'error');
                this.showDetailModal = false;
            }
        });
    }

    closeDetailModal(): void {
        this.showDetailModal = false;
        this.selectedCompeticionDetail = null;
        this.selectedCompeticionOrigin = null;
    }

    // Pagination for Inscritos / Parejas in Detail Modal
    paginaActualInscritosDetail: number = 1;
    itemsPorPaginaInscritosDetail: number = 8;

    get listInscritosCategoryDetail(): any[] {
        if (!this.currentDetailCategory) return [];
        return this.currentDetailCategory.parejas || this.currentDetailCategory.inscritos || [];
    }

    get totalPaginasInscritosDetail(): number {
        return Math.ceil(this.listInscritosCategoryDetail.length / this.itemsPorPaginaInscritosDetail) || 1;
    }

    get parejasPaginadasDetail(): any[] {
        const inicio = (this.paginaActualInscritosDetail - 1) * this.itemsPorPaginaInscritosDetail;
        return this.listInscritosCategoryDetail.slice(inicio, inicio + this.itemsPorPaginaInscritosDetail);
    }

    cambiarPaginaInscritosDetail(pag: number): void {
        if (pag >= 1 && pag <= this.totalPaginasInscritosDetail) {
            this.paginaActualInscritosDetail = pag;
        }
    }

    get displayCategorias(): any[] {
        if (!this.selectedCompeticionDetail?.categorias) return [];
        return this.selectedCompeticionDetail.categorias;
    }

    getEnrolledCategoryObj(comp: any): any {
        if (!comp || !comp.categorias || !Array.isArray(comp.categorias) || comp.categorias.length === 0) return null;

        const enrolledComp = this.selectedCompeticionOrigin || this.myTournaments?.find((t: any) => {
            const compId = Number(comp.id);
            const tId = Number(t.id);
            const compTipo = (comp.tipo || comp.tipo_torneo || comp.table_source || '').toLowerCase();
            const tTipo = (t.tipo || t.tipo_torneo || t.table_source || '').toLowerCase();
            if (tId === compId) {
                if (compTipo.includes('liga') && tTipo.includes('liga')) return true;
                if (compTipo.includes('americano') && tTipo.includes('americano')) return true;
                if (!compTipo.includes('liga') && !compTipo.includes('americano') && !tTipo.includes('liga') && !tTipo.includes('americano')) return true;
            }
            return false;
        });

        const targetCatId = Number(enrolledComp?.categoria_id || enrolledComp?.id_categoria || comp.categoria_id || comp.id_categoria);
        const targetCatName = (enrolledComp?.categoria_nombre || enrolledComp?.categoria || comp.categoria_nombre || '').toLowerCase().trim();
        const targetParejaId = Number(enrolledComp?.pareja_id || comp.pareja_id);
        const targetParejaName = (enrolledComp?.nombre_pareja || comp.nombre_pareja || '').toLowerCase().trim();
        const uId = Number(localStorage.getItem('userId')) || Number(this.userId);

        // Pass 1: Check category ID or name first
        for (const cat of comp.categorias) {
            if (targetCatId && (Number(cat.id) === targetCatId || Number(cat.categoria_id) === targetCatId)) {
                return cat;
            }
            if (targetCatName && cat.nombre && (cat.nombre.toLowerCase().trim() === targetCatName || cat.nombre.toLowerCase().includes(targetCatName) || targetCatName.includes(cat.nombre.toLowerCase()))) {
                return cat;
            }
        }

        // Pass 2: Check parejas/inscritos/tabla_posiciones list in category
        for (const cat of comp.categorias) {
            const list = [...(cat.parejas || []), ...(cat.inscritos || []), ...(cat.tabla_posiciones || [])];
            for (const p of list) {
                if (targetParejaId && (Number(p.id) === targetParejaId || Number(p.pareja_id) === targetParejaId)) {
                    return cat;
                }
                if (targetParejaName && p.nombre_pareja && p.nombre_pareja.toLowerCase().trim() === targetParejaName) {
                    return cat;
                }
                if (uId && (Number(p.jugador1_id) === uId || Number(p.jugador2_id) === uId || Number(p.p1_j1_id) === uId || Number(p.p1_j2_id) === uId || Number(p.p2_j1_id) === uId || Number(p.p2_j2_id) === uId || Number(p.usuario_id) === uId)) {
                    return cat;
                }
            }
        }

        // Pass 3: Check matches in category jornadas/partidos
        for (const cat of comp.categorias) {
            const partidos: any[] = [...(cat.partidos || [])];
            if (cat.jornadas && Array.isArray(cat.jornadas)) {
                cat.jornadas.forEach((j: any) => {
                    if (j.partidos && Array.isArray(j.partidos)) partidos.push(...j.partidos);
                });
            }
            for (const m of partidos) {
                if (this.isUserInMatch(m, enrolledComp || comp)) {
                    return cat;
                }
            }
        }

        return comp.categorias[0] || null;
    }

    get currentDetailCategory(): any {
        const cats = this.displayCategorias;
        if (!cats || cats.length === 0) return null;
        return cats[this.selectedCategoryIdx] || cats[0] || null;
    }

    get currentDetailPosiciones(): any[] {
        if (!this.currentDetailCategory) return [];
        const pos = this.currentDetailCategory.posiciones || this.currentDetailCategory.tabla_posiciones;
        if (pos && Array.isArray(pos) && pos.length > 0) {
            return pos;
        }

        // Fallback: Si no hay tabla de posiciones explícita pero hay parejas inscritas, mostrar las parejas
        const inscritos = this.currentDetailCategory.parejas || this.currentDetailCategory.inscritos || [];
        if (inscritos.length > 0) {
            return inscritos.map((p: any, idx: number) => ({
                posicion: idx + 1,
                nombre_pareja: p.nombre_pareja || `${p.jugador1 || 'J1'} / ${p.jugador2 || 'J2'}`,
                pj: p.pj || 0,
                pg: p.pg || 0,
                pp: p.pp || 0,
                puntos: p.puntos || 0,
                dif_sets: p.dif_sets || 0,
                dif_games: p.dif_games || 0
            }));
        }

        return [];
    }

    get currentDetailJornadas(): any[] {
        return this.currentDetailCategory?.jornadas || [];
    }

    get currentDetailJornada(): any {
        const jornadas = this.currentDetailJornadas;
        return jornadas[this.selectedJornadaIdx] || jornadas[0] || null;
    }

    soloMisPartidosFixture: boolean = true;

    get filteredDetailJornadaPartidos(): any[] {
        const rawPartidos = this.currentDetailJornada?.partidos || [];
        if (!this.soloMisPartidosFixture) {
            return rawPartidos;
        }
        return rawPartidos.filter((m: any) => this.isUserInMatch(m, this.selectedCompeticionDetail));
    }

    isUserInMatch(match: any, torneo?: any): boolean {
        if (!match) return false;
        const torneoContext = torneo || this.selectedCompeticionDetail;

        if (torneoContext?.pareja_id) {
            const pId = Number(torneoContext.pareja_id);
            if (Number(match.pareja1_id) === pId || Number(match.pareja2_id) === pId) return true;
        }

        if (torneoContext?.nombre_pareja) {
            const myPairName = torneoContext.nombre_pareja.trim().toLowerCase();
            const p1Name = (match.pareja1_nombre || '').trim().toLowerCase();
            const p2Name = (match.pareja2_nombre || '').trim().toLowerCase();
            if (p1Name && (p1Name.includes(myPairName) || myPairName.includes(p1Name))) return true;
            if (p2Name && (p2Name.includes(myPairName) || myPairName.includes(p2Name))) return true;
        }

        const uId = Number(this.userId);
        if (uId) {
            if (Number(match.jugador1_id) === uId || Number(match.jugador2_id) === uId ||
                Number(match.jugador3_id) === uId || Number(match.jugador4_id) === uId ||
                Number(match.p1_j1_id) === uId || Number(match.p1_j2_id) === uId ||
                Number(match.p2_j1_id) === uId || Number(match.p2_j2_id) === uId) {
                return true;
            }
        }

        const myNameWords = (this.userName || '').toLowerCase().split(' ').filter((w: string) => w.length >= 3);
        if (myNameWords.length > 0) {
            const fullMatchStr = `${match.pareja1_nombre || ''} ${match.pareja2_nombre || ''} ${match.jugador1_nombre || ''} ${match.jugador2_nombre || ''} ${match.jugador3_nombre || ''} ${match.jugador4_nombre || ''}`.toLowerCase();
            if (myNameWords.some((w: string) => fullMatchStr.includes(w))) return true;
        }

        return false;
    }

    getMatchFechaDisplay(match: any): string {
        if (!match) return 'Por programar';
        const rawStr = match.fecha_hora || match.fecha;
        if (!rawStr) return 'Por programar';

        try {
            const datePart = rawStr.includes(' ') ? rawStr.split(' ')[0] : rawStr;
            const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
            const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

            if (datePart.match(/^\d{4}-\d{2}-\d{2}$/)) {
                const [yStr, mStr, dStr] = datePart.split('-');
                const y = parseInt(yStr, 10);
                const m = parseInt(mStr, 10);
                const d = parseInt(dStr, 10);
                const dt = new Date(y, m - 1, d);
                const dayName = days[dt.getDay()];
                const monthName = months[m - 1] || mStr;
                return `${dayName}, ${d} ${monthName} ${y}`;
            }

            if (datePart.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                const [dStr, mStr, yStr] = datePart.split('/');
                const y = parseInt(yStr, 10);
                const m = parseInt(mStr, 10);
                const d = parseInt(dStr, 10);
                const dt = new Date(y, m - 1, d);
                const dayName = days[dt.getDay()];
                const monthName = months[m - 1] || mStr;
                return `${dayName}, ${d} ${monthName} ${y}`;
            }

            const textMatch = String(rawStr).trim().match(/^(\d{1,2})\s+([A-Za-záéíóúÁÉÍÓÚ]+)\s+(\d{4})/);
            if (textMatch) {
                const d = parseInt(textMatch[1], 10);
                const mNameRaw = textMatch[2].toLowerCase();
                const y = parseInt(textMatch[3], 10);
                const monthIdx = months.findIndex(m => mNameRaw.startsWith(m.toLowerCase()));
                if (monthIdx !== -1) {
                    const dt = new Date(y, monthIdx, d);
                    const dayName = days[dt.getDay()];
                    return `${dayName}, ${d} ${months[monthIdx]} ${y}`;
                }
            }

            return datePart;
        } catch (e) {
            return rawStr;
        }
    }

    getMatchHoraDisplay(match: any): string {
        if (!match) return 'Por definir';
        if (match.hora && match.hora !== '00:00:00' && match.hora !== '00:00') {
            return match.hora.substring(0, 5) + ' hrs';
        }
        if (match.fecha_hora && match.fecha_hora.includes(' ')) {
            const timePart = match.fecha_hora.split(' ')[1];
            if (timePart && timePart !== '00:00:00' && timePart !== '00:00') {
                return timePart.substring(0, 5) + ' hrs';
            }
        }
        return 'Por definir';
    }

    getMatchCanchaDisplay(match: any): string {
        if (!match) return 'Por asignar';
        const cName = match.cancha_nombre || match.cancha;
        if (cName && String(cName).trim() !== '') {
            return String(cName);
        }
        return 'Por asignar';
    }

    isUserInTeam2(match: any, torneo?: any): boolean {
        if (!match) return false;
        const userId = this.userId;

        // 1. Direct ID checks against pareja_id on competition
        if (torneo?.pareja_id && match.pareja2_id && Number(match.pareja2_id) === Number(torneo.pareja_id)) {
            return true;
        }
        if (torneo?.pareja_id && match.pareja1_id && Number(match.pareja1_id) === Number(torneo.pareja_id)) {
            return false;
        }

        // 2. Direct name matching against torneo.nombre_pareja
        if (torneo?.nombre_pareja) {
            const myPairName = torneo.nombre_pareja.trim().toLowerCase();
            const p1Name = (match.pareja1_nombre || '').trim().toLowerCase();
            const p2Name = (match.pareja2_nombre || '').trim().toLowerCase();
            if (p2Name && (p2Name.includes(myPairName) || myPairName.includes(p2Name))) {
                return true;
            }
            if (p1Name && (p1Name.includes(myPairName) || myPairName.includes(p1Name))) {
                return false;
            }
        }

        // 3. Check individual player IDs
        if (userId) {
            if (Number(match.jugador3_id) === userId || Number(match.jugador4_id) === userId) return true;
            if (Number(match.p2_j1_id) === userId || Number(match.p2_j2_id) === userId) return true;
            if (Number(match.jugador1_id) === userId || Number(match.jugador2_id) === userId) return false;
            if (Number(match.p1_j1_id) === userId || Number(match.p1_j2_id) === userId) return false;
        }

        // 4. Check player names (first name or full name of user)
        const p2Str = `${match.pareja2_nombre || ''} ${match.jugador3_nombre || ''} ${match.jugador4_nombre || ''}`.toLowerCase();
        const p1Str = `${match.pareja1_nombre || ''} ${match.jugador1_nombre || ''} ${match.jugador2_nombre || ''}`.toLowerCase();
        const myFirstName = (this.userName || '').split(' ')[0].trim().toLowerCase();
        if (myFirstName && myFirstName.length >= 3) {
            if (p2Str.includes(myFirstName) && !p1Str.includes(myFirstName)) {
                return true;
            }
            if (p1Str.includes(myFirstName)) {
                return false;
            }
        }
        return false;
    }

    getMatchTeamNames(match: any, torneo?: any): { team1: string, team2: string } {
        if (!match) return { team1: 'Pareja 1', team2: 'Pareja 2' };

        let t1Name = match.pareja1_nombre || (match.jugador1_nombre ? `${match.jugador1_nombre} / ${match.jugador2_nombre || ''}` : 'Pareja 1');
        let t2Name = match.pareja2_nombre || (match.jugador3_nombre ? `${match.jugador3_nombre} / ${match.jugador4_nombre || ''}` : 'Pareja 2');

        if (this.isUserInTeam2(match, torneo)) {
            return {
                team1: t2Name,
                team2: t1Name
            };
        }

        return {
            team1: t1Name,
            team2: t2Name
        };
    }

    getMatchScore(match: any, torneo?: any): string {
        if (!match) return 'Pendiente';

        const flip = this.isUserInTeam2(match, torneo);

        if (match.set1_p1 !== undefined && match.set1_p1 !== null && (Number(match.set1_p1) > 0 || Number(match.set1_p2) > 0)) {
            const s1_1 = flip ? match.set1_p2 : match.set1_p1;
            const s1_2 = flip ? match.set1_p1 : match.set1_p2;
            let s = `${s1_1}-${s1_2}`;

            if (Number(match.set2_p1) > 0 || Number(match.set2_p2) > 0) {
                const s2_1 = flip ? match.set2_p2 : match.set2_p1;
                const s2_2 = flip ? match.set2_p1 : match.set2_p2;
                s += `, ${s2_1}-${s2_2}`;
            }
            if (Number(match.set3_p1) > 0 || Number(match.set3_p2) > 0) {
                const s3_1 = flip ? match.set3_p2 : match.set3_p1;
                const s3_2 = flip ? match.set3_p1 : match.set3_p2;
                s += `, ${s3_1}-${s3_2}`;
            }
            return s;
        }

        if (match.resultado_t1 === null || match.resultado_t1 === undefined) return 'Pendiente';

        const r1 = flip ? match.resultado_t2 : match.resultado_t1;
        const r2 = flip ? match.resultado_t1 : match.resultado_t2;
        return `${r1} - ${r2}`;
    }

    getMatchResult(match: any, torneo?: any): 'win' | 'loss' | 'draw' | 'pending' {
        if (!match) return 'pending';
        const estado = (match.estado || '').toLowerCase();

        if (match.pareja_ganadora_id !== undefined && match.pareja_ganadora_id !== null && Number(match.pareja_ganadora_id) > 0) {
            const myParejaId = torneo?.pareja_id;
            if (myParejaId) {
                return Number(match.pareja_ganadora_id) === Number(myParejaId) ? 'win' : 'loss';
            }
            if (this.isUserInTeam2(match, torneo)) {
                return Number(match.pareja_ganadora_id) === Number(match.pareja2_id) ? 'win' : 'loss';
            } else {
                return Number(match.pareja_ganadora_id) === Number(match.pareja1_id) ? 'win' : 'loss';
            }
        }
        if (match.gane !== undefined && match.gane !== null) {
            return match.gane ? 'win' : 'loss';
        }
        if (match.jugador1_id) {
            const isTeam1 = match.jugador1_id == this.userId || match.jugador2_id == this.userId;
            const r1 = Number(match.resultado_t1 || 0);
            const r2 = Number(match.resultado_t2 || 0);
            if (match.resultado_t1 === null || match.resultado_t1 === undefined) return 'pending';
            if (r1 === r2) return 'draw';
            if (isTeam1) return r1 > r2 ? 'win' : 'loss';
            return r2 > r1 ? 'win' : 'loss';
        }

        if (match.resultado_t1 === null && match.resultado_t1 === undefined && !match.set1_p1 && estado !== 'jugado') {
            return 'pending';
        }
        return 'pending';
    }

    formatPrecio(precio: any): string {
        if (precio === null || precio === undefined || precio === '' || precio === 0 || precio === '0' || precio === '0.00' || precio === 0.00) {
            return '';
        }
        const val = typeof precio === 'number' ? precio : parseFloat(String(precio).replace(/[^0-9.]/g, ''));
        if (isNaN(val) || val <= 0) return '';
        return '$' + Math.round(val).toLocaleString('es-CL');
    }

    // Bracket logic for V2 elimination stage
    viewTournamentBracket(t: any) {
        this.isLoading = true;
        this.selectedTournamentBracket = t;

        const catId = t.categoria_id || t.id_categoria;
        if (catId) {
            this.loadBracketData(catId);
        } else {
            this.clubesService.getCategoriasTorneo(t.id).subscribe(cats => {
                if (cats && cats.length > 0) {
                    this.loadBracketData(cats[0].id);
                } else {
                    this.isLoading = false;
                    Swal.fire('Info', 'No hay categorías configuradas para el cuadro', 'info');
                }
            });
        }
    }

    loadBracketData(catId: number) {
        this.clubesService.getPartidosRonda(catId, '').subscribe({
            next: (res) => {
                this.organizeBracket(res);
                this.isLoading = false;
                this.showBracketModal = true;
            },
            error: (err) => {
                this.isLoading = false;
                Swal.fire('Error', 'No se pudo cargar el cuadro', 'error');
            }
        });
    }

    organizeBracket(matches: any[]) {
        this.bracketRounds = { octavos: [], cuartos: [], semi: [], final: [] };
        matches.forEach(m => {
            const r = (m.ronda || '').toLowerCase();
            if (r.includes('octavos') || r.includes('16')) this.bracketRounds.octavos.push(m);
            else if (r.includes('cuartos') || r.includes('quarter')) this.bracketRounds.cuartos.push(m);
            else if (r.includes('semi')) this.bracketRounds.semi.push(m);
            else if (r.includes('final')) this.bracketRounds.final.push(m);
        });

        this.bracketRounds.octavos.sort((a: any, b: any) => a.id - b.id);
        this.bracketRounds.cuartos.sort((a: any, b: any) => a.id - b.id);
        this.bracketRounds.semi.sort((a: any, b: any) => a.id - b.id);
    }

    closeBracket() {
        this.showBracketModal = false;
        this.selectedTournamentBracket = null;
    }

    // Enrollment / Registration Flow
    inscribirse(torneoIdOrObj: any): void {
        const torneoId = typeof torneoIdOrObj === 'object' ? torneoIdOrObj.id : torneoIdOrObj;
        this.isLoading = true;
        this.apiService.getUsers('jugador').subscribe({
            next: (users) => {
                this.isLoading = false;

                let selectedUserId: number | null = null;
                let finalPartnerName = '';

                Swal.fire({
                    title: 'Inscribir Pareja',
                    html: `
                        <div style="text-align: left; padding: 0 5px;">
                            <p style="font-size: 14px; color: #666; margin-bottom: 10px;">Escribe el nombre de tu compañero:</p>
                            <div style="position: relative;">
                                <input id="partner-search" class="swal2-input" placeholder="Buscar usuario o escribir nombre..." 
                                       style="width: 100%; margin: 0; box-sizing: border-box; font-size: 15px;">
                                <div id="results-container" style="position: absolute; width: 100%; max-height: 180px; 
                                     overflow-y: auto; margin-top: 2px; border: 1px solid #ddd; border-radius: 8px; 
                                     display: none; background: #fff; z-index: 1000; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                                </div>
                            </div>
                            <div id="selection-badge" style="display: none; margin-top: 10px; padding: 8px 12px; 
                                 background: #f0f4ef; border-radius: 20px; border: 1px solid #2d5a27; color: #2d5a27; font-weight: 600; font-size: 13px;">
                                <span id="selected-name"></span>
                                <span id="remove-selection" style="margin-left: 10px; cursor: pointer; color: #d32f2f;">✕</span>
                            </div>
                            <p id="hint-text" style="font-size: 11px; color: #999; margin-top: 10px;">
                                * Si aparece en la lista, selecciónalo para que el torneo cuente para su ranking.
                            </p>
                        </div>
                    `,
                    showCancelButton: true,
                    confirmButtonText: 'Inscribirse',
                    cancelButtonText: 'Cancelar',
                    confirmButtonColor: '#2d5a27',
                    didOpen: () => {
                        const input = document.getElementById('partner-search') as HTMLInputElement;
                        const container = document.getElementById('results-container') as HTMLElement;
                        const badge = document.getElementById('selection-badge') as HTMLElement;
                        const selectedNameSpan = document.getElementById('selected-name') as HTMLElement;
                        const removeBtn = document.getElementById('remove-selection') as HTMLElement;
                        const hint = document.getElementById('hint-text') as HTMLElement;

                        const updateSelection = (id: number | null, name: string) => {
                            selectedUserId = id;
                            finalPartnerName = name;
                            if (id) {
                                input.style.display = 'none';
                                container.style.display = 'none';
                                badge.style.display = 'inline-block';
                                selectedNameSpan.textContent = `Registrado: ${name}`;
                                hint.textContent = '✓ Vinculado a usuario registrado';
                            } else {
                                input.style.display = 'block';
                                badge.style.display = 'none';
                                hint.textContent = '* Si aparece en la lista, selecciónalo para su ranking.';
                            }
                        };

                        removeBtn.onclick = () => updateSelection(null, input.value);

                        input.addEventListener('input', (e) => {
                            const val = (e.target as HTMLInputElement).value.toLowerCase();
                            finalPartnerName = (e.target as HTMLInputElement).value;

                            if (val.length < 2) {
                                container.style.display = 'none';
                                return;
                            }

                            const filtered = users.filter((u: any) =>
                                u.nombre.toLowerCase().includes(val) && u.id !== this.userId
                            ).slice(0, 5);

                            if (filtered.length > 0) {
                                container.innerHTML = filtered.map((u: any) => `
                                    <div class="swal-search-item" data-id="${u.id}" data-name="${u.nombre}" 
                                         style="padding: 12px; cursor: pointer; border-bottom: 1px solid #f5f5f5; text-align: left;">
                                        <div style="font-weight: 600; font-size: 14px; color: #333;">${u.nombre}</div>
                                        <div style="font-size: 11px; color: #2d5a27;">Compañero Registrado • ${u.categoria || 'Sin nivel'}</div>
                                    </div>
                                `).join('');
                                container.style.display = 'block';

                                container.querySelectorAll('.swal-search-item').forEach(item => {
                                    (item as HTMLElement).onmouseover = () => (item as HTMLElement).style.background = '#f9f9f9';
                                    (item as HTMLElement).onmouseout = () => (item as HTMLElement).style.background = '#fff';
                                    (item as HTMLElement).onclick = () => {
                                        updateSelection(
                                            parseInt(item.getAttribute('data-id') || '0'),
                                            item.getAttribute('data-name') || ''
                                        );
                                    };
                                });
                            } else {
                                container.style.display = 'none';
                            }
                        });
                    },
                    preConfirm: () => {
                        const name = finalPartnerName || (document.getElementById('partner-search') as HTMLInputElement).value;
                        if (!name) {
                            Swal.showValidationMessage('¡El nombre es obligatorio!');
                            return false;
                        }
                        return { id: selectedUserId, name: name };
                    }
                }).then((result) => {
                    if (result.isConfirmed) {
                        this.confirmRegistration(torneoId, result.value.id, result.value.name, !!result.value.id);
                    }
                });
            },
            error: (err) => {
                this.isLoading = false;
                Swal.fire({
                    title: 'Nombre de tu Pareja',
                    input: 'text',
                    showCancelButton: true,
                    confirmButtonColor: '#2d5a27'
                }).then(r => {
                    if (r.isConfirmed && r.value) this.confirmRegistration(torneoId, null, r.value, false);
                });
            }
        });
    }

    private confirmRegistration(torneoId: number, partnerId: any, partnerName: string, isRegistered: boolean): void {
        this.isLoading = true;

        const registrationData: any = {
            torneo_id: torneoId,
            usuario_id: this.userId
        };

        if (isRegistered) {
            registrationData.jugador2_id = partnerId;
            registrationData.nombre_pareja = 'Pareja con ' + partnerName;
        } else {
            registrationData.nombre_2 = partnerName;
            registrationData.nombre_pareja = 'Pareja con ' + partnerName;
        }

        this.clubesService.joinTorneoManual(registrationData).subscribe({
            next: (res) => {
                Swal.fire({
                    title: '¡Éxito!',
                    text: 'Inscripción realizada correctamente.',
                    icon: 'success',
                    confirmButtonColor: '#2d5a27'
                });
                this.loadMyTournaments();
                this.loadAvailableTournaments();
                if (this.showDetailModal) {
                    this.closeDetailModal();
                }
            },
            error: (err) => {
                this.isLoading = false;
                const errMsg = err.error?.error || 'Error al inscribirse';
                Swal.fire({
                    title: 'Error',
                    text: errMsg,
                    icon: 'error',
                    confirmButtonColor: '#2d5a27'
                });
            }
        });
    }

    navigate(path: string) {
        this.router.navigate([path]);
    }
}
