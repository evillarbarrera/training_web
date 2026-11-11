import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClubesService } from '../../services/clubes.service';
import { ApiService } from '../../services/api.service';
import { AssetService } from '../../services/asset.service';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';

import Swal from 'sweetalert2';

@Component({
    selector: 'app-ranking',
    standalone: true,
    imports: [CommonModule, FormsModule, SidebarComponent],
    templateUrl: './ranking.component.html',
    styleUrls: ['./ranking.component.scss']
})
export class RankingComponent implements OnInit {
    ranking: any[] = [];
    userId: number = 0;
    userName: string = '';
    userFoto: string = '';
    userRole: 'jugador' | 'entrenador' | 'administrador_club' = 'jugador';
    selectedCategoria: string = 'General';
    loading: boolean = true;

    // Filtros y búsqueda
    filtroBusqueda: string = '';
    selectedRama: 'todas' | 'open' | 'damas' = 'todas';

    // Paginación
    currentPage: number = 1;
    pageSize: number = 10;
    pageSizeOptions: number[] = [10, 20, 50, 100];

    categoriasOpen: string[] = [
        'General',
        'Primera', 'Segunda', 'Tercera', 'Cuarta', 'Quinta', 'Sexta', 'Séptima'
    ];

    categoriasDamas: string[] = [
        'Damas A', 'Damas B', 'Damas C', 'Damas D', 'Damas E'
    ];

    categorias: string[] = [
        'General',
        'Primera', 'Segunda', 'Tercera', 'Cuarta', 'Quinta', 'Sexta', 'Séptima',
        'Damas A', 'Damas B', 'Damas C', 'Damas D', 'Damas E'
    ];

    get categoriasVisibles(): string[] {
        if (this.selectedRama === 'open') return this.categoriasOpen;
        if (this.selectedRama === 'damas') return this.categoriasDamas;
        return this.categorias;
    }

    setRama(rama: 'todas' | 'open' | 'damas'): void {
        this.selectedRama = rama;
        this.currentPage = 1;
        if (rama === 'damas' && !this.selectedCategoria.includes('Damas')) {
            this.setCategoria('Damas A');
        } else if (rama === 'open' && this.selectedCategoria.includes('Damas')) {
            this.setCategoria('General');
        }
    }

    clubes: any[] = [];
    selectedClubId: number = 0;
    selectedClubNombre: string = '';

    constructor(
        private clubesService: ClubesService,
        private apiService: ApiService,
        public assetService: AssetService
    ) { }

    get isAdmin(): boolean {
        const role = String(this.userRole || '').toLowerCase();
        return role.includes('admin') || role === 'administrador_club';
    }

    ngOnInit(): void {
        const user = this.apiService.getCurrentUser() || JSON.parse(localStorage.getItem('currentUser') || 'null');
        if (user) {
            this.userId = user.id;
            this.userName = user.nombre;
            this.userFoto = user.foto;
            this.userRole = (user.rol || user.role || 'jugador') as any;
            if (user.club_id) {
                this.selectedClubId = Number(user.club_id);
            }

            // Fetch fresh profile data
            this.apiService.getPerfil(this.userId).subscribe({
                next: (res) => {
                    if (res.success && res.user) {
                        this.userFoto = res.user.foto_perfil || this.userFoto;
                        this.userName = res.user.nombre || this.userName;
                    }
                }
            });
        } else {
            const storedRole = localStorage.getItem('userRole');
            if (storedRole) this.userRole = storedRole as any;
        }

        const storedClubId = localStorage.getItem('selectedClubId');
        if (storedClubId && storedClubId !== 'undefined' && storedClubId !== 'null') {
            this.selectedClubId = Number(storedClubId);
        }

        this.cargarClubesYRanking();
    }

    cargarClubesYRanking(): void {
        if (this.userId) {
            this.clubesService.getClubes(this.userId).subscribe({
                next: (clubes) => {
                    this.clubes = clubes || [];
                    if (this.clubes.length > 0) {
                        const matched = this.clubes.find(c => Number(c.id) === Number(this.selectedClubId));
                        const activeClub = matched || this.clubes[0];
                        this.selectedClubId = Number(activeClub.id);
                        this.selectedClubNombre = activeClub.nombre;
                        localStorage.setItem('selectedClubId', String(this.selectedClubId));
                    }
                    this.loadRanking();
                },
                error: (err) => {
                    console.error('Error cargando clubes:', err);
                    this.loadRanking();
                }
            });
        } else {
            this.loadRanking();
        }
    }

    onClubChange(clubId: number): void {
        this.selectedClubId = Number(clubId);
        const matched = this.clubes.find(c => Number(c.id) === Number(this.selectedClubId));
        if (matched) {
            this.selectedClubNombre = matched.nombre;
        }
        localStorage.setItem('selectedClubId', String(this.selectedClubId));
        this.loadRanking();
    }

    setCategoria(cat: string) {
        this.selectedCategoria = cat;
        this.currentPage = 1;
        this.loadRanking();
    }

