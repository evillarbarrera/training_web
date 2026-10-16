import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { SeoService } from '../../services/seo.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-gestion-entrenamientos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './gestion-entrenamientos.component.html',
  styleUrls: ['./gestion-entrenamientos.component.scss']
})
export class GestionEntrenamientosComponent implements OnInit, AfterViewInit {
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

  activeCoachTab = 0;
  coachPreviewTabs = [
    { label: '📈 Progreso Técnico', img: 'assets/img/Celular/progreso-entrenamiento.png', desc: 'Radar de habilidades y evolución por golpe del alumno.' },
    { label: '📝 Evaluación Coach', img: 'assets/img/Celular/evaluacion-del-entrenador.png', desc: 'Notas de clase, objetivos y feedback directo.' },
    { label: '📅 Agendar Clases', img: 'assets/img/Celular/agendar-entrenamiento.png', desc: 'Reserva automática descontando saldo de créditos/packs.' },
    { label: '🎾 Mis Clases', img: 'assets/img/Celular/mis-clases.png', desc: 'Historial de sesiones y cupos disponibles en vivo.' },
    { label: '🎥 Videos & IA', img: 'assets/img/Celular/videos-de-entrenamiento.png', desc: 'Análisis de clips y corrección postural con IA.' }
  ];

  showZoomModal = false;
  zoomImage = '';
  zoomTitle = '';

  setCoachTab(index: number): void {
    this.activeCoachTab = index;
  }

  openZoom(img: string, title: string): void {
    this.zoomImage = img;
    this.zoomTitle = title;
    this.showZoomModal = true;
  }

  closeZoom(): void {
    this.showZoomModal = false;
  }

  trainingFeatures = [
    {
      icon: '📋',
      title: 'Pizarra Táctica y Planificación',
      description: 'Diseña ejercicios de pádel, jugadas a balón parado y mallas de entrenamiento personalizadas para cada nivel técnico (iniciación a competición).'
    },
    {
      icon: '👥',
      title: 'Ficha de Alumnos y Asistencia',
      description: 'Registro individual de cada jugador: objetivos, historial de lesiones, notas tácticas y control de asistencia con un solo clic.'
    },
    {
      icon: '💳',
      title: 'Packs de Clases y Cero Morosidad',
      description: 'Vende packs de 4, 8 o 12 clases. Los alumnos agendan automáticamente descontando sus créditos y evitando cobros manuales atrasados.'
    },
    {
      icon: '🤖',
      title: 'Corrección Biomecánica por IA',
      description: 'Sube videos cortos de los golpes de tus alumnos. Nuestra IA analiza la postura, punto de impacto y aceleración para feedback instantáneo.'
    },
    {
      icon: '📊',
      title: 'Radar de Habilidades y Evolución',
      description: 'Gráficos de evolución técnica en saque, volea, bandeja, víbora y globo para que tus alumnos vean su progreso real clase a clase.'
    },
    {
      icon: '📅',
      title: 'Agenda Inteligente de Pistas',
      description: 'Sincroniza tus horarios disponibles y permite que tus alumnos reserven sus clases particulares o grupales sin cruces de pista.'
    }
  ];

  faqs = [
    {
      q: '¿Cómo me ayuda PadelBlox en la gestión de mis entrenamientos diarios?',
      a: 'PadelBlox te permite organizar tus sesiones con pizarra táctica, llevar el registro de asistencia en un clic y automatizar la venta y descuento de packs de clases, liberándote de horas de tareas administrativas.',
      open: false
    },
    {
      q: '¿Puedo usar la aplicación tanto para clases individuales como grupales?',
      a: 'Sí, puedes configurar entrenamientos particulares, en pareja o grupales con cupos limitados y división de pagos.',
      open: false
    },
    {
      q: '¿Mis alumnos tienen acceso a una app para ver sus clases y progreso?',
      a: 'Sí, cada alumno cuenta con su perfil donde puede ver sus clases agendadas, packs activos, notas del entrenador y su radar de habilidades.',
      open: false
    },
    {
      q: '¿Cómo funciona la prueba gratuita para entrenadores?',
      a: 'Tienes 90 días de acceso ilimitado a todas las herramientas de entrenamiento, pizarra táctica e IA sin necesidad de ingresar tarjeta de crédito.',
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
      title: 'Software para Entrenadores de Pádel | Pizarra Táctica, Alumnos y Clases | PadelBlox',
      description: 'La app y software Nº1 para entrenadores de pádel: pizarra táctica interactiva 3D, gestión de alumnos, venta de packs de clases, agenda inteligente y evaluación técnica con IA. Prueba 90 días gratis.',
      keywords: 'entrenadores de padel, software para entrenadores de padel, app entrenadores padel, profesores de padel, gestion de entrenamientos padel, pizarra tactica padel, app coaches padel, evaluacion tecnica padel, clases de padel software, planificacion entrenamientos padel, ejercicios de padel',
      canonicalUrl: 'https://padelblox.cl/gestion-entrenamientos-padel',
      ogTitle: 'Software para Entrenadores de Pádel Nº1 | PadelBlox',
      ogDescription: 'Diseña ejercicios con pizarra táctica, gestiona tus alumnos y automatiza tus cobros con el software líder para entrenadores de pádel.',
      ogImage: 'https://padelblox.cl/assets/img/Celular/progreso-entrenamiento.png',
      schemaJson: [
        {
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          'name': 'PadelBlox - Gestión de Entrenamientos de Pádel',
          'applicationCategory': 'SportsApplication, EducationalApplication',
          'operatingSystem': 'Web, iOS, Android',
          'description': 'Plataforma para entrenadores, monitores y academias de pádel con pizarra táctica, análisis por IA y gestión de alumnos.',
          'url': 'https://padelblox.cl/gestion-entrenamientos-padel',
          'offers': {
            '@type': 'Offer',
            'price': '19990',
            'priceCurrency': 'CLP',
            'description': 'Planes para entrenadores desde $19.990 CLP / mes con 90 días gratis'
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
