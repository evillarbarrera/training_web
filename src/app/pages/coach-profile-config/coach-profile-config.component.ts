import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { CoachPublicService, CoachPublicConfig } from '../../services/coach-public.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-coach-profile-config',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: './coach-profile-config.component.html',
  styleUrls: ['./coach-profile-config.component.scss']
})
export class CoachProfileConfigComponent implements OnInit {
  userId: number = 0;
  userName: string = '';
  userFoto: string = '';
  userRole: 'administrador_club' | 'administrador' | 'staff_club' | 'entrenador' | 'jugador' = 'entrenador';

  activeTab: 'general' | 'multimedia' | 'visibilidad' | 'certificados' | 'resenas' = 'general';

  isLoading: boolean = true;
  isSaving: boolean = false;
  isUploadingBanner: boolean = false;
  isUploadingFondo: boolean = false;

  // Certificados
  certificados: any[] = [];
  isUploadingCert: boolean = false;
  nuevoCertTitulo: string = '';
  nuevaCertInstitucion: string = '';
  selectedCertFile: File | null = null;
  selectedCertFileName: string = '';

  // Model
  config: CoachPublicConfig = {
    entrenador_id: 0,
    slug: '',
    publicado: false,
    titulo: 'Profesor de Pádel Profesional',
    bio: '',
    especialidades: [],
    niveles: [],
    anios_experiencia: 3,
    certificaciones: '',
    comunas: [],
    clubes_ids: [],
    banner_url: '',
    fondo_url: '',
    telefono_contacto: '',
    whatsapp: '',
    instagram: '',
    facebook: '',
    google_business_url: '',
    color_primary: '#0f172a',
    color_accent: '#ccff00',
    mostrar_packs: true,
    mostrar_horarios: true,
    mostrar_resenas: true,
    visitas: 0
  };

  clubesDisponibles: any[] = [];
  resenasList: any[] = [];
  stats: any = { promedio_rating: 5.0, total_resenas: 0, visitas: 0 };

  // New tag inputs
  nuevaEspecialidad: string = '';
  nuevaComuna: string = '';

  // Presets
  especialidadesPresets: string[] = [
    'Iniciación', 'Técnica de Bandeja', 'Víbora y Remate', 'Bajada de Pared',
    'Táctica de Juego', 'Defensa y Salidas', 'Competición / Torneos',
    'Menores / Formación', 'Preparación Física'
  ];

  nivelesPresets: string[] = [
    'Principiante', 'Intermedio (5ta - 6ta)', 'Avanzado (3ra - 4ta)', 'Competición (1ra - 2da)'
  ];

  get publicUrl(): string {
    const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://padelblox.cl';
    return `${origin}/#/e/${this.config.slug}`;
  }

  get spaPreviewUrl(): string {
    return `${window.location.origin}/#/e/${this.config.slug}?preview=1`;
  }

