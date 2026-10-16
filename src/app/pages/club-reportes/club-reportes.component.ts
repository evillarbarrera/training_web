import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClubesService } from '../../services/clubes.service';
import { InventarioService } from '../../services/inventario.service';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { Chart, registerables } from 'chart.js';
import Swal from 'sweetalert2';

Chart.register(...registerables);

@Component({
  selector: 'app-club-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: './club-reportes.component.html',
  styleUrls: ['./club-reportes.component.scss']
})
export class ClubReportesComponent implements OnInit {
  @ViewChild('salesChart') salesChartCanvas!: ElementRef;
  @ViewChild('resChart') resChartCanvas!: ElementRef;

  userId: number = 0;
  userName: string = '';
  userFoto: string = '';
  userRole: any = '';
  clubId: number = 0;
  clubes: any[] = [];

  activeTab: 'ventas' | 'reservas' | 'listado-ventas' | 'listado-reservas' | 'top-partidos' | 'top-reservas' = 'ventas';
  salesData: any = { daily: [], weekly: [], monthly: [] };
  resData: any = { daily: [], weekly: [], monthly: [] };

  salesChart: any;
  resChart: any;

  // Variables para listado de ventas detallado en reportes
  salesList: any[] = [];
  filteredSalesList: any[] = [];
  fechaInicioFiltro: string = '';
  fechaFinFiltro: string = '';
  metodoPagoFiltro: string = 'Todos';
  vendedorFiltro: string = 'Todos';
  vendedoresList: string[] = [];

  // Variables para listado de reservas detallado
  reservasList: any[] = [];
  filteredReservasList: any[] = [];
  canchaFiltro: string = 'Todas';
  estadoPagoFiltro: string = 'Todos';
  clienteFiltro: string = '';
  canchasFiltroList: string[] = [];

  // Top rankings
  topPartidos: any[] = [];
  topReservas: any[] = [];

  // Paginación para reportes de ventas
  currentPageReport: number = 1;
  pageSizeReport: number = 10;
  pageSizeOptionsReport: number[] = [5, 10, 20, 50, 100];
  private _lastTotalPagesReport = 0;
  private _pagesArrayReport: number[] = [];

  // Paginación para reportes de reservas
  currentPageResReport: number = 1;
  pageSizeResReport: number = 10;
  private _lastTotalPagesResReport = 0;
  private _pagesArrayResReport: number[] = [];

  get paginatedReportSales(): any[] {
    const total = this.filteredSalesList.length;
    const pageSizeNum = Number(this.pageSizeReport);
    const maxPage = Math.ceil(total / pageSizeNum) || 1;
    const localPage = Math.min(Math.max(1, this.currentPageReport), maxPage);
    const start = (localPage - 1) * pageSizeNum;
    return this.filteredSalesList.slice(start, start + pageSizeNum);
  }

  get totalPagesReport(): number {
    return Math.ceil(this.filteredSalesList.length / Number(this.pageSizeReport)) || 1;
  }

  get pageRangeTextReport(): string {
    const total = this.filteredSalesList.length;
    if (total === 0) return '0-0 de 0';
    const pageSizeNum = Number(this.pageSizeReport);
    const localPage = Math.min(Math.max(1, this.currentPageReport), this.totalPagesReport);
    const start = (localPage - 1) * pageSizeNum + 1;
    const end = Math.min(localPage * pageSizeNum, total);
    return `${start}-${end} de ${total}`;
  }

  get pagesArrayReport(): number[] {
    const total = this.totalPagesReport;
    if (total !== this._lastTotalPagesReport) {
      this._lastTotalPagesReport = total;
      this._pagesArrayReport = Array.from({ length: total }, (_, i) => i + 1);
    }
    return this._pagesArrayReport;
  }

  get paginatedReportReservas(): any[] {
    const total = this.filteredReservasList.length;
    const pageSizeNum = Number(this.pageSizeResReport);
    const maxPage = Math.ceil(total / pageSizeNum) || 1;
    const localPage = Math.min(Math.max(1, this.currentPageResReport), maxPage);
    const start = (localPage - 1) * pageSizeNum;
    return this.filteredReservasList.slice(start, start + pageSizeNum);
  }

