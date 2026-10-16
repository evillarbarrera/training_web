import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { MysqlService } from '../../services/mysql.service';
import { AuthService } from '../../services/auth.service';
import { EntrenamientoService } from '../../services/entrenamientos.service';
import { CurrencyService } from '../../services/currency.service';
import { Chart, registerables } from 'chart.js';
import { Title, Meta } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';
import { SeoService } from '../../services/seo.service';

Chart.register(...registerables);

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss']
})
export class LandingComponent implements OnInit, AfterViewInit, OnDestroy {
  isAuthenticated = false;
  userRole: 'jugador' | 'entrenador' | 'administrador_club' | null = null;
  userName = '';
  userId: number | null = null;
  isLoading = true;

  // Currency Detection
  isInternational = false;
  currencySymbol = '$';
  currencyCode = 'CLP';

  // Contact Modal
  showContactModal = false;
  contactForm = {
    nombre: '',
    email: '',
    telefono: '',
    academia: ''
  };
  isSendingContact = false;
  contactSuccess = false;

  // Plans Data
  plans = [
    { 
        name: 'INICIAL 20', 
        clp: 19990, 
        usd: 21, 
        period: '/mes', 
        sessions: 'Hasta 20 Alumnos', 
        fee: 'IA & Pizarra Táctica', 
        promo: '3 Meses GRATIS', 
        featured: true, 
        badge: 'PARA EMPEZAR',
        btnText: 'PRUEBA GRATUITA'
    },
    { 
        name: 'PRO 40', 
        clp: 29990, 
        usd: 32, 
        period: '/mes', 
        sessions: 'Hasta 40 Alumnos', 
        fee: 'Gestión Completa', 
        promo: '3 Meses GRATIS', 
        featured: true, 
        badge: 'MÁS POPULAR',
        btnText: 'PRUEBA GRATUITA'
    },
    { 
        name: 'GESTIÓN DE CLUB', 
        clp: 49990, 
        usd: 53, 
        period: '/mes', 
        sessions: 'Gestión Completa', 
        fee: 'Canchas, Reservas e Inventario', 
        promo: '3 Meses GRATIS',
        featured: true,
        badge: 'RECOMENDADO',
        btnText: 'PRUEBA GRATUITA'
    },
    { 
        name: 'ELITE ILIMITADO', 
        clp: 49990, 
        usd: 53, 
        period: '/mes', 
        sessions: 'Alumnos Ilimitados', 
        fee: 'Asistencia VIP', 
        promo: '3 Meses GRATIS',
        btnText: 'COMIENZA AHORA'
    }
  ];

  // Mock data for trainers
  trainers = [
    {
      nombre: 'Carlos Ruiz',
      especialidad: 'Técnica Avanzada y Estrategia',
      curriculum: 'Ex-jugador profesional con más de 10 años de experiencia en alta competición. Especialista en corrección biomécánica.',
      foto: 'assets/images/trainer-carlos.png'
    },
    {
      nombre: 'Elena Martínez',
      especialidad: 'Iniciación y Menores',
      curriculum: 'Certificada por la Federación Internacional de Pádel. Experta en pedagogía deportiva y desarrollo de talentos jóvenes.',
      foto: 'assets/images/trainer-elena.png'
    },
    {
      nombre: 'Miguel Ángel Sos',
      especialidad: 'Preparación Física y Táctica',
      curriculum: 'Licenciado en Ciencias del Deporte. Diseña programas personalizados que combinan potencia física con inteligencia en pista.',
      foto: 'assets/images/trainer-miguel.png'
    }
  ];

  // Datos para jugador
  alumnoStats = {
    pagadas: 0,
    reservadas: 0,
    disponibles: 0,
    proxima_clase: null as any
  };

