import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventarioService } from '../../services/inventario.service';
import { ApiService } from '../../services/api.service';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-club-ventas',
    standalone: true,
    imports: [CommonModule, FormsModule, SidebarComponent],
    templateUrl: './club-ventas.component.html',
    styleUrls: ['./club-ventas.component.scss']
})
export class ClubVentasComponent implements OnInit {
    private static getTodayString(): string {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    ventas: any[] = [];
    fechaFiltro: string = ClubVentasComponent.getTodayString();
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
    
    // POS State
    showSaleModal: boolean = false;
    availableProducts: any[] = [];
    allPlayers: any[] = [];
    filteredPlayers: any[] = [];
    playerSearchTerm: string = '';
    selectedPlayer: any = null;
    cart: any[] = [];
    metodoPago: string = 'Efectivo';
    productSearchTerm: string = '';
    customFecha: string = '';
    customHora: string = '';
    
    // UX & Categories
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

    getProductImage(nombre: string, categoria: string): string {
        const name = (nombre || '').toLowerCase();
        if (name.includes('grip') || name.includes('overgrip')) return 'assets/images/pos-grip.jpg';
        if (name.includes('agua') || name.includes('cachantun') || name.includes('cachantún') || name.includes('mineral')) return 'assets/images/pos-water.jpg';
        if (name.includes('cola') || name.includes('fanta') || name.includes('sprite') || name.includes('bebida') || name.includes('lata') || name.includes('nectar') || name.includes('néctar') || name.includes('jugo')) return 'assets/images/pos-soda.jpg';
        if (name.includes('pelota') || name.includes('bola') || name.includes('tubo') || name.includes('balls')) return 'assets/images/pos-balls.jpg';
        if (name.includes('pala') || name.includes('raqueta') || name.includes('paleta')) return 'assets/images/pos-racket.jpg';
        if (name.includes('camiseta') || name.includes('polera') || name.includes('ropa') || name.includes('short') || name.includes('falda') || name.includes('calcetin') || name.includes('calcetín')) return 'assets/images/pos-clothing.jpg';
        
        // Fallback by category
        switch (categoria) {
            case 'Bebidas': return 'assets/images/pos-soda.jpg';
            case 'Pelotas': return 'assets/images/pos-balls.jpg';
            case 'Indumentaria': return 'assets/images/pos-clothing.jpg';
            case 'Accesorios': return 'assets/images/pos-grip.jpg';
            default: return 'assets/images/pos-default.jpg';
        }
    }

    globalStats: any = { total: 0, cash: 0, card: 0, ops: 0 };

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
            this.loadVentas();
            this.loadCategorias();
        } else if (currentUser.club_id) {
            this.selectedClubId = currentUser.club_id;
            this.clubId = currentUser.club_id;
            this.loadVentas();
            this.loadCategorias();
        }
    }

    allClubVentas: any[] = [];

    loadGlobalVentas() {
        this.isLoading = true;
        this.allClubVentas = [];
        this.globalStats = { total: 0, cash: 0, card: 0, reserve: 0, ops: 0, productos: 0, servicios: 0 };
        
        let loaded = 0;
        this.clubes.forEach(c => {
            this.inventarioService.getVentas(c.club_id, this.fechaFiltro, this.fechaFiltro).subscribe({
                next: (res) => {
                    if (res.success) {
                        this.allClubVentas = [...this.allClubVentas, ...res.ventas];
                        res.ventas.forEach((v: any) => {
                            const amt = parseFloat(v.total);
                            this.globalStats.total += amt;
                            this.globalStats.ops++;
                            if (v.metodo_pago === 'Efectivo') this.globalStats.cash += amt;
                            else if (v.metodo_pago === 'Reserva' || v.metodo_pago === 'Varios') this.globalStats.reserve += amt;
                            else this.globalStats.card += amt;

                            // Calcular montos de items para vista global
                            const items = v.items || [];
                            items.forEach((item: any) => {
                                const itemAmt = Number(item.cantidad) * parseFloat(item.precio_unitario);
                                if (item.tipo === 'producto') {
                                    this.globalStats.productos += itemAmt;
                                } else {
                                    this.globalStats.servicios += itemAmt;
                                }
                            });
                        });
                    }
                    loaded++;
                    if (loaded === this.clubes.length) this.isLoading = false;
                },
                error: (err) => {
                    console.error(`Error cargando ventas del club ${c.club_id}:`, err);
                    loaded++;
                    if (loaded === this.clubes.length) this.isLoading = false;
                }
            });
        });
    }

    selectClub(id: number) {
        this.selectedClubId = id;
        this.currentPage = 1;
        if (id === 0) {
            this.loadGlobalVentas();
        } else {
            this.clubId = id;
            this.loadVentas();
            this.loadCategorias();
        }
    }

    loadVentas() {
        if (!this.clubId) return;
        this.isLoading = true;
        this.currentPage = 1;
        this.inventarioService.getVentas(this.clubId, this.fechaFiltro, this.fechaFiltro).subscribe({
            next: (res: any) => {
                this.isLoading = false;
                if (res.success) {
                    this.ventas = res.ventas;
                }
            },
            error: () => this.isLoading = false
        });
    }

    getHoraVenta(v: any): string {
        if (v.hora_inicio && String(v.hora_inicio).length >= 5) {
            return String(v.hora_inicio).substring(0, 5);
        }
        if (!v.fecha) return '--:--';
        const cleanFecha = String(v.fecha).replace('T', ' ');
        const parts = cleanFecha.split(' ');
        if (parts[1] && parts[1].length >= 5) {
            return parts[1].substring(0, 5);
        }
        return '--:--';
    }

    // Getters for summary values
    get totalRecaudado() {
        return this.ventas.reduce((acc, v) => acc + parseFloat(v.total), 0);
    }

    get totalEfectivo() {
        return this.ventas
            .filter(v => v.metodo_pago === 'Efectivo')
            .reduce((acc, v) => acc + parseFloat(v.total), 0);
    }

    get totalReservas() {
        return this.ventas
            .filter(v => v.metodo_pago === 'Reserva' || v.metodo_pago === 'Varios')
            .reduce((acc, v) => acc + parseFloat(v.total), 0);
    }

    get totalTarjetas() {
        return this.ventas
            .filter(v => v.metodo_pago !== 'Efectivo' && v.metodo_pago !== 'Reserva' && v.metodo_pago !== 'Varios')
            .reduce((acc, v) => acc + parseFloat(v.total), 0);
    }

    get totalProductos(): number {
        return this.ventas.reduce((acc, v) => {
            const items = v.items || [];
            const prodTotal = items
                .filter((item: any) => item.tipo === 'producto')
                .reduce((itemAcc: number, item: any) => itemAcc + (Number(item.cantidad) * parseFloat(item.precio_unitario)), 0);
            return acc + prodTotal;
        }, 0);
    }

    get totalServicios(): number {
        return this.ventas.reduce((acc, v) => {
            const items = v.items || [];
            const servTotal = items
                .filter((item: any) => item.tipo === 'servicio')
                .reduce((itemAcc: number, item: any) => itemAcc + (Number(item.cantidad) * parseFloat(item.precio_unitario)), 0);
            return acc + servTotal;
        }, 0);
    }

    // Detail PopUp state
    showDetailModal: boolean = false;
    detailModalTitle: string = '';
    detailModalItems: any[] = [];

    openDetailModal(type: 'productos' | 'servicios') {
        const itemType = type === 'productos' ? 'producto' : 'servicio';
        this.detailModalTitle = type === 'productos' ? 'Detalle de Productos Vendidos' : 'Detalle de Servicios Vendidos';
        
        // Determinar qué ventas inspeccionar
        const sourceVentas = this.selectedClubId === 0 ? this.allClubVentas : this.ventas;
        
        // Agrupar items por nombre
        const grouped: { [key: string]: any } = {};
        
        sourceVentas.forEach((v: any) => {
            const items = v.items || [];
            items.forEach((item: any) => {
                if (item.tipo === itemType) {
                    const name = item.producto_nombre || 'Desconocido';
                    const category = item.categoria || (itemType === 'servicio' ? 'Servicios' : 'Otros');
                    const qty = Number(item.cantidad || 0);
                    const price = parseFloat(item.precio_unitario || 0);
                    const total = qty * price;
                    
                    if (grouped[name]) {
                        grouped[name].cantidad += qty;
                        grouped[name].total += total;
                    } else {
                        grouped[name] = {
                            nombre: name,
                            categoria: category,
                            cantidad: qty,
                            total: total
                        };
                    }
                }
            });
        });
        
        // Convertir a array y ordenar de mayor a menor venta
        this.detailModalItems = Object.values(grouped).sort((a: any, b: any) => b.total - a.total);
        this.showDetailModal = true;
    }

    editingVentaId: number | null = null;

    // POS Methods
    openNewSale() {
        if (!this.clubId || this.selectedClubId === 0) {
            Swal.fire('Atención', 'Selecciona un club específico para generar una venta', 'warning');
            return;
        }
        this.editingVentaId = null;
        this.showSaleModal = true;
        this.cart = [];
        this.selectedPlayer = null;
        this.playerSearchTerm = "";
        this.productSearchTerm = "";
        
        // Default customFecha to the date currently filtered on screen, or today
        this.customFecha = this.fechaFiltro || ClubVentasComponent.getTodayString();
        
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        this.customHora = `${hours}:${minutes}`;
        
        this.loadPOSData();
    }

    loadPOSData() {
        this.inventarioService.getProductos(this.clubId!).subscribe(res => {
            if (res.success) {
                this.availableProducts = res.productos;
                if (this.editingVentaId) {
                    this.cart.forEach(cItem => {
                        const match = this.availableProducts.find(p => p.id === cItem.id);
                        if (match) {
                            cItem.stock_actual = Number(match.stock_actual) + Number(cItem.cantidad);
                        } else {
                            cItem.stock_actual = cItem.cantidad;
                        }
                    });
                }
            }
        });
        this.apiService.getUsers().subscribe(res => {
            if (Array.isArray(res)) {
                this.allPlayers = res;
                this.filteredPlayers = [];
                if (this.selectedPlayer && this.selectedPlayer.id) {
                    const match = this.allPlayers.find(u => u.id === this.selectedPlayer.id);
                    if (match) this.selectedPlayer = match;
                }
            }
        });
    }

    searchPlayers() {
        if (!this.playerSearchTerm.trim()) {
            this.filteredPlayers = [];
            return;
        }
        const term = this.playerSearchTerm.toLowerCase();
        this.filteredPlayers = this.allPlayers.filter(u => 
            u.nombre.toLowerCase().includes(term) || (u.email && u.email.toLowerCase().includes(term))
        ).slice(0, 5);
    }

    selectPlayer(p: any) {
        this.selectedPlayer = p;
        this.playerSearchTerm = p.nombre;
        this.filteredPlayers = [];
    }

    clearPlayer() {
        this.selectedPlayer = null;
        this.playerSearchTerm = '';
        this.filteredPlayers = [];
    }

    addToCart(p: any) {
        if (p.stock_actual <= 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Sin Stock',
                text: `El producto "${p.nombre}" no tiene unidades disponibles en el inventario.`,
                confirmButtonColor: '#0f172a'
            });
            return;
        }

        const existing = this.cart.find(item => item.id === p.id);
        if (existing) {
            if (existing.cantidad >= p.stock_actual) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Límite de Stock',
                    text: `No puedes agregar más unidades de "${p.nombre}". Stock disponible: ${p.stock_actual}.`,
                    confirmButtonColor: '#0f172a'
                });
                return;
            }
            existing.cantidad++;
        } else {
            this.cart.push({ ...p, cantidad: 1, es_premio: false, precio_original: p.precio_venta });
        }
    }

    decreaseQty(item: any) {
        if (item.cantidad > 1) {
            item.cantidad--;
        } else {
            this.removeFromCart(item);
        }
    }

    increaseQty(item: any) {
        if (item.cantidad >= item.stock_actual) {
            Swal.fire({
                icon: 'warning',
                title: 'Límite de Stock',
                text: `No puedes agregar más unidades de "${item.nombre}". Stock disponible: ${item.stock_actual}.`,
                confirmButtonColor: '#0f172a'
            });
            return;
        }
        item.cantidad++;
    }

    removeFromCart(target: any) {
        if (typeof target === 'number') {
            this.cart = this.cart.filter(item => item.id !== target);
        } else {
            this.cart = this.cart.filter(item => item !== target);
        }
    }

    togglePremio(item: any) {
        if (item.es_premio) {
            item.precio_original = item.precio_original || item.precio_venta;
            item.precio_venta = 0;
        } else {
            item.precio_venta = item.precio_original || item.precio_venta;
        }
    }

    get cartTotal() {
        return this.cart.reduce((acc, item) => acc + (item.precio_venta * item.cantidad), 0);
    }

    get filteredAvailableProducts() {
        return this.availableProducts.filter(p => {
            const matchesCat = this.selectedCategory === 'Todas' || p.categoria === this.selectedCategory;
            const matchesSearch = p.nombre.toLowerCase().includes(this.productSearchTerm.toLowerCase());
            return matchesCat && matchesSearch;
        });
    }

    finalizarVenta() {
        if (this.cart.length === 0) return;
        
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const loggedInUserId = this.userId || localStorage.getItem('userId') || currentUser.id || 0;
        const fechaStr = (this.customFecha && this.customHora) ? `${this.customFecha} ${this.customHora}:00` : (this.customFecha ? `${this.customFecha} 12:00:00` : null);

        const venta: any = {
            club_id: this.clubId,
            usuario_id: loggedInUserId,
            jugador_id: this.selectedPlayer ? this.selectedPlayer.id : null,
            total: this.cartTotal,
            metodo_pago: this.metodoPago,
            fecha: fechaStr,
            items: this.cart.map(item => ({
                id: item.id,
                cantidad: item.cantidad,
                precio_venta: item.precio_venta
            }))
        };

        if (this.editingVentaId) {
            venta.venta_id = this.editingVentaId;
            this.inventarioService.updateVenta(venta).subscribe(res => {
                if (res.success) {
                    Swal.fire('Venta Actualizada', 'La venta ha sido modificada correctamente', 'success');
                    this.showSaleModal = false;
                    this.editingVentaId = null;
                    if (this.customFecha) {
                        this.fechaFiltro = this.customFecha;
                    }
                    if (this.selectedClubId === 0) {
                        this.loadGlobalVentas();
                    } else {
                        this.loadVentas();
                    }
                } else {
                    Swal.fire('Error', res.error || 'No se pudo actualizar la venta', 'error');
                }
            });
        } else {
            this.inventarioService.registrarVenta(venta).subscribe(res => {
                if (res.success) {
                    Swal.fire('Venta Exitosa', 'La venta ha sido registrada correctamente', 'success');
                    this.showSaleModal = false;
                    if (this.customFecha) {
                        this.fechaFiltro = this.customFecha;
                    }
                    if (this.selectedClubId === 0) {
                        this.loadGlobalVentas();
                    } else {
                        this.loadVentas();
                    }
                } else {
                    Swal.fire('Error', res.error || 'No se pudo registrar la venta', 'error');
                }
            });
        }
    }

    anularVenta(id: number) {
        Swal.fire({
            title: '¿Anular venta?',
            text: 'Esta acción revertirá el stock de los productos. ¿Estás seguro?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Sí, anular',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                this.inventarioService.deleteVenta(id).subscribe({
                    next: (res) => {
                        if (res.success) {
                            Swal.fire('Anulada', 'La venta ha sido anulada con éxito', 'success');
                            this.loadVentas();
                        } else {
                            Swal.fire('Error', res.error || 'No se pudo anular la venta', 'error');
                        }
                    },
                    error: (err) => {
                        console.error('Error al anular venta:', err);
                        Swal.fire('Error', 'No se pudo contactar con el servidor para anular la venta.', 'error');
                    }
                });
            }
        });
    }

    editarVenta(v: any) {
        const targetClubId = v.club_id || this.clubId;
        if (!targetClubId) {
            Swal.fire('Atención', 'No se pudo identificar el club de esta venta', 'warning');
            return;
        }

        this.clubId = targetClubId;
        this.editingVentaId = v.id;
        this.metodoPago = v.metodo_pago || 'Efectivo';
        this.productSearchTerm = '';

        if (v.fecha) {
            const cleanFecha = String(v.fecha).replace('T', ' ');
            const parts = cleanFecha.split(' ');
            this.customFecha = (parts[0] && parts[0].length === 10) ? parts[0] : this.fechaFiltro;
            this.customHora = (parts[1] && parts[1].length >= 5) ? parts[1].substring(0, 5) : '12:00';
        } else {
            this.customFecha = this.fechaFiltro;
            this.customHora = '12:00';
        }

        if (v.jugador_id || v.cliente) {
            this.selectedPlayer = { id: v.jugador_id || 0, nombre: v.cliente || 'Cliente', email: '' };
            this.playerSearchTerm = v.cliente || '';
        } else {
            this.selectedPlayer = null;
            this.playerSearchTerm = '';
        }

        const rawItems = v.items || [];
        const cartMap = new Map<string, any>();
        
        rawItems.forEach((item: any) => {
            const pId = Number(item.producto_id || 0);
            const pUnit = parseFloat(item.precio_unitario || 0);
            const pName = String(item.producto_nombre || '').trim();
            const pNameLower = pName.toLowerCase();
            const isCanchaService = (pId === 0 || pNameLower === 'alquiler de cancha' || pNameLower.startsWith('alquiler de cancha -') || pNameLower === 'torneo americano' || pNameLower === 'entrenamiento');
            const key = isCanchaService ? 'cancha_0' : `prod_${pId}`;
            
            if (cartMap.has(key)) {
                const existing = cartMap.get(key);
                if (!isCanchaService) {
                    existing.cantidad += Number(item.cantidad || 1);
                } else if (pName.includes(' - ') && !existing.nombre.includes(' - ')) {
                    existing.nombre = pName;
                }
            } else {
                cartMap.set(key, {
                    id: isCanchaService ? 0 : pId,
                    nombre: pName || 'Producto',
                    precio_venta: pUnit,
                    precio_original: pUnit,
                    cantidad: Number(item.cantidad || 1),
                    stock_actual: Number(item.cantidad || 1),
                    es_premio: pUnit === 0
                });
            }
        });

        this.cart = Array.from(cartMap.values());

        this.showSaleModal = true;
        this.loadPOSData();
    }

    // Paginación
    currentPage: number = 1;
    pageSize: number = 5;
    pageSizeOptions: number[] = [5, 10, 20, 50, 100];
    private _lastTotalPages = 0;
    private _pagesArray: number[] = [];

    get paginatedVentas(): any[] {
        const total = this.ventas.length;
        const pageSizeNum = Number(this.pageSize);
        const maxPage = Math.ceil(total / pageSizeNum) || 1;
        const localPage = Math.min(Math.max(1, this.currentPage), maxPage);
        const start = (localPage - 1) * pageSizeNum;
        return this.ventas.slice(start, start + pageSizeNum);
    }

    get totalPages(): number {
        return Math.ceil(this.ventas.length / Number(this.pageSize)) || 1;
    }

    get pageRangeText(): string {
        const total = this.ventas.length;
        if (total === 0) return '0-0 de 0';
        const pageSizeNum = Number(this.pageSize);
        const localPage = Math.min(Math.max(1, this.currentPage), this.totalPages);
        const start = (localPage - 1) * pageSizeNum + 1;
        const end = Math.min(localPage * pageSizeNum, total);
        return `${start}-${end} de ${total}`;
    }

    get pagesArray(): number[] {
        const total = this.totalPages;
        if (total !== this._lastTotalPages) {
            this._lastTotalPages = total;
            this._pagesArray = Array.from({ length: total }, (_, i) => i + 1);
        }
        return this._pagesArray;
    }
}
