import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventarioService } from '../../services/inventario.service';
import { ApiService } from '../../services/api.service';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-club-inventario',
    standalone: true,
    imports: [CommonModule, FormsModule, SidebarComponent],
    templateUrl: './club-inventario.component.html',
    styleUrls: ['./club-inventario.component.scss']
})
export class ClubInventarioComponent implements OnInit {
    productos: any[] = [];
    searchTerm: string = '';
    clubId: number | null = null;
    isLoading: boolean = false;
    
    // Pagination State
    currentPage: number = 1;
    pageSize: number = 5;
    pageSizeOptions: number[] = [5, 10, 20, 50, 100];
    
    // Club Tabs
    clubes: any[] = [];
    selectedClubId: number | null = null; // 0 = Global / Admin view
    globalStats: any = { total: 0, lowStock: 0, totalValue: 0, totalCost: 0, totalProfit: 0, totalTax: 0 };
    allClubProductos: any[] = [];

    // Sidebar Context
    userId: number | null = null;
    userName: string = '';
    userFoto: string | null = null;
    userRole: any = 'administrador_club';

    // Modal State
    showModal: boolean = false;
    isEditing: boolean = false;
    editingProd: any = this.resetProd();

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
        
        // Filtrar solo los que tienen club_id asignado (evitar perfiles genéricos)
        this.clubes = profiles.filter((p: any) => p.club_id && p.club_nombre);

