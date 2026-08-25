import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ClubesService } from '../../services/clubes.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-public-club-landing',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './public-club-landing.component.html',
  styleUrls: ['./public-club-landing.component.scss']
})
export class PublicClubLandingComponent implements OnInit {
  slug: string = '';
  isPreview: boolean = false;
  isLoading: boolean = true;
  errorMessage: string = '';

  // Data
  clubData: any = null;
  canchas: any[] = [];
  americanos: any[] = [];
  ranking: any[] = [];

  // Active Tab
  activeTab: 'canchas' | 'americanos' | 'ranking' = 'canchas';

  // Court Reservations Filter
  fechaSeleccionada: string = new Date().toISOString().split('T')[0];
  canchaFiltroId: number = 0;

  // Category Ranking Filter
  categoriasDisponibles: string[] = ['Todas'];
  categoriaSeleccionada: string = 'Todas';
  rankingFiltrado: any[] = [];

  get colorPrimary(): string {
    return this.clubData?.landing_color_primary || '#0b0f19';
  }

  get colorAccent(): string {
    return this.clubData?.landing_color_accent || '#ccff00';
  }

  get defaultBannerUrl(): string {
    return this.clubData?.landing_banner || 'assets/images/padel-court-hero.jpg';
  }

  setFechaQuick(daysOffset: number): void {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    this.fechaSeleccionada = d.toISOString().split('T')[0];
  }

  scrollToSection(sectionId: string): void {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }

  isFechaSelected(daysOffset: number): boolean {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    return this.fechaSeleccionada === d.toISOString().split('T')[0];
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private clubesService: ClubesService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.slug = params['slug'] || params['id'] || '';
      this.route.queryParams.subscribe(qParams => {
        this.isPreview = qParams['preview'] === '1';
        if (this.slug) {
          this.loadLandingData();
        }
      });
    });
  }

  loadLandingData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.clubesService.getPublicClubLanding(this.slug, this.isPreview).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        if (res.status === 'success') {
          this.clubData = res.club;
          this.canchas = res.canchas || [];
          this.americanos = res.americanos || [];
          this.ranking = res.ranking || [];

          // Set default active tab based on club visibility settings
          if (this.clubData.landing_mostrar_reservas != 0) {
            this.activeTab = 'canchas';
          } else if (this.clubData.landing_mostrar_americanos != 0) {
            this.activeTab = 'americanos';
          } else if (this.clubData.landing_mostrar_ranking != 0) {
            this.activeTab = 'ranking';
          }

          // Extract ranking categories
          const catSet = new Set<string>();
          catSet.add('Todas');
          this.ranking.forEach(r => {
            if (r.categoria) catSet.add(r.categoria);
          });
          this.categoriasDisponibles = Array.from(catSet);
          this.filtrarRanking();
        } else {
          this.errorMessage = res.message || 'No se pudo cargar la Landing Page';
        }
      },
      error: (err) => {
        this.isLoading = false;
        if (err.status === 403) {
          this.errorMessage = 'La Landing Page de este club está en pausa y aún no ha sido publicada.';
        } else if (err.status === 404) {
          this.errorMessage = 'El club solicitado no existe o el enlace es incorrecto.';
        } else {
          this.errorMessage = err.error?.message || 'Ocurrió un error al cargar la información del club.';
        }
      }
    });
  }

  filtrarRanking(): void {
    if (this.categoriaSeleccionada === 'Todas') {
      this.rankingFiltrado = this.ranking;
    } else {
      this.rankingFiltrado = this.ranking.filter(r => r.categoria === this.categoriaSeleccionada);
    }
  }

  reservarCancha(cancha: any): void {
    const isLoggedIn = !!localStorage.getItem('token');
    if (!isLoggedIn) {
      Swal.fire({
        title: 'Iniciar Sesión',
        text: 'Para completar tu reserva debes iniciar sesión o crear una cuenta gratuita.',
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'Iniciar Sesión / Registrarse',
        cancelButtonText: 'Cancelar'
      }).then(res => {
        if (res.isConfirmed) {
          this.router.navigate(['/login']);
        }
      });
    } else {
      this.router.navigate(['/clubes-reservar'], { queryParams: { club_id: this.clubData.id, fecha: this.fechaSeleccionada } });
    }
  }

  inscribirAmericano(torneo: any): void {
    const isLoggedIn = !!localStorage.getItem('token');
    if (!isLoggedIn) {
      Swal.fire({
        title: 'Iniciar Sesión',
        text: 'Para inscribirte en este torneo/americano debes iniciar sesión.',
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'Iniciar Sesión',
        cancelButtonText: 'Cancelar'
      }).then(res => {
        if (res.isConfirmed) {
          this.router.navigate(['/login']);
        }
      });
    } else {
      this.router.navigate(['/mis-torneos'], { queryParams: { torneo_id: torneo.id } });
    }
  }

  openWhatsApp(): void {
    if (!this.clubData?.landing_whatsapp && !this.clubData?.telefono) return;
    const phone = (this.clubData.landing_whatsapp || this.clubData.telefono).replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${phone}?text=Hola!%20Quiero%20más%20información%20sobre%20${encodeURIComponent(this.clubData.nombre)}`, '_blank');
  }

  openSocial(type: 'ig' | 'fb'): void {
    let val = type === 'ig' ? this.clubData?.landing_instagram : this.clubData?.landing_facebook;
    if (!val) return;
    val = val.trim();
    if (!val.startsWith('http')) {
      val = type === 'ig' ? `https://instagram.com/${val.replace('@', '')}` : `https://facebook.com/${val}`;
    }
    window.open(val, '_blank');
  }
}
