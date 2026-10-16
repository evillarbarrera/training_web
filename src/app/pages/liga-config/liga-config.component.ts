import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { LigaService, ReglasPuntos, CategoriaConfig } from '../../services/liga.service';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';

@Component({
  selector: 'app-liga-config',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: './liga-config.component.html',
  styleUrls: ['./liga-config.component.scss']
})
export class LigaConfigComponent implements OnInit {
  userId: number = 0;
  userRole: 'jugador' | 'entrenador' | 'administrador_club' | 'administrador' | 'staff_club' = 'administrador_club';
  userName: string = '';

  clubId: number = 0;
  ligaId: number | null = null;
  ligaNombre: string = '';
  descripcion: string = '';
  imagenUrl: string = '';
  fechaInicio: string = '';
  fechaFin: string = '';
  precio: number = 0;
  precioDisplay: string = '';
  estado: 'Inscripción' | 'En Curso' | 'Playoffs' | 'Finalizada' = 'Inscripción';
  visibleApp: boolean = true;
  
  categorias: CategoriaConfig[] = [
    { nombre: '1ª Categoría', genero: 'Caballeros', nivel: 'A', max_parejas: 16, parejas_clasifican_playoff: 2 },
    { nombre: '2ª Categoría', genero: 'Caballeros', nivel: 'B', max_parejas: 16, parejas_clasifican_playoff: 2 }
  ];

  reglas: ReglasPuntos = {
    puntos_victoria_normal: 3,
    puntos_victoria_decisivo: 2,
    puntos_derrota_jugada: 1,
    puntos_derrota_wo: 0,
    criterios_desempate: ['puntos', 'dif_sets', 'dif_games', 'enfrentamiento_directo', 'games_favor'],
    puntos_ranking_participacion: 50,
    puntos_ranking_primer_lugar: 500,
    puntos_ranking_segundo_lugar: 300,
    puntos_ranking_tercer_lugar: 150
  };

  uploadingPoster: boolean = false;
  loading: boolean = false;
  mensajeExito: string = '';
  errorMsj: string = '';

  constructor(
    private ligaService: LigaService, 
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const storedClubId = localStorage.getItem('selectedClubId');
    if (storedClubId && storedClubId !== 'undefined' && storedClubId !== 'null') {
      this.clubId = Number(storedClubId);
    }

    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
      const u = JSON.parse(userStr);
      this.userId = u.id;
      this.userRole = u.rol || 'administrador_club';
      this.userName = `${u.nombre || ''} ${u.apellido || ''}`;
      if (!this.clubId && u.club_id) {
        this.clubId = Number(u.club_id);
      }
    }

