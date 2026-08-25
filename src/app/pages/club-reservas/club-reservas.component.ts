import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ClubesService } from '../../services/clubes.service';
import { ApiService } from '../../services/api.service';
import Swal from 'sweetalert2';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { InventarioService } from '../../services/inventario.service';
import { forkJoin } from 'rxjs';

@Component({
    selector: 'app-club-reservas',
    standalone: true,
    imports: [CommonModule, FormsModule, SidebarComponent],
    templateUrl: './club-reservas.component.html',
    styleUrls: ['./club-reservas.component.scss']
})
export class ClubReservasComponent implements OnInit {
    clubes: any[] = [];
    selectedClub: any = null;
    reservas: any[] = [];
    selectedFecha: string = '';

    userId: number | null = null;
    userName: string = '';
    userFoto: string | null = null;
    userRole: any = 'administrador_club';

    // Manual Reservation
    showAddForm = false;
    canchas: any[] = [];
    allUsers: any[] = [];
    filteredUsers: any[] = [];
    userSearchTerm: string = '';

    newReserva: any = {
        id: null,
        cancha_id: 0,
        duracion: 90,
        jugador_id: 0,
        jugador2_id: 0,
        jugador3_id: 0,
        jugador4_id: 0,
        nombre_externo: '',
        nombre_externo2: '',
        nombre_externo3: '',
        nombre_externo4: '',
        fecha: '',
        hora_inicio: '',
        hora_fin: '',
        precio: 0,
        pagado: 1,
        estado: 'Confirmada',
        metodo_pago: 'total', // 'total' o 'proporcional'
        pagos: { p1: true, p2: false, p3: false, p4: false }, // Estado de pago por jugador
        tipo_bloqueo: 'dia_completo', // 'dia_completo' o 'rango'
        hora_fin_bloqueo: '23:59'
    };

    activeDragReserva: any = null;

    weekDays: any[] = [];
    timeSlots: string[] = [];

    // User search per slot
    activePlayerSlot: number = 1;

    // TV Mode (Dashboard View)
    isTVMode: boolean = false;
    refreshInterval: any;
    currentTime: string = '';
    // Consumption feature
    showConsumoModal: boolean = false;
    activeReservaConsumo: any = null;
    activePlayerN: number = 0;
    productos: any[] = [];
    currentConsumos: any[] = [];
    searchConsumoProductTerm: string = '';

    // Tarro de pelotas adicional en reserva
    selectedBallProductId: any = null;
    splitBallBetween4: boolean = true;
    pendingTarroPelotas: any = null;

    get ballProducts(): any[] {
        if (!this.productos || this.productos.length === 0) return [];
        return this.productos.filter(p => {
            const name = (p.nombre || '').toLowerCase();
            const cat = (p.categoria || '').toLowerCase();
            return cat.includes('pelota') || cat.includes('bola') || name.includes('pelota') || name.includes('bola') || name.includes('tubo de pelota') || name.includes('tarro de pelota');
        });
    }

    get selectedBallProduct(): any {
        if (!this.selectedBallProductId) return null;
        return this.productos.find(p => Number(p.id) === Number(this.selectedBallProductId));
    }

    get ballPriceEach(): number {
        const prod = this.selectedBallProduct;
        if (!prod) return 0;
        return Math.round(Number(prod.precio_venta || 0) / 4);
    }

    get filteredConsumoProductos(): any[] {
        if (!this.searchConsumoProductTerm || !this.searchConsumoProductTerm.trim()) {
            return this.productos;
        }
        const term = this.searchConsumoProductTerm.toLowerCase().trim();
        return this.productos.filter(p => p.nombre && p.nombre.toLowerCase().includes(term));
    }

    // WhatsApp Free Slots Generator State
    showWhatsAppModal: boolean = false;
    whatsappLoading: boolean = false;
    whatsappDays: any[] = [];
    whatsappCanchas: any[] = [];
    whatsappStartHour: string = '16:00';
    whatsappEndHour: string = '23:00';
    whatsappGeneratedMessage: string = '';

    constructor(
        private clubesService: ClubesService,
        private apiService: ApiService,
        private inventarioService: InventarioService,
        private router: Router
    ) { }

    ngOnInit(): void {
        const storedRole = localStorage.getItem('userRole') || '';
        const storedUserId = localStorage.getItem('userId');
        const storedUser = JSON.parse(localStorage.getItem('currentUser') || 'null');

        const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');

        if (!currentUser) {
            this.router.navigate(['/login']);
            return;
        }

        this.userId = currentUser.id;
        this.userRole = currentUser.rol || 'administrador_club';
        if (!storedUserId || (!storedRole.toLowerCase().includes('admin') && !storedRole.toLowerCase().includes('staff'))) {
            this.router.navigate(['/login']);
            return;
        }

        this.userId = Number(storedUserId);
        this.userName = storedUser?.nombre || '';
        this.userFoto = storedUser?.foto_perfil || null;
        this.userRole = storedUser?.rol || storedRole;
        this.apiService.getPerfil(this.userId!).subscribe({
            next: (res) => {
                if (res.success && res.user) {
                    this.userFoto = res.user.foto_perfil || this.userFoto;
                    this.userName = res.user.nombre || this.userName;
                }
            }
        });

        this.selectedFecha = this.getLocalISODate();
        this.newReserva.fecha = this.selectedFecha;
        this.generateTimeSlots();
        this.generateCurrentWeek();

        if (this.userId) {
            this.clubesService.getClubes(this.userId).subscribe(res => {
                this.clubes = res;
                if (this.clubes.length > 0) {
                    const currentClubId = currentUser?.club_id;
                    const matchedClub = this.clubes.find(c => Number(c.id) === Number(currentClubId));
                    this.selectClub(matchedClub || this.clubes[0]);
                }
            });
        }

        this.clubesService.getUsers().subscribe(res => {
            this.allUsers = res;
        });

        this.updateTime();
        setInterval(() => this.updateTime(), 60000);
    }

