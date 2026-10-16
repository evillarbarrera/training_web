import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CoachPublicConfig {
  entrenador_id: number;
  slug: string;
  publicado: boolean;
  titulo: string;
  bio: string;
  especialidades: string[];
  niveles: string[];
  anios_experiencia: number;
  certificaciones: string;
  comunas: string[];
  clubes_ids: number[];
  banner_url: string;
  fondo_url?: string;
  telefono_contacto: string;
  whatsapp: string;
  instagram: string;
  facebook: string;
  google_business_url: string;
  color_primary: string;
  color_accent: string;
  mostrar_packs: boolean;
  mostrar_horarios: boolean;
  mostrar_resenas: boolean;
  visitas?: number;
  is_owner?: boolean;
  is_publicado?: boolean;
}

export interface CoachCertificado {
  id: number;
  entrenador_id?: number;
  titulo: string;
  institucion?: string;
  archivo_url: string;
  tipo_archivo: 'image' | 'pdf';
  orden?: number;
  created_at?: string;
}

export interface CoachPublicProfileResponse {
  status: string;
  message?: string;
  perfil: CoachPublicConfig;
  entrenador: {
    id: number;
    nombre: string;
    foto: string;
    email: string;
    comuna: string;
    region: string;
  };
  clubes: any[];
  packs: any[];
  horarios_disponibles: any[];
  certificados?: CoachCertificado[];
  resenas: any[];
  estadisticas: {
    promedio_rating: number;
    total_resenas: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class CoachPublicService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getMyProfileConfig(entrenadorId?: number): Observable<any> {
    const q = entrenadorId ? `?entrenador_id=${entrenadorId}` : '';
    return this.http.get<any>(`${this.apiUrl}/entrenador_publico/get_my_profile_config.php${q}`);
  }

  saveProfileConfig(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/entrenador_publico/save_profile_config.php`, payload);
  }

  uploadBanner(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('banner', file);
    return this.http.post<any>(`${this.apiUrl}/entrenador_publico/upload_banner.php`, formData);
  }

  uploadFondo(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('fondo', file);
    return this.http.post<any>(`${this.apiUrl}/entrenador_publico/upload_fondo.php`, formData);
  }

  uploadCertificado(file: File, titulo: string, institucion?: string): Observable<any> {
    const formData = new FormData();
    formData.append('certificado', file);
    formData.append('archivo', file);
    formData.append('titulo', titulo);
    if (institucion) {
      formData.append('institucion', institucion);
    }
    return this.http.post<any>(`${this.apiUrl}/entrenador_publico/upload_certificado.php`, formData);
  }

  deleteCertificado(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/entrenador_publico/delete_certificado.php`, { id });
  }

  getPublicProfile(slugOrId: string | number, preview: boolean = false): Observable<CoachPublicProfileResponse> {
    const isNum = !isNaN(Number(slugOrId));
    const param = isNum ? `entrenador_id=${slugOrId}` : `slug=${encodeURIComponent(String(slugOrId))}`;
    const prev = preview ? '&preview=1' : '';
    return this.http.get<CoachPublicProfileResponse>(`${this.apiUrl}/entrenador_publico/get_public_profile.php?${param}${prev}`);
  }

  getMisResenas(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/entrenador_publico/get_mis_resenas.php`);
  }

  responderResena(resenaId: number, respuesta: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/entrenador_publico/responder_resena.php`, {
      resena_id: resenaId,
      respuesta: respuesta
    });
  }

  saveResena(entrenadorId: number, rating: number, comentario: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/entrenador_publico/save_resena.php`, {
      entrenador_id: entrenadorId,
      rating: rating,
      comentario: comentario
    });
  }

  trackVisita(slug: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/entrenador_publico/track_visita.php`, { slug });
  }
}