  get totalPagesResReport(): number {
    return Math.ceil(this.filteredReservasList.length / Number(this.pageSizeResReport)) || 1;
  }

  get pageRangeTextResReport(): string {
    const total = this.filteredReservasList.length;
    if (total === 0) return '0-0 de 0';
    const pageSizeNum = Number(this.pageSizeResReport);
    const localPage = Math.min(Math.max(1, this.currentPageResReport), this.totalPagesResReport);
    const start = (localPage - 1) * pageSizeNum + 1;
    const end = Math.min(localPage * pageSizeNum, total);
    return `${start}-${end} de ${total}`;
  }

  get pagesArrayResReport(): number[] {
    const total = this.totalPagesResReport;
    if (total !== this._lastTotalPagesResReport) {
      this._lastTotalPagesResReport = total;
      this._pagesArrayResReport = Array.from({ length: total }, (_, i) => i + 1);
    }
    return this._pagesArrayResReport;
  }

  constructor(private clubesService: ClubesService, private inventarioService: InventarioService) {
    const userDataStr = localStorage.getItem('user') || localStorage.getItem('currentUser');
    const userData = JSON.parse(userDataStr || '{}');
    this.userId = userData.id || Number(localStorage.getItem('userId'));
    this.userName = userData.nombre || '';
    this.userFoto = userData.foto || userData.foto_perfil || '';
    this.userRole = (userData.rol || localStorage.getItem('userRole')) as any;
    this.clubId = userData.club_id || 0;
  }

  ngOnInit() {
    // Inicializar fechas de filtros (desde el primer día del mes actual hasta hoy)
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const getLocalYMD = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    this.fechaInicioFiltro = getLocalYMD(firstDay);
    this.fechaFinFiltro = getLocalYMD(now);

    this.loadClubes();
  }

  loadClubes() {
    this.clubesService.getClubes(this.userId).subscribe(res => {
      this.clubes = res;
      // If we don't have a specific clubId yet, choose the first one available
      if (this.clubes.length > 0 && (!this.clubId || this.clubId === 0)) {
        this.clubId = this.clubes[0].id;
      }
      this.refreshData();
    });
  }

  onClubChange() {
    this.refreshData();
  }

  isLoading: boolean = false;

  refreshData() {
    if (!this.clubId) return;
    this.isLoading = true;
    this.loadSalesData();
    this.loadResData();
    this.loadSalesList();
    this.loadReservasList();
    this.loadTopJugadores();
  }

  loadSalesData() {
    this.clubesService.getReporteVentas(this.clubId).subscribe({
      next: (res) => {
        this.salesData = res;
        this.isLoading = false;
        if (this.activeTab === 'ventas') {
          setTimeout(() => this.createSalesChart(), 100);
        }
      },
      error: () => this.isLoading = false
    });
  }

  loadResData() {
    this.clubesService.getReporteReservas(this.clubId).subscribe({
      next: (res) => {
        this.resData = res;
        this.isLoading = false;
        if (this.activeTab === 'reservas') {
          setTimeout(() => this.createResChart(), 100);
        }
      },
      error: () => this.isLoading = false
    });
  }

  switchTab(tab: 'ventas' | 'reservas' | 'listado-ventas' | 'listado-reservas' | 'top-partidos' | 'top-reservas') {
    this.activeTab = tab;
    if (tab === 'ventas') {
      setTimeout(() => this.createSalesChart(), 100);
    } else if (tab === 'reservas') {
      setTimeout(() => this.createResChart(), 100);
    } else if (tab === 'listado-ventas') {
      this.loadSalesList();
    } else if (tab === 'listado-reservas') {
      this.loadReservasList();
    } else if (tab === 'top-partidos' || tab === 'top-reservas') {
      this.loadTopJugadores();
    }
  }