    getLocalISODate(date: Date = new Date()): string {
        const y = date.getFullYear();
        const m = (date.getMonth() + 1).toString().padStart(2, '0');
        const d = date.getDate().toString().padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    updateTime() {
        const now = new Date();
        this.currentTime = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    }

    toggleTVMode() {
        this.isTVMode = !this.isTVMode;
        if (this.isTVMode) {
            // Auto-refresh every 60s in TV mode
            this.refreshInterval = setInterval(() => {
                this.loadReservas();
            }, 60000);
            // Optional: Request fullscreen
            document.documentElement.requestFullscreen().catch(() => { });
        } else {
            if (this.refreshInterval) clearInterval(this.refreshInterval);
            if (document.fullscreenElement) {
                document.exitFullscreen().catch(() => { });
            }
        }
    }

    generateTimeSlots() {
        const slots = [];
        for (let i = 6; i <= 23; i++) {
            slots.push(`${i.toString().padStart(2, '0')}:00`);
            slots.push(`${i.toString().padStart(2, '0')}:30`);
        }
        this.timeSlots = slots;
    }

    generateCurrentWeek() {
        if (!this.selectedFecha) return;
        const [y, m, d] = this.selectedFecha.split('-').map(Number);
        const curr = new Date(y, m - 1, d);

        // Find Monday of the current week
        const dayOfWeek = curr.getDay(); // 0 is Sunday, 1 is Monday
        const diff = curr.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const monday = new Date(y, m - 1, diff);

        const week = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(monday);
            date.setDate(monday.getDate() + i);

            week.push({
                full: this.getLocalISODate(date),
                short: date.toLocaleDateString('es-ES', { weekday: 'short' }),
                num: date.getDate()
            });
        }
        this.weekDays = week;
    }

    // Padel Ball Loading State
    loadingCanchas: boolean = false;
    loadingReservas: boolean = false;
    loadingTextIndex: number = 0;
    loadingTexts: string[] = [
        'Preparando las pistas del club...',
        'Calentando las palas de pádel...',
        'Limpiando los cristales de la cancha...',
        'Ajustando la red y la iluminación...',
        'Cargando disponibilidad de canchas...'
    ];
    private loadingTextTimer: any = null;

    get isLoading(): boolean {
        return this.loadingCanchas || this.loadingReservas;
    }

    get currentLoadingText(): string {
        return this.loadingTexts[this.loadingTextIndex % this.loadingTexts.length];
    }

    startLoadingTextRotation(): void {
        this.loadingTextIndex = 0;
        if (this.loadingTextTimer) clearInterval(this.loadingTextTimer);
        this.loadingTextTimer = setInterval(() => {
            this.loadingTextIndex = (this.loadingTextIndex + 1) % this.loadingTexts.length;
        }, 1500);
    }

    stopLoadingTextRotation(): void {
        if (this.loadingTextTimer) {
            clearInterval(this.loadingTextTimer);
            this.loadingTextTimer = null;
        }
    }

    selectClub(club: any) {
        this.selectedClub = club;
        this.loadingCanchas = true;
        this.loadingReservas = true;
        this.startLoadingTextRotation();
        this.loadReservas();
        this.loadCanchas();
        this.loadProductos();
    }

    loadCanchas() {
        if (!this.selectedClub) return;
        this.loadingCanchas = true;
        this.startLoadingTextRotation();
        this.clubesService.getCanchas(this.selectedClub.id).subscribe({
            next: (res) => {
                this.canchas = res || [];
                this.loadingCanchas = false;
                if (!this.isLoading) this.stopLoadingTextRotation();
                if (this.canchas.length > 0) {
                    if (!this.newReserva.cancha_id) this.newReserva.cancha_id = this.canchas[0].id;
                    this.updateCanchaPrice();
                }
            },
            error: (err) => {
                console.error(err);
                this.loadingCanchas = false;
                if (!this.isLoading) this.stopLoadingTextRotation();
            }
        });
    }

    getCanchaName(id: number): string {
        const c = this.canchas.find(x => x.id === id);
        return c ? c.nombre : 'Cancha ' + id;
    }

    updateCanchaPrice() {
        if (!this.newReserva.cancha_id) return;
        const cancha = this.canchas.find(c => c.id === this.newReserva.cancha_id);
        if (cancha) {
            const duration = Number(this.newReserva.duracion);
            const horaInicio = this.newReserva.hora_inicio || '00:00';
            const hInicioStr = horaInicio.substring(0, 5);
            const hInicioAlto = (cancha.hora_inicio_alto || '18:00').substring(0, 5);
            const hFinAlto = (cancha.hora_fin_alto || '23:00').substring(0, 5);

            const isAlto = (hInicioStr >= hInicioAlto && hInicioStr < hFinAlto);

            if (duration === 60) {
                const pAlto = Number(cancha.precio_60_alto);
                this.newReserva.precio = Math.round((isAlto && pAlto > 0) ? pAlto : Number(cancha.precio_60 || 0));
            } else if (duration === 120) {
                const pAlto = Number(cancha.precio_120_alto);
                this.newReserva.precio = Math.round((isAlto && pAlto > 0) ? pAlto : Number(cancha.precio_120 || 0));
            } else {
                const pAlto = Number(cancha.precio_90_alto);
                this.newReserva.precio = Math.round((isAlto && pAlto > 0) ? pAlto : Number(cancha.precio_90 || 0));
            }
        }
    }

    onPrecioInputChange(val: any) {
        if (this.newReserva.precio !== null && this.newReserva.precio !== undefined) {
            const rawStr = String(this.newReserva.precio).replace(/[\.,]/g, '');
            const parsed = parseInt(rawStr, 10);
            this.newReserva.precio = isNaN(parsed) ? 0 : Math.round(Math.abs(parsed));
        }
    }

    preventDotKey(event: KeyboardEvent) {
        if (event.key === '.' || event.key === ',' || event.key === 'e' || event.key === 'E' || event.key === '-' || event.key === '+') {
            event.preventDefault();
        }
    }

    get montoPorPersona(): number {
        const total = this.newReserva.precio || 0;
        let count = 1;
        if (this.newReserva.nombre_externo2 || this.newReserva.jugador2_id) count++;
        if (this.newReserva.nombre_externo3 || this.newReserva.jugador3_id) count++;
        if (this.newReserva.nombre_externo4 || this.newReserva.jugador4_id) count++;
        return Math.round(total / count);
    }

    getPaymentStatus(res: any): 'total' | 'parcial' | 'pendiente' {
        const metodo = res.metodo_pago || 'total';
        
        if (metodo === 'total') {
            return Number(res.pagado) === 1 ? 'total' : 'pendiente';
        }
        
        // Lógica Proporcional: Verificar cada jugador activo
        let jugadoresActivos = 0;
        let jugadoresPagados = 0;

        if (res.nombre_externo || res.jugador_id || res.usuario_id) {
            jugadoresActivos++;
            if (Number(res.pago_p1) === 1) jugadoresPagados++;
        }
        if (res.nombre_externo2 || res.jugador2_id) {
            jugadoresActivos++;
            if (Number(res.pago_p2) === 1) jugadoresPagados++;
        }
        if (res.nombre_externo3 || res.jugador3_id) {
            jugadoresActivos++;
            if (Number(res.pago_p3) === 1) jugadoresPagados++;
        }
        if (res.nombre_externo4 || res.jugador4_id) {
            jugadoresActivos++;
            if (Number(res.pago_p4) === 1) jugadoresPagados++;
        }

        if (jugadoresActivos === 0) return 'pendiente';
        if (jugadoresPagados === jugadoresActivos) return 'total';
        if (jugadoresPagados > 0) return 'parcial';
        
        return 'pendiente';
    }

