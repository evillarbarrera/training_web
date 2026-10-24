import { Component, Input, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { ClubesService } from '../../services/clubes.service';
import { AssetService } from '../../services/asset.service';
import { environment } from '../../../environments/environment';
import Swal from 'sweetalert2';

import { SidebarService } from '../../services/sidebar.service';
import { HardGateComponent } from '../hard-gate/hard-gate.component';
import { ClubGuideModalComponent } from '../club-guide-modal/club-guide-modal.component';

@Component({
    selector: 'app-sidebar',
    templateUrl: './sidebar.component.html',
    styleUrls: ['./sidebar.component.scss'],
    standalone: true,
    imports: [CommonModule, RouterModule, HardGateComponent, ClubGuideModalComponent]
})
export class SidebarComponent implements OnInit {
    @Input() userId: number | null = null;
    @Input() jugadorNombre: string = 'Usuario';
    @Input() activePage: string = '';
    @Input() role: 'jugador' | 'entrenador' | 'administrador_club' | 'administrador' | 'staff_club' = 'jugador';

    showClubGuideModal: boolean = false;

    private _jugadorFoto: string | null = null;
    private _hasInputFoto: boolean = false;

    @Input() set jugadorFoto(val: string | null) {
        if (val) {
            this._hasInputFoto = true;
            this._jugadorFoto = this.formatPhotoUrl(val);
        } else if (!this._hasInputFoto) {
            this.applyFallbackFoto();
        }
    }
    get jugadorFoto(): string | null {
        return this._jugadorFoto;
    }

    isOpen = false; // Mobile menu state
    isCollapsed = false; // Desktop collapse state
    showSwitchMenu = false; 

    availableProfiles: any[] = [];

    constructor(
        private router: Router,
        private authService: AuthService,
        private clubesService: ClubesService,
        private assetService: AssetService,
        public sidebarService: SidebarService
    ) { }

    get computedRole(): string {
        let r = (this.role || '').toLowerCase();
        
        // Priority for admin
        if (r === 'administrador') return 'administrador';

        // Fallback to localStorage if role is not provided or is default
        if (r === 'jugador' || !r) {
            const storedRole = localStorage.getItem('userRole');
            if (storedRole) r = storedRole.toLowerCase();
        }

        if (r === 'administrador' || r === 'superadmin') return 'administrador';
        if (r === 'staff_club' || r.includes('staff')) return 'staff_club';
        if (r === 'administrador_club' || r.includes('admin')) return 'administrador_club';
        if (r.includes('entrenador')) return 'entrenador';
        return 'jugador';
    }

    get displayRoleName(): string {
        const r = this.computedRole;
        if (r === 'staff_club') return 'Personal de Club';
        if (r === 'administrador_club') return 'Administrador';
        if (r === 'administrador') return 'Super Admin';
        if (r === 'entrenador') return 'Entrenador';
        return 'Jugador';
    }

    isSubscriptionBlocked = false;

    ngOnInit() {
        this.sidebarService.collapsed$.subscribe(v => {
            this.isCollapsed = v;
            if (v) document.body.classList.add('sidebar-collapsed');
            else document.body.classList.remove('sidebar-collapsed');
        });

        // Initial load from local storage
        this.availableProfiles = this.authService.getProfiles().filter(p => !['administrador'].includes(p.rol));

        // Subscribe to user changes
        this.authService.currentUser$.subscribe(currentUser => {
            if (currentUser) {
                if (!this.userId) this.userId = currentUser.id;
                if (!this.jugadorNombre || this.jugadorNombre === 'Usuario') {
                    this.jugadorNombre = currentUser.nombre || 'Usuario';
                }
                this.applyFallbackFoto(currentUser);
            }
        });

        // Force refresh from server
        const currentUser = this.authService.getCurrentUser();
        const currentUserId = this.userId || currentUser?.id;
        if (currentUserId) {
            this.authService.refreshSession(currentUserId).subscribe((res: any) => {
                this.availableProfiles = this.authService.getProfiles().filter(p => !['administrador'].includes(p.rol));
                if (res?.user?.club_guide_seen == 1 || res?.user?.club_guide_seen === true) {
                    localStorage.setItem('padelblox_club_guide_seen', 'true');
                    this.showClubGuideModal = false;
                }
            });
        }

        this.checkSubscriptionStatus();

        // Check if new club administrator should see the onboarding guide
        const role = this.computedRole;
        const localGuideSeen = localStorage.getItem('padelblox_club_guide_seen') === 'true';
        const userGuideSeen = currentUser?.club_guide_seen == 1 || currentUser?.club_guide_seen === true;

        if ((role === 'administrador_club' || role === 'staff_club') && !localGuideSeen && !userGuideSeen) {
            setTimeout(() => {
                const isSeenNow = localStorage.getItem('padelblox_club_guide_seen') === 'true';
                if (!isSeenNow) {
                    this.showClubGuideModal = true;
                }
            }, 800);
        }
    }

    openClubGuide() {
        this.showClubGuideModal = true;
    }

    checkSubscriptionStatus() {
        const currentUserId = this.userId || localStorage.getItem('userId');
        const role = (this.computedRole || '').toLowerCase();
        if (!currentUserId || role === 'administrador' || role === 'superadmin' || role === 'jugador' || role === 'alumno') {
            return;
        }
        const token = localStorage.getItem('token');
        const authValue = token ? `Bearer ${token}` : '';
        const clubId = localStorage.getItem('selectedClubId') || '';
        fetch(`${environment.apiUrl}/subscriptions/get_subscription_status.php?user_id=${currentUserId}&role=${role}&club_id=${clubId}`, {
            headers: {
                'Authorization': authValue,
                'X-Authorization': authValue
            }
        })
        .then(r => r.json())
        .then(res => {
            if (res.status === 'blocked' || res.status === 'inactive' || res.status === 'past_due' || res.is_blocked) {
                this.isSubscriptionBlocked = true;
            } else {
                this.isSubscriptionBlocked = false;
            }
        })
        .catch(() => {});
    }

    private formatPhotoUrl(foto: string): string {
        return this.assetService.getAssetUrl(foto, 'perfil');
    }

    private applyFallbackFoto(user?: any) {
        if (this._hasInputFoto && this._jugadorFoto) return;
        
        const currentUser = user || this.authService.getCurrentUser();
        if (currentUser) {
            const fotoRaw = currentUser.foto_perfil || currentUser.link_foto || currentUser.foto;
            if (fotoRaw) {
                this._jugadorFoto = this.formatPhotoUrl(fotoRaw);
            }
        }
    }

    toggleSidebar() {
        this.isOpen = !this.isOpen;
    }

    closeSidebar() {
        this.isOpen = false;
    }

    toggleSwitchMenu() {
        this.showSwitchMenu = !this.showSwitchMenu;
    }

    switchProfile(perfil: any) {
        this.authService.switchProfile(perfil);
    }

    createNewProfile() {
        Swal.fire({
            title: 'Crear Nuevo Perfil',
            html: `
                <div style="display: flex; gap: 15px; justify-content: center; margin-top: 20px;">
                    <div id="btn-entrenador" style="cursor: pointer; border: 2px solid #eee; border-radius: 12px; padding: 20px; width: 140px; transition: all 0.2s;"
                        onmouseover="this.style.borderColor='#ccff00'; this.style.background='#f9f9f9'"
                        onmouseout="this.style.borderColor='#eee'; this.style.background='transparent'">
                        <div style="font-size: 40px; margin-bottom: 10px;">🎾</div>
                        <h3 style="font-size: 16px; font-weight: 700; margin: 0; color: #111;">Entrenador</h3>
                        <p style="font-size: 11px; color: #666; margin: 5px 0 0 0;">Quiero ofrecer clases</p>
                    </div>
                </div>
            `,
            showConfirmButton: false,
            showCloseButton: true,
            didOpen: () => {
                const btnEntrenador = document.getElementById('btn-entrenador');
                btnEntrenador?.addEventListener('click', () => {
                    Swal.close();
                    this.flowEntrenador();
                });
            }
        });
    }

    flowEntrenador() {
        Swal.showLoading();
        this.clubesService.getClubes().subscribe(clubes => {
            Swal.close();
            const options: any = {};
            clubes.forEach(c => options[c.id] = c.nombre);
            let chosenClubId: number = 0;
            Swal.fire({
                title: 'Selecciona tu Club',
                input: 'select',
                inputOptions: options,
                inputPlaceholder: 'Selecciona un club',
                showCancelButton: true,
                confirmButtonText: 'Unirme',
                confirmButtonColor: '#111',
                showLoaderOnConfirm: true,
                preConfirm: (clubId) => {
                    if (!clubId) return Swal.showValidationMessage('Debes seleccionar un club');
                    chosenClubId = parseInt(clubId);
                    return this.authService.addProfile(this.userId!, chosenClubId, 'entrenador').toPromise()
                        .then(res => {
                            if (!res.success) throw new Error(res.message);
                            return this.authService.refreshSession(this.userId!).toPromise();
                        })
                        .catch(err => Swal.showValidationMessage(err.message));
                }
            }).then((result) => {
                if (result.isConfirmed) {
                    const profiles = this.authService.getProfiles();
                    const newProfile = profiles.find(p => p.rol === 'entrenador' && p.club_id == chosenClubId);
                    if (newProfile) this.authService.switchProfile(newProfile);
                }
            });
        });
    }

    navigate(path: string) {
        this.closeSidebar(); 
        if (this.isSubscriptionBlocked && path !== '/mi-plan' && path !== 'mi-plan' && path !== 'create-profile') {
            Swal.fire({
                title: 'Periodo de Prueba Finalizado 💎',
                text: 'Tu periodo de prueba de 90 días ha finalizado. Para seguir utilizando las funciones de tu club o academia, debes activar tu plan mensual.',
                icon: 'warning',
                confirmButtonText: 'IR A MI PLAN Y ACTIVAR',
                confirmButtonColor: '#ccff00'
            }).then(() => {
                this.router.navigate(['/mi-plan']);
            });
            return;
        }
        if (path === 'create-profile') {
            this.createNewProfile();
        } else {
            this.router.navigate([path]);
        }
    }

    openTvMode() {
        this.closeSidebar();

        // 1. Prioridad: Club seleccionado actualmente en el panel
        const storedSelected = localStorage.getItem('selectedClubId');
        if (storedSelected && storedSelected !== 'undefined' && storedSelected !== 'null' && storedSelected !== '0') {
            window.open(`/#/tv/${storedSelected}`, '_blank');
            return;
        }

        // 2. Club asignado en la sesión del usuario logueado
        const currentUser = this.authService.getCurrentUser() || JSON.parse(localStorage.getItem('currentUser') || 'null');
        if (currentUser && currentUser.club_id) {
            localStorage.setItem('selectedClubId', String(currentUser.club_id));
            window.open(`/#/tv/${currentUser.club_id}`, '_blank');
            return;
        }

        // 3. Revisar en los perfiles disponibles del usuario
        const profiles = this.authService.getProfiles();
        const clubProfile = profiles.find(p => p.club_id && (p.rol?.includes('admin') || p.rol?.includes('staff')));
        if (clubProfile && clubProfile.club_id) {
            localStorage.setItem('selectedClubId', String(clubProfile.club_id));
            window.open(`/#/tv/${clubProfile.club_id}`, '_blank');
            return;
        }

        // 4. Si no está en memoria, consultar los clubes del usuario vía API
        const currentUserId = this.userId || Number(localStorage.getItem('userId'));
        if (currentUserId) {
            Swal.showLoading();
            this.clubesService.getClubes(currentUserId).subscribe({
                next: (clubes) => {
                    Swal.close();
                    if (clubes && clubes.length > 0) {
                        const targetClubId = clubes[0].id || clubes[0].club_id;
                        localStorage.setItem('selectedClubId', String(targetClubId));
                        window.open(`/#/tv/${targetClubId}`, '_blank');
                    } else {
                        Swal.fire({
                            title: 'Sin Sedes Activas',
                            text: 'No tienes una sede configurada para abrir el Modo TV.',
                            icon: 'info',
                            confirmButtonColor: '#ccff00'
                        });
                    }
                },
                error: () => {
                    Swal.close();
                    Swal.fire({
                        title: 'Error',
                        text: 'No se pudo obtener la información de tu sede.',
                        icon: 'error'
                    });
                }
            });
            return;
        }

        Swal.fire({
            title: 'Inicia Sesión',
            text: 'Debes iniciar sesión con una cuenta de club para acceder a la pantalla TV.',
            icon: 'warning',
            confirmButtonColor: '#ccff00'
        });
    }

    logout() {
        this.authService.logout();
        this.router.navigate(['/login']);
    }
}