  createSalesChart() {
    if (this.salesChart) this.salesChart.destroy();
    if (!this.salesChartCanvas) return;

    const ctx = this.salesChartCanvas.nativeElement.getContext('2d');
    const labels = this.salesData.monthly.map((m: any) => m.label);
    const valuesCancha = this.salesData.monthly.map((m: any) => parseFloat(m.value_cancha || 0));
    const valuesProducto = this.salesData.monthly.map((m: any) => parseFloat(m.value_producto || 0));

    this.salesChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Alquiler de Canchas ($)',
            data: valuesCancha,
            backgroundColor: 'rgba(59, 130, 246, 0.75)', // Blue
            borderColor: '#2563eb',
            borderWidth: 1,
            borderRadius: 8
          },
          {
            label: 'Ventas de Productos ($)',
            data: valuesProducto,
            backgroundColor: 'rgba(16, 185, 129, 0.75)', // Green
            borderColor: '#10b981',
            borderWidth: 1,
            borderRadius: 8
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { 
            display: true,
            position: 'top',
            labels: {
              boxWidth: 15,
              font: {
                weight: 'bold',
                size: 11
              }
            }
          }
        },
        scales: {
          x: {
            stacked: false
          },
          y: { 
            beginAtZero: true,
            stacked: false
          }
        }
      }
    });
  }

  createResChart() {
    if (this.resChart) this.resChart.destroy();
    if (!this.resChartCanvas) return;

    const ctx = this.resChartCanvas.nativeElement.getContext('2d');
    const labels = this.resData.daily.map((d: any) => d.label);
    const values = this.resData.daily.map((d: any) => d.value);

    this.resChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Reservas Diarias',
          data: values,
          fill: true,
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderColor: '#10b981',
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: '#10b981'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 } }
        }
      }
    });
  }

  loadSalesList() {
    if (!this.clubId) return;
    this.inventarioService.getVentas(this.clubId, this.fechaInicioFiltro, this.fechaFinFiltro).subscribe(res => {
      if (res.success) {
        const rawSales = res.ventas || [];
        const flatProductSales: any[] = [];
        
        rawSales.forEach((sale: any) => {
          const productItems = (sale.items || []).filter((item: any) => item.producto_id && Number(item.producto_id) > 0);
          productItems.forEach((item: any) => {
            const qty = Number(item.cantidad);
            const unitPrice = parseFloat(item.precio_unitario);
            const itemTotal = qty * unitPrice;
            
            flatProductSales.push({
              id: sale.id,
              fecha: sale.fecha,
              hora_inicio: sale.hora_inicio,
              vendedor: sale.vendedor,
              metodo_pago: sale.metodo_pago,
              producto_nombre: item.producto_nombre,
              cantidad: qty,
              precio_unitario: unitPrice,
              precio_costo: parseFloat(item.precio_costo || 0),
              total: itemTotal
            });
          });
        });

        this.salesList = flatProductSales;
        // Recolectar vendedores únicos
        const sellers = new Set<string>();
        this.salesList.forEach((v: any) => {
          if (v.vendedor) sellers.add(v.vendedor);
        });
        this.vendedoresList = Array.from(sellers);
        this.applySalesFilters();
      }
    });
  }

  applySalesFilters() {
    this.filteredSalesList = this.salesList.filter((v: any) => {
      const matchMetodo = this.metodoPagoFiltro === 'Todos' || v.metodo_pago === this.metodoPagoFiltro;
      const matchVendedor = this.vendedorFiltro === 'Todos' || v.vendedor === this.vendedorFiltro;
      return matchMetodo && matchVendedor;
    });
    this.currentPageReport = 1;
  }

  get totalSalesListAmount(): number {
    return this.filteredSalesList.reduce((acc, v) => acc + parseFloat(v.total), 0);
  }

  exportToPdf() {
    if (this.filteredSalesList.length === 0) {
      Swal.fire('Atención', 'No hay ventas en la lista para exportar', 'warning');
      return;
    }

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      Swal.fire('Error', 'No se pudo abrir la ventana de impresión. Por favor, permite las ventanas emergentes.', 'error');
      return;
    }

    let rowsHtml = '';
    this.filteredSalesList.forEach((s: any) => {
      const dateFormatted = new Date(s.fecha).toLocaleDateString('es-CL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      const tax = Math.round(s.total - (s.total / 1.19));
      const costPrice = Math.round(s.precio_costo || 0);
      const unitPrice = Math.round(s.precio_unitario || 0);
      const totalAmt = Math.round(s.total || 0);
      
      rowsHtml += `
        <tr>
          <td>${dateFormatted}</td>
          <td>${s.vendedor || 'Staff'}</td>
          <td>${s.producto_nombre}</td>
          <td style="text-align: right;">$${costPrice.toLocaleString('es-CL')}</td>
          <td style="text-align: right;">$${unitPrice.toLocaleString('es-CL')}</td>
          <td style="text-align: center;">${s.cantidad}</td>
          <td style="text-align: right; color: #7c3aed;">$${tax.toLocaleString('es-CL')}</td>
          <td class="total">$${totalAmt.toLocaleString('es-CL')}</td>
          <td>${s.metodo_pago}</td>
        </tr>
      `;
    });

    const totalPeriodo = Math.round(this.filteredSalesList.reduce((acc, v) => acc + parseFloat(v.total), 0));
    const totalCantidad = this.filteredSalesList.reduce((acc, v) => acc + v.cantidad, 0);
    const totalImpuesto = Math.round(this.filteredSalesList.reduce((acc, v) => acc + (parseFloat(v.total) - (parseFloat(v.total) / 1.19)), 0));

    printWindow.document.write(`
      <html>
        <head>
          <title>Reporte de Ventas por Producto</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; padding: 20px; }
            h1 { font-size: 22px; margin-bottom: 5px; color: #0f172a; }
            p { font-size: 13px; color: #64748b; margin-top: 0; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #f8fafc; border-bottom: 2px solid #cbd5e1; padding: 10px; text-align: left; font-size: 11px; font-weight: bold; color: #475569; text-transform: uppercase; }
            td { padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
            .total { text-align: right; font-weight: bold; }
            .summary { margin-top: 30px; border-top: 2px solid #0f172a; padding-top: 15px; display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; }
            @media print {
              body { padding: 0; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <h1>Reporte de Ventas por Producto</h1>
              <p>Periodo: ${this.fechaInicioFiltro} al ${this.fechaFinFiltro}</p>
            </div>
            <button onclick="window.print();" style="background: #0f172a; color: #fff; padding: 8px 16px; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 12px;">
              🖨️ Imprimir / Guardar PDF
            </button>
          </div>
          <table>
            <thead>
              <tr>
                <th>Fecha / Hora</th>
                <th>Vendedor</th>
                <th>Producto</th>
                <th style="text-align: right;">Precio Costo</th>
                <th style="text-align: right;">Precio Unit.</th>
                <th style="text-align: center;">Cantidad</th>
                <th style="text-align: right;">Impuesto (19%)</th>
                <th class="total">Total</th>
                <th>Método</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <div class="summary">
            <span>Total Unidades: ${totalCantidad}</span>
            <span>Monto Impuesto: $ ${Math.round(totalImpuesto).toLocaleString('es-CL')}</span>
            <span>Monto Total: $ ${totalPeriodo.toLocaleString('es-CL')}</span>
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() { window.print(); }, 500);
            }
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  }

  exportToExcel() {
    if (this.filteredSalesList.length === 0) {
      Swal.fire('Atención', 'No hay ventas en la lista para exportar', 'warning');
      return;
    }

    // Generar formato CSV con BOM UTF-8 compatible con Excel
    let csvContent = "\uFEFF";
    csvContent += "Fecha;Hora;Vendedor;Producto;Precio Costo;Precio Unitario;Cantidad;Impuesto (19% IVA);Total;Método de Pago\n";

    this.filteredSalesList.forEach((v: any) => {
      const dateOnly = v.fecha.split(' ')[0];
      const timeOnly = v.fecha.split(' ')[1] ? v.fecha.split(' ')[1].substring(0, 5) : '';
      const seller = v.vendedor || 'Staff';
      const product = v.producto_nombre;
      const qty = v.cantidad;
      const costPrice = Math.round(v.precio_costo || 0);
      const unitPrice = Math.round(v.precio_unitario || 0);
      const method = v.metodo_pago;
      const total = Math.round(v.total || 0);
      const tax = Math.round(v.total - (v.total / 1.19));

      csvContent += `${dateOnly};${timeOnly};${seller};"${product.replace(/"/g, '""')}";${costPrice};${unitPrice};${qty};${tax};${total};${method}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `reporte_ventas_${this.fechaInicioFiltro}_a_${this.fechaFinFiltro}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  getTotal(list: any[]): number {
    return list.reduce((acc, curr) => acc + parseFloat(curr.value_cancha || 0) + parseFloat(curr.value_producto || 0), 0);
  }

  getLatest(list: any[]): number {
    return list.length > 0 ? (parseFloat(list[list.length - 1].value_cancha || 0) + parseFloat(list[list.length - 1].value_producto || 0)) : 0;
  }

  getTodayValue(list: any[]): number {
    if (!list || list.length === 0) return 0;
    const today = new Date();
    const y = today.getFullYear();
    const m = (today.getMonth() + 1).toString().padStart(2, '0');
    const d = today.getDate().toString().padStart(2, '0');
    const todayStr = `${y}-${m}-${d}`;
    const match = list.find((item: any) => item.label === todayStr);
    return match ? (parseFloat(match.value_cancha || 0) + parseFloat(match.value_producto || 0)) : 0;
  }

  getCurrentWeekValue(list: any[]): number {
    if (!list || list.length === 0) return 0;
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    
    const y = monday.getFullYear();
    const m = (monday.getMonth() + 1).toString().padStart(2, '0');
    const d = monday.getDate().toString().padStart(2, '0');
    const mondayStr = `${y}-${m}-${d}`;

    const match = list.find((item: any) => item.label === mondayStr);
    return match ? (parseFloat(match.value_cancha || 0) + parseFloat(match.value_producto || 0)) : 0;
  }

  getCurrentMonthValue(list: any[]): number {
    if (!list || list.length === 0) return 0;
    const now = new Date();
    const y = now.getFullYear();
    const m = (now.getMonth() + 1).toString().padStart(2, '0');
    const currentMonthStr = `${y}-${m}`;

    const match = list.find((item: any) => item.label === currentMonthStr);
    return match ? (parseFloat(match.value_cancha || 0) + parseFloat(match.value_producto || 0)) : 0;
  }

  loadReservasList() {
    if (!this.clubId) return;
    this.clubesService.getReservasDetallado(this.clubId, this.fechaInicioFiltro, this.fechaFinFiltro).subscribe(res => {
      if (res.success) {
        this.reservasList = res.reservas;
        // Recolectar nombres únicos de canchas
        const courts = new Set<string>();
        this.reservasList.forEach((r: any) => {
          if (r.cancha_nombre) courts.add(r.cancha_nombre);
        });
        this.canchasFiltroList = Array.from(courts);
        this.applyReservasFilters();
      }
    });
  }

  getPaymentStatus(r: any): 'total' | 'parcial' | 'pendiente' | 'no_aplica' {
    if (r.estado === 'Bloqueada') {
      return 'no_aplica';
    }
    if (r.estado === 'Pagada' || Number(r.pagado) === 1) {
      return 'total';
    }
    const metodo = (r.metodo_pago || 'total').toLowerCase();
    if (metodo === 'total') {
      return 'pendiente';
    }

    let jugadoresActivos = 0;
    let jugadoresPagados = 0;

    // P1
    if (r.jugador_nombre || r.usuario_id || r.nombre_externo) {
      jugadoresActivos++;
      if (Number(r.pago_p1) === 1) jugadoresPagados++;
    }
    // P2
    if (r.jugador2_nombre || r.jugador2_id || r.nombre_externo2) {
      jugadoresActivos++;
      if (Number(r.pago_p2) === 1) jugadoresPagados++;
    }
    // P3
    if (r.jugador3_nombre || r.jugador3_id || r.nombre_externo3) {
      jugadoresActivos++;
      if (Number(r.pago_p3) === 1) jugadoresPagados++;
    }
    // P4
    if (r.jugador4_nombre || r.jugador4_id || r.nombre_externo4) {
      jugadoresActivos++;
      if (Number(r.pago_p4) === 1) jugadoresPagados++;
    }

    if (jugadoresActivos === 0) return 'pendiente';
    if (jugadoresPagados === jugadoresActivos) return 'total';
    if (jugadoresPagados > 0) return 'parcial';
    return 'pendiente';
  }

  applyReservasFilters() {
    this.filteredReservasList = this.reservasList.filter((r: any) => {
      const matchCancha = this.canchaFiltro === 'Todas' || r.cancha_nombre === this.canchaFiltro;
      
      let matchPago = true;
      if (this.estadoPagoFiltro !== 'Todos') {
        const isPaid = this.getPaymentStatus(r) === 'total';
        matchPago = this.estadoPagoFiltro === 'Pagadas' ? isPaid : !isPaid;
      }
      
      let matchCliente = true;
      if (this.clienteFiltro.trim()) {
        const term = this.clienteFiltro.toLowerCase();
        const j1 = (r.jugador_nombre || '').toLowerCase();
        const j2 = (r.jugador2_nombre || '').toLowerCase();
        const j3 = (r.jugador3_nombre || '').toLowerCase();
        const j4 = (r.jugador4_nombre || '').toLowerCase();
        matchCliente = j1.includes(term) || j2.includes(term) || j3.includes(term) || j4.includes(term);
      }

      return matchCancha && matchPago && matchCliente;
    });
    this.currentPageResReport = 1;
  }

  getPlayersText(r: any): string {
    const list = [];
    if (r.jugador_nombre) list.push(r.jugador_nombre);
    if (r.jugador2_nombre) list.push(r.jugador2_nombre);
    if (r.jugador3_nombre) list.push(r.jugador3_nombre);
    if (r.jugador4_nombre) list.push(r.jugador4_nombre);
    return list.length > 0 ? list.join(', ') : 'Sin jugadores';
  }

  exportReservasToPdf() {
    if (this.filteredReservasList.length === 0) {
      Swal.fire('Atención', 'No hay reservas en la lista para exportar', 'warning');
      return;
    }

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      Swal.fire('Error', 'No se pudo abrir la ventana de impresión. Por favor, permite las ventanas emergentes.', 'error');
      return;
    }

    let rowsHtml = '';
    this.filteredReservasList.forEach((r: any) => {
      const dateFormatted = new Date(r.fecha + 'T00:00:00').toLocaleDateString('es-CL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      const players = this.getPlayersText(r);
      const payStatus = this.getPaymentStatus(r);
      const isPaid = payStatus === 'total' ? 'PAGADO' : (payStatus === 'parcial' ? 'PARCIAL' : (payStatus === 'no_aplica' ? 'N/A' : 'DEBE'));
      const isPaidClass = payStatus === 'total' ? 'pagado' : (payStatus === 'parcial' ? 'parcial' : (payStatus === 'no_aplica' ? 'no_aplica' : 'debe'));
      const typePayment = r.metodo_pago === 'proporcional' ? 'Por Jugador' : 'Total Sede';
      const horaIni = r.hora_inicio ? r.hora_inicio.substring(0, 5) : '';
      const horaFin = r.hora_fin ? r.hora_fin.substring(0, 5) : '';
      const precioRedondeado = Math.round(r.precio || 0);
      
      rowsHtml += `
        <tr>
          <td>${dateFormatted}</td>
          <td>${horaIni} - ${horaFin}</td>
          <td>${r.cancha_nombre || ''}</td>
          <td>${players}</td>
          <td>${typePayment}</td>
          <td class="status ${isPaidClass}">${isPaid}</td>
          <td class="total">$${precioRedondeado.toLocaleString('es-CL')}</td>
        </tr>
      `;
    });

    const totalIngresos = Math.round(this.filteredReservasList.reduce((acc, r) => acc + parseFloat(r.precio || 0), 0));

    printWindow.document.write(`
      <html>
        <head>
          <title>Reporte de Reservas</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; padding: 20px; }
            h1 { font-size: 22px; margin-bottom: 5px; color: #0f172a; }
            p { font-size: 13px; color: #64748b; margin-top: 0; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #f8fafc; border-bottom: 2px solid #cbd5e1; padding: 10px; text-align: left; font-size: 11px; font-weight: bold; color: #475569; text-transform: uppercase; }
            td { padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
            .status { font-weight: bold; }
            .status.pagado { color: #15803d; }
            .status.parcial { color: #d97706; }
            .status.no_aplica { color: #64748b; }
            .status.debe { color: #b91c1c; }
            .total { text-align: right; font-weight: bold; }
            .summary { margin-top: 30px; border-top: 2px solid #0f172a; padding-top: 15px; display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; }
            @media print {
              body { padding: 0; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <h1>Reporte de Reservas de Cancha</h1>
              <p>Periodo: ${this.fechaInicioFiltro} al ${this.fechaFinFiltro}</p>
            </div>
            <button onclick="window.print();" style="background: #0f172a; color: #fff; padding: 8px 16px; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 12px;">
              🖨️ Imprimir / Guardar PDF
            </button>
          </div>
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Hora</th>
                <th>Cancha</th>
                <th>Jugadores</th>
                <th>Cobro</th>
                <th>Estado</th>
                <th class="total">Valor</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <div class="summary">
            <span>Total Reservas: ${this.filteredReservasList.length}</span>
            <span>Monto Total: $ ${totalIngresos.toLocaleString('es-CL')}</span>
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() { window.print(); }, 500);
            }
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  }

  exportReservasToExcel() {
    if (this.filteredReservasList.length === 0) {
      Swal.fire('Atención', 'No hay reservas en la lista para exportar', 'warning');
      return;
    }

    let csvContent = "\uFEFF";
    csvContent += "Fecha;Horario;Cancha;Jugadores;Tipo de Cobro;Estado de Pago;Precio Total\n";

    this.filteredReservasList.forEach((r: any) => {
      const dateFormatted = r.fecha;
      const horaIni = r.hora_inicio ? r.hora_inicio.substring(0, 5) : '';
      const horaFin = r.hora_fin ? r.hora_fin.substring(0, 5) : '';
      const horario = `${horaIni}-${horaFin}`;
      const cancha = r.cancha_nombre || '';
      const players = `"${this.getPlayersText(r).replace(/"/g, '""')}"`;
      const typePayment = r.metodo_pago === 'proporcional' ? 'Por Jugador' : 'Total Sede';
      const payStatus = this.getPaymentStatus(r);
      const isPaid = payStatus === 'total' ? 'PAGADO' : (payStatus === 'parcial' ? 'PARCIAL' : (payStatus === 'no_aplica' ? 'N/A' : 'DEBE'));
      const precio = Math.round(r.precio || 0);

      csvContent += `${dateFormatted};${horario};${cancha};${players};${typePayment};${isPaid};${precio}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `reporte_reservas_${this.fechaInicioFiltro}_a_${this.fechaFinFiltro}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  loadTopJugadores() {
    if (!this.clubId) return;
    this.clubesService.getTopJugadores(this.clubId, this.fechaInicioFiltro, this.fechaFinFiltro).subscribe(res => {
      if (res.success) {
        this.topPartidos = res.top_partidos || [];
        this.topReservas = res.top_reservas || [];
      }
    });
  }
}
