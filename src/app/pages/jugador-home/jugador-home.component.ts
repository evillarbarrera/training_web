import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MysqlService } from '../../services/mysql.service';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { EvaluacionService } from '../../services/evaluacion.service';
import { PopupService } from '../../services/popup.service';
import { AssetService } from '../../services/asset.service';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-jugador-home',
  standalone: true,
  imports: [CommonModule, SidebarComponent],
  templateUrl: './jugador-home.component.html',
  styleUrls: ['./jugador-home.component.scss']
})
export class JugadorHomeComponent implements OnInit, OnDestroy {
  jugadorNombre = 'Jugador';
  jugadorFoto = '';
  greeting = '¡Hola de nuevo!';
  diaSemana = '';
  fechaHoyFormatted = '';

  stats: any = {
    pagadas: 0,
    reservadas: 0,
    disponibles: 0,
    grupales: 0,
    pendientes: 0,
    futuras: 0
  };

  packsDetalle: any[] = [];
  proximaClase: any = null;
  isLoading = true;
  userId: number | null = null;

  // Paginación de Packs
  packCurrentPage = 1;
  packPageSize = 3;

  get paginatedPacks(): any[] {
    const startIndex = (this.packCurrentPage - 1) * this.packPageSize;
    return this.packsDetalle.slice(startIndex, startIndex + this.packPageSize);
  }

  get totalPackPages(): number {
    return Math.ceil(this.packsDetalle.length / this.packPageSize) || 1;
  }

  getPagesArray(): number[] {
    return Array.from({ length: this.totalPackPages }, (_, i) => i + 1);
  }

  prevPackPage(): void {
    if (this.packCurrentPage > 1) {
      this.packCurrentPage--;
    }
  }

  nextPackPage(): void {
    if (this.packCurrentPage < this.totalPackPages) {
      this.packCurrentPage++;
    }
  }

  goToPackPage(page: number): void {
    if (page >= 1 && page <= this.totalPackPages) {
      this.packCurrentPage = page;
    }
  }

  // Evaluaciones y Rendimiento
  hasEvaluaciones = false;
  promedioGeneral: number | null = null;
  chart: any = null;
  private chartData: { labels: string[], values: number[] } | null = null;

  constructor(
    private mysqlService: MysqlService,
    private router: Router,
    private evaluacionService: EvaluacionService,
    private popupService: PopupService,
    public assetService: AssetService
  ) { }

  ngOnInit(): void {
    this.updateGreetingAndDate();

    this.userId = Number(localStorage.getItem('userId'));
    const userRole = localStorage.getItem('userRole') || '';

    if (!this.userId) {
      this.router.navigate(['/login']);
      return;
    }

    // Redirección de seguridad si el rol no es jugador
    const role = userRole.toLowerCase();
    if (role.includes('admin') || role.includes('administrador')) {
      this.router.navigate(['/admin-club']);
      return;
    } else if (role.includes('entrenador')) {
      this.router.navigate(['/entrenador-home']);
      return;
    }

    this.loadStats();
    this.loadEvaluaciones();
  }

  ngOnDestroy(): void {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }

  updateGreetingAndDate(): void {
    const now = new Date();
    const hour = now.getHours();
    if (hour < 12) {
      this.greeting = 'Buenos días';
    } else if (hour < 20) {
      this.greeting = 'Buenas tardes';
    } else {
      this.greeting = 'Buenas noches';
    }

    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    this.diaSemana = days[now.getDay()];
    this.fechaHoyFormatted = `${now.getDate()} ${months[now.getMonth()]}, ${now.getFullYear()}`;
  }

