import { Component, OnInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ClubesService } from '../../services/clubes.service';
import { ApiService } from '../../services/api.service';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { AssetService } from '../../services/asset.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-clubes-jugador',
    standalone: true,
    imports: [CommonModule, FormsModule, SidebarComponent],
    templateUrl: './clubes-jugador.component.html',
    styleUrls: ['./clubes-jugador.component.scss']
})
export class ClubesJugadorComponent implements OnInit {
    @ViewChild('dateContainerRef') dateContainerRef!: ElementRef;

    // Core Data
    clubes: any[] = [];
    canchas: any[] = [];
    horarios: any[] = []; // Grouped slots: { hora, canchas: [] }
    torneos: any[] = [];
    americanos: any[] = [];

    // UI & Navigation State
    selectedClub: any = null;
    selectedCancha: any = null;
    selectedFecha: string = '';
    weekDays: any[] = [];
    showOnlyAvailable: boolean = true;
    activeSubTab: 'reservar' | 'torneos' | 'americanos' = 'reservar';

    // Filters
    searchTerm: string = '';
    showOnlyFavorites: boolean = false;
    selectedRegion: string = '';
    selectedComuna: string = '';
    regiones: string[] = [];
    comunas: string[] = [];
    filteredComunas: string[] = [];

    regions = [
        { id: '13', name: 'Metropolitana de Santiago' },
        { id: '15', name: 'Arica y Parinacota' },
        { id: '1', name: 'Tarapacá' },
        { id: '2', name: 'Antofagasta' },
        { id: '3', name: 'Atacama' },
        { id: '4', name: 'Coquimbo' },
        { id: '5', name: 'Valparaíso' },
        { id: '6', name: 'O\'Higgins' },
        { id: '7', name: 'Maule' },
        { id: '16', name: 'Ñuble' },
        { id: '8', name: 'Biobío' },
        { id: '9', name: 'Araucanía' },
        { id: '14', name: 'Los Ríos' },
        { id: '10', name: 'Los Lagos' },
        { id: '11', name: 'Aysén' },
        { id: '12', name: 'Magallanes' }
    ];

    allComunas: any = {
        '13': ['Santiago', 'Las Condes', 'Providencia', 'Ñuñoa', 'Maipú', 'Puente Alto', 'La Florida', 'Vitacura', 'Lo Barnechea', 'Colina', 'Lampa', 'San Bernardo', 'Peñalolén'],
        '15': ['Arica', 'Camarones', 'Putre', 'General Lagos'],
        '1': ['Iquique', 'Alto Hospicio', 'Pozo Almonte', 'Pica', 'Huara'],
        '2': ['Antofagasta', 'Calama', 'Mejillones', 'Taltal', 'Tocopilla'],
        '3': ['Copiapó', 'Vallenar', 'Caldera', 'Chañaral', 'Huasco'],
        '4': ['La Serena', 'Coquimbo', 'Ovalle', 'Illapel', 'Vicuña', 'Salamanca'],
        '5': ['Valparaíso', 'Viña del Mar', 'Concón', 'Quilpué', 'Villa Alemana', 'Limache', 'Quillota', 'San Antonio', 'Los Andes', 'San Felipe'],
        '6': ['Rancagua', 'Machalí', 'Rengo', 'San Fernando', 'Pichilemu', 'Santa Cruz'],
        '7': ['Talca', 'Curicó', 'Linares', 'Constitución', 'Cauquenes', 'Parral'],
        '16': ['Chillán', 'Chillán Viejo', 'San Carlos', 'Bulnes', 'Yungay'],
        '8': ['Concepción', 'Talcahuano', 'San Pedro de la Paz', 'Chiguayante', 'Hualpén', 'Los Ángeles', 'Coronel', 'Lota', 'Tomé', 'Penco'],
        '9': ['Temuco', 'Padre Las Casas', 'Villarrica', 'Pucón', 'Angol', 'Victoria', 'Lautaro'],
        '14': ['Valdivia', 'La Unión', 'Río Bueno', 'Panguipulli', 'Paillaco', 'Mariquina'],
        '10': ['Puerto Montt', 'Puerto Varas', 'Osorno', 'Castro', 'Ancud', 'Quellón', 'Frutillar'],
        '11': ['Coyhaique', 'Puerto Aysén', 'Chile Chico', 'Cochrane'],
        '12': ['Punta Arenas', 'Puerto Natales', 'Porvenir', 'Cabo de Hornos']
    };

