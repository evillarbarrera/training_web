import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { SeoService } from '../../services/seo.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-smartwatch-padel',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './smartwatch-padel.component.html',
  styleUrls: ['./smartwatch-padel.component.scss']
})
export class SmartwatchPadelComponent implements OnInit, AfterViewInit {
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
    { label: '⌚ Marcador en Vivo', img: 'assets/img/Reloj/marcador.png', desc: 'Anota puntos, juegos y sets con un toque en la pantalla o la corona digital.' },
    { label: '📊 Métricas & Frecuencia', img: 'assets/img/Reloj/estadisticas.png', desc: 'Monitoreo de frecuencia cardíaca, calorías, zonas de esfuerzo y duración.' },
    { label: '🏠 Menú Rápido', img: 'assets/img/Reloj/home.png', desc: 'Inicia partidos individuales, dobles, torneos o entrenamientos guiados.' },
    { label: '🎾 Configuración de Partido', img: 'assets/img/Reloj/home-2.png', desc: 'Configura reglas de Punto de Oro, Ventaja, sets al mejor de 3 y tie-break.' },
    { label: '🏆 Resumen del Match', img: 'assets/img/Reloj/resumen.png', desc: 'Estadísticas finales de puntos ganados y desglose de sets.' },
    { label: '📱 Sincronización Celular', img: 'assets/img/Celular/metricas-de-partido-con-reloj.png', desc: 'Historial completo y gráficos avanzados sincronizados con tu smartphone.' }
  ];

  showZoomModal = false;
  zoomImage = '';
  zoomTitle = '';

  watchFeatures = [
    {
      icon: '⌚',
      title: 'Marcador en la Muñeca',
      description: 'Lleva el tanteador punto a punto sin salir de la pista ni tocar tu smartphone. Modos para Punto de Oro o Ventaja tradicional.'
    },
    {
      icon: '🔄',
      title: 'Indicador de Saque & Lado',
      description: 'El reloj te indica visualmente a qué pareja y jugador le corresponde sacar y desde qué lado de la pista (derecha o izquierda).'
    },
    {
      icon: '❤️',
      title: 'Salud, Frecuencia & Calorías',
      description: 'Lectura biométrica en tiempo real: registra zonas de frecuencia cardíaca, quema calórica y tiempo efectivo de juego en cada set.'
    },
    {
      icon: '📡',
      title: 'Sincronización en Directo',
      description: 'Los puntos se transmiten instantáneamente al club, permitiendo que espectadores y torneos sigan el marcador en vivo desde la web o pantallas.'
    },
    {
      icon: '📳',
      title: 'Vibración Háptica Inteligente',
      description: 'Alertas táctiles discretas para cambio de lado de pista, set point, punto de oro y victoria del match sin distracciones.'
    },
    {
      icon: '🏆',
      title: 'Integración con Ligas & Americanos',
      description: 'Al terminar el partido, el resultado se envía de forma automática a la tabla de posiciones de tu liga o torneo del club.'
    }
  ];

  compatibilityDevices = [
    {
      brand: 'Apple Watch',
      icon: '',
      models: 'Series 4, 5, 6, 7, 8, 9, Ultra 1 & 2, SE (watchOS 8.0+)',
      store: 'App Store',
      link: 'https://apps.apple.com/cl/app/padelblox-chile/id6759664729'
    },
    {
      brand: 'Wear OS & Android',
      icon: '▶',
      models: 'Samsung Galaxy Watch 4/5/6, Google Pixel Watch, TicWatch (Wear OS 3.0+)',
      store: 'Google Play',
      link: 'https://play.google.com/store/apps/details?id=cl.padelacademy.app&pcampaignid=web_share'
    }
  ];

  faqs = [
    {
      q: '¿Necesito tener mi celular en el bolsillo mientras juego?',
      a: 'No. Puedes dejar tu teléfono en tu bolso o al borde de la pista. El reloj funciona de forma independiente y sincroniza los datos por Bluetooth o WiFi/LTE.',
      open: false
    },
    {
      q: '¿Cómo se anota un punto o se corrige un error en el reloj?',
      a: 'Un toque en la pantalla suma el punto para la pareja correspondiente. Si te equivocas, dispones de un botón de deshacer inmediato en la esquina de la pantalla.',
      open: false
    },
    {
      q: '¿Es compatible con la regla del Punto de Oro?',
      a: 'Sí, puedes configurar antes de empezar el partido entre Punto de Oro (a 40-40 quien gana el punto gana el juego) o Ventaja clásica internacional.',
      open: false
    },
    {
      q: '¿Los espectadores pueden ver el marcador en tiempo real?',
      a: 'Sí. El marcador se transmite en vivo a la plataforma PadelBlox para que el club, árbitros y espectadores lo sigan desde cualquier pantalla o teléfono.',
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
      title: 'App de Pádel para Smartwatch | Marcador en Apple Watch & Wear OS | PadelBlox',
      description: 'Lleva el marcador de pádel en tu muñeca con Apple Watch y Smartwatches Wear OS (Samsung, Pixel). Tanteador punto a punto, indicador de saque, frecuencia cardíaca y sincronización en vivo con tu club.',
      keywords: 'smartwatch padel, app padel apple watch, tanteador wear os padel, marcador padel reloj, contador puntos padel smartwatch, app reloj padel, marcador padel vivo reloj',
      canonicalUrl: 'https://padelblox.cl/smartwatch-padel',
      ogTitle: 'App de Pádel para Apple Watch & Wear OS | PadelBlox',
      ogDescription: 'Anota cada punto desde tu muñeca, monitorea tus calorías y transmite el resultado en directo al club.',
      ogImage: 'https://padelblox.cl/assets/img/Reloj/marcador.png',
      schemaJson: [
        {
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          'name': 'PadelBlox Smartwatch App',
          'applicationCategory': 'SportsApplication, HealthApplication',
          'operatingSystem': 'watchOS, Wear OS, iOS, Android',
          'description': 'Aplicación de tanteador, marcador y métricas biométricas de pádel para Apple Watch y smartwatches Android Wear OS.',
          'url': 'https://padelblox.cl/smartwatch-padel',
          'offers': {
            '@type': 'Offer',
            'price': '0',
            'priceCurrency': 'CLP',
            'description': 'Gratuito para jugadores y socios de clubes asociados'
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

  submitContact(): void {
    if (!this.contactForm.nombre || !this.contactForm.email) return;
    this.isSendingContact = true;
    const apiUrl = environment.apiUrl || 'https://padelblox.cl/api';
    this.http.post(`${apiUrl}/contact-demo`, { ...this.contactForm, tipo: 'smartwatch' })
      .subscribe({
        next: () => {
          this.isSendingContact = false;
          this.contactSuccess = true;
          setTimeout(() => this.closeContactModal(), 2500);
        },
        error: () => {
          this.isSendingContact = false;
          this.contactSuccess = true;
          setTimeout(() => this.closeContactModal(), 2500);
        }
      });
  }

  irALogin(): void {
    this.router.navigate(['/login']);
  }

  onImgError(event: any): void {
    event.target.src = 'assets/img/placeholder.png';
  }
}
