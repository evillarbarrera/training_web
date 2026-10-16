import { Injectable } from '@angular/core';
import { HttpResponse } from '@angular/common/http';

interface CacheEntry {
  response: HttpResponse<any>;
  expiry: number;
}

@Injectable({
  providedIn: 'root'
})
export class HttpCacheService {
  private cache = new Map<string, CacheEntry>();

  // Endpoints configurados para caché con su TTL en milisegundos
  private cacheableRules: { [urlKey: string]: number } = {
    'get_clubes.php': 10 * 60 * 1000,          // 10 min
    'get_categorias.php': 10 * 60 * 1000,      // 10 min
    'get_perfil.php': 2 * 60 * 1000,           // 2 min
    'get_all_packs.php': 5 * 60 * 1000,        // 5 min
    'get_torneos_public.php': 5 * 60 * 1000    // 5 min
  };

  /**
   * Obtiene una respuesta de la caché si no ha expirado
   */
  get(url: string): HttpResponse<any> | null {
    const entry = this.cache.get(url);
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiry) {
      this.cache.delete(url);
      return null;
    }

    return entry.response;
  }

  /**
   * Almacena una respuesta en la caché si la URL es almacenable
   */
  put(url: string, response: HttpResponse<any>): void {
    const ttl = this.getTtlForUrl(url);
    if (ttl > 0) {
      this.cache.set(url, {
        response,
        expiry: Date.now() + ttl
      });
    }
  }

  /**
   * Determina si una URL debe guardarse en caché y devuelve su TTL
   */
  isCacheable(url: string): boolean {
    return this.getTtlForUrl(url) > 0;
  }

  private getTtlForUrl(url: string): number {
    for (const key of Object.keys(this.cacheableRules)) {
      if (url.includes(key)) {
        return this.cacheableRules[key];
      }
    }
    return 0;
  }

  /**
   * Invalida la caché completa o por patrón
   */
  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}
