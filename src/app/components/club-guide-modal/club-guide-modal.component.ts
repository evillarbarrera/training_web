import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

export interface GuideMenuItem {
  id: string;
  title: string;
  icon: string;
  category: 'Principal' | 'Gestión Club' | 'Caja y Finanzas' | 'Competición' | 'Configuración' | 'Pantallas';
  route: string;
  badge?: string;
  summary: string;
  description: string;
  tips?: string[];
  keywords: string[];
}

export interface OnboardingStep {
  id: number;
  title: string;
  subtitle: string;
  icon: string;
  route: string;
  doneKey: string;
  actionText: string;
}

@Component({
  selector: 'app-club-guide-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './club-guide-modal.component.html',
  styleUrls: ['./club-guide-modal.component.scss']
})
export class ClubGuideModalComponent implements OnInit {
  @Input() isOpen: boolean = false;
  @Output() close = new EventEmitter<void>();

  activeTab: 'pasos' | 'menus' | 'faq' = 'pasos';
  searchTerm: string = '';
  selectedCategory: string = 'all';
  dontShowAgain: boolean = false;

  onboardingSteps: OnboardingStep[] = [
    {
      id: 1,
      title: '1. Configura tu Sede y Pistas',
      subtitle: 'Ingresa nombre, dirección, logo y da de alta tus canchas con sus precios (horario alto y bajo).',
      icon: '🏢',
      route: '/admin-club',
      doneKey: 'step_club_configured',
      actionText: 'Ir a Mis Clubes'
    },
    {
      id: 2,
      title: '2. Carga Productos e Inventario',
      subtitle: 'Registra tus tarros de pelotas, bebidas o arriendos para agregarlos fácilmente en recepción.',
      icon: '📦',
      route: '/club-inventario',
      doneKey: 'step_inventory_configured',
      actionText: 'Ir a Inventario'
    },
    {
      id: 3,
      title: '3. Realiza tu Primera Reserva',
      subtitle: 'Conoce la cuadrícula horaria. Haz clic en una pista para agendar y cobrar en modo total o proporcional.',
      icon: '📅',
      route: '/club-reservas',
      doneKey: 'step_reservation_done',
      actionText: 'Ver Grilla de Reservas'
    },
    {
      id: 4,
      title: '4. Conecta tu Smart TV en Recepción',
      subtitle: 'Proyecta la cartelera de turnos, precios de cafetería y marcador en vivo sin cables adicionales.',
      icon: '📺',
      route: '/tv',
      doneKey: 'step_tv_tested',
      actionText: 'Explorar Modo TV'
    }
  ];

  stepStatus: { [key: string]: boolean } = {};