  constructor(private coachService: CoachPublicService) {
    const userDataStr = localStorage.getItem('user') || localStorage.getItem('currentUser');
    const userData = JSON.parse(userDataStr || '{}');
    this.userId = userData.id || Number(localStorage.getItem('userId')) || 0;
    this.userName = userData.nombre || '';
    this.userFoto = userData.foto || userData.foto_perfil || '';
    this.userRole = userData.rol || localStorage.getItem('userRole') || 'entrenador';
    this.config.entrenador_id = this.userId;
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    this.coachService.getMyProfileConfig().subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.status === 'success' && res.config) {
          this.config = { ...this.config, ...res.config };
          this.clubesDisponibles = res.clubes_disponibles || [];
          this.stats = res.estadisticas || this.stats;
          this.certificados = res.certificados || [];
          this.loadResenas();
        }
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Error cargando configuración:', err);
        Swal.fire({
          icon: 'error',
          title: 'Error al cargar perfil',
          text: err.error?.message || 'No se pudo cargar la configuración de tu perfil público desde el servidor.'
        });
      }
    });
  }

  loadResenas(): void {
    this.coachService.getMisResenas().subscribe({
      next: (res) => {
        if (res.status === 'success') {
          this.resenasList = res.resenas || [];
        }
      }
    });
  }

  // Tags Management
  toggleEspecialidad(esp: string): void {
    const idx = this.config.especialidades.indexOf(esp);
    if (idx > -1) {
      this.config.especialidades.splice(idx, 1);
    } else {
      this.config.especialidades.push(esp);
    }
  }

  addCustomEspecialidad(): void {
    const val = this.nuevaEspecialidad.trim();
    if (val && !this.config.especialidades.includes(val)) {
      this.config.especialidades.push(val);
      this.nuevaEspecialidad = '';
    }
  }

  toggleNivel(niv: string): void {
    const idx = this.config.niveles.indexOf(niv);
    if (idx > -1) {
      this.config.niveles.splice(idx, 1);
    } else {
      this.config.niveles.push(niv);
    }
  }

  toggleClub(clubId: number): void {
    const idx = this.config.clubes_ids.indexOf(clubId);
    if (idx > -1) {
      this.config.clubes_ids.splice(idx, 1);
    } else {
      this.config.clubes_ids.push(clubId);
    }
  }

  addComuna(): void {
    const c = this.nuevaComuna.trim();
    if (c && !this.config.comunas.includes(c)) {
      this.config.comunas.push(c);
      this.nuevaComuna = '';
    }
  }

  removeComuna(idx: number): void {
    this.config.comunas.splice(idx, 1);
  }

  get bannerPreviewUrl(): string {
    const raw = this.config.banner_url;
    if (!raw) return 'assets/images/padel-court-hero.jpg';
    if (raw.startsWith('http') || raw.startsWith('assets/')) return raw;
    const clean = raw.startsWith('/') ? raw.substring(1) : raw;
    return `https://api.padelmanager.cl/prd/${clean}`;
  }

  get fondoPreviewUrl(): string {
    const raw = this.config.fondo_url;
    if (!raw) return '';
    if (raw.startsWith('http') || raw.startsWith('assets/')) return raw;
    const clean = raw.startsWith('/') ? raw.substring(1) : raw;
    return `https://api.padelmanager.cl/prd/${clean}`;
  }

  // Banner Upload
  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    this.isUploadingBanner = true;
    this.coachService.uploadBanner(file).subscribe({
      next: (res) => {
        this.isUploadingBanner = false;
        if (res.status === 'success') {
          this.config.banner_url = res.banner_url;
          // Guardar automáticamente para sincronizar la base de datos de inmediato
          this.guardarConfiguracion(false);
          Swal.fire('¡Banner Guardado!', 'La imagen de portada se subió y guardó correctamente en tu perfil.', 'success');
        }
      },
      error: (err) => {
        this.isUploadingBanner = false;
        Swal.fire('Error al subir', err.error?.message || 'No se pudo subir la imagen', 'error');
      }
    });
  }

  // Fondo Upload
  onFondoSelected(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    this.isUploadingFondo = true;
    this.coachService.uploadFondo(file).subscribe({
      next: (res) => {
        this.isUploadingFondo = false;
        if (res.status === 'success') {
          this.config.fondo_url = res.fondo_url;
          this.guardarConfiguracion(false);
          Swal.fire('¡Fondo Guardado!', 'La imagen de fondo se subió y guardó correctamente en tu perfil.', 'success');
        }
      },
      error: (err) => {
        this.isUploadingFondo = false;
        Swal.fire('Error al subir', err.error?.message || 'No se pudo subir la imagen de fondo', 'error');
      }
    });
  }

  quitarFondo(): void {
    this.config.fondo_url = '';
    this.guardarConfiguracion(false);
  }

  aplicarPaletaPreset(fondo: string, acento: string): void {
    this.config.color_primary = fondo;
    this.config.color_accent = acento;
  }

  // Certificados Management
  onCertFileSelected(event: any): void {
    const file = event.target.files[0];
    if (!file) return;
    this.selectedCertFile = file;
    this.selectedCertFileName = file.name;
    if (!this.nuevoCertTitulo) {
      const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      this.nuevoCertTitulo = nameWithoutExt.replace(/[-_]/g, ' ');
    }
  }

  subirCertificado(): void {
    if (!this.selectedCertFile) {
      Swal.fire('Atención', 'Por favor selecciona un archivo (imagen JPG/PNG/WEBP o documento PDF).', 'warning');
      return;
    }
    const titulo = this.nuevoCertTitulo.trim();
    if (!titulo) {
      Swal.fire('Atención', 'Ingresa un título para el certificado (ej: Instructor Nacional Nivel 1).', 'warning');
      return;
    }

    this.isUploadingCert = true;
    this.coachService.uploadCertificado(this.selectedCertFile, titulo, this.nuevaCertInstitucion.trim()).subscribe({
      next: (res) => {
        this.isUploadingCert = false;
        if (res.status === 'success' && res.certificado) {
          this.certificados.unshift(res.certificado);
          this.selectedCertFile = null;
          this.selectedCertFileName = '';
          this.nuevoCertTitulo = '';
          this.nuevaCertInstitucion = '';
          Swal.fire('¡Certificado Acreditado!', 'El documento se subió exitosamente y ahora es visible en tu perfil público.', 'success');
        } else {
          Swal.fire('Error', res.message || 'No se pudo guardar el certificado', 'error');
        }
      },
      error: (err) => {
        this.isUploadingCert = false;
        Swal.fire('Error al subir', err.error?.message || 'Error de conexión al subir el documento.', 'error');
      }
    });
  }

  eliminarCertificado(cert: any): void {
    Swal.fire({
      title: '¿Eliminar certificado?',
      text: `Se quitará "${cert.titulo}" de tu vitrina pública de entrenador.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.coachService.deleteCertificado(cert.id).subscribe({
          next: (res) => {
            if (res.status === 'success') {
              this.certificados = this.certificados.filter(c => c.id !== cert.id);
              Swal.fire('Eliminado', 'El certificado ha sido retirado de tu perfil.', 'success');
            } else {
              Swal.fire('Error', res.message || 'No se pudo eliminar', 'error');
            }
          },
          error: (err) => {
            Swal.fire('Error', err.error?.message || 'Error de red', 'error');
          }
        });
      }
    });
  }

  formatearCertUrl(raw: string): string {
    if (!raw) return '';
    if (raw.startsWith('http')) return raw;
    const clean = raw.startsWith('/') ? raw.substring(1) : raw;
    return `https://api.padelmanager.cl/prd/${clean}`;
  }

  // AI Copywriting Assistant
  generarBioConIA(): void {
    const nombre = this.userName || 'Entrenador';
    const comuna = this.config.comunas.length > 0 ? this.config.comunas.join(' y ') : 'Santiago';
    const espList = this.config.especialidades.slice(0, 3).join(', ');

    this.config.bio = `¡Hola! Soy ${nombre}, profesor de pádel en ${comuna} con más de ${this.config.anios_experiencia} años de trayectoria formando jugadores desde nivel iniciación hasta competición.

Mi metodología se enfoca en ${espList || 'técnica depurada y visión táctica'}, adaptando cada clase a tus metas personales para que juegues con más seguridad y disfrutes cada punto.

Agenda tu clase particular o inscríbete en mis entrenamientos grupales directamente aquí.`;

    Swal.fire({
      title: '✨ ¡Biografía Optimizada con IA!',
      text: 'Se generó un texto profesional y enfocado en conversión y SEO local.',
      icon: 'success',
      confirmButtonText: 'Genial'
    });
  }

  // Save Settings
  guardarConfiguracion(notificar: boolean = true): void {
    this.isSaving = true;
    this.coachService.saveProfileConfig(this.config).subscribe({
      next: (res) => {
        this.isSaving = false;
        if (res.status === 'success') {
          if (res.config) {
            this.config = { ...this.config, ...res.config };
          } else {
            this.config.slug = res.slug;
            this.config.publicado = !!res.publicado;
          }
          if (notificar) {
            Swal.fire('¡Guardado!', 'La información de tu perfil público ha sido actualizada.', 'success');
          }
        }
      },
      error: (err) => {
        this.isSaving = false;
        Swal.fire('Error', err.error?.message || 'Ocurrió un error al guardar', 'error');
      }
    });
  }

  togglePublicar(): void {
    this.config.publicado = !this.config.publicado;
    this.guardarConfiguracion(false);
    const msg = this.config.publicado 
      ? '¡Tu perfil público ya está disponible en internet y listo para indexarse!' 
      : 'Tu perfil está pausado. Ahora solo tú puedes verlo en modo vista previa.';
    Swal.fire(this.config.publicado ? '🌐 Publicado' : '⏸️ Pausado', msg, this.config.publicado ? 'success' : 'info');
  }

  copiarEnlace(): void {
    navigator.clipboard.writeText(this.publicUrl).then(() => {
      Swal.fire('¡Enlace Copiado!', this.publicUrl, 'success');
    });
  }

  previsualizar(): void {
    this.guardarConfiguracion(false);
    window.open(this.spaPreviewUrl, '_blank');
  }

  // Reseñas Response
  responderResena(resena: any): void {
    Swal.fire({
      title: `Responder a ${resena.alumno_nombre}`,
      input: 'textarea',
      inputLabel: 'Tu respuesta pública',
      inputValue: resena.respuesta_entrenador || '',
      inputPlaceholder: 'Ej: ¡Muchas gracias por tus palabras! Un placer entrenar contigo...',
      showCancelButton: true,
      confirmButtonText: 'Guardar Respuesta',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (result.isConfirmed && result.value) {
        this.coachService.responderResena(resena.id, result.value).subscribe({
          next: () => {
            resena.respuesta_entrenador = result.value;
            Swal.fire('Respuesta Publicada', 'Tu respuesta ahora es visible en tu perfil público.', 'success');
          },
          error: (err) => {
            Swal.fire('Error', err.error?.message || 'No se pudo guardar la respuesta', 'error');
          }
        });
      }
    });
  }
}
