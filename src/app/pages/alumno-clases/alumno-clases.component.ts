import { Component, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MysqlService } from '../../services/mysql.service';
import { EntrenamientoService } from '../../services/entrenamientos.service';
import { EvaluacionService } from '../../services/evaluacion.service';
import { AlumnoService } from '../../services/alumno.service';
import { PopupService } from '../../services/popup.service';
import { Chart, registerables } from 'chart.js';
import { forkJoin } from 'rxjs';
import Swal from 'sweetalert2';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { HttpEventType } from '@angular/common/http';

Chart.register(...registerables);

@Component({
    selector: 'app-alumno-clases',
    standalone: true,
    imports: [CommonModule, FormsModule, SidebarComponent],
    templateUrl: './alumno-clases.component.html',
    styleUrls: ['./alumno-clases.component.scss']
})
export class AlumnoClasesComponent implements OnInit {
    // Basic Info
    alumnoId: number = 0;
    userId: number = 0;
    userRole: string = 'alumno';
    alumnoNombre: string = '';
    alumnoFoto: string = '';
    coachNombre: string = '';
    get coachName(): string { return this.coachNombre; }
    alumnoProfile: any = null;
    packActual: any = null;

    // View State
    activeTab: string = 'roadmap';
    activeProgresoSubTab: string = 'graficos';
    isLoading: boolean = false;
    isVideosLoading: boolean = false;
    
    // Pedagogical Data
    historialMalla: any[] = [];
    evaluaciones: any[] = [];
    
    // Performance Data (Charts)
    radarChart: any;
    lineChart: any;
    storedRadarLabels: string[] = [];
    storedRadarData: number[] = [];
    storedTacticoLabels: string[] = [];
    storedTacticoData: number[] = [];
    storedFisicoLabels: string[] = [];
    storedFisicoData: number[] = [];
    storedMentalLabels: string[] = [];
    storedMentalData: number[] = [];
    storedLineLabels: string[] = [];
    storedLineData: number[] = [];
    detailedScores: any = null;
    hasChartData = false;
    tacticoChart: any;
    fisicoChart: any;
    mentalChart: any;

    // Comité Técnico (Golpes)
    golpes: string[] = ['Derecha', 'Reves', 'Saque', 'Globo', 'Volea de Derecha', 'Volea de Reves', 'Bandeja', 'Vibora', 'Remate', 'Rulo', 'Salida de Pared', 'Resto'];
    evaluationData: { [key: string]: any } = {};

    // Comité Táctico
    tacticas: string[] = [
        'Posicionamiento fondo', 'Posicionamiento red', 'Decisiones fondo', 'Decisiones red', 
        'Golpes aéreos', 'Intenciones fondo', 'Intenciones red',
        'Globo vs Abajo', 'Volea Bloqueo vs Plana', 'Volea Plana vs Cortada',
        'Botar globo vs Remate Def', 'Remate Def vs Bandeja/Vibora',
        'Remate Def vs Ofensivo', 'Bajada Pared vs Globo'
    ];
    tacticalData: { [key: string]: any } = {};

    evaluacionComentarios: string = '';

    // Comité Físico
    fisicos: string[] = ['Coordinacion', 'Fuerza tren inf', 'Fuerza tren sup', 'Estabilidad', 'Agilidad', 'Explosividad'];
    fisicoData: { [key: string]: any } = {};

    // Comité Mental
    mentales: string[] = ['Dialogo interno', 'Dialogo externo', 'Confianza personal', 'Puntos importantes', 'Comunicacion compañero', 'Comportamiento post'];
    mentalData: { [key: string]: any } = {};

    // Videos
    videosCoach: any[] = [];
    groupedVideos: { [category: string]: any[] } = {};
    activeVideoCategory: string = '';
    availableVideoCategories: string[] = ['Todos'];
    aiResults: { [key: number]: any } = {};
    isAnalyzing: { [key: number]: boolean } = {};

    // Administración
    availableMallas: any[] = [];
    alumnoPacks: any[] = [];
    activeEvalSubTab: 'tecnico' | 'tactico' | 'fisico' | 'mental' = 'tecnico';
    
    mallasActivas: any[] = [];
    roadmapPacks: any[] = [];
    historialPacks: any[] = [];
    selectedPack: any = null;
    sesionFichaModal: any = null;

    // Interactive Tutorial State
    showTutorial = false;
    currentTutorialStep = 0;
    tutorialTop = '0px';
    tutorialLeft = '0px';
    tutorialSteps = [
        { target: '.student-profile-header', title: '🪪 Perfil del Alumno', content: 'Aquí ves el nivel actual y el rendimiento técnico global del alumno.' },
        { target: '.tabs-row .tab-btn:nth-child(1)', title: '📍 Hoja de Ruta', content: 'En esta pestaña verás el plan de entrenamiento sesión a sesión definido por el coach.' },
        { target: '.tabs-row .tab-btn:nth-child(2)', title: '📈 Análisis y Progreso', content: '¡La parte más potente! Mapas de calor técnicos, tácticos, físicos y mentales.' },
        { target: '.tabs-row .tab-btn:nth-child(3)', title: '📊 Evaluar Técnica', content: 'Desde aquí puedes calificar el desempeño del alumno después de cada clase.' },
        { target: '.tabs-row .tab-btn:nth-child(5)', title: '💰 Gestión de Pagos', content: 'Controla qué packs ha comprado el alumno, su estado de pago y envía recordatorios si es necesario.' }
    ];

