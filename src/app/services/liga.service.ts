import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CategoriaConfig {
  id?: number;
  nombre: string;
  genero: 'Caballeros' | 'Damas' | 'Mixto';
  nivel: string;
  max_parejas: number;
  parejas_clasifican_playoff: number;
  parejas_count?: number;
  parejas?: any[];
  grupos?: any[];
  jornadas?: any[];
  playoffs?: any[];
  liga_id?: number;
}

export interface ReglasPuntos {
  puntos_victoria_normal: number;
  puntos_victoria_decisivo: number;
  puntos_derrota_jugada: number;
  puntos_derrota_wo: number;
  criterios_desempate: string[];
  puntos_ranking_participacion?: number;
  puntos_ranking_primer_lugar?: number;
  puntos_ranking_segundo_lugar?: number;
  puntos_ranking_tercer_lugar?: number;
}

export interface Liga {
  id?: number;
  club_id: number;
  nombre: string;
  descripcion: string;
  imagen_url?: string;
  fecha_inicio: string;
  fecha_fin: string;
  precio?: number;
  estado: 'Inscripción' | 'En Curso' | 'Playoffs' | 'Finalizada';
  visible_app?: boolean | number;
  num_categorias?: number;
  total_parejas?: number;
  reglas_puntos_json?: ReglasPuntos;
  mis_clubes?: any[];
  club_id_activo?: number;
  categorias?: CategoriaConfig[];
  canchas?: any[];
  stats?: {
    total_parejas: number;
    total_partidos: number;
    partidos_jugados: number;
    partidos_pendientes: number;
    porcentaje_progreso: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class LigaService {
  private apiUrl = `${environment.apiUrl.replace(/\/+$/, '')}/ligas`;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    let token = localStorage.getItem('token');
    if (!token) {
      const currentUserStr = localStorage.getItem('currentUser');
      if (currentUserStr) {
        try {
          const u = JSON.parse(currentUserStr);
          token = u.token || u.auth_token;
          if (token) {
            localStorage.setItem('token', token || '');
          }
        } catch (e) {
          console.error('Error repairing token', e);
        }
      }
    }
    const authValue = token ? `Bearer ${token}` : '';
    return new HttpHeaders({
      'Authorization': authValue,
      'X-Authorization': authValue,
      'Content-Type': 'application/json'
    });
  }

  obtenerLigas(clubId?: number, estado?: 'activas' | 'historicas', mobileOnly: boolean = false): Observable<any> {
    let url = `${this.apiUrl}/obtener_liga.php?`;
    if (clubId) url += `club_id=${clubId}&`;
    if (estado) url += `estado=${estado}&`;
    if (mobileOnly) url += `mobile_only=1&`;
    return this.http.get(url, { headers: this.getHeaders() });
  }

  obtenerLiga(id: number, clubId?: number, userId?: number): Observable<any> {
    let url = `${this.apiUrl}/obtener_liga.php?id=${id}`;
    if (clubId) url += `&club_id=${clubId}`;
    if (userId) url += `&user_id=${userId}`;
    return this.http.get(url, { headers: this.getHeaders() });
  }

  guardarLiga(liga: Partial<Liga>): Observable<any> {
    return this.http.post(`${this.apiUrl}/crear_editar_liga.php`, liga, { headers: this.getHeaders() });
  }

  eliminarLiga(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/eliminar_liga.php`, { id }, { headers: this.getHeaders() });
  }

  subirPosterLiga(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('foto', file);
    // FormData content-type boundary is managed automatically by browser
    let token = localStorage.getItem('token');
    const authValue = token ? `Bearer ${token}` : '';
    const headers = new HttpHeaders({
      'Authorization': authValue,
      'X-Authorization': authValue
    });
    return this.http.post(`${this.apiUrl}/subir_poster_liga.php`, formData, { headers });
  }

  generarFixture(categoriaId: number, numGrupos: number = 2): Observable<any> {
    return this.http.post(`${this.apiUrl}/generar_fixture.php`, { categoria_id: categoriaId, num_grupos: numGrupos }, { headers: this.getHeaders() });
  }

  generarFixturePorLiga(ligaId: number, numGrupos: number = 2): Observable<any> {
    return this.http.post(`${this.apiUrl}/generar_fixture.php`, { liga_id: ligaId, num_grupos: numGrupos }, { headers: this.getHeaders() });
  }

  inscribirPareja(
    categoriaId: number, 
    jugador1Id?: number | null, 
    jugador2Id?: number | null, 
    nombrePareja?: string,
    nombreExterno1?: string,
    nombreExterno2?: string,
    restriccionesHorarias?: any[],
    id?: number | null
  ): Observable<any> {
    return this.http.post(`${this.apiUrl}/inscribir_pareja.php`, {
      id: id,
      categoria_id: categoriaId,
      jugador1_id: jugador1Id,
      jugador2_id: jugador2Id,
      nombre_pareja: nombrePareja,
      nombre_externo1: nombreExterno1,
      nombre_externo2: nombreExterno2,
      restricciones_horarias: restriccionesHorarias
    }, { headers: this.getHeaders() });
  }

  eliminarPareja(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/eliminar_pareja.php`, { id }, { headers: this.getHeaders() });
  }

  programarPartido(partidoId: number, canchaId: number | null, fechaHora: string | null): Observable<any> {
    return this.http.post(`${this.apiUrl}/programar_partido.php`, {
      partido_id: partidoId,
      cancha_id: canchaId,
      fecha_hora: fechaHora
    }, { headers: this.getHeaders() });
  }

  programarJornadaSemanal(payload: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/programar_jornada_semanal.php`, payload, { headers: this.getHeaders() });
  }

  guardarResultado(payload: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/guardar_resultado.php`, payload, { headers: this.getHeaders() });
  }

  obtenerTablaPosiciones(grupoId?: number | null, categoriaId?: number | null): Observable<any> {
    const param = grupoId ? `grupo_id=${grupoId}` : `categoria_id=${categoriaId}`;
    return this.http.get(`${this.apiUrl}/obtener_posiciones.php?${param}`, { headers: this.getHeaders() });
  }

  buscarJugadores(query?: string): Observable<any> {
    const url = `${environment.apiUrl}/user/get_users.php${query ? '?search=' + encodeURIComponent(query) : ''}`;
    return this.http.get(url, { headers: this.getHeaders() });
  }

  generarPlayoffs(categoriaId: number, numClasificados: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/generar_playoffs.php`, {
      categoria_id: categoriaId,
      num_clasificados: numClasificados
    }, { headers: this.getHeaders() });
  }
}
