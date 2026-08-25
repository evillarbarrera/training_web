import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LigaService, Liga } from '../../services/liga.service';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-ligas-list',
  standalone: true,
  imports: [CommonModule, SidebarComponent],
  templateUrl: './ligas-list.component.html',
  styleUrls: ['./ligas-list.component.scss']
})
export class LigasListComponent implements OnInit {
  userId: number = 0;
  userRole: 'jugador' | 'entrenador' | 'administrador_club' | 'administrador' | 'staff_club' = 'administrador_club';
  userName: string = '';

  ligas: Liga[] = [];
  filtroEstado: 'activas' | 'historicas' = 'activas';
  loading: boolean = true;
  errorMsj: string = '';

  constructor(private ligaService: LigaService, private router: Router) {}

  ngOnInit(): void {
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
      const u = JSON.parse(userStr);
      this.userId = u.id;
      this.userRole = u.rol || 'administrador_club';
      this.userName = `${u.nombre || ''} ${u.apellido || ''}`;
    }

    this.cargarLigas();
  }

  cargarLigas(): void {
    this.loading = true;
    this.ligaService.obtenerLigas(undefined, this.filtroEstado).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success) {
          this.ligas = res.ligas || [];
        } else {
          this.errorMsj = res.error || 'Error al cargar ligas';
        }
      },
      error: (err) => {
        this.loading = false;
        this.errorMsj = 'Error de conexión al cargar ligas';
        console.error(err);
      }
    });
  }

  cambiarFiltro(estado: 'activas' | 'historicas'): void {
    this.filtroEstado = estado;
    this.cargarLigas();
  }

  crearLiga(): void {
    this.router.navigate(['/liga-config']);
  }

  editarLiga(id: number | undefined, event: Event): void {
    event.stopPropagation();
    if (id) {
      this.router.navigate(['/liga-config', id]);
    }
  }

  eliminarLiga(liga: Liga, event: Event): void {
    event.stopPropagation();
    const ligaId = liga.id;
    if (!ligaId) return;

    Swal.fire({
      title: '¿Eliminar Liga?',
      html: `¿Estás seguro de que deseas eliminar la liga <strong>"${liga.nombre}"</strong>?<br><br><small style="color: #ef4444;">Se eliminarán permanentemente todos sus partidos, tablas y parejas. Esta acción no se puede deshacer.</small>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Sí, eliminar liga',
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        this.ligaService.eliminarLiga(ligaId).subscribe({
          next: (res) => {
            if (res.success) {
              Swal.fire({
                title: '¡Eliminada!',
                text: 'La liga ha sido eliminada correctamente.',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
              });
              this.cargarLigas();
            } else {
              Swal.fire('Error', res.error || 'Error al eliminar la liga', 'error');
            }
          },
          error: (err) => {
            console.error(err);
            Swal.fire('Error', 'Error de servidor al eliminar la liga', 'error');
          }
        });
      }
    });
  }

  verLiga(id: number | undefined): void {
    if (id) {
      this.router.navigate(['/liga', id]);
    }
  }
}