    // Slot & Duration State
    selectedSlot: any = null;
    selectedDuration: number = 90; // Default to 90 min
    disponibilidadCache: Map<string, any[]> = new Map();
    loading: boolean = false;

    // Success Modal
    showSuccessModal: boolean = false;
    lastReserva: any = null;

    placeholderImg: string = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' fill='%23e2e8f0'/%3E%3Ctext x='50%25' y='45%25' font-family='sans-serif' font-size='14' font-weight='bold' fill='%2394a3b8' text-anchor='middle'%3ECLUB%3C/text%3E%3Ctext x='50%25' y='62%25' font-family='sans-serif' font-size='11' fill='%2394a3b8' text-anchor='middle'%3EDE PADEL%3C/text%3E%3C/svg%3E";

    userId: number | null = null;
    userName: string = '';
    userFoto: string | null = null;
    userRole: any = 'jugador';

    constructor(
        private clubesService: ClubesService,
        private apiService: ApiService,
        private assetService: AssetService,
        public router: Router,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        const user = this.apiService.getCurrentUser();
        if (user) {
            this.userId = user.id;
            this.userName = user.nombre;
            this.userFoto = user.foto_perfil;
            this.userRole = user.rol;
        }

        this.selectedFecha = this.getLocalISODate(new Date());
        this.generateWeekDays();
        this.loadUserProfile();
        this.loadClubes();
    }

    loadUserProfile() {
        const userId = Number(localStorage.getItem('userId')) || this.userId;
        if (userId) {
            this.apiService.getPerfil(userId).subscribe(res => {
                if (res && res.user) {
                    const dir = res.direccion || res.user;
                    if (dir) {
                        const reg = typeof dir === 'object' ? (dir.region || '') : '';
                        const com = typeof dir === 'object' ? (dir.comuna || '') : '';
                        if (reg && !this.selectedRegion) {
                            this.selectedRegion = reg;
                            this.selectedComuna = com;
                            this.updateComunas(true);
                        }
                    }
                    const photo = res.user.foto_perfil || res.user.foto;
                    if (photo) {
                        this.userFoto = this.assetService.getAssetUrl(photo, 'perfil');
                    }
                    this.cdr.detectChanges();
                }
            });
        }
    }

