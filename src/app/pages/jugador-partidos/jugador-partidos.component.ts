import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MysqlService } from '../../services/mysql.service';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { Router } from '@angular/router';
import { AssetService } from '../../services/asset.service';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-jugador-partidos',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: './jugador-partidos.component.html',
  styleUrl: './jugador-partidos.component.scss'
})
export class JugadorPartidosComponent implements OnInit {
  userId = Number(localStorage.getItem('userId'));
  jugadorNombre = localStorage.getItem('nombre') || '';
  jugadorFoto = localStorage.getItem('foto') || '';

  partidos: any[] = [];
  jugados: any[] = [];
  proximos: any[] = [];
  isLoading = true;

  // Stats
  totalJugados = 0;
  victorias = 0;
  derrotas = 0;
  winRatePct = 0;
  categoriaMasJugada = 'N/A';
  pendientesResultado = 0;

  selectedTab: 'proximos' | 'historial' = 'proximos';

  // Filters
  filtroResultado: 'todos' | 'ganados' | 'perdidos' | 'sin_marcador' = 'todos';
  filterClub = '';
  filterCategoria = '';
  filterFecha = '';
  clubesList: any[] = [];

  // Modal Result
  showResultModal = false;
  showDetailModal = false;
  selectedMatch: any = null;
  categoria = '';
  
  // Scoring Sets
  set1A: number | null = null;
  set1B: number | null = null;
  set2A: number | null = null;
  set2B: number | null = null;
  set3A: number | null = null;
  set3B: number | null = null;
  
  idGanador: number | null = null;
  
  // Charts
  winLossChart: any;
  activityChart: any;

  // Pagination
  historialPage = 1;
  historialPageSize = 5;
  paginatedJugados: any[] = [];
  totalPages = 1;

  constructor(
    public mysql: MysqlService, 
    public router: Router,
    public assetService: AssetService
  ) {}

  ngOnInit() {
    this.loadPartidos();
  }

  enrichMatch(p: any): any {
    p.parsedSets = this.parseMarcador(p.marcador);
    p.esGanador = this.isWinner(p);
    p.esEquipo1 = this.isUserTeam(p, 1);
    p.esEquipo2 = this.isUserTeam(p, 2);
    return p;
  }

  loadPartidos() {
    this.isLoading = true;
    this.mysql.getMisPartidos().subscribe({
      next: (res: any[]) => {
        // Only keep active, non-cancelled matches and pre-enrich them
        this.partidos = (res || []).filter(p => {
          const st = (p.estado || '').toLowerCase();
          return st !== 'cancelada' && st !== 'cancelado' && st !== 'anulado' && st !== 'eliminado' && st !== 'eliminada';
        }).map(p => this.enrichMatch(p));

        this.updateLists();
        this.calculateStats();

        // Extract clubs
        const cMap = new Map();
        this.partidos.forEach(p => {
            if (p.club_id && !cMap.has(p.club_id)) {
                cMap.set(p.club_id, p.club_nombre);
            }
        });
        this.clubesList = Array.from(cMap.entries()).map(([id, nombre]) => ({ id, nombre }));

        this.isLoading = false;
        setTimeout(() => {
          this.renderCharts();
        }, 100);
      },
      error: (err: any) => {
        console.error('Error loading matches:', err);
        this.isLoading = false;
      }
    });
  }

  selectTab(tab: 'proximos' | 'historial') {
    this.selectedTab = tab;
    if (tab === 'historial') {
      this.historialPage = 1;
      this.updatePagination();
    }
  }

  setFiltro(tipo: 'todos' | 'ganados' | 'perdidos' | 'sin_marcador') {
    this.filtroResultado = tipo;
    this.historialPage = 1;
    this.updateLists();
  }

  updateLists() {
    let jList = (this.partidos || []).filter(p => p.jugado);
    let pList = (this.partidos || []).filter(p => !p.jugado).sort((a,b) => (a.fecha || '').localeCompare(b.fecha || ''));

    // Filtro por resultado
    if (this.filtroResultado === 'ganados') {
      jList = jList.filter(p => p.esGanador);
    } else if (this.filtroResultado === 'perdidos') {
      jList = jList.filter(p => p.resultado_registrado && !p.esGanador);
    } else if (this.filtroResultado === 'sin_marcador') {
      jList = jList.filter(p => !p.resultado_registrado);
    }

    if (this.filterClub) {
      jList = jList.filter(p => p.club_id == this.filterClub);
      pList = pList.filter(p => p.club_id == this.filterClub);
    }
    if (this.filterCategoria) {
      jList = jList.filter(p => p.categoria === this.filterCategoria);
    }
    if (this.filterFecha) {
      jList = jList.filter(p => p.fecha === this.filterFecha);
    }

    this.jugados = jList;
    this.proximos = pList;
    this.updatePagination();
  }

