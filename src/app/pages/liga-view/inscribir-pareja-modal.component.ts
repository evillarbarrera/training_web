import { Component, Input, Output, EventEmitter, OnInit, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LigaService } from '../../services/liga.service';

@Component({
  selector: 'app-inscribir-pareja-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inscribir-pareja-modal.component.html',
  styleUrls: ['./inscribir-pareja-modal.component.scss']
})
export class InscribirParejaModalComponent implements OnInit {
  @Input() categoriaId: number = 0;
  @Input() categoriaNombre: string = '';
  @Input() parejaToEdit: any = null;
  @Output() cerrar = new EventEmitter<boolean>();

  jugadores: any[] = [];

  // Jugador 1
  j1Nombre: string = '';
  j1Id: number | null = null;
  filteredJugadoresJ1: any[] = [];
  showDropJ1: boolean = false;

  // Jugador 2
  j2Nombre: string = '';
  j2Id: number | null = null;
  filteredJugadoresJ2: any[] = [];
  showDropJ2: boolean = false;

  nombrePareja: string = '';
  loading: boolean = false;
  errorMsj: string = '';

  diasSemana: string[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  restricciones: { dia: string; hora_inicio: string; hora_fin: string }[] = [];

  agregarRestriccion(): void {
    if (this.restricciones.length < 2) {
      this.restricciones.push({ dia: 'Lunes', hora_inicio: '18:00', hora_fin: '20:00' });
    }
  }

  eliminarRestriccion(index: number): void {
    this.restricciones.splice(index, 1);
  }

  constructor(private ligaService: LigaService, private eRef: ElementRef) {}

  ngOnInit(): void {
    if (this.parejaToEdit) {
      this.j1Id = this.parejaToEdit.jugador1_id || null;
      this.j1Nombre = this.parejaToEdit.p1_nom ? `${this.parejaToEdit.p1_nom} ${this.parejaToEdit.p1_ape}`.trim() : (this.parejaToEdit.nombre_externo1 || '');
      this.j2Id = this.parejaToEdit.jugador2_id || null;
      this.j2Nombre = this.parejaToEdit.p2_nom ? `${this.parejaToEdit.p2_nom} ${this.parejaToEdit.p2_ape}`.trim() : (this.parejaToEdit.nombre_externo2 || '');
      this.nombrePareja = this.parejaToEdit.nombre_pareja || '';
      if (this.parejaToEdit.restricciones_horarias_json) {
        try {
          const resArr = typeof this.parejaToEdit.restricciones_horarias_json === 'string' ? JSON.parse(this.parejaToEdit.restricciones_horarias_json) : this.parejaToEdit.restricciones_horarias_json;
          if (Array.isArray(resArr)) {
            this.restricciones = resArr;
          }
        } catch (e) {
          console.error(e);
        }
      }
    }
    this.cargarJugadores();
  }

  cargarJugadores(): void {
    this.ligaService.buscarJugadores('').subscribe({
      next: (res) => {
        this.jugadores = Array.isArray(res) ? res : (res.users || res.data || []);
        this.filterJ1();
        this.filterJ2();
      },
      error: (err) => console.error(err)
    });
  }

  onInputJ1(): void {
    this.j1Id = null;
    this.filterJ1();
    this.showDropJ1 = true;
  }

  filterJ1(): void {
    const q = this.j1Nombre.toLowerCase().trim();
    if (!q) {
      this.filteredJugadoresJ1 = this.jugadores.slice(0, 8);
    } else {
      this.filteredJugadoresJ1 = this.jugadores.filter(j => {
        const full = `${j.nombre || ''} ${j.apellido || ''} ${j.usuario || ''} ${j.email || ''}`.toLowerCase();
        return full.includes(q);
      }).slice(0, 8);
    }
  }

  selectJ1(user: any): void {
    this.j1Id = user.id;
    this.j1Nombre = `${user.nombre || ''} ${user.apellido || ''}`.trim() || user.usuario || user.email;
    this.showDropJ1 = false;
  }

  onInputJ2(): void {
    this.j2Id = null;
    this.filterJ2();
    this.showDropJ2 = true;
  }

  filterJ2(): void {
    const q = this.j2Nombre.toLowerCase().trim();
    if (!q) {
      this.filteredJugadoresJ2 = this.jugadores.slice(0, 8);
    } else {
      this.filteredJugadoresJ2 = this.jugadores.filter(j => {
        const full = `${j.nombre || ''} ${j.apellido || ''} ${j.usuario || ''} ${j.email || ''}`.toLowerCase();
        return full.includes(q);
      }).slice(0, 8);
    }
  }

  selectJ2(user: any): void {
    this.j2Id = user.id;
    this.j2Nombre = `${user.nombre || ''} ${user.apellido || ''}`.trim() || user.usuario || user.email;
    this.showDropJ2 = false;
  }

  @HostListener('document:click', ['$event'])
  clickOutside(event: Event) {
    if (!this.eRef.nativeElement.contains(event.target)) {
      this.showDropJ1 = false;
      this.showDropJ2 = false;
    }
  }

  guardar(): void {
    const nom1 = this.j1Nombre.trim();
    const nom2 = this.j2Nombre.trim();

    if (!this.j1Id && !nom1) {
      this.errorMsj = 'Debes ingresar el nombre o seleccionar al Jugador 1';
      return;
    }

    if (!this.j2Id && !nom2) {
      this.errorMsj = 'Debes ingresar el nombre o seleccionar al Jugador 2';
      return;
    }

    if (this.j1Id && this.j2Id && this.j1Id === this.j2Id) {
      this.errorMsj = 'Los dos jugadores no pueden ser el mismo usuario registrado';
      return;
    }

    this.loading = true;
    this.errorMsj = '';

    this.ligaService.inscribirPareja(
      this.categoriaId,
      this.j1Id,
      this.j2Id,
      this.nombrePareja,
      !this.j1Id ? nom1 : undefined,
      !this.j2Id ? nom2 : undefined,
      this.restricciones.length > 0 ? this.restricciones : undefined,
      this.parejaToEdit?.id
    ).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success) {
          this.cerrar.emit(true);
        } else {
          this.errorMsj = res.error || 'Error al inscribir pareja';
        }
      },
      error: (err) => {
        this.loading = false;
        this.errorMsj = 'Error de conexión al guardar la pareja';
        console.error(err);
      }
    });
  }

  cancelar(): void {
    this.cerrar.emit(false);
  }
}
