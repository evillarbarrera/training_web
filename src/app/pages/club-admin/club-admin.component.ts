import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ClubesService, RECURSOS_CATEGORIAS, RecursoCategoria } from '../../services/clubes.service';
import { ApiService } from '../../services/api.service';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { AssetService } from '../../services/asset.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-club-admin',
    standalone: true,
    imports: [CommonModule, FormsModule, SidebarComponent],
    templateUrl: './club-admin.component.html',
    styleUrls: ['./club-admin.component.scss']
})
export class ClubAdminComponent implements OnInit {
    clubes: any[] = [];
    canchas: any[] = [];
    selectedClub: any = null;

    userId: number | null = null;
    userName: string = '';
    userFoto: string | null = null;
    userRole: any = 'administrador_club';
    activeTab: 'list' | 'create' = 'list';
    isLoading: boolean = false;
    searchTerm: string = '';
    showClubModal: boolean = false;
    showCanchaModal: boolean = false;
    showStaffModal: boolean = false;

    // Categorías de Recursos y Filtros
    public readonly categoriasRecursos: RecursoCategoria[] = RECURSOS_CATEGORIAS;
    activeCategoryFilter: 'all' | 'padel' | 'juegos' | 'amenities' | 'equipamiento' = 'all';

    staff: any[] = [];
    newStaff = {
        nombre: '',
        email: '',
        password: '',
        rol: 'administrador_club'
    };

    newClub = {
        nombre: '',
        direccion: '',
        region: '',
        comuna: '',
        telefono: '',
        instagram: '',
        email: '',
        logo: '',
        admin_id: 0,
        reservas_activas: 0,
        academia_activa: 1
    };

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

    filteredComunas: string[] = [];

    newCancha: any = {
        club_id: 0,
        nombre: '',
        categoria: 'cancha_padel',
        icono: '🎾',
        descripcion: '',
        capacidad: 4,
        tipo: 'Outdoor',
        superficie: 'Césped Sintético',
        precio_60: 0,
        precio_90: 0,
        precio_120: 0,
        precio_60_alto: 0,
        precio_90_alto: 0,
        precio_120_alto: 0,
        hora_inicio_bajo: '07:00',
        hora_fin_bajo: '18:00',
        hora_inicio_alto: '18:00',
        hora_fin_alto: '24:00',
        tramos_horarios: [
            {
                nombre: 'Horario Bajo (Normal)',
                tipo: 'bajo',
                hora_inicio: '07:00',
                hora_fin: '18:00',
                precio_60: 8000,
                precio_90: 12000,
                precio_120: 16000
            },
            {
                nombre: 'Horario Alto (Peak)',
                tipo: 'alto',
                hora_inicio: '18:00',
                hora_fin: '24:00',
                precio_60: 15000,
                precio_90: 21000,
                precio_120: 28000
            }
        ]
    };

    updateComunas(reset: boolean = true): void {
        const selectedRegion = this.regions.find(r => r.name === this.newClub.region);
        if (selectedRegion) {
            this.filteredComunas = this.allComunas[selectedRegion.id] || [];
            if (reset) this.newClub.comuna = '';
        } else {
            this.filteredComunas = [];
            if (reset) this.newClub.comuna = '';
        }
    }

    constructor(
        private clubesService: ClubesService,
        private apiService: ApiService,
        private router: Router,
        public assetService: AssetService
    ) { }

    ngOnInit(): void {
        const storedRole = localStorage.getItem('userRole') || '';
        const storedUserId = localStorage.getItem('userId');
        const storedUser = JSON.parse(localStorage.getItem('currentUser') || 'null');

        if (!storedUserId || (!storedRole.toLowerCase().includes('admin') && 
                             !storedRole.toLowerCase().includes('administrador') && 
                             !storedRole.toLowerCase().includes('staff'))) {
            this.router.navigate(['/login']);
            return;
        }

        // 🔐 SEGURIDAD: Los usuarios de Staff no pueden ver "Mis Clubes" (Página de gestión global del club)
        if (storedRole.toLowerCase().includes('staff')) {
            this.router.navigate(['/club-home']);
            return;
        }

        this.userId = Number(storedUserId);
        this.userName = storedUser?.nombre || '';
        this.userFoto = storedUser?.foto_perfil || null;
        this.userRole = storedUser?.rol || storedRole;
        this.newClub.admin_id = this.userId;
        this.loadClubes();

        // Fetch fresh profile data to ensure photo is correct
        this.apiService.getPerfil(this.userId!).subscribe({
            next: (res) => {
                if (res.success && res.user) {
                    this.userFoto = res.user.foto_perfil || this.userFoto;
                    this.userName = res.user.nombre || this.userName;
                }
            }
        });
    }