    getDayName(dayIndex: any): string {
        if (dayIndex === null || dayIndex === undefined) return '';
        const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        return days[dayIndex] || '';
    }

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private mysqlService: MysqlService,
        private entrenamientoService: EntrenamientoService,
        private evaluacionService: EvaluacionService,
        private alumnoService: AlumnoService,
        private popupService: PopupService,
        private cdr: ChangeDetectorRef,
        private http: HttpClient
    ) { 
        // INIT EVAL DATA
        this.golpes.forEach(g => {
            this.evaluationData[g] = { tecnica: 1, control: 1, direccion: 1, decision: 1, comentario: '' };
        });
        this.tacticas.forEach(t => {
            this.tacticalData[t] = { valor: 1, comentario: '' };
        });
        this.fisicos.forEach(f => {
            this.fisicoData[f] = { valor: 1, comentario: '' };
        });
        this.mentales.forEach(m => {
            this.mentalData[m] = { valor: 1, comentario: '' };
        });
    }

    ngOnInit() {
        const userStr = localStorage.getItem('currentUser');
        if (userStr) {
            const user = JSON.parse(userStr);
            this.userId = user.id || user.userId || Number(localStorage.getItem('userId')) || 0;
            this.userRole = user.rol || 'alumno';
            this.coachNombre = user.nombre || 'Entrenador';
        } else {
            this.userId = Number(localStorage.getItem('userId')) || 0;
        }

        this.route.paramMap.subscribe(params => {
            const id = params.get('id');
            if (id) {
                this.alumnoId = Number(id);
                this.loadInitialData();
                this.restoreAnalysisState();
            }
        });
    }

    private restoreAnalysisState() {
        const stored = localStorage.getItem(`analyzing_videos_${this.alumnoId}`);
        if (stored) {
            try {
                const analyzing = JSON.parse(stored);
                // Si el analisis fue hace mas de 2 horas, probablemente fallo o termino
                const now = Date.now();
                Object.keys(analyzing).forEach(vidId => {
                    if (now - analyzing[vidId] < 7200000) {
                        this.isAnalyzing[Number(vidId)] = true;
                        // Simular polling si el backend no lo notifica via sockets
                        // this.pollAnalysisStatus(Number(vidId));
                    }
                });
            } catch(e) {}
        }
    }

    loadInitialData() {
        this.loadAlumnoPerfil();
        this.loadMallaData();
        this.loadEvaluaciones();
        this.loadVideos();
        this.loadPacksAlumno();
        this.loadAvailableMallas(); 
    }

    loadAvailableMallas() {
        this.entrenamientoService.getMallas(this.userId).subscribe({
            next: (res: any) => this.availableMallas = res || []
        });
    }

    avatarErrorAttempts: number = 0;

    loadAlumnoPerfil() {
        if (!this.alumnoId) return;
        this.avatarErrorAttempts = 0;
        this.mysqlService.getPerfil(this.alumnoId).subscribe({
            next: (res: any) => {
                if (res.user) {
                    this.alumnoNombre = res.user.nombre || 'Estudiante';
                    this.alumnoProfile = res.user;
                    let foto = res.user.foto_perfil || res.user.foto || null;
                    if (foto) {
                        if (foto.startsWith('http') || foto.startsWith('assets/')) {
                            this.alumnoFoto = foto;
                        } else {
                            let clean = foto.startsWith('/') ? foto.substring(1) : foto;
                            if (!clean.includes('/')) {
                                clean = `uploads/perfiles/${clean}`;
                            }
                            if (!clean.startsWith('prd/') && !clean.startsWith('dev/')) {
                                clean = `prd/${clean}`;
                            }
                            this.alumnoFoto = `https://api.padelmanager.cl/${clean}`;
                        }
                    } else {
                        this.alumnoFoto = `https://ui-avatars.com/api/?name=${encodeURIComponent(this.alumnoNombre)}&background=ccff00&color=111&bold=true&size=256`;
                    }
                    this.packActual = res.user.pack_nombre ? { nombre: res.user.pack_nombre } : null;
                    this.cdr.detectChanges();
                }
            }
        });
    }

    onAvatarError() {
        this.avatarErrorAttempts++;
        if (this.avatarErrorAttempts === 1) {
            // Alternar entre prd y dev si el archivo está en un ambiente específico
            if (this.alumnoFoto.includes('/prd/')) {
                this.alumnoFoto = this.alumnoFoto.replace('/prd/', '/dev/');
                this.cdr.detectChanges();
                return;
            } else if (this.alumnoFoto.includes('/dev/')) {
                this.alumnoFoto = this.alumnoFoto.replace('/dev/', '/prd/');
                this.cdr.detectChanges();
                return;
            }
        }
        // Fallback elegante a avatar con iniciales en estilo Padelblox
        const name = this.alumnoNombre || 'Alumno';
        this.alumnoFoto = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=ccff00&color=111&bold=true&size=256`;
        this.cdr.detectChanges();
    }

    async loadMallaData() {
        if (!this.alumnoId) return;
        this.isLoading = true;

        const currentCoachId = (this.userRole === 'entrenador') ? this.userId : undefined;

        // Fetch all active meshes and all of the student's packs
        forkJoin({
            mallas: this.entrenamientoService.getMallasAlumno(this.alumnoId, currentCoachId),
            packs: this.entrenamientoService.getPacksAlumno(this.alumnoId, currentCoachId)
        }).subscribe({
            next: (res: any) => {
                this.mallasActivas = res.mallas || [];
                const allPacks = (res.packs.data || res.packs || []);
                
                // Map packs to include their active mesh if it exists
                const mappedPacks = allPacks.map((p: any) => {
                    const packId = p.pack_id || p.id;
                    const packName = p.pack_nombre || p.nombre || 'Pack';
                    const tipo = p.tipo || 'individual';

                    let mesh = this.mallasActivas.find(m => m.pack_id == packId);
                    if (!mesh && this.mallasActivas.length > 0) {
                        mesh = this.mallasActivas.find(m => m.entrenador_id == p.entrenador_id && (m.pack_id == 0 || !m.pack_id));
                    }
                    
                    return { ...p, id: packId, nombre: packName, type: tipo, activeMesh: mesh };
                });

                // Add any active mesh assigned to the student that wasn't in allPacks (cross-coach or catalog overrides)
                this.mallasActivas.forEach((mesh: any) => {
                    const exists = mappedPacks.some((p: any) => 
                        (p.activeMesh && p.activeMesh.seguimiento_id === mesh.seguimiento_id) ||
                        (p.activeMesh && p.activeMesh.malla_id === mesh.malla_id && p.id == mesh.pack_id)
                    );
                    if (!exists) {
                        mappedPacks.unshift({
                            id: mesh.pack_id || 0,
                            nombre: mesh.pack_nombre || mesh.malla_nombre || 'Plan Activo',
                            type: 'individual',
                            activeMesh: mesh,
                            sesiones_totales: 4,
                            sesiones_pasadas: 0
                        });
                    }
                });

                // FILTER: Only Individual/Multiplayer
                const roadmapEligible = mappedPacks.filter((p: any) => p.type !== 'grupal' && p.type !== 'pack_grupal' && p.type !== 'clase grupal');

                // Sort: Prioritize packs with active meshes, newest first
                roadmapEligible.sort((a: any, b: any) => {
                    const timeA = a.activeMesh?.fecha_inicio ? new Date(a.activeMesh.fecha_inicio).getTime() : 0;
                    const timeB = b.activeMesh?.fecha_inicio ? new Date(b.activeMesh.fecha_inicio).getTime() : 0;
                    return timeB - timeA;
                });

                // ROADMAP: Display all plans with an active mesh or available sessions
                this.roadmapPacks = roadmapEligible.filter((p: any) => p.activeMesh || p.sesiones_pasadas < p.sesiones_totales);
                this.historialPacks = roadmapEligible.filter((p: any) => !p.activeMesh && p.sesiones_pasadas >= p.sesiones_totales);

                if (this.roadmapPacks.length > 0) {
                    this.seleccionarPackRoadmap(this.roadmapPacks[0]);
                } else if (this.historialPacks.length > 0) {
                    this.seleccionarPackRoadmap(this.historialPacks[0]);
                } else {
                    this.historialMalla = [];
                    this.isLoading = false;
                }
            },
            error: () => this.isLoading = false
        });
    }

    seleccionarPackRoadmap(pack: any) {
        this.selectedPack = pack;
        
        if (pack.activeMesh) {
            this.isLoading = true;
            const mallaId = Number(pack.activeMesh.malla_id || 0);
            this.entrenamientoService.getHistorialMalla(this.alumnoId, pack.activeMesh.entrenador_id, pack.id, mallaId).subscribe({
                next: (res: any) => {
                    this.historialMalla = Array.isArray(res) ? res : [];
                    this.isLoading = false;
                    this.cdr.detectChanges();
                },
                error: () => this.isLoading = false
            });
        } else {
            this.historialMalla = [];
            this.isLoading = false;
            this.cdr.detectChanges();
        }
    }

    getSesionesAgendadasCount(): number {
        return (this.historialMalla || []).filter(s => s.estado_asistencia === 'proxima' || s.fecha).length;
    }

    getSesionesCompletadasCount(): number {
        return (this.historialMalla || []).filter(s => s.estado_asistencia === 'completada').length;
    }

    getProgresoRoadmap(): number {
        if (!this.historialMalla || this.historialMalla.length === 0) return 0;
        const done = this.getSesionesCompletadasCount();
        const scheduled = this.getSesionesAgendadasCount();
        const progress = Math.round(((done + scheduled * 0.5) / this.historialMalla.length) * 100);
        return Math.min(100, Math.max(0, progress));
    }

    irAAgendarSesion(sesion?: any) {
        const queryParams: any = {
            alumnoId: this.alumnoId
        };
        if (this.selectedPack?.activeMesh?.malla_id) {
            queryParams.mallaId = this.selectedPack.activeMesh.malla_id;
        }
        if (sesion?.id) {
            queryParams.claseId = sesion.id;
        }
        this.router.navigate(['/entrenador-agendar'], { queryParams });
    }

    getTotalHistorialSesiones(): number {
        if (!this.historialPacks || this.historialPacks.length === 0) return 0;
        return this.historialPacks.reduce((acc: number, p: any) => {
            const total = Number(p.sesiones_totales) || Number(p.sesiones_pasadas) || 0;
            return acc + total;
        }, 0);
    }

    loadEvaluaciones() {
        if (!this.alumnoId) return;
        
        // Per requirement: Coaches should only see evaluations they have performed, 
        // to track their specific technical progress with the student.
        const currentCoachId = (this.userRole === 'entrenador') ? this.userId : undefined; 
        
        this.evaluacionService.getEvaluaciones(this.alumnoId, currentCoachId).subscribe({
            next: (res: any) => {
                const list = (res || []).filter((e:any) => e.scores);
                this.evaluaciones = list;
                if (list.length > 0) {
                    this.processPerformanceCharts(list);
                    this.prepopulateEvaluationData(list[0]);
                }
            }
        });
    }

    prepopulateEvaluationData(lastEval: any) {
        if (!lastEval || !lastEval.scores) return;
        try {
            const scoresRaw = typeof lastEval.scores === 'string' ? JSON.parse(lastEval.scores) : lastEval.scores;
            
            // Handle nested (Physical/Mental/etc) or flat (legacy) format
            const tecnico = scoresRaw.tecnico || scoresRaw;
            const tactico = scoresRaw.tactico || {};
            const fisico = scoresRaw.fisico || {};
            const mental = scoresRaw.mental || {};

            // Técnico
            Object.keys(tecnico).forEach(golpe => {
                if (this.evaluationData[golpe]) {
                    this.evaluationData[golpe] = { ...tecnico[golpe], comentario: '' };
                }
            });

            // Táctico
            Object.keys(tactico).forEach(tactica => {
                if (this.tacticalData[tactica]) {
                    this.tacticalData[tactica] = { ...tactico[tactica], comentario: '' };
                }
            });

            // Físico
            Object.keys(fisico).forEach(f => {
                if (this.fisicoData[f]) {
                    this.fisicoData[f] = { ...fisico[f], comentario: '' };
                }
            });

            // Mental
            Object.keys(mental).forEach(m => {
                if (this.mentalData[m]) {
                    this.mentalData[m] = { ...mental[m], comentario: '' };
                }
            });

            this.cdr.detectChanges();
        } catch(e) { console.error("Error pre-populating:", e); }
    }

    processPerformanceCharts(evals: any[]) {
        if (!evals || evals.length === 0) return;
        const last = evals[0];
        try {
            const raw = typeof last.scores === 'string' ? JSON.parse(last.scores) : last.scores;
            
            // Handle nested (New) or flat (Legacy) format
            const tecnico = raw.tecnico || raw;
            const tactico = raw.tactico || {};
            const fisico = raw.fisico || {};
            const mental = raw.mental || {};

            // 1. RADAR TÉCNICO (Golpes)
            this.storedRadarLabels = Object.keys(tecnico).filter(k => typeof tecnico[k] === 'object');
            if (this.storedRadarLabels.length === 0) this.storedRadarLabels = this.golpes;
            
            this.storedRadarData = this.storedRadarLabels.map(l => {
                const g = tecnico[l];
                if (!g) return 0;
                // Average of technical metrics
                const vals = [g.tecnica, g.control, g.direccion, g.decision].map(v => Number(v) || 0);
                return vals.reduce((a, b) => a + b, 0) / 4;
            });

            // 2. RADARS EXTRA (New Categories)
            this.storedTacticoLabels = Object.keys(tactico).length > 0 ? Object.keys(tactico) : this.tacticas;
            this.storedTacticoData = this.storedTacticoLabels.map(l => Number(tactico[l]?.valor || 0));

            this.storedFisicoLabels = Object.keys(fisico).length > 0 ? Object.keys(fisico) : this.fisicos;
            this.storedFisicoData = this.storedFisicoLabels.map(l => Number(fisico[l]?.valor || 0));

            this.storedMentalLabels = Object.keys(mental).length > 0 ? Object.keys(mental) : this.mentales;
            this.storedMentalData = this.storedMentalLabels.map(l => Number(mental[l]?.valor || 0));

            // 3. EVOLUCIÓN LINEAL (General Average over time)
            this.storedLineLabels = evals.slice().reverse().map((e, idx) => {
               const date = new Date(e.fecha);
               // AND p.fecha BETWEEN ? AND ?
               return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
            });

            this.storedLineData = evals.slice().reverse().map(e => {
                const n = typeof e.scores === 'string' ? JSON.parse(e.scores) : e.scores;
                const sTec = n.tecnico || n;
                const hits = Object.values(sTec).filter(v => typeof v === 'object');
                if (hits.length === 0) return Number(e.promedio_general) || 0;
                
                const hitAverages = hits.map((g: any) => {
                    return (Number(g.tecnica || 0) + Number(g.control || 0) + Number(g.direccion || 0) + Number(g.decision || 0)) / 4;
                });
                return hitAverages.reduce((a, b) => a + b, 0) / hitAverages.length;
            });

            this.hasChartData = true;
            this.cdr.detectChanges();
            
            // Force re-render if we are in progress tab
            if (this.activeTab === 'progreso') {
                setTimeout(() => this.renderCharts(), 200);
            }
        } catch(e) {
            console.error("Error processing charts:", e);
        }
    }

    loadVideos() {
        if (!this.alumnoId || !this.userId) return;
        this.isVideosLoading = true;
        this.alumnoService.getVideos(this.alumnoId, this.userId).subscribe({
            next: (vids) => {
                const processed = (vids || []).filter((v:any) => v.entrenador_id && Number(v.entrenador_id) === this.userId || this.userRole === 'alumno').map((v:any) => {
                    if (v.video_url && !v.video_url.startsWith('http')) {
                        v.video_url = `https://api.padelmanager.cl/${v.video_url.startsWith('/') ? v.video_url.substring(1) : v.video_url}`;
                    }
                    if (v.ai_report) {
                        try { 
                            this.aiResults[v.id] = typeof v.ai_report === 'string' ? JSON.parse(v.ai_report) : v.ai_report; 
                            // Si tiene reporte, ya no se esta analizando
                            if (this.isAnalyzing[v.id]) {
                                delete this.isAnalyzing[v.id];
                                this.saveAnalysisState();
                            }
                        } catch(e){}
                    }
                    return { ...v, categoria: v.categoria || 'General' };
                });

                this.videosCoach = processed;
                this.groupedVideos = {};
                const cats = new Set<string>();
                processed.forEach((v:any) => {
                    const c = v.categoria || 'General';
                    cats.add(c);
                    if (!this.groupedVideos[c]) this.groupedVideos[c] = [];
                    this.groupedVideos[c].push(v);
                });
                this.availableVideoCategories = Array.from(cats);
                
                if (this.availableVideoCategories.length > 0 && !this.availableVideoCategories.includes(this.activeVideoCategory)) {
                    this.activeVideoCategory = this.availableVideoCategories[0];
                }
                this.isVideosLoading = false;
                this.cdr.detectChanges();
            },
            error: () => {
                this.isVideosLoading = false;
                this.cdr.detectChanges();
            }
        });
    }

    private saveAnalysisState() {
        const analyzing: any = {};
        Object.keys(this.isAnalyzing).forEach(id => {
            if (this.isAnalyzing[Number(id)]) {
                analyzing[id] = Date.now();
            }
        });
        localStorage.setItem(`analyzing_videos_${this.alumnoId}`, JSON.stringify(analyzing));
    }

    get filteredVideos() {
        if (!this.activeVideoCategory) return this.videosCoach;
        return this.groupedVideos[this.activeVideoCategory] || [];
    }

    packsGrupales: any[] = [];
    packsIndividuales: any[] = [];
    activePacksSubTab: 'grupales' | 'individuales' = 'individuales';

    // Grouping for Grupales
    groupedPacksGrupales: { [key: string]: any[] } = {};
    grupalPeriodKeys: string[] = [];
    activeGrupalPeriod: string = '';

    loadPacksAlumno() {
        if (!this.alumnoId) return;
        const currentCoachId = (this.userRole === 'entrenador') ? this.userId : undefined;
        
        this.entrenamientoService.getPacksAlumno(this.alumnoId, currentCoachId).subscribe({
            next: (res: any) => {
                const allPacks = res.data ? res.data : (Array.isArray(res) ? res : []);
                this.alumnoPacks = allPacks;
                
                // Grouping logic
                this.packsGrupales = allPacks.filter((p: any) => p.tipo === 'grupal');
                this.packsIndividuales = allPacks.filter((p: any) => p.tipo !== 'grupal');

                // Advanced Grouping for Grupales (By Month/Year)
                this.groupedPacksGrupales = {};
                const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
                
                this.packsGrupales.forEach(p => {
                    const date = new Date(p.fecha_inicio);
                    const key = `${months[date.getMonth()]} ${date.getFullYear()}`;
                    if (!this.groupedPacksGrupales[key]) this.groupedPacksGrupales[key] = [];
                    this.groupedPacksGrupales[key].push(p);
                });

                // Sort keys chronologically (newest first)
                this.grupalPeriodKeys = Object.keys(this.groupedPacksGrupales).sort((a, b) => {
                    const [ma, ya] = a.split(' ');
                    const [mb, yb] = b.split(' ');
                    const da = new Date(Number(ya), months.indexOf(ma));
                    const db = new Date(Number(yb), months.indexOf(mb));
                    return db.getTime() - da.getTime();
                });

                if (this.grupalPeriodKeys.length > 0 && !this.activeGrupalPeriod) {
                    this.activeGrupalPeriod = this.grupalPeriodKeys[0];
                }

                // Auto-switch to groups only if no individuals available
                if (this.packsIndividuales.length === 0 && this.packsGrupales.length > 0) {
                    this.activePacksSubTab = 'grupales';
                }
                
                this.cdr.detectChanges();
            }
        });
    }

    marcarPagado(p: any) {
        if (!p || !p.pack_jugador_id) return;
        
        const payload = {
            pack_jugador_id: p.pack_jugador_id,
            precio_pagado: p.precio_pagado || 0,
            metodo_pago: 'Transferencia'
        };

        this.isLoading = true;
        this.entrenamientoService.marcarPackPagado(payload).subscribe({
            next: () => {
                this.isLoading = false;
                this.popupService.success('Pago Confirmado', 'El pack ha sido marcado como PAGADO correctamente.');
                this.loadPacksAlumno();
            },
            error: () => {
                this.isLoading = false;
                this.popupService.error('Error', 'No se pudo actualizar el estado de pago.');
            }
        });
    }

    enviarRecordatorioPago(p: any) {
        if (!p || !p.pack_jugador_id || !this.alumnoId) return;

        const payload = {
            pack_jugador_id: p.pack_jugador_id,
            jugador_id: this.alumnoId
        };

        this.isLoading = true;
        this.entrenamientoService.enviarRecordatorioPago(payload).subscribe({
            next: (res: any) => {
                this.isLoading = false;
                this.popupService.success('Recordatorio Enviado', res.message || 'El alumno ha sido notificado.');
                this.cdr.detectChanges();
            },
            error: () => {
                this.isLoading = false;
                this.popupService.error('Error', 'No se pudo enviar el aviso. Verifique que el alumno tenga email.');
                this.cdr.detectChanges();
            }
        });
    }

    // --- 🛠 SHARED ACTIONS ---

    setTab(t: string) {
        this.activeTab = t;
        if (t === 'historial') {
            if (this.historialPacks && this.historialPacks.length > 0) {
                const isCurrentInHistorial = this.historialPacks.some((p: any) => p.id === this.selectedPack?.id);
                if (!isCurrentInHistorial) {
                    this.seleccionarPackRoadmap(this.historialPacks[0]);
                }
            }
        } else if (t === 'roadmap') {
            if (this.roadmapPacks && this.roadmapPacks.length > 0) {
                const isCurrentInRoadmap = this.roadmapPacks.some((p: any) => p.id === this.selectedPack?.id);
                if (!isCurrentInRoadmap) {
                    this.seleccionarPackRoadmap(this.roadmapPacks[0]);
                }
            }
        }
        this.cdr.detectChanges();
        if (t === 'progreso') {
            setTimeout(() => {
                this.renderCharts();
                this.cdr.detectChanges();
            }, 300);
        }
    }

    volverAlumnos() {
        this.router.navigate(['/alumnos']);
    }

    actualizarNivel(event: any) {
        const nuevoNivel = event.target.value;
        if (!this.alumnoId || !nuevoNivel) return;
        this.isLoading = true;
        this.mysqlService.updatePerfil(this.alumnoId, { categoria: nuevoNivel, nivel: nuevoNivel }).subscribe({
            next: () => {
                if (this.alumnoProfile) this.alumnoProfile.categoria = nuevoNivel;
                this.popupService.success('Categoría Actualizada', `El nivel oficial de ${this.alumnoNombre} ahora es ${nuevoNivel}`);
                this.loadAlumnoPerfil();
                this.isLoading = false;
                this.cdr.detectChanges();
            },
            error: () => {
                this.isLoading = false;
                this.popupService.error('Error', 'No se pudo guardar la categoría oficial.');
            }
        });
    }

    renderCharts() {
        if (!this.hasChartData) return;
        
        const rCtx = document.getElementById('webRadarChart') as HTMLCanvasElement;
        if (rCtx) {
            if (this.radarChart) this.radarChart.destroy();
            this.radarChart = new Chart(rCtx, {
                type: 'radar',
                data: {
                    labels: this.storedRadarLabels,
                    datasets: [{
                        label: 'Fuerza Técnica',
                        data: this.storedRadarData,
                        borderColor: '#ccff00',
                        backgroundColor: 'rgba(204, 255, 0, 0.05)',
                        pointBackgroundColor: '#111',
                        pointBorderColor: '#ccff00',
                        pointBorderWidth: 2,
                        pointRadius: 5,
                        pointHoverRadius: 8,
                        borderWidth: 2,
                        fill: true,
                        tension: 0.1
                    }]
                },
                options: { 
                    responsive: true, 
                    maintainAspectRatio: false,
                    plugins: { 
                        legend: { display: false },
                        tooltip: { backgroundColor: '#111', titleFont: { size: 14, weight: 'bold' }, padding: 12, cornerRadius: 10 }
                    },
                    scales: { 
                        r: { 
                            min: 0, max: 10,
                            ticks: { display: false },
                            grid: { color: 'rgba(0,0,0,0.03)', lineWidth: 1 },
                            angleLines: { color: 'rgba(0,0,0,0.03)' },
                            pointLabels: { font: { size: 11, weight: 900 }, color: '#111' }
                        } 
                    } 
                }
            });
        }

        const tCtx = document.getElementById('webTacticoChart') as HTMLCanvasElement;
        if (tCtx) {
            if (this.tacticoChart) this.tacticoChart.destroy();
            this.tacticoChart = new Chart(tCtx, {
                type: 'radar',
                data: {
                    labels: this.storedTacticoLabels,
                    datasets: [{
                        label: 'Fuerza Táctica',
                        data: this.storedTacticoData,
                        borderColor: '#00f2ff',
                        backgroundColor: 'rgba(0, 242, 255, 0.05)',
                        pointBackgroundColor: '#111',
                        pointBorderColor: '#00f2ff',
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { r: { min: 0, max: 10, ticks: { display: false }, grid: { color: 'rgba(0,0,0,0.03)' }, angleLines: { color: 'rgba(0,0,0,0.03)' }, pointLabels: { font: { size: 10, weight: 700 } } } }
                }
            });
        }

        const fCtx = document.getElementById('webFisicoChart') as HTMLCanvasElement;
        if (fCtx) {
            if (this.fisicoChart) this.fisicoChart.destroy();
            this.fisicoChart = new Chart(fCtx, {
                type: 'radar',
                data: {
                    labels: this.storedFisicoLabels,
                    datasets: [{
                        label: 'Fuerza Física',
                        data: this.storedFisicoData,
                        borderColor: '#ff4757',
                        backgroundColor: 'rgba(255, 71, 87, 0.05)',
                        pointBackgroundColor: '#111',
                        pointBorderColor: '#ff4757',
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { r: { min: 0, max: 10, ticks: { display: false }, grid: { color: 'rgba(0,0,0,0.03)' }, angleLines: { color: 'rgba(0,0,0,0.03)' }, pointLabels: { font: { size: 10, weight: 700 } } } }
                }
            });
        }

        const mCtx = document.getElementById('webMentalChart') as HTMLCanvasElement;
        if (mCtx) {
            if (this.mentalChart) this.mentalChart.destroy();
            this.mentalChart = new Chart(mCtx, {
                type: 'radar',
                data: {
                    labels: this.storedMentalLabels,
                    datasets: [{
                        label: 'Fuerza Mental',
                        data: this.storedMentalData,
                        borderColor: '#2ed573',
                        backgroundColor: 'rgba(46, 213, 115, 0.05)',
                        pointBackgroundColor: '#111',
                        pointBorderColor: '#2ed573',
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { r: { min: 0, max: 10, ticks: { display: false }, grid: { color: 'rgba(0,0,0,0.03)' }, angleLines: { color: 'rgba(0,0,0,0.03)' }, pointLabels: { font: { size: 10, weight: 700 } } } }
                }
            });
        }

        const lCtx = document.getElementById('webLineChart') as HTMLCanvasElement;
        if (lCtx) {
            if (this.lineChart) this.lineChart.destroy();
            this.lineChart = new Chart(lCtx, {
                type: 'line',
                data: {
                    labels: this.storedLineLabels,
                    datasets: [{
                        label: 'Evolución',
                        data: this.storedLineData,
                        borderColor: '#ccff00',
                        backgroundColor: 'rgba(204, 255, 0, 0.05)',
                        borderWidth: 3,
                        pointBackgroundColor: '#111',
                        pointBorderColor: '#ccff00',
                        pointBorderWidth: 2,
                        pointRadius: 6,
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: { 
                    responsive: true, 
                    maintainAspectRatio: false,
                    plugins: { 
                        legend: { display: false },
                        tooltip: { backgroundColor: '#111', padding: 12, cornerRadius: 10 }
                    },
                    scales: { 
                        y: { 
                            min: 0, max: 10,
                            grid: { display: false },
                            border: { display: false },
                            ticks: { font: { weight: 800 }, color: '#94a3b8' }
                        },
                        x: {
                            grid: { display: false },
                            border: { display: false },
                            ticks: { font: { weight: 800 }, color: '#94a3b8' }
                        }
                    } 
                }
            });
        }
    }

    abrirPanelDetalle(sesion: any) {
        this.sesionFichaModal = sesion;
    }

    cerrarFichaModal(event?: any) {
        if (event && event.target !== event.currentTarget) return;
        this.sesionFichaModal = null;
    }

    @HostListener('document:keydown.escape', ['$event'])
    onEscapeKey(event: KeyboardEvent) {
        if (this.sesionFichaModal) {
            this.cerrarFichaModal();
        }
    }

    getObjetivosArray(sesion: any): string[] {
        if (!sesion) return [];
        let list: string[] = [];
        if (Array.isArray(sesion.lista_objetivos) && sesion.lista_objetivos.length > 0) {
            list = sesion.lista_objetivos
                .map((o: any) => typeof o === 'string' ? o.trim() : String(o))
                .filter((o: string) => o.length > 0);
        } else if (sesion.objetivo && typeof sesion.objetivo === 'string') {
            try {
                const parsed = JSON.parse(sesion.objetivo);
                if (Array.isArray(parsed)) {
                    list = parsed
                        .map((o: any) => typeof o === 'string' ? o.trim() : String(o))
                        .filter((o: string) => o.length > 0);
                }
            } catch (e) {}
            if (list.length === 0 && sesion.objetivo.trim()) {
                list = [sesion.objetivo.trim()];
            }
        }
        
        // Filter out redundant title matches (e.g. if objetivo is literally "Clase 1" which equals titulo "Clase 1")
        const filtered = list.filter(o => o.toLowerCase() !== (sesion.titulo || '').toLowerCase().trim());
        if (filtered.length > 0) return filtered;

        // Smart athletic default objectives
        return [
            'Dominio técnico y ajuste biomecánico del gesto de golpeo.',
            'Lectura de trayectorias, control de bola y posicionamiento táctico en pista.',
            'Transferencia a situaciones reales de juego y toma de decisiones.'
        ];
    }

    getCalentamientoText(sesion: any): string {
        return sesion?.calentamiento || 'Activación cardiovascular, movilidad articular de tren superior e inferior, y desplazamientos en pista con bola.';
    }

    getTecnicaText(sesion: any): string {
        return sesion?.parte_tecnica || 'Corrección de empuñadura, preparación temprana, punto de impacto delante del cuerpo y control direccional.';
    }

    getDrillsText(sesion: any): string {
        return sesion?.drills || 'Series progresivas con canasto, patrones de juego repetitivos y trabajo bajo presión táctica.';
    }

    getJuegoText(sesion: any): string {
        return sesion?.juego || 'Puntos condicionados con consignas tácticas para consolidar los contenidos en situación real de partido.';
    }

    getEstadoLabel(estado: string, fecha?: string): string {
        if (estado === 'completada' || estado === 'asistio') return 'Completada';
        if (fecha || estado === 'proxima') return 'Agendada';
        return 'Pendiente de Agendar';
    }

    getSesionIndex(sesion: any): number {
        if (!sesion || !this.historialMalla) return 0;
        const idx = this.historialMalla.findIndex((s: any) => s.id === sesion.id || s.clase_malla_id === sesion.clase_malla_id);
        return idx >= 0 ? idx : 0;
    }

    copiarResumenFicha() {
        if (!this.sesionFichaModal) return;
        const s = this.sesionFichaModal;
        const meshName = this.selectedPack?.activeMesh?.malla_nombre || 'Plan Pedagógico';
        const objs = this.getObjetivosArray(s).map(o => `  • ${o}`).join('\n');
        
        let msg = `🎾 *PADELBLOX - FICHA TÉCNICA DE SESIÓN*\n`;
        msg += `📋 *${s.titulo}* (Sesión ${s.orden || (this.getSesionIndex(s) + 1)})\n`;
        msg += `🎯 *Plan:* ${meshName} (${this.selectedPack?.activeMesh?.nivel || 'Intermedio'})\n`;
        if (s.fecha) {
            msg += `🗓️ *Fecha:* ${s.fecha} ${s.hora ? '@ ' + s.hora.slice(0,5) + ' hrs' : ''}\n`;
        }
        if (this.coachNombre) {
            msg += `👤 *Entrenador:* ${this.coachNombre}\n`;
        }
        if (objs) {
            msg += `\n🎯 *Objetivos Pedagógicos:*\n${objs}\n`;
        }
        msg += `\n🔥 *1. Activación (10-15\'):* ${this.getCalentamientoText(s)}\n`;
        msg += `🎾 *2. Técnica (20\'):* ${this.getTecnicaText(s)}\n`;
        msg += `⚡ *3. Drills & Pista (20-25\'):* ${this.getDrillsText(s)}\n`;
        msg += `🏆 *4. Puntos Condicionados (15\'):* ${this.getJuegoText(s)}\n`;

        if (navigator.clipboard) {
            navigator.clipboard.writeText(msg).then(() => {
                this.popupService.success('¡Copiado!', 'Ficha técnica copiada al portapapeles para WhatsApp.');
            }).catch(() => {
                this.popupService.info('Ficha Técnica', 'Resumen preparado para compartir.');
            });
        }
    }

    imprimirFichaModal() {
        window.print();
    }

    irAAgendarDesdeFicha(sesion: any) {
        this.cerrarFichaModal();
        this.irAAgendarSesion(sesion);
    }

    verDetalleGolpe(label: string) {
        if (this.detailedScores && this.detailedScores[label]) {
            const s = this.detailedScores[label];
            const msg = `Técnica: ${s.tecnica} | Control: ${s.control} | Dirección: ${s.direccion} | Decisión: ${s.decision}`;
            this.popupService.info(`Detalle: ${label}`, msg);
        }
    }

    async triggerVideoUpload() {
        if (!this.alumnoId) return;
        
        const categories = ['General', ...this.golpes];
        
        Swal.fire({
            title: 'Subir Video de Entrenamiento',
            html: `
            <div style="text-align: left; font-family: 'Inter', sans-serif;">
                <p style="margin-bottom: 20px; color: #666; font-size: 14px;">Ingresa los detalles técnicos antes de seleccionar el video.</p>
                <label style="display: block; margin-bottom: 8px; font-weight: bold; font-size: 14px; color: #111;">Título del Clip</label>
                <input id="swal-input-title" class="swal2-input" style="margin: 0 0 20px 0; width: 100%; box-sizing: border-box; border-radius: 8px; height: 45px;" placeholder="Ej: Análisis de Saque">
                <label style="display: block; margin-bottom: 8px; font-weight: bold; font-size: 14px; color: #111;">¿A qué golpe corresponde?</label>
                <select id="swal-input-category" class="swal2-select" style="margin: 0 0 20px 0; width: 100%; box-sizing: border-box; display: block; border-radius: 8px; background: #f8fafc; height: 45px;">
                    ${categories.map(g => `<option value="${g}">${g}</option>`).join('')}
                </select>
                <label style="display: block; margin-bottom: 8px; font-weight: bold; font-size: 14px; color: #111;">Observaciones para el Alumno</label>
                <textarea id="swal-input-comment" class="swal2-textarea" style="margin: 0; width: 100%; box-sizing: border-box; border-radius: 8px; min-height: 100px;" placeholder="Detalles técnicos a mejorar..."></textarea>
            </div>
          `,
            showCancelButton: true,
            confirmButtonText: 'Seleccionar Video',
            confirmButtonColor: '#ccff00',
            cancelButtonColor: '#ff4b5c',
            cancelButtonText: 'Cancelar',
            preConfirm: () => {
                const titulo = (document.getElementById('swal-input-title') as HTMLInputElement).value;
                const categoria = (document.getElementById('swal-input-category') as HTMLSelectElement).value;
                const comentario = (document.getElementById('swal-input-comment') as HTMLTextAreaElement).value;
                if (!titulo) { Swal.showValidationMessage('El título es obligatorio'); return false; }
                return { titulo, categoria, comentario };
            }
        }).then((result) => {
            if (result.isConfirmed) {
                const fileInput = document.createElement('input');
                fileInput.type = 'file';
                fileInput.accept = 'video/*';
                fileInput.onchange = (e: any) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    
                    // Show initial loading swal
                    Swal.fire({
                        title: 'Subiendo Video...',
                        html: 'Iniciando transferencia...',
                        allowOutsideClick: false,
                        didOpen: () => {
                            Swal.showLoading();
                        }
                    });
                    
                    this.ejecutarSubida(file, result.value.titulo, result.value.categoria, result.value.comentario);
                };
                fileInput.click();
            }
        });
    }

    private ejecutarSubida(file: File, title: string, category: string, comment: string) {
        const formData = new FormData();
        formData.append('video', file);
        formData.append('jugador_id', this.alumnoId.toString());
        formData.append('entrenador_id', this.userId.toString());
        formData.append('titulo', title);
        formData.append('categoria', category);
        formData.append('comentario', comment || '');

        this.isLoading = true;
        this.alumnoService.uploadVideo(formData).subscribe({
            next: (event: any) => {
                if (event.type === HttpEventType.UploadProgress) {
                    const percentDone = Math.round(100 * event.loaded / event.total);
                    Swal.update({
                        title: 'Subiendo Video...',
                        html: `Progreso: <b>${percentDone}%</b>`,
                    });
                } else if (event.type === HttpEventType.Response) {
                    this.isLoading = false;
                    Swal.close();
                    this.popupService.success('¡Éxito!', 'Video subido correctamente.');
                    this.loadVideos();
                }
            },
            error: (err) => {
                this.isLoading = false;
                Swal.close();
                console.error(err);
                this.popupService.error('Error', 'No se pudo subir el video.');
            }
        });
    }

    confirmDeleteVideo(video: any) {
        Swal.fire({
            title: '¿Eliminar video?',
            text: 'Esta acción no se puede deshacer.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ff4b5c',
            cancelButtonColor: '#cccccc',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                this.isLoading = true;
                this.alumnoService.deleteVideo(video.id).subscribe({
                    next: () => {
                        this.isLoading = false;
                        this.popupService.success('Eliminado', 'El video ha sido eliminado.');
                        this.loadVideos();
                    },
                    error: (err) => {
                        this.isLoading = false;
                        this.popupService.error('Error', 'No se pudo eliminar el video.');
                    }
                });
            }
        });
    }

    // --- 🛠 COACH METHODS ---

    asignarMalla(mallaId: any) {
        if (!mallaId || !this.alumnoId) {
            this.popupService.error('Error', 'Debes seleccionar un plan de entrenamiento.');
            return;
        }

        const data = {
            jugador_id: this.alumnoId,
            malla_id: Number(mallaId),
            entrenador_id: this.userId
        };

        this.isLoading = true;
        this.entrenamientoService.asignarMalla(data).subscribe({
            next: () => {
                this.isLoading = false;
                this.loadMallaData();
                this.popupService.success('Plan Iniciado', 'Plan de Entrenamiento iniciado con éxito.');
            },
            error: (err) => {
                this.isLoading = false;
                console.error('Error asignando malla:', err);
                this.popupService.error('Error', 'No se pudo asignar el plan. Verifique la conexión.');
            }
        });
    }

    setAllEvaluationScores(score: number, event?: Event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        this.golpes.forEach(g => {
            if (this.evaluationData[g]) {
                this.evaluationData[g].tecnica = score;
                this.evaluationData[g].control = score;
                this.evaluationData[g].direccion = score;
                this.evaluationData[g].decision = score;
            }
        });
        this.cdr.detectChanges();
    }

    updateEvaluationScore(golpe: string, metric: string, delta: number, event?: Event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        if (!this.evaluationData[golpe]) {
            this.evaluationData[golpe] = { tecnica: 1, control: 1, direccion: 1, decision: 1, comentario: '' };
        }
        let val = (this.evaluationData[golpe][metric] || 0) + delta;
        if (val < 1) val = 1;
        if (val > 10) val = 10;
        this.evaluationData[golpe][metric] = val;
        this.cdr.detectChanges();
    }

    getGolpePromedio(golpe: string): number {
        const d = this.evaluationData[golpe];
        if (!d) return 0;
        return ((d.tecnica || 0) + (d.control || 0) + (d.direccion || 0) + (d.decision || 0)) / 4;
    }

    updateTacticoScore(tactica: string, delta: number, event?: Event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        if (!this.tacticalData[tactica]) {
            this.tacticalData[tactica] = { valor: 1, comentario: '' };
        }
        let val = (this.tacticalData[tactica].valor || 0) + delta;
        if (val < 1) val = 1;
        if (val > 10) val = 10;
        this.tacticalData[tactica].valor = val;
        this.cdr.detectChanges();
    }

    updateFisicoScore(ref: string, delta: number, event?: Event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        if (!this.fisicoData[ref]) {
            this.fisicoData[ref] = { valor: 1, comentario: '' };
        }
        let val = (this.fisicoData[ref].valor || 0) + delta;
        if (val < 1) val = 1;
        if (val > 10) val = 10;
        this.fisicoData[ref].valor = val;
        this.cdr.detectChanges();
    }

    updateMentalScore(ref: string, delta: number, event?: Event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        if (!this.mentalData[ref]) {
            this.mentalData[ref] = { valor: 1, comentario: '' };
        }
        let val = (this.mentalData[ref].valor || 0) + delta;
        if (val < 1) val = 1;
        if (val > 10) val = 10;
        this.mentalData[ref].valor = val;
        this.cdr.detectChanges();
    }

    guardarEvaluacion() {
        if (!this.userId) {
            this.userId = Number(localStorage.getItem('userId')) || 0;
        }

        if (!this.alumnoId || !this.userId) {
            this.popupService.error('Error de Publicación', 'No se pudo identificar la sesión del entrenador o del alumno. Revisa tu inicio de sesión.');
            return;
        }

        // Mostrar indicador de carga limpio con botón de cancelar
        let isCancelled = false;
        const swalLoading = Swal.fire({
            title: 'Registrando Evaluación',
            text: 'Guardando métricas y notificando al alumno...',
            allowOutsideClick: false,
            showConfirmButton: false,
            showCancelButton: true,
            cancelButtonText: 'Cancelar Registro',
            cancelButtonColor: '#ff4b5c',
            didOpen: () => {
                Swal.showLoading();
            }
        });

        const payload = {
            jugador_id: this.alumnoId,
            entrenador_id: this.userId,
            comentarios: this.evaluacionComentarios,
            scores: {
                tecnico: this.evaluationData,
                tactico: this.tacticalData,
                fisico: this.fisicoData,
                mental: this.mentalData
            }
        };

        const subscription = this.evaluacionService.crearEvaluacion(payload).subscribe({
            next: () => {
                if (isCancelled) return;
                Swal.close();
                this.popupService.success('Evaluación Publicada', 'Los resultados ya están disponibles en los gráficos de progreso.');
                
                // Reset fields
                this.evaluacionComentarios = '';
                
                // Reload and Navigate
                this.loadEvaluaciones();
                this.setTab('progreso');
                this.activeProgresoSubTab = 'graficos';
            },
            error: (err) => {
                if (isCancelled) return;
                Swal.close();
                console.error('Save error detailed:', err);
                const errorMsg = err?.error?.error || err?.error?.message || err?.message || 'No se pudo guardar. Revisa tu conexión.';
                this.popupService.error('Error de Publicación', errorMsg);
            }
        });

        swalLoading.then((result) => {
            if (result.isDismissed && result.dismiss === Swal.DismissReason.cancel) {
                isCancelled = true;
                subscription.unsubscribe();
            }
        });
    }

    // --- INTERACTIVE TUTORIAL METHODS ---
    startTutorial() {
        this.showTutorial = true;
        this.currentTutorialStep = 0;
        setTimeout(() => this.updateTutorialPosition(), 50);
    }

    closeTutorial() {
        this.showTutorial = false;
        localStorage.setItem('tutorial_clases_done', 'true');
    }

    nextTutorialStep() {
        if (this.currentTutorialStep < this.tutorialSteps.length - 1) {
            this.currentTutorialStep++;

            // Auto-switch tabs based on step
            if (this.currentTutorialStep === 1) this.setTab('roadmap');
            if (this.currentTutorialStep === 2) this.setTab('progreso');
            if (this.currentTutorialStep === 3) this.setTab('evaluar');
            if (this.currentTutorialStep === 4) this.setTab('pagos');

            setTimeout(() => this.updateTutorialPosition(), 150);
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
            const cardWidth = 340;
            
            let top = rect.bottom + 15;
            let left = rect.left + (rect.width / 2) - (cardWidth / 2);

            // Adjust if it goes off screen
            if (top + cardHeight > window.innerHeight) top = rect.top - cardHeight - 15;
            if (left + cardWidth > window.innerWidth) left = window.innerWidth - cardWidth - 20;
            if (left < 0) left = 20;

            this.tutorialTop = `${top}px`;
            this.tutorialLeft = `${left}px`;
            
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('tutorial-highlight');
            setTimeout(() => el.classList.remove('tutorial-highlight'), 2000);
        }
    }
}