    loadReservas() {
        if (!this.selectedClub || !this.selectedFecha) return;
        this.loadingReservas = true;
        this.startLoadingTextRotation();
        this.clubesService.getClubReservas(this.selectedClub.id, this.selectedFecha).subscribe({
            next: (res) => {
                this.reservas = res || [];
                this.loadingReservas = false;
                if (!this.isLoading) this.stopLoadingTextRotation();
            },
            error: (err) => {
                console.error(err);
                this.loadingReservas = false;
                if (!this.isLoading) this.stopLoadingTextRotation();
            }
        });
    }

    getReservaInSlot(canchaId: number, hora: string) {
        const [h, m] = hora.split(':').map(Number);
        const slotMinutes = h * 60 + (m || 0);
        const slotEnd = slotMinutes + 30; // Each slot represents 30 minutes

        return this.reservas.find(r => {
            if (Number(r.cancha_id) !== Number(canchaId)) return false;
            if (r.estado === 'Cancelada') return false;

            const [hStart, mStart] = r.hora_inicio.split(':').map(Number);
            const startMinutes = hStart * 60 + mStart;

            const [hEnd, mEnd] = r.hora_fin.split(':').map(Number);
            const endMinutes = hEnd * 60 + mEnd;

            // Overlap: reservation overlaps with this slot's 30-minute block
            return startMinutes < slotEnd && endMinutes > slotMinutes;
        });
    }

    isStartOfReserva(res: any, hora: string): boolean {
        const [hSlot, mSlot] = hora.split(':').map(Number);
        const slotMinutes = hSlot * 60 + (mSlot || 0);
        const slotEnd = slotMinutes + 30; // Each slot represents 30 minutes

        const [hRes, mRes] = res.hora_inicio.split(':').map(Number);
        const startMinutes = hRes * 60 + mRes;

        // The reservation starts within this slot's 30-minute range
        return startMinutes >= slotMinutes && startMinutes < slotEnd;
    }

    getReservaClass(res: any): string {
        if (res.estado === 'Bloqueada') return 'blocked-slot';
        
        let classes = '';
        const isEntrenador = res.estado === 'Entrenamiento' ||
            res.tipo === 'entrenamiento' ||
            res.tipo_reserva === 'entrenamiento' ||
            res.es_entrenamiento ||
            (res.reserva_tipo && res.reserva_tipo.toString().toLowerCase().includes('entrenamiento')) ||
            (res.entrenador_id && Number(res.entrenador_id) > 0);

        if (isEntrenador) {
            classes = 'trainer-reserva';
        } else if ((!res.usuario_id || res.usuario_id === 0) && res.nombre_externo) {
            classes = 'admin-reserva';
        } else {
            classes = 'player-reserva';
        }

        const status = this.getPaymentStatus(res);
        return `${classes} status-${status}`;
    }

    getReservaTypeBadgeText(res: any): string {
        if (res.estado === 'Bloqueada') return '🔒 BLOQUEO';
        const isTrainer = res.estado === 'Entrenamiento' ||
            res.tipo === 'entrenamiento' ||
            res.tipo_reserva === 'entrenamiento' ||
            res.es_entrenamiento ||
            (res.reserva_tipo && res.reserva_tipo.toString().toLowerCase().includes('entrenamiento')) ||
            (res.entrenador_id && Number(res.entrenador_id) > 0);

        if (isTrainer) return '🎓 CLASE';
        if ((!res.usuario_id || res.usuario_id === 0) && res.nombre_externo) return '🏢 ADMIN';
        return '📱 APP';
    }

    getReservaTypeBadgeClass(res: any): string {
        if (res.estado === 'Bloqueada') return 'badge-block';
        const isTrainer = res.estado === 'Entrenamiento' ||
            res.tipo === 'entrenamiento' ||
            res.tipo_reserva === 'entrenamiento' ||
            res.es_entrenamiento ||
            (res.reserva_tipo && res.reserva_tipo.toString().toLowerCase().includes('entrenamiento')) ||
            (res.entrenador_id && Number(res.entrenador_id) > 0);

        if (isTrainer) return 'badge-trainer';
        if ((!res.usuario_id || res.usuario_id === 0) && res.nombre_externo) return 'badge-admin';
        return 'badge-player';
    }

    getPaymentStatusText(res: any): string {
        const st = this.getPaymentStatus(res);
        if (st === 'total') return 'Pagado Total';
        if (st === 'parcial') return 'Pago Parcial';
        return 'Pago Pendiente / Debe';
    }

    getReservaStyle(res: any, slot: string): any {
        try {
            const [hSlot, mSlot] = slot.split(':').map(Number);
            const slotStartMinutes = hSlot * 60 + mSlot;

            const [hS, mS] = res.hora_inicio.split(':').map(Number);
            const startMinutes = hS * 60 + mS;

            const [hE, mE] = res.hora_fin.split(':').map(Number);
            const endMinutes = hE * 60 + mE;

            const durationMinutes = endMinutes - startMinutes;

            // Offset relative to this slot (in minutes)
            const offsetMinutes = startMinutes - slotStartMinutes;

            // Since each slot represents 30 minutes:
            const heightPercent = (durationMinutes / 30) * 100;
            const topPercent = (offsetMinutes / 30) * 100;

            return {
                'height': `calc(${heightPercent}% - 2px)`,
                'top': `calc(${topPercent}% + 1px)`,
                'position': 'absolute',
                'left': '1px',
                'width': 'calc(100% - 2px)',
                'z-index': '15'
            };
        } catch (e) {
            return { height: '100%' };
        }
    }

    openQuickBook(canchaId: number, hora: string) {
        this.resetForm();
        this.newReserva.cancha_id = canchaId;
        this.newReserva.hora_inicio = hora;
        this.newReserva.fecha = this.selectedFecha;
        this.updateCanchaPrice();
        this.showAddForm = true;
    }