  // Slider logic
  currentSlide = 0;
  slides = [
    {
      badge: 'APP JUGADORES & ALUMNOS 🎾',
      title: 'TODO TU PÁDEL',
      highlight: 'EN LA PALMA DE TU MANO',
      description: 'Panel del jugador con métricas en tiempo real, reservas de pistas, historial de clases, créditos y estadísticas.',
      image: 'assets/img/Celular/home-jugador.png'
    },
    {
      badge: 'GESTIÓN DE CANCHAS 🏢',
      title: 'RESERVAS Y TURNOS',
      highlight: 'EN TIEMPO REAL',
      description: 'Visualiza la disponibilidad de pistas en segundos, agenda arriendos, partidos con amigos y controla cada franja horaria.',
      image: 'assets/img/Celular/reservas-de-canchas.png'
    },
    {
      badge: 'ACADEMIA & ENTRENAMIENTOS ⚡',
      title: 'AGENDA TUS CLASES',
      highlight: 'CON TU COACH FAVORITO',
      description: 'Elige a tu entrenador, revisa sus cupos disponibles y reserva entrenamientos particulares o grupales al instante.',
      image: 'assets/img/Celular/agendar-entrenamiento.png'
    },
    {
      badge: 'PROGRESO & EVALUACIÓN 📈',
      title: 'SEGUIMIENTO TÉCNICO',
      highlight: 'RADAR DE HABILIDADES',
      description: 'Evaluaciones personalizadas por tu coach, seguimiento de objetivos y evolución técnica detallada por cada golpe.',
      image: 'assets/img/Celular/progreso-entrenamiento.png'
    },
    {
      badge: 'COMPETICIÓN & TORNEOS 🏆',
      title: 'CAMPEONATOS ACTIVOS',
      highlight: 'LIGAS Y AMERICANOS',
      description: 'Sigue fixtures, consulta tablas de posiciones en directo y registra los resultados de tus partidos oficiales.',
      image: 'assets/img/Celular/campeonatos-en-curso.png'
    }
  ];

  // Web Platform Interactive Screenshots Tabs
  clubScreenshotTabs = [
    { id: 'reservas', label: '📅 Calendario Canchas', image: 'assets/img/web/calendario-de-reservas.png', title: 'Calendario de Reservas en Tiempo Real', desc: 'Cuadrícula interactiva de pistas con estados por color, arriendos rápidos y bloqueos de mantenimiento.' },
    { id: 'dashboard', label: '📊 Panel Central', image: 'assets/img/web/home-club.png', title: 'Panel de Control del Club', desc: 'Métricas de ocupación, facturación del día, resumen de reservas y alertas operativas en un solo vistazo.' },
    { id: 'americanos', label: '🏆 Torneos Americanos', image: 'assets/img/web/americanos.png', title: 'Organizador de Torneos y Ligas', desc: 'Generación automática de fixtures, rotaciones de parejas y marcadores en vivo para dinamizar tu club.' },
    { id: 'ventas', label: '💳 Punto de Venta (TPV)', image: 'assets/img/web/ventas-del-dia.png', title: 'Control de Ventas y Caja Diaria', desc: 'Cobros por arriendos, bebidas, pelotas y productos de tienda con flujo de caja transparente.' },
    { id: 'inventario', label: '📦 Control de Inventario', image: 'assets/img/web/inventario.png', title: 'Stock y Alertas de Reposición', desc: 'Inventario en tiempo real de accesorios, palas de test y consumibles con alertas de stock crítico.' },
    { id: 'reportes', label: '📈 Reportes Financieros', image: 'assets/img/web/reportes.png', title: 'Reportes y Estadísticas de Negocio', desc: 'Análisis detallado de rentabilidad por pista, horarios pico y recurrencia de socios.' }
  ];
  activeClubTab = 0;

  showZoomModal = false;
  zoomImage = '';
  zoomTitle = '';

  setActiveClubTab(index: number): void {
    this.activeClubTab = index;
  }

  openZoom(img: string, title: string): void {
    this.zoomImage = img;
    this.zoomTitle = title;
    this.showZoomModal = true;
  }

  closeZoom(): void {
    this.showZoomModal = false;
  }

  entrenadorStats = {
    alumnos_totales: 0,
    clases_hoy: 0,
    packs_activos: 0,
    proximos_entrenamientos: [] as any[]
  };

  private slideInterval: any;

  faqs = [
    {
      q: '¿Cómo funcionan los 90 días gratis?',
      a: 'Al registrarte como entrenador, obtienes acceso total a la plataforma sin costo por 3 meses. No requerimos tarjeta de crédito para empezar.',
      open: false
    },
    {
      q: '¿Puedo gestionar múltiples sedes o clubes?',
      a: 'Sí, el plan ELITE está diseñado para administradores de clubes que necesitan gestionar múltiples pistas, profesores y calendarios centralizados.',
      open: false
    },
    {
      q: '¿Qué incluye el análisis por IA?',
      a: 'Nuestra tecnología analiza la biomecánica de tus golpes base (Saque, Drive, Revés) mediante clips de video, entregando correcciones técnicas automáticas.',
      open: false
    },
    {
      q: '¿La app es compatible con iOS y Android?',
      a: 'Absolutamente. PadelBlox está optimizada como una PWA (Progressive Web App) y pronto disponible en tiendas oficiales.',
      open: false
    }
  ];

