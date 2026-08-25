import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

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
            diff = b.puntos - a.puntos;
            break;
          case 'dif_sets':
            diff = b.dif_sets - a.dif_sets;
            break;
          case 'dif_games':
            diff = b.dif_games - a.dif_games;
            break;
          case 'games_favor':
            diff = b.games_favor - a.games_favor;
            break;
        }
        if (diff !== 0) return diff;
      }
      return 0;
    });
  }
}