  updatePagination() {
    this.totalPages = Math.max(1, Math.ceil(this.jugados.length / this.historialPageSize));
    if (this.historialPage > this.totalPages) {
      this.historialPage = 1;
    }
    const start = (this.historialPage - 1) * this.historialPageSize;
    this.paginatedJugados = this.jugados.slice(start, start + this.historialPageSize);
  }

  prevPage() {
    if (this.historialPage > 1) {
      this.historialPage--;
      this.updatePagination();
    }
  }

  nextPage() {
    if (this.historialPage < this.totalPages) {
      this.historialPage++;
      this.updatePagination();
    }
  }

  goToPage(p: number | string) {
    if (typeof p === 'number' && p >= 1 && p <= this.totalPages) {
      this.historialPage = p;
      this.updatePagination();
    }
  }

  get visiblePages(): (number | string)[] {
    const total = this.totalPages;
    const current = this.historialPage;
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    if (current <= 4) {
      return [1, 2, 3, 4, 5, '...', total];
    }
    if (current >= total - 3) {
      return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
    }
    return [1, '...', current - 1, current, current + 1, '...', total];
  }

  startIndex(): number {
    if (this.jugados.length === 0) return 0;
    return (this.historialPage - 1) * this.historialPageSize + 1;
  }

  endIndex(): number {
    return Math.min(this.historialPage * this.historialPageSize, this.jugados.length);
  }

  trackByMatchId(index: number, item: any): any {
    return item?.id || index;
  }

  trackByIndex(index: number): number {
    return index;
  }

  calculateStats() {
    const list = this.partidos.filter(p => p.jugado);
    this.totalJugados = list.length;
    this.victorias = list.filter(p => this.isWinner(p)).length;
    this.derrotas = list.filter(p => p.resultado_registrado && !this.isWinner(p)).length;
    this.pendientesResultado = list.filter(p => !p.resultado_registrado).length;

    const totalDecididos = this.victorias + this.derrotas;
    this.winRatePct = totalDecididos > 0 ? Math.round((this.victorias / totalDecididos) * 100) : 0;
    
    const cats = list.filter(p => p.categoria).map(p => p.categoria);
    if (cats.length > 0) {
      const counts: any = {};
      cats.forEach(c => counts[c] = (counts[c] || 0) + 1);
      this.categoriaMasJugada = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
    } else {
      this.categoriaMasJugada = '4ta';
    }
  }

  isWinner(p: any): boolean {
    if (!p || !p.id_ganador) return false;
    const isTeam1 = (p.usuario_id == this.userId || p.jugador1_id == this.userId || p.jugador2_id == this.userId);
    const isTeam2 = (p.jugador3_id == this.userId || p.jugador4_id == this.userId);
    return (p.id_ganador == 1 && isTeam1) || (p.id_ganador == 2 && isTeam2);
  }

  isUserTeam(p: any, teamNum: number): boolean {
    if (!p) return false;
    if (teamNum === 1) {
      return p.usuario_id == this.userId || p.jugador1_id == this.userId || p.jugador2_id == this.userId;
    }
    return p.jugador3_id == this.userId || p.jugador4_id == this.userId;
  }

  parseMarcador(marcador: any): { a: string, b: string }[] {
    if (!marcador || typeof marcador !== 'string') return [];
    try {
      return marcador
        .trim()
        .replace(/,/g, ' ')
        .split(/\s+/)
        .filter(s => s && s.includes('-'))
        .map(s => {
          const parts = s.split('-');
          return {
            a: (parts[0] || '').trim() || '0',
            b: (parts[1] || '').trim() || '0'
          };
        });
    } catch (e) {
      return [];
    }
  }

  getMarcadorSets(marcador: any): { a: string, b: string }[] {
    return this.parseMarcador(marcador);
  }

  setQuickScore(setNum: number, a: number, b: number) {
    if (setNum === 1) { this.set1A = a; this.set1B = b; }
    else if (setNum === 2) { this.set2A = a; this.set2B = b; }
    else if (setNum === 3) { this.set3A = a; this.set3B = b; }
    this.updateGanadorManual();
  }

  clearSet(setNum: number) {
    if (setNum === 1) { this.set1A = null; this.set1B = null; }
    else if (setNum === 2) { this.set2A = null; this.set2B = null; }
    else if (setNum === 3) { this.set3A = null; this.set3B = null; }
    this.updateGanadorManual();
  }

