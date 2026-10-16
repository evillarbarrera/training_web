import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LigaService, Liga } from '../../services/liga.service';
import { ClubesService } from '../../services/clubes.service';
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

  clubes: any[] = [];
  selectedClubId: number = 0;
  selectedClubNombre: string = '';

  ligas: Liga[] = [];
  filtroEstado: 'activas' | 'historicas' = 'activas';
  loading: boolean = true;
  errorMsj: string = '';

  constructor(
    private ligaService: LigaService, 
    private clubesService: ClubesService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
      const u = JSON.parse(userStr);
      this.userId = u.id;
      this.userRole = u.rol || 'administrador_club';
      this.userName = `${u.nombre || ''} ${u.apellido || ''}`;
      if (u.club_id) {
        this.selectedClubId = Number(u.club_id);
      }
    }

    const storedClubId = localStorage.getItem('selectedClubId');
    if (storedClubId && storedClubId !== 'undefined' && storedClubId !== 'null') {
      this.selectedClubId = Number(storedClubId);
    }

    this.cargarClubesYDatos();
  }

  cargarClubesYDatos(): void {
    if (this.userId) {
      this.clubesService.getClubes(this.userId).subscribe({
        next: (clubes) => {
          this.clubes = clubes || [];
          if (this.clubes.length > 0) {
            const matched = this.clubes.find(c => Number(c.id) === Number(this.selectedClubId));
            const activeClub = matched || this.clubes[0];
            this.selectedClubId = Number(activeClub.id);
            this.selectedClubNombre = activeClub.nombre;
            localStorage.setItem('selectedClubId', String(this.selectedClubId));
          }
          this.cargarLigas();
        },
        error: (err) => {
          console.error('Error cargando clubes:', err);
          this.cargarLigas();
        }
      });
    } else {
      this.cargarLigas();
    }
  }

  onClubChange(clubId: number): void {
    this.selectedClubId = Number(clubId);
    const matched = this.clubes.find(c => Number(c.id) === Number(this.selectedClubId));
    if (matched) {
      this.selectedClubNombre = matched.nombre;
    }
    localStorage.setItem('selectedClubId', String(this.selectedClubId));
    this.cargarLigas();
  }

  cargarLigas(): void {
    this.loading = true;
    this.errorMsj = '';
    const clubFilter = this.selectedClubId > 0 ? this.selectedClubId : undefined;
    this.ligaService.obtenerLigas(clubFilter, this.filtroEstado, false, this.userId || undefined).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success) {
          let list = res.ligas || [];
          // Filtrado estricto: Solo ligas asociadas a la sede activa
          if (this.selectedClubId > 0) {
            list = list.filter((l: any) => Number(l.club_id) === Number(this.selectedClubId));
          } else if (this.clubes.length > 0) {
            const allowedClubIds = new Set(this.clubes.map(c => Number(c.id)));
            list = list.filter((l: any) => allowedClubIds.has(Number(l.club_id)));
          }
          this.ligas = list;
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

  formatPrecio(precio: any): string {
    if (precio === null || precio === undefined || precio === '' || precio === 0 || precio === '0' || precio === '0.00' || precio === 0.00) {
      return 'Por definir';
    }
    let val = typeof precio === 'number' ? precio : parseFloat(String(precio).replace(/[^0-9.]/g, ''));
    if (isNaN(val) || val <= 0) {
      return 'Por definir';
    }
    if (val > 0 && val < 1000) {
      val = val * 1000;
    }
    return '$' + Math.round(val).toLocaleString('es-CL');
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
