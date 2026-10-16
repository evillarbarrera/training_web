import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap, shareReplay } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface RecursoCategoria {
    id: string;
    nombre: string;
    icono: string;
    badgeLabel: string;
    colorHex: string;
    bgHex: string;
    grupo: 'padel' | 'juegos' | 'amenities' | 'equipamiento' | 'otro';
    tiposDisponibles: string[];
    superficiesDisponibles: string[];
    defaultNombre: string;
    defaultSuperficie: string;
    defaultTipo: string;
    capacidadSugerida: number;
    descripcionSugerida: string;
}

export const RECURSOS_CATEGORIAS: RecursoCategoria[] = [
    {
        id: 'cancha_padel',
        nombre: 'Cancha de Pádel',
        icono: '🎾',
        badgeLabel: 'PÁDEL',
        colorHex: '#10b981',
        bgHex: '#ecfdf5',
        grupo: 'padel',
        tiposDisponibles: ['Outdoor', 'Indoor', 'Cubierta', 'Panorámica'],
        superficiesDisponibles: ['Césped Sintético', 'Césped WPT Texturizado', 'Hormigón Poroso', 'Cemento', 'Resina Sintética'],
        defaultNombre: 'Pista de Pádel',
        defaultSuperficie: 'Césped Sintético',
        defaultTipo: 'Outdoor',
        capacidadSugerida: 4,
        descripcionSugerida: 'Pista reglamentaria de cristal y césped sintético con iluminación LED profesional.'
    },
    {
        id: 'mesa_pool',
        nombre: 'Mesa de Pool / Billar',
        icono: '🎱',
        badgeLabel: 'POOL & BILLAR',
        colorHex: '#8b5cf6',
        bgHex: '#f5f3ff',
        grupo: 'juegos',
        tiposDisponibles: ['Pool Americano (8-Ball)', 'Pool 9-Ball', 'Carambola / Francés', 'Snooker'],
        superficiesDisponibles: ['Paño Simónis Pro Verde', 'Paño Simónis Azul', 'Paño Negro Tournament', 'Paño Rojo Borgoña'],
        defaultNombre: 'Mesa de Pool #1',
        defaultSuperficie: 'Paño Simónis Azul',
        defaultTipo: 'Pool Americano (8-Ball)',
        capacidadSugerida: 4,
        descripcionSugerida: 'Mesa de pool profesional. Incluye juego completo de bolas Aramith, 4 tacos de madera, tizas y triángulo.'
    },
    {
        id: 'mesa_pingpong',
        nombre: 'Mesa de Ping Pong',
        icono: '🏓',
        badgeLabel: 'PING PONG',
        colorHex: '#f97316',
        bgHex: '#fff7ed',
        grupo: 'juegos',
        tiposDisponibles: ['Interior (Indoor)', 'Exterior (Outdoor)', 'Competición ITTF'],
        superficiesDisponibles: ['Madera Aglomerada 25mm', 'Resina Melamínica', 'Compuesto Antirreflejo'],
        defaultNombre: 'Mesa de Ping Pong',
        defaultSuperficie: 'Madera Aglomerada 25mm',
        defaultTipo: 'Interior (Indoor)',
        capacidadSugerida: 4,
        descripcionSugerida: 'Mesa de tenis de mesa reglamentaria. Incluye red, 4 paletas y pelotas 3 estrellas.'
    },
    {
        id: 'quincho',
        nombre: 'Quincho / Asador & BBQ',
        icono: '🍖',
        badgeLabel: 'QUINCHO BBQ',
        colorHex: '#ea580c',
        bgHex: '#fff1f2',
        grupo: 'amenities',
        tiposDisponibles: ['Quincho Abierto', 'Quincho Cerrado Climatizado', 'Terraza Grill'],
        superficiesDisponibles: ['Área con Parrilla a Carbón', 'Parrilla a Gas Premium', 'Parrilla Mixta'],
        defaultNombre: 'Quincho Principal',
        defaultSuperficie: 'Área con Parrilla a Carbón',
        defaultTipo: 'Quincho Cerrado Climatizado',
        capacidadSugerida: 25,
        descripcionSugerida: 'Zona de asados equipada con gran parrilla, mesones, lavacopas, refrigerador y vajilla básica.'
    },
    {
        id: 'zona_lounge',
        nombre: 'Zona Lounge / Gaming & PS5',
        icono: '🎮',
        badgeLabel: 'LOUNGE GAMER',
        colorHex: '#ec4899',
        bgHex: '#fdf2f8',
        grupo: 'juegos',
        tiposDisponibles: ['Sala PlayStation 5', 'Lounge Bar Privado', 'Zona Streaming / TV'],
        superficiesDisponibles: ['Sillones Reclinables & TV 75"', 'Living Modular', 'Mobiliario Lounge'],
        defaultNombre: 'Zona Lounge & PS5',
        defaultSuperficie: 'Sillones Reclinables & TV 75"',
        defaultTipo: 'Sala PlayStation 5',
        capacidadSugerida: 8,
        descripcionSugerida: 'Espacio climatizado con PlayStation 5, sillones ergonómicos, pantalla 4K de 75 pulgadas y juegos deportivos.'
    },
    {
        id: 'futbolito',
        nombre: 'Futbolito / Taca Taca',
        icono: '⚽',
        badgeLabel: 'TACA TACA',
        colorHex: '#16a34a',
        bgHex: '#f0fdf4',
        grupo: 'juegos',
        tiposDisponibles: ['Futbolito Profesional', 'Taca Taca Tradicional'],
        superficiesDisponibles: ['Cancha de Vidrio Templado', 'Madera Tratada'],
        defaultNombre: 'Taca Taca / Futbolito',
        defaultSuperficie: 'Cancha de Vidrio Templado',
        defaultTipo: 'Futbolito Profesional',
        capacidadSugerida: 4,
        descripcionSugerida: 'Mesa de futbolito / taca taca de uso libre por tiempo reservado. Varillas telescópicas y bolas de corcho.'
    },
    {
        id: 'maquina_lanzapelotas',
        nombre: 'Máquina Lanzapelotas',
        icono: '🤖',
        badgeLabel: 'LANZAPELOTAS',
        colorHex: '#0284c7',
        bgHex: '#f0f9ff',
        grupo: 'equipamiento',
        tiposDisponibles: ['Máquina + Pista Incluida', 'Solo Accesorio en Pista'],
        superficiesDisponibles: ['Pista de Pádel Asignada', 'Portátil'],
        defaultNombre: 'Máquina Lanzapelotas Pro',
        defaultSuperficie: 'Pista de Pádel Asignada',
        defaultTipo: 'Máquina + Pista Incluida',
        capacidadSugerida: 2,
        descripcionSugerida: 'Máquina lanzapelotas automática programable con efectos (liftado, cortado, globo) y 150 bolas incluidas.'
    },
    {
        id: 'cancha_pickleball',
        nombre: 'Cancha de Pickleball',
        icono: '🏓',
        badgeLabel: 'PICKLEBALL',
        colorHex: '#84cc16',
        bgHex: '#f7fee7',
        grupo: 'padel',
        tiposDisponibles: ['Outdoor', 'Indoor', 'Cubierta'],
        superficiesDisponibles: ['Césped Sintético', 'Superficie Acrílica Cushion', 'Cemento Pulido'],
        defaultNombre: 'Cancha de Pickleball #1',
        defaultSuperficie: 'Superficie Acrílica Cushion',
        defaultTipo: 'Outdoor',
        capacidadSugerida: 4,
        descripcionSugerida: 'Cancha oficial de Pickleball con red reglamentaria. Incluye palas y pelotas perforadas.'
    },
    {
        id: 'sala_eventos',
        nombre: 'Sala de Eventos & Cumpleaños',
        icono: '🎉',
        badgeLabel: 'EVENTOS',
        colorHex: '#d97706',
        bgHex: '#fffbeb',
        grupo: 'amenities',
        tiposDisponibles: ['Salón Multiuso', 'Sala de Cumpleaños', 'Sala de Reuniones'],
        superficiesDisponibles: ['Piso Flotante / Climatizado', 'Porcelanato'],
        defaultNombre: 'Salón de Eventos',
        defaultSuperficie: 'Piso Flotante / Climatizado',
        defaultTipo: 'Salón Multiuso',
        capacidadSugerida: 40,
        descripcionSugerida: 'Salón amplio climatizado con mesas, sillas, proyector HDMI y equipo de sonido para eventos corporativos o celebraciones.'
    },
    {
        id: 'otro',
        nombre: 'Otro Espacio Recreativo',
        icono: '✨',
        badgeLabel: 'ESPACIO',
        colorHex: '#64748b',
        bgHex: '#f8fafc',
        grupo: 'otro',
        tiposDisponibles: ['Espacio Interior', 'Espacio Exterior', 'Zona Común'],
        superficiesDisponibles: ['General', 'Césped', 'Madera', 'Piso Sintético'],
        defaultNombre: 'Espacio de Recreación',
        defaultSuperficie: 'General',
        defaultTipo: 'Espacio Interior',
        capacidadSugerida: 4,
        descripcionSugerida: 'Espacio o servicio especial del club disponible para arriendo por franjas horarias.'
    }
];

