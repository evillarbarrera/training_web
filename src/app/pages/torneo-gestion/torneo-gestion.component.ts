import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ClubesService } from '../../services/clubes.service';
import { ApiService } from '../../services/api.service';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-torneo-gestion',
    standalone: true,
    imports: [CommonModule, FormsModule, SidebarComponent],
    templateUrl: './torneo-gestion.component.html',
    styleUrls: ['./torneo-gestion.component.scss']
})
export class TorneoGestionComponent implements OnInit {
    clubes: any[] = [];
    torneos: any[] = [];
    selectedTorneo: any = null;
    categorias: any[] = [];
    selectedCategoria: any = null;
    inscripciones: any[] = [];
    searchInscripcionText: string = '';

    get filteredInscripciones(): any[] {
        if (!this.inscripciones) return [];
        if (!this.searchInscripcionText || !this.searchInscripcionText.trim()) {
            return this.inscripciones;
        }
        const term = this.searchInscripcionText.toLowerCase().trim();
        return this.inscripciones.filter(ins => {
            const j1 = (ins.nombre_jugador_1 || '').toLowerCase();
            const j2 = (ins.nombre_jugador_2 || '').toLowerCase();
            const cat = (ins.categoria_nombre || '').toLowerCase();
            const id = (ins.id || '').toString();
            return j1.includes(term) || j2.includes(term) || cat.includes(term) || id.includes(term);
        });
    }
    allUsers: any[] = [];
    playoffMatches: any[] = [];
    groupMatches: any[] = [];
    groupRankings: any[] = [];
    grupos: any[] = [];
    calendarDays: any[] = []; // For calendar view
    selectedDayIndex: number = 0;

    // UI State
    activeTab: 'create' | 'list' = 'list';
    activeDetailTab: 'config' | 'inscripciones' | 'grupos' | 'playoffs' | 'programacion' | 'resumen' | 'generar' | 'editar' = 'config';

    // New Availability Grid Config
    // key: 'YYYY-MM-DD', value: array of hours [8, 9, 10, ... 23] enabled
    availabilityGrid: { [key: string]: number[] } = {};
    gridDays: string[] = [];
    gridHours: number[] = Array.from({ length: 16 }, (_, i) => i + 8); // 08:00 to 23:00 default

    // Summary Stats
    tournamentStats: any = {
        totalInscritos: 0,
        totalPartidosEstimados: 0,
        horasNecesarias: 0,
        horasDisponibles: 0,
        deficit: 0,
        categorias: []
    };

    userId: number = 0;
    userRole: any = 'administrador_club';
    userName: string = '';
    userFoto: string | null = null;

    newTorneo: any = {
        club_id: 0,
        nombre: '',
        descripcion: '',
        fecha_inicio: '',
        fecha_fin: '',
        tipo: 'Grupos + Playoffs',
        formato_grupos: 4, // Default to 4 as per user preference
        formato_sets: 'Full Sets',
        poster_url: null,
        precio: 0,
        num_canchas: 2,
        canchas_ids: [],
        categorias: [
            { nombre: 'Iniciación', max_parejas: 12, puntos_repartir: 100 },
            { nombre: 'Intermedio', max_parejas: 16, puntos_repartir: 250 },
            { nombre: 'Open', max_parejas: 8, puntos_repartir: 500 }
        ]
    };

    newTorneoCanchas: any[] = [];
    newTorneoSelectedCanchas: number[] = [];

    onNewTorneoClubChange() {
        if (!this.newTorneo.club_id) return;
        this.clubesService.getCanchas(this.newTorneo.club_id).subscribe({
            next: (res: any) => {
                this.newTorneoCanchas = res || [];
                if (this.newTorneoCanchas.length > 0) {
                    const count = Math.min(this.newTorneoCanchas.length, Math.max(1, Number(this.newTorneo.num_canchas) || 2));
                    this.newTorneoSelectedCanchas = this.newTorneoCanchas.slice(0, count).map(c => c.id);
                    this.newTorneo.num_canchas = this.newTorneoSelectedCanchas.length;
                    this.newTorneo.canchas_ids = this.newTorneoSelectedCanchas;
                } else {
                    this.newTorneoSelectedCanchas = [];
                    if (!this.newTorneo.num_canchas) this.newTorneo.num_canchas = 2;
                    this.newTorneo.canchas_ids = [];
                }
            },
            error: (err) => console.error('Error al cargar canchas del club:', err)
        });
    }

    toggleNewTorneoCancha(canchaId: number) {
        const idx = this.newTorneoSelectedCanchas.indexOf(canchaId);
        if (idx > -1) {
            if (this.newTorneoSelectedCanchas.length > 1) {
                this.newTorneoSelectedCanchas.splice(idx, 1);
            }
        } else {
            this.newTorneoSelectedCanchas.push(canchaId);
        }
        this.newTorneo.num_canchas = this.newTorneoSelectedCanchas.length;
        this.newTorneo.canchas_ids = this.newTorneoSelectedCanchas;
    }

    isNewTorneoCanchaSelected(canchaId: number): boolean {
        return this.newTorneoSelectedCanchas.includes(canchaId);
    }

    onNewTorneoNumCanchasChange() {
        const count = Math.max(1, Number(this.newTorneo.num_canchas) || 1);
        if (this.newTorneoCanchas.length > 0) {
            this.newTorneoSelectedCanchas = this.newTorneoCanchas.slice(0, Math.min(this.newTorneoCanchas.length, count)).map(c => c.id);
            this.newTorneo.canchas_ids = this.newTorneoSelectedCanchas;
            this.newTorneo.num_canchas = this.newTorneoSelectedCanchas.length;
        }
    }

    matchDuration: number = 75; // Default match duration in minutes

    // UI & Features State
    activeConfigIndex: number = 0;
    simSubTab: 'agenda' | 'grupos' = 'agenda';
    viewMode: 'day' | 'week' = 'day';
    presetCategories: any[] = [
        { nombre: '1ra Varones', type: 'varones', color: '#f59e0b' }, // Amber/Gold
        { nombre: '2da Varones', type: 'varones', color: '#10b981' }, // Emerald
        { nombre: '3ra Varones', type: 'varones', color: '#6366f1' }, // Indigo
        { nombre: '4ta Varones', type: 'varones', color: '#f97316' }, // Orange
        { nombre: '5ta Varones', type: 'varones', color: '#8b5cf6' }, // Violet
        { nombre: '6ta Varones', type: 'varones', color: '#06b6d4' }, // Cyan
        { nombre: 'Damas A', type: 'damas', color: '#ec4899' },      // Rose
        { nombre: 'Damas B', type: 'damas', color: '#14b8a6' },      // Teal
        { nombre: 'Damas C', type: 'damas', color: '#f43f5e' },      // Rose/Red
        { nombre: 'Damas D', type: 'damas', color: '#84cc16' },      // Lime
        { nombre: 'Damas E', type: 'damas', color: '#a855f7' }       // Purple
    ];

    simulatedGroupsSummary: any[] = [];
    selectedBracketCategoryId: number | null = null;

    onTabChange(tab: any) {
        this.activeDetailTab = tab;

        // Always DEFAULT to "All Tournament" when entering these tabs
        if (tab === 'generar' || tab === 'resumen' || tab === 'programacion') {
            const previousCat = this.selectedCategoria;
            this.selectedCategoria = null;

            // If we previously had a filter, we must reload all inscriptions and stats
            if (previousCat && this.selectedTorneo) {
                this.loadCategorias(this.selectedTorneo.id);
            } else {
                this.calculateStats();
            }
        }
    }

    isCategorySelected(name: string): boolean {
        return this.newTorneo.categorias.some((c: any) => c.nombre === name);
    }

    toggleCategory(p: any) {
        const index = this.newTorneo.categorias.findIndex((c: any) => c.nombre === p.nombre);
        if (index > -1) {
            this.newTorneo.categorias.splice(index, 1);
        } else {
            this.newTorneo.categorias.push({
                nombre: p.nombre,
                max_parejas: 16,
                puntos_repartir: 100
            });
            this.activeConfigIndex = this.newTorneo.categorias.length - 1;
        }
    }

    getCategoryColor(name: string): string {
        if (!name) return '#64748b';

        const normalized = name.toLowerCase().trim();

        // 1. Try to find in presets
        const cat = this.presetCategories.find(p =>
            p.nombre.toLowerCase().trim() === normalized ||
            normalized.includes(p.nombre.toLowerCase().trim())
        );
        if (cat) return cat.color;

        // 2. Dynamic Fallback: Use the Golden Ratio to maximize visual distance
        let hash = 0;
        for (let i = 0; i < normalized.length; i++) {
            hash = normalized.charCodeAt(i) + ((hash << 5) - hash);
        }

        // Golden ratio constant (~0.618) helps distribute values as far as possible
        const goldenRatio = 0.618033988749895;
        let h = (Math.abs(hash) * goldenRatio) % 1;
        const hue = Math.floor(h * 360);

        // Return professional HSL (Saturation 75%, Lightness 50% for vibrancy)
        return `hsl(${hue}, 75%, 50%)`;
    }

    getVisibleHours(): number[] {
        return this.gridHours;
    }

    getMatchScore(m: any, teamNum: number): string {
        if (!m.resultado_json) return '';
        try {
            const results = typeof m.resultado_json === 'string' ? JSON.parse(m.resultado_json) : m.resultado_json;
            return results.map((set: any) => teamNum === 1 ? set.p1 : set.p2).join(' ');
        } catch (e) {
            return '';
        }
    }

    selectBracketCategory(id: number) {
        this.selectedBracketCategoryId = id;

        // Priority 1: If we have simulated matches, filter strictly playoff matches
        const simMatches = this.matchesToSchedule.filter(m => m.categoryId == id && (m.isPlayoff || (m.dummy && m.ronda && !m.ronda.startsWith('Grupo'))));

        if (simMatches.length > 0) {
            this.playoffMatches = simMatches;
            this.organizeBracket(simMatches);
        } else {
            // Priority 2: Fallback to real data
            this.loadPlayoffs(id);
        }
    }

    anadirNuevaCategoria() {
        this.newTorneo.categorias.push({
            nombre: 'Nueva Categoría',
            max_parejas: 16,
            puntos_repartir: 100
        });
        this.activeConfigIndex = this.newTorneo.categorias.length - 1;
    }

    eliminarCategoria(id: number, event: any) {
        event.stopPropagation();
        Swal.fire({
            title: '¿Eliminar Categoría?',
            text: 'Se eliminarán también las inscripciones de esta categoría. Esta acción es irreversible.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar categoría',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#ef4444', // Red for danger
            cancelButtonColor: '#f1f5f9'
        }).then(result => {
            if (result.isConfirmed) {
                this.clubesService.deleteCategoria(id).subscribe(() => {
                    this.loadCategorias(this.selectedTorneo.id);
                });
            }
        });
    }

    editCategoriaCapacidad(cat: any) {
        Swal.fire({
            title: 'Editar Capacidad',
            input: 'number',
            inputValue: cat.max_parejas,
            showCancelButton: true
        }).then(res => {
            if (res.isConfirmed) {
                cat.max_parejas = res.value;
                this.clubesService.updateCategoria(cat.id, cat).subscribe();
            }
        });
    }

    hasFictionalMatches(): boolean {
        return this.matchesToSchedule.some(m => m.id < 0 || m.dummy);
    }

    constructor(
        private clubesService: ClubesService,
        private apiService: ApiService,
        private router: Router,
        private cdr: ChangeDetectorRef
    ) { }

    generateSchedule() {
        if (!this.selectedTorneo) return;

        // Ensure courts are loaded before generation
        if (this.clubCanchas.length === 0) {
            this.clubesService.getCanchas(this.selectedTorneo.club_id).subscribe(res => {
                this.clubCanchas = res;
                this.executeGeneration();
            });
        } else {
            this.executeGeneration();
        }
    }

