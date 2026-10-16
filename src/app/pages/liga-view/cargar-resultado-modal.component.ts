import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LigaService } from '../../services/liga.service';

@Component({
  selector: 'app-cargar-resultado-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cargar-resultado-modal.component.html',
  styleUrls: ['./cargar-resultado-modal.component.scss']
})
export class CargarResultadoModalComponent {
  @Input() partido: any = null;
  @Output() cerrar = new EventEmitter<boolean>();

  set1_p1: number = 0; set1_p2: number = 0;
  set2_p1: number = 0; set2_p2: number = 0;
  set3_p1: number = 0; set3_p2: number = 0;

  esWO: boolean = false;
  parejaWoPerdedoraId: number | null = null;
  loading: boolean = false;
  errorMsj: string = '';

  constructor(private ligaService: LigaService) {}

  ngOnInit(): void {
    if (this.partido) {
      this.set1_p1 = parseInt(this.partido.set1_p1, 10) || 0;
      this.set1_p2 = parseInt(this.partido.set1_p2, 10) || 0;
      this.set2_p1 = parseInt(this.partido.set2_p1, 10) || 0;
      this.set2_p2 = parseInt(this.partido.set2_p2, 10) || 0;
      this.set3_p1 = parseInt(this.partido.set3_p1, 10) || 0;
      this.set3_p2 = parseInt(this.partido.set3_p2, 10) || 0;
      this.esWO = (this.partido.es_wo == 1 || this.partido.es_wo === true || this.partido.es_wo === '1' || this.partido.es_wo === 'true');
      this.parejaWoPerdedoraId = this.partido.pareja_wo_perdedora_id ? parseInt(this.partido.pareja_wo_perdedora_id, 10) : null;
    }
  }

  guardar(): void {
    this.loading = true;
    this.errorMsj = '';

    const payload = {
      partido_id: this.partido.id,
      es_wo: this.esWO,
      pareja_wo_perdedora_id: this.parejaWoPerdedoraId,
      set1_p1: this.set1_p1, set1_p2: this.set1_p2,
      set2_p1: this.set2_p1, set2_p2: this.set2_p2,
      set3_p1: this.set3_p1, set3_p2: this.set3_p2
    };

    this.ligaService.guardarResultado(payload).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success) {
          this.cerrar.emit(true);
        } else {
          this.errorMsj = res.error || 'Error al guardar resultado';
        }
      },
      error: (err) => {
        this.loading = false;
        this.errorMsj = 'Error en el servidor al guardar el resultado';
        console.error(err);
      }
    });
  }

  cancelar(): void {
    this.cerrar.emit(false);
  }
}
