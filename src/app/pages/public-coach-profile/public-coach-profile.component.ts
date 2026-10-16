import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { CoachPublicService, CoachPublicProfileResponse } from '../../services/coach-public.service';
import { AppDeepLinkService } from '../../services/app-deep-link.service';
import { ResenaModalComponent } from '../../components/resena-modal/resena-modal.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-public-coach-profile',
  standalone: true,
  imports: [CommonModule, ResenaModalComponent],
  templateUrl: './public-coach-profile.component.html',
  styleUrls: ['./public-coach-profile.component.scss']
})
export class PublicCoachProfileComponent implements OnInit {
  slug: string = '';
  isPreview: boolean = false;
  isLoading: boolean = true;
  errorMessage: string = '';

  data: CoachPublicProfileResponse | null = null;
  selectedPackId: number | null = null;
  activeTab: 'sobre-mi' | 'packs' | 'horarios' | 'resenas' = 'sobre-mi';
  packSegment: 'todos' | 'individual' | 'multijugador' | 'grupal' = 'todos';

  // Review modal
  showReviewModal: boolean = false;

  // Mobile App Reservation Modal
  showAppBookingModal: boolean = false;
  appOpeningStatus: 'idle' | 'opening' | 'redirecting_store' = 'idle';
  selectedBookingTarget: {
    type: 'pack' | 'horario' | 'general';
    pack?: any;
    horario?: any;
    title: string;
    subtitle?: string;
  } | null = null;

  get perfil(): any {
    return this.data?.perfil || {};
  }

  get colorFondo(): string {
    return this.perfil?.color_primary || '#070a12';
  }

  get colorAcento(): string {
    return this.perfil?.color_accent || '#ccff00';
  }

  get fondoStyleImage(): string {
    const raw = this.perfil?.fondo_url;
    if (!raw) return '';
    let url = raw;
    if (raw.startsWith('uploads/')) {
      url = 'https://api.padelmanager.cl/prd/' + raw;
    }
    return `linear-gradient(rgba(7, 10, 18, 0.82), rgba(7, 10, 18, 0.94)), url('${url}')`;
  }

  get coach(): any {
    return this.data?.entrenador || {};
  }

  get packs(): any[] {
    return this.data?.packs || [];
  }

  get packsIndividuales(): any[] {
    return this.packs.filter(p => (p.tipo === 'individual' || !p.tipo) && (!p.cantidad_personas || Number(p.cantidad_personas) <= 1));
  }

  get packsMultijugador(): any[] {
    return this.packs.filter(p => (p.tipo === 'individual' && Number(p.cantidad_personas) > 1) || p.tipo === 'multijugador' || p.tipo === 'parejas');
  }

  get packsGrupales(): any[] {
    return this.packs.filter(p => p.tipo === 'grupal' || p.tipo === 'pack_grupal');
  }

  get packsFiltrados(): any[] {
    if (this.packSegment === 'individual') return this.packsIndividuales;
    if (this.packSegment === 'multijugador') return this.packsMultijugador;
    if (this.packSegment === 'grupal') return this.packsGrupales;
    return this.packs;
  }

  setPackSegment(segment: 'todos' | 'individual' | 'multijugador' | 'grupal'): void {
    this.packSegment = segment;
  }

  selectedScheduleDate: string = '';

  get horarios(): any[] {
    return this.data?.horarios_disponibles || [];
  }

  get diasDisponibles(): any[] {
    if (!this.horarios || this.horarios.length === 0) return [];
    const map = new Map<string, number>();
    for (const h of this.horarios) {
      if (h.fecha) {
        map.set(h.fecha, (map.get(h.fecha) || 0) + 1);
      }
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const hoyStr = `${hoy.getFullYear()}-${(hoy.getMonth() + 1).toString().padStart(2, '0')}-${hoy.getDate().toString().padStart(2, '0')}`;
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);
    const mananaStr = `${manana.getFullYear()}-${(manana.getMonth() + 1).toString().padStart(2, '0')}-${manana.getDate().toString().padStart(2, '0')}`;

    const diasNombres = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
    const mesesNombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    const result: any[] = [];
    const fechas = Array.from(map.keys()).sort();
    for (const f of fechas) {
      const parts = f.split('-').map(Number);
      const dObj = new Date(parts[0], parts[1] - 1, parts[2]);
      const isHoy = f === hoyStr;
      const isManana = f === mananaStr;
      const diaSem = diasNombres[dObj.getDay()];
      const diaNum = parts[2].toString().padStart(2, '0');
      const mesNom = mesesNombres[parts[1] - 1];

      result.push({
        fecha: f,
        fechaObj: dObj,
        isToday: isHoy,
        isTomorrow: isManana,
        tag: isHoy ? 'HOY' : (isManana ? 'MAÑANA' : diaSem),
        diaSemana: diaSem,
        diaNumero: diaNum,
        mes: mesNom,
        total: map.get(f) || 0
      });
    }
    return result;
  }