    getLocalISODate(date: Date = new Date()): string {
        const y = date.getFullYear();
        const m = (date.getMonth() + 1).toString().padStart(2, '0');
        const d = date.getDate().toString().padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    generateWeekDays() {
        const days = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
        const result = [];
        const today = new Date();

        for (let i = 0; i < 30; i++) {
            const d = new Date();
            d.setDate(today.getDate() + i);
            const dateStr = this.getLocalISODate(d);
            result.push({
                nombre: days[d.getDay()],
                numero: d.getDate(),
                fullDate: dateStr
            });
        }
        this.weekDays = result;
    }

    onSelectDate(date: string) {
        this.selectedFecha = date;
        this.loadDisponibilidad();
    }

    scrollDates(direction: number) {
        if (!this.dateContainerRef) return;
        const container = this.dateContainerRef.nativeElement;
        const scrollAmount = 250;
        container.scrollBy({
            left: direction * scrollAmount,
            behavior: 'smooth'
        });
    }

    loadClubes() {
        this.loading = true;
        this.clubesService.getClubes().subscribe({
            next: (res: any[]) => {
                const favorites = JSON.parse(localStorage.getItem('fav_clubes') || '[]');
                this.clubes = (res || [])
                    .filter(c => Number(c.reservas_activas) === 1)
                    .map(c => {
                        c.logoUrl = c.logo ? this.assetService.getAssetUrl(c.logo, 'club') : this.placeholderImg;
                        c.isFavorite = favorites.includes(c.id);
                        return c;
                    });

                // Populate regions
                const regionsSet = new Set(this.clubes.map(c => c.region).filter(r => !!r));
                this.regiones = Array.from(regionsSet).sort();
                this.updateComunas(true);
                this.loading = false;
                this.cdr.detectChanges();
            },
            error: () => {
                this.loading = false;
            }
        });
    }

    getAllUniqueComunas(): string[] {
        const set = new Set<string>();
        Object.values(this.allComunas).forEach((list: any) => {
            if (Array.isArray(list)) {
                list.forEach(c => set.add(c));
            }
        });
        return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
    }

    updateComunas(keepComuna = false): void {
        if (!this.selectedRegion) {
            this.filteredComunas = this.getAllUniqueComunas();
            if (!keepComuna) this.selectedComuna = '';
            this.cdr.detectChanges();
            return;
        }

        const regLower = this.selectedRegion.toLowerCase().trim();
        const selectedRegionObj = this.regions.find(r => {
            const nameLower = r.name.toLowerCase().trim();
            return nameLower === regLower || regLower.includes(nameLower) || nameLower.includes(regLower);
        });

        if (selectedRegionObj) {
            this.selectedRegion = selectedRegionObj.name;
            this.filteredComunas = this.allComunas[selectedRegionObj.id] || [];
        } else {
            this.filteredComunas = this.getAllUniqueComunas();
        }

        if (!keepComuna) {
            this.selectedComuna = '';
        }
        this.cdr.detectChanges();
    }

    limpiarFiltrosUbicacion(): void {
        this.selectedRegion = '';
        this.selectedComuna = '';
        this.searchTerm = '';
        this.showOnlyFavorites = false;
        this.updateComunas(false);
    }

    toggleShowOnlyFavorites() {
        this.showOnlyFavorites = !this.showOnlyFavorites;
    }

    toggleFavorite(club: any, event?: Event) {
        if (event) {
            event.stopPropagation();
        }
        club.isFavorite = !club.isFavorite;

        let favorites = JSON.parse(localStorage.getItem('fav_clubes') || '[]');
        if (club.isFavorite) {
            if (!favorites.includes(club.id)) {
                favorites.push(club.id);
            }
        } else {
            favorites = favorites.filter((id: any) => id !== club.id);
        }
        localStorage.setItem('fav_clubes', JSON.stringify(favorites));
        this.cdr.detectChanges();
    }

    get filteredClubes() {
        let list = this.clubes;

        if (this.showOnlyFavorites) {
            list = list.filter(c => c.isFavorite);
        }

        if (this.selectedRegion) {
            list = list.filter(c => c.region === this.selectedRegion);
        }

        if (this.selectedComuna) {
            list = list.filter(c => c.comuna === this.selectedComuna);
        }

        if (this.searchTerm && this.searchTerm.trim() !== '') {
            const term = this.searchTerm.toLowerCase().trim();
            list = list.filter(c =>
                (c.nombre && c.nombre.toLowerCase().includes(term)) ||
                (c.direccion && c.direccion.toLowerCase().includes(term))
            );
        }

        return list;
    }

    onSelectClub(club: any) {
        this.selectedClub = club;
        this.selectedCancha = null;
        this.horarios = [];
        this.activeSubTab = 'reservar';
        this.showSuccessModal = false;

        this.loadDisponibilidad();
        this.loadTorneosClub();
    }

    loadTorneosClub() {
        if (!this.selectedClub) return;
        this.clubesService.getTorneosPublicos().subscribe(res => {
            const clubMatches = (res || []).filter(t => Number(t.club_id) === Number(this.selectedClub.id));
            this.torneos = clubMatches.filter(t => t.tipo !== 'Americano');
            this.americanos = clubMatches.filter(t => t.tipo === 'Americano');
            this.cdr.detectChanges();
        });
    }

    setDuration(dur: number) {
        this.selectedDuration = dur;
        this.cdr.detectChanges();
    }

    filterPastHoursIfToday(res: any[]): any[] {
        if (!res || !Array.isArray(res)) return [];

        const todayISO = this.getLocalISODate(new Date());
        if (this.selectedFecha !== todayISO) {
            return res;
        }

        const now = new Date();
        const hh = now.getHours().toString().padStart(2, '0');
        const mm = now.getMinutes().toString().padStart(2, '0');
        const currentTimeStr = `${hh}:${mm}:00`;

        return res.filter(slot => slot.hora >= currentTimeStr);
    }

    loadDisponibilidad() {
        if (!this.selectedClub || !this.selectedFecha) return;

        const cacheKey = `${this.selectedClub.id}_${this.selectedFecha}`;

        if (this.disponibilidadCache.has(cacheKey)) {
            const cached = this.disponibilidadCache.get(cacheKey)!;
            this.horarios = this.filterPastHoursIfToday(cached);
            this.autoSelectFirstSlot();
            this.fetchAvailabilitySilent(cacheKey);
        } else {
            this.loading = true;
            this.selectedSlot = null;
            this.clubesService.getDisponibilidadClub(this.selectedClub.id, this.selectedFecha).subscribe({
                next: (res: any[]) => {
                    this.disponibilidadCache.set(cacheKey, res || []);
                    this.horarios = this.filterPastHoursIfToday(res || []);
                    this.autoSelectFirstSlot();
                    this.loading = false;
                    this.cdr.detectChanges();
                },
                error: () => {
                    this.loading = false;
                    this.cdr.detectChanges();
                }
            });
        }
    }

    private fetchAvailabilitySilent(cacheKey: string) {
        this.clubesService.getDisponibilidadClub(this.selectedClub.id, this.selectedFecha).subscribe({
            next: (res: any[]) => {
                this.disponibilidadCache.set(cacheKey, res || []);
                this.horarios = this.filterPastHoursIfToday(res || []);
                this.autoSelectFirstSlot();
                this.cdr.detectChanges();
            }
        });
    }

    private autoSelectFirstSlot() {
        if (this.horarios.length > 0) {
            const currentHora = this.selectedSlot?.hora;
            const sameSlot = this.horarios.find(h => h.hora === currentHora);

            if (sameSlot) {
                this.selectedSlot = sameSlot;
            } else {
                const firstAvailable = this.horarios.find(h => this.hasAvailableInSlot(h));
                this.selectedSlot = firstAvailable || this.horarios[0];
            }
        }
    }

    onSelectSlot(slot: any) {
        this.selectedSlot = slot;
        this.cdr.detectChanges();
    }

    getCourtPrice(cancha: any): number {
        if (!cancha) return 0;
        const dur = this.selectedDuration;
        if (cancha.precio_slot_60 !== undefined && cancha.precio_slot_60 !== null && cancha.precio_slot_60 > 0) {
            if (dur === 60) return Number(cancha.precio_slot_60 || 0);
            if (dur === 120) return Number(cancha.precio_slot_120 || 0);
            return Number(cancha.precio_slot_90 || 0);
        }
        const isAlto = cancha.es_horario_alto;
        if (dur === 60) {
            const pAlto = Number(cancha.precio_60_alto);
            return (isAlto && pAlto > 0) ? pAlto : Number(cancha.precio_60 || 0);
        } else if (dur === 120) {
            const pAlto = Number(cancha.precio_120_alto);
            return (isAlto && pAlto > 0) ? pAlto : Number(cancha.precio_120 || 0);
        } else {
            const pAlto = Number(cancha.precio_90_alto);
            return (isAlto && pAlto > 0) ? pAlto : Number(cancha.precio_90 || 0);
        }
    }

    hasAvailableInSlot(slot: any): boolean {
        if (!slot || !slot.canchas) return false;
        return slot.canchas.some((c: any) => c.disponible && this.getCourtPrice(c) > 0);
    }

    getAvailableCount(slot: any): number {
        if (!slot || !slot.canchas) return 0;
        return slot.canchas.filter((c: any) => c.disponible && this.getCourtPrice(c) > 0).length;
    }

    getCourtsWithPriceForSlot(slot: any): any[] {
        if (!slot || !slot.canchas) return [];
        return slot.canchas.filter((c: any) => this.getCourtPrice(c) > 0);
    }

    formatTime(time: string): string {
        return time ? time.slice(0, 5) : '';
    }

    calcularHoraFin(horaInicio: string, duracionMinutos: number): string {
        const [hh, mm] = horaInicio.split(':').map(Number);
        let totalMinutes = hh * 60 + mm + duracionMinutos;
        const endH = Math.floor(totalMinutes / 60) % 24;
        const endM = totalMinutes % 60;
        return `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}:00`;
    }

    reservar(slot: any, cancha: any) {
        if (!cancha.disponible) return;

        const precioCalculado = this.getCourtPrice(cancha);
        const precioPorJugador = Math.round(precioCalculado / 4);
        const tipoHorario = cancha.nombre_tarifa || (cancha.es_horario_alto ? '⚡ Horario Alto' : '🌿 Horario Bajo');
        const precioTotalFormatted = '$' + Math.round(precioCalculado).toLocaleString('es-CL');
        const precioJugadorFormatted = '$' + precioPorJugador.toLocaleString('es-CL');

        Swal.fire({
            title: 'Confirmar Reserva',
            html: `
                <div style="text-align: left; font-family: 'Outfit', sans-serif; line-height: 1.6;">
                    <div style="background: #0f172a; color: #fff; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
                        <div style="font-size: 13px; opacity: 0.7;">${this.selectedClub.nombre}</div>
                        <div style="font-size: 18px; font-weight: 800; color: #ccff00;">${cancha.cancha_nombre}</div>
                        <div style="display: flex; gap: 15px; margin-top: 10px; font-size: 13px;">
                            <span>📅 ${this.selectedFecha}</span>
                            <span>⏰ ${this.formatTime(slot.hora)} (${this.selectedDuration} min)</span>
                        </div>
                    </div>
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 10px;">
                        <p style="margin: 0 0 5px; font-size: 14px;"><strong>Precio Total:</strong> ${precioTotalFormatted}</p>
                        <p style="margin: 0 0 5px; font-size: 14px;"><strong>Por jugador (x4):</strong> <span style="color: #16a34a; font-weight: bold;">${precioJugadorFormatted}</span></p>
                        <p style="margin: 0; font-size: 13px; color: #64748b;"><strong>Tarifa:</strong> ${tipoHorario}</p>
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Confirmar Reserva',
            confirmButtonColor: '#ccff00',
            cancelButtonText: 'Cancelar',
            customClass: {
                confirmButton: 'swal-elite-confirm'
            }
        }).then(result => {
            if (result.isConfirmed) {
                this.confirmarReserva(slot, cancha);
            }
        });
    }

    confirmarReserva(slot: any, cancha: any) {
        const userId = Number(localStorage.getItem('userId')) || this.userId;
        if (!userId) {
            Swal.fire('Error', 'Debes iniciar sesión para realizar una reserva', 'error');
            return;
        }

        const horaFin = this.calcularHoraFin(slot.hora, this.selectedDuration);
        const precioCalculado = this.getCourtPrice(cancha);

        const payload = {
            cancha_id: cancha.cancha_id,
            usuario_id: userId,
            jugador_id: userId,
            fecha: this.selectedFecha,
            hora_inicio: slot.hora,
            hora_fin: horaFin,
            duracion: this.selectedDuration,
            precio: precioCalculado,
            pagado: 0,
            pago_p1: 0,
            pago_p2: 0,
            pago_p3: 0,
            pago_p4: 0,
            estado: 'Confirmada'
        };

        Swal.showLoading();

        this.clubesService.addReserva(payload).subscribe({
            next: (res: any) => {
                Swal.close();

                this.lastReserva = {
                    id: res.id || res.reserva_id,
                    club: this.selectedClub.nombre,
                    pista: cancha.cancha_nombre,
                    hora: `${this.formatTime(slot.hora)} - ${this.formatTime(horaFin)}`,
                    precio: precioCalculado,
                    precioJugador: Math.round(precioCalculado / 4),
                    tipoHorario: cancha.es_horario_alto ? 'Horario Alto' : 'Horario Bajo'
                };

                this.showSuccessModal = true;
                this.disponibilidadCache.clear();
                this.loadDisponibilidad();
                this.cdr.detectChanges();
            },
            error: (err: any) => {
                Swal.close();
                this.disponibilidadCache.clear();
                this.loadDisponibilidad();
                this.cdr.detectChanges();
                Swal.fire('Error', err.error?.error || 'No se pudo completar la reserva', 'error');
            }
        });
    }

    goToEditMatch() {
        this.showSuccessModal = false;
        this.router.navigate(['/mis-partidos']);
    }

    closeSuccessModal() {
        this.showSuccessModal = false;
        this.selectedClub = null;
        this.cdr.detectChanges();
    }

    irATorneo(torneo: any) {
        Swal.fire({
            title: torneo.nombre,
            text: `¿Deseas ver más detalles de este torneo?`,
            icon: 'info',
            showCancelButton: true,
            confirmButtonText: 'Ver Detalles',
            confirmButtonColor: '#0f172a'
        }).then(res => {
            if (res.isConfirmed) {
                this.router.navigate(['/torneo-jugador']);
            }
        });
    }
}
