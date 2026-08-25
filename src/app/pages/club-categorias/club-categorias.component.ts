import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventarioService } from '../../services/inventario.service';
import { ApiService } from '../../services/api.service';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-club-categorias',
    standalone: true,
    imports: [CommonModule, FormsModule, SidebarComponent],
    templateUrl: './club-categorias.component.html',
    styleUrls: ['./club-categorias.component.scss']
})
export class ClubCategoriasComponent implements OnInit {
    categorias: any[] = [];
    newCategoryName: string = '';
    clubId: number | null = null;
    isLoading: boolean = false;

    // Club Tabs
    clubes: any[] = [];
    selectedClubId: number | null = null; // 0 = Global

    // Sidebar Context
    userId: number | null = null;
    userName: string = '';
    userFoto: string | null = null;
    userRole: any = 'administrador_club';

    // Editing State
    editingId: number | null = null;
    editingName: string = '';

    get isStaff(): boolean {
        const role = localStorage.getItem('userRole') || '';
        return role.toLowerCase().includes('staff');
    }

    constructor(
        private inventarioService: InventarioService,
        private apiService: ApiService
    ) { }

    ngOnInit(): void {
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const profiles = JSON.parse(localStorage.getItem('availableProfiles') || '[]');
        const storedRole = localStorage.getItem('userRole') || '';

        this.userId = currentUser.id;
        this.userName = currentUser.nombre || 'Usuario';
        this.userFoto = currentUser.foto_perfil || null;
        this.userRole = storedRole || currentUser.rol || 'administrador_club';

        this.clubes = profiles.filter((p: any) => p.club_id && p.club_nombre);

        if (this.clubes.length > 0) {
            this.selectedClubId = this.clubes[0].club_id;
            this.clubId = this.selectedClubId;
            this.loadCategorias();
        } else if (currentUser.club_id) {
            this.selectedClubId = currentUser.club_id;
            this.clubId = currentUser.club_id;
            this.loadCategorias();
        }
    }

    selectClub(id: number) {
        this.selectedClubId = id;
        if (id === 0) {
            // Global view - categories are club-specific, so we disable global addition
            this.categorias = [];
        } else {
            this.clubId = id;
            this.loadCategorias();
        }
    }

    loadCategorias() {
        if (!this.clubId) return;
        this.isLoading = true;
        this.inventarioService.getCategorias(this.clubId).subscribe({
            next: (res: any) => {
                this.isLoading = false;
                if (res.success) {
                    this.categorias = res.categorias;
                }
            },
            error: () => this.isLoading = false
        });
    }

    getCategoryEmoji(catName: string): string {
        const name = catName.toLowerCase();
        if (name.includes('bebida') || name.includes('jugo') || name.includes('agua') || name.includes('gatorade')) return '🥤';
        if (name.includes('pelota') || name.includes('bola') || name.includes('tubo')) return '🎾';
        if (name.includes('ropa') || name.includes('polo') || name.includes('polera') || name.includes('short') || name.includes('indumentaria') || name.includes('calcet')) return '👕';
        if (name.includes('pala') || name.includes('paleta') || name.includes('raqueta') || name.includes('bolso') || name.includes('mochila') || name.includes('grip') || name.includes('accesorio')) return '🎒';
        return '🏷️';
    }

    addCategory() {
        const name = this.newCategoryName.trim();
        if (!name) {
            Swal.fire('Atención', 'El nombre de la categoría es obligatorio', 'warning');
            return;
        }

        if (!this.clubId) return;

        this.isLoading = true;
        this.inventarioService.addCategoria({ club_id: this.clubId, nombre: name }).subscribe({
            next: (res: any) => {
                this.isLoading = false;
                if (res.success) {
                    Swal.fire('Creada', 'La categoría ha sido creada con éxito', 'success');
                    this.newCategoryName = '';
                    this.loadCategorias();
                } else {
                    Swal.fire('Error', res.error || 'No se pudo crear la categoría', 'error');
                }
            },
            error: (err) => {
                this.isLoading = false;
                Swal.fire('Error', err.error?.error || 'Error al conectar con el servidor', 'error');
            }
        });
    }

    startEdit(cat: any) {
        this.editingId = cat.id;
        this.editingName = cat.nombre;
    }

    cancelEdit() {
        this.editingId = null;
        this.editingName = '';
    }

    saveEdit(cat: any) {
        const name = this.editingName.trim();
        if (!name) {
            Swal.fire('Atención', 'El nombre no puede estar vacío', 'warning');
            return;
        }

        if (!this.clubId) return;

        this.isLoading = true;
        this.inventarioService.addCategoria({ id: cat.id, club_id: this.clubId, nombre: name }).subscribe({
            next: (res: any) => {
                this.isLoading = false;
                if (res.success) {
                    Swal.fire('Actualizada', 'Categoría modificada correctamente. Todos los productos asociados fueron actualizados.', 'success');
                    this.editingId = null;
                    this.loadCategorias();
                } else {
                    Swal.fire('Error', res.error || 'No se pudo actualizar', 'error');
                }
            },
            error: (err) => {
                this.isLoading = false;
                Swal.fire('Error', err.error?.error || 'Error al conectar', 'error');
            }
        });
    }

    deleteCategory(cat: any) {
        Swal.fire({
            title: '¿Eliminar categoría?',
            text: `¿Estás seguro de eliminar "${cat.nombre}"? Todos los productos asociados pasarán a la categoría "Otros".`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed && this.clubId) {
                this.isLoading = true;
                this.inventarioService.deleteCategoria(cat.id, this.clubId).subscribe({
                    next: (res: any) => {
                        this.isLoading = false;
                        if (res.success) {
                            Swal.fire('Eliminada', 'La categoría ha sido eliminada', 'success');
                            this.loadCategorias();
                        } else {
                            Swal.fire('Error', res.error || 'No se pudo eliminar', 'error');
                        }
                    },
                    error: (err) => {
                        this.isLoading = false;
                        Swal.fire('Error', err.error?.error || 'Error al eliminar', 'error');
                    }
                });
            }
        });
    }
}