    loadRanking() {
        this.loading = true;
        this.ranking = []; // Clear previous for visual feedback
        const targetClubId = this.selectedClubId > 0 ? this.selectedClubId : undefined;
        this.clubesService.getRanking(this.selectedCategoria, targetClubId, this.userId || undefined).subscribe({
            next: (res) => {
                this.ranking = Array.isArray(res) ? res : [];
                this.loading = false;
                this.currentPage = 1;
            },
            error: (err) => {
                console.error('Error loading ranking:', err);
                this.ranking = [];
                this.loading = false;
            }
        });
    }

    get rankingFiltrado(): any[] {
        if (!this.filtroBusqueda || !this.filtroBusqueda.trim()) {
            return this.ranking;
        }
        const query = this.filtroBusqueda.toLowerCase().trim();
        return this.ranking.filter(p => 
            (p.nombre && p.nombre.toLowerCase().includes(query)) ||
            (p.usuario && p.usuario.toLowerCase().includes(query))
        );
    }

    get paginatedRanking(): any[] {
        const start = (this.currentPage - 1) * this.pageSize;
        return this.rankingFiltrado.slice(start, start + this.pageSize);
    }

    get totalPages(): number {
        return Math.ceil(this.rankingFiltrado.length / this.pageSize) || 1;
    }

    get pagesArray(): number[] {
        return Array.from({ length: this.totalPages }, (_, i) => i + 1);
    }

    get pageRangeText(): string {
        if (this.rankingFiltrado.length === 0) return 'Mostrando 0 de 0 jugadores';
        const start = (this.currentPage - 1) * this.pageSize + 1;
        const end = Math.min(this.currentPage * this.pageSize, this.rankingFiltrado.length);
        return `Mostrando ${start} - ${end} de ${this.rankingFiltrado.length} jugadores`;
    }

    // Top 3 Podium Getters
    get top1(): any | null {
        return this.ranking.length > 0 ? this.ranking[0] : null;
    }

    get top2(): any | null {
        return this.ranking.length > 1 ? this.ranking[1] : null;
    }

    get top3(): any | null {
        return this.ranking.length > 2 ? this.ranking[2] : null;
    }

    get maxPuntosRanking(): number {
        return this.ranking.length > 0 && this.ranking[0].puntos_ranking ? this.ranking[0].puntos_ranking : 1;
    }

    getPointsPercentage(points: number): number {
        const max = this.maxPuntosRanking;
        if (!max || max <= 0) return 0;
        return Math.min(100, Math.round((points / max) * 100));
    }

    formatCategoriaNombre(cat: string): string {
        return cat.replace('Primera', '1ª').replace('Segunda', '2ª').replace('Tercera', '3ª')
                  .replace('Cuarta', '4ª').replace('Quinta', '5ª').replace('Sexta', '6ª').replace('Séptima', '7ª');
    }

    // Modal Detalle Jugador
    showDetailModal: boolean = false;
    selectedPlayer: any = null;
    loadingDetail: boolean = false;
    playerHistory: any = null;

    getPlayerPhoto(player: any): string {
        const foto = player?.foto || player?.foto_perfil;
        if (foto && typeof foto === 'string' && foto.trim() !== '' && !foto.includes('imagen_defecto') && !foto.includes('placeholder')) {
            return this.assetService.getAssetUrl(foto, 'perfil');
        }
        const name = encodeURIComponent(player?.nombre || 'Jugador');
        return `https://ui-avatars.com/api/?name=${name}&background=0f172a&color=ccff00&bold=true`;
    }

    onImgError(event: any, player: any): void {
        if (event && event.target) {
            const name = encodeURIComponent(player?.nombre || 'Jugador');
            event.target.src = `https://ui-avatars.com/api/?name=${name}&background=0f172a&color=ccff00&bold=true`;
        }
    }

    verDetalleJugador(player: any): void {
        this.selectedPlayer = player;
        this.showDetailModal = true;
        this.loadingDetail = true;
        this.playerHistory = null;

        this.clubesService.getHistorialJugadorRanking(player.id).subscribe({
            next: (res) => {
                if (res && res.success) {
                    this.playerHistory = res;
                    // Keep selected player points updated with server response
                    if (res.jugador && res.jugador.puntos_ranking !== undefined) {
                        this.selectedPlayer.puntos_ranking = res.jugador.puntos_ranking;
                    }
                } else {
                    this.playerHistory = {
                        jugador: player,
                        resumen: { torneos_jugados: 0, total_podios: 0, win_rate: 0, total_puntos_calculados: player.puntos_ranking || 0 },
                        historial: []
                    };
                }
                this.loadingDetail = false;
            },
            error: (err) => {
                console.error('Error cargando historial de jugador:', err);
                this.loadingDetail = false;
                this.playerHistory = {
                    jugador: player,
                    resumen: { torneos_jugados: 0, total_podios: 0, win_rate: 0, total_puntos_calculados: player.puntos_ranking || 0 },
                    historial: []
                };
            }
        });
    }

    cerrarModalDetalle(): void {
        this.showDetailModal = false;
        this.selectedPlayer = null;
        this.playerHistory = null;
    }

