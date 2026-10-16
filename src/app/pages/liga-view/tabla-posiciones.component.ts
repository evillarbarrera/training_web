import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AssetService } from '../../services/asset.service';

export interface PosicionPareja {
  pareja_id: number;
  nombre_pareja: string;
  pj: number;
  pg: number;
  pp: number;
  puntos: number;
  sets_favor: number;
  sets_contra: number;
  dif_sets: number;
  games_favor: number;
  games_contra: number;
  dif_games: number;
  wo_contra: number;
  p1_nombre?: string;
  p1_apellido?: string;
  p1_foto?: string;
  p2_nombre?: string;
  p2_apellido?: string;
  p2_foto?: string;
  nombre_externo1?: string;
  nombre_externo2?: string;
}

@Component({
  selector: 'app-tabla-posiciones',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tabla-posiciones.component.html',
  styleUrls: ['./tabla-posiciones.component.scss']
})
export class TablaPosicionesComponent implements OnChanges {
  @Input() posiciones: PosicionPareja[] = [];
  @Input() criteriosDesempate: string[] = ['puntos', 'dif_sets', 'dif_games', 'games_favor'];
  @Input() cuposPlayoff: number = 2;

  posicionesOrdenadas: PosicionPareja[] = [];

  constructor(private assetService: AssetService) {}

  ngOnChanges(): void {
    this.ordenarTabla();
  }

  ordenarTabla(): void {
    if (!this.posiciones) {
      this.posicionesOrdenadas = [];
      return;
    }

    this.posicionesOrdenadas = [...this.posiciones].sort((a, b) => {
      for (const criterio of this.criteriosDesempate) {
        let diff = 0;
        switch (criterio) {
          case 'puntos':
            diff = (+b.puntos || 0) - (+a.puntos || 0);
            break;
          case 'dif_sets':
            diff = (+b.dif_sets || 0) - (+a.dif_sets || 0);
            break;
          case 'dif_games':
            diff = (+b.dif_games || 0) - (+a.dif_games || 0);
            break;
          case 'games_favor':
            diff = (+b.games_favor || 0) - (+a.games_favor || 0);
            break;
        }
        if (diff !== 0) return diff;
      }
      return 0;
    });
  }

  getInitials(name: string): string {
    if (!name) return 'EQ';
    const parts = name.split(/[\/\-,\&]/).map(s => s.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const p1 = parts[0].charAt(0).toUpperCase();
      const p2 = parts[1].charAt(0).toUpperCase();
      return `${p1}${p2}`;
    }
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) {
      return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  getPlayer1Name(pos: PosicionPareja): string {
    const n = trimString(`${pos.p1_nombre || ''} ${pos.p1_apellido || ''}`);
    if (n) return n;
    if (pos.nombre_externo1) return pos.nombre_externo1;
    if (pos.nombre_pareja && pos.nombre_pareja.includes('/')) {
      return pos.nombre_pareja.split('/')[0].trim();
    }
    if (pos.nombre_pareja && pos.nombre_pareja.includes('-')) {
      return pos.nombre_pareja.split('-')[0].trim();
    }
    return pos.nombre_pareja || 'Jugador 1';
  }

  getPlayer2Name(pos: PosicionPareja): string {
    const n = trimString(`${pos.p2_nombre || ''} ${pos.p2_apellido || ''}`);
    if (n) return n;
    if (pos.nombre_externo2) return pos.nombre_externo2;
    if (pos.nombre_pareja && pos.nombre_pareja.includes('/')) {
      return pos.nombre_pareja.split('/')[1]?.trim() || 'Jugador 2';
    }
    if (pos.nombre_pareja && pos.nombre_pareja.includes('-')) {
      return pos.nombre_pareja.split('-')[1]?.trim() || 'Jugador 2';
    }
    return 'Jugador 2';
  }

  getPlayer1Photo(pos: PosicionPareja): string {
    const foto = pos.p1_foto;
    if (foto && typeof foto === 'string' && foto.trim() !== '' && !foto.includes('imagen_defecto') && !foto.includes('placeholder')) {
      return this.assetService.getAssetUrl(foto, 'perfil');
    }
    const name = encodeURIComponent(this.getPlayer1Name(pos));
    return `https://ui-avatars.com/api/?name=${name}&background=0f172a&color=ccff00&bold=true&size=64`;
  }

  getPlayer2Photo(pos: PosicionPareja): string {
    const foto = pos.p2_foto;
    if (foto && typeof foto === 'string' && foto.trim() !== '' && !foto.includes('imagen_defecto') && !foto.includes('placeholder')) {
      return this.assetService.getAssetUrl(foto, 'perfil');
    }
    const name = encodeURIComponent(this.getPlayer2Name(pos));
    return `https://ui-avatars.com/api/?name=${name}&background=1e293b&color=38bdf8&bold=true&size=64`;
  }

  onImgError(event: any, fallbackName: string, isP2: boolean = false): void {
    if (event && event.target) {
      const name = encodeURIComponent(fallbackName || 'Jugador');
      const bg = isP2 ? '1e293b' : '0f172a';
      const color = isP2 ? '38bdf8' : 'ccff00';
      event.target.src = `https://ui-avatars.com/api/?name=${name}&background=${bg}&color=${color}&bold=true&size=64`;
    }
  }
}

function trimString(val: string): string {
  return (val || '').trim();
}