@Injectable({
    providedIn: 'root'
})
export class ClubesService {
    private apiUrl = environment.apiUrl.replace(/\/+$/, '');

    private clubesCache = new Map<string, any[]>();
    private canchasCache = new Map<number, any[]>();

    public readonly categoriasRecursos = RECURSOS_CATEGORIAS;

    constructor(private http: HttpClient) { }

    getCategoryMeta(categoriaId?: string): RecursoCategoria {
        const cat = (categoriaId || '').toLowerCase().trim();
        const found = this.categoriasRecursos.find(c => c.id === cat);
        if (found) return found;

        // Fallbacks inteligentes por nombre o término
        if (cat.includes('pool') || cat.includes('billar')) {
            return this.categoriasRecursos.find(c => c.id === 'mesa_pool')!;
        }
        if (cat.includes('ping') || cat.includes('mesa') && cat.includes('pong')) {
            return this.categoriasRecursos.find(c => c.id === 'mesa_pingpong')!;
        }
        if (cat.includes('quincho') || cat.includes('asador') || cat.includes('bbq') || cat.includes('parrilla')) {
            return this.categoriasRecursos.find(c => c.id === 'quincho')!;
        }
        if (cat.includes('lounge') || cat.includes('play') || cat.includes('gamer') || cat.includes('gaming')) {
            return this.categoriasRecursos.find(c => c.id === 'zona_lounge')!;
        }
        if (cat.includes('futbolito') || cat.includes('taca')) {
            return this.categoriasRecursos.find(c => c.id === 'futbolito')!;
        }
        if (cat.includes('lanza') || cat.includes('maquina')) {
            return this.categoriasRecursos.find(c => c.id === 'maquina_lanzapelotas')!;
        }
        if (cat.includes('pickleball')) {
            return this.categoriasRecursos.find(c => c.id === 'cancha_pickleball')!;
        }
        if (cat.includes('evento') || cat.includes('cumple') || cat.includes('salon')) {
            return this.categoriasRecursos.find(c => c.id === 'sala_eventos')!;
        }

        return this.categoriasRecursos[0]; // Default: cancha_padel
    }