    editarReserva(res: any) {
        this.selectedBallProductId = null;
        this.splitBallBetween4 = true;
        this.pendingTarroPelotas = null;

        // Saneamiento agresivo del método de pago
        let metodo = (res.metodo_pago || 'total').toString().toLowerCase().trim();
        if (metodo !== 'total' && metodo !== 'proporcional') {
            metodo = 'total';
        }

        this.newReserva = { 
            ...res,
            precio: Math.round(Number(res.precio || 0)),
            jugador_id: res.usuario_id || 0,
            jugador2_id: res.jugador2_id || 0,
            jugador3_id: res.jugador3_id || 0,
            jugador4_id: res.jugador4_id || 0,
            nombre_externo: res.nombre_externo || res.jugador_nombre || '',
            nombre_externo2: res.nombre_externo2 || res.jugador2_nombre || '',
            nombre_externo3: res.nombre_externo3 || res.jugador3_nombre || '',
            nombre_externo4: res.nombre_externo4 || res.jugador4_nombre || '',
            metodo_pago: metodo,
            pagos: {
                p1: Number(res.pago_p1) === 1,
                p2: Number(res.pago_p2) === 1,
                p3: Number(res.pago_p3) === 1,
                p4: Number(res.pago_p4) === 1
            }
        };

        // Si es proporcional, rellenamos con nombres ficticios los espacios vacíos para dividir por 4
        if (this.newReserva.metodo_pago === 'proporcional') {
            if (!this.newReserva.nombre_externo2 && !this.newReserva.jugador2_id) this.newReserva.nombre_externo2 = 'Jugador 2';
            if (!this.newReserva.nombre_externo3 && !this.newReserva.jugador3_id) this.newReserva.nombre_externo3 = 'Jugador 3';
            if (!this.newReserva.nombre_externo4 && !this.newReserva.jugador4_id) this.newReserva.nombre_externo4 = 'Jugador 4';
        }

        // Forzar actualización de UI para que los botones se marquen
        setTimeout(() => {
            this.newReserva.metodo_pago = metodo;
            // No llamamos a updateCanchaPrice() para no pisar el precio personalizado guardado en la BD
        }, 0);

        // Limpiar formatos de hora
        const hRaw = String(res.hora_inicio || '');
        const hStartClean = (hRaw && hRaw.length >= 5 && hRaw !== '00:00:00' && hRaw !== '00:00') ? hRaw.substring(0, 5) : '08:00';
        const hEndRaw = String(res.hora_fin || '');
        const hEndClean = (hEndRaw && hEndRaw.length >= 5 && hEndRaw !== '00:00:00' && hEndRaw !== '00:00') ? hEndRaw.substring(0, 5) : '09:30';

        this.newReserva.hora_inicio = hStartClean;
        this.newReserva.hora_fin = hEndClean;

        if (this.newReserva.hora_inicio && !this.timeSlots.includes(this.newReserva.hora_inicio)) {
            this.timeSlots.push(this.newReserva.hora_inicio);
            this.timeSlots.sort();
        }

        const [hS, mS] = this.newReserva.hora_inicio.split(':').map(Number);
        const [hE, mE] = this.newReserva.hora_fin.split(':').map(Number);
        this.newReserva.duracion = (hE * 60 + mE) - (hS * 60 + mS);

        if (res.estado === 'Bloqueada') {
            this.newReserva.hora_fin_bloqueo = this.newReserva.hora_fin;
            const isFullDay = (this.newReserva.hora_inicio === '07:00' || this.newReserva.hora_inicio === '06:00') && (this.newReserva.hora_fin === '23:59' || Number(this.newReserva.duracion) >= 900);
            this.newReserva.tipo_bloqueo = isFullDay ? 'dia_completo' : 'rango';
        } else {
            this.newReserva.tipo_bloqueo = 'dia_completo';
            this.newReserva.hora_fin_bloqueo = '23:59';
        }
        
        // No llamamos a updateCanchaPrice() para conservar el precio personalizado
        this.loadConsumos(res.id);
        this.showAddForm = true;
    }

    onDragStart(res: any) {
        this.activeDragReserva = res;
    }

    onDragOver(event: DragEvent) {
        event.preventDefault();
    }

    onDrop(canchaId: number, hora: string) {
        if (!this.activeDragReserva) return;

        const res = this.activeDragReserva;
        const [hOld, mOld] = res.hora_inicio.split(':').map(Number);
        const [hEndOld, mEndOld] = res.hora_fin.split(':').map(Number);
        const duration = (hEndOld * 60 + mEndOld) - (hOld * 60 + mOld);

        const [hNew, mNew] = hora.split(':').map(Number);
        const totalMinEnd = (hNew * 60 + mNew) + duration;
        const hEnd = Math.floor(totalMinEnd / 60);
        const mEnd = totalMinEnd % 60;
        const horaFinNew = `${hEnd.toString().padStart(2, '0')}:${mEnd.toString().padStart(2, '0')}`;

        const updatedRes = {
            ...res,
            cancha_id: canchaId,
            hora_inicio: hora,
            hora_fin: horaFinNew
        };

        this.clubesService.updateReserva(updatedRes).subscribe({
            next: () => {
                this.loadReservas();
                this.activeDragReserva = null;
            },
            error: (err) => {
                alert('Error al mover: ' + (err.error?.error || 'Conflicto de horario'));
                this.activeDragReserva = null;
            }
        });
    }

    searchUsers() {
        let term = '';
        if (this.activePlayerSlot === 1) term = this.newReserva.nombre_externo;
        else if (this.activePlayerSlot === 2) term = this.newReserva.nombre_externo2;
        else if (this.activePlayerSlot === 3) term = this.newReserva.nombre_externo3;
        else if (this.activePlayerSlot === 4) term = this.newReserva.nombre_externo4;

        console.log('Searching for term:', term, 'in slot:', this.activePlayerSlot);

        if (!term || term.length < 2) {
            this.filteredUsers = [];
            return;
        }

        // Si el usuario escribe manualmente, limpiamos el ID para que cuente como "Invitado"
        if (this.activePlayerSlot === 1) this.newReserva.jugador_id = 0;
        if (this.activePlayerSlot === 2) this.newReserva.jugador2_id = 0;
        if (this.activePlayerSlot === 3) this.newReserva.jugador3_id = 0;
        if (this.activePlayerSlot === 4) this.newReserva.jugador4_id = 0;

        // Buscamos sin filtrar por rol estrictamente para probar
        this.clubesService.getUsers('any', term).subscribe({
            next: (res) => {
                console.log('Users found:', res);
                this.filteredUsers = res.slice(0, 5);
            },
            error: (err) => console.error('Error on search:', err)
        });
    }

    selectUser(user: any) {
        if (this.activePlayerSlot === 1) {
            this.newReserva.jugador_id = user.id;
            this.newReserva.nombre_externo = user.nombre;
            this.newReserva.categoria1 = user.categoria;
        } else if (this.activePlayerSlot === 2) {
            this.newReserva.jugador2_id = user.id;
            this.newReserva.nombre_externo2 = user.nombre;
            this.newReserva.categoria2 = user.categoria;
        } else if (this.activePlayerSlot === 3) {
            this.newReserva.jugador3_id = user.id;
            this.newReserva.nombre_externo3 = user.nombre;
            this.newReserva.categoria3 = user.categoria;
        } else if (this.activePlayerSlot === 4) {
            this.newReserva.jugador4_id = user.id;
            this.newReserva.nombre_externo4 = user.nombre;
            this.newReserva.categoria4 = user.categoria;
        }
        this.filteredUsers = [];
    }