  get activeScheduleDate(): string {
    if (this.selectedScheduleDate) {
      // Validate that this date exists in available days
      const exists = this.diasDisponibles.some(d => d.fecha === this.selectedScheduleDate);
      if (exists) return this.selectedScheduleDate;
    }
    const dias = this.diasDisponibles;
    return dias.length > 0 ? dias[0].fecha : '';
  }

  selectScheduleDate(fecha: string): void {
    this.selectedScheduleDate = fecha;
  }

  get horariosDelDia(): any[] {
    const fecha = this.activeScheduleDate;
    if (!fecha) return [];
    return this.horarios.filter(h => h.fecha === fecha);
  }

  getSlotsByCategory(period: 'morning' | 'afternoon' | 'evening'): any[] {
    return this.horariosDelDia.filter(h => {
      const horaNum = parseInt((h.hora || '00:00').split(':')[0], 10);
      if (period === 'morning') return horaNum < 12;
      if (period === 'afternoon') return horaNum >= 12 && horaNum < 18;
      if (period === 'evening') return horaNum >= 18;
      return false;
    });
  }

  formatDateHeader(fechaStr: string): string {
    if (!fechaStr) return '';
    const parts = fechaStr.split('-').map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    const diasCompletos = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const mesesCompletos = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return `${diasCompletos[d.getDay()]} ${parts[2]} de ${mesesCompletos[parts[1] - 1]}`;
  }

  get resenas(): any[] {
    return this.data?.resenas || [];
  }

  get stats(): any {
    return this.data?.estadisticas || { promedio_rating: 5.0, total_resenas: 0 };
  }

  get clubes(): any[] {
    return this.data?.clubes || [];
  }

  get bannerUrl(): string {
    const raw = this.perfil.banner_url;
    if (!raw) return 'assets/images/padel-court-hero.jpg';
    if (raw.startsWith('http') || raw.startsWith('assets/')) return raw;
    const clean = raw.startsWith('/') ? raw.substring(1) : raw;
    return `https://api.padelmanager.cl/prd/${clean}`;
  }

  get coachFoto(): string {
    const raw = this.coach.foto;
    if (!raw) return 'assets/icons/icon-512x512.png';
    if (raw.startsWith('http') || raw.startsWith('assets/')) return raw;
    const clean = raw.startsWith('/') ? raw.substring(1) : raw;
    return `https://api.padelmanager.cl/prd/${clean}`;
  }

  get locationText(): string {
    const com = this.coach.comuna || '';
    const reg = this.coach.region || '';
    return com + (reg ? `, ${reg}` : '');
  }

  get isLoggedInCoach(): boolean {
    try {
      const userStr = localStorage.getItem('user') || localStorage.getItem('currentUser');
      const user = userStr ? JSON.parse(userStr) : null;
      return !!(user && (user.rol === 'entrenador' || user.rol === 'admin'));
    } catch (e) {
      return false;
    }
  }

  get isOwner(): boolean {
    if (this.data?.perfil?.is_owner) return true;
    try {
      const userStr = localStorage.getItem('user') || localStorage.getItem('currentUser');
      const user = userStr ? JSON.parse(userStr) : null;
      return !!(user && (user.id === this.coach.id || user.rol === 'admin'));
    } catch (e) {
      return false;
    }
  }

  // Certificados
  get certificados(): any[] {
    return this.data?.certificados || [];
  }

  selectedCertModal: any = null;

  openCertModal(cert: any): void {
    this.selectedCertModal = cert;
  }

  closeCertModal(): void {
    this.selectedCertModal = null;
  }