    getCategoryIcon(cancha: any): string {
        if (cancha && cancha.icono && cancha.icono.trim()) return cancha.icono;
        const meta = this.getCategoryMeta(cancha?.categoria);
        return meta.icono;
    }

    private getHeaders(): HttpHeaders {
        const token = localStorage.getItem('token');
        return new HttpHeaders({
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
        });
    }

    // CLUBES (con caché inteligente de sesión)
    getClubes(adminId?: number, forceRefresh: boolean = false): Observable<any[]> {
        const cacheKey = adminId ? `admin_${adminId}` : 'all';
        if (!forceRefresh && this.clubesCache.has(cacheKey)) {
            return of(this.clubesCache.get(cacheKey)!);
        }

        let url = `${this.apiUrl}/clubes/get_clubes.php`;
        if (adminId) url += `?admin_id=${adminId}`;

        return this.http.get<any[]>(url, {
            headers: this.getHeaders()
        }).pipe(
            tap(res => {
                if (res) this.clubesCache.set(cacheKey, res);
            }),
            shareReplay(1)
        );
    }

    getClubHomeStats(adminId: number, clubId?: number, fecha?: string): Observable<any> {
        let url = `${this.apiUrl}/clubes/get_home_stats.php?admin_id=${adminId}`;
        if (clubId) url += `&club_id=${clubId}`;
        if (fecha) url += `&fecha=${fecha}`;
        
        return this.http.get<any>(url, {
            headers: this.getHeaders()
        });
    }