    get playerCategoryPills(): { key: string; value: number }[] {
        const pts = this.playerHistory?.jugador?.puntos_por_categoria;
        if (!pts || typeof pts !== 'object') return [];
        return Object.entries(pts).map(([key, value]) => ({
            key,
            value: Number(value) || 0
        }));
    }

    anularPuntosTorneo(torneo: any): void {
        if (!this.selectedPlayer) return;

        const ptsADescontar = torneo.puntos_totales || torneo.puntos_reales || 0;
        const nombreTorneo = torneo.torneo_nombre || 'este torneo';
        const nombreJugador = this.selectedPlayer.nombre || 'el jugador';

        Swal.fire({
            title: '¿Anular puntos de este torneo?',
            html: `Se descontarán <strong>${ptsADescontar} PTS</strong> del ranking de <strong>${nombreJugador}</strong> correspondientes al torneo <em>"${nombreTorneo}"</em>.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: '🗑️ Sí, anular puntos',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                Swal.fire({
                    title: 'Procesando...',
                    allowOutsideClick: false,
                    didOpen: () => Swal.showLoading()
                });

                this.clubesService.anularRestaurarPuntosTorneo({
                    usuario_id: this.selectedPlayer.id,
                    torneo_id: torneo.torneo_id,
                    puntos_descontar: ptsADescontar,
                    categoria: torneo.categoria || 'Cuarta',
                    accion: 'anular'
                }).subscribe({
                    next: (res) => {
                        Swal.fire({
                            icon: 'success',
                            title: 'Puntos Anulados',
                            text: res.mensaje || 'Se han descontado los puntos correctamente.',
                            timer: 2000,
                            showConfirmButton: false
                        });
                        // Recargar historial del jugador y tabla general
                        this.loadRanking();
                        this.verDetalleJugador(this.selectedPlayer);
                    },
                    error: (err) => {
                        console.error('Error anulando puntos:', err);
                        Swal.fire('Error', err.error?.error || 'No se pudieron anular los puntos.', 'error');
                    }
                });
            }
        });
    }

    restaurarPuntosTorneo(torneo: any): void {
        if (!this.selectedPlayer) return;

        const ptsARestaurar = torneo.puntos_reales || 5;
        const nombreTorneo = torneo.torneo_nombre || 'este torneo';
        const nombreJugador = this.selectedPlayer.nombre || 'el jugador';

        Swal.fire({
            title: '¿Restablecer puntos?',
            html: `Se reactivarán <strong>+${ptsARestaurar} PTS</strong> en el ranking de <strong>${nombreJugador}</strong> para el torneo <em>"${nombreTorneo}"</em>.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#22c55e',
            cancelButtonColor: '#64748b',
            confirmButtonText: '✅ Sí, restablecer',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                Swal.fire({
                    title: 'Procesando...',
                    allowOutsideClick: false,
                    didOpen: () => Swal.showLoading()
                });

                this.clubesService.anularRestaurarPuntosTorneo({
                    usuario_id: this.selectedPlayer.id,
                    torneo_id: torneo.torneo_id,
                    puntos_descontar: ptsARestaurar,
                    categoria: torneo.categoria || 'Cuarta',
                    accion: 'restaurar'
                }).subscribe({
                    next: (res) => {
                        Swal.fire({
                            icon: 'success',
                            title: 'Puntos Restablecidos',
                            text: res.mensaje || 'Se han sumado los puntos nuevamente.',
                            timer: 2000,
                            showConfirmButton: false
                        });
                        this.loadRanking();
                        this.verDetalleJugador(this.selectedPlayer);
                    },
                    error: (err) => {
                        console.error('Error restaurando puntos:', err);
                        Swal.fire('Error', err.error?.error || 'No se pudieron restablecer los puntos.', 'error');
                    }
                });
            }
        });
    }

    limpiarRankingClub(): void {
        const clubNombre = this.selectedClubNombre || 'el club seleccionado';
        const clubId = this.selectedClubId;

        Swal.fire({
            title: '¿Limpiar ranking del club?',
            html: `Se restablecerán a <strong>0 PTS</strong> todos los puntos de ranking de los jugadores asociados a <strong>${clubNombre}</strong> y se anularán los puntos otorgados en sus torneos.<br><br><span style="color:#ef4444; font-weight:600;">Esta acción no se puede deshacer.</span>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: '🧹 Sí, limpiar ranking',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                Swal.fire({
                    title: 'Limpiando ranking...',
                    text: 'Restableciendo puntos del club a cero',
                    allowOutsideClick: false,
                    didOpen: () => Swal.showLoading()
                });

                this.clubesService.limpiarRankingClub(clubId).subscribe({
                    next: (res) => {
                        Swal.fire({
                            icon: 'success',
                            title: 'Ranking Limpiado',
                            text: res.mensaje || 'Se han restablecido los puntos de ranking exitosamente.',
                            timer: 2500,
                            showConfirmButton: false
                        });
                        this.loadRanking();
                    },
                    error: (err) => {
                        console.error('Error al limpiar ranking del club:', err);
                        Swal.fire('Error', err.error?.error || 'No se pudo limpiar el ranking.', 'error');
                    }
                });
            }
        });
    }
}
