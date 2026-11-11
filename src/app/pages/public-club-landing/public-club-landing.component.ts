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
  isLoadingDisponibilidad: boolean = false;
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

  // Modal Reserva Rápida (Sin Login / Guest Checkout)
  showBookingModal: boolean = false;
  selectedCancha: any = null;
  selectedSlot: any = null;
  isSubmittingBooking: boolean = false;
  bookingSuccessData: any = null;

  guestBookingData = {
    nombre: '',
    telefono: '',
    email: '',
    notas: '',
    metodoPago: 'club' // 'club' (pagar en recepción), 'transferencia'
  };

  // Modal Inscripción Torneo (Sin Login)
  showTournamentModal: boolean = false;
  selectedTournament: any = null;
  isSubmittingTournament: boolean = false;
  tournamentSuccessData: any = null;

  guestTournamentData = {
    j1Nombre: '',
    j1Telefono: '',
    j1Email: '',
    j2Nombre: '',
    j2Telefono: '',
    nombrePareja: '',
    notas: ''
  };

  get colorPrimary(): string {
    return this.clubData?.landing_color_primary || '#0b0f19';
  }

  get colorAccent(): string {
    return this.clubData?.landing_color_accent || '#ccff00';
  }

  get defaultBannerUrl(): string {
    return this.clubData?.landing_banner || 'assets/images/padel-court-hero.jpg';
  }

  get clubInitials(): string {
    const name = this.clubData?.nombre || 'Padel';
    return name.slice(0, 2).toUpperCase();
  }

  get shareableLink(): string {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/c/${this.slug || this.clubData?.landing_slug || this.clubData?.id}`;
    }
    return `https://padelmanager.cl/c/${this.slug}`;
  }

  setFechaQuick(daysOffset: number): void {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    this.fechaSeleccionada = d.toISOString().split('T')[0];
    this.cargarDisponibilidad();
  }

  onFechaChange(): void {
    this.cargarDisponibilidad();
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
    // Intentar auto-rellenar datos si el usuario ya tiene sesión o los guardó antes
    const savedName = localStorage.getItem('user_name') || localStorage.getItem('guest_name') || '';
    const savedPhone = localStorage.getItem('user_phone') || localStorage.getItem('guest_phone') || '';
    const savedEmail = localStorage.getItem('user_email') || localStorage.getItem('guest_email') || '';

    if (savedName) this.guestBookingData.nombre = savedName;
    if (savedPhone) this.guestBookingData.telefono = savedPhone;
    if (savedEmail) this.guestBookingData.email = savedEmail;

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

          // Cargar disponibilidad de horarios en vivo para la fecha seleccionada
          this.cargarDisponibilidad();

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

  cargarDisponibilidad(): void {
    if (!this.clubData?.id && !this.slug) return;
    this.isLoadingDisponibilidad = true;

    const identifier = this.clubData?.id || this.slug;
    this.clubesService.getDisponibilidadPublica(identifier, this.fechaSeleccionada).subscribe({
      next: (res: any) => {
        this.isLoadingDisponibilidad = false;
        if (res.status === 'success' && res.canchas) {
          // Actualizar canchas con sus slots calculados en tiempo real
          this.canchas = res.canchas;
        }
      },
      error: () => {
        this.isLoadingDisponibilidad = false;
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

  // --- FLUJO DE RESERVA RÁPIDA SIN LOGIN (GUEST CHECKOUT) ---
  abrirReservaSlot(cancha: any, slot: any): void {
    if (!slot.disponible) return;

    this.selectedCancha = cancha;
    this.selectedSlot = slot;
    this.bookingSuccessData = null;
    this.showBookingModal = true;
  }

  cerrarModalReserva(): void {
    this.showBookingModal = false;
    this.selectedSlot = null;
    this.selectedCancha = null;
    this.bookingSuccessData = null;
  }

  confirmarReservaGuest(): void {
    if (!this.guestBookingData.nombre.trim()) {
      Swal.fire('Nombre Requerido', 'Por favor ingresa tu nombre y apellido para la reserva.', 'warning');
      return;
    }
    if (!this.guestBookingData.telefono.trim()) {
      Swal.fire('Teléfono Requerido', 'Por favor ingresa tu número de WhatsApp o teléfono.', 'warning');
      return;
    }

    this.isSubmittingBooking = true;

    // Recordar datos en navegador para futuras reservas
    localStorage.setItem('guest_name', this.guestBookingData.nombre);
    localStorage.setItem('guest_phone', this.guestBookingData.telefono);
    if (this.guestBookingData.email) localStorage.setItem('guest_email', this.guestBookingData.email);

    const payload = {
      cancha_id: this.selectedCancha.id,
      fecha: this.fechaSeleccionada,
      hora_inicio: this.selectedSlot.hora_inicio,
      duracion: this.selectedSlot.duracion || 90,
      nombre_invitado: this.guestBookingData.nombre,
      telefono_invitado: this.guestBookingData.telefono,
      email_invitado: this.guestBookingData.email,
      metodo_pago: this.guestBookingData.metodoPago,
      notas: this.guestBookingData.notas
    };

    this.clubesService.reservarPublicaGuest(payload).subscribe({
      next: (res: any) => {
        this.isSubmittingBooking = false;
        if (res.status === 'success') {
          this.bookingSuccessData = res.reserva;
          // Marcar el slot como ocupado localmente
          if (this.selectedSlot) {
            this.selectedSlot.disponible = false;
            this.selectedSlot.motivo = 'Reservado recién';
          }
          Swal.fire({
            title: '¡Cancha Reservada! 🎾',
            text: `Tu turno ha sido confirmado con código ${res.reserva.codigo}.`,
            icon: 'success',
            confirmButtonText: 'Ver Comprobante'
          });
        } else {
          Swal.fire('Aviso', res.message || 'No se pudo completar la reserva.', 'error');
        }
      },
      error: (err) => {
        this.isSubmittingBooking = false;
        const msg = err.error?.message || 'Ocurrió un error al reservar el horario. Intenta nuevamente.';
        Swal.fire('Error', msg, 'error');
      }
    });
  }

  // --- FLUJO DE INSCRIPCIÓN A TORNEOS SIN LOGIN ---
  inscribirAmericano(torneo: any): void {
    this.selectedTournament = torneo;
    this.tournamentSuccessData = null;
    this.showTournamentModal = true;

    if (this.guestBookingData.nombre && !this.guestTournamentData.j1Nombre) {
      this.guestTournamentData.j1Nombre = this.guestBookingData.nombre;
    }
    if (this.guestBookingData.telefono && !this.guestTournamentData.j1Telefono) {
      this.guestTournamentData.j1Telefono = this.guestBookingData.telefono;
    }
    if (this.guestBookingData.email && !this.guestTournamentData.j1Email) {
      this.guestTournamentData.j1Email = this.guestBookingData.email;
    }
  }

  cerrarModalTorneo(): void {
    this.showTournamentModal = false;
    this.selectedTournament = null;
    this.tournamentSuccessData = null;
  }

  confirmarInscripcionTorneo(): void {
    if (!this.guestTournamentData.j1Nombre.trim() || !this.guestTournamentData.j1Telefono.trim()) {
      Swal.fire('Datos Incompletos', 'Por favor ingresa nombre y teléfono del Jugador 1.', 'warning');
      return;
    }
    if (!this.guestTournamentData.j2Nombre.trim()) {
      Swal.fire('Pareja Requerida', 'Por favor ingresa el nombre de tu compañero/a de pádel.', 'warning');
      return;
    }

    this.isSubmittingTournament = true;

    const payload = {
      torneo_id: this.selectedTournament.id,
      jugador1_nombre: this.guestTournamentData.j1Nombre,
      jugador1_telefono: this.guestTournamentData.j1Telefono,
      jugador1_email: this.guestTournamentData.j1Email,
      jugador2_nombre: this.guestTournamentData.j2Nombre,
      jugador2_telefono: this.guestTournamentData.j2Telefono,
      nombre_pareja: this.guestTournamentData.nombrePareja,
      notas: this.guestTournamentData.notas
    };

    this.clubesService.inscribirTorneoGuest(payload).subscribe({
      next: (res: any) => {
        this.isSubmittingTournament = false;
        if (res.status === 'success') {
          this.tournamentSuccessData = res.detalle;
          Swal.fire({
            title: '¡Inscripción Exitosa! 🏆',
            text: 'Tu pareja ha quedado registrada en el torneo.',
            icon: 'success',
            confirmButtonText: 'Aceptar'
          });
        } else {
          Swal.fire('Aviso', res.message || 'No se pudo procesar la inscripción.', 'error');
        }
      },
      error: (err) => {
        this.isSubmittingTournament = false;
        const msg = err.error?.message || 'Ocurrió un error al procesar la inscripción.';
        Swal.fire('Error', msg, 'error');
      }
    });
  }

  copiarEnlaceClub(): void {
    navigator.clipboard.writeText(this.shareableLink).then(() => {
      Swal.fire({
        title: '¡Enlace Copiado!',
        text: 'Copia este link en la bio de tu Instagram o compártelo por WhatsApp con tus jugadores.',
        icon: 'success',
        timer: 3000,
        showConfirmButton: false
      });
    });
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