    loadClubes() {
        if (!this.userId) return;
        this.clubesService.getClubes(this.userId).subscribe(res => {
            this.clubes = res || [];
            if (this.clubes.length > 0 && !this.selectedClub) {
                const savedId = localStorage.getItem('selectedClubId');
                const matched = savedId ? this.clubes.find(c => String(c.id) === String(savedId)) : null;
                this.selectClub(matched || this.clubes[0]);
            }
        });
    }

    editingCanchaId: number | null = null;
    editingClubId: number | null = null;

    // ... existing properties ...

    get filteredClubes() {
        if (!this.searchTerm) return this.clubes;
        return this.clubes.filter(c => 
            c.nombre.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
            c.comuna.toLowerCase().includes(this.searchTerm.toLowerCase())
        );
    }

    selectClub(club: any) {
        this.selectedClub = club;
        if (club && club.id) {
            localStorage.setItem('selectedClubId', String(club.id));
        }
        this.cancelEditCancha(); // Reset form
        this.newCancha.club_id = club.id;
        this.loadCanchas(club.id);
        this.loadStaff(club.id);
    }

    loadCanchas(clubId: number) {
        this.clubesService.getCanchas(clubId).subscribe(res => {
            this.canchas = res;
        });
    }

    loadStaff(clubId: number) {
        this.clubesService.getClubStaff(clubId).subscribe(res => {
            this.staff = res;
        });
    }

    openStaffModal() {
        this.newStaff = {
            nombre: '',
            email: '',
            password: '',
            rol: 'administrador_club'
        };
        this.showStaffModal = true;
    }

    createStaff() {
        if (!this.newStaff.nombre || !this.newStaff.email || !this.newStaff.password) {
            Swal.fire('Error', 'Todos los campos son obligatorios', 'warning');
            return;
        }

        this.isLoading = true;
        const payload = { ...this.newStaff, club_id: this.selectedClub.id };
        
        this.clubesService.addClubStaff(payload).subscribe({
            next: () => {
                Swal.fire('Éxito', 'Usuario creado y asociado al club', 'success');
                this.loadStaff(this.selectedClub.id);
                this.showStaffModal = false;
                this.isLoading = false;
            },
            error: (err) => {
                console.error('Error creating staff:', err);
                Swal.fire('Error', err.error?.error || 'No se pudo crear el usuario', 'error');
                this.isLoading = false;
            }
        });
    }