    isSaving: boolean = false;

    crearReserva() {
        if (!this.newReserva.hora_inicio || this.newReserva.hora_inicio === '00:00') {
            this.newReserva.hora_inicio = '08:00';
        }
        if (!this.newReserva.cancha_id || !this.newReserva.hora_inicio) {
            Swal.fire({
                title: 'Horario incompleto',
                text: 'Por favor, selecciona una cancha y hora válida.',
                icon: 'warning',
                confirmButtonColor: '#111'
            });
            return;
        }

        // Si es una reserva normal (Confirmada) o Entrenamiento, validamos jugador/nombre. Si es Bloqueo, no hace falta.
        if ((this.newReserva.estado === 'Confirmada' || this.newReserva.estado === 'Entrenamiento') && !this.newReserva.nombre_externo && !this.newReserva.jugador_id) {
            Swal.fire({
                title: 'Faltan datos',
                text: 'Debes ingresar al menos el Jugador 1 o Nombre para la reserva.',
                icon: 'info',
                confirmButtonColor: '#111'
            });
            return;
        }

        // Para bloqueos administrativos
        if (this.newReserva.estado === 'Bloqueada') {
            this.newReserva.nombre_externo = 'BLOQUEO ADMINISTRATIVO';
            this.newReserva.jugador_id = null;
            this.newReserva.jugador2_id = null;
            this.newReserva.jugador3_id = null;
            this.newReserva.jugador4_id = null;
            this.newReserva.precio = 0;

            if (this.newReserva.tipo_bloqueo === 'dia_completo') {
                this.newReserva.hora_inicio = '07:00';
                this.newReserva.hora_fin = '23:59';
                this.newReserva.duracion = 1019;
            } else {
                if (!this.newReserva.hora_inicio) {
                    this.newReserva.hora_inicio = '08:00';
                }
                if (this.newReserva.hora_fin_bloqueo) {
                    this.newReserva.hora_fin = this.newReserva.hora_fin_bloqueo;
                    const [hS, mS] = this.newReserva.hora_inicio.split(':').map(Number);
                    const [hE, mE] = this.newReserva.hora_fin_bloqueo.split(':').map(Number);
                    let diff = (hE * 60 + mE) - (hS * 60 + mS);
                    if (diff <= 0) diff = 60;
                    this.newReserva.duracion = diff;
                } else {
                    const [h, m] = this.newReserva.hora_inicio.split(':').map(Number);
                    let totalMinutes = h * 60 + m + Number(this.newReserva.duracion || 60);
                    let endH = Math.floor(totalMinutes / 60);
                    let endM = totalMinutes % 60;
                    this.newReserva.hora_fin = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
                }
            }
        } else {
            // Calcular hora_fin para reservas normales
            const [h, m] = this.newReserva.hora_inicio.split(':');
            let totalMinutes = parseInt(h) * 60 + parseInt(m) + Number(this.newReserva.duracion);
            let endH = Math.floor(totalMinutes / 60);
            let endM = totalMinutes % 60;
            this.newReserva.hora_fin = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
        }

        this.isSaving = true;
        
        // Si hay un tarro de pelotas seleccionado pero no se presionó el botón secundario "Agregar Pelotas", asignarlo automáticamente
        if (this.selectedBallProductId && !this.pendingTarroPelotas && this.selectedBallProduct) {
            this.pendingTarroPelotas = {
                producto: this.selectedBallProduct,
                split: this.splitBallBetween4
            };
        }

        // Si se va a dividir las pelotas entre 4, asegurar que los slots 2, 3 y 4 estén activos en la reserva
        if (this.pendingTarroPelotas && this.pendingTarroPelotas.split) {
            this.setPaymentMethod('proporcional');
            if (!this.newReserva.nombre_externo2 && !this.newReserva.jugador2_id) this.newReserva.nombre_externo2 = 'Jugador 2';
            if (!this.newReserva.nombre_externo3 && !this.newReserva.jugador3_id) this.newReserva.nombre_externo3 = 'Jugador 3';
            if (!this.newReserva.nombre_externo4 && !this.newReserva.jugador4_id) this.newReserva.nombre_externo4 = 'Jugador 4';
        }

        // Recalcular el estado 'pagado' global de forma estricta
        let isFullyPaid = Number(this.newReserva.pagado) === 1;
        if (this.newReserva.metodo_pago === 'proporcional') {
            let activos = 0;
            let pagadosCount = 0;
            
            if (this.newReserva.nombre_externo || this.newReserva.jugador_id) { activos++; if(this.newReserva.pagos.p1) pagadosCount++; }
            if (this.newReserva.nombre_externo2 || this.newReserva.jugador2_id) { activos++; if(this.newReserva.pagos.p2) pagadosCount++; }
            if (this.newReserva.nombre_externo3 || this.newReserva.jugador3_id) { activos++; if(this.newReserva.pagos.p3) pagadosCount++; }
            if (this.newReserva.nombre_externo4 || this.newReserva.jugador4_id) { activos++; if(this.newReserva.pagos.p4) pagadosCount++; }

            isFullyPaid = (activos > 0 && pagadosCount === activos);
        }

        const currentUserStr = localStorage.getItem('currentUser');
        const currentUserObj = currentUserStr ? JSON.parse(currentUserStr) : {};
        const loggedInUserId = this.userId || localStorage.getItem('userId') || currentUserObj.id || 0;

        const reservaData = {
            ...this.newReserva,
            vendedor_id: Number(loggedInUserId),
            usuario_vendedor_id: Number(loggedInUserId),
            pagado: isFullyPaid ? 1 : 0,
            pago_p1: this.newReserva.pagos.p1 ? 1 : 0,
            pago_p2: this.newReserva.pagos.p2 ? 1 : 0,
            pago_p3: this.newReserva.pagos.p3 ? 1 : 0,
            pago_p4: this.newReserva.pagos.p4 ? 1 : 0
        };

        const action = this.newReserva.id ? this.clubesService.updateReserva(reservaData) : this.clubesService.addReserva(reservaData);

        action.subscribe({
            next: (res) => {
                if (res.success) {
                    const createdReservaId = res.id || this.newReserva.id;

                    if (this.pendingTarroPelotas && createdReservaId) {
                        const prod = this.pendingTarroPelotas.producto;
                        const total = Number(prod.precio_venta || 0);

                        if (this.pendingTarroPelotas.split) {
                            const cadaUno = Math.round(total / 4);
                            let countFinished = 0;
                            [1, 2, 3, 4].forEach(pNum => {
                                this.inventarioService.addConsumoReserva({
                                    reserva_id: createdReservaId,
                                    jugador_n: pNum,
                                    producto_id: prod.id,
                                    cantidad: 0.25,
                                    precio_unitario: total,
                                    subtotal: cadaUno
                                }).subscribe(() => {
                                    countFinished++;
                                    if (countFinished === 4) {
                                        this.loadReservas();
                                    }
                                });
                            });
                        } else {
                            this.inventarioService.addConsumoReserva({
                                reserva_id: createdReservaId,
                                jugador_n: 1,
                                producto_id: prod.id,
                                cantidad: 1,
                                precio_unitario: total,
                                subtotal: total
                            }).subscribe(() => {
                                this.loadReservas();
                            });
                        }
                        this.pendingTarroPelotas = null;
                    }

                    if (res.warning) {
                        Swal.fire({
                            title: 'Reserva Guardada',
                            text: 'La reserva se guardó, pero hubo un detalle con el inventario: ' + res.warning,
                            icon: 'warning',
                            confirmButtonColor: '#0f172a'
                        });
                    } else {
                        Swal.fire({
                            title: '¡Éxito!',
                            text: this.newReserva.id ? 'Reserva actualizada correctamente' : 'Reserva creada correctamente',
                            icon: 'success',
                            confirmButtonColor: '#0f172a'
                        });
                    }
                    this.showAddForm = false;
                    this.loadReservas();
                }
                this.isSaving = false;
                this.resetForm();
            },
            error: (err) => {
                this.isSaving = false;
                console.error('Error capturado:', err);
                
                let message = 'No se pudo guardar la reserva';
                if (err.status === 409) {
                    message = 'La cancha ya se encuentra reservada en este intervalo.';
                    Swal.fire('Choque de Horario', message, 'error');
                } else {
                    if (typeof err.error === 'string') {
                        message = err.error;
                    } else if (err.error && err.error.error) {
                        message = err.error.error;
                    } else if (err.message) {
                        message = err.message;
                    }
                    Swal.fire('Error', String(message), 'error');
                }
            }
        });
    }