  menuItems: GuideMenuItem[] = [
    {
      id: 'club-home',
      title: 'Dashboard General',
      icon: '📊',
      category: 'Principal',
      route: '/club-home',
      summary: 'Resumen ejecutivo y métricas de ocupación en tiempo real.',
      description: 'Panel de inicio con el pulso operativo de tu club: ocupación porcentual de canchas del día, ingresos estimados, próximas reservas y actividad deportiva.',
      tips: ['Ideal para consultar a primera hora de la mañana y al cierre del día.'],
      keywords: ['dashboard', 'inicio', 'métricas', 'resumen', 'ocupacion', 'ingresos']
    },
    {
      id: 'admin-club',
      title: 'Mis Clubes & Pistas',
      icon: '🏢',
      category: 'Gestión Club',
      route: '/admin-club',
      badge: 'Básico',
      summary: 'Configuración de sedes, canchas, iluminación y tarifas horarias.',
      description: 'El núcleo de tu club: registra tus canchas (panorámicas, muro o cubiertas), configura tramos de horarios (valle y punta/alto) y define los precios para turnos de 60, 90 o 120 minutos.',
      tips: [
        'Puedes definir si una pista tiene iluminación LED para aplicar recargos nocturnos.',
        'Si tienes varias sedes, puedes administrarlas todas desde este mismo panel.'
      ],
      keywords: ['canchas', 'pistas', 'sede', 'clubes', 'precios', 'tarifas', 'horarios', 'panoramica', 'muro']
    },
    {
      id: 'club-reservas',
      title: 'Reservas Club (Calendario)',
      icon: '📅',
      category: 'Gestión Club',
      route: '/club-reservas',
      badge: 'Principal',
      summary: 'Grilla de turnos interactiva con drag & drop y cobro por jugador.',
      description: 'La herramienta diaria del recepcionista: visualiza la disponibilidad de todas las pistas por hora. Permite arrastrar reservas para moverlas de horario o pista, dividir cobro entre los 4 jugadores, agregar tarro de pelotas y bloquear canchas por lluvia o mantenimiento.',
      tips: [
        'Todas las reservas normales inician como "DEBE" (No Pagada) hasta que se confirma el pago en caja.',
        'Puedes dividir en 4 partes iguales con el botón "Proporcional" y marcar quién ya pagó.'
      ],
      keywords: ['reservas', 'calendario', 'agenda', 'turnos', 'canchas', 'bloqueo', 'pelotas', 'cobro', 'debe', 'pagado']
    },
    {
      id: 'club-turnos',
      title: 'Turnos Club & Caja',
      icon: '👥',
      category: 'Gestión Club',
      route: '/club-turnos',
      summary: 'Apertura y cierre de turnos de recepcionistas y staff.',
      description: 'Control de asistencia y flujo de caja por recepcionista. Registra la apertura de caja matutina, monitorea cobranzas durante el día y concilia montos al momento del relevo.',
      tips: ['Permite auditar diferencias entre efectivo reportado y ventas registradas en el sistema.'],
      keywords: ['turnos', 'caja', 'staff', 'recepcionistas', 'relevo', 'cuadre', 'efectivo']
    },
    {
      id: 'matchmaking',
      title: 'Matchmaking & Partidos',
      icon: '⚡',
      category: 'Gestión Club',
      route: '/matchmaking',
      summary: 'Emparejamiento de jugadores por nivel para llenar horarios valle.',
      description: 'Herramienta de dinamización comunitaria: permite a jugadores que no tienen los 4 integrantes publicar o sumarse a partidos abiertos clasificados por categoría (ej. 4ta o 5ta), asegurando partidos competitivos y canchas llenas.',
      tips: ['Actívalo en horarios de baja demanda para aumentar tus reservas sin esfuerzo comercial.'],
      keywords: ['matchmaking', 'partidos', 'niveles', 'jugadores', 'abiertos', 'comunidad', 'emparejamiento']
    },
    {
      id: 'club-ventas',
      title: 'Ventas & Caja POS',
      icon: '💰',
      category: 'Caja y Finanzas',
      route: '/club-ventas',
      summary: 'Punto de venta para reservas, cafetería y accesorios.',
      description: 'Cobra reservas y consumos de cafetería (bebidas, snacks, pelotas, grips, palas) con Efectivo, Débito, Crédito o Transferencia Bancaria, sincronizando el stock al instante.',
      tips: ['Permite emitir comprobantes de venta y registrar ventas rápidas sin reserva previa.'],
      keywords: ['ventas', 'pos', 'caja', 'cobrar', 'tarjeta', 'efectivo', 'bebidas', 'cafeteria', 'tienda']
    },
    {
      id: 'club-reportes',
      title: 'Reportes & Estadísticas',
      icon: '📈',
      category: 'Caja y Finanzas',
      route: '/club-reportes',
      summary: 'Análisis financiero y métricas de rendimiento por pista.',
      description: 'Descubre qué días y franjas horarias generan mayor rentabilidad, qué pistas son las más solicitadas, quiénes son tus clientes más fieles y exporta reportes detallados para contabilidad.',
      tips: ['Utiliza los filtros de fecha para comparar la facturación mensual o semanal.'],
      keywords: ['reportes', 'estadisticas', 'graficos', 'finanzas', 'rentabilidad', 'horas punta', 'metricas']
    },
    {
      id: 'tv-mode',
      title: 'Padelblox TV (Smart TV)',
      icon: '📺',
      category: 'Pantallas',
      route: '/tv',
      badge: 'Visual',
      summary: 'Pantalla en vivo para la cafetería o recepción del club.',
      description: 'Modo visual optimizado para Smart TVs: proyecta automáticamente las pistas asignadas, próximos turnos, ranking por categoría, precios de cafetería y publicidad de tus sponsors sin tocar el control remoto.',
      tips: [
        'Abre el navegador web de tu Smart TV, ingresa la dirección de tu club y pulsa F11 para pantalla completa.',
        'Se actualiza solo cada pocos segundos para mostrar quién juega en cada pista.'
      ],
      keywords: ['tv', 'pantalla', 'smart tv', 'cartelera', 'cafeteria', 'recepcion', 'sponsors', 'publicidad']
    },
    {
      id: 'crear-americano',
      title: 'Torneos Americanos',
      icon: '🎾',
      category: 'Competición',
      route: '/crear-americano',
      badge: 'Rápido',
      summary: 'Torneos express de 2 a 3 horas con rotación y podio animado.',
      description: 'Organiza torneos de fin de semana en minutos: selecciona canchas, define duración de partidos (ej. 20 min) y el sistema genera el fixture automático, rota parejas o grupos, calcula tabla de posiciones y revela el podio con efectos especiales.',
      tips: [
        'Las canchas quedan reservadas automáticamente durante el horario del torneo.',
        'Al cerrar el torneo, los puntos ganados se transfieren directo al Ranking del club.'
      ],
      keywords: ['americano', 'torneo express', 'fixture', 'parejas', 'podio', 'rotacion', 'puntos']
    },
    {
      id: 'ligas',
      title: 'Ligas de Pádel',
      icon: '🏆',
      category: 'Competición',
      route: '/ligas',
      summary: 'Competiciones por fechas, fixture semanal y tabla de posiciones.',
      description: 'Crea temporadas de ligas por divisiones (1ra a 6ta categoría). Inscribe parejas, genera jornadas semanales con asignación de canchas automática, registra resultados de sets y publica la clasificación.',
      tips: [
        'IMPORTANTE: Las reservas generadas para partidos de liga aparecen automáticamente como "PAGADO", ya que los jugadores abonan la cuota completa de inscripción a la liga.'
      ],
      keywords: ['ligas', 'temporada', 'campeonato', 'fechas', 'jornadas', 'tabla', 'posiciones', 'clasificacion']
    },
    {
      id: 'ranking',
      title: 'Ranking por Categoría',
      icon: '📈',
      category: 'Competición',
      route: '/ranking',
      summary: 'Clasificación oficial de jugadores acumulada de tu club.',
      description: 'Fideliza y genera comunidad: cada punto ganado por un jugador en americanos o ligas suma para la tabla general de su categoría. Filtra por categorías y sedes activas.',
      tips: ['Ideal para proyectar en Padelblox TV y motivar a los jugadores a competir más seguido.'],
      keywords: ['ranking', 'clasificacion', 'puntos', 'posiciones', 'jugadores', 'mejores', 'campeones']
    },
    {
      id: 'club-inventario',
      title: 'Inventario & Cafetería',
      icon: '📦',
      category: 'Configuración',
      route: '/club-inventario',
      summary: 'Control de stock y precios de bebidas, pelotas y palas.',
      description: 'Catálogo de productos de cafetería y tienda: establece stock mínimo, costo de compra y precio de venta. Descuenta unidades automáticamente cuando se agregan a reservas o se venden en POS.',
      tips: ['Activa alertas para saber cuándo reponer tarros de pelotas o bebidas isotónicas.'],
      keywords: ['inventario', 'stock', 'productos', 'cafeteria', 'pelotas', 'bebidas', 'costos', 'precios']
    },
    {
      id: 'club-categorias',
      title: 'Categorías & Niveles',
      icon: '🏷️',
      category: 'Configuración',
      route: '/club-categorias',
      summary: 'Gestión de categorías deportivas del club.',
      description: 'Estandariza los niveles de juego de tus socios y visitantes (1ra, 2da, 3ra, 4ta, 5ta, 6ta e Iniciación) para que el matchmaking y los torneos sean siempre justos.',
      tips: ['Facilita clasificar a nuevos jugadores que se registran en tu club.'],
      keywords: ['categorias', 'niveles', 'cuarta', 'quinta', 'sexta', 'primera', 'iniciacion']
    },
    {
      id: 'mi-plan',
      title: 'Suscripción & Plan',
      icon: '💎',
      category: 'Configuración',
      route: '/mi-plan',
      summary: 'Gestión de tu membresía Padelblox y canales de soporte.',
      description: 'Revisa tu plan actual, límite de canchas habilitadas, módulos contratados y canales de atención técnica prioritaria para el club.',
      tips: ['Puedes solicitar canchas adicionales a medida que tu club se expande.'],
      keywords: ['plan', 'suscripcion', 'pago', 'canchas', 'membresia', 'soporte']
    }
  ];