    deleteStaff(usuarioId: number) {
        Swal.fire({
            title: '¿Eliminar acceso?',
            text: 'El usuario ya no podrá gestionar este club',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                this.isLoading = true;
                this.clubesService.deleteClubStaff(usuarioId, this.selectedClub.id).subscribe({
                    next: () => {
                        Swal.fire('Eliminado', 'El acceso ha sido revocado', 'success');
                        this.loadStaff(this.selectedClub.id);
                        this.isLoading = false;
                    },
                    error: () => {
                        Swal.fire('Error', 'No se pudo eliminar el acceso', 'error');
                        this.isLoading = false;
                    }
                });
            }
        });
    }

    openCreateModal() {
        this.cancelEditClub(); // This resets everything and hides the modal
        this.showClubModal = true;
    }

    editClub(club: any, event?: Event) {
        if (event) event.stopPropagation();
        this.editingClubId = club.id;
        this.newClub = { ...club };
        this.updateComunas(false); 
        this.showClubModal = true;
    }

    cancelEditClub() {
        this.editingClubId = null;
        this.newClub = {
            nombre: '',
            direccion: '',
            region: '',
            comuna: '',
            telefono: '',
            instagram: '',
            email: '',
            logo: '',
            admin_id: this.userId || 0,
            reservas_activas: 0,
            academia_activa: 1
        };
        this.showClubModal = false;
        this.activeTab = 'list';
    }

    createClub() {
        if (!this.newClub.nombre) return;

        this.isLoading = true;

        if (this.editingClubId) {
            this.clubesService.updateClub({ ...this.newClub, id: this.editingClubId }).subscribe({
                next: () => {
                    Swal.fire('Actualizado', 'Club actualizado correctamente', 'success');
                    this.loadClubes();
                    this.cancelEditClub();
                    this.isLoading = false;
                },
                error: (err) => {
                    console.error('Update error:', err);
                    let msg = 'No se pudo actualizar el club';
                    if (err.error) {
                        msg = typeof err.error.error === 'string' ? err.error.error :
                            (typeof err.error === 'string' ? err.error : JSON.stringify(err.error));
                    }
                    Swal.fire('Error', msg, 'error');
                    this.isLoading = false;
                }
            });
        } else {
            this.clubesService.addClub(this.newClub).subscribe({
                next: () => {
                    Swal.fire('Creado', 'Club creado correctamente', 'success');
                    this.loadClubes();
                    this.cancelEditClub();
                    this.isLoading = false;
                },
                error: (err) => {
                    console.error('Create error:', err);
                    let msg = 'No se pudo crear el club';
                    if (err.error) {
                        msg = typeof err.error.error === 'string' ? err.error.error :
                            (typeof err.error === 'string' ? err.error : JSON.stringify(err.error));
                    }
                    Swal.fire('Error', msg, 'error');
                    this.isLoading = false;
                }
            });
        }
    }

    deleteClub(club: any, event: Event) {
        event.stopPropagation(); // Evitar que se seleccione el club al hacer click en borrar

        Swal.fire({
            title: '¿Confirmar eliminación?',
            text: `¿Estás seguro de que deseas eliminar el club "${club.nombre}"? Esta acción no se puede deshacer.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#d33',
        }).then((result) => {
            if (result.isConfirmed && this.userId) {
                this.clubesService.deleteClub(club.id, this.userId).subscribe({
                    next: (res) => {
                        Swal.fire('¡Eliminado!', res.message, 'success');
                        this.loadClubes();
                        if (this.selectedClub?.id === club.id) {
                            this.selectedClub = null;
                        }
                    },
                    error: (err) => {
                        const errMsg = err.error?.error || 'No se pudo eliminar el club';
                        Swal.fire('Error', errMsg, 'error');
                    }
                });
            }
        });
    }

    get filteredCanchas() {
        if (!this.canchas || this.canchas.length === 0) return [];
        if (this.activeCategoryFilter === 'all') return this.canchas;

        return this.canchas.filter(c => {
            const meta = this.clubesService.getCategoryMeta(c.categoria);
            return meta.grupo === this.activeCategoryFilter || meta.id === this.activeCategoryFilter;
        });
    }

    getCategoryCount(filter: string): number {
        if (!this.canchas || this.canchas.length === 0) return 0;
        if (filter === 'all') return this.canchas.length;

        return this.canchas.filter(c => {
            const meta = this.clubesService.getCategoryMeta(c.categoria);
            return meta.grupo === filter || meta.id === filter;
        }).length;
    }

    getCategoryMeta(cancha: any): RecursoCategoria {
        return this.clubesService.getCategoryMeta(cancha?.categoria);
    }

    onCategorySelect(catId: string) {
        const meta = this.clubesService.getCategoryMeta(catId);
        this.newCancha.categoria = meta.id;
        this.newCancha.icono = meta.icono;

        // Auto-sugerir nombre si está vacío o si tenía un nombre por defecto
        const isDefaultOrEmpty = !this.newCancha.nombre || this.categoriasRecursos.some(c => this.newCancha.nombre.startsWith(c.defaultNombre));
        if (isDefaultOrEmpty) {
            const countSameCat = (this.canchas || []).filter(c => (c.categoria || 'cancha_padel') === meta.id).length;
            this.newCancha.nombre = `${meta.defaultNombre} #${countSameCat + 1}`;
        }

        this.newCancha.tipo = meta.defaultTipo;
        this.newCancha.superficie = meta.defaultSuperficie;
        this.newCancha.capacidad = meta.capacidadSugerida;
        if (!this.newCancha.descripcion) {
            this.newCancha.descripcion = meta.descripcionSugerida;
        }
    }

    get selectedCategoryMeta(): RecursoCategoria {
        return this.clubesService.getCategoryMeta(this.newCancha.categoria);
    }

    openCanchaModal() {
        this.cancelEditCancha(); 
        this.newCancha.club_id = this.selectedClub!.id;
        this.showCanchaModal = true;
    }

    canCopyFromFirstCancha(): boolean {
        if (!this.canchas || this.canchas.length === 0) return false;
        const firstCancha = this.canchas[0];
        if (this.editingCanchaId && Number(this.editingCanchaId) === Number(firstCancha.id)) {
            return false;
        }
        return true;
    }

    copyHorariosFromFirstCancha() {
        if (!this.canchas || this.canchas.length === 0) return;
        const firstCancha = this.canchas[0];
        
        let tramos: any[] = [];
        if (firstCancha.horarios_adicionales) {
            try {
                const parsed = typeof firstCancha.horarios_adicionales === 'string'
                    ? JSON.parse(firstCancha.horarios_adicionales)
                    : firstCancha.horarios_adicionales;
                if (Array.isArray(parsed) && parsed.length > 0) {
                    tramos = JSON.parse(JSON.stringify(parsed));
                }
            } catch(e) {}
        }

        if (tramos.length === 0) {
            let hInicioBajo = firstCancha.hora_inicio_bajo || '07:00';
            let hFinBajo = firstCancha.hora_fin_bajo || '18:00';
            let hInicioAlto = firstCancha.hora_inicio_alto || '18:00';
            let hFinAlto = firstCancha.hora_fin_alto || '24:00';
            if (hInicioBajo.length > 5) hInicioBajo = hInicioBajo.substring(0, 5);
            if (hFinBajo.length > 5) hFinBajo = hFinBajo.substring(0, 5);
            if (hInicioAlto.length > 5) hInicioAlto = hInicioAlto.substring(0, 5);
            if (hFinAlto.length > 5) hFinAlto = hFinAlto.substring(0, 5);

            tramos = [
                {
                    nombre: 'Horario Bajo (Normal)',
                    tipo: 'bajo',
                    hora_inicio: hInicioBajo,
                    hora_fin: hFinBajo,
                    precio_60: firstCancha.precio_60 || 0,
                    precio_90: firstCancha.precio_90 || 0,
                    precio_120: firstCancha.precio_120 || 0
                },
                {
                    nombre: 'Horario Alto (Peak)',
                    tipo: 'alto',
                    hora_inicio: hInicioAlto,
                    hora_fin: hFinAlto,
                    precio_60: firstCancha.precio_60_alto || 0,
                    precio_90: firstCancha.precio_90_alto || 0,
                    precio_120: firstCancha.precio_120_alto || 0
                }
            ];
        }

        this.newCancha.tramos_horarios = JSON.parse(JSON.stringify(tramos));
        
        Swal.fire({
            title: '¡Horarios Copiados!',
            text: `Se copiaron exitosamente los horarios y tarifas de "${firstCancha.nombre}".`,
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
        });
    }

    addTramoHorario() {
        if (!this.newCancha.tramos_horarios) {
            this.newCancha.tramos_horarios = [];
        }
        const count = this.newCancha.tramos_horarios.length + 1;
        let lastFin = '18:00';
        if (this.newCancha.tramos_horarios.length > 0) {
            lastFin = this.newCancha.tramos_horarios[this.newCancha.tramos_horarios.length - 1].hora_fin || '18:00';
        }

        this.newCancha.tramos_horarios.push({
            nombre: `Horario ${count}`,
            tipo: 'custom',
            hora_inicio: lastFin,
            hora_fin: '24:00',
            precio_60: 0,
            precio_90: 0,
            precio_120: 0
        });
    }

    removeTramoHorario(index: number) {
        if (this.newCancha.tramos_horarios && this.newCancha.tramos_horarios.length > 1) {
            this.newCancha.tramos_horarios.splice(index, 1);
        }
    }

    editCancha(cancha: any) {
        this.editingCanchaId = cancha.id;
        
        let tramos: any[] = [];
        if (cancha.horarios_adicionales) {
            try {
                const parsed = typeof cancha.horarios_adicionales === 'string' 
                    ? JSON.parse(cancha.horarios_adicionales) 
                    : cancha.horarios_adicionales;
                if (Array.isArray(parsed) && parsed.length > 0) {
                    tramos = parsed;
                }
            } catch(e) {}
        }

        if (tramos.length === 0) {
            let hInicioBajo = cancha.hora_inicio_bajo || '07:00';
            let hFinBajo = cancha.hora_fin_bajo || '18:00';
            let hInicioAlto = cancha.hora_inicio_alto || '18:00';
            let hFinAlto = cancha.hora_fin_alto || '24:00';
            if (hInicioBajo.length > 5) hInicioBajo = hInicioBajo.substring(0, 5);
            if (hFinBajo.length > 5) hFinBajo = hFinBajo.substring(0, 5);
            if (hInicioAlto.length > 5) hInicioAlto = hInicioAlto.substring(0, 5);
            if (hFinAlto.length > 5) hFinAlto = hFinAlto.substring(0, 5);

            tramos = [
                {
                    nombre: 'Horario Bajo (Normal)',
                    tipo: 'bajo',
                    hora_inicio: hInicioBajo,
                    hora_fin: hFinBajo,
                    precio_60: cancha.precio_60 || 0,
                    precio_90: cancha.precio_90 || 0,
                    precio_120: cancha.precio_120 || 0
                },
                {
                    nombre: 'Horario Alto (Peak)',
                    tipo: 'alto',
                    hora_inicio: hInicioAlto,
                    hora_fin: hFinAlto,
                    precio_60: cancha.precio_60_alto || 0,
                    precio_90: cancha.precio_90_alto || 0,
                    precio_120: cancha.precio_120_alto || 0
                }
            ];
        }

        const meta = this.clubesService.getCategoryMeta(cancha.categoria);
        this.newCancha = { 
            ...cancha,
            categoria: cancha.categoria || meta.id,
            icono: cancha.icono || meta.icono,
            descripcion: cancha.descripcion || meta.descripcionSugerida,
            capacidad: cancha.capacidad !== undefined && cancha.capacidad !== null ? cancha.capacidad : meta.capacidadSugerida,
            tramos_horarios: tramos
        };
        this.showCanchaModal = true;
    }

    cancelEditCancha() {
        this.editingCanchaId = null;
        const defaultMeta = this.categoriasRecursos[0];
        this.newCancha = {
            club_id: this.selectedClub?.id || 0,
            nombre: '',
            categoria: defaultMeta.id,
            icono: defaultMeta.icono,
            descripcion: '',
            capacidad: defaultMeta.capacidadSugerida,
            tipo: defaultMeta.defaultTipo,
            superficie: defaultMeta.defaultSuperficie,
            tramos_horarios: [
                {
                    nombre: 'Horario Bajo (Normal)',
                    tipo: 'bajo',
                    hora_inicio: '07:00',
                    hora_fin: '18:00',
                    precio_60: 8000,
                    precio_90: 12000,
                    precio_120: 16000
                },
                {
                    nombre: 'Horario Alto (Peak)',
                    tipo: 'alto',
                    hora_inicio: '18:00',
                    hora_fin: '24:00',
                    precio_60: 15000,
                    precio_90: 21000,
                    precio_120: 28000
                }
            ]
        };
        this.showCanchaModal = false;
    }

    hasScheduleOverlap(): boolean {
        const tramos = this.newCancha.tramos_horarios || [];
        if (tramos.length === 0) return false;

        for (let i = 0; i < tramos.length; i++) {
            const startA = tramos[i].hora_inicio || '00:00';
            const endA = (tramos[i].hora_fin === '00:00' || tramos[i].hora_fin === '24:00') ? '24:00' : (tramos[i].hora_fin || '00:00');

            if (startA >= endA) {
                return true;
            }

            for (let j = i + 1; j < tramos.length; j++) {
                const startB = tramos[j].hora_inicio || '00:00';
                const endB = (tramos[j].hora_fin === '00:00' || tramos[j].hora_fin === '24:00') ? '24:00' : (tramos[j].hora_fin || '00:00');

                if (startA < endB && startB < endA) {
                    return true;
                }
            }
        }
        return false;
    }

    saveCancha() {
        if (!this.newCancha.nombre || !this.newCancha.club_id) {
            Swal.fire('Campos requeridos', 'El nombre del recurso / pista es obligatorio', 'warning');
            return;
        }

        const tramos = this.newCancha.tramos_horarios || [];
        
        for (let i = 0; i < tramos.length; i++) {
            const s = tramos[i].hora_inicio || '00:00';
            const e = (tramos[i].hora_fin === '00:00' || tramos[i].hora_fin === '24:00') ? '24:00' : (tramos[i].hora_fin || '00:00');
            if (s >= e) {
                Swal.fire('Rango Inválido', `En ${tramos[i].nombre || 'Horario ' + (i+1)}, la hora de inicio (${s}) debe ser menor que la de fin (${e}).`, 'warning');
                return;
            }
        }

        for (let i = 0; i < tramos.length; i++) {
            const sA = tramos[i].hora_inicio || '00:00';
            const eA = (tramos[i].hora_fin === '00:00' || tramos[i].hora_fin === '24:00') ? '24:00' : (tramos[i].hora_fin || '00:00');
            for (let j = i + 1; j < tramos.length; j++) {
                const sB = tramos[j].hora_inicio || '00:00';
                const eB = (tramos[j].hora_fin === '00:00' || tramos[j].hora_fin === '24:00') ? '24:00' : (tramos[j].hora_fin || '00:00');
                if (sA < eB && sB < eA) {
                    Swal.fire({
                        title: 'Horarios Traslapados',
                        text: `El horario "${tramos[i].nombre}" (${sA} a ${eA}) se topa con "${tramos[j].nombre}" (${sB} a ${eB}). Modifica las horas para que no se crucen.`,
                        icon: 'warning'
                    });
                    return;
                }
            }
        }

        const t0 = tramos[0] || {};
        const t1 = tramos[1] || t0;

        const payload = {
            ...this.newCancha,
            categoria: this.newCancha.categoria || 'cancha_padel',
            icono: this.newCancha.icono || '🎾',
            descripcion: this.newCancha.descripcion || '',
            capacidad: this.newCancha.capacidad || 4,
            hora_inicio_bajo: t0.hora_inicio || '07:00',
            hora_fin_bajo: t0.hora_fin || '18:00',
            precio_60: t0.precio_60 || 0,
            precio_90: t0.precio_90 || 0,
            precio_120: t0.precio_120 || 0,
            hora_inicio_alto: t1.hora_inicio || '18:00',
            hora_fin_alto: t1.hora_fin || '24:00',
            precio_60_alto: t1.precio_60 || 0,
            precio_90_alto: t1.precio_90 || 0,
            precio_120_alto: t1.precio_120 || 0,
            tramos_horarios: tramos,
            horarios_adicionales: JSON.stringify(tramos)
        };

        if (this.editingCanchaId) {
            this.clubesService.updateCancha({ ...payload, id: this.editingCanchaId }).subscribe({
                next: () => {
                    Swal.fire('Actualizado', 'Recurso y horarios actualizados correctamente', 'success');
                    this.loadCanchas(this.newCancha.club_id);
                    this.cancelEditCancha();
                },
                error: (err) => Swal.fire('Error', err.error?.error || 'No se pudo actualizar el recurso', 'error')
            });
        } else {
            this.clubesService.addCancha(payload).subscribe({
                next: () => {
                    Swal.fire('Creado', 'Recurso y horarios creados correctamente', 'success');
                    this.loadCanchas(this.newCancha.club_id);
                    this.cancelEditCancha();
                },
                error: (err) => Swal.fire('Error', err.error?.error || 'No se pudo crear el recurso', 'error')
            });
        }
    }

    deleteCancha(cancha: any) {
        Swal.fire({
            title: '¿Eliminar cancha?',
            text: `Se eliminará la cancha "${cancha.nombre}".`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#d33'
        }).then((result) => {
            if (result.isConfirmed) {
                this.clubesService.deleteCancha(cancha.id).subscribe({
                    next: () => {
                        Swal.fire('Eliminado', 'Cancha eliminada', 'success');
                        this.loadCanchas(this.selectedClub.id);
                    },
                    error: () => Swal.fire('Error', 'No se pudo eliminar', 'error')
                });
            }
        });
    }

    onLogoSelected(event: any): void {
        const file: File = event.target.files[0];
        if (file) {
            this.uploadLogo(file);
        }
        event.target.value = '';
    }

    uploadLogo(file: File): void {
        this.isLoading = true;
        Swal.fire({
            title: 'Subiendo logo...',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        this.clubesService.subirLogoClub(file).subscribe({
            next: (res: any) => {
                this.isLoading = false;
                Swal.close();
                if (res.success && res.foto_url) {
                    this.newClub.logo = res.foto_url;
                    Swal.fire('¡Éxito!', 'El logo se ha subido correctamente.', 'success');
                } else {
                    Swal.fire('Error', res.error || 'No se pudo subir el logo.', 'error');
                }
            },
            error: (err: any) => {
                this.isLoading = false;
                Swal.close();
                console.error('Error uploading logo:', err);
                Swal.fire('Error', 'Hubo un problema al subir el logo.', 'error');
            }
        });
    }
}