    togglePlayerPayment(i: number): void {
        if (!this.newReserva.pagos) {
            this.newReserva.pagos = { p1: false, p2: false, p3: false, p4: false };
        }
        const key = 'p' + i;
        this.newReserva.pagos[key] = !this.newReserva.pagos[key];
        this.newReserva['pago_p' + i] = this.newReserva.pagos[key] ? 1 : 0;

        let activos = 0;
        let pagados = 0;
        if (this.newReserva.nombre_externo || this.newReserva.jugador_id || this.newReserva.usuario_id) { activos++; if (this.newReserva.pagos.p1) pagados++; }
        if (this.newReserva.nombre_externo2 || this.newReserva.jugador2_id) { activos++; if (this.newReserva.pagos.p2) pagados++; }
        if (this.newReserva.nombre_externo3 || this.newReserva.jugador3_id) { activos++; if (this.newReserva.pagos.p3) pagados++; }
        if (this.newReserva.nombre_externo4 || this.newReserva.jugador4_id) { activos++; if (this.newReserva.pagos.p4) pagados++; }

        if (activos > 0 && pagados === activos) {
            this.newReserva.pagado = 1;
        } else {
            this.newReserva.pagado = 0;
        }
    }

    realizarPagoCompleto(): void {
        Swal.fire({
            title: '💳 Realizar Pago Completo',
            text: 'Selecciona el medio de pago para registrar esta venta:',
            icon: 'question',
            showCancelButton: true,
            showDenyButton: true,
            confirmButtonText: '💵 Efectivo',
            denyButtonText: '💳 Tarjeta',
            cancelButtonText: '🏦 Transferencia',
            confirmButtonColor: '#10b981',
            denyButtonColor: '#2563eb',
            cancelButtonColor: '#7c3aed'
        }).then((result) => {
            let selectedMethod = 'Efectivo';
            if (result.isConfirmed) {
                selectedMethod = 'Efectivo';
            } else if (result.isDenied) {
                selectedMethod = 'Tarjeta';
            } else if (result.dismiss === Swal.DismissReason.cancel) {
                selectedMethod = 'Transferencia';
            } else {
                return; // Modal cerrado
            }

            this.newReserva.metodo_pago = selectedMethod;
            this.newReserva.pagado = 1;
            this.newReserva.pago_p1 = 1;
            this.newReserva.pago_p2 = 1;
            this.newReserva.pago_p3 = 1;
            this.newReserva.pago_p4 = 1;
            this.newReserva.pagos = { p1: true, p2: true, p3: true, p4: true };
            this.crearReserva();
        });
    }

    onSplitBallChange() {
        if (this.splitBallBetween4) {
            this.setPaymentMethod('proporcional');
            if (!this.newReserva.nombre_externo2 && !this.newReserva.jugador2_id) this.newReserva.nombre_externo2 = 'Jugador 2';
            if (!this.newReserva.nombre_externo3 && !this.newReserva.jugador3_id) this.newReserva.nombre_externo3 = 'Jugador 3';
            if (!this.newReserva.nombre_externo4 && !this.newReserva.jugador4_id) this.newReserva.nombre_externo4 = 'Jugador 4';
        }
    }

    get hasSplitBallConsumos(): boolean {
        if (!this.currentConsumos || this.currentConsumos.length === 0) return false;
        return this.currentConsumos.some(c => {
            const pId = Number(c.producto_id);
            return this.ballProducts.some(bp => Number(bp.id) === pId);
        });
    }

    quitarDivisionPelotas() {
        if (this.pendingTarroPelotas) {
            this.pendingTarroPelotas = null;
        }

        if (this.newReserva && this.newReserva.id && this.currentConsumos.length > 0) {
            const splitBallConsumos = this.currentConsumos.filter(c => {
                const pId = Number(c.producto_id);
                return this.ballProducts.some(bp => Number(bp.id) === pId);
            });

            if (splitBallConsumos.length > 0) {
                Swal.fire({
                    title: '¿Quitar pelotas de la reserva?',
                    text: 'Se eliminarán los cobros de pelotas cargados a los jugadores.',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Sí, quitar pelotas',
                    cancelButtonText: 'Cancelar',
                    confirmButtonColor: '#ef4444'
                }).then((result) => {
                    if (result.isConfirmed) {
                        let deletedCount = 0;
                        splitBallConsumos.forEach(c => {
                            this.inventarioService.deleteConsumo(c.id).subscribe(() => {
                                deletedCount++;
                                if (deletedCount === splitBallConsumos.length) {
                                    this.loadConsumos(this.newReserva.id);
                                    Swal.fire('Pelotas Eliminadas', 'Se quitaron las pelotas cargadas a los jugadores.', 'success');
                                }
                            });
                        });
                    }
                });
            } else {
                this.selectedBallProductId = null;
            }
        } else {
            this.selectedBallProductId = null;
        }
    }