  openResultModal(match: any, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.selectedMatch = match;
    this.categoria = match.categoria || '';
    this.set1A = null; this.set1B = null;
    this.set2A = null; this.set2B = null;
    this.set3A = null; this.set3B = null;
    this.idGanador = null;
    this.showResultModal = true;
  }

  openMatchDetail(match: any) {
    this.selectedMatch = match;
    this.categoria = match.categoria || 'Todos';
    this.showDetailModal = true;
  }

  updateGanadorManual() {
     let winsA = 0; let winsB = 0;
     if (this.set1A !== null && this.set1B !== null) { if (this.set1A > this.set1B) winsA++; else if (this.set1B > this.set1A) winsB++; }
     if (this.set2A !== null && this.set2B !== null) { if (this.set2A > this.set2B) winsA++; else if (this.set2B > this.set2A) winsB++; }
     if (this.set3A !== null && this.set3B !== null) { if (this.set3A > this.set3B) winsA++; else if (this.set3B > this.set3A) winsB++; }
     if (winsA > winsB) this.idGanador = 1; else if (winsB > winsA) this.idGanador = 2; else this.idGanador = null;
  }

  saveResult() {
    this.updateGanadorManual();
    if (this.set1A === null || this.set1B === null || !this.categoria || !this.idGanador) {
        alert('Al menos el primer set y la categoría son obligatorios');
        return;
    }

    let marcadorStr = `${this.set1A}-${this.set1B}`;
    if (this.set2A !== null && this.set2B !== null) marcadorStr += ` ${this.set2A}-${this.set2B}`;
    if (this.set3A !== null && this.set3B !== null) marcadorStr += ` ${this.set3A}-${this.set3B}`;

    const payload = {
        reserva_id: this.selectedMatch.id,
        marcador: marcadorStr,
        categoria: this.categoria,
        id_ganador: this.idGanador
    };

    this.mysql.saveMatchResult(payload).subscribe(() => {
        this.showResultModal = false;
        this.loadPartidos();
    });
  }

  renderCharts() {
    this.renderWinLossChart();
    this.renderActivityChart();
  }

  renderWinLossChart() {
    const ctx = document.getElementById('winLossChart') as HTMLCanvasElement;
    if (!ctx) return;
    if (this.winLossChart) this.winLossChart.destroy();

    const hasData = (this.victorias + this.derrotas) > 0;
    const dataVals = hasData ? [this.victorias, this.derrotas] : [1];
    const dataLabels = hasData ? ['Victorias', 'Derrotas'] : ['Sin partidos'];
    const bgColors = hasData ? ['#ccff00', '#0f172a'] : ['#e2e8f0'];

    this.winLossChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: dataLabels,
        datasets: [{
          data: dataVals,
          backgroundColor: bgColors,
          borderWidth: 0,
          hoverOffset: hasData ? 6 : 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: hasData,
            position: 'bottom',
            labels: { font: { weight: 'bold', size: 11 }, color: '#475569', boxWidth: 12, padding: 12 }
          },
          tooltip: {
            enabled: hasData
          }
        },
        cutout: '76%'
      }
    });
  }

  renderActivityChart() {
    const ctx = document.getElementById('activityChart') as HTMLCanvasElement;
    if (!ctx) return;
    if (this.activityChart) this.activityChart.destroy();

    // Prepare data (last 6 months)
    const months: any = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = d.toLocaleString('es-ES', { month: 'short' });
        months[label] = 0;
    }

    this.partidos.forEach(p => {
        const d = new Date(p.fecha);
        const label = d.toLocaleString('es-ES', { month: 'short' });
        if (months[label] !== undefined) {
            months[label]++;
        }
    });

    this.activityChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: Object.keys(months),
        datasets: [{
          label: 'Partidos',
          data: Object.values(months),
          backgroundColor: '#ccff00',
          hoverBackgroundColor: '#b8e600',
          borderRadius: 6,
          barThickness: 20
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0f172a',
            titleFont: { weight: 'bold' },
            padding: 10,
            displayColors: false,
            callbacks: {
              label: (item: any) => `${item.raw} partido${Number(item.raw) === 1 ? '' : 's'}`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: '#f1f5f9' },
            ticks: { stepSize: 1, color: '#94a3b8', font: { size: 10, weight: 'bold' } }
          },
          x: {
            grid: { display: false },
            ticks: { color: '#64748b', font: { size: 11, weight: 'bold' } }
          }
        }
      }
    });
  }
}
