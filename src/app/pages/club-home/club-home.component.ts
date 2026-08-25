import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { ApiService } from '../../services/api.service';
import { ClubesService } from '../../services/clubes.service';
import { Router } from '@angular/router';

@Component({
    selector: 'app-club-home',
    standalone: true,
    imports: [CommonModule, FormsModule, SidebarComponent],
    templateUrl: './club-home.component.html',
    styleUrls: ['./club-home.component.scss']
})
export class ClubHomeComponent implements OnInit {
    userId: number | null = null;
    userName: string = '';
    userFoto: string | null = null;
    userRole: any = 'administrador_club';
    clubId: number | null = null;
    isLoading: boolean = true;
    isLoadingCalendar: boolean = false;

    // Clubs
    clubes: any[] = [];
    selectedClub: any = null;

    // Date
    selectedFecha: string = '';

    // Stats
    stats = {
        ocupacion: '0%',
        total_reservas_hoy: 0,
        ingresos_canchas: 0,
        ingresos_productos: 0,
        ingresos_dia: 0,
        americanos_activos: 0
    };

    // Canchas y Reservas
    canchas: any[] = [];
    reservas: any[] = [];
    timeSlots: string[] = [];

    // Pre-computed summary metrics (Fast rendering, zero CD lag)
    totalHorasReservadas: number = 0;
    totalHorasDesocupadas: number = 0;
    totalBloques: number = 0;
    pctOcupacionCalendario: number = 0;
    pctDesocupadoCalendario: number = 100;
    canchasSummary: any[] = [];
    uxDiagnosis: { badge: string; message: string; color: string } = {
        badge: '💡 DISPONIBILIDAD ALTA',
        message: 'Cargando diagnóstico...',
        color: 'low'
    };

    get isStaff(): boolean {
        const role = localStorage.getItem('userRole') || '';
        return role.toLowerCase().includes('staff');
    }

    constructor(
        private apiService: ApiService,
        private clubesService: ClubesService,
        private router: Router
    ) { }

    ngOnInit(): void {
        const storedUserId = localStorage.getItem('userId');
        const storedUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
        const storedRole = localStorage.getItem('userRole') || '';

        if (!storedUserId || (!storedRole.toLowerCase().includes('admin') && !storedRole.toLowerCase().includes('staff'))) {
            this.router.navigate(['/login']);
            return;
        }

        this.userId = Number(storedUserId);
        this.userName = storedUser?.nombre || '';
        this.userFoto = storedUser?.foto_perfil || null;
        this.userRole = storedUser?.rol || storedRole;
        this.clubId = storedUser?.club_id || null;

        this.selectedFecha = this.getLocalISODate();
        this.generateTimeSlots();

        this.loadProfileData();
        this.loadClubes();
    }