    // Comprobar si hay ID en la URL de snapshot o suscripción
    const paramId = this.route.snapshot.paramMap.get('id') || this.route.snapshot.params['id'];
    if (paramId) {
      this.ligaId = Number(paramId);
      this.cargarLiga(this.ligaId);
    } else {
      this.route.params.subscribe(params => {
        if (params['id']) {
          this.ligaId = Number(params['id']);
          this.cargarLiga(this.ligaId);
        }
      });
    }
  }

  onPrecioInput(event: any): void {
    const raw = (event.target.value || '').toString();
    const cleanNum = parseInt(raw.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(cleanNum) && cleanNum > 0) {
      this.precio = cleanNum;
      this.precioDisplay = '$' + cleanNum.toLocaleString('es-CL');
    } else {
      this.precio = 0;
      this.precioDisplay = '';
    }
  }

  cargarLiga(id: number): void {
    this.loading = true;
    this.errorMsj = '';
    this.ligaService.obtenerLiga(id).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success && res.liga) {
          const l = res.liga;
          console.log('Liga cargada para edición:', l);
          
          this.ligaNombre = l.nombre || '';
          this.descripcion = l.descripcion || '';
          this.imagenUrl = l.imagen_url || '';
          if (l.club_id) {
            this.clubId = Number(l.club_id);
          }
          
          // Formatear fechas para <input type="date"> (YYYY-MM-DD)
          if (l.fecha_inicio) {
            this.fechaInicio = String(l.fecha_inicio).split('T')[0].split(' ')[0];
          }
          if (l.fecha_fin) {
            this.fechaFin = String(l.fecha_fin).split('T')[0].split(' ')[0];
          }

          let p = l.precio ? Number(l.precio) : 0;
          if (p > 0 && p < 1000) p = p * 1000;
          this.precio = p;
          this.precioDisplay = p > 0 ? '$' + Math.round(p).toLocaleString('es-CL') : '';
          this.estado = l.estado || 'Inscripción';
          this.visibleApp = l.visible_app == 1 || l.visible_app === true || l.visible_app === '1';
          
          if (l.categorias && l.categorias.length > 0) {
            this.categorias = l.categorias.map((c: any) => ({
              id: c.id ? Number(c.id) : undefined,
              nombre: c.nombre || '',
              genero: c.genero || 'Caballeros',
              nivel: c.nivel || 'B',
              max_parejas: Number(c.max_parejas || 16),
              parejas_clasifican_playoff: Number(c.parejas_clasifican_playoff || 2),
              dias_juego: Array.isArray(c.dias_juego) ? c.dias_juego : (typeof c.dias_juego_json === 'string' ? JSON.parse(c.dias_juego_json) : [])
            }));
          }

          if (l.reglas_puntos_json) {
            const r = typeof l.reglas_puntos_json === 'string' ? JSON.parse(l.reglas_puntos_json) : l.reglas_puntos_json;
            this.reglas = {
              puntos_victoria_normal: Number(r.puntos_victoria_normal ?? 3),
              puntos_victoria_decisivo: Number(r.puntos_victoria_decisivo ?? 2),
              puntos_derrota_jugada: Number(r.puntos_derrota_jugada ?? 1),
              puntos_derrota_wo: Number(r.puntos_derrota_wo ?? 0),
              criterios_desempate: Array.isArray(r.criterios_desempate) ? r.criterios_desempate : ['puntos', 'dif_sets', 'dif_games', 'enfrentamiento_directo', 'games_favor'],
              puntos_ranking_participacion: Number(r.puntos_ranking_participacion ?? 50),
              puntos_ranking_primer_lugar: Number(r.puntos_ranking_primer_lugar ?? 500),
              puntos_ranking_segundo_lugar: Number(r.puntos_ranking_segundo_lugar ?? 300),
              puntos_ranking_tercer_lugar: Number(r.puntos_ranking_tercer_lugar ?? 150)
            };
          }
        } else {
          this.errorMsj = res.error || 'No se encontró la liga especificada';
        }
      },
      error: (err) => {
        this.loading = false;
        this.errorMsj = 'Error al cargar la información de la liga';
        console.error(err);
      }
    });
  }

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      this.uploadingPoster = true;
      this.ligaService.subirPosterLiga(file).subscribe({
        next: (res) => {
          this.uploadingPoster = false;
          if (res.success) {
            this.imagenUrl = res.foto_url;
          } else {
            alert('Error al subir imagen promocional: ' + (res.error || 'Error desconocido'));
          }
        },
        error: (err) => {
          this.uploadingPoster = false;
          console.error(err);
          alert('Error de conexión al subir la imagen');
        }
      });
    }
  }

  diasSemanaList: string[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  isDiaSeleccionado(cat: CategoriaConfig, dia: string): boolean {
    if (!cat.dias_juego) return false;
    return cat.dias_juego.includes(dia);
  }

  toggleDiaCategoria(cat: CategoriaConfig, dia: string): void {
    if (!cat.dias_juego) {
      cat.dias_juego = [];
    }
    const idx = cat.dias_juego.indexOf(dia);
    if (idx > -1) {
      cat.dias_juego.splice(idx, 1);
    } else {
      cat.dias_juego.push(dia);
    }
  }

  agregarCategoria(): void {
    this.categorias.push({
      nombre: `Categoría ${this.categorias.length + 1}`,
      genero: 'Caballeros',
      nivel: 'B',
      max_parejas: 16,
      parejas_clasifican_playoff: 2,
      dias_juego: []
    });
  }

  eliminarCategoria(index: number): void {
    if (this.categorias.length > 1) {
      this.categorias.splice(index, 1);
    }
  }

  moverCriterio(index: number, direccion: 'up' | 'down'): void {
    const newIndex = direccion === 'up' ? index - 1 : index + 1;
    if (newIndex >= 0 && newIndex < this.reglas.criterios_desempate.length) {
      const temp = this.reglas.criterios_desempate[index];
      this.reglas.criterios_desempate[index] = this.reglas.criterios_desempate[newIndex];
      this.reglas.criterios_desempate[newIndex] = temp;
    }
  }

  guardarConfiguracion(): void {
    if (!this.ligaNombre || !this.fechaInicio || !this.fechaFin) {
      this.errorMsj = 'Por favor completa el nombre y las fechas de la liga.';
      return;
    }

    if (this.categorias.length === 0) {
      this.errorMsj = 'Debes definir al menos 1 categoría para la liga.';
      return;
    }

    this.loading = true;
    this.errorMsj = '';
    this.mensajeExito = '';

    const payload = {
      id: this.ligaId || undefined,
      club_id: this.clubId || undefined,
      admin_id: this.userId || undefined,
      nombre: this.ligaNombre,
      descripcion: this.descripcion,
      imagen_url: this.imagenUrl,
      fecha_inicio: this.fechaInicio,
      fecha_fin: this.fechaFin,
      precio: this.precio,
      estado: this.estado,
      visible_app: this.visibleApp,
      categorias: this.categorias,
      reglas_puntos: this.reglas
    };

    this.ligaService.guardarLiga(payload).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success) {
          this.mensajeExito = this.ligaId ? '¡Liga actualizada exitosamente!' : '¡Liga configurada y publicada exitosamente!';
          setTimeout(() => {
            this.router.navigate(['/liga', res.liga_id || this.ligaId]);
          }, 1500);
        } else {
          this.errorMsj = res.error || 'Error al guardar la liga';
        }
      },
      error: (err) => {
        this.loading = false;
        this.errorMsj = 'Error en el servidor al guardar la liga.';
        console.error(err);
      }
    });
  }
}