    onBallProductChange() {
        if (this.selectedBallProductId && this.splitBallBetween4) {
            this.onSplitBallChange();
        }
    }

    addTarroPelotasToReserva() {
        const prod = this.selectedBallProduct;
        if (!prod) {
            Swal.fire('Atención', 'Selecciona un tarro de pelotas del catálogo.', 'warning');
            return;
        }

        if (this.splitBallBetween4) {
            this.onSplitBallChange();
        }

        const total = Number(prod.precio_venta || 0);

        if (this.newReserva.id) {
            if (this.splitBallBetween4) {
                const cadaUno = Math.round(total / 4);
                let count = 0;
                [1, 2, 3, 4].forEach(pNum => {
                    const data = {
                        reserva_id: this.newReserva.id,
                        jugador_n: pNum,
                        producto_id: prod.id,
                        cantidad: 0.25,
                        precio_unitario: total,
                        subtotal: cadaUno
                    };
                    this.inventarioService.addConsumoReserva(data).subscribe(() => {
                        count++;
                        if (count === 4) {
                            this.loadConsumos(this.newReserva.id);
                            Swal.fire('Pelotas Agregadas', `Se dividió "${prod.nombre}" en $${cadaUno.toLocaleString('es-CL')} para los 4 jugadores.`, 'success');
                        }
                    });
                });
            } else {
                const data = {
                    reserva_id: this.newReserva.id,
                    jugador_n: 1,
                    producto_id: prod.id,
                    cantidad: 1,
                    precio_unitario: total,
                    subtotal: total
                };
                this.inventarioService.addConsumoReserva(data).subscribe((res: any) => {
                    if (res.success) {
                        this.loadConsumos(this.newReserva.id);
                        Swal.fire('Pelotas Agregadas', `Se cargó "${prod.nombre}" ($${total.toLocaleString('es-CL')}) al Jugador 1.`, 'success');
                    }
                });
            }
        } else {
            if (this.splitBallBetween4) {
                const cadaUno = Math.round(total / 4);
                this.pendingTarroPelotas = { producto: prod, split: true };
                Swal.fire('Pelotas Seleccionadas', `"${prod.nombre}" se dividirá entre los 4 jugadores ($${cadaUno.toLocaleString('es-CL')} c/u) al guardar la reserva.`, 'info');
            } else {
                this.pendingTarroPelotas = { producto: prod, split: false };
                Swal.fire('Pelotas Seleccionadas', `"${prod.nombre}" ($${total.toLocaleString('es-CL')}) se cargará al Jugador 1 al guardar la reserva.`, 'info');
            }
        }
    }

    eliminarReserva() {
        if (!this.newReserva.id) return;

        Swal.fire({
            title: '¿Eliminar reserva?',
            text: 'Esta acción no se puede deshacer',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#ef4444'
        }).then((result) => {
            if (result.isConfirmed) {
                this.isSaving = true;
                this.clubesService.cancelReserva(this.newReserva.id).subscribe({
                    next: () => {
                        this.isSaving = false;
                        this.showAddForm = false;
                        this.loadReservas();
                        Swal.fire('Eliminada', 'La reserva ha sido eliminada', 'success');
                    },
                    error: () => {
                        this.isSaving = false;
                        Swal.fire('Error', 'No se pudo eliminar', 'error');
                    }
                });
            }
        });
    }

    resetForm() {
        this.newReserva = {
            id: null,
            cancha_id: this.canchas[0]?.id || 0,
            duracion: 90,
            jugador_id: 0,
            jugador2_id: 0,
            jugador3_id: 0,
            jugador4_id: 0,
            nombre_externo: '',
            nombre_externo2: '',
            nombre_externo3: '',
            nombre_externo4: '',
            fecha: this.selectedFecha,
            hora_inicio: '',
            hora_fin: '',
            precio: 0,
            pagado: 0, // Inicia en 0 (Debe)
            estado: 'Confirmada',
            metodo_pago: 'total',
            pagos: { p1: false, p2: false, p3: false, p4: false }, // Todos en Debe
            tipo_bloqueo: 'dia_completo',
            hora_fin_bloqueo: '23:59'
        };
        this.updateCanchaPrice();
        this.userSearchTerm = '';
        this.activePlayerSlot = 1;
        this.selectedBallProductId = null;
        this.splitBallBetween4 = true;
        this.pendingTarroPelotas = null;
    }

    onFechaChange() {
        this.newReserva.fecha = this.selectedFecha;
        this.generateCurrentWeek();
        this.loadReservas();
    }

    selectWeekDay(day: string) {
        this.selectedFecha = day;
        this.onFechaChange();
    }

    prevWeek() {
        if (!this.selectedFecha) return;
        const current = new Date(this.selectedFecha + 'T12:00:00');
        current.setDate(current.getDate() - 7);
        this.selectedFecha = this.getLocalISODate(current);
        this.onFechaChange();
    }

    nextWeek() {
        if (!this.selectedFecha) return;
        const current = new Date(this.selectedFecha + 'T12:00:00');
        current.setDate(current.getDate() + 7);
        this.selectedFecha = this.getLocalISODate(current);
        this.onFechaChange();
    }
    setPaymentMethod(metodo: 'total' | 'proporcional') {
        this.newReserva.metodo_pago = metodo;
        if (metodo === 'proporcional') {
            if (!this.newReserva.nombre_externo2 && !this.newReserva.jugador2_id) this.newReserva.nombre_externo2 = 'Jugador 2';
            if (!this.newReserva.nombre_externo3 && !this.newReserva.jugador3_id) this.newReserva.nombre_externo3 = 'Jugador 3';
            if (!this.newReserva.nombre_externo4 && !this.newReserva.jugador4_id) this.newReserva.nombre_externo4 = 'Jugador 4';
        }
    }

    // CONSUMOS METHODS
    openConsumo(reserva: any, playerN: number) {
        this.activeReservaConsumo = reserva;
        this.activePlayerN = playerN;
        this.searchConsumoProductTerm = '';
        this.loadProductos();
        this.loadConsumos(reserva.id);
        this.showConsumoModal = true;
    }

    loadProductos() {
        if (!this.selectedClub) return;
        this.inventarioService.getProductos(this.selectedClub.id).subscribe(res => {
            if (res.success) this.productos = res.productos;
        });
    }

    loadConsumos(reservaId: number) {
        this.inventarioService.getConsumosReserva(reservaId).subscribe(res => {
            if (res.success) this.currentConsumos = res.consumos;
        });
    }

