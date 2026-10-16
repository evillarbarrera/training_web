import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ClubesService } from '../../services/clubes.service';
import { ApiService } from '../../services/api.service';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import Swal from 'sweetalert2';

export interface CalendarDay {
    date: string;          // YYYY-MM-DD
    dayNumber: number;
    isCurrentMonth: boolean;
    isToday: boolean;
    isPast: boolean;
    turnos: any[];
}

@Component({
    selector: 'app-club-turnos',
    standalone: true,
    imports: [CommonModule, FormsModule, SidebarComponent],
    templateUrl: './club-turnos.component.html',
    styleUrls: ['./club-turnos.component.scss']
})
export class ClubTurnosComponent implements OnInit {
    userId: number | null = null;
    userName: string = '';
    userFoto: string | null = null;
    userRole: any = 'administrador_club';

    clubes: any[] = [];
    selectedClub: any = null;
    staffList: any[] = [];
    turnos: any[] = [];

    isLoading: boolean = true;
    isLoadingTurnos: boolean = false;
    isSaving: boolean = false;

    // View control
    activeView: 'mes' | 'semana' | 'lista' = 'mes';
    selectedMonth: number = new Date().getMonth(); // 0-11
    selectedYear: number = new Date().getFullYear();
    selectedStaffFilter: string = 'all';
    selectedPaymentFilter: 'all' | 'pagado' | 'pendiente' = 'all';
    isTopPanelsCollapsed: boolean = false;

    monthNames: string[] = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    weekDays: string[] = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    calendarDays: CalendarDay[] = [];
    todayTurnos: any[] = [];
    staffStats: any[] = [];
    paymentStats = {
        totalTurnos: 0,
        pagadosCount: 0,
        pendientesCount: 0,
        totalMontoPagado: 0,
        totalMontoPendiente: 0
    };

    // Modal state
    showModal: boolean = false;
    editingTurnoId: number | null = null;
    isManualStaffInput: boolean = false;

    // Drag & Drop state
    draggedStaff: any = null;
    dragOverDate: string | null = null;
    showQuickModal: boolean = false;
    quickTurno: any = null;

    modalTurno: any = {
        id: null,
        club_id: 0,
        usuario_id: null,
        nombre_responsable: '',
        email: '',
        telefono: '',
        fecha: '',
        tipo_turno: 'Día Completo',
        hora_inicio: '08:00',
        hora_fin: '23:30',
        rol_turno: 'Encargado de Turno',
        color: '#10b981',
        notas: '',
        estado: 'Programado',
        pagado: false,
        monto_pago: null,
        metodo_pago: 'Transferencia'
    };

    colorPalette: string[] = [
        '#10b981', // Verde Esmeralda
        '#3b82f6', // Azul Eléctrico
        '#8b5cf6', // Púrpura Vibrante
        '#f59e0b', // Ámbar / Naranja
        '#ef4444', // Rojo Coral
        '#06b6d4', // Cyan Brillante
        '#ec4899', // Rosa Intenso
        '#6366f1'  // Índigo
    ];

    rolesDisponibles: string[] = [
        'Encargado de Turno',
        'Recepción y Ventas',
        'Apertura de Club',
        'Cierre y Cuadratura',
        'Canchero / Mantenimiento',
        'Staff de Apoyo'
    ];

    constructor(
        private clubesService: ClubesService,
        private apiService: ApiService,
        private router: Router,
        private cdr: ChangeDetectorRef
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

        const collapsedPref = localStorage.getItem('clubTurnos_collapsed');
        this.isTopPanelsCollapsed = collapsedPref === '1';

        this.buildCalendar();
        this.loadProfileData();
        this.loadClubes();
    }

    loadProfileData(): void {
        if (!this.userId) return;
        this.apiService.getPerfil(this.userId).subscribe(res => {
            if (res && res.success && res.user) {
                this.userFoto = res.user.foto_perfil || this.userFoto;
                this.userName = res.user.nombre || this.userName;
            }
        });
    }