  scrollToCerts(): void {
    setTimeout(() => {
      const el = document.getElementById('certs-gallery');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 150);
  }

  formatearCertUrl(raw: string): string {
    if (!raw) return '';
    if (raw.startsWith('http')) return raw;
    const clean = raw.startsWith('/') ? raw.substring(1) : raw;
    return `https://api.padelmanager.cl/prd/${clean}`;
  }

  getSafePdfUrl(raw: string): SafeResourceUrl {
    const url = this.formatearCertUrl(raw);
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private coachService: CoachPublicService,
    public appDeepLink: AppDeepLinkService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.slug = params['slug'] || '';
      this.route.queryParams.subscribe(qParams => {
        this.isPreview = qParams['preview'] === '1';
        if (qParams['pack']) {
          this.selectedPackId = Number(qParams['pack']);
        }
        if (this.slug) {
          this.loadProfile();
        }
      });
    });
  }

  loadProfile(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.coachService.getPublicProfile(this.slug, this.isPreview).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.status === 'success') {
          this.data = res;
          if (!this.isPreview) {
            this.coachService.trackVisita(this.slug).subscribe();
          }
          if (this.selectedPackId) {
            this.activeTab = 'packs';
            setTimeout(() => {
              const el = document.getElementById(`pack-${this.selectedPackId}`);
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }, 300);
          }
        } else {
          this.errorMessage = res.message || 'No se pudo cargar el perfil del entrenador';
        }
      },
      error: (err) => {
        this.isLoading = false;
        if (err.status === 403) {
          this.errorMessage = 'El perfil de este entrenador está en pausa o aún no ha sido publicado.';
        } else if (err.status === 404) {
          this.errorMessage = 'El entrenador solicitado no existe o el enlace es incorrecto.';
        } else {
          this.errorMessage = err.error?.message || 'Ocurrió un error al cargar el perfil.';
        }
      }
    });
  }

  setTab(tab: 'sobre-mi' | 'packs' | 'horarios' | 'resenas'): void {
    this.activeTab = tab;
    const tabAnchor = document.getElementById('tabs-anchor');
    if (tabAnchor) {
      const rect = tabAnchor.getBoundingClientRect();
      if (rect.top < 70) {
        tabAnchor.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }

  iniciarReservaPack(pack: any): void {
    if (this.appDeepLink.isMobile()) {
      this.selectedBookingTarget = {
        type: 'pack',
        pack: pack,
        title: pack.nombre,
        subtitle: `${this.coach.nombre} • ${pack.tipo === 'grupal' ? 'Clase Grupal' : 'Clase Particular'}`
      };
      this.appOpeningStatus = 'idle';
      this.showAppBookingModal = true;
    } else {
      this.comprarPack(pack);
    }
  }

  iniciarReservaHorario(h?: any): void {
    if (this.appDeepLink.isMobile()) {
      this.selectedBookingTarget = {
        type: 'horario',
        horario: h,
        title: h ? `Clase ${h.fecha} a las ${h.hora} hrs` : `Clase con ${this.coach.nombre}`,
        subtitle: `Entrenador: ${this.coach.nombre}`
      };
      this.appOpeningStatus = 'idle';
      this.showAppBookingModal = true;
    } else {
      this.reservarHorario(h);
    }
  }

  iniciarReservaGeneral(): void {
    if (this.appDeepLink.isMobile()) {
      this.selectedBookingTarget = {
        type: 'general',
        title: `Clases con ${this.coach.nombre}`,
        subtitle: 'Elige tu pack o agenda un horario'
      };
      this.appOpeningStatus = 'idle';
      this.showAppBookingModal = true;
    } else {
      this.scrollTo('sec-packs');
    }
  }

  ejecutarAbrirApp(): void {
    let query = `jugador-reservas?entrenador_id=${this.coach.id}`;
    if (this.selectedBookingTarget?.pack?.id) {
      query += `&pack_id=${this.selectedBookingTarget.pack.id}`;
    }
    this.appDeepLink.openAppOrStore(query, (status) => {
      this.appOpeningStatus = status;
    });
  }

  continuarReservaWeb(): void {
    const target = this.selectedBookingTarget;
    this.cerrarAppBookingModal();
    if (!target) {
      this.scrollTo('sec-packs');
      return;
    }
    if (target.type === 'pack' && target.pack) {
      this.comprarPack(target.pack);
    } else if (target.type === 'horario') {
      this.reservarHorario(target.horario);
    } else {
      this.reservarHorario();
    }
  }

  cerrarAppBookingModal(): void {
    this.showAppBookingModal = false;
    this.appOpeningStatus = 'idle';
  }

  comprarPack(pack: any): void {
    const isLoggedIn = !!(localStorage.getItem('token') || localStorage.getItem('currentUser') || localStorage.getItem('user'));
    if (!isLoggedIn) {
      Swal.fire({
        title: '¡Casi listo para entrenar!',
        text: `Para reservar "${pack.nombre}" y agendar tus clases con ${this.coach.nombre}, inicia sesión o crea tu cuenta gratuita.`,
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'Iniciar Sesión / Registrarme',
        cancelButtonText: 'Cancelar'
      }).then(res => {
        if (res.isConfirmed) {
          this.router.navigate(['/login'], { queryParams: { returnUrl: `/jugador-reservas?entrenador_id=${this.coach.id}&pack_id=${pack.id}` } });
        }
      });
    } else {
      // Redirigir a reservas de jugador con el entrenador y pack preseleccionados
      this.router.navigate(['/jugador-reservas'], { 
        queryParams: { entrenador_id: this.coach.id, pack_id: pack.id } 
      });
    }
  }

  reservarHorario(h?: any): void {
    const queryParams: any = { entrenador_id: this.coach.id };
    if (h?.fecha) queryParams.fecha = h.fecha;
    if (h?.hora) queryParams.hora = h.hora;

    let returnUrl = `/jugador-reservas?entrenador_id=${this.coach.id}`;
    if (h?.fecha && h?.hora) {
      returnUrl += `&fecha=${h.fecha}&hora=${h.hora}`;
    }

    const isLoggedIn = !!(localStorage.getItem('token') || localStorage.getItem('currentUser') || localStorage.getItem('user'));
    if (!isLoggedIn) {
      this.router.navigate(['/login'], { queryParams: { returnUrl } });
    } else {
      this.router.navigate(['/jugador-reservas'], { queryParams });
    }
  }

  openReviewModal(): void {
    const isLoggedIn = !!(localStorage.getItem('token') || localStorage.getItem('currentUser') || localStorage.getItem('user'));
    if (!isLoggedIn) {
      Swal.fire({
        title: 'Calificar al entrenador',
        text: 'Debes iniciar sesión con tu cuenta de alumno para dejar una reseña verificada.',
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'Iniciar Sesión',
        cancelButtonText: 'Cancelar'
      }).then(res => {
        if (res.isConfirmed) {
          this.router.navigate(['/login'], { queryParams: { returnUrl: `/e/${this.slug}` } });
        }
      });
    } else {
      this.showReviewModal = true;
    }
  }

  onReviewSaved(): void {
    this.loadProfile();
  }

  openWhatsApp(): void {
    if (!this.perfil.whatsapp && !this.perfil.telefono_contacto) return;
    const phone = (this.perfil.whatsapp || this.perfil.telefono_contacto).replace(/[^0-9]/g, '');
    const msg = encodeURIComponent(`Hola ${this.coach.nombre}! Te escribo desde tu perfil en PadelBlox para consultar por tus clases de pádel.`);
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  }

  openSocial(type: 'ig' | 'gmaps'): void {
    if (type === 'ig' && this.perfil.instagram) {
      const handle = this.perfil.instagram.replace('@', '').trim();
      window.open(`https://instagram.com/${handle}`, '_blank');
    } else if (type === 'gmaps' && this.perfil.google_business_url) {
      window.open(this.perfil.google_business_url, '_blank');
    }
  }

  scrollTo(sectionId: string): void {
    if (sectionId === 'sec-packs') this.activeTab = 'packs';
    else if (sectionId === 'sec-horarios') this.activeTab = 'horarios';
    else if (sectionId === 'sec-resenas') this.activeTab = 'resenas';
    else if (sectionId === 'sec-sobre-mi') this.activeTab = 'sobre-mi';

    setTimeout(() => {
      const el = document.getElementById(sectionId) || document.getElementById('tabs-anchor');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 60);
  }
}