  constructor(
    private router: Router,
    private mysqlService: MysqlService,
    private authService: AuthService,
    private entrenamientoService: EntrenamientoService,
    private currencyService: CurrencyService,
    private seoService: SeoService,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    this.setSeoTags();
    this.detectCurrency();
    this.userId = Number(localStorage.getItem('userId'));
    const userRole = localStorage.getItem('userRole');

    if (!this.userId || !userRole) {
      this.isAuthenticated = false;
      this.isLoading = false;
      return;
    }

    this.isAuthenticated = true;
    this.userRole = userRole as any;
    this.cargarDatos();
  }

  setSeoTags(): void {
    this.seoService.setPageSeo({
      title: 'PadelBlox | Software Nº1 de Gestión de Clubes, Entrenamientos y Smartwatch de Pádel',
      description: 'La plataforma integral líder de pádel: gestión de clubes, reservas online de canchas, software para entrenadores con IA y marcador en tiempo real para Apple Watch y Wear OS. Prueba 90 días gratis.',
      keywords: 'software padel, gestion club de padel, reservas canchas padel, app smartwatch padel, entrenadores de padel, marcador apple watch padel, torneos americanos padel software, pizarra tactica padel',
      canonicalUrl: 'https://padelblox.cl/',
      ogTitle: 'PadelBlox | El Software Definitivo para el Mundo del Pádel',
      ogDescription: 'Digitaliza tu club o academia de pádel con reservas en vivo, análisis con IA y app de smartwatch para Apple Watch y Wear OS.',
      ogImage: 'https://padelblox.cl/assets/images/app-screenshot-v2.png',
      schemaJson: [
        {
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          'name': 'PadelBlox',
          'applicationCategory': 'SportsApplication, BusinessApplication',
          'operatingSystem': 'Web, iOS, Android, watchOS, Wear OS',
          'description': 'Plataforma líder para la gestión integral de clubes de pádel, academias, entrenamientos y tanteador en vivo para smartwatches.',
          'url': 'https://padelblox.cl/',
          'offers': {
            '@type': 'Offer',
            'price': '19990',
            'priceCurrency': 'CLP',
            'description': 'Planes desde $19.990 CLP / mes con 90 días de prueba gratuita'
          },
          'aggregateRating': {
            '@type': 'AggregateRating',
            'ratingValue': '4.9',
            'reviewCount': '154'
          }
        },
        {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          'mainEntity': this.faqs.map(f => ({
            '@type': 'Question',
            'name': f.q,
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': f.a
            }
          }))
        }
      ]
    });
  }

  toggleFaq(index: number) {
    this.faqs[index].open = !this.faqs[index].open;
  }

  detectCurrency(): void {
    this.currencyService.detectLocation().subscribe((country: string) => {
      this.isInternational = country !== 'CL';
      this.currencySymbol = this.isInternational ? 'USD $' : '$';
      this.currencyCode = this.isInternational ? 'USD' : 'CLP';
    });
  }

  openContactModal(): void {
    this.router.navigate(['/register']);
  }

  irARegister(): void {
    this.router.navigate(['/register']);
  }

  closeContactModal(): void {
    this.showContactModal = false;
  }

  mobileMenuOpen = false;

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
  }

  submitContactForm(): void {
    if (!this.contactForm.nombre || !this.contactForm.email) return;
    
    this.isSendingContact = true;
    
    this.http.post(`${environment.apiUrl}/send_contact.php`, this.contactForm)
      .subscribe({
        next: (res: any) => {
          this.isSendingContact = false;
          this.contactSuccess = true;
          this.contactForm = { nombre: '', email: '', telefono: '', academia: '' };
          setTimeout(() => {
            this.closeContactModal();
          }, 3000);
        },
        error: (err) => {
          console.error('Error sending contact email', err);
          this.isSendingContact = false;
          // You might want to show an error message here
        }
      });
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initLandingCharts();
      this.initScrollAnimations();
      this.startSlider();
    }, 500);
  }

  ngOnDestroy(): void {
    if (this.slideInterval) {
      clearInterval(this.slideInterval);
    }
  }

  startSlider(): void {
    this.slideInterval = setInterval(() => {
      this.nextSlide();
    }, 6000);
  }

  nextSlide(): void {
    this.currentSlide = (this.currentSlide + 1) % this.slides.length;
  }

  setSlide(index: number): void {
    this.currentSlide = index;
    if (this.slideInterval) {
      clearInterval(this.slideInterval);
      this.startSlider();
    }
  }

  initScrollAnimations(): void {
    const observerOptions = {
      threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
        }
      });
    }, observerOptions);

    const revealElements = document.querySelectorAll('.reveal');
    revealElements.forEach(el => observer.observe(el));
  }

  initLandingCharts(): void {
    const radarCtx = document.getElementById('landingRadarChart') as HTMLCanvasElement;
    if (radarCtx) {
      new Chart(radarCtx, {
        type: 'radar',
        data: {
          labels: ['Técnica', 'Control', 'Decisión', 'Saque', 'Volea', 'Fisico'],
          datasets: [{
            label: 'Tu Potencial',
            data: [8, 9, 7, 8, 8, 9],
            backgroundColor: 'rgba(204, 255, 0, 0.2)',
            borderColor: '#ccff00',
            pointBackgroundColor: '#111',
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            r: {
              suggestedMin: 0,
              suggestedMax: 10,
              grid: { color: 'rgba(255,255,255,0.1)' },
              angleLines: { color: 'rgba(255,255,255,0.1)' },
              pointLabels: {
                color: '#fff',
                font: {
                  size: window.innerWidth < 768 ? 10 : 12,
                  weight: 'bold'
                }
              }
            }
          }
        }
      });
    }

    const lineCtx = document.getElementById('landingLineChart') as HTMLCanvasElement;
    if (lineCtx) {
      new Chart(lineCtx, {
        type: 'line',
        data: {
          labels: ['Clase 1', 'Clase 2', 'Clase 3', 'Clase 4', 'Clase 5'],
          datasets: [{
            label: 'Evolución',
            data: [4, 5, 6.5, 7.8, 9.2],
            borderColor: '#ccff00',
            borderWidth: 3,
            tension: 0.4,
            fill: true,
            backgroundColor: 'rgba(204, 255, 0, 0.1)'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { display: false },
            x: {
              grid: { display: false },
              ticks: {
                color: 'rgba(255,255,255,0.5)',
                font: { size: window.innerWidth < 768 ? 9 : 11 }
              }
            }
          }
        }
      });
    }
  }

  cargarDatos(): void {
    if (!this.userId) return;

    this.mysqlService.getPerfil(this.userId).subscribe({
      next: (res) => {
        if (res.success) {
          this.userName = res.user.nombre || 'Usuario';
        }
      },
      error: (err) => console.error('Error cargando perfil:', err)
    });

    if (this.userRole === 'jugador') {
      this.cargarDatosAlumno();
    } else {
      this.cargarDatosEntrenador();
    }
  }

  cargarDatosAlumno(): void {
    if (!this.userId) return;
    this.mysqlService.getHomeStats(this.userId).subscribe({
      next: (res) => {
        let packs = res?.estadisticas?.packs || res?.packs || res;
        if (packs) {
          this.alumnoStats.pagadas = parseInt(packs.pagadas || packs.pagada) || 0;
          this.alumnoStats.reservadas = parseInt(packs.reservadas || packs.reservada) || 0;
          this.alumnoStats.disponibles = parseInt(packs.disponibles || packs.disponible) || 0;
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error cargando estadísticas:', err);
        this.isLoading = false;
      }
    });
  }

  cargarDatosEntrenador(): void {
    if (!this.userId) return;
    this.entrenamientoService.getAgenda(this.userId).subscribe({
      next: (res: any) => {
        if (res && Array.isArray(res)) {
          this.entrenadorStats.proximos_entrenamientos = res.slice(0, 5);
          this.entrenadorStats.clases_hoy = res.filter((e: any) => {
            const today = new Date().toDateString();
            return new Date(e.fecha).toDateString() === today;
          }).length;
        }
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Error cargando agenda:', err);
        this.isLoading = false;
      }
    });
  }

  irALogin(): void {
    this.router.navigate(['/login']);
  }

  irAHome(): void {
    const role = (this.userRole as string)?.toLowerCase() || '';
    if (role.includes('administrador') || role.includes('admin')) {
      this.router.navigate(['/admin-dashboard']);
    } else if (role.includes('entrenador')) {
      this.router.navigate(['/entrenador-home']);
    } else {
      this.router.navigate(['/jugador-home']);
    }
  }

  irAReservas(): void {
    this.router.navigate(['/jugador-reservas']);
  }

  irACalendario(): void {
    this.router.navigate(['/jugador-calendario']);
  }

  irAAgenda(): void {
    this.router.navigate(['/entrenador-agenda']);
  }

  irAAlumnos(): void {
    this.router.navigate(['/alumnos']);
  }

  irAPacks(): void {
    this.router.navigate(['/entrenador-packs']);
  }

  logout(): void {
    localStorage.clear();
    this.isAuthenticated = false;
    this.router.navigate(['/login']);
  }
}