    loadClubes(): void {
        if (!this.userId) return;
        this.isLoading = true;
        this.clubesService.getClubes(this.userId).subscribe({
            next: (res) => {
                this.clubes = res || [];
                if (this.clubes.length > 0) {
                    const storedClubId = localStorage.getItem('selectedClubId');
                    const storedUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
                    const preferredClubId = storedClubId || storedUser?.club_id;
                    if (preferredClubId) {
                        const match = this.clubes.find(c => Number(c.id) === Number(preferredClubId));
                        this.selectedClub = match || this.clubes[0];
                    } else {
                        this.selectedClub = this.clubes[0];
                    }
                    this.onClubChange();
                } else {
                    this.isLoading = false;
                    this.isLoadingTurnos = false;
                }
            },
            error: (err) => {
                console.error('Error cargando clubes', err);
                this.isLoading = false;
                this.isLoadingTurnos = false;
            }
        });
    }

    onClubChange(): void {
        if (!this.selectedClub) return;
        localStorage.setItem('selectedClubId', this.selectedClub.id.toString());
        this.loadStaff();
        this.loadTurnos();
    }

    loadStaff(): void {
        if (!this.selectedClub) return;
        this.clubesService.getClubStaff(this.selectedClub.id).subscribe({
            next: (staff) => {
                this.staffList = staff || [];
            },
            error: (err) => {
                console.error('Error cargando staff', err);
                this.staffList = [];
            }
        });
    }

    loadTurnos(): void {
        if (!this.selectedClub) return;
        this.isLoadingTurnos = true;

        const mesNum = this.selectedMonth + 1;
        const anioNum = this.selectedYear;

        this.clubesService.getClubTurnos(this.selectedClub.id, undefined, undefined, mesNum, anioNum).subscribe({
            next: (res) => {
                this.turnos = res?.turnos || [];
                this.buildCalendar();
                this.computeTodayTurnos();
                this.computeStaffStats();
                this.isLoadingTurnos = false;
                this.isLoading = false;
            },
            error: (err) => {
                console.error('Error cargando turnos', err);
                this.turnos = [];
                this.buildCalendar();
                this.isLoadingTurnos = false;
                this.isLoading = false;
            }
        });
    }

    buildCalendar(): void {
        const year = this.selectedYear;
        const month = this.selectedMonth;

        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);

        // En JS: 0=Domingo, 1=Lunes, ..., 6=Sábado. Convertimos a Lunes=0 ... Domingo=6
        let firstDayIndex = firstDayOfMonth.getDay() - 1;
        if (firstDayIndex < 0) firstDayIndex = 6;

        const totalDaysCurrentMonth = lastDayOfMonth.getDate();
        const prevMonthLastDay = new Date(year, month, 0).getDate();

        const todayStr = this.formatDateISO(new Date());
        const days: CalendarDay[] = [];

        // Días previos del mes anterior para rellenar la primera fila
        for (let i = firstDayIndex - 1; i >= 0; i--) {
            const d = prevMonthLastDay - i;
            const prevMonthDate = new Date(year, month - 1, d);
            const dateStr = this.formatDateISO(prevMonthDate);
            days.push({
                date: dateStr,
                dayNumber: d,
                isCurrentMonth: false,
                isToday: dateStr === todayStr,
                isPast: dateStr < todayStr,
                turnos: this.getTurnosForDate(dateStr)
            });
        }

        // Días del mes actual
        for (let d = 1; d <= totalDaysCurrentMonth; d++) {
            const currDate = new Date(year, month, d);
            const dateStr = this.formatDateISO(currDate);
            days.push({
                date: dateStr,
                dayNumber: d,
                isCurrentMonth: true,
                isToday: dateStr === todayStr,
                isPast: dateStr < todayStr,
                turnos: this.getTurnosForDate(dateStr)
            });
        }

        // Días posteriores del siguiente mes para completar las 6 filas (42 celdas) o al menos completar la última semana
        const remainingCells = (7 - (days.length % 7)) % 7;
        for (let d = 1; d <= remainingCells; d++) {
            const nextMonthDate = new Date(year, month + 1, d);
            const dateStr = this.formatDateISO(nextMonthDate);
            days.push({
                date: dateStr,
                dayNumber: d,
                isCurrentMonth: false,
                isToday: dateStr === todayStr,
                isPast: dateStr < todayStr,
                turnos: this.getTurnosForDate(dateStr)
            });
        }