    addClub(clubData: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/clubes/add_club.php`, clubData, {
            headers: this.getHeaders()
        }).pipe(
            tap(() => this.clearCache())
        );
    }

    updateClub(clubData: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/clubes/update_club.php`, clubData, {
            headers: this.getHeaders()
        }).pipe(
            tap(() => this.clearCache())
        );
    }

    deleteClub(id: number, adminId: number): Observable<any> {
        return this.http.post(`${this.apiUrl}/clubes/delete_club.php`, { id, admin_id: adminId }, {
            headers: this.getHeaders()
        }).pipe(
            tap(() => this.clearCache())
        );
    }

    // CANCHAS (con caché optimizado por club)
    getCanchas(clubId: number, forceRefresh: boolean = false): Observable<any[]> {
        if (!forceRefresh && this.canchasCache.has(clubId)) {
            return of(this.canchasCache.get(clubId)!);
        }

        return this.http.get<any[]>(`${this.apiUrl}/clubes/get_canchas.php?club_id=${clubId}`, {
            headers: this.getHeaders()
        }).pipe(
            tap(res => {
                if (res) this.canchasCache.set(clubId, res);
            }),
            shareReplay(1)
        );
    }

    addCancha(canchaData: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/clubes/add_cancha.php`, canchaData, {
            headers: this.getHeaders()
        }).pipe(
            tap(() => this.canchasCache.delete(canchaData.club_id))
        );
    }

    getDisponibilidadCancha(canchaId: number, fecha: string): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/clubes/get_disponibilidad.php?cancha_id=${canchaId}&fecha=${fecha}`, {
            headers: this.getHeaders()
        });
    }

    getDisponibilidadClub(clubId: number, fecha: string): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/clubes/get_disponibilidad.php?club_id=${clubId}&fecha=${fecha}`, {
            headers: this.getHeaders()
        });
    }

    updateCancha(canchaData: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/clubes/update_cancha.php`, canchaData, {
            headers: this.getHeaders()
        }).pipe(
            tap(() => this.canchasCache.delete(canchaData.club_id))
        );
    }

    deleteCancha(id: number, clubId?: number): Observable<any> {
        return this.http.post(`${this.apiUrl}/clubes/delete_cancha.php`, { id }, {
            headers: this.getHeaders()
        }).pipe(
            tap(() => {
                if (clubId) this.canchasCache.delete(clubId);
                else this.canchasCache.clear();
            })
        );
    }

    // TORNEOS
    createTorneoAmericano(torneoData: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/torneos/create_americano.php`, torneoData, {
            headers: this.getHeaders()
        });
    }

    updateAmericano(torneoData: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/torneos/update_americano.php`, torneoData, {
            headers: this.getHeaders()
        });
    }

    updateCheckIn(participanteId: number, playerNum: number, checkedIn: boolean): Observable<any> {
        return this.http.post(`${this.apiUrl}/torneos/update_checkin.php`, {
            participante_id: participanteId,
            player_num: playerNum,
            checked_in: checkedIn ? 1 : 0
        }, {
            headers: this.getHeaders()
        });
    }

    joinTorneo(torneoId: number, usuarioId: number): Observable<any> {
        return this.http.post(`${this.apiUrl}/torneos/join_torneo.php`, { torneo_id: torneoId, usuario_id: usuarioId }, {
            headers: this.getHeaders()
        });
    }

    generateMatches(torneoId: number): Observable<any> {
        return this.http.post(`${this.apiUrl}/torneos/generate_matches.php`, { torneo_id: torneoId }, {
            headers: this.getHeaders()
        });
    }

    getTorneoMatches(torneoId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/torneos/get_matches.php?torneo_id=${torneoId}`, {
            headers: this.getHeaders()
        });
    }

    getTorneosAdmin(adminId: number, clubId?: number): Observable<any[]> {
        let url = `${this.apiUrl}/torneos/get_torneos_admin.php?admin_id=${adminId}`;
        if (clubId) url += `&club_id=${clubId}`;
        return this.http.get<any[]>(url, {
            headers: this.getHeaders()
        });
    }

    getMyTournaments(userId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/torneos/get_user_tournaments.php?user_id=${userId}`, {
            headers: this.getHeaders()
        });
    }

    getMisTorneosCompleto(userId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/torneos/get_mis_torneos_completo.php?user_id=${userId}`, {
            headers: this.getHeaders()
        });
    }

    getCompeticionDetalle(id: number, tipo: string): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/torneos/get_competicion_detalle.php?id=${id}&tipo=${tipo}`, {
            headers: this.getHeaders()
        });
    }

    getLigas(): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/ligas/obtener_liga.php`, {
            headers: this.getHeaders()
        });
    }

    getTorneosPublicos(region?: string, comuna?: string, showAll: boolean = false): Observable<any[]> {
        let url = `${this.apiUrl}/torneos/get_torneos_public.php?1=1`;
        if (region) url += `&region=${encodeURIComponent(region)}`;
        if (comuna) url += `&comuna=${encodeURIComponent(comuna)}`;
        if (showAll) url += `&all=1`;

        return this.http.get<any[]>(url, {
            headers: this.getHeaders()
        });
    }

    getParticipantesTorneo(torneoId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/torneos/get_participantes.php?torneo_id=${torneoId}`, {
            headers: this.getHeaders()
        });
    }

    getClubReservas(clubId: number, fecha: string): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/clubes/get_club_reservas.php?club_id=${clubId}&fecha=${fecha}`, {
            headers: this.getHeaders()
        });
    }

    addReserva(reserva: any): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/clubes/add_reserva.php`, reserva, {
            headers: this.getHeaders()
        });
    }

    cancelReserva(reservaId: number): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/clubes/cancel_reserva.php`, {
            reserva_id: reservaId
        }, {
            headers: this.getHeaders()
        });
    }

    updateReserva(reserva: any): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/clubes/update_reserva.php`, reserva, {
            headers: this.getHeaders()
        });
    }

    updateMatchResult(matchId: number, puntosT1: number, puntosT2: number): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/torneos/update_match_result.php`, {
            match_id: matchId,
            puntos_t1: puntosT1,
            puntos_t2: puntosT2
        }, {
            headers: this.getHeaders()
        });
    }

    getUsers(rol?: string, search?: string): Observable<any[]> {
        let url = `${this.apiUrl}/user/get_users.php?1=1`;
        if (rol) url += `&rol=${rol}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        
        return this.http.get<any[]>(url, {
            headers: this.getHeaders()
        });
    }

    joinTorneoManual(data: any): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/torneos/join_torneo.php`, data, {
            headers: this.getHeaders()
        });
    }

    cancelarTorneoAmericano(torneoId: number): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/torneos/cancelar_americano.php`, {
            torneo_id: torneoId
        }, {
            headers: this.getHeaders()
        });
    }

    closeTorneoAmericano(torneoId: number): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/torneos/close_americano.php`, {
            torneo_id: torneoId
        }, {
            headers: this.getHeaders()
        });
    }

    generatePlayoffs(torneoId: number): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/torneos/close_groups_playoffs.php`, {
            torneo_id: torneoId
        }, {
            headers: this.getHeaders()
        });
    }

    generateFinals(torneoId: number): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/torneos/generate_finals.php`, {
            torneo_id: torneoId
        }, {
            headers: this.getHeaders()
        });
    }

    removeParticipante(torneoId: number, participanteId: number): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/torneos/remove_participante.php`, {
            torneo_id: torneoId,
            participante_id: participanteId
        }, {
            headers: this.getHeaders()
        });
    }

    updateParticipante(data: any): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/torneos/update_participante.php`, data, {
            headers: this.getHeaders()
        });
    }

    getRanking(categoria: string = 'General', clubId?: number, userId?: number): Observable<any[]> {
        let url = `${this.apiUrl}/torneos/get_ranking.php?categoria=${encodeURIComponent(categoria)}`;
        if (clubId) {
            url += `&club_id=${clubId}`;
        }
        if (userId) {
            url += `&user_id=${userId}`;
        }
        return this.http.get<any[]>(url, {
            headers: this.getHeaders()
        });
    }

    getHistorialJugadorRanking(usuarioId: number): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/torneos/get_jugador_historial_ranking.php?usuario_id=${usuarioId}`, {
            headers: this.getHeaders()
        });
    }

    anularRestaurarPuntosTorneo(payload: { usuario_id: number; torneo_id: number; puntos_descontar: number; categoria: string; accion: 'anular' | 'restaurar' }): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/torneos/eliminar_puntos_torneo_jugador.php`, payload, {
            headers: this.getHeaders()
        });
    }

    // TORNEOS V2 (Groups + Playoffs)
    createTorneoV2(torneoData: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/torneos/create_torneo_v2.php`, torneoData, {
            headers: this.getHeaders()
        });
    }

    updateTorneo(idOrData: any, data?: any): Observable<any> {
        let payload = {};
        if (data) {
            payload = { id: idOrData, ...data };
        } else {
            payload = idOrData;
        }
        return this.http.post(`${this.apiUrl}/torneos/update_torneo.php`, payload, {
            headers: this.getHeaders()
        });
    }

    saveTorneoAvailability(torneoId: number, grid: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/torneos/update_torneo_availability.php`, { torneo_id: torneoId, grid }, {
            headers: this.getHeaders()
        });
    }

    getTorneoAvailability(torneoId: number): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/torneos/get_torneo_availability.php?torneo_id=${torneoId}`, {
            headers: this.getHeaders()
        });
    }

    getTorneosAdminV2(adminId: number, clubId?: number): Observable<any[]> {
        let url = `${this.apiUrl}/torneos/get_torneos_admin_v2.php?admin_id=${adminId}`;
        if (clubId) url += `&club_id=${clubId}`;
        return this.http.get<any[]>(url, {
            headers: this.getHeaders()
        });
    }

    getCategoriasTorneo(torneoId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/torneos/get_categorias.php?torneo_id=${torneoId}`, {
            headers: this.getHeaders()
        });
    }

    updateCategoria(id: number, data: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/torneos/update_categoria.php`, { id, ...data }, {
            headers: this.getHeaders()
        });
    }

    addCategoria(torneoId: number, data: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/torneos/add_categoria.php`, { torneo_id: torneoId, ...data }, {
            headers: this.getHeaders()
        });
    }

    deleteCategoria(id: number): Observable<any> {
        return this.http.post(`${this.apiUrl}/torneos/delete_categoria.php`, { id }, {
            headers: this.getHeaders()
        });
    }

    generarGrupos(categoriaId: number): Observable<any> {
        return this.http.post(`${this.apiUrl}/torneos/generar_grupos.php`, { categoria_id: categoriaId }, {
            headers: this.getHeaders()
        });
    }

    getRankingGrupo(grupoId: number): Observable<any> {
        return this.http.get(`${this.apiUrl}/torneos/get_ranking_grupo.php?grupo_id=${grupoId}`, {
            headers: this.getHeaders()
        });
    }

    getInscripciones(categoriaId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/torneos/get_inscripciones.php?categoria_id=${categoriaId}`, {
            headers: this.getHeaders()
        });
    }

    eliminarPareja(inscripcionId: number): Observable<any> {
        return this.http.post(`${this.apiUrl}/torneos/delete_inscripcion.php`, { inscripcion_id: inscripcionId }, {
            headers: this.getHeaders()
        });
    }

    validarInscripcion(inscripcionId: number, validado: boolean): Observable<any> {
        return this.http.post(`${this.apiUrl}/torneos/validar_inscripcion.php`, {
            inscripcion_id: inscripcionId,
            validado: validado ? 1 : 0
        }, {
            headers: this.getHeaders()
        });
    }

    inscribirParejaV2(data: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/torneos/join_torneo_v2.php`, data, {
            headers: this.getHeaders()
        });
    }

    cerrarFaseGrupos(categoriaId: number): Observable<any> {
        return this.http.post(`${this.apiUrl}/torneos/cerrar_grupos.php`, { categoria_id: categoriaId }, {
            headers: this.getHeaders()
        });
    }

    generarCuadroDirecto(categoriaId: number): Observable<any> {
        return this.http.post(`${this.apiUrl}/torneos/generar_cuadro_directo.php`, { categoria_id: categoriaId }, {
            headers: this.getHeaders()
        });
    }

    getPartidosRonda(categoriaId: number, ronda: string): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/torneos/get_partidos_ronda.php?categoria_id=${categoriaId}&ronda=${ronda}`, {
            headers: this.getHeaders()
        });
    }

    getPartidosCategoria(categoriaId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/torneos/get_partidos_categoria.php?categoria_id=${categoriaId}`, {
            headers: this.getHeaders()
        });
    }

    getPartidosTorneoV2(torneoId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/torneos/get_partidos_torneo_v2.php?torneo_id=${torneoId}`, {
            headers: this.getHeaders()
        });
    }

    updateMatchResultV2(matchData: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/torneos/update_match_result.php`, matchData, {
            headers: this.getHeaders()
        });
    }

    saveSchedule(programacion: any[]): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/torneos/save_schedule.php`, { programacion }, {
            headers: this.getHeaders()
        });
    }

    // STAFF
    getClubStaff(clubId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/clubes/get_staff.php?club_id=${clubId}`, {
            headers: this.getHeaders()
        });
    }

    addClubStaff(staffData: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/clubes/add_staff.php`, staffData, {
            headers: this.getHeaders()
        });
    }

    deleteClubStaff(usuarioId: number, clubId: number): Observable<any> {
        return this.http.post(`${this.apiUrl}/clubes/delete_staff.php`, { usuario_id: usuarioId, club_id: clubId }, {
            headers: this.getHeaders()
        });
    }

    // TURNOS DE CLUB
    getClubTurnos(clubId: number, fechaInicio?: string, fechaFin?: string, mes?: number, anio?: number): Observable<any> {
        let url = `${this.apiUrl}/clubes/get_turnos.php?club_id=${clubId}`;
        if (fechaInicio && fechaFin) {
            url += `&fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`;
        } else if (mes && anio) {
            url += `&mes=${mes}&anio=${anio}`;
        }
        return this.http.get<any>(url, {
            headers: this.getHeaders()
        });
    }

    saveClubTurno(turnoData: any): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/clubes/save_turno.php`, turnoData, {
            headers: this.getHeaders()
        });
    }

    deleteClubTurno(turnoId: number, clubId?: number): Observable<any> {
        let url = `${this.apiUrl}/clubes/delete_turno.php`;
        return this.http.post<any>(url, { id: turnoId, club_id: clubId }, {
            headers: this.getHeaders()
        });
    }

    togglePagoTurno(payload: { id: number; club_id: number; pagado: boolean | number; monto_pago?: number | null; metodo_pago?: string }): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/clubes/toggle_pago_turno.php`, payload, {
            headers: this.getHeaders()
        });
    }

    // REPORTES
    updateInscripcionSiembra(id: number, es_seed: boolean, nro_siembra: number | null): Observable<any> {
        return this.http.post(`${this.apiUrl}/torneos/update_inscripcion_siembra.php`, {
            id,
            es_semilla: es_seed ? 1 : 0,
            nro_siembra: nro_siembra
        }, {
            headers: this.getHeaders()
        });
    }

    subirPosterTorneo(file: File): Observable<any> {
        const formData = new FormData();
        formData.append('foto', file);
        return this.http.post(`${this.apiUrl}/torneos/subir_poster_torneo.php`, formData, {
            headers: this.getHeadersUpload()
        });
    }

    subirLogoClub(file: File): Observable<any> {
        const formData = new FormData();
        formData.append('foto', file);
        return this.http.post(`${this.apiUrl}/clubes/subir_logo_club.php`, formData, {
            headers: this.getHeadersUpload()
        });
    }

    private getHeadersUpload() {
        const token = localStorage.getItem('token');
        return new HttpHeaders({
            'Authorization': `Bearer ${token}`
        });
    }

    getReporteVentas(clubId: number): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/reportes/get_reporte_ventas.php?club_id=${clubId}`, {
            headers: this.getHeaders()
        });
    }

    getReporteReservas(clubId: number): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/reportes/get_reporte_reservas.php?club_id=${clubId}`, {
            headers: this.getHeaders()
        });
    }

    getReservasDetallado(clubId: number, finicio: string, ffin: string): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/reportes/get_reservas_detallado.php?club_id=${clubId}&finicio=${finicio}&ffin=${ffin}`, {
            headers: this.getHeaders()
        });
    }

    getTopJugadores(clubId: number, finicio: string, ffin: string): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/reportes/get_top_jugadores.php?club_id=${clubId}&finicio=${finicio}&ffin=${ffin}`, {
            headers: this.getHeaders()
        });
    }

    saveLandingConfig(configData: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/clubes/save_landing_config.php`, configData, {
            headers: this.getHeaders()
        }).pipe(
            tap(() => this.clearCache())
        );
    }

    getPublicClubLanding(slug: string, preview: boolean = false): Observable<any> {
        let url = `${this.apiUrl}/clubes/get_public_club_landing.php?slug=${encodeURIComponent(slug)}`;
        if (preview) url += '&preview=1';
        return this.http.get<any>(url);
    }

    // MATCHMAKING & PREFERENCIAS HORARIAS
    getJugadoresPreferencias(clubId?: number, search?: string, categoria?: string, franja?: string, posicion?: string): Observable<any> {
        let url = `${this.apiUrl}/clubes/get_jugadores_preferencias.php?1=1`;
        if (clubId) url += `&club_id=${clubId}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        if (categoria) url += `&categoria=${encodeURIComponent(categoria)}`;
        if (franja) url += `&franja=${encodeURIComponent(franja)}`;
        if (posicion) url += `&posicion=${encodeURIComponent(posicion)}`;

        return this.http.get<any>(url, {
            headers: this.getHeaders()
        });
    }

    saveJugadorPreferencia(data: any): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/clubes/save_jugador_preferencia.php`, data, {
            headers: this.getHeaders()
        });
    }

    getPosiblesPartidos(clubId: number, fecha: string, categoria?: string, franja?: string): Observable<any> {
        let url = `${this.apiUrl}/clubes/get_posibles_partidos.php?club_id=${clubId}&fecha=${encodeURIComponent(fecha)}`;
        if (categoria) url += `&categoria=${encodeURIComponent(categoria)}`;
        if (franja) url += `&franja=${encodeURIComponent(franja)}`;

        return this.http.get<any>(url, {
            headers: this.getHeaders()
        });
    }

    crearPartidoSugerido(partidoData: any): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/clubes/crear_partido_sugerido.php`, partidoData, {
            headers: this.getHeaders()
        });
    }

    clearCache(): void {
        this.clubesCache.clear();
        this.canchasCache.clear();
    }
}
