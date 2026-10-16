import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LigaService } from '../../services/liga.service';

@Component({
  selector: 'app-programar-partido-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './programar-partido-modal.component.html',
  styleUrls: ['./programar-partido-modal.component.scss']
})
export class ProgramarPartidoModalComponent implements OnInit {
  @Input() partido: any = null;
  @Input() canchas: any[] = [];
  @Output() cerrar = new EventEmitter<boolean>();

  canchaId: number | null = null;
  fechaHora: string = '';
  duracionMinutos: number = 90;
  loading: boolean = false;
  errorMsj: string = '';

  constructor(private ligaService: LigaService) {}

  ngOnInit(): void {
    if (this.partido) {
      this.canchaId = this.partido.cancha_id ? Number(this.partido.cancha_id) : null;
      if (this.partido.fecha_hora && !this.partido.fecha_hora.startsWith('0000')) {
        // Format for datetime-local input YYYY-MM-DDTHH:mm
        this.fechaHora = this.partido.fecha_hora.replace(' ', 'T').substring(0, 16);
      }
    }
  }

  get tieneProgramacionPrevia(): boolean {
    return !!(this.partido && (this.partido.cancha_id || (this.partido.fecha_hora && !this.partido.fecha_hora.startsWith('0000'))));
  }

  limpiarFecha(): void {
    this.fechaHora = '';
  }

  limpiarCancha(): void {
    this.canchaId = null;
  }

  desprogramar(): void {
    if (!this.partido?.id) return;

    this.loading = true;
    this.errorMsj = '';

    this.ligaService.programarPartido(this.partido.id, null, null).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success) {
          this.cerrar.emit(true);
        } else {
          this.errorMsj = res.error || 'Error al desprogramar partido';
        }
      },
      error: (err) => {
        this.loading = false;
        this.errorMsj = 'Error de conexión al desprogramar partido';
        console.error(err);
      }
    });
  }

  guardar(): void {
    if (!this.partido?.id) return;

    this.loading = true;
    this.errorMsj = '';

    const formattedFechaHora = this.fechaHora ? this.fechaHora.replace('T', ' ') + ':00' : null;
    const finalCanchaId = this.canchaId ? Number(this.canchaId) : null;

    this.ligaService.programarPartido(this.partido.id, finalCanchaId, formattedFechaHora, this.duracionMinutos).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success) {
          this.cerrar.emit(true);
        } else {
          this.errorMsj = res.error || 'Error al programar partido';
        }
      },
      error: (err) => {
        this.loading = false;
        this.errorMsj = 'Error de conexión al programar partido';
        console.error(err);
      }
    });
  }

  cancelar(): void {
    this.cerrar.emit(false);
  }
}