        if (this.clubes.length > 0) {
            this.selectedClubId = this.clubes[0].club_id;
            this.clubId = this.selectedClubId;
            this.loadProductos();
            this.loadCategorias();
        } else if (currentUser.club_id) {
            this.selectedClubId = currentUser.club_id;
            this.clubId = currentUser.club_id;
            this.loadProductos();
            this.loadCategorias();
        }
    }

    loadGlobalData() {
        this.isLoading = true;
        this.allClubProductos = [];
        this.globalStats = { total: 0, lowStock: 0, totalValue: 0, totalCost: 0, totalProfit: 0, totalTax: 0 };
        
        let loaded = 0;
        this.clubes.forEach(c => {
            this.inventarioService.getProductos(c.club_id).subscribe(res => {
                if (res.success) {
                    this.allClubProductos = [...this.allClubProductos, ...res.productos];
                    this.globalStats.total += res.productos.length;
                    this.globalStats.lowStock += res.productos.filter((p: any) => p.tipo !== 'servicio' && p.stock_actual <= p.stock_minimo).length;
                    
                    const val = res.productos.reduce((acc: number, p: any) => acc + (p.tipo !== 'servicio' ? (p.stock_actual * parseFloat(p.precio_venta || 0)) : 0), 0);
                    const cost = res.productos.reduce((acc: number, p: any) => acc + (p.tipo !== 'servicio' ? (p.stock_actual * parseFloat(p.precio_costo || 0)) : 0), 0);
                    
                    this.globalStats.totalValue += val;
                    this.globalStats.totalCost += cost;
                    this.globalStats.totalProfit += (val - cost);
                    this.globalStats.totalTax += (val - (val / 1.19));
                }
                loaded++;
                if (loaded === this.clubes.length) this.isLoading = false;
            });
        });
    }

     selectClub(id: number) {
        this.selectedClubId = id;
        this.currentPage = 1;
        if (id === 0) {
            this.loadGlobalData();
        } else {
            this.clubId = id;
            this.loadProductos();
            this.loadCategorias();
        }
    }

    loadProductos() {
        if (!this.clubId) return;
        this.inventarioService.getProductos(this.clubId).subscribe(res => {
            if (res.success) {
                this.productos = res.productos;
                this.clampCurrentPage();
            }
        });
    }

    clampCurrentPage() {
        const total = this.filteredProductos.length;
        const maxPage = Math.ceil(total / Number(this.pageSize)) || 1;
        if (this.currentPage > maxPage) {
            this.currentPage = maxPage;
        }
    }

    selectedCategory: string = 'Todas';
    categories: string[] = ['Bebidas', 'Pelotas', 'Indumentaria', 'Accesorios', 'Otros'];

    loadCategorias() {
        if (!this.clubId) return;
        this.inventarioService.getCategorias(this.clubId).subscribe(res => {
            if (res.success && res.categorias && res.categorias.length > 0) {
                this.categories = res.categorias.map((c: any) => c.nombre);
            } else {
                this.categories = ['Bebidas', 'Pelotas', 'Indumentaria', 'Accesorios', 'Otros'];
            }
        });
    }

    getCategoryEmoji(cat: string): string {
        switch (cat) {
            case 'Bebidas': return '🥤';
            case 'Pelotas': return '🎾';
            case 'Indumentaria': return '👕';
            case 'Accesorios': return '🎒';
            default: return '🏷️';
        }
    }

    onlyLowStock: boolean = false;

    toggleLowStockFilter() {
        this.onlyLowStock = !this.onlyLowStock;
        this.currentPage = 1;
    }

    get filteredProductos() {
        let list = this.productos;
        if (this.selectedClubId === 0) {
            list = this.allClubProductos;
        }
        return list.filter(p => {
            const matchesSearch = p.nombre.toLowerCase().includes(this.searchTerm.toLowerCase());
            const matchesCat = this.selectedCategory === 'Todas' || p.categoria === this.selectedCategory;
            const matchesLowStock = !this.onlyLowStock || (p.tipo !== 'servicio' && Number(p.stock_actual) <= Number(p.stock_minimo));
            return matchesSearch && matchesCat && matchesLowStock;
        });
    }

    private _lastTotalPages = 0;
    private _pagesArray: number[] = [];

    get paginatedProductos() {
        const filtered = this.filteredProductos;
        const total = filtered.length;
        const pageSizeNum = Number(this.pageSize);
        const maxPage = Math.ceil(total / pageSizeNum) || 1;
        const localPage = Math.min(Math.max(1, this.currentPage), maxPage);
        const start = (localPage - 1) * pageSizeNum;
        return filtered.slice(start, start + pageSizeNum);
    }

    get totalPages(): number {
        return Math.ceil(this.filteredProductos.length / Number(this.pageSize)) || 1;
    }

    get pageRangeText(): string {
        const total = this.filteredProductos.length;
        if (total === 0) return 'Mostrando 0 productos';
        const pageSizeNum = Number(this.pageSize);
        const localPage = Math.min(Math.max(1, this.currentPage), this.totalPages);
        const start = (localPage - 1) * pageSizeNum + 1;
        const end = Math.min(localPage * pageSizeNum, total);
        return `Mostrando ${start} - ${end} de ${total} productos`;
    }

    get pagesArray(): number[] {
        const total = this.totalPages;
        if (total !== this._lastTotalPages) {
            this._lastTotalPages = total;
            this._pagesArray = Array.from({ length: total }, (_, i) => i + 1);
        }
        return this._pagesArray;
    }

    // Stats Getters
    get lowStockCount() {
        return this.productos.filter(p => p.tipo !== 'servicio' && p.stock_actual <= p.stock_minimo).length;
    }

    get totalInventoryValue() {
        return this.productos.reduce((acc, p) => acc + (p.tipo !== 'servicio' ? (p.stock_actual * p.precio_venta) : 0), 0);
    }

    get totalInventoryCost() {
        return this.productos.reduce((acc, p) => acc + (p.tipo !== 'servicio' ? (p.stock_actual * parseFloat(p.precio_costo || 0)) : 0), 0);
    }

    get totalInventoryProfit() {
        const val = this.totalInventoryValue;
        const cost = this.totalInventoryCost;
        return val - cost;
    }

    get totalInventoryTax() {
        const val = this.totalInventoryValue;
        return val - (val / 1.19);
    }

    resetProd() {
        return {
            nombre: '',
            categoria: 'Otros',
            precio_costo: 0,
            precio_venta: 0,
            stock_actual: 0,
            stock_minimo: 5,
            tipo: 'producto'
        };
    }

    openAddModal() {
        this.isEditing = false;
        this.editingProd = this.resetProd();
        this.showModal = true;
    }

    editarProducto(p: any) {
        this.isEditing = true;
        this.editingProd = { tipo: 'producto', ...p };
        this.showModal = true;
    }

    eliminarProducto(p: any) {
        Swal.fire({
            title: '¿Eliminar producto?',
            text: `¿Estás seguro de desactivar ${p.nombre}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                this.inventarioService.deleteProducto(p.id).subscribe(res => {
                    if (res.success) {
                        this.loadProductos();
                        Swal.fire('Eliminado', 'El producto ha sido desactivado', 'success');
                    }
                });
            }
        });
    }

    closeModal() {
        this.showModal = false;
    }

    saveProducto() {
        if (!this.editingProd.nombre) {
            Swal.fire('Atención', 'El nombre del producto es obligatorio', 'warning');
            return;
        }

        if (this.editingProd.precio_venta < 0 || this.editingProd.precio_costo < 0 || this.editingProd.stock_actual < 0) {
            Swal.fire('Atención', 'Los precios y el stock no pueden ser valores negativos', 'warning');
            return;
        }

        this.isLoading = true;
        const payload = { ...this.editingProd, club_id: this.clubId };

        this.inventarioService.addProducto(payload).subscribe({
            next: (res: any) => {
                this.isLoading = false;
                if (res.success) {
                    this.loadProductos();
                    this.closeModal();
                }
            },
            error: (err) => {
                this.isLoading = false;
                console.error('Error saving product', err);
            }
        });
    }
}
