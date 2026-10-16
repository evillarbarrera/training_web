import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { SeoService } from '../../services/seo.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-gestion-club-padel',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './gestion-club-padel.component.html',
  styleUrls: ['./gestion-club-padel.component.scss']
})
export class GestionClubPadelComponent implements OnInit, AfterViewInit {
  showContactModal = false;
  contactForm = {
    nombre: '',
    email: '',
    telefono: '',
    academia: ''
  };
  isSendingContact = false;
  contactSuccess = false;

  mobileMenuOpen = false;

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
  }

  activePreviewTab = 0;
  previewTabs = [
    { label: '📅 Calendario Canchas', img: 'assets/img/web/calendario-de-reservas.png', desc: 'Panel visual de pistas con estados en vivo y reservas rápidas.' },
    { label: '📊 Panel Central', img: 'assets/img/web/home-club.png', desc: 'Métricas de ocupación, socios activos y facturación en tiempo real.' },
    { label: '🏆 Torneos Americanos', img: 'assets/img/web/americanos.png', desc: 'Fixtures, rotación de parejas y control de sets automático.' },
    { label: '💳 Ventas y TPV', img: 'assets/img/web/ventas-del-dia.png', desc: 'Control de caja, arriendos, bebidas y pelotas de pádel.' },
    { label: '📦 Inventario', img: 'assets/img/web/inventario.png', desc: 'Stock en tiempo real y alertas de reposición de insumos.' },
    { label: '⏰ Turnos de Atención', img: 'assets/img/web/turnos-de-atencion.png', desc: 'Horarios de apertura y asignación de personal de recepción.' }
  ];

  showZoomModal = false;
  zoomImage = '';
  zoomTitle = '';

  setPreviewTab(index: number): void {
    this.activePreviewTab = index;
  }

  openZoom(img: string, title: string): void {
    this.zoomImage = img;
    this.zoomTitle = title;
    this.showZoomModal = true;
  }

  closeZoom(): void {
    this.showZoomModal = false;
  }

  clubFeatures = [
    {
      icon: '🏢',
      title: 'Reservas Multi-Sede y Pistas',
      description: 'Panel centralizado para gestionar las canchas de todas tus sedes. Bloqueos de mantenimiento, reservas recurrentes y cuadrícula visual interactiva.'
    },
    {
      icon: '💳',
      title: 'Cobros Automáticos y Pagos Online',
      description: 'Integración con pasarelas de pago. Reduce la tasa de morosidad exigiendo reserva prepagada o abonos con monedero virtual.'
    },
    {
      icon: '🏆',
      title: 'Organizador de Torneos Americanos',
      description: 'Generación automática de fixtures, emparejamientos por nivel, control de resultados en vivo y asignación de puntos al ranking del club.'
    },
    {
      icon: '📦',
      title: 'Inventario y Punto de Venta (TPV)',
      description: 'Control de stock en tiempo real de pelotas, palas de test, bebidas y accesorios con alertas automáticas de reposición.'
    },
    {
      icon: '📊',
      title: 'Métricas de Rentabilidad y Ocupación',
      description: 'Reportes dinámicos de ingresos por hora, ocupación por cancha y análisis de recurrencia de socios para tomar mejores decisiones.'
    },
    {
      icon: '📈',
      title: 'Categorías y Ranking Oficial de Socios',
      description: 'Clasifica a tus jugadores por niveles (1ª a 6ª categoría). Lleva el historial de partidos, puntuación competitiva y ascensos/descensos automáticos.'
    }
  ];

  faqs = [
    {
      q: '¿Cómo ayuda PadelBlox a mejorar la ocupación de mi club de pádel?',
      a: 'PadelBlox automatiza las reservas las 24 horas del día a través de la web y app, eliminando las horas muertas con notificaciones de cancelación y listas de espera automáticas.',
      open: false
    },
    {
      q: '¿Puedo gestionar más de una sede o sucursal?',
      a: 'Sí, nuestra plataforma multi-sede te permite controlar diferentes clubes desde un único panel administrador con permisos diferenciados por sede.',
      open: false
    },
    {
      q: '¿Cómo funciona la organización de torneos americanos?',
      a: 'Solo debes definir el número de canchas, tiempo por partido y parejas inscritas. PadelBlox calcula las rondas, pistas y tablas de posiciones de forma instantánea.',
      open: false
    },
    {
      q: '¿Tienen periodo de prueba gratuito?',
      a: 'Sí, ofrecemos 90 días de prueba gratuita sin compromiso ni tarjeta de crédito para que pruebes todas las funciones en tu club.',
      open: false
    }
  ];

  constructor(
    private router: Router,
    private seoService: SeoService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.setSeo();
  }

  setSeo(): void {
    this.seoService.setPageSeo({
      title: 'Software de Gestión de Pádel para Clubes | Canchas, Torneos y Reservas | PadelBlox',
      description: 'El software Nº1 de gestión de pádel para clubes: reservas de pistas en tiempo real, cobros online sin comisiones abusivas, torneos americanos con IA, inventario TPV y reportes de ocupación. Prueba 90 días gratis.',
      keywords: 'gestion de padel, software para club de padel, gestion de club de padel, software gestion padel, sistema de reservas padel, software canchas de padel, administracion pistas padel, torneos americanos padel software, programa para club de padel, aplicacion club padel',
      canonicalUrl: 'https://padelblox.cl/gestion-club-padel',
      ogTitle: 'Software de Gestión de Pádel y Clubes Nº1 | PadelBlox',
      ogDescription: 'Maximiza la ocupación de tus canchas, automatiza cobros y organiza torneos con el software de gestión de pádel más avanzado.',
      ogImage: 'https://padelblox.cl/assets/img/web/calendario-de-reservas.png',
      schemaJson: [
        {
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          'name': 'PadelBlox - Gestión de Club de Pádel',
          'applicationCategory': 'BusinessApplication, SportsApplication',
          'operatingSystem': 'Web, iOS, Android',
          'description': 'Software completo para la administración y gestión integral de clubes y complejos de pádel.',
          'url': 'https://padelblox.cl/gestion-club-padel',
          'offers': {
            '@type': 'Offer',
            'price': '49990',
            'priceCurrency': 'CLP',
            'description': 'Plan Gestión de Club completo $49.990 CLP / mes con canchas ilimitadas'
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

  ngAfterViewInit(): void {
    this.initScrollAnimations();
  }

  initScrollAnimations(): void {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  }

  toggleFaq(index: number): void {
    this.faqs[index].open = !this.faqs[index].open;
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

  submitContactForm(): void {
    if (!this.contactForm.nombre || !this.contactForm.email) return;
    this.isSendingContact = true;

    this.http.post(`${environment.apiUrl}/send_contact.php`, this.contactForm)
      .subscribe({
        next: () => {
          this.isSendingContact = false;
          this.contactSuccess = true;
          this.contactForm = { nombre: '', email: '', telefono: '', academia: '' };
          setTimeout(() => this.closeContactModal(), 3000);
        },
        error: () => {
          this.isSendingContact = false;
        }
      });
  }

  irALogin(): void {
    this.router.navigate(['/login']);
  }
}
