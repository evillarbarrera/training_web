import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CoachPublicService } from '../../services/coach-public.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-resena-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './resena-modal.component.html',
  styleUrls: ['./resena-modal.component.scss']
})
export class ResenaModalComponent {
  @Input() entrenadorId!: number;
  @Input() entrenadorNombre: string = 'tu entrenador';
  @Input() initialRating: number = 5;
  @Input() initialComentario: string = '';

  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  rating: number = 5;
  hoverRating: number = 0;
  comentario: string = '';
  isSaving: boolean = false;

  ngOnInit() {
    this.rating = this.initialRating || 5;
    this.comentario = this.initialComentario || '';
  }

  constructor(private coachService: CoachPublicService) {}

  setRating(val: number) {
    this.rating = val;
  }

  submitResena() {
    if (!this.rating || this.rating < 1) {
      Swal.fire('Atención', 'Por favor selecciona una calificación con estrellas', 'warning');
      return;
    }
    if (!this.comentario || this.comentario.trim().length < 10) {
      Swal.fire('Comentario breve', 'Por favor cuéntanos un poco más sobre tu experiencia (al menos 10 caracteres)', 'warning');
      return;
    }

    this.isSaving = true;
    this.coachService.saveResena(this.entrenadorId, this.rating, this.comentario.trim()).subscribe({
      next: (res) => {
        this.isSaving = false;
        Swal.fire('¡Muchas Gracias!', res.message || 'Tu reseña ha sido guardada con éxito', 'success');
        this.saved.emit();
        this.close.emit();
      },
      error: (err) => {
        this.isSaving = false;
        Swal.fire('No fue posible guardar', err.error?.message || 'Ocurrió un error al guardar tu reseña', 'error');
      }
    });
  }
}