    getLocalISODate(date: Date = new Date()): string {
        const y = date.getFullYear();
        const m = (date.getMonth() + 1).toString().padStart(2, '0');
        const d = date.getDate().toString().padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    generateTimeSlots() {
        const slots: string[] = [];
        for (let i = 8; i <= 22; i++) {
            slots.push(`${i.toString().padStart(2, '0')}:00`);
            slots.push(`${i.toString().padStart(2, '0')}:30`);
        }
        this.timeSlots = slots;
    }

    loadProfileData() {
        this.apiService.getPerfil(this.userId!).subscribe(res => {
            if (res && res.success && res.user) {
                this.userFoto = res.user.foto_perfil || this.userFoto;
                this.userName = res.user.nombre || this.userName;
            }
        });
    }

    loadClubes() {
        if (!this.userId) return;
        this.clubesService.getClubes(this.userId).subscribe({
            next: (res) => {
                this.clubes = res || [];
                if (this.clubes.length > 0) {
                    if (this.clubId) {
                        const matched = this.clubes.find(c => Number(c.id) === Number(this.clubId));
                        this.selectedClub = matched || this.clubes[0];
                    } else {
                        this.selectedClub = this.clubes[0];
                    }
                }
                this.loadStats();
                this.loadCalendarData();
            },
            error: (err) => {
                console.error('Error cargando clubes', err);
                this.loadStats();
            }
        });
    }

    onClubSelectChange() {
        if (this.selectedClub) {
            this.clubId = this.selectedClub.id;
        }
        this.loadStats();
        this.loadCalendarData();
    }

    onFechaChange() {
        this.loadStats();
        this.loadCalendarData();
    }

    setFechaQuick(offsetDays: number) {
        const d = new Date();
        d.setDate(d.getDate() + offsetDays);
        this.selectedFecha = this.getLocalISODate(d);
        this.onFechaChange();
    }

    loadStats() {
        this.isLoading = true;
        const currentClubId = this.selectedClub ? this.selectedClub.id : this.clubId;
        this.clubesService.getClubHomeStats(this.userId!, currentClubId!, this.selectedFecha).subscribe({
            next: (res) => {
                if (res && res.success && res.stats) {
                    this.stats = {
                        ocupacion: res.stats.ocupacion || '0%',
                        total_reservas_hoy: res.stats.total_reservas_hoy || 0,
                        ingresos_canchas: res.stats.ingresos_canchas || 0,
                        ingresos_productos: res.stats.ingresos_productos || 0,
                        ingresos_dia: res.stats.ingresos_dia || 0,
                        americanos_activos: res.stats.americanos_activos || 0
                    };
                }
                this.isLoading = false;
            },
            error: (err) => {
                console.error('Error loading club stats', err);
                this.isLoading = false;
            }
        });
    }

    loadCalendarData() {
        if (!this.selectedClub) return;
        this.isLoadingCalendar = true;

        this.clubesService.getCanchas(this.selectedClub.id).subscribe({
            next: (canchas) => {
                this.canchas = canchas || [];
                this.clubesService.getClubReservas(this.selectedClub.id, this.selectedFecha).subscribe({
                    next: (reservas) => {
                        this.reservas = reservas || [];
                        this.computeSummaryMetrics();
                        this.isLoadingCalendar = false;
                    },
                    error: (err) => {
                        console.error('Error cargando reservas', err);
                        this.reservas = [];
                        this.computeSummaryMetrics();
                        this.isLoadingCalendar = false;
                    }
                });
            },
            error: (err) => {
                console.error('Error cargando canchas', err);
                this.canchas = [];
                this.computeSummaryMetrics();
                this.isLoadingCalendar = false;
            }
        });
    }

    getReservaInSlot(canchaId: number, hora: string) {
        const [h, m] = hora.split(':').map(Number);
        const slotMinutes = h * 60 + (m || 0);
        const slotEnd = slotMinutes + 30;

        return this.reservas.find(r => {
            if (Number(r.cancha_id) !== Number(canchaId)) return false;
            if (r.estado === 'Cancelada') return false;

            const [hStart, mStart] = r.hora_inicio.split(':').map(Number);
            const startMinutes = hStart * 60 + mStart;

            const [hEnd, mEnd] = r.hora_fin.split(':').map(Number);
            const endMinutes = hEnd * 60 + mEnd;

            return startMinutes < slotEnd && endMinutes > slotMinutes;
        });
    }

    // COMPUTE SUMMARY METRICS ONCE (FAST, NON-BLOCKING)
    computeSummaryMetrics() {
        if (!this.canchas.length || !this.timeSlots.length) {
            this.totalHorasReservadas = 0;
            this.totalHorasDesocupadas = 0;
            this.totalBloques = 0;
            this.pctOcupacionCalendario = 0;
            this.pctDesocupadoCalendario = 100;
            this.canchasSummary = [];
            return;
        }

        let totalOcupadas = 0;
        let totalLibres = 0;

        const summary: any[] = [];

        for (const cancha of this.canchas) {
            let reservadas = 0;
            let desocupadas = 0;
            const franjasLibres: string[] = [];

            let inFreeBlock = false;
            let startSlot = '';

            for (let i = 0; i < this.timeSlots.length; i++) {
                const hora = this.timeSlots[i];
                const res = this.getReservaInSlot(cancha.id, hora);
                if (res) {
                    reservadas++;
                    totalOcupadas++;
                    if (inFreeBlock) {
                        franjasLibres.push(`${startSlot} - ${hora}`);
                        inFreeBlock = false;
                    }
                } else {
                    desocupadas++;
                    totalLibres++;
                    if (!inFreeBlock) {
                        inFreeBlock = true;
                        startSlot = hora;
                    }
                }
            }

            if (inFreeBlock) {
                franjasLibres.push(`${startSlot} - 22:30`);
            }

            const totalCourtSlots = this.timeSlots.length;
            const pct = totalCourtSlots > 0 ? Math.round((reservadas / totalCourtSlots) * 100) : 0;

            summary.push({
                id: cancha.id,
                nombre: cancha.nombre,
                tipo: cancha.tipo || 'Padel',
                reservadas,
                desocupadas,
                pct,
                franjasLibresTxt: franjasLibres.length > 0 ? franjasLibres.slice(0, 2).join(', ') : 'Sin disponibilidad'
            });
        }

        this.totalHorasReservadas = totalOcupadas;
        this.totalHorasDesocupadas = totalLibres;
        this.totalBloques = this.canchas.length * this.timeSlots.length;
        this.pctOcupacionCalendario = this.totalBloques > 0 ? Math.round((totalOcupadas / this.totalBloques) * 100) : 0;
        this.pctDesocupadoCalendario = 100 - this.pctOcupacionCalendario;
        this.canchasSummary = summary;

        // Diagnóstico Operativo
        const pct = this.pctOcupacionCalendario;
        if (pct >= 75) {
            this.uxDiagnosis = {
                badge: '🔥 ALTA DEMANDA',
                message: 'Excelente ocupación. Revisa la lista de espera o sobrecupos para maximizar ingresos.',
                color: 'high'
            };
        } else if (pct >= 40) {
            this.uxDiagnosis = {
                badge: '⚡ OCUPACIÓN EQUILIBRADA',
                message: 'Buena actividad. Tienes franjas desocupadas clave en la tarde para promocionar.',
                color: 'medium'
            };
        } else {
            this.uxDiagnosis = {
                badge: '💡 DISPONIBILIDAD ALTA',
                message: 'Tienes variados bloques desocupados disponibles hoy. Considera lanzar cupones flash o torneos americanos.',
                color: 'low'
            };
        }
    }

    irAFormularioReserva(canchaId?: number, hora?: string) {
        this.router.navigate(['/club-reservas'], {
            queryParams: {
                clubId: this.selectedClub?.id,
                fecha: this.selectedFecha,
                canchaId: canchaId,
                hora: hora
            }
        });
    }

    navigate(path: string) {
        this.router.navigate([path]);
    }
}