    private executeGeneration() {
        console.log('Starting schedule generation...');
        Swal.fire({
            title: 'Generando Calendario',
            text: 'Calculando grupos y asignando horarios...',
            showConfirmButton: false,
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        // 1. Get all categories and their inscriptions
        const observables = this.categorias.map(cat =>
            this.clubesService.getInscripciones(cat.id)
        );

        if (this.categorias.length === 0) {
            Swal.fire({
                title: 'Atención',
                text: 'No hay categorías definidas en este torneo.',
                icon: 'warning',
                confirmButtonColor: '#0f172a'
            });
            return;
        }

        forkJoin(observables).subscribe({
            next: (results: any[]) => {
                try {
                    const allInscripciones = results;

                    // Ensure grid is initialized if user hasn't visited 'Conf. Horarios'
                    if (this.gridDays.length === 0) {
                        this.initAvailabilityGrid();
                    }

                    this.processSchedule(allInscripciones);
                    this.organizeCalendar();

                    Swal.close();
                    Swal.fire({
                        title: 'Calendario Generado',
                        text: 'Se han calculado los grupos y partidos automáticamente.',
                        icon: 'success',
                        confirmButtonColor: '#0f172a'
                    });
                } catch (e) {
                    console.error('Error during schedule processing', e);
                    Swal.fire({
                        title: 'Error de Proyección',
                        text: 'Ocurrió un error al procesar el calendario: ' + (e as any).message,
                        icon: 'error',
                        confirmButtonColor: '#0f172a'
                    });
                }
            },
            error: (err) => {
                console.error('Error fetching inscriptions', err);
                Swal.fire({
                    title: 'Error de Conexión',
                    text: 'No se pudieron obtener las inscripciones o el servidor no responde.',
                    icon: 'error',
                    confirmButtonColor: '#0f172a'
                });
            }
        });
    }

    simulateTournamentAtCapacity() {
        if (!this.selectedTorneo) return;

        Swal.fire({
            title: 'Simulación a Capacidad Máxima',
            text: '¿Deseas proyectar el torneo usando el máximo de parejas configurado en cada categoría?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, simular todo',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#0f172a',
            cancelButtonColor: '#f1f5f9'
        }).then(result => {
            if (result.isConfirmed) {
                Swal.fire({
                    title: 'Simulando...',
                    allowOutsideClick: false,
                    didOpen: () => Swal.showLoading()
                });

                const simulationData = this.categorias.map((cat, index) => {
                    const max = cat.max_parejas || 12;
                    let dummies = [];
                    for (let i = 1; i <= max; i++) {
                        dummies.push({
                            id: -(index + 1) * 1000 - i,
                            nombre_pareja: `Pareja Sim ${i} (${cat.nombre})`,
                            categoria_id: cat.id,
                            categoria_nombre: cat.nombre,
                            dummy: true
                        });
                    }
                    return dummies;
                });

                this.inscripciones = simulationData.flat();

                // Initialize grid if empty
                if (this.gridDays.length === 0) {
                    this.initAvailabilityGrid();
                }

                // Execute the processing
                this.processSchedule(simulationData);
                this.calculateStats();
                this.organizeCalendar(); // CRITICAL: Updates the view data

                // Switch to simulation view
                this.activeDetailTab = 'generar';
                this.simSubTab = 'agenda';

                const assignedCount = this.matchesToSchedule.filter(m => m.tempTime).length;
                const pendingCount = this.matchesToSchedule.filter(m => !m.tempTime).length;
                const lastDay = this.gridDays[this.gridDays.length - 1];

                Swal.close();
                Swal.fire({
                    title: 'Proyección Lista 🚀',
                    html: `
                        <div style="text-align: left; font-size: 13px; line-height: 1.6;">
                            <p style="margin: 0 0 10px 0;"><strong>Planificación Experta Generada:</strong></p>
                            <ul style="margin: 0 0 10px 18px; padding: 0;">
                                <li><strong>${assignedCount}</strong> partidos programados en turnos disponibles.</li>
                                ${pendingCount > 0
                                    ? `<li style="color: #dc2626;"><strong>${pendingCount}</strong> partidos pendientes (turnos insuficientes en la configuración).</li>`
                                    : '<li style="color: #16a34a;"><strong>0 partidos pendientes</strong> (100% encuadrados).</li>'}
                                <li>Fase de grupos programada en los días iniciales.</li>
                                <li>Playoffs progresivos según parejas clasificadas.</li>
                                <li><strong>Finales estelares programadas el último día (${lastDay || 'Día Final'}).</strong></li>
                            </ul>
                        </div>
                    `,
                    icon: pendingCount > 0 ? 'info' : 'success',
                    showConfirmButton: true,
                    confirmButtonText: 'Ver Agenda',
                    confirmButtonColor: '#0f172a'
                });
            }
        });
    }

    ngOnInit(): void {
        const currentUser = this.apiService.getCurrentUser();
        if (currentUser) {
            this.userId = currentUser.id;
            this.userRole = currentUser.rol || 'administrador_club';
            this.userName = currentUser.nombre || 'Usuario';
            this.userFoto = currentUser.foto || null;
            this.loadInitialData();
            this.loadUsers();

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
            this.router.navigate(['/login']);
        }
    }

    loadInitialData() {
        const storedClubId = localStorage.getItem('selectedClubId');
        const clubId = storedClubId ? parseInt(storedClubId, 10) : undefined;

        this.clubesService.getTorneosAdminV2(this.userId, clubId).subscribe(res => {
            console.log('Torneos recibidos del API:', res);
            this.torneos = res;
        });

        this.clubesService.getClubes(this.userId).subscribe(res => {
            this.clubes = res;
            if (this.clubes.length > 0) {
                const target = clubId ? this.clubes.find(c => Number(c.id) === Number(clubId)) : this.clubes[0];
                this.newTorneo.club_id = target ? target.id : this.clubes[0].id;
                this.onNewTorneoClubChange();
            }
        });
    }

    loadUsers() {
        this.clubesService.getUsers().subscribe(res => this.allUsers = res);
    }



    selectTorneo(torneo: any) {
        this.selectedTorneo = { ...torneo };
        this.selectedTorneo.inscripciones_abiertas = Number(torneo.inscripciones_abiertas) === 1 || torneo.inscripciones_abiertas === true || torneo.inscripciones_abiertas === '1';

        // Parse canchas_ids
        let parsedCanchas: number[] = [];
        if (torneo.canchas_ids) {
            try {
                parsedCanchas = typeof torneo.canchas_ids === 'string' ? JSON.parse(torneo.canchas_ids) : torneo.canchas_ids;
            } catch (e) {
                parsedCanchas = [];
            }
        }
        this.planParams.selectedCanchasIds = Array.isArray(parsedCanchas) ? parsedCanchas : [];
        this.selectedTorneo.num_canchas = Number(torneo.num_canchas) || (this.planParams.selectedCanchasIds.length || 2);

        this.selectedCategoria = null; // VISTA GLOBAL POR DEFECTO
        this.activeTab = 'list';
        this.activeDetailTab = 'resumen';
        this.loadCategorias(torneo.id);

        // Reset grid
        this.availabilityGrid = {};
        this.gridDays = [];

        // Initialize planParams with tournament dates if available
        if (torneo.fecha_inicio) this.planParams.startDate = torneo.fecha_inicio.split(' ')[0];
        if (torneo.fecha_fin) this.planParams.endDate = torneo.fecha_fin.split(' ')[0];

        // Load courts and auto-select them
        this.loadCanchasClub();

        // Load availability from DB
        this.clubesService.getTorneoAvailability(torneo.id).subscribe({
            next: (res: any) => {
                if (res.status === 'success' && res.grid) {
                    this.availabilityGrid = res.grid;
                }
                // Backwards compatibility/Load existing flags
                if (res.torneo) {
                    this.selectedTorneo.formato_grupos = res.torneo.formato_grupos || 4;
                    this.selectedTorneo.formato_sets = res.torneo.formato_sets || 'Full Sets';
                }
                this.initAvailabilityGrid();
                this.calculateStats();
            },
            error: (err) => {
                console.error('Error loading availability', err);
                this.initAvailabilityGrid();
                this.calculateStats();
            }
        });

        // Load courts
        this.loadCanchasClub();
    }

    processSchedule(allInscripciones: any[][]) {
        console.log('Processing expert schedule for', this.categorias.length, 'categories');
        this.matchesToSchedule = [];

        // 1. Prepare Available Slots (Time x Courts)
        let usableCourts = this.clubCanchas.filter(c => this.planParams.selectedCanchasIds.includes(c.id));
        if (usableCourts.length === 0) usableCourts = this.clubCanchas;
        if (usableCourts.length === 0) {
            const courtNum = Math.max(1, Number(this.selectedTorneo?.num_canchas) || 2);
            usableCourts = [];
            for (let i = 1; i <= courtNum; i++) {
                usableCourts.push({ id: i, nombre: `Pista ${i}` });
            }
        }

        const slots: any[] = [];
        const durationMins = this.matchDuration || 75;

        this.gridDays.forEach(day => {
            if (this.availabilityGrid[day]) {
                const hours = [...this.availabilityGrid[day]].sort((a, b) => a - b);
                if (hours.length === 0) return;

                // Group discrete hours into continuous blocks
                let blocks = [];
                let currentBlock = { start: hours[0], end: hours[0] + 1 };
                for (let i = 1; i < hours.length; i++) {
                    if (hours[i] === currentBlock.end) {
                        currentBlock.end = hours[i] + 1;
                    } else {
                        blocks.push(currentBlock);
                        currentBlock = { start: hours[i], end: hours[i] + 1 };
                    }
                }
                blocks.push(currentBlock);

                usableCourts.forEach((court) => {
                    blocks.forEach(block => {
                        const parts = day.split('-');
                        let currentTimestamp = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), block.start, 0, 0).getTime();
                        const blockEndTimestamp = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), block.end, 0, 0).getTime();

                        while (currentTimestamp + (durationMins * 60000) <= blockEndTimestamp) {
                            const dateObj = new Date(currentTimestamp);
                            const h = dateObj.getHours();
                            const m = dateObj.getMinutes();
                            const timeString = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

                            slots.push({
                                date: day,
                                hour: h,
                                minute: m,
                                timeString: timeString,
                                courtId: court.id,
                                courtName: court.nombre,
                                timestamp: currentTimestamp,
                                used: false
                            });

                            currentTimestamp += (durationMins * 60000);
                        }
                    });
                });
            }
        });

        // Chronological sort
        slots.sort((a, b) => a.timestamp - b.timestamp || a.courtId - b.courtId);

        const allGroupMatches: any[] = [];
        const allDieciseisMatches: any[] = [];
        const allOctavosMatches: any[] = [];
        const allCuartosMatches: any[] = [];
        const allSemiMatches: any[] = [];
        const allFinalMatches: any[] = [];

        this.simulatedGroupsSummary = [];

        let groupMatchId = -5000;
        let playoffMatchId = -8000;

        // 2. Collection Phase: Groups & Mathematical Playoff Generation
        this.categorias.forEach((cat, index) => {
            let inscritos = [...(allInscripciones[index] || [])];
            const prefSize = this.selectedTorneo?.formato_grupos || 4;
            const dist = this.getOptimalGroupDistribution(inscritos.length, prefSize);

            const catSummary: any = { category: cat.nombre, categoryId: cat.id, groups: [] };

            let pairIndex = 0;
            dist.forEach((size, groupIdx) => {
                const group = inscritos.slice(pairIndex, pairIndex + size);
                pairIndex += size;
                const groupName = String.fromCharCode(65 + groupIdx);
                const groupPairs = group.map(p => p.nombre_jugador_1 ? `${p.nombre_jugador_1} / ${p.nombre_jugador_2}` : (p.nombre_pareja || 'TBD'));

                catSummary.groups.push({
                    name: groupName,
                    matchCount: (group.length * (group.length - 1)) / 2,
                    pairs: groupPairs
                });

                for (let x = 0; x < group.length; x++) {
                    for (let y = x + 1; y < group.length; y++) {
                        allGroupMatches.push({
                            id: groupMatchId--,
                            category: cat.nombre,
                            categoryId: cat.id,
                            ronda: `Grupo ${groupName}`,
                            roundOrder: 1,
                            team1: group[x],
                            team2: group[y],
                            pareja1_id: group[x].id,
                            pareja2_id: group[y].id,
                            pareja1_nombre: group[x].nombre_jugador_1 ? `${group[x].nombre_jugador_1} / ${group[x].nombre_jugador_2}` : (group[x].nombre_pareja || `Pareja ${x + 1}`),
                            pareja2_nombre: group[y].nombre_jugador_1 ? `${group[y].nombre_jugador_1} / ${group[y].nombre_jugador_2}` : (group[y].nombre_pareja || `Pareja ${y + 1}`),
                            duration: durationMins,
                            isGroup: true,
                            dummy: true
                        });
                    }
                }
            });
            this.simulatedGroupsSummary.push(catSummary);

            // Playoff Generation: Top 2 from each group advance (Standard Padel)
            const advancingPairs = Math.max(2, dist.length * 2);
            const catPrefix = cat.id * 1000;

            // Dieciseisavos (if > 16 advancing pairs)
            if (advancingPairs > 16) {
                const count16 = advancingPairs === 32 ? 16 : (advancingPairs - 16);
                for (let i = 0; i < count16; i++) {
                    allDieciseisMatches.push({
                        id: playoffMatchId--,
                        category: cat.nombre,
                        categoryId: cat.id,
                        ronda: 'Dieciseisavos',
                        roundOrder: 2,
                        nivel: 5,
                        posicion: i,
                        pareja1_id: -(catPrefix + 100 + (i * 2 + 1)),
                        pareja2_id: -(catPrefix + 100 + (i * 2 + 2)),
                        pareja1_nombre: `Clasificado ${i * 2 + 1}`,
                        pareja2_nombre: `Clasificado ${i * 2 + 2}`,
                        duration: durationMins,
                        isPlayoff: true,
                        dummy: true
                    });
                }
            }

            // Octavos (if > 8 advancing pairs)
            if (advancingPairs > 8) {
                const count8 = (advancingPairs >= 16) ? 8 : (advancingPairs - 8);
                for (let i = 0; i < count8; i++) {
                    allOctavosMatches.push({
                        id: playoffMatchId--,
                        category: cat.nombre,
                        categoryId: cat.id,
                        ronda: 'Octavos',
                        roundOrder: 3,
                        nivel: 4,
                        posicion: i,
                        pareja1_id: -(catPrefix + 200 + (i * 2 + 1)),
                        pareja2_id: -(catPrefix + 200 + (i * 2 + 2)),
                        pareja1_nombre: `Octavofinalista ${i * 2 + 1}`,
                        pareja2_nombre: `Octavofinalista ${i * 2 + 2}`,
                        duration: durationMins,
                        isPlayoff: true,
                        dummy: true
                    });
                }
            }

            // Cuartos (if > 4 advancing pairs)
            if (advancingPairs > 4) {
                const count4 = (advancingPairs >= 8) ? 4 : (advancingPairs - 4);
                for (let i = 0; i < count4; i++) {
                    allCuartosMatches.push({
                        id: playoffMatchId--,
                        category: cat.nombre,
                        categoryId: cat.id,
                        ronda: 'Cuartos',
                        roundOrder: 4,
                        nivel: 3,
                        posicion: i,
                        pareja1_id: -(catPrefix + 300 + (i * 2 + 1)),
                        pareja2_id: -(catPrefix + 300 + (i * 2 + 2)),
                        pareja1_nombre: `Cuartofinalista ${i * 2 + 1}`,
                        pareja2_nombre: `Cuartofinalista ${i * 2 + 2}`,
                        duration: durationMins,
                        isPlayoff: true,
                        dummy: true
                    });
                }
            }

            // Semifinales (if > 2 advancing pairs)
            if (advancingPairs > 2) {
                const countSemi = 2;
                for (let i = 0; i < countSemi; i++) {
                    allSemiMatches.push({
                        id: playoffMatchId--,
                        category: cat.nombre,
                        categoryId: cat.id,
                        ronda: 'Semi',
                        roundOrder: 5,
                        nivel: 2,
                        posicion: i,
                        pareja1_id: -(catPrefix + 400 + (i * 2 + 1)),
                        pareja2_id: -(catPrefix + 400 + (i * 2 + 2)),
                        pareja1_nombre: `Semifinalista ${i * 2 + 1}`,
                        pareja2_nombre: `Semifinalista ${i * 2 + 2}`,
                        duration: durationMins,
                        isPlayoff: true,
                        dummy: true
                    });
                }
            }

            // Final (Always 1 Final per category)
            allFinalMatches.push({
                id: playoffMatchId--,
                category: cat.nombre,
                categoryId: cat.id,
                ronda: 'Final',
                roundOrder: 6,
                nivel: 1,
                posicion: 0,
                pareja1_id: -(catPrefix + 501),
                pareja2_id: -(catPrefix + 502),
                pareja1_nombre: `Finalista 1 (${cat.nombre})`,
                pareja2_nombre: `Finalista 2 (${cat.nombre})`,
                duration: durationMins,
                isPlayoff: true,
                dummy: true
            });
        });

        // 3. Phased Scheduling: Finals on Last Day & Chronological Progression Across the Week
        const D = this.gridDays.length;
        const lastDay = this.gridDays[D - 1];
        const prevDay = D > 1 ? this.gridDays[D - 2] : lastDay;

        // Target day sets for each phase
        // Finales: ALWAYS lastDay
        const finalTargetDays = new Set([lastDay]);

        // Semifinales:
        // Multi-day (>=3 days): prevDay and lastDay morning
        // <=2 days: all days
        const semiTargetDays = new Set(D >= 3 ? [prevDay, lastDay] : this.gridDays);

        // Cuartos:
        // Week-long (>=5 days): Days D-3 and D-2 (e.g. Viernes and Sábado)
        // 3-4 days: prevDay (Day D-2)
        // <=2 days: all days
        const cuartosTargetDays = new Set(
            D >= 5 ? [this.gridDays[D - 3], prevDay]
            : (D >= 3 ? [prevDay] : this.gridDays)
        );

        // Octavos & Dieciseis:
        // Week-long (>=5 days): Days D-4 and D-3 (e.g. Jueves and Viernes)
        // 3-4 days: Days 0 and prevDay
        // <=2 days: all days
        const earlyPlayoffTargetDays = new Set(
            D >= 5 ? [this.gridDays[D - 4], this.gridDays[D - 3]]
            : (D >= 3 ? [this.gridDays[0], prevDay] : this.gridDays)
        );

        // Fase de Grupos:
        // Week-long (>=5 days): Days 0 to D-3 (e.g. Sáb 24, Dom 25, Lun 26, Mar 27, Mié 28, Jue 29...)
        // 3-4 days: Days 0 to D-2 (e.g. Viernes and Sábado morning)
        // <=2 days: all days
        const groupTargetDays = new Set(
            D >= 5 ? this.gridDays.slice(0, D - 2)
            : (D >= 3 ? this.gridDays.slice(0, D - 1) : this.gridDays)
        );

        // Player & Category Constraints Trackers
        const playerDailyMatches: { [playerId: string]: { [date: string]: number } } = {};
        const playerLastEnd: { [playerId: string]: number } = {};
        const categoryFinalTime: { [catId: number]: number } = {};
        const categoryEarliestSemiTime: { [catId: number]: number } = {};
        const categoryEarliestCuartosTime: { [catId: number]: number } = {};
        const categoryEarliestPlayoffTime: { [catId: number]: number } = {};

        const getMatchPlayerIds = (m: any): any[] => {
            const ids: any[] = [];
            if (m.pareja1_id != null) ids.push(m.pareja1_id);
            if (m.pareja2_id != null) ids.push(m.pareja2_id);
            if (m.team1 && m.team1.id != null) ids.push(m.team1.id);
            if (m.team2 && m.team2.id != null) ids.push(m.team2.id);
            return ids;
        };

        const canPairPlayInSlot = (m: any, slot: any, checkRest: boolean = true, maxDaily: number = 2): boolean => {
            const ids = getMatchPlayerIds(m);
            for (let id of ids) {
                if (maxDaily && playerDailyMatches[id] && playerDailyMatches[id][slot.date] >= maxDaily) {
                    return false;
                }
                if (checkRest && playerLastEnd[id]) {
                    const diff = Math.abs(slot.timestamp - playerLastEnd[id]);
                    if (diff < durationMins * 60000) return false;
                }
            }
            return true;
        };

        const recordMatchAssignment = (m: any, slot: any) => {
            slot.used = true;
            m.tempDate = slot.date;
            m.tempTime = slot.timeString;
            m.tempCanchaId = slot.courtId;
            m.court = slot.courtName;

            const ids = getMatchPlayerIds(m);
            for (let id of ids) {
                if (!playerDailyMatches[id]) playerDailyMatches[id] = {};
                playerDailyMatches[id][slot.date] = (playerDailyMatches[id][slot.date] || 0) + 1;
                playerLastEnd[id] = slot.timestamp + durationMins * 60000;
            }
            this.matchesToSchedule.push(m);
        };

        const mixCategories = (matches: any[]) => {
            const byCategory: { [catId: string]: any[] } = {};
            matches.forEach(m => {
                if (!byCategory[m.categoryId]) byCategory[m.categoryId] = [];
                byCategory[m.categoryId].push(m);
            });
            const mixed: any[] = [];
            let added = true;
            while (added) {
                added = false;
                for (const catId in byCategory) {
                    if (byCategory[catId].length > 0) {
                        mixed.push(byCategory[catId].shift());
                        added = true;
                    }
                }
            }
            return mixed;
        };

        // --- STAGE A: FINALES (Siempre el último día, horarios estelares de tarde) ---
        const lastDaySlots = slots.filter(s => s.date === lastDay);
        const afternoonFinalSlots = lastDaySlots.filter(s => s.hour >= 15);
        const finalCandidateSlots = afternoonFinalSlots.length >= allFinalMatches.length
            ? afternoonFinalSlots
            : lastDaySlots;

        allFinalMatches.forEach(m => {
            let assignedSlot: any = null;
            for (let i = finalCandidateSlots.length - 1; i >= 0; i--) {
                const s = finalCandidateSlots[i];
                if (!s.used && canPairPlayInSlot(m, s, false, 0)) {
                    assignedSlot = s;
                    break;
                }
            }
            if (!assignedSlot) {
                for (let i = lastDaySlots.length - 1; i >= 0; i--) {
                    const s = lastDaySlots[i];
                    if (!s.used) {
                        assignedSlot = s;
                        break;
                    }
                }
            }
            if (!assignedSlot) {
                for (let i = slots.length - 1; i >= 0; i--) {
                    if (!slots[i].used) {
                        assignedSlot = slots[i];
                        break;
                    }
                }
            }

            if (assignedSlot) {
                recordMatchAssignment(m, assignedSlot);
                categoryFinalTime[m.categoryId] = assignedSlot.timestamp;
            } else {
                m.tempDate = '';
                m.tempTime = '';
                m.court = 'Sin Horario';
                this.matchesToSchedule.push(m);
            }
        });

        // --- STAGE B: SEMIFINALES ---
        // Deben terminar antes de las finales de su categoría con al menos 60-90 min de descanso
        // Programadas en semiTargetDays (prevDay tarde/noche o lastDay mañana)
        const mixedSemis = mixCategories(allSemiMatches);
        mixedSemis.forEach(m => {
            const finalTime = categoryFinalTime[m.categoryId] || Infinity;
            const maxSemiEnd = finalTime - (durationMins + 60) * 60000;

            let assignedSlot: any = null;

            // Búsqueda en días destino de semifinales
            for (let i = 0; i < slots.length; i++) {
                const s = slots[i];
                if (!s.used && semiTargetDays.has(s.date) && s.timestamp + (durationMins * 60000) <= maxSemiEnd && canPairPlayInSlot(m, s, true, 2)) {
                    assignedSlot = s;
                    break;
                }
            }

            // Fallback: relajar descanso dentro de semiTargetDays
            if (!assignedSlot) {
                for (let i = 0; i < slots.length; i++) {
                    const s = slots[i];
                    if (!s.used && semiTargetDays.has(s.date) && s.timestamp + (durationMins * 60000) <= maxSemiEnd && canPairPlayInSlot(m, s, false, 0)) {
                        assignedSlot = s;
                        break;
                    }
                }
            }

            if (assignedSlot) {
                recordMatchAssignment(m, assignedSlot);
                categoryEarliestSemiTime[m.categoryId] = Math.min(categoryEarliestSemiTime[m.categoryId] || Infinity, assignedSlot.timestamp);
                categoryEarliestPlayoffTime[m.categoryId] = Math.min(categoryEarliestPlayoffTime[m.categoryId] || Infinity, assignedSlot.timestamp);
            } else {
                m.tempDate = '';
                m.tempTime = '';
                m.court = 'Sin Horario';
                this.matchesToSchedule.push(m);
            }
        });

        // --- STAGE C: CUARTOS DE FINAL ---
        // Deben terminar antes de las semifinales de su categoría
        // Programados en cuartosTargetDays (días D-3 y D-2)
        const mixedCuartos = mixCategories(allCuartosMatches);
        mixedCuartos.forEach(m => {
            const nextRoundTime = categoryEarliestSemiTime[m.categoryId] || categoryFinalTime[m.categoryId] || Infinity;
            const maxCuartosEnd = nextRoundTime - (durationMins + 45) * 60000;

            let assignedSlot: any = null;

            for (let i = 0; i < slots.length; i++) {
                const s = slots[i];
                if (!s.used && cuartosTargetDays.has(s.date) && s.timestamp + (durationMins * 60000) <= maxCuartosEnd && canPairPlayInSlot(m, s, true, 2)) {
                    assignedSlot = s;
                    break;
                }
            }

            if (!assignedSlot) {
                for (let i = 0; i < slots.length; i++) {
                    const s = slots[i];
                    if (!s.used && cuartosTargetDays.has(s.date) && s.timestamp + (durationMins * 60000) <= maxCuartosEnd && canPairPlayInSlot(m, s, false, 0)) {
                        assignedSlot = s;
                        break;
                    }
                }
            }

            if (assignedSlot) {
                recordMatchAssignment(m, assignedSlot);
                categoryEarliestCuartosTime[m.categoryId] = Math.min(categoryEarliestCuartosTime[m.categoryId] || Infinity, assignedSlot.timestamp);
                categoryEarliestPlayoffTime[m.categoryId] = Math.min(categoryEarliestPlayoffTime[m.categoryId] || Infinity, assignedSlot.timestamp);
            } else {
                m.tempDate = '';
                m.tempTime = '';
                m.court = 'Sin Horario';
                this.matchesToSchedule.push(m);
            }
        });

        // --- STAGE D: OCTAVOS & DIECISEISAVOS ---
        // Programados en earlyPlayoffTargetDays (días D-4 y D-3)
        const earlyPlayoffs = mixCategories([...allDieciseisMatches, ...allOctavosMatches]);
        earlyPlayoffs.forEach(m => {
            const nextRoundTime = categoryEarliestCuartosTime[m.categoryId] || categoryEarliestSemiTime[m.categoryId] || categoryFinalTime[m.categoryId] || Infinity;
            const maxEnd = nextRoundTime - (durationMins + 45) * 60000;

            let assignedSlot: any = null;

            for (let i = 0; i < slots.length; i++) {
                const s = slots[i];
                if (!s.used && earlyPlayoffTargetDays.has(s.date) && s.timestamp + (durationMins * 60000) <= maxEnd && canPairPlayInSlot(m, s, true, 2)) {
                    assignedSlot = s;
                    break;
                }
            }

            if (!assignedSlot) {
                for (let i = 0; i < slots.length; i++) {
                    const s = slots[i];
                    if (!s.used && earlyPlayoffTargetDays.has(s.date) && s.timestamp + (durationMins * 60000) <= maxEnd && canPairPlayInSlot(m, s, false, 0)) {
                        assignedSlot = s;
                        break;
                    }
                }
            }

            if (assignedSlot) {
                recordMatchAssignment(m, assignedSlot);
                categoryEarliestPlayoffTime[m.categoryId] = Math.min(categoryEarliestPlayoffTime[m.categoryId] || Infinity, assignedSlot.timestamp);
            } else {
                m.tempDate = '';
                m.tempTime = '';
                m.court = 'Sin Horario';
                this.matchesToSchedule.push(m);
            }
        });

        // --- STAGE E: FASE DE GRUPOS (OCUPA TODO EL HORARIO DE LA SEMANA) ---
        // Se programan en groupTargetDays (días 0 a D-3) ocupando todos los horarios de la semana
        const mixedGroupMatches = mixCategories(allGroupMatches);

        mixedGroupMatches.forEach(m => {
            const nextRoundTime = categoryEarliestPlayoffTime[m.categoryId] || categoryFinalTime[m.categoryId] || Infinity;
            const maxGroupEnd = nextRoundTime - (durationMins + 45) * 60000;

            let assignedSlot: any = null;

            // Pase 1: Restricciones óptimas (descansos completos, máx 2 partidos/día) en groupTargetDays
            for (let i = 0; i < slots.length; i++) {
                const s = slots[i];
                if (!s.used && groupTargetDays.has(s.date) && s.timestamp + (durationMins * 60000) <= maxGroupEnd && canPairPlayInSlot(m, s, true, 2)) {
                    assignedSlot = s;
                    break;
                }
            }

            // Pase 2: Flexibilidad de descanso dentro de groupTargetDays
            if (!assignedSlot) {
                for (let i = 0; i < slots.length; i++) {
                    const s = slots[i];
                    if (!s.used && groupTargetDays.has(s.date) && s.timestamp + (durationMins * 60000) <= maxGroupEnd && canPairPlayInSlot(m, s, false, 3)) {
                        assignedSlot = s;
                        break;
                    }
                }
            }

            // Pase 3: Si los días asignados se llenan, permitir cualquier día previo a la final antes de los playoffs
            if (!assignedSlot) {
                for (let i = 0; i < slots.length; i++) {
                    const s = slots[i];
                    const allowDate = D >= 3 ? s.date !== lastDay : true;
                    if (!s.used && allowDate && s.timestamp + (durationMins * 60000) <= maxGroupEnd && canPairPlayInSlot(m, s, false, 0)) {
                        assignedSlot = s;
                        break;
                    }
                }
            }

            if (assignedSlot) {
                recordMatchAssignment(m, assignedSlot);
            } else {
                m.tempDate = '';
                m.tempTime = '';
                m.court = 'Sin Horario';
                this.matchesToSchedule.push(m);
            }
        });

        // --- STAGE F: GARANTÍA CERO PENDIENTES (Greedy Allocation) ---
        // Si quedó algún partido sin turno por restricciones estrictas pero aún hay canchas libres:
        const unassignedMatches = this.matchesToSchedule.filter(m => !m.tempTime || m.tempTime === '');
        if (unassignedMatches.length > 0) {
            console.log(`Pase Greedy: Acomodando ${unassignedMatches.length} partidos pendientes en canchas libres restantes`);
            const freeSlots = slots.filter(s => !s.used);

            unassignedMatches.forEach(m => {
                const nextRoundTime = (m.ronda === 'Final')
                    ? Infinity
                    : ((m.ronda === 'Semi')
                        ? (categoryFinalTime[m.categoryId] || Infinity)
                        : (categoryEarliestPlayoffTime[m.categoryId] || categoryFinalTime[m.categoryId] || Infinity));

                for (let i = 0; i < freeSlots.length; i++) {
                    const s = freeSlots[i];
                    if (!s.used && (s.timestamp + durationMins * 60000) <= nextRoundTime) {
                        s.used = true;
                        m.tempDate = s.date;
                        m.tempTime = s.timeString;
                        m.tempCanchaId = s.courtId;
                        m.court = s.courtName;
                        break;
                    }
                }
            });
        }

        // Ordenar todos los partidos cronológicamente
        this.matchesToSchedule.sort((a, b) => {
            const timeA = a.tempDate && a.tempTime ? new Date(`${a.tempDate} ${a.tempTime}:00`).getTime() : 9999999999999;
            const timeB = b.tempDate && b.tempTime ? new Date(`${b.tempDate} ${b.tempTime}:00`).getTime() : 9999999999999;
            return timeA - timeB || (a.roundOrder || 0) - (b.roundOrder || 0);
        });

        console.log(`Phased scheduling complete: ${this.matchesToSchedule.filter(m => m.tempTime).length} assigned, ${this.matchesToSchedule.filter(m => !m.tempTime).length} pending.`);

        // 4. Update Views
        if (this.categorias.length > 0 && !this.selectedBracketCategoryId) {
            this.selectedBracketCategoryId = this.categorias[0].id;
        }

        if (this.selectedBracketCategoryId) {
            this.selectBracketCategory(this.selectedBracketCategoryId);
        }
    }

    // ...

    saveTorneoFechas() {
        if (!this.selectedTorneo) return;

        // 1. Update basic info (dates, canchas)
        this.selectedTorneo.fecha_inicio = this.planParams.startDate;
        this.selectedTorneo.fecha_fin = this.planParams.endDate;
        const courtCount = this.planParams.selectedCanchasIds.length > 0
            ? this.planParams.selectedCanchasIds.length
            : (Number(this.selectedTorneo.num_canchas) || 1);
        this.selectedTorneo.num_canchas = courtCount;
        this.selectedTorneo.canchas_ids = this.planParams.selectedCanchasIds;

        // 2. Filter grid to only include current date range
        const gridPayload: any = {};
        this.gridDays.forEach(day => {
            if (this.availabilityGrid[day] && this.availabilityGrid[day].length > 0) {
                gridPayload[day] = this.availabilityGrid[day];
            }
        });

        const updateTorneo$ = this.clubesService.updateTorneo(this.selectedTorneo.id, {
            ...this.selectedTorneo,
            num_canchas: courtCount,
            canchas_ids: this.planParams.selectedCanchasIds
        });
        const updateGrid$ = this.clubesService.saveTorneoAvailability(this.selectedTorneo.id, gridPayload);

        // Run in parallel
        forkJoin({
            torneo: updateTorneo$,
            grid: updateGrid$
        }).subscribe({
            next: (results) => {
                console.log('Update results:', results);
                Swal.fire({
                    title: '¡Guardado!',
                    text: 'Fechas y horarios del torneo actualizados correctamente',
                    icon: 'success',
                    confirmButtonColor: '#0f172a'
                });
            },
            error: (err) => {
                console.error('Error saving tournament data:', err);

                let msg = 'No se pudo actualizar la configuración.';
                if (err.url && err.url.includes('update_torneo.php')) {
                    msg += ' Error al actualizar fechas del torneo.';
                } else if (err.url && err.url.includes('update_torneo_availability.php')) {
                    msg += ' Error al actualizar horarios.';
                }

                Swal.fire({
                    title: 'Error',
                    text: msg,
                    icon: 'error',
                    confirmButtonColor: '#0f172a'
                });
            }
        });
    }

    getOptimalGroupDistribution(n: number, pref: number): number[] {
        if (n < 3) return n > 0 ? [n] : [];

        const groups: number[] = [];
        let remaining = n;

        while (remaining > 0) {
            if (remaining >= pref) {
                const after = remaining - pref;
                // If taking the preferred size leaves 1 or 2 orphans, 
                // we deviate to a smaller group (3) to balance.
                if (after > 0 && after < 3) {
                    groups.push(3);
                    remaining -= 3;
                } else {
                    groups.push(pref);
                    remaining -= pref;
                }
            } else {
                groups.push(remaining);
                remaining = 0;
            }
        }
        return groups;
    }

    loadCategorias(torneoId: number) {
        this.clubesService.getCategoriasTorneo(torneoId).subscribe(res => {
            this.categorias = res;
            this.calculateStats(); 
            if (!this.selectedCategoria) {
                this.loadTodasInscripciones(torneoId);
            }
        });
    }

    loadTodasInscripciones(torneoId: number) {
        this.clubesService.getInscripciones(undefined, torneoId).subscribe(res => {
            this.inscripciones = res;
        });
    }

    selectCategoria(cat: any) {
        // Si se hace clic en la categoría ya seleccionada, deseleccionar para volver a la Vista Global
        if (this.selectedCategoria && this.selectedCategoria.id === cat.id) {
            this.selectedCategoria = null;
            if (this.selectedTorneo) {
                this.loadTodasInscripciones(this.selectedTorneo.id);
            }
            return;
        }
        this.selectedCategoria = cat;
        this.loadInscripciones(cat.id);
        this.loadGroupData(cat.id);
        this.loadPlayoffs(cat.id);
    }

    selectCategoryForInscriptions(cat: any) {
        this.selectedCategoria = cat;
        this.loadInscripciones(cat.id);
        this.loadGroupData(cat.id);
        this.loadPlayoffs(cat.id);
        // Prepare data for calendar view
        this.loadCanchasClub(); // Load courts for scheduling
        this.prepareScheduleData();
    }

    loadGroupData(catId: number) {
        this.clubesService.getPartidosCategoria(catId).subscribe(res => {
            this.groupMatches = res.filter(m => m.grupo_id !== null);

            // Extract unique groups
            const groupIds = [...new Set(this.groupMatches.map(m => m.grupo_id))];
            this.grupos = [];
            groupIds.forEach(gid => {
                const match = this.groupMatches.find(m => m.grupo_id === gid);
                this.grupos.push({ id: gid, nombre: match.grupo_nombre });
                this.loadRankingGrupo(gid);
            });
        });
    }

    loadRankingGrupo(grupoId: number) {
        this.clubesService.getRankingGrupo(grupoId).subscribe(res => {
            this.groupRankings[grupoId] = res;
        });
    }

    toggleCanchaLuz(cancha: any) {
        cancha.luz = !cancha.luz;
        this.calculateStats(); // Recalcular balance al cambiar disponibilidad de cancha
    }

    loadInscripciones(catId: number) {
        this.clubesService.getInscripciones(catId).subscribe(res => {
            this.inscripciones = res;
        });
    }

    bracketViewMode: 'bilateral' | 'linear' = 'bilateral';
    bracketZoom: number = 1;

    linearRounds: any = {
        dieciseisavos: [],
        octavos: [],
        cuartos: [],
        semi: [],
        final: null
    };

    setBracketZoom(delta: number) {
        this.bracketZoom = Math.min(1.4, Math.max(0.6, Math.round((this.bracketZoom + delta) * 10) / 10));
    }

    resetBracketZoom() {
        this.bracketZoom = 1;
    }

    playoffRounds: any = {
        left: { dieciseisavos: [], octavos: [], cuartos: [], semi: [] },
        right: { dieciseisavos: [], octavos: [], cuartos: [], semi: [] },
        final: null
    };

    loadPlayoffs(catId: number) {
        this.clubesService.getPartidosRonda(catId, '').subscribe(res => {
            this.playoffMatches = res;
            this.organizeBracket(res);
        });
    }

    organizeBracket(matches: any[]) {
        // Reset structure
        this.playoffRounds = {
            left: { dieciseisavos: [], octavos: [], cuartos: [], semi: [] },
            right: { dieciseisavos: [], octavos: [], cuartos: [], semi: [] },
            final: null
        };
        this.linearRounds = {
            dieciseisavos: [],
            octavos: [],
            cuartos: [],
            semi: [],
            final: null
        };

        if (!matches || matches.length === 0) return;

        // 1. Separate Final - Exact matching to avoid false positives with Semifinal or 1/16 Final
        this.playoffRounds.final = matches.find(m => {
            const r = (m.ronda || '').toLowerCase().trim();
            return m.nivel === 1 || r === 'final' || (r.includes('final') && !r.includes('semi') && !r.includes('dieciseis') && !r.includes('16') && !r.includes('cuart') && !r.includes('octav'));
        }) || null;
        this.linearRounds.final = this.playoffRounds.final;

        // 2. Helper to distribute rounds
        const distributeRound = (roundMatches: any[], targetKey: string) => {
            roundMatches.sort((a, b) => (a.posicion != null && b.posicion != null) ? (a.posicion - b.posicion) : (a.id - b.id));
            this.linearRounds[targetKey] = [...roundMatches];
            const mid = Math.ceil(roundMatches.length / 2);
            this.playoffRounds.left[targetKey] = roundMatches.slice(0, mid);
            this.playoffRounds.right[targetKey] = roundMatches.slice(mid);
        };

        // 3. Process each round with robust level and string matching
        const r16 = matches.filter(m => m.nivel === 5 || (m.ronda || '').toLowerCase().includes('dieciseis') || (m.ronda || '').includes('16') || (m.ronda || '').includes('1/16'));
        const r8 = matches.filter(m => m.nivel === 4 || (((m.ronda || '').toLowerCase().includes('octav') || (m.ronda || '').includes('1/8')) && m.nivel !== 5));
        const r4 = matches.filter(m => m.nivel === 3 || (((m.ronda || '').toLowerCase().includes('cuart') || (m.ronda || '').includes('1/4')) && m.nivel !== 4));
        const r2 = matches.filter(m => m.nivel === 2 || (((m.ronda || '').toLowerCase().includes('semi')) && m.nivel !== 1));

        distributeRound(r16, 'dieciseisavos');
        distributeRound(r8, 'octavos');
        distributeRound(r4, 'cuartos');
        distributeRound(r2, 'semi');

        console.log('Bracket organized bilateral:', this.playoffRounds);
        console.log('Bracket organized linear:', this.linearRounds);
    }

    cerrarGrupos() {
        if (!this.selectedCategoria) return;

        Swal.fire({
            title: '¿Cerrar Fase de Grupos?',
            text: 'Se calcularán los clasificados y se generará el Cuadro Eliminatorio.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, cerrar y generar Playoffs'
        }).then(result => {
            if (result.isConfirmed) {
                this.clubesService.cerrarFaseGrupos(this.selectedCategoria.id).subscribe({
                    next: (res) => {
                        Swal.fire({
                            title: '¡Listo!',
                            text: res.mensaje,
                            icon: 'success',
                            confirmButtonColor: '#0f172a'
                        });
                        this.activeDetailTab = 'playoffs';
                        this.loadPlayoffs(this.selectedCategoria.id);
                    },
                    error: (err) => {
                        Swal.fire({
                            title: 'Error',
                            text: err.error?.error || 'No se pudo cerrar la fase de grupos',
                            icon: 'error',
                            confirmButtonColor: '#0f172a'
                        });
                    }
                });
            }
        });
    }

    validarInscripcion(ins: any) {
        this.clubesService.validarInscripcion(ins.id, !ins.validado).subscribe({
            next: () => {
                ins.validado = ins.validado ? 0 : 1;
                ins.pagado = ins.validado;
                Swal.fire({
                    title: 'Actualizado',
                    text: 'Estado de inscripción cambiado.',
                    icon: 'success',
                    confirmButtonColor: '#0f172a'
                });
            }
        });
    }

    // CARGA DE RESULTADOS
    // SCORE MODAL LOGIC
    showScoreModal: boolean = false;
    currentMatchForScore: any = null;
    scoreInput: any = {
        s1p1: '', s1p2: '',
        s2p1: '', s2p2: '',
        s3p1: '', s3p2: ''
    };

    cargarResultado(partido: any) {
        this.currentMatchForScore = partido;
        this.scoreInput = { s1p1: '', s1p2: '', s2p1: '', s2p2: '', s3p1: '', s3p2: '' };
        this.showScoreModal = true;
    }

    closeScoreModal() {
        this.showScoreModal = false;
        this.currentMatchForScore = null;
    }

    // PLANIFICACIÓN
    planParams: any = {
        startDate: '',
        endDate: '',
        startTime: '09:00',
        endTime: '22:00',
        duration: 90,
        selectedCanchasIds: []
    };
    clubCanchas: any[] = [];
    matchesToSchedule: any[] = []; // Partidos para mostrar en la lista

    // Cargar canchas
    loadCanchasClub() {
        if (this.selectedTorneo) {
            this.clubesService.getCanchas(this.selectedTorneo.club_id).subscribe(res => {
                this.clubCanchas = res || [];
                // If selectedCanchasIds is already populated and valid, keep it and sync num_canchas
                if (this.planParams.selectedCanchasIds && this.planParams.selectedCanchasIds.length > 0) {
                    this.selectedTorneo.num_canchas = this.planParams.selectedCanchasIds.length;
                } else if (this.clubCanchas.length > 0) {
                    const count = Math.min(this.clubCanchas.length, Math.max(1, Number(this.selectedTorneo.num_canchas) || this.clubCanchas.length || 2));
                    this.planParams.selectedCanchasIds = this.clubCanchas.slice(0, count).map(c => c.id);
                    this.selectedTorneo.num_canchas = this.planParams.selectedCanchasIds.length;
                    this.selectedTorneo.canchas_ids = this.planParams.selectedCanchasIds;
                } else {
                    if (!this.selectedTorneo.num_canchas) {
                        this.selectedTorneo.num_canchas = 2;
                    }
                }
                this.calculateStats();
            });
        }
    }

    // Unificar partidos
    prepareScheduleData() {
        if (!this.selectedCategoria) {
            console.warn('No hay categoría seleccionada para preparar datos');
            return;
        }

        if (!this.groupMatches.length) this.loadGroupData(this.selectedCategoria.id);
        if (!this.playoffMatches.length) this.loadPlayoffs(this.selectedCategoria.id);

        setTimeout(() => {
            const all = [...this.groupMatches, ...this.playoffMatches];
            this.matchesToSchedule = all.map(m => ({
                id: m.id,
                pareja1_id: m.pareja1_id,
                pareja1_nombre: m.pareja1_nombre,
                pareja2_id: m.pareja2_id,
                pareja2_nombre: m.pareja2_nombre,
                ronda: m.ronda || 'Grupo ' + m.grupo_nombre,
                fecha_hora_inicio: m.fecha_hora_inicio,
                cancha_id: m.cancha_id,
                tempDate: m.fecha_hora_inicio ? m.fecha_hora_inicio.split(' ')[0] : '',
                tempTime: m.fecha_hora_inicio ? m.fecha_hora_inicio.split(' ')[1]?.substring(0, 5) : '',
                tempCanchaId: m.cancha_id || null,
                isScheduled: !!m.fecha_hora_inicio
            }));
            this.organizeCalendar();
        }, 800);
    }

    organizeCalendar() {
        // Group matches by date
        const groups: { [key: string]: any[] } = {};

        // Pre-populate with all gridDays that have configured hours so all tournament days appear as tabs
        this.gridDays.forEach(day => {
            if (this.availabilityGrid[day] && this.availabilityGrid[day].length > 0) {
                groups[day] = [];
            }
        });

        this.matchesToSchedule.forEach(m => {
            const dateKey = m.tempDate || 'Sin Programar';
            if (!groups[dateKey]) {
                groups[dateKey] = [];
            }
            groups[dateKey].push(m);
        });

        // Convert to array and sort
        this.calendarDays = Object.keys(groups).sort().map(date => {
            const dayMatches = groups[date];

            // Group by hour for the timeline-v3 view
            const hourGroupsMap: { [key: string]: any[] } = {};
            dayMatches.forEach((m: any) => {
                const hour = m.tempTime || '09:00'; // Fallback to 09:00 if not set
                if (!hourGroupsMap[hour]) hourGroupsMap[hour] = [];
                hourGroupsMap[hour].push(m);
            });

            const hourGroups = Object.keys(hourGroupsMap).sort((a, b) => {
                const [ha, ma] = a.split(':').map(Number);
                const [hb, mb] = b.split(':').map(Number);
                return (ha * 60 + (ma || 0)) - (hb * 60 + (mb || 0));
            }).map(h => ({
                hour: h,
                matches: hourGroupsMap[h]
            }));

            return {
                date: date,
                matches: dayMatches.sort((a: any, b: any) => {
                    const [ha, ma] = (a.tempTime || '09:00').split(':').map(Number);
                    const [hb, mb] = (b.tempTime || '09:00').split(':').map(Number);
                    return (ha * 60 + (ma || 0)) - (hb * 60 + (mb || 0));
                }),
                hourGroups: hourGroups
            };
        });

        // Reset selected day index to show the first day available
        this.selectedDayIndex = 0;
    }

    toggleCanchaSelection(canchaId: number) {
        const idx = this.planParams.selectedCanchasIds.indexOf(canchaId);
        if (idx > -1) {
            if (this.planParams.selectedCanchasIds.length > 1) {
                this.planParams.selectedCanchasIds.splice(idx, 1);
            }
        } else {
            this.planParams.selectedCanchasIds.push(canchaId);
        }
        if (this.selectedTorneo) {
            this.selectedTorneo.num_canchas = this.planParams.selectedCanchasIds.length;
            this.selectedTorneo.canchas_ids = this.planParams.selectedCanchasIds;
        }
        this.calculateStats();
    }

    isCanchaSelected(canchaId: number): boolean {
        return this.planParams.selectedCanchasIds.includes(canchaId);
    }

    onNumCanchasChange() {
        const count = Math.max(1, Number(this.selectedTorneo?.num_canchas) || 1);
        if (this.clubCanchas.length > 0) {
            this.planParams.selectedCanchasIds = this.clubCanchas.slice(0, Math.min(this.clubCanchas.length, count)).map(c => c.id);
            if (this.selectedTorneo) {
                this.selectedTorneo.canchas_ids = this.planParams.selectedCanchasIds;
                this.selectedTorneo.num_canchas = this.planParams.selectedCanchasIds.length;
            }
        }
        this.calculateStats();
    }

    autoSchedule() {
        if (this.planParams.selectedCanchasIds.length === 0) {
            if (this.clubCanchas.length > 0) {
                this.planParams.selectedCanchasIds = this.clubCanchas.map(c => c.id);
            } else {
                Swal.fire({
                    title: 'Error de Configuración',
                    text: 'No hay canchas cargadas para este club.',
                    icon: 'error',
                    confirmButtonColor: '#0f172a'
                });
                return;
            }
        }
        if (!this.planParams.startDate || !this.planParams.endDate) {
            Swal.fire({ title: 'Fechas Requeridas', text: 'Selecciona fecha de inicio y fin.', icon: 'error', confirmButtonColor: '#0f172a' });
            return;
        }

        const [sy, sm, sd] = this.planParams.startDate.split('-').map(Number);
        const [ey, em, ed] = this.planParams.endDate.split('-').map(Number);
        const startDate = new Date(sy, sm - 1, sd);
        const endDate = new Date(ey, em - 1, ed);

        const [startH, startM] = this.planParams.startTime.split(':').map(Number);
        const [endH, endM] = this.planParams.endTime.split(':').map(Number);
        const dayStartMins = startH * 60 + startM;
        const dayEndMins = endH * 60 + endM;
        const duration = this.matchDuration || 75; 

        let pending = this.matchesToSchedule.filter(m => !m.tempTime || m.tempTime === '');
        if (pending.length === 0) {
            Swal.fire({ title: 'Sin Pendientes', text: 'No hay partidos pendientes.', icon: 'info', confirmButtonColor: '#0f172a' });
            return;
        }

        // 1. Priorizar rondas finales para el final
        pending.sort((a, b) => {
            const getPriority = (ronda: string) => {
                const r = (ronda || '').toLowerCase();
                if (r.includes('grupo')) return 1;
                if (r.includes('32')) return 2;
                if (r.includes('16') || r.includes('octavos')) return 3;
                if (r.includes('cuartos')) return 4;
                if (r.includes('semi')) return 5;
                if (r.includes('final')) return 6;
                return 10;
            };
            return getPriority(a.ronda) - getPriority(b.ronda);
        });

        const lastPairEndTime: { [key: number]: Date } = {}; 
        const courtOccupancy: { [key: string]: Date } = {}; 
        
        this.matchesToSchedule.filter(m => m.tempDate && m.tempTime).forEach(m => {
            const start = new Date(`${m.tempDate} ${m.tempTime}:00`);
            const end = new Date(start.getTime() + duration * 60000);
            const cKey = `${m.tempCanchaId}_${m.tempDate}`;
            if (!courtOccupancy[cKey] || end > courtOccupancy[cKey]) courtOccupancy[cKey] = end;
            if (m.pareja1_id && (!lastPairEndTime[m.pareja1_id] || end > lastPairEndTime[m.pareja1_id])) lastPairEndTime[m.pareja1_id] = end;
            if (m.pareja2_id && (!lastPairEndTime[m.pareja2_id] || end > lastPairEndTime[m.pareja2_id])) lastPairEndTime[m.pareja2_id] = end;
        });

        const allSlots: any[] = [];
        let currentDateLoop = new Date(startDate);
        while (currentDateLoop <= endDate) {
            const dateStr = currentDateLoop.toISOString().split('T')[0];
            let currentMins = dayStartMins;
            while (currentMins + duration <= dayEndMins) {
                const h = Math.floor(currentMins / 60);
                const m = currentMins % 60;
                const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                
                if (this.isHourEnabled(dateStr, h)) { // <--- RESTORED GRID CHECK
                    this.planParams.selectedCanchasIds.forEach((courtId: number) => {
                        allSlots.push({
                            dateStr,
                            timeStr,
                            courtId,
                            startTime: new Date(`${dateStr} ${timeStr}:00`)
                        });
                    });
                }
                currentMins += 30; 
            }
            currentDateLoop.setDate(currentDateLoop.getDate() + 1);
        }

        allSlots.sort((a,b) => a.startTime.getTime() - b.startTime.getTime());

        let scheduledCount = 0;
        for (const slot of allSlots) {
            if (pending.length === 0) break;

            const courtKey = `${slot.courtId}_${slot.dateStr}`;
            const nextFree = courtOccupancy[courtKey] || new Date(`${slot.dateStr} 00:00:00`);
            if (slot.startTime < nextFree) continue;

            let matchIdx = 0;
            while (matchIdx < pending.length) {
                const match = pending[matchIdx];
                const restRequired = 90 * 60000;
                
                const p1End = lastPairEndTime[match.pareja1_id];
                const p2End = lastPairEndTime[match.pareja2_id];

                if ((p1End && (slot.startTime.getTime() - p1End.getTime()) < restRequired) ||
                    (p2End && (slot.startTime.getTime() - p2End.getTime()) < restRequired)) {
                    matchIdx++;
                    continue;
                }

                match.tempDate = slot.dateStr;
                match.tempTime = slot.timeStr;
                match.tempCanchaId = slot.courtId;
                match.isScheduled = true;

                const matchEndObj = new Date(slot.startTime.getTime() + duration * 60000);
                if (match.pareja1_id) lastPairEndTime[match.pareja1_id] = matchEndObj;
                if (match.pareja2_id) lastPairEndTime[match.pareja2_id] = matchEndObj;
                courtOccupancy[courtKey] = matchEndObj;

                pending.splice(matchIdx, 1);
                scheduledCount++;
                break;
            }
        }

        this.organizeCalendar();
        if (pending.length > 0) {
            Swal.fire({
                title: 'Programación Parcial',
                text: `Se programaron ${scheduledCount} partidos, pero quedaron ${pending.length} sin asignar por falta de cupos.`,
                icon: 'warning',
                confirmButtonColor: '#0f172a'
            });
        } else {
            Swal.fire({
                title: 'Planificación Exitosa',
                text: `Se han propuesto horarios para ${scheduledCount} partidos exitosamente.`,
                icon: 'success',
                showCancelButton: false,
                confirmButtonText: 'Aceptar',
                confirmButtonColor: '#0f172a'
            });
        }
    }

    savePlanificacion() {
        const changes = this.matchesToSchedule.filter(m => m.tempDate && m.tempTime).map(m => ({
            partido_id: m.id,
            fecha_inicio: `${m.tempDate} ${m.tempTime}:00`,
            cancha_id: m.tempCanchaId || 0
        }));

        this.clubesService.saveSchedule(changes).subscribe({
            next: () => Swal.fire({
                title: 'Planificación Guardada',
                text: 'La programación oficial se ha actualizado correctamente.',
                icon: 'success',
                confirmButtonColor: '#0f172a'
            }),
            error: () => Swal.fire({
                title: 'Error de Guardado',
                text: 'No se pudo sincronizar la programación con el servidor.',
                icon: 'error',
                confirmButtonColor: '#0f172a'
            })
        });
    }

    saveScore() {
        if (!this.currentMatchForScore) return;

        const s = this.scoreInput;
        let sets = [];

        // Basic validation: ensure values are not empty strings
        if (s.s1p1 !== '' && s.s1p2 !== '') sets.push({ p1: s.s1p1, p2: s.s1p2 });
        if (s.s2p1 !== '' && s.s2p2 !== '') sets.push({ p1: s.s2p1, p2: s.s2p2 });
        if (s.s3p1 !== '' && s.s3p2 !== '') sets.push({ p1: s.s3p1, p2: s.s3p2 });

        if (sets.length === 0) {
            Swal.fire({
                title: 'Marcador Vacío',
                text: 'Ingresa al menos el resultado del primer set para guardar.',
                icon: 'warning',
                confirmButtonColor: '#0f172a'
            });
            return;
        }

        const scoreString = sets.map(set => `${set.p1}-${set.p2}`).join(', ');

        // Handle fictional/simulated matches (ID < 0)
        if (this.currentMatchForScore.id < 0) {
            // Update locally for visualization only
            this.currentMatchForScore.resultado = scoreString;
            this.currentMatchForScore.isFinished = true;

            Swal.fire({
                title: 'Marcador Simulado',
                text: 'Este es un partido ficticio. El resultado se muestra solo de forma visual.',
                icon: 'info',
                timer: 2000,
                showConfirmButton: false
            });
            this.closeScoreModal();
            return;
        }

        this.clubesService.updateMatchResultV2({
            partido_id: this.currentMatchForScore.id,
            resultado: sets,
            categoria_id: this.currentMatchForScore.categoryId || this.selectedCategoria.id
        }).subscribe({
            next: () => {
                Swal.fire({
                    title: '¡Marcador Actualizado!',
                    text: 'El resultado se ha guardado correctamente.',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                });
                // Only refresh DB data if they are real
                if (this.selectedCategoria) {
                    this.loadPlayoffs(this.selectedCategoria.id);
                    this.loadGroupData(this.selectedCategoria.id);
                }
                this.closeScoreModal();
                this.organizeCalendar(); // Update calendar view
            },
            error: (err) => {
                console.error('Error saving score:', err);
                Swal.fire({
                    title: 'Error de Guardado',
                    text: 'No se pudo registrar el resultado en el servidor.',
                    icon: 'error',
                    confirmButtonColor: '#0f172a'
                });
            }
        });
    }

    crearTorneo() {
        if (!this.newTorneo.nombre || !this.newTorneo.fecha_inicio) {
            Swal.fire({
                title: 'Datos Incompletos',
                text: 'El nombre del torneo y la fecha de inicio son campos obligatorios.',
                icon: 'warning',
                confirmButtonColor: '#0f172a'
            });
            return;
        }

        const payload = {
            ...this.newTorneo,
            num_canchas: this.newTorneo.num_canchas || this.newTorneoSelectedCanchas.length || 2,
            canchas_ids: this.newTorneoSelectedCanchas,
            creator_id: this.userId
        };

        this.clubesService.createTorneoV2(payload).subscribe({
            next: (res) => {
                Swal.fire({
                    title: '¡Torneo Creado!',
                    text: 'El torneo principal se ha registrado. Procede a configurar las categorías.',
                    icon: 'success',
                    confirmButtonColor: '#0f172a'
                });
                this.loadInitialData();
                this.selectTorneo(res.torneo); // Assuming backend returns the created object
            },
            error: (err) => {
                Swal.fire({
                    title: 'Error de Registro',
                    text: 'No se pudo crear el torneo. Verifica los datos e intenta nuevamente.',
                    icon: 'error',
                    confirmButtonColor: '#0f172a'
                });
            }
        });
    }

    actualizarTorneo() {
        if (!this.selectedTorneo.nombre || !this.selectedTorneo.fecha_inicio) {
            Swal.fire({
                title: 'Datos Incompletos',
                text: 'El nombre del torneo y la fecha de inicio son campos obligatorios.',
                icon: 'warning',
                confirmButtonColor: '#0f172a'
            });
            return;
        }

        const payload = {
            id: this.selectedTorneo.id,
            nombre: this.selectedTorneo.nombre,
            fecha_inicio: this.selectedTorneo.fecha_inicio,
            fecha_fin: this.selectedTorneo.fecha_fin,
            precio: this.selectedTorneo.precio,
            formato_sets: this.selectedTorneo.formato_sets,
            descripcion: this.selectedTorneo.descripcion,
            poster_url: this.selectedTorneo.poster_url,
            num_canchas: this.selectedTorneo.num_canchas || this.planParams.selectedCanchasIds?.length || 2,
            canchas_ids: this.planParams.selectedCanchasIds?.length > 0 ? this.planParams.selectedCanchasIds : this.selectedTorneo.canchas_ids
        };

        this.clubesService.updateTorneo(payload).subscribe({
            next: (res) => {
                Swal.fire({
                    title: '¡Torneo Actualizado!',
                    text: 'Los detalles del torneo han sido guardados.',
                    icon: 'success',
                    confirmButtonColor: '#0f172a'
                });
                this.loadInitialData(); // Reload tournament list
            },
            error: (err) => {
                Swal.fire({
                    title: 'Error de Actualización',
                    text: 'No se pudo guardar la información. Intenta nuevamente.',
                    icon: 'error',
                    confirmButtonColor: '#0f172a'
                });
            }
        });
    }

    cargarCategoriasStandard() {
        this.newTorneo.categorias = [
            // Varones
            { nombre: '1ra Varones', max_parejas: 16, puntos_repartir: 1000 },
            { nombre: '2da Varones', max_parejas: 16, puntos_repartir: 750 },
            { nombre: '3ra Varones', max_parejas: 24, puntos_repartir: 500 },
            { nombre: '4ta Varones', max_parejas: 32, puntos_repartir: 250 },
            { nombre: '5ta Varones', max_parejas: 32, puntos_repartir: 100 },
            { nombre: '6ta Varones', max_parejas: 32, puntos_repartir: 50 },
            // Damas (Chile style)
            { nombre: 'Damas A', max_parejas: 16, puntos_repartir: 500 },
            { nombre: 'Damas B', max_parejas: 16, puntos_repartir: 250 },
            { nombre: 'Damas C', max_parejas: 24, puntos_repartir: 100 },
            { nombre: 'Damas D', max_parejas: 24, puntos_repartir: 50 },
            { nombre: 'Damas E', max_parejas: 24, puntos_repartir: 25 }
        ];
        Swal.fire({
            title: 'Plantillas Cargadas',
            text: 'Se han generado las categorías estándar (Varones 1-6, Damas A-E).',
            icon: 'success',
            showCancelButton: false,
            confirmButtonText: 'Genial',
            confirmButtonColor: '#0f172a'
        });
    }

    // INSCRIPCIÓN MANUAL CON BÚSQUEDA
    manualInscripcion: any = {
        jugador1_id: 0,
        jugador1_nombre: '', // Para visualización/input
        jugador1_seleccionado: false, // Flag para saber si viene de DB

        jugador2_id: 0,
        jugador2_nombre: '',
        jugador2_seleccionado: false,

        nombre_pareja: ''
    };

    // Resultados de búsqueda
    searchResults1: any[] = [];
    searchResults2: any[] = [];
    isSearching1: boolean = false;
    isSearching2: boolean = false;

    searchUser(query: string, playerNum: number) {
        if (query.length < 2) {
            if (playerNum === 1) this.searchResults1 = [];
            else this.searchResults2 = [];
            return;
        }

        const normalizedQuery = query.toLowerCase();
        // Filtrar de allUsers que ya tenemos cargados (optimización local)
        const results = this.allUsers.filter(u =>
            u.nombre.toLowerCase().includes(normalizedQuery) ||
            (u.email && u.email.toLowerCase().includes(normalizedQuery))
        ).slice(0, 5); // Top 5

        if (playerNum === 1) this.searchResults1 = results;
        else this.searchResults2 = results;
    }

    selectUser(user: any, playerNum: number) {
        if (playerNum === 1) {
            this.manualInscripcion.jugador1_id = user.id;
            this.manualInscripcion.jugador1_nombre = user.nombre;
            this.manualInscripcion.jugador1_seleccionado = true;
            this.searchResults1 = [];
        } else {
            this.manualInscripcion.jugador2_id = user.id;
            this.manualInscripcion.jugador2_nombre = user.nombre;
            this.manualInscripcion.jugador2_seleccionado = true;
            this.searchResults2 = [];
        }
    }

    clearUserSelection(playerNum: number) {
        if (playerNum === 1) {
            this.manualInscripcion.jugador1_id = 0;
            this.manualInscripcion.jugador1_nombre = '';
            this.manualInscripcion.jugador1_seleccionado = false;
        } else {
            this.manualInscripcion.jugador2_id = 0;
            this.manualInscripcion.jugador2_nombre = '';
            this.manualInscripcion.jugador2_seleccionado = false;
        }
    }

    inscribirParejaManual() {
        if (!this.selectedCategoria) return;

        // Validar nombres
        const j1Name = this.manualInscripcion.jugador1_nombre;
        const j2Name = this.manualInscripcion.jugador2_nombre;

        if (!j1Name || !j2Name) {
            Swal.fire({
                title: 'Nombres Requeridos',
                text: 'Debes ingresar el nombre de ambos jugadores para registrar la pareja.',
                icon: 'warning',
                confirmButtonColor: '#0f172a'
            });
            return;
        }

        const payload = {
            categoria_id: this.selectedCategoria.id,
            jugador1_id: this.manualInscripcion.jugador1_id || 0,
            jugador1_nombre_manual: this.manualInscripcion.jugador1_id ? '' : j1Name,
            jugador2_id: this.manualInscripcion.jugador2_id || 0,
            jugador2_nombre_manual: this.manualInscripcion.jugador2_id ? '' : j2Name,
            nombre_pareja: this.manualInscripcion.nombre_pareja || `${j1Name} / ${j2Name}`,
            es_semilla: this.manualInscripcion.es_semilla ? 1 : 0,
            nro_siembra: this.manualInscripcion.nro_siembra || null,
            es_admin: true
        };

        this.clubesService.inscribirParejaV2(payload).subscribe({
            next: () => {
                Swal.fire({
                    title: '¡Inscrito!',
                    text: 'Pareja añadida correctamente.',
                    icon: 'success',
                    confirmButtonColor: '#0f172a'
                });
                if (this.selectedCategoria) {
                    this.loadInscripciones(this.selectedCategoria.id);
                } else if (this.selectedTorneo) {
                    this.loadTodasInscripciones(this.selectedTorneo.id);
                }
                if (this.selectedTorneo) {
                    this.loadCategorias(this.selectedTorneo.id);
                }
                // Reset form
                this.manualInscripcion = {
                    jugador1_id: 0, jugador1_nombre: '', jugador1_seleccionado: false,
                    jugador2_id: 0, jugador2_nombre: '', jugador2_seleccionado: false,
                    nombre_pareja: '',
                    es_semilla: 0,
                    nro_siembra: null
                };
            },
            error: (err) => {
                Swal.fire({
                    title: 'Error de Inscripción',
                    text: err.error?.error || 'No se pudo realizar la inscripción. Revisa los datos.',
                    icon: 'error',
                    confirmButtonColor: '#0f172a'
                });
            }
        });
    }

    toggleInscripciones() {
        if (!this.selectedTorneo) return;

        const currentActive = Number(this.selectedTorneo.inscripciones_abiertas) === 1 || this.selectedTorneo.inscripciones_abiertas === true || this.selectedTorneo.inscripciones_abiertas === '1';
        const newState = !currentActive;
        
        Swal.fire({
            title: newState ? '¿Abrir Inscripciones?' : '¿Cerrar Inscripciones?',
            text: newState ? 'Los usuarios podrán ver y anotarse en este torneo desde la App Móvil.' : 'Nadie más podrá inscribirse desde la App.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, cambiar',
            cancelButtonText: 'Cancelar'
        }).then(result => {
            if (result.isConfirmed) {
                this.clubesService.updateTorneo({
                    id: this.selectedTorneo.id,
                    inscripciones_abiertas: newState ? 1 : 0
                }).subscribe({
                    next: (res: any) => {
                        this.selectedTorneo.inscripciones_abiertas = newState;
                        const inList = this.torneos?.find((t: any) => t.id === this.selectedTorneo.id);
                        if (inList) inList.inscripciones_abiertas = newState ? 1 : 0;

                        Swal.fire({
                            title: '¡Actualizado!',
                            text: res.message || (newState ? 'Inscripciones abiertas correctamente' : 'Inscripciones cerradas'),
                            icon: 'success',
                            confirmButtonText: 'Entendido'
                        });
                        this.cdr.detectChanges();
                    },
                    error: (err: any) => {
                        Swal.fire('Error', 'No se pudo cambiar el estado de inscripciones.', 'error');
                    }
                });
            }
        });
    }

    toggleSemilla(ins: any) {
        if (!ins.es_semilla) {
            Swal.fire({
                title: '👑 Asignar Cabeza de Serie (Seed)',
                html: `
                    <div style="text-align: left; padding: 10px 0;">
                        <p style="font-size: 13px; color: #475569; margin-bottom: 12px;">
                            Pareja: <strong>${ins.nombre_jugador_1} / ${ins.nombre_jugador_2}</strong>
                        </p>
                        <label style="font-size: 11px; font-weight: 800; color: #0f172a; text-transform: uppercase;">
                            Número de Cabeza de Serie:
                        </label>
                        <input id="swal-seed-num-input" type="number" min="1" max="32" value="1" 
                               class="swal2-input" style="font-size: 15px; font-weight: 800; margin-top: 6px; width: 100%;">
                        <p style="font-size: 11px; color: #64748b; margin-top: 6px;">
                            💡 El sistema separará automáticamente a las cabezas de serie en grupos o llaves opuestas.
                        </p>
                    </div>
                `,
                showCancelButton: true,
                confirmButtonText: 'Guardar CS',
                confirmButtonColor: '#0f172a',
                cancelButtonText: 'Cancelar',
                preConfirm: () => {
                    const input = document.getElementById('swal-seed-num-input') as HTMLInputElement;
                    const val = input ? parseInt(input.value, 10) : 1;
                    return val > 0 ? val : 1;
                }
            }).then(result => {
                if (result.isConfirmed) {
                    const nro = result.value || 1;
                    this.clubesService.updateInscripcionSiembra(ins.id, true, nro).subscribe({
                        next: () => {
                            ins.es_semilla = 1;
                            ins.nro_siembra = nro;
                            this.cdr.detectChanges();
                            Swal.fire({
                                title: '¡Cabeza de Serie Asignada!',
                                text: `Pareja configurada como Cabeza de Serie #${nro}.`,
                                icon: 'success',
                                timer: 1500,
                                showConfirmButton: false
                            });
                        }
                    });
                }
            });
        } else {
            Swal.fire({
                title: `👑 Cabeza de Serie #${ins.nro_siembra}`,
                html: `
                    <div style="text-align: left; padding: 10px 0;">
                        <p style="font-size: 13px; color: #475569; margin-bottom: 12px;">
                            Pareja: <strong>${ins.nombre_jugador_1} / ${ins.nombre_jugador_2}</strong>
                        </p>
                        <label style="font-size: 11px; font-weight: 800; color: #0f172a; text-transform: uppercase;">
                            Cambiar Número de Siembra:
                        </label>
                        <input id="swal-seed-edit-input" type="number" min="1" max="32" value="${ins.nro_siembra || 1}" 
                               class="swal2-input" style="font-size: 15px; font-weight: 800; margin-top: 6px; width: 100%;">
                    </div>
                `,
                showCancelButton: true,
                showDenyButton: true,
                confirmButtonText: 'Actualizar Número',
                confirmButtonColor: '#0f172a',
                denyButtonText: 'Quitar Cabeza de Serie',
                denyButtonColor: '#ef4444',
                cancelButtonText: 'Cancelar',
                preConfirm: () => {
                    const input = document.getElementById('swal-seed-edit-input') as HTMLInputElement;
                    const val = input ? parseInt(input.value, 10) : 1;
                    return val > 0 ? val : 1;
                }
            }).then(result => {
                if (result.isConfirmed) {
                    const nro = result.value || 1;
                    this.clubesService.updateInscripcionSiembra(ins.id, true, nro).subscribe({
                        next: () => {
                            ins.es_semilla = 1;
                            ins.nro_siembra = nro;
                            this.cdr.detectChanges();
                        }
                    });
                } else if (result.isDenied) {
                    this.clubesService.updateInscripcionSiembra(ins.id, false, null).subscribe({
                        next: () => {
                            ins.es_semilla = 0;
                            ins.nro_siembra = null;
                            this.cdr.detectChanges();
                            Swal.fire({
                                title: 'Eliminado',
                                text: 'Se ha quitado la condición de cabeza de serie.',
                                icon: 'info',
                                timer: 1200,
                                showConfirmButton: false
                            });
                        }
                    });
                }
            });
        }
    }

    onPosterSelected(event: any) {
        const file = event.target.files[0];
        if (file) {
            // 1. Previsualización Local Instantánea
            const reader = new FileReader();
            reader.onload = (e: any) => {
                this.newTorneo.poster_url = e.target.result;
                this.cdr.detectChanges();
            };
            reader.readAsDataURL(file);

            // 2. Subida al Servidor
            Swal.fire({
                title: 'Subiendo Afiche...',
                didOpen: () => {
                    Swal.showLoading();
                },
                allowOutsideClick: false
            });

            this.clubesService.subirPosterTorneo(file).subscribe({
                next: (res: any) => {
                    // Actualizamos con la URL real del servidor una vez terminada la subida
                    this.newTorneo.poster_url = res.foto_url;
                    Swal.fire('¡Éxito!', 'Afiche cargado correctamente.', 'success');
                },
                error: (err: any) => {
                    Swal.fire('Error', 'No se pudo subir la imagen al servidor.', 'error');
                }
            });
        }
    }

    onPosterSelectedEdit(event: any) {
        const file = event.target.files[0];
        if (file && this.selectedTorneo) {
            // 1. Previsualización Local Instantánea
            const reader = new FileReader();
            reader.onload = (e: any) => {
                this.selectedTorneo.poster_url = e.target.result;
                this.cdr.detectChanges();
            };
            reader.readAsDataURL(file);

            // 2. Subida al Servidor
            Swal.fire({
                title: 'Actualizando Afiche...',
                didOpen: () => {
                    Swal.showLoading();
                },
                allowOutsideClick: false
            });

            this.clubesService.subirPosterTorneo(file).subscribe({
                next: (res: any) => {
                    this.selectedTorneo.poster_url = res.foto_url;
                    // Auto save the tournament so it persists immediately
                    this.actualizarTorneo();
                    Swal.fire('¡Éxito!', 'Afiche actualizado correctamente.', 'success');
                },
                error: (err: any) => {
                    Swal.fire('Error', 'No se pudo subir la imagen al servidor.', 'error');
                }
            });
        }
    }


    anadirParejaManual() {
        Swal.fire({
            title: 'Añadir Pareja Manual',
            html: `
                <div style="text-align: left; padding: 5px 0;">
                    <label style="font-size: 11px; font-weight: 800; color: #475569; text-transform: uppercase;">Jugador 1 *</label>
                    <input id="swal-input1" class="swal2-input" placeholder="Nombre completo Jugador 1" style="font-size: 13px; margin: 4px 0 14px; width: 100%;">
                    
                    <label style="font-size: 11px; font-weight: 800; color: #475569; text-transform: uppercase;">Jugador 2 *</label>
                    <input id="swal-input2" class="swal2-input" placeholder="Nombre completo Jugador 2" style="font-size: 13px; margin: 4px 0 14px; width: 100%;">

                    <div style="margin-top: 10px; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 12px; font-weight: 800; color: #0f172a;">
                            <input type="checkbox" id="swal-is-seed" style="width: 18px; height: 18px; accent-color: #0f172a;">
                            👑 Asignar como Cabeza de Serie (Seed)
                        </label>
                        <div id="seed-num-wrapper" style="margin-top: 8px;">
                            <label style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase;">Nº de Cabeza de Serie</label>
                            <input type="number" id="swal-seed-num" class="swal2-input" min="1" max="32" placeholder="Ej: 1" style="font-size: 13px; margin-top: 4px; width: 100%;">
                        </div>
                    </div>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Guardar Inscripción',
            confirmButtonColor: '#0f172a',
            cancelButtonText: 'Cancelar',
            preConfirm: () => {
                const j1 = (document.getElementById('swal-input1') as HTMLInputElement).value;
                const j2 = (document.getElementById('swal-input2') as HTMLInputElement).value;
                const isSeed = (document.getElementById('swal-is-seed') as HTMLInputElement).checked;
                const seedNumVal = (document.getElementById('swal-seed-num') as HTMLInputElement).value;
                if (!j1 || !j2) {
                    Swal.showValidationMessage('Ambos nombres son requeridos');
                    return false;
                }
                const seedNum = isSeed && seedNumVal ? parseInt(seedNumVal, 10) : (isSeed ? 1 : null);
                return { j1, j2, isSeed, seedNum };
            }
        }).then((result) => {
            if (result.isConfirmed) {
                this.manualInscripcion = {
                    jugador1_id: 0,
                    jugador1_nombre: result.value.j1,
                    jugador2_id: 0,
                    jugador2_nombre: result.value.j2,
                    nombre_pareja: `${result.value.j1} / ${result.value.j2}`,
                    es_semilla: result.value.isSeed ? 1 : 0,
                    nro_siembra: result.value.seedNum
                };
                this.inscribirParejaManual();
            }
        });
    }

    generarCuadroDirecto() {
        if (!this.selectedCategoria) return;

        Swal.fire({
            title: '¿Generar Cuadro Eliminatorio?',
            text: 'Se generará la llave con las parejas validadas y sus cabezas de serie (1/16, Octavos, Cuartos, etc.).',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, generar cuadro',
            confirmButtonColor: '#0f172a',
            cancelButtonText: 'Cancelar'
        }).then(result => {
            if (result.isConfirmed) {
                this.clubesService.generarCuadroDirecto(this.selectedCategoria.id).subscribe({
                    next: (res) => {
                        Swal.fire({
                            title: '¡Cuadro Generado!',
                            text: res.mensaje,
                            icon: 'success',
                            confirmButtonColor: '#0f172a'
                        });
                        this.activeDetailTab = 'playoffs';
                        this.loadPlayoffs(this.selectedCategoria.id);
                    },
                    error: (err) => {
                        Swal.fire({
                            title: 'Error',
                            text: err.error?.error || 'No se pudo generar el cuadro de eliminación directa.',
                            icon: 'error',
                            confirmButtonColor: '#0f172a'
                        });
                    }
                });
            }
        });
    }

    generarGrupos() {
        if (!this.selectedCategoria) return;

        Swal.fire({
            title: '¿Generar Grupos?',
            text: 'Esto distribuirá a las parejas inscritas automáticamente.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, generar'
        }).then(result => {
            if (result.isConfirmed) {
                this.clubesService.generarGrupos(this.selectedCategoria.id).subscribe({
                    next: () => {
                        Swal.fire({
                            title: '¡Listo!',
                            text: 'Grupos generados exitosamente.',
                            icon: 'success',
                            confirmButtonColor: '#0f172a'
                        });
                        this.loadGroupData(this.selectedCategoria.id); // Refresh group data immediately
                        this.activeDetailTab = 'grupos';
                    },
                    error: (err) => {
                        Swal.fire({
                            title: 'Error',
                            text: err.error?.error || 'No se pudieron generar los grupos',
                            icon: 'error',
                            confirmButtonColor: '#0f172a'
                        });
                    }
                });
            }
        });
    }

    // ==========================================
    // NEW: AVAILABILITY GRID LOGIC
    // ==========================================

    initAvailabilityGrid() {
        if (!this.planParams.startDate || !this.planParams.endDate) {
            Swal.fire({
                title: 'Configuración Requerida',
                text: 'Define primero las fechas de inicio y fin en la pestaña de categorías o configuración.',
                icon: 'info',
                confirmButtonColor: '#0f172a'
            });
            return;
        }

        const [sy, sm, sd] = this.planParams.startDate.split('-').map(Number);
        const [ey, em, ed] = this.planParams.endDate.split('-').map(Number);
        const start = new Date(sy, sm - 1, sd);
        const end = new Date(ey, em - 1, ed);

        // Always rebuild gridDays array to ensure UI updates
        this.gridDays = [];
        let curr = new Date(start);

        while (curr <= end) {
            const y = curr.getFullYear();
            const m = String(curr.getMonth() + 1).padStart(2, '0');
            const d = String(curr.getDate()).padStart(2, '0');
            const dateKey = `${y}-${m}-${d}`;

            this.gridDays.push(dateKey);

            // Should persist existing config if available, otherwise default
            if (!this.availabilityGrid[dateKey]) {
                this.availabilityGrid[dateKey] = [...this.gridHours];
            }

            curr.setDate(curr.getDate() + 1);
        }
        console.log('Grid Days initialized:', this.gridDays);
    }

    // Drag Selection State
    isDragging = false;
    dragMode: 'enable' | 'disable' = 'enable'; // What we are doing in this drag session

    onMouseDown(dateKey: string, hour: number) {
        this.isDragging = true;

        // Determine mode based on the initial cell clicked
        const isCurrentlyEnabled = this.isHourEnabled(dateKey, hour);
        this.dragMode = isCurrentlyEnabled ? 'disable' : 'enable';

        // Apply to start cell
        this.applyDragState(dateKey, hour);
    }

    onMouseEnter(dateKey: string, hour: number) {
        if (this.isDragging) {
            this.applyDragState(dateKey, hour);
        }
    }

    onMouseUp() {
        this.isDragging = false;
        this.calculateStats(); // Recalcular balance al terminar de arrastrar/clicar
    }

    applyDragState(dateKey: string, hour: number) {
        if (!this.availabilityGrid[dateKey]) return;

        const index = this.availabilityGrid[dateKey].indexOf(hour);
        const isEnabled = index > -1;

        if (this.dragMode === 'enable' && !isEnabled) {
            this.availabilityGrid[dateKey].push(hour);
            this.availabilityGrid[dateKey].sort((a, b) => a - b);
        } else if (this.dragMode === 'disable' && isEnabled) {
            this.availabilityGrid[dateKey].splice(index, 1);
        }
    }

    toggleHour(dateKey: string, hour: number) {
        // Kept for backward compat or single click if needed, 
        // but MouseDown handles single clicks usually.
        // We can leave this empty or redirect to applyDragState 
        // if we change the template events.
    }

    isHourEnabled(dateKey: string, hour: number): boolean {
        return this.availabilityGrid[dateKey]?.includes(hour) ?? false;
    }

    // ==========================================
    // NEW: SUMMARY STATS LOGIC
    // ==========================================

    calculateStats() {
        let totalMatches = this.matchesToSchedule.length;
        let isEstimation = false;

        // Si no hay partidos generados, usamos la predicción inteligente
        if (totalMatches === 0) {
            isEstimation = true;
            this.categorias.forEach(cat => {
                // PREDICCIÓN: Si hay inscritos usa inscritos, si no, usa la capacidad máxima configurada
                const plannedInscritos = (cat.inscritos && Number(cat.inscritos) > 1) ? Number(cat.inscritos) : (Number(cat.max_parejas) || 8);
                
                if (plannedInscritos > 1) {
                    const groupSize = this.selectedTorneo?.formato_grupos || 4;
                    const numGroups = Math.ceil(plannedInscritos / groupSize);
                    const matchesPerGroup = (groupSize * (groupSize - 1)) / 2;
                    const estimatedGroupMatches = numGroups * matchesPerGroup;
                    const classified = numGroups * 2;
                    const estimatedPlayoffMatches = classified > 1 ? (classified - 1) : 0;
                    
                    totalMatches += (estimatedGroupMatches + estimatedPlayoffMatches);
                }
            });
        }

        // Estadísticas detalladas por categoría
        const catsStats = this.categorias.map(cat => {
            let matchesCount = this.matchesToSchedule.filter(m => m.categoryId === cat.id).length;
            
            if (matchesCount === 0) {
                const pIns = (cat.inscritos && Number(cat.inscritos) > 1) ? Number(cat.inscritos) : (Number(cat.max_parejas) || 8);
                const gS = this.selectedTorneo?.formato_grupos || 4;
                const nG = Math.ceil(pIns / gS);
                matchesCount = (nG * (gS * (gS - 1)) / 2) + (nG * 2 - 1);
            }

            return {
                nombre: cat.nombre,
                inscritos: Number(cat.inscritos) || 0,
                partidos: Math.round(matchesCount),
                horas: (matchesCount * (this.matchDuration || 75)) / 60
            };
        });

        let totalHoursAvailable = 0;
        this.gridDays.forEach(d => {
            const hours = (this.availabilityGrid[d] || []).length;
            totalHoursAvailable += hours;
        });

        // Prioritize selected courts or configured num_canchas
        const courtCount = (this.planParams.selectedCanchasIds && this.planParams.selectedCanchasIds.length > 0)
            ? this.planParams.selectedCanchasIds.length
            : Math.max(1, Number(this.selectedTorneo?.num_canchas) || this.clubCanchas.length || 1);
        const slotCapacity = totalHoursAvailable * courtCount;

        this.tournamentStats = {
            isEstimation: isEstimation,
            totalInscritos: this.categorias.reduce((acc, c) => acc + (Number(c.inscritos) || 0), 0),
            totalCapacidad: this.categorias.reduce((acc, c) => acc + (Number(c.max_parejas) || 0), 0),
            totalPartidosEstimados: Math.round(totalMatches),
            horasNecesarias: (totalMatches * (this.matchDuration || 75)) / 60,
            horasDisponibles: slotCapacity,
            courtCount: courtCount,
            conflictos: this.detectConflicts(),
            categorias: catsStats
        };
    }

    detectConflicts(): string[] {
        const conflicts: string[] = [];
        const matches = this.matchesToSchedule.filter(m => m.tempDate && m.tempTime);
        const duration = this.matchDuration || 75;

        for (let i = 0; i < matches.length; i++) {
            const m1 = matches[i];
            const start1 = new Date(`${m1.tempDate} ${m1.tempTime}:00`);
            const end1 = new Date(start1.getTime() + duration * 60000);

            for (let j = i + 1; j < matches.length; j++) {
                const m2 = matches[j];
                const start2 = new Date(`${m2.tempDate} ${m2.tempTime}:00`);
                const end2 = new Date(start2.getTime() + duration * 60000);

                const overlaps = start1 < end2 && end1 > start2;
                if (!overlaps) continue;

                // 1. Court Conflict
                if (m1.tempCanchaId === m2.tempCanchaId && m1.tempDate === m2.tempDate) {
                    conflicts.push(`Cancha ${m1.court || m1.tempCanchaId}: ${m1.ronda} vs ${m2.ronda} a las ${m1.tempTime}`);
                }

                // 2. Player Conflict (if real IDs exist and match)
                const p1_ids = [m1.pareja1_id, m1.pareja2_id].filter(id => id && id > 0);
                const p2_ids = [m2.pareja1_id, m2.pareja2_id].filter(id => id && id > 0);
                
                p1_ids.forEach(id => {
                    if (p2_ids.includes(id)) {
                        conflicts.push(`Pareja ${id}: Doble partido (${m1.ronda} y ${m2.ronda})`);
                    }
                });
            }
        }

        return [...new Set(conflicts)].slice(0, 10);
    }

    eliminarPareja(inscripcionId: number) {
        Swal.fire({
            title: '¿Eliminar?',
            text: 'Esta acción no se puede deshacer.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar'
        }).then(result => {
            if (result.isConfirmed) {
                this.clubesService.eliminarPareja(inscripcionId).subscribe({
                    next: () => {
                        Swal.fire({
                            title: 'Eliminado',
                            text: 'Pareja eliminada correctamente.',
                            icon: 'success',
                            confirmButtonColor: '#0f172a'
                        });
                        if (this.selectedCategoria) {
                            this.loadInscripciones(this.selectedCategoria.id);
                        } else if (this.selectedTorneo) {
                            this.loadTodasInscripciones(this.selectedTorneo.id);
                        }
                        if (this.selectedTorneo) {
                            this.loadCategorias(this.selectedTorneo.id);
                        }
                    },
                    error: (err) => {
                        Swal.fire({
                            title: 'Error',
                            text: 'No se pudo eliminar la pareja.',
                            icon: 'error',
                            confirmButtonColor: '#0f172a'
                        });
                    }
                });
            }
        });
    }
}
