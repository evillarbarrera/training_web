import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { SeoService } from '../../services/seo.service';

interface PricingPlan {
  id: string;
  name: string;
  badge?: string;
  featured?: boolean;
  target: 'clubes' | 'entrenadores';
  description: string;
  priceMonthlyCLP: number;
  priceMonthlyUSD: number;
  priceAnnualCLP: number;
  priceAnnualUSD: number;
  period: string;
  features: string[];
  notIncluded?: string[];
  ctaText: string;
  ctaAction: string;
}

@Component({
  selector: 'app-precios-planes',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './precios-planes.component.html',
  styleUrls: ['./precios-planes.component.scss']
})
export class PreciosPlanesComponent implements OnInit {
  // Navigation & Drawer
  mobileMenuOpen = false;

  // Active Category & Billing Cycle
  activeCategory: 'clubes' | 'entrenadores' = 'clubes';
  billingCycle: 'monthly' | 'annual' = 'monthly';
  isInternational = false;

  // Contact Modal
  showContactModal = false;
  selectedPlanForContact: string | null = null;
  contactForm = {
    nombre: '',
    email: '',
    telefono: '',
    academia: '',
    plan: ''
  };
  isSendingContact = false;
  contactSuccess = false;

  // Single Complete Plan for Clubes
  clubPlan = {
    id: 'gestion-club',
    name: 'GESTIÓN DE CLUB',
    badge: 'RECOMENDADO 🏆',
    badgeBg: '#ccff00',
    badgeColor: '#000000',
    featured: true,
    description: 'La solución definitiva para digitalizar y rentabilizar tu club: canchas ilimitadas, reservas en tiempo real, smartwatch, torneos y tienda.',
    clpMonthly: 49990,
    usdMonthly: 54,
    clpAnnual: 39990,
    usdAnnual: 43,
    period: '/mes',
    features: [
      'Canchas y Pistas Ilimitadas (sin costo extra por pista)',
      'Sistema de Reservas en Vivo con Pagos Online (Webpay, Stripe, MercadoPago)',
      'App Móvil Oficial para Jugadores (iOS & Android)',
      'App Smartwatch en Muñeca (Apple Watch & Wear OS sincronizada en vivo)',
      'Generador de Torneos Americanos y Ligas con Cruces IA',
      'Marcador en Vivo en Cancha Sincronizado en Tiempo Real',
      'Módulo Completo de Tienda, Bar, Arriendos de Palas e Inventario',
      'Difusión Masiva y Avisos a Jugadores por WhatsApp',
      'Matchmaking y Búsqueda de Partidas por Nivel',
      'Panel de Control Financiero y Métricas de Ocupación',
      'Múltiples Usuarios Administradores y Recepcionistas con Roles',
      'Soporte Prioritario VIP 24/7 y Migración Gratuita Asistida'
    ],
    promo: '3 Meses (90 Días) 100% GRATIS',
    btnText: 'PRUEBA GRATUITA'
  };

  // Trainer / Coach Plans (Inicial 20, Pro 40, Elite Ilimitado)
  trainerPlans = [
    {
      id: 'inicial-20',
      name: 'INICIAL 20',
      badge: 'PARA EMPEZAR',
      badgeBg: '#ccff00',
      badgeColor: '#000000',
      featured: true,
      description: 'Para profesores que inician sus clases y desean automatizar el control de alumnos.',
      clpMonthly: 19990,
      usdMonthly: 21,
      clpAnnual: 15990,
      usdAnnual: 17,
      period: '/mes',
      features: [
        'Hasta 20 Alumnos Activos',
        'Pizarra Táctica Interactiva 2D/3D',
        'Asistente de Ejercicios con IA',
        'Control de Asistencia y Pagos',
        'App Móvil para Jugadores',
        '3 Meses (90 Días) 100% GRATIS'
      ],
      promo: '3 Meses GRATIS',
      btnText: 'PRUEBA GRATUITA'
    },
    {
      id: 'pro-40',
      name: 'PRO 40',
      badge: 'MÁS POPULAR',
      badgeBg: '#ffffff',
      badgeColor: '#111111',
      featured: true,
      description: 'Para academias y coaches que quieren evaluar técnica con video y automatizar packs.',
      clpMonthly: 29990,
      usdMonthly: 32,
      clpAnnual: 23990,
      usdAnnual: 26,
      period: '/mes',
      features: [
        'Hasta 40 Alumnos Activos',
        'Gestión Completa de Academia',
        'Evaluaciones Técnicas con Video & IA',
        'Venta de Packs de Clases Online',
        'Sincronización con Smartwatch',
        '3 Meses (90 Días) 100% GRATIS'
      ],
      promo: '3 Meses GRATIS',
      btnText: 'PRUEBA GRATUITA'
    },
    {
      id: 'elite-ilimitado',
      name: 'ELITE ILIMITADO',
      badge: '',
      badgeBg: '',
      badgeColor: '',
      featured: false,
      description: 'Para directores de academias con alto volumen de alumnos y entrenadores asociados.',
      clpMonthly: 49990,
      usdMonthly: 54,
      clpAnnual: 39990,
      usdAnnual: 43,
      period: '/mes',
      features: [
        'Alumnos Ilimitados',
        'Multi-Entrenador / Coaches Asociados',
        'Análisis Biomecánico Avanzado por IA',
        'Ranking Interno de la Academia',
        'Asistencia VIP 24/7 y Onboarding Dedicado',
        '3 Meses (90 Días) 100% GRATIS'
      ],
      promo: '3 Meses GRATIS',
      btnText: 'COMIENZA AHORA'
    }
  ];

