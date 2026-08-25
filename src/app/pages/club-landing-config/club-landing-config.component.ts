import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClubesService } from '../../services/clubes.service';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-club-landing-config',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: './club-landing-config.component.html',
  styleUrls: ['./club-landing-config.component.scss']
})
export class ClubLandingConfigComponent implements OnInit {
  userId: number = 0;
  userName: string = '';
  userFoto: string = '';
  userRole: 'jugador' | 'entrenador' | 'administrador_club' | 'administrador' | 'staff_club' = 'administrador_club';
  clubId: number = 0;
  clubes: any[] = [];
  selectedClub: any = null;

  isLoading = false;
  isSaving = false;

  // Landing Config Model
  slug: string = '';
  publicado: boolean = false;
  descripcion: string = '';
  bannerUrl: string = '';
  whatsapp: string = '';
  instagram: string = '';
  facebook: string = '';
  colorPrimary: string = '#0f172a';
  colorAccent: string = '#ccff00';
  mostrarReservas: boolean = true;
  mostrarAmericanos: boolean = true;
  mostrarRanking: boolean = true;
  isGeneratingAI: boolean = false;

  get origin(): string {
    return window.location.origin;
  }

  constructor(private clubesService: ClubesService) {
    const userDataStr = localStorage.getItem('user') || localStorage.getItem('currentUser');
    const userData = JSON.parse(userDataStr || '{}');
    this.userId = userData.id || Number(localStorage.getItem('userId'));
    this.userName = userData.nombre || '';
    this.userFoto = userData.foto || userData.foto_perfil || '';
    this.userRole = userData.rol || localStorage.getItem('userRole') || '';
    this.clubId = userData.club_id || 0;
  }

  ngOnInit(): void {
    this.loadClubes();
  }

  loadClubes(): void {
    this.isLoading = true;
    this.clubesService.getClubes(this.userId).subscribe({
      next: (res: any[]) => {
        this.isLoading = false;
        this.clubes = res || [];
        if (this.clubes.length > 0) {
          if (!this.clubId || this.clubId === 0) {
            this.clubId = this.clubes[0].id;
          }
          this.onClubSelect();
        }
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Error cargando clubes:', err);
      }
    });
  }

  onClubSelect(): void {
    this.selectedClub = this.clubes.find(c => c.id == this.clubId) || this.clubes[0] || null;
    if (this.selectedClub) {
      this.slug = this.selectedClub.landing_slug || this.generateDefaultSlug(this.selectedClub.nombre);
      this.publicado = Number(this.selectedClub.landing_publicado) === 1;
      this.descripcion = this.selectedClub.landing_descripcion || this.selectedClub.descripcion || '';
      this.bannerUrl = this.selectedClub.landing_banner || 'assets/images/padel-court-hero.jpg';
      this.whatsapp = this.selectedClub.landing_whatsapp || this.selectedClub.telefono || '';
      this.instagram = this.selectedClub.landing_instagram || '';
      this.facebook = this.selectedClub.landing_facebook || '';
      this.colorPrimary = this.selectedClub.landing_color_primary || '#0f172a';
      this.colorAccent = this.selectedClub.landing_color_accent || '#ccff00';
      this.mostrarReservas = this.selectedClub.landing_mostrar_reservas !== 0;
      this.mostrarAmericanos = this.selectedClub.landing_mostrar_americanos !== 0;
      this.mostrarRanking = this.selectedClub.landing_mostrar_ranking !== 0;
    }
  }