  loadStats(): void {
    if (!this.userId) return;

    this.mysqlService.getPerfil(this.userId).subscribe({
      next: (res: any) => {
        if (res.success && res.user) {
          this.jugadorNombre = res.user.nombre || 'Jugador';
          this.jugadorFoto = res.user.foto_perfil || '';
        }
      },
      error: (err: any) => console.error('Error loading profile:', err)
    });

    this.mysqlService.getHomeStats(this.userId).subscribe({
      next: (res: any) => {
        let packs = null;
        if (res && res.estadisticas && res.estadisticas.packs) {
          packs = res.estadisticas.packs;
        } else if (res && res.packs) {
          packs = res.packs;
        } else if (res && (res.pagada !== undefined || res.reservada !== undefined)) {
          packs = res;
        }

        if (packs) {
          this.stats.pagadas = parseInt(packs.pagadas || packs.pagada, 10) || 0;
          this.stats.reservadas = parseInt(packs.reservadas || packs.reservada, 10) || 0;
          this.stats.disponibles = parseInt(packs.disponibles || packs.disponible, 10) || 0;
          this.stats.grupales = parseInt(packs.grupales || packs.grupal, 10) || 0;
          this.stats.pendientes = parseInt(packs.pendientes || packs.pendiente, 10) || 0;
          this.stats.futuras = parseInt(packs.futuras || packs.futura, 10) || 0;
          this.packsDetalle = packs.detalle || [];
        }

        if (res && res.prox_clase) {
          this.proximaClase = res.prox_clase;
        }

        this.isLoading = false;

        // Si las evaluaciones cargaron antes de los stats, renderizar gráfico
        if (this.chartData) {
          setTimeout(() => this.renderChart(this.chartData!.labels, this.chartData!.values), 120);
        }
      },
      error: (err: any) => {
        console.error('Error loading stats:', err);
        this.isLoading = false;
      }
    });
  }

  loadEvaluaciones(): void {
    if (!this.userId) return;
    this.evaluacionService.getEvaluaciones(this.userId).subscribe({
      next: (data) => {
        if (data && data.length > 0) {
          const sorted = data.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
          const labels = sorted.map(e => {
            const parts = (e.fecha || '').split('-');
            return parts.length >= 3 ? `${parts[2]}/${parts[1]}` : e.fecha;
          });
          const values = sorted.map(e => Number(e.promedio_general) || 0);

          this.chartData = { labels, values };
          this.hasEvaluaciones = true;

          const lastVal = values[values.length - 1];
          this.promedioGeneral = Number(lastVal.toFixed(1));

          if (!this.isLoading) {
            setTimeout(() => this.renderChart(labels, values), 120);
          }
        } else {
          this.hasEvaluaciones = false;
        }
      },
      error: (err) => {
        console.error('Error loading evaluaciones:', err);
        this.hasEvaluaciones = false;
      }
    });
  }

  renderChart(labels: string[], data: number[]): void {
    const ctx = document.getElementById('progressChart') as HTMLCanvasElement;
    if (!ctx) return;

    if (this.chart) {
      this.chart.destroy();
    }

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Nivel Técnico',
          data: data,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.12)',
          borderWidth: 3,
          tension: 0.35,
          fill: true,
          pointBackgroundColor: '#0f172a',
          pointBorderColor: '#10b981',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0f172a',
            titleColor: '#34d399',
            bodyColor: '#ffffff',
            padding: 10,
            displayColors: false,
            callbacks: {
              label: (context) => `Puntuación: ${context.parsed.y} / 10`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 10,
            ticks: { stepSize: 2, color: '#94a3b8' },
            grid: { color: 'rgba(148, 163, 184, 0.15)' }
          },
          x: {
            ticks: { color: '#94a3b8' },
            grid: { display: false }
          }
        }
      }
    });
  }

  irAReservas(): void {
    this.router.navigate(['/jugador-reservas']);
  }

  irACalendario(): void {
    this.router.navigate(['/jugador-calendario']);
  }

  irAReservarCancha(): void {
    this.router.navigate(['/clubes-reservar']);
  }

  irATorneos(): void {
    this.router.navigate(['/mis-torneos']);
  }

  irAPartidos(): void {
    this.router.navigate(['/mis-partidos']);
  }

  irAHabilidades(): void {
    this.router.navigate(['/mis-habilidades']);
  }

  irAPacks(): void {
    this.router.navigate(['/jugador-packs']);
  }

  irAPerfil(): void {
    this.router.navigate(['/perfil']);
  }

  logout(): void {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('userId');
    this.router.navigate(['/login']);
  }
}

