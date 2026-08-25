import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AssetService {
  private apiUrl = environment.apiUrl;

  constructor() { }

  /**
   * Generates a full URL for an asset, handling environment prefixes and default directories.
   * @param path The raw path or filename from the database
   * @param type The type of asset ('perfil' | 'club' | 'generic')
   * @returns A complete URL string with cache busting
   */
  getAssetUrl(path: string | null | undefined, type: 'perfil' | 'club' | 'generic' = 'generic'): string {
    if (!path) {
      return this.getPlaceholder(type);
    }

    if (path.startsWith('http') || path.startsWith('assets/')) {
      return path;
    }

    // 1. Clean up redundant leading slash and environment prefixes
    let cleanPath = path.startsWith('/') ? path.substring(1) : path;
    
    // We remove both prd/ and dev/ regardless of current environment 
    // to ensure we can build the correct one from environment.apiUrl
    cleanPath = cleanPath.replace(/^prd\//, '').replace(/^dev\//, '');

    // 2. Handle simple filenames (legacy or minimal DB entries)
    if (!cleanPath.includes('/')) {
      if (type === 'perfil') {
        cleanPath = `uploads/perfiles/${cleanPath}`;
      } else if (type === 'club') {
        cleanPath = `uploads/clubes/${cleanPath}`;
      }
    }

    // 3. Construct final URL without double slashes
    const base = this.apiUrl.endsWith('/') ? this.apiUrl.slice(0, -1) : this.apiUrl;
    const finalUrl = `${base}/${cleanPath}`;
    
    return finalUrl;
  }

  private getPlaceholder(type: string): string {
    if (type === 'perfil') return 'assets/images/placeholder_avatar.png';
    if (type === 'club') return 'assets/images/placeholder_club.png';
    return 'assets/images/placeholder.png';
  }
}