        this.calendarDays = days;
    }

    getTurnosForDate(dateStr: string): any[] {
        if (!this.turnos || this.turnos.length === 0) return [];
        return this.turnos.filter(t => {
            if (t.fecha !== dateStr) return false;
            if (this.selectedStaffFilter !== 'all') {
                if (this.selectedStaffFilter.startsWith('user_')) {
                    const uId = Number(this.selectedStaffFilter.replace('user_', ''));
                    if (Number(t.usuario_id) !== uId) return false;
                } else {
                    if (t.nombre_responsable !== this.selectedStaffFilter) return false;
                }
            }
            if (this.selectedPaymentFilter === 'pagado') {
                if (Number(t.pagado) !== 1) return false;
            } else if (this.selectedPaymentFilter === 'pendiente') {
                if (Number(t.pagado) === 1) return false;
            }
            return true;
        });
    }

    computeTodayTurnos(): void {
        const todayStr = this.formatDateISO(new Date());
        this.todayTurnos = (this.turnos || []).filter(t => t.fecha === todayStr);
    }

    computeStaffStats(): void {
        const map = new Map<string, { name: string; count: number; pagados: number; pendientes: number; totalMonto: number; color: string; foto: string | null }>();
        
        let totalTurnos = 0;
        let pagadosCount = 0;
        let pendientesCount = 0;
        let totalMontoPagado = 0;
        let totalMontoPendiente = 0;

        for (const t of this.turnos || []) {
            totalTurnos++;
            const isPagado = Number(t.pagado) === 1;
            const monto = Number(t.monto_pago) || 0;

            if (isPagado) {
                pagadosCount++;
                totalMontoPagado += monto;
            } else {
                pendientesCount++;
                totalMontoPendiente += monto;
            }

            const key = t.nombre_responsable || 'Sin Asignar';
            if (!map.has(key)) {
                map.set(key, {
                    name: key,
                    count: 0,
                    pagados: 0,
                    pendientes: 0,
                    totalMonto: 0,
                    color: t.color || '#10b981',
                    foto: t.foto || null
                });
            }
            const item = map.get(key)!;
            item.count++;
            if (isPagado) {
                item.pagados++;
                item.totalMonto += monto;
            } else {
                item.pendientes++;
            }
        }
        this.staffStats = Array.from(map.values()).sort((a, b) => b.count - a.count);
        this.paymentStats = {
            totalTurnos,
            pagadosCount,
            pendientesCount,
            totalMontoPagado,
            totalMontoPendiente
        };
    }

    get filteredTurnosList(): any[] {
        if (!this.turnos || this.turnos.length === 0) return [];
        let list = [...this.turnos];
        if (this.selectedStaffFilter !== 'all') {
            if (this.selectedStaffFilter.startsWith('user_')) {
                const uId = Number(this.selectedStaffFilter.replace('user_', ''));
                list = list.filter(t => Number(t.usuario_id) === uId);
            } else {
                list = list.filter(t => t.nombre_responsable === this.selectedStaffFilter);
            }
        }
        if (this.selectedPaymentFilter === 'pagado') {
            list = list.filter(t => Number(t.pagado) === 1);
        } else if (this.selectedPaymentFilter === 'pendiente') {
            list = list.filter(t => Number(t.pagado) !== 1);
        }
        return list.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.hora_inicio.localeCompare(b.hora_inicio));
    }

    toggleTopPanels(): void {
        this.isTopPanelsCollapsed = !this.isTopPanelsCollapsed;
        localStorage.setItem('clubTurnos_collapsed', this.isTopPanelsCollapsed ? '1' : '0');
    }

    // Navegación de Fechas
    prevMonth(): void {
        if (this.selectedMonth === 0) {
            this.selectedMonth = 11;
            this.selectedYear--;
        } else {
            this.selectedMonth--;
        }
        this.loadTurnos();
    }

    nextMonth(): void {
        if (this.selectedMonth === 11) {
            this.selectedMonth = 0;
            this.selectedYear++;
        } else {
            this.selectedMonth++;
        }
        this.loadTurnos();
    }

    goToToday(): void {
        const now = new Date();
        this.selectedMonth = now.getMonth();
        this.selectedYear = now.getFullYear();
        this.loadTurnos();
    }

    // Modal Actions
    openCreateModal(dateStr?: string): void {
        if (!this.selectedClub) {
            Swal.fire('Atención', 'Selecciona primero un club', 'warning');
            return;
        }

        const defaultDate = dateStr || this.formatDateISO(new Date());
        this.editingTurnoId = null;
        this.modalTurno = {
            id: null,
            club_id: this.selectedClub.id,
            usuario_id: null,
            nombre_responsable: '',
            email: '',
            telefono: '',
            fecha: defaultDate,
            tipo_turno: 'Día Completo',
            hora_inicio: '08:00',
            hora_fin: '23:30',
            rol_turno: 'Encargado de Turno',
            color: this.colorPalette[Math.floor(Math.random() * this.colorPalette.length)],
            notas: '',
            estado: 'Programado',
            pagado: false,
            monto_pago: null,
            metodo_pago: 'Transferencia'
        };

        if (this.staffList && this.staffList.length > 0) {
            this.selectStaffMember(this.staffList[0]);
            this.isManualStaffInput = false;
        } else {
            this.isManualStaffInput = true;
        }

        this.showModal = true;
    }

    openEditModal(turno: any, event?: Event): void {
        if (event) event.stopPropagation();

        this.editingTurnoId = turno.id;
        this.modalTurno = {
            id: turno.id,
            club_id: turno.club_id || this.selectedClub?.id,
            usuario_id: turno.usuario_id || null,
            nombre_responsable: turno.nombre_responsable || '',
            email: turno.email || '',
            telefono: turno.telefono || '',
            fecha: turno.fecha,
            tipo_turno: turno.tipo_turno || 'Día Completo',
            hora_inicio: turno.hora_inicio || '08:00',
            hora_fin: turno.hora_fin || '23:30',
            rol_turno: turno.rol_turno || 'Encargado de Turno',
            color: turno.color || '#10b981',
            notas: turno.notas || '',
            estado: turno.estado || 'Programado',
            pagado: Number(turno.pagado) === 1,
            monto_pago: (turno.monto_pago !== null && turno.monto_pago !== undefined && turno.monto_pago !== '') ? Number(turno.monto_pago) : null,
            metodo_pago: turno.metodo_pago || 'Transferencia'
        };

        this.isManualStaffInput = !turno.usuario_id;
        this.showModal = true;
    }

    closeModal(): void {
        this.showModal = false;
        this.editingTurnoId = null;
    }

    selectStaffMember(staff: any): void {
        this.isManualStaffInput = false;
        this.modalTurno.usuario_id = staff.id;
        this.modalTurno.nombre_responsable = staff.nombre;
        this.modalTurno.email = staff.email || '';
        this.modalTurno.telefono = staff.telefono || '';
        this.modalTurno.color = this.getColorForStaff(staff.nombre || staff.id);
    }

    setManualMode(): void {
        this.isManualStaffInput = true;
        this.modalTurno.usuario_id = null;
        if (!this.editingTurnoId) {
            this.modalTurno.nombre_responsable = '';
            this.modalTurno.email = '';
            this.modalTurno.telefono = '';
        }
    }

    selectRole(rol: string): void {
        this.modalTurno.rol_turno = rol;
    }

    onStaffDropdownChange(): void {
        if (!this.modalTurno.usuario_id) {
            this.setManualMode();
            return;
        }

        const selected = this.staffList.find(s => Number(s.id) === Number(this.modalTurno.usuario_id));
        if (selected) {
            this.selectStaffMember(selected);
        }
    }

    setPresetTurno(tipo: string): void {
        if (tipo === 'dia_completo') {
            this.modalTurno.tipo_turno = 'Día Completo';
            this.modalTurno.hora_inicio = '08:00';
            this.modalTurno.hora_fin = '23:30';
            this.modalTurno.rol_turno = 'Encargado de Turno';
        } else if (tipo === 'manana') {
            this.modalTurno.tipo_turno = 'Mañana';
            this.modalTurno.hora_inicio = '08:00';
            this.modalTurno.hora_fin = '15:30';
            this.modalTurno.rol_turno = 'Apertura de Club';
        } else if (tipo === 'tarde') {
            this.modalTurno.tipo_turno = 'Tarde';
            this.modalTurno.hora_inicio = '15:30';
            this.modalTurno.hora_fin = '23:30';
            this.modalTurno.rol_turno = 'Cierre y Cuadratura';
        } else if (tipo === 'personalizado') {
            this.modalTurno.tipo_turno = 'Personalizado';
        }
    }

    selectColor(hex: string): void {
        this.modalTurno.color = hex;
    }

    saveTurno(): void {
        if (!this.modalTurno.nombre_responsable || !this.modalTurno.fecha) {
            Swal.fire('Campos Obligatorios', 'Por favor especifica la persona a cargo y la fecha del turno.', 'warning');
            return;
        }

        this.isSaving = true;
        const payload = {
            ...this.modalTurno,
            pagado: this.modalTurno.pagado ? 1 : 0,
            club_id: this.selectedClub.id,
            created_by: this.userId
        };

        this.clubesService.saveClubTurno(payload).subscribe({
            next: (res) => {
                this.isSaving = false;
                this.closeModal();
                Swal.fire({
                    title: '¡Guardado!',
                    text: res.message || 'El turno se ha asignado correctamente.',
                    icon: 'success',
                    timer: 1800,
                    showConfirmButton: false
                });
                this.loadTurnos();
            },
            error: (err) => {
                this.isSaving = false;
                console.error('Error guardando turno', err);
                Swal.fire('Error', err.error?.error || 'No se pudo guardar el turno.', 'error');
            }
        });
    }

    deleteTurno(turno: any, event?: Event): void {
        if (event) event.stopPropagation();

        Swal.fire({
            title: '¿Eliminar turno?',
            text: `Se eliminará el turno asignado a ${turno.nombre_responsable} el día ${turno.fecha}.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#ef4444'
        }).then((result) => {
            if (result.isConfirmed) {
                this.clubesService.deleteClubTurno(turno.id, this.selectedClub.id).subscribe({
                    next: () => {
                        Swal.fire({
                            title: 'Eliminado',
                            text: 'El turno ha sido eliminado correctamente.',
                            icon: 'success',
                            timer: 1600,
                            showConfirmButton: false
                        });
                        this.closeModal();
                        this.loadTurnos();
                    },
                    error: (err) => {
                        console.error('Error eliminando turno', err);
                        Swal.fire('Error', 'No se pudo eliminar el turno.', 'error');
                    }
                });
            }
        });
    }

    duplicateTurno(turno: any, event?: Event): void {
        if (event) event.stopPropagation();

        // Duplicar para el mismo día de la siguiente semana (+7 días)
        const parts = turno.fecha.split('-').map(Number);
        const currDate = new Date(parts[0], parts[1] - 1, parts[2]);
        currDate.setDate(currDate.getDate() + 7);
        const nextDateStr = this.formatDateISO(currDate);

        Swal.fire({
            title: '¿Duplicar Turno?',
            text: `¿Deseas duplicar este turno de ${turno.nombre_responsable} para el siguiente ${currDate.toLocaleDateString('es-ES', { weekday: 'long' })} (${nextDateStr})?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, duplicar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#10b981'
        }).then((result) => {
            if (result.isConfirmed) {
                const payload = {
                    ...turno,
                    id: null,
                    fecha: nextDateStr,
                    created_by: this.userId
                };
                this.clubesService.saveClubTurno(payload).subscribe({
                    next: () => {
                        Swal.fire({
                            title: '¡Duplicado!',
                            text: `Turno creado para el ${nextDateStr}.`,
                            icon: 'success',
                            timer: 1800,
                            showConfirmButton: false
                        });
                        this.loadTurnos();
                    },
                    error: (err) => {
                        console.error('Error duplicando turno', err);
                        Swal.fire('Error', 'No se pudo duplicar el turno.', 'error');
                    }
                });
            }
        });
    }

    getWhatsAppUrl(telefono?: string, nombre?: string, fecha?: string, hora?: string): string {
        if (!telefono) return '';
        let cleanPhone = telefono.replace(/[^0-9]/g, '');
        if (cleanPhone.length === 9 && !cleanPhone.startsWith('56')) {
            cleanPhone = '56' + cleanPhone;
        }
        const text = encodeURIComponent(`Hola ${nombre || ''}, te contacto desde la administración de ${this.selectedClub?.nombre || 'PadelBlox'} respecto a tu turno del ${fecha || 'hoy'}.`);
        return `https://wa.me/${cleanPhone}?text=${text}`;
    }

    get formattedTodayDate(): string {
        const now = new Date();
        const y = now.getFullYear();
        const m = (now.getMonth() + 1).toString().padStart(2, '0');
        const d = now.getDate().toString().padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    getDayName(dateStr: string): string {
        if (!dateStr) return '';
        const parts = dateStr.split('-').map(Number);
        if (parts.length !== 3) return '';
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        return days[d.getDay()] || '';
    }

    getColorForStaff(seed: string | number): string {
        let hash = 0;
        const str = seed ? seed.toString() : 'default';
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        const index = Math.abs(hash) % this.colorPalette.length;
        return this.colorPalette[index];
    }

    formatDateISO(dateInput: any): string {
        if (!dateInput) return '';
        if (typeof dateInput === 'string') return dateInput;
        if (dateInput instanceof Date) {
            const y = dateInput.getFullYear();
            const m = (dateInput.getMonth() + 1).toString().padStart(2, '0');
            const d = dateInput.getDate().toString().padStart(2, '0');
            return `${y}-${m}-${d}`;
        }
        return '';
    }

    getInitials(name: string): string {
        if (!name) return 'U';
        const parts = name.trim().split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return parts[0].substring(0, 2).toUpperCase();
    }

    // --- DRAG & DROP LOGIC ---
    onStaffDragStart(event: DragEvent, staff: any): void {
        this.draggedStaff = staff;
        if (event.dataTransfer) {
            try {
                event.dataTransfer.setData('application/json', JSON.stringify(staff));
                event.dataTransfer.setData('text/plain', staff.id ? staff.id.toString() : staff.nombre);
            } catch (e) {
                console.warn('Error setting dataTransfer', e);
            }
            event.dataTransfer.effectAllowed = 'copy';
        }
    }

    onStaffDragEnd(): void {
        // Delayed cleanup to ensure onDayDrop receives draggedStaff reliably
        setTimeout(() => {
            this.draggedStaff = null;
            this.dragOverDate = null;
            this.cdr.markForCheck();
        }, 150);
    }

    onDayDragOver(event: DragEvent, day: CalendarDay): void {
        event.preventDefault();
        event.stopPropagation();
        if (event.dataTransfer) {
            event.dataTransfer.dropEffect = 'copy';
        }
        if (this.dragOverDate !== day.date) {
            this.dragOverDate = day.date;
        }
    }

    onDayDragLeave(event: DragEvent, day: CalendarDay): void {
        event.preventDefault();
        const rect = (event.currentTarget as HTMLElement)?.getBoundingClientRect();
        if (rect) {
            const isOutside = (
                event.clientX < rect.left ||
                event.clientX >= rect.right ||
                event.clientY < rect.top ||
                event.clientY >= rect.bottom
            );
            if (isOutside && this.dragOverDate === day.date) {
                this.dragOverDate = null;
            }
        }
    }

    onDayDrop(event: DragEvent, day: CalendarDay): void {
        event.preventDefault();
        event.stopPropagation();
        this.dragOverDate = null;

        let staff = this.draggedStaff;
        if (!staff && event.dataTransfer) {
            try {
                const json = event.dataTransfer.getData('application/json');
                if (json) {
                    staff = JSON.parse(json);
                } else {
                    const text = event.dataTransfer.getData('text/plain');
                    if (text && this.staffList) {
                        staff = this.staffList.find(s => s.id?.toString() === text || s.nombre === text);
                    }
                }
            } catch (e) {
                console.error('Error parsing dropped staff', e);
            }
        }

        if (staff) {
            this.openQuickScheduleModal(staff, day.date);
        } else {
            console.warn('Drop event triggered without staff data');
        }
        this.draggedStaff = null;
        this.cdr.detectChanges();
    }

    openQuickScheduleModal(staff: any, date: string): void {
        const staffColor = this.getColorForStaff(staff.nombre || staff.id);
        const roleClean = staff.rol ? (staff.rol.charAt(0).toUpperCase() + staff.rol.slice(1)) : 'Encargado de Turno';
        
        this.quickTurno = {
            id: null,
            club_id: this.selectedClub?.id,
            usuario_id: staff.id,
            nombre_responsable: staff.nombre,
            email: staff.email || '',
            telefono: staff.telefono || '',
            foto: staff.foto || null,
            fecha: date,
            tipo_turno: 'Día Completo',
            hora_inicio: '08:00',
            hora_fin: '23:30',
            rol_turno: roleClean,
            color: staffColor,
            notas: '',
            estado: 'Programado',
            pagado: 0,
            monto_pago: null,
            metodo_pago: 'Transferencia'
        };
        this.showQuickModal = true;
    }

    setQuickPreset(tipo: string): void {
        if (!this.quickTurno) return;
        if (tipo === 'dia_completo') {
            this.quickTurno.tipo_turno = 'Día Completo';
            this.quickTurno.hora_inicio = '08:00';
            this.quickTurno.hora_fin = '23:30';
            this.quickTurno.rol_turno = 'Encargado de Turno';
        } else if (tipo === 'manana') {
            this.quickTurno.tipo_turno = 'Mañana';
            this.quickTurno.hora_inicio = '08:00';
            this.quickTurno.hora_fin = '15:30';
            this.quickTurno.rol_turno = 'Apertura de Club';
        } else if (tipo === 'tarde') {
            this.quickTurno.tipo_turno = 'Tarde';
            this.quickTurno.hora_inicio = '15:30';
            this.quickTurno.hora_fin = '23:30';
            this.quickTurno.rol_turno = 'Cierre y Cuadratura';
        }
    }

    closeQuickModal(): void {
        this.showQuickModal = false;
        this.quickTurno = null;
    }

    saveQuickTurno(): void {
        if (!this.quickTurno || !this.quickTurno.nombre_responsable || !this.quickTurno.fecha) {
            Swal.fire('Error', 'Faltan datos del turno.', 'warning');
            return;
        }

        this.isSaving = true;
        const payload = {
            ...this.quickTurno,
            pagado: this.quickTurno.pagado ? 1 : 0,
            club_id: this.selectedClub.id,
            created_by: this.userId
        };

        this.clubesService.saveClubTurno(payload).subscribe({
            next: (res) => {
                this.isSaving = false;
                this.closeQuickModal();
                Swal.fire({
                    title: '¡Turno Asignado!',
                    text: `Turno asignado a ${payload.nombre_responsable} (${payload.hora_inicio} - ${payload.hora_fin} hrs).`,
                    icon: 'success',
                    timer: 1800,
                    showConfirmButton: false
                });
                this.loadTurnos();
            },
            error: (err) => {
                this.isSaving = false;
                console.error('Error guardando turno rápido', err);
                Swal.fire('Error', err.error?.error || 'No se pudo guardar el turno.', 'error');
            }
        });
    }

    toggleTurnoPago(turno: any, event?: Event): void {
        if (event) event.stopPropagation();
        if (!this.selectedClub) return;

        const isCurrentlyPaid = Number(turno.pagado) === 1;

        if (isCurrentlyPaid) {
            Swal.fire({
                title: '¿Revertir a Pendiente?',
                text: `El turno de ${turno.nombre_responsable} (${turno.fecha}) volverá a estado "Pendiente de Pago".`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Sí, marcar Pendiente',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#f59e0b'
            }).then((result) => {
                if (result.isConfirmed) {
                    this.clubesService.togglePagoTurno({
                        id: turno.id,
                        club_id: this.selectedClub.id,
                        pagado: 0
                    }).subscribe({
                        next: () => {
                            turno.pagado = 0;
                            this.buildCalendar();
                            this.computeTodayTurnos();
                            this.computeStaffStats();
                            this.cdr.detectChanges();
                            Swal.fire({
                                title: 'Marcado como Pendiente',
                                text: `El turno de ${turno.nombre_responsable} ha vuelto a Pendiente.`,
                                icon: 'info',
                                timer: 1500,
                                showConfirmButton: false
                            });
                        },
                        error: (err) => {
                            console.error('Error actualizando pago', err);
                            Swal.fire('Error', err.error?.error || 'No se pudo actualizar el estado de pago.', 'error');
                        }
                    });
                }
            });
        } else {
            const currentMonto = (turno.monto_pago !== null && turno.monto_pago !== undefined) ? turno.monto_pago : '';
            const currentMetodo = turno.metodo_pago || 'Transferencia';

            Swal.fire({
                title: '💵 Registrar Pago del Turno',
                html: `
                    <div style="text-align: left; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; margin-top: 10px;">
                        <p style="margin-bottom: 6px;"><strong>Personal:</strong> ${turno.nombre_responsable}</p>
                        <p style="margin-bottom: 12px; color: #475569;"><strong>Fecha:</strong> ${turno.fecha} (${turno.hora_inicio} - ${turno.hora_fin} hrs)</p>
                        
                        <label style="display:block; font-weight:700; margin-bottom:4px; font-size:12px; color:#475569;">MONTO PAGADO ($ CLP, OPCIONAL):</label>
                        <input id="swal-monto" type="number" class="swal2-input" placeholder="Ej: 25000" value="${currentMonto}" style="margin: 0 0 14px 0; width: 100%; box-sizing: border-box; font-size: 15px;">
                        
                        <label style="display:block; font-weight:700; margin-bottom:4px; font-size:12px; color:#475569;">MÉTODO DE PAGO:</label>
                        <select id="swal-metodo" class="swal2-select" style="margin: 0; width: 100%; box-sizing: border-box; font-size: 14px;">
                            <option value="Transferencia" ${currentMetodo === 'Transferencia' ? 'selected' : ''}>🏦 Transferencia Bancaria</option>
                            <option value="Efectivo" ${currentMetodo === 'Efectivo' ? 'selected' : ''}>💵 Efectivo</option>
                            <option value="Débito / Tarjeta" ${currentMetodo.includes('Débito') || currentMetodo.includes('Tarjeta') ? 'selected' : ''}>💳 Débito / Tarjeta</option>
                            <option value="Otro" ${currentMetodo === 'Otro' ? 'selected' : ''}>✨ Otro</option>
                        </select>
                    </div>
                `,
                showCancelButton: true,
                confirmButtonText: '✅ Confirmar Pago Realizado',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#10b981',
                focusConfirm: false,
                preConfirm: () => {
                    const montoInput = (document.getElementById('swal-monto') as HTMLInputElement)?.value;
                    const metodoSelect = (document.getElementById('swal-metodo') as HTMLSelectElement)?.value;
                    return {
                        monto: (montoInput !== undefined && montoInput !== null && montoInput.trim() !== '') ? parseInt(montoInput, 10) : null,
                        metodo: metodoSelect || 'Transferencia'
                    };
                }
            }).then((result) => {
                if (result.isConfirmed && result.value) {
                    const { monto, metodo } = result.value;
                    this.clubesService.togglePagoTurno({
                        id: turno.id,
                        club_id: this.selectedClub.id,
                        pagado: 1,
                        monto_pago: monto,
                        metodo_pago: metodo
                    }).subscribe({
                        next: (res: any) => {
                            turno.pagado = 1;
                            turno.monto_pago = monto;
                            turno.metodo_pago = metodo;
                            turno.fecha_pago = res?.fecha_pago || new Date().toISOString();
                            this.buildCalendar();
                            this.computeTodayTurnos();
                            this.computeStaffStats();
                            this.cdr.detectChanges();
                            Swal.fire({
                                title: '¡Pago Registrado!',
                                text: `Turno de ${turno.nombre_responsable} marcado como PAGADO.`,
                                icon: 'success',
                                timer: 1600,
                                showConfirmButton: false
                            });
                        },
                        error: (err) => {
                            console.error('Error guardando pago', err);
                            Swal.fire('Error', err.error?.error || 'No se pudo registrar el pago.', 'error');
                        }
                    });
                }
            });
        }
    }

    navigate(path: string): void {
        this.router.navigate([path]);
    }
}