  faqs = [
    {
      q: '¿Por qué las reservas de cancha parten como "DEBE" (No Pagada)?',
      a: 'Por diseño operativo: la gran mayoría de los arriendos se cobran presencialmente cuando los jugadores llegan al club o deciden dividir la cuenta proporcionalmente entre los 4. En la grilla de reservas podrás marcar "PAGADO" en 1 clic cuando recibas el dinero.'
    },
    {
      q: '¿Por qué los partidos de Liga aparecen marcados como "PAGADO"?',
      a: 'Porque en el formato de ligas, las parejas ya cancelaron la cuota de inscripción del torneo, la cual cubre el arriendo de la cancha para sus partidos oficiales. Por ello, el sistema las protege y no genera duplicidad de cobro.'
    },
    {
      q: '¿Cómo proyecto Padelblox TV en el televisor de la cafetería?',
      a: 'No necesitas ningún aparato especial ni cables largos. Solo abre el navegador web de cualquier Smart TV (o dispositivo Android TV / Chromecast), ingresa a tu enlace de TV y presiona el botón de pantalla completa. La pantalla se actualizará sola en vivo.'
    },
    {
      q: '¿Cómo divido el pago de una cancha entre 4 jugadores?',
      a: 'Al abrir o editar una reserva, selecciona "Método de Pago: Proporcional". El sistema dividirá el valor total en 4 partes iguales y te mostrará un botón de PAGADO/DEBE junto al nombre de cada jugador para llevar el control individual exacto.'
    },
    {
      q: '¿Cómo agrego un tarro de pelotas o bebidas a una reserva?',
      a: 'En el modal de reserva dispones del botón "+ Agregar Pelotas" o el carrito de compra en cada jugador. Puedes dividir el tarro de pelotas entre los 4 jugadores o cargarlo al jugador titular.'
    }
  ];

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.dontShowAgain = localStorage.getItem('padelblox_club_guide_seen') === 'true';
    this.loadStepStatus();
  }

  toggleDontShowAgain(): void {
    if (this.dontShowAgain) {
      localStorage.setItem('padelblox_club_guide_seen', 'true');
    } else {
      localStorage.removeItem('padelblox_club_guide_seen');
    }
  }

  loadStepStatus(): void {
    const raw = localStorage.getItem('padelblox_onboarding_progress');
    if (raw) {
      try {
        this.stepStatus = JSON.parse(raw);
      } catch (e) {
        this.stepStatus = {};
      }
    }
  }

  toggleStep(doneKey: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.stepStatus[doneKey] = !this.stepStatus[doneKey];
    localStorage.setItem('padelblox_onboarding_progress', JSON.stringify(this.stepStatus));
  }

  get completedStepsCount(): number {
    return this.onboardingSteps.filter(s => this.stepStatus[s.doneKey]).length;
  }

  get filteredMenus(): GuideMenuItem[] {
    let list = this.menuItems;

    if (this.selectedCategory !== 'all') {
      list = list.filter(m => m.category === this.selectedCategory);
    }

    if (this.searchTerm && this.searchTerm.trim()) {
      const q = this.searchTerm.toLowerCase().trim();
      list = list.filter(m =>
        m.title.toLowerCase().includes(q) ||
        m.summary.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.keywords.some(k => k.includes(q))
      );
    }

    return list;
  }

  goToMenu(route: string): void {
    this.closeModal();
    if (route === '/tv') {
      const storedClubId = localStorage.getItem('selectedClubId') || '1';
      window.open(`/#/tv/${storedClubId}`, '_blank');
    } else {
      this.router.navigate([route]);
    }
  }

  closeModal(): void {
    if (this.dontShowAgain) {
      localStorage.setItem('padelblox_club_guide_seen', 'true');
    }
    this.close.emit();
  }

  markAllAsSeen(): void {
    this.dontShowAgain = true;
    localStorage.setItem('padelblox_club_guide_seen', 'true');
    this.close.emit();
  }
}
