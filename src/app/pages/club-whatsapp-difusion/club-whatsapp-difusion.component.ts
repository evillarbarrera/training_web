import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { ApiService } from '../../services/api.service';
import { PopupService } from '../../services/popup.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-club-whatsapp-difusion',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: './club-whatsapp-difusion.component.html',
  styleUrls: ['./club-whatsapp-difusion.component.scss']
})
export class ClubWhatsappDifusionComponent implements OnInit {
  userId: number | null = null;
  userName: string = '';
  userFoto: string | null = null;
  userRole: 'jugador' | 'entrenador' | 'administrador_club' | 'administrador' | 'staff_club' = 'administrador_club';

  clubes: any[] = [];
  selectedClubId: number | null = null;
  selectedClubNombre: string = 'Mi Club de Pádel';

  selectedDate: string = new Date().toISOString().split('T')[0];
  isLoading: boolean = false;

  // Customization fields
  tituloPersonalizado: string = '🚨 ¡CANCHAS DISPONIBLES!';
  mensajePromocional: string = '⚡ ¡Reserva antes de que se agoten!';
  telefonoContacto: string = '+56969083124';
  linkReservas: string = 'https://padelmanager.cl/#/clubes-reservar';
  
  // Data State
  canchasDisponibles: any[] = [];
  totalSlotsLibres: number = 0;
  mensajeGenerado: string = '';

  // Automated Schedules State
  programaciones: any[] = [];
  nuevaHoraEnvio: string = '09:00';
  nuevoMaxEnvios: number = 0; // 0 = Ilimitado
  nuevoWebhookUrl: string = '';
  isSavingSchedule: boolean = false;

  // Days selector state
  diasSemanaSeleccionados: { [key: string]: boolean } = {
    '1': true, // Lun
    '2': true, // Mar
    '3': true, // Mie
    '4': true, // Jue
    '5': true, // Vie
    '6': true, // Sab
    '0': true  // Dom
  };

  diasNombreMap: { [key: string]: string } = {
    '1': 'Lun',
    '2': 'Mar',
    '3': 'Mié',
    '4': 'Jue',
    '5': 'Vie',
    '6': 'Sáb',
    '0': 'Dom'
  };

  constructor(
    private apiService: ApiService,
    private popupService: PopupService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const profiles = JSON.parse(localStorage.getItem('availableProfiles') || '[]');
    const storedRole = localStorage.getItem('userRole') || '';

    this.userId = currentUser.id;
    this.userName = currentUser.nombre || 'Administrador';
    this.userFoto = currentUser.foto_perfil || null;
    this.userRole = (storedRole || currentUser.rol || 'administrador_club') as any;

    this.clubes = profiles.filter((p: any) => p.club_id && p.club_nombre);

    if (this.clubes.length > 0) {
      this.selectedClubId = this.clubes[0].club_id;
      this.selectedClubNombre = this.clubes[0].club_nombre;
    } else if (currentUser.club_id) {
      this.selectedClubId = currentUser.club_id;
      this.selectedClubNombre = currentUser.club_nombre || 'Mi Club de Pádel';
    }

    if (this.selectedClubId) {
      this.cargarDisponibilidad();
      this.cargarProgramaciones();
    }
  }

  selectClub(club: any): void {
    this.selectedClubId = club.club_id;
    this.selectedClubNombre = club.club_nombre;
    this.cargarDisponibilidad();
    this.cargarProgramaciones();
  }

  seleccionarFechaAcceso(opcion: 'today' | 'tomorrow' | 'weekend'): void {
    const today = new Date();
    if (opcion === 'today') {
      this.selectedDate = today.toISOString().split('T')[0];
    } else if (opcion === 'tomorrow') {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      this.selectedDate = tomorrow.toISOString().split('T')[0];
    } else if (opcion === 'weekend') {
      const saturday = new Date(today);
      const dayOfWeek = today.getDay();
      const distanceToSaturday = (6 - dayOfWeek + 7) % 7 || 7;
      saturday.setDate(today.getDate() + distanceToSaturday);
      this.selectedDate = saturday.toISOString().split('T')[0];
    }
    this.cargarDisponibilidad();
  }