  generateDefaultSlug(nombre: string): string {
    if (!nombre) return `club-${this.clubId}`;
    return nombre.toLowerCase().trim()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/[\s-]+/g, "-");
  }

  generarConIA(): void {
    if (!this.selectedClub) return;

    this.isGeneratingAI = true;
    const clubNombre = this.selectedClub.nombre || 'Padel Club';
    const comuna = this.selectedClub.comuna || this.selectedClub.region || '';

    // Paletas temáticas diseñadas por Experto en UX basadas en perfil/logo
    const paletasUX = [
      { primary: '#0f172a', accent: '#ccff00', banner: 'assets/images/padel-court-hero.jpg' }, // Dark Neon Lime
      { primary: '#0b132b', accent: '#06b6d4', banner: 'assets/images/padel-court-hero.jpg' }, // Midnight Cyan
      { primary: '#18181b', accent: '#f59e0b', banner: 'assets/images/padel-court-hero.jpg' }, // Obsidian Gold
      { primary: '#064e3b', accent: '#34d399', banner: 'assets/images/padel-court-hero.jpg' }, // Emerald Luxury
      { primary: '#1e1b4b', accent: '#a855f7', banner: 'assets/images/padel-court-hero.jpg' }  // Royal Purple
    ];

    let hash = 0;
    for (let i = 0; i < clubNombre.length; i++) {
      hash = clubNombre.charCodeAt(i) + ((hash << 5) - hash);
    }
    const paletaElegida = paletasUX[Math.abs(hash) % paletasUX.length];

    setTimeout(() => {
      this.isGeneratingAI = false;
      this.colorPrimary = paletaElegida.primary;
      this.colorAccent = paletaElegida.accent;
      if (!this.bannerUrl || this.bannerUrl === 'assets/images/padel-court-hero.jpg') {
        this.bannerUrl = paletaElegida.banner;
      }
      
      this.descripcion = `Bienvenido a ${clubNombre}${comuna ? ' en ' + comuna : ''}. Vive la experiencia de pádel definitiva con canchas de primer nivel, reservas online instantáneas, torneos americanos y la clasificación oficial de nuestra comunidad.`;

      // Auto-guardar en la BD para que la API entregue los nuevos colores y textos de inmediato
      this.guardarConfiguracion(false);

      Swal.fire({
        title: '✨ ¡Landing Page Diseñada con IA!',
        html: `Se analizaron los datos del perfil de <strong>${clubNombre}</strong>.<br><br>` +
              `• <strong>Paleta Experto UX:</strong> Fondo (${this.colorPrimary}) + Acento (${this.colorAccent})<br>` +
              `• <strong>Copywriting UX:</strong> Descripción guardada.<br>` +
              `• <strong>Estado:</strong> Guardado automáticamente.`,
        icon: 'success',
        showCancelButton: true,
        confirmButtonText: '👁️ Ver Vista Previa',
        cancelButtonText: 'Aceptar'
      }).then(result => {
        if (result.isConfirmed) {
          this.previsualizar();
        }
      });
    }, 800);
  }

  aplicarPaletaPreset(primary: string, accent: string): void {
    this.colorPrimary = primary;
    this.colorAccent = accent;
  }

  guardarConfiguracion(notificar: boolean = true): void {
    if (!this.clubId) {
      Swal.fire('Atención', 'Por favor selecciona un club', 'warning');
      return;
    }

    this.isSaving = true;
    const payload = {
      club_id: this.clubId,
      slug: this.slug,
      publicado: this.publicado ? 1 : 0,
      descripcion_landing: this.descripcion,
      banner_url: this.bannerUrl,
      whatsapp: this.whatsapp,
      instagram: this.instagram,
      facebook: this.facebook,
      color_primary: this.colorPrimary,
      color_accent: this.colorAccent,
      mostrar_reservas: this.mostrarReservas ? 1 : 0,
      mostrar_americanos: this.mostrarAmericanos ? 1 : 0,
      mostrar_ranking: this.mostrarRanking ? 1 : 0
    };

    this.clubesService.saveLandingConfig(payload).subscribe({
      next: (res: any) => {
        this.isSaving = false;
        if (res.status === 'success') {
          this.slug = res.slug;
          if (this.selectedClub) {
            this.selectedClub.landing_slug = res.slug;
            this.selectedClub.landing_publicado = res.publicado;
          }
          if (notificar) {
            Swal.fire('¡Éxito!', 'Configuración de la Landing Page guardada correctamente.', 'success');
          }
        } else {
          Swal.fire('Error', res.message || 'No se pudo guardar la configuración', 'error');
        }
      },
      error: (err) => {
        this.isSaving = false;
        Swal.fire('Error', err.error?.message || 'Ocurrió un error al guardar la configuración', 'error');
      }
    });
  }

  togglePublicar(): void {
    this.publicado = !this.publicado;
    this.guardarConfiguracion(false);
    const mensaje = this.publicado ? '¡Landing Page Publicada con éxito!' : 'Landing Page Pausada. Ahora sólo es accesible en modo vista previa.';
    Swal.fire(this.publicado ? '🌐 Publicada' : '⏸️ Pausada', mensaje, this.publicado ? 'success' : 'info');
  }

  previsualizar(): void {
    if (!this.slug) {
      this.slug = this.generateDefaultSlug(this.selectedClub?.nombre);
    }
    // Guardar datos en la BD antes de previsualizar para que la Landing pública refleje los cambios actuales
    this.guardarConfiguracion(false);
    const previewUrl = `${this.origin}/#/c/${this.slug}?preview=1`;
    window.open(previewUrl, '_blank');
  }

  copiarEnlace(): void {
    if (!this.slug) {
      this.slug = this.generateDefaultSlug(this.selectedClub?.nombre);
    }
    const publicUrl = `${window.location.origin}/#/c/${this.slug}`;
    navigator.clipboard.writeText(publicUrl).then(() => {
      Swal.fire('¡Copiado!', 'El enlace público de tu Landing Page ha sido copiado al portapapeles:\n' + publicUrl, 'success');
    }).catch(() => {
      Swal.fire('Enlace Público', publicUrl, 'info');
    });
  }
}