  // FAQ Data
  faqs = [
    {
      q: '¿Cómo funciona el periodo de prueba de 90 días?',
      a: 'Tienes acceso total a todas las funcionalidades del plan seleccionado durante 3 meses completos. No te pediremos tarjeta de crédito para iniciar, y puedes cancelar o cambiar de plan cuando quieras.',
      open: false
    },
    {
      q: '¿Cobran comisiones por las reservas o inscripciones a torneos?',
      a: 'No cobramos comisión adicional por reserva. Solo aplicamos la tarifa estándar de la pasarela de pagos que elijas integrar (Webpay, Stripe o MercadoPago). El 100% de tus ingresos por cancha va a tu cuenta.',
      open: false
    },
    {
      q: '¿Puedo cambiar de plan o cancelar en cualquier momento?',
      a: 'Sí, totalmente. No hay contratos forzosos ni permanencia mínima. Puedes subir, bajar de plan o cancelar tu suscripción con un solo clic desde tu panel.',
      open: false
    },
    {
      q: '¿Cómo se conecta con la app del Smartwatch?',
      a: 'La sincronización con Apple Watch y relojes Wear OS (Samsung Galaxy Watch, etc.) está incluida sin costo adicional en los planes. Tus jugadores y árbitros pueden llevar el tanteo en vivo desde su muñeca.',
      open: false
    },
    {
      q: '¿Me ayudan a migrar mis datos y configurar el club?',
      a: '¡Por supuesto! Nuestro equipo de soporte te acompaña en una videollamada personalizada gratuita para cargar tus canchas, configurar horarios, importar tu base de clientes y dejar todo listo en menos de 24 horas.',
      open: false
    }
  ];

  constructor(
    private router: Router,
    private seoService: SeoService
  ) {}

  ngOnInit(): void {
    // Scroll to top
    window.scrollTo(0, 0);
    this.setSeo();
  }

  setSeo(): void {
    this.seoService.setPageSeo({
      title: 'Planes y Precios PadelBlox | Software para Clubes y Entrenadores de Pádel',
      description: 'Conoce los precios del mejor software de pádel. Sin comisiones por reserva, canchas ilimitadas y 90 días de prueba gratuita. Planes para clubes y entrenadores.',
      keywords: 'precios software padel, planes gestion club padel, tarifas app entrenadores padel, software padel gratis prueba, cuanto cuesta software club padel',
      canonicalUrl: 'https://padelblox.cl/precios',
      ogTitle: 'Planes y Precios Transparentes | PadelBlox',
      ogDescription: 'Prueba 90 días gratis sin tarjeta. Todo incluido: canchas ilimitadas, torneos, IA y app smartwatch.',
      ogImage: 'https://padelblox.cl/assets/images/app-screenshot-v2.png',
      schemaJson: [
        {
          '@context': 'https://schema.org',
          '@type': 'Product',
          'name': 'PadelBlox Software de Pádel',
          'description': 'Plataforma para gestión de clubes de pádel, academias y tanteador para smartwatches.',
          'brand': {
            '@type': 'Brand',
            'name': 'PadelBlox'
          },
          'offers': [
            {
              '@type': 'Offer',
              'name': 'Plan Gestión de Club',
              'price': '49990',
              'priceCurrency': 'CLP',
              'availability': 'https://schema.org/InStock',
              'url': 'https://padelblox.cl/precios'
            },
            {
              '@type': 'Offer',
              'name': 'Plan Inicial 20 Entrenadores',
              'price': '19990',
              'priceCurrency': 'CLP',
              'availability': 'https://schema.org/InStock',
              'url': 'https://padelblox.cl/precios'
            },
            {
              '@type': 'Offer',
              'name': 'Plan Pro 40 Entrenadores',
              'price': '29990',
              'priceCurrency': 'CLP',
              'availability': 'https://schema.org/InStock',
              'url': 'https://padelblox.cl/precios'
            }
          ]
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

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
  }

  setCategory(cat: 'clubes' | 'entrenadores'): void {
    this.activeCategory = cat;
  }

  setBilling(cycle: 'monthly' | 'annual'): void {
    this.billingCycle = cycle;
  }

  toggleCurrency(): void {
    this.isInternational = !this.isInternational;
  }

  toggleFaq(index: number): void {
    this.faqs[index].open = !this.faqs[index].open;
  }

  openContactModal(planName: string = ''): void {
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
    
    // Simulate sending form / WhatsApp notification
    setTimeout(() => {
      this.isSendingContact = false;
      this.contactSuccess = true;
      setTimeout(() => {
        this.closeContactModal();
      }, 2500);
    }, 1000);
  }

  irALogin(): void {
    this.router.navigate(['/login']);
  }
}