  cargarDisponibilidad(): void {
    if (!this.selectedClubId) return;
    this.isLoading = true;

    this.apiService.get(`clubes/get_disponibilidad.php?club_id=${this.selectedClubId}&fecha=${this.selectedDate}`).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        this.procesarDisponibilidad(res);
      },
      error: (err: any) => {
        this.isLoading = false;
        console.error('Error al obtener disponibilidad', err);
        this.generarMensajeTexto();
      }
    });
  }

  procesarDisponibilidad(res: any): void {
    const mapCanchas: { [key: string]: string[] } = {};
    this.totalSlotsLibres = 0;

    if (res && typeof res === 'object') {
      Object.keys(res).forEach((hora) => {
        const slots = res[hora];
        if (Array.isArray(slots)) {
          slots.forEach((slot: any) => {
            if (slot.disponible) {
              const nombreCancha = slot.cancha_nombre || `Cancha ${slot.cancha_id}`;
              if (!mapCanchas[nombreCancha]) {
                mapCanchas[nombreCancha] = [];
              }
              const horaFormateada = hora.substring(0, 5);
              const finFormateado = slot.hora_fin ? slot.hora_fin.substring(0, 5) : '';
              const rnk = finFormateado ? `${horaFormateada} - ${finFormateado}` : horaFormateada;
              if (!mapCanchas[nombreCancha].includes(rnk)) {
                mapCanchas[nombreCancha].push(rnk);
                this.totalSlotsLibres++;
              }
            }
          });
        }
      });
    }

    this.canchasDisponibles = Object.keys(mapCanchas).map((cancha) => ({
      nombre: cancha,
      horarios: mapCanchas[cancha]
    }));

    this.generarMensajeTexto();
  }

  generarMensajeTexto(): void {
    const fechaObj = new Date(this.selectedDate + 'T00:00:00');
    const opcionesFecha: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    let fechaTxt = fechaObj.toLocaleDateString('es-ES', opcionesFecha);
    fechaTxt = fechaTxt.charAt(0).toUpperCase() + fechaTxt.slice(1);

    let msg = `🎾 *${this.selectedClubNombre.toUpperCase()}*\n`;
    msg += `📅 *Disponibilidad en Vivo:* ${fechaTxt}\n`;
    if (this.tituloPersonalizado) {
      msg += `\n${this.tituloPersonalizado}\n`;
    }

    if (this.canchasDisponibles.length > 0) {
      this.canchasDisponibles.forEach((cancha) => {
        msg += `\n📍 *${cancha.nombre}*\n`;
        cancha.horarios.forEach((h: string) => {
          msg += `• ${h}\n`;
        });
      });
    } else {
      msg += `\n⚠️ *No se encontraron turnos libres para esta fecha.*\n`;
    }

    if (this.mensajePromocional) {
      msg += `\n${this.mensajePromocional}\n`;
    }

    msg += `\n📲 *¡Reserva tu turno antes de que se agoten!*\n`;
    if (this.linkReservas) {
      msg += `👉 ${this.linkReservas}\n`;
    }
    if (this.telefonoContacto) {
      msg += `📞 Contacto: ${this.telefonoContacto}\n`;
    }

    this.mensajeGenerado = msg;
  }

  // --- AUTOMATED SCHEDULES MANAGEMENT ---
  cargarProgramaciones(): void {
    if (!this.selectedClubId) return;
    this.apiService.get(`clubes/get_whatsapp_schedules.php?club_id=${this.selectedClubId}`).subscribe({
      next: (res: any) => {
        if (res && res.success) {
          this.programaciones = res.programaciones || [];
        }
      },
      error: (err: any) => console.error('Error cargando programaciones', err)
    });
  }

  getDiasSeleccionadosString(): string {
    const selectedKeys = Object.keys(this.diasSemanaSeleccionados).filter(k => this.diasSemanaSeleccionados[k]);
    return selectedKeys.join(',');
  }

  toggleDiaSemana(diaKey: string): void {
    this.diasSemanaSeleccionados[diaKey] = !this.diasSemanaSeleccionados[diaKey];
  }

  agregarProgramacion(): void {
    if (!this.selectedClubId || !this.nuevaHoraEnvio) {
      this.popupService.error('Campo requerido', 'Por favor selecciona la hora de envío.');
      return;
    }

    this.isSavingSchedule = true;
    const payload = {
      club_id: this.selectedClubId,
      hora_envio: this.nuevaHoraEnvio,
      dias_semana: this.getDiasSeleccionadosString(),
      max_envios: Number(this.nuevoMaxEnvios) || 0,
      titulo_custom: this.tituloPersonalizado,
      promo_custom: this.mensajePromocional,
      telefono_contacto: this.telefonoContacto,
      webhook_url: this.nuevoWebhookUrl,
      activo: true
    };

    this.apiService.post('clubes/save_whatsapp_schedule.php', payload).subscribe({
      next: (res: any) => {
        this.isSavingSchedule = false;
        if (res && res.success) {
          const limitTxt = payload.max_envios > 0 ? `Límite: ${payload.max_envios} envíos` : 'Envío automático ilimitado';
          this.popupService.success('Programación Añadida', `Horario ${this.nuevaHoraEnvio} registrado con éxito (${limitTxt}).`);
          this.cargarProgramaciones();
        }
      },
      error: (err: any) => {
        this.isSavingSchedule = false;
        this.popupService.error('Error', 'No se pudo guardar la programación.');
      }
    });
  }

  toggleEstadoProgramacion(item: any): void {
    const payload = {
      id: item.id,
      club_id: this.selectedClubId,
      hora_envio: item.hora_envio,
      dias_semana: item.dias_semana,
      max_envios: item.max_envios,
      titulo_custom: item.titulo_custom,
      promo_custom: item.promo_custom,
      telefono_contacto: item.telefono_contacto,
      webhook_url: item.webhook_url,
      activo: !item.activo
    };

    this.apiService.post('clubes/save_whatsapp_schedule.php', payload).subscribe({
      next: (res: any) => {
        if (res && res.success) {
          item.activo = !item.activo;
        }
      }
    });
  }

  eliminarProgramacion(item: any): void {
    this.apiService.post('clubes/delete_whatsapp_schedule.php', { id: item.id, club_id: this.selectedClubId }).subscribe({
      next: (res: any) => {
        if (res && res.success) {
          this.popupService.success('Eliminado', 'Programación eliminada.');
          this.cargarProgramaciones();
        }
      }
    });
  }

  copiarMensaje(): void {
    navigator.clipboard.writeText(this.mensajeGenerado).then(() => {
      this.popupService.success('¡Copiado!', 'El mensaje ha sido copiado al portapapeles listo para pegar en tu grupo de WhatsApp.');
    }).catch(() => {
      this.popupService.error('Error', 'No se pudo copiar el mensaje automáticamente.');
    });
  }

  abrirWhatsAppWeb(): void {
    const encoded = encodeURIComponent(this.mensajeGenerado);
    const url = `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(url, '_blank');
  }
}