    addConsumo(producto: any) {
        if (!this.activeReservaConsumo) return;
        
        const data = {
            reserva_id: this.activeReservaConsumo.id,
            jugador_n: this.activePlayerN,
            producto_id: producto.id,
            cantidad: 1
        };

        this.inventarioService.addConsumoReserva(data).subscribe(res => {
            if (res.success) {
                this.loadConsumos(this.activeReservaConsumo.id);
                // Mini feedback (Toast) o nada para que sea fluido
            }
        });
    }

    removeConsumo(consumoId: number) {
        Swal.fire({
            title: '¿Quitar este consumo?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, quitar',
            cancelButtonText: 'No'
        }).then(result => {
            if (result.isConfirmed) {
                this.inventarioService.deleteConsumo(consumoId).subscribe(res => {
                    if (res.success) {
                        this.loadConsumos(this.activeReservaConsumo.id);
                    }
                });
            }
        });
    }

    getJugadorTotalConsumo(playerN: number): number {
        return this.currentConsumos
            .filter(c => Number(c.jugador_n) === Number(playerN))
            .reduce((sum, c) => sum + Number(c.subtotal), 0);
    }

    getReservaTotalConsumo(): number {
        return this.currentConsumos.reduce((sum, c) => sum + Number(c.subtotal), 0);
    }

    getConsumosByPlayer(playerN: number): any[] {
        return this.currentConsumos.filter(c => Number(c.jugador_n) === Number(playerN));
    }

    // WhatsApp Free Slots Methods
    openWhatsAppModal() {
        if (!this.selectedClub) return;
        
        this.whatsappDays = this.weekDays.map(d => ({
            full: d.full,
            name: `${d.short.toUpperCase()} ${d.num}`,
            selected: d.full === this.selectedFecha
        }));

        this.whatsappCanchas = this.canchas.map(c => ({
            id: c.id,
            nombre: c.nombre,
            selected: true
        }));

        this.whatsappStartHour = '16:00';
        this.whatsappEndHour = '23:00';
        this.whatsappGeneratedMessage = '';
        this.showWhatsAppModal = true;
    }

    generateWhatsAppMessage() {
        const selectedDays = this.whatsappDays.filter(d => d.selected);
        const selectedCanchas = this.whatsappCanchas.filter(c => c.selected);

        if (selectedDays.length === 0) {
            Swal.fire('Atención', 'Selecciona al menos un día para informar.', 'warning');
            return;
        }
        if (selectedCanchas.length === 0) {
            Swal.fire('Atención', 'Selecciona al menos una cancha.', 'warning');
            return;
        }

        this.whatsappLoading = true;
        
        const calls = selectedDays.map(d => 
            this.clubesService.getClubReservas(this.selectedClub.id, d.full)
        );

        forkJoin(calls).subscribe({
            next: (results: any[][]) => {
                this.whatsappLoading = false;
                
                let message = `*🏆 HORARIOS DISPONIBLES - ${this.selectedClub.nombre.toUpperCase()} 🏆*\n`;
                message += `_¡Reserva tu partido ahora!_\n\n`;

                const [startH, startM] = this.whatsappStartHour.split(':').map(Number);
                const startMinutesLimit = startH * 60 + startM;

                const [endH, endM] = this.whatsappEndHour.split(':').map(Number);
                const endMinutesLimit = endH * 60 + endM;

                selectedDays.forEach((day, index) => {
                    const dayReservas = results[index] || [];
                    message += `*📅 ${day.name}*\n`;

                    let dayHasAvailability = false;

                    selectedCanchas.forEach(cancha => {
                        const freeSlots: number[] = [];
                        
                        for (let minutes = startMinutesLimit; minutes < endMinutesLimit; minutes += 30) {
                            const slotEnd = minutes + 30;

                            const isOccupied = dayReservas.some(r => {
                                if (Number(r.cancha_id) !== Number(cancha.id)) return false;
                                if (r.estado === 'Cancelada') return false;

                                const [hStart, mStart] = r.hora_inicio.split(':').map(Number);
                                const startMinutes = hStart * 60 + mStart;

                                const [hEnd, mEnd] = r.hora_fin.split(':').map(Number);
                                const endMinutes = hEnd * 60 + mEnd;

                                return startMinutes < slotEnd && endMinutes > minutes;
                            });

                            if (!isOccupied) {
                                freeSlots.push(minutes);
                            }
                        }

                        const blocks: { start: number, end: number }[] = [];
                        if (freeSlots.length > 0) {
                            let blockStart = freeSlots[0];
                            let expectedNext = blockStart + 30;

                            for (let i = 1; i < freeSlots.length; i++) {
                                if (freeSlots[i] === expectedNext) {
                                    expectedNext += 30;
                                } else {
                                    blocks.push({ start: blockStart, end: expectedNext });
                                    blockStart = freeSlots[i];
                                    expectedNext = blockStart + 30;
                                }
                            }
                            blocks.push({ start: blockStart, end: expectedNext });
                        }

                        // Filter blocks that are at least 60 minutes long
                        const validBlocks = blocks.filter(b => (b.end - b.start) >= 60);

                        if (validBlocks.length > 0) {
                            dayHasAvailability = true;
                            const blockTexts = validBlocks.map(b => {
                                const sh = Math.floor(b.start / 60).toString().padStart(2, '0');
                                const sm = (b.start % 60).toString().padStart(2, '0');
                                const eh = Math.floor(b.end / 60).toString().padStart(2, '0');
                                const em = (b.end % 60).toString().padStart(2, '0');
                                return `${sh}:${sm} a ${eh}:${em}`;
                            });
                            message += `• *${cancha.nombre}:* ${blockTexts.join(' | ')}\n`;
                        }
                    });

                    if (!dayHasAvailability) {
                        message += `• _Sin horarios disponibles en este rango_\n`;
                    }
                    message += `\n`;
                });

                message += `📱 *Reserva vía web o al whatsapp.*\n`;
                this.whatsappGeneratedMessage = message;
            },
            error: (err) => {
                this.whatsappLoading = false;
                console.error(err);
                Swal.fire('Error', 'No se pudieron consultar los horarios de reserva.', 'error');
            }
        });
    }

    copyWhatsAppMessage() {
        if (!this.whatsappGeneratedMessage) return;
        navigator.clipboard.writeText(this.whatsappGeneratedMessage).then(() => {
            Swal.fire({
                icon: 'success',
                title: 'Mensaje Copiado',
                text: 'El mensaje ha sido copiado al portapapeles.',
                timer: 1500,
                showConfirmButton: false
            });
        });
    }

    sendWhatsAppMessage() {
        if (!this.whatsappGeneratedMessage) return;
        const encodedText = encodeURIComponent(this.whatsappGeneratedMessage);
        const url = `https://api.whatsapp.com/send?text=${encodedText}`;
        window.open(url, '_blank');
    }
}
