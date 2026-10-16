import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-compartir-whatsapp-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './compartir-whatsapp-modal.component.html',
  styleUrls: ['./compartir-whatsapp-modal.component.scss']
})
export class CompartirWhatsAppModalComponent implements OnInit, OnChanges {
  @Input() ligaNombre: string = '';
  @Input() jornada: any = null;
  @Input() categorias: any[] = [];
  @Output() cerrar = new EventEmitter<boolean>();

  selectedCategoriaId: string = 'ALL';
  mensajeGenerado: string = '';
  copiadoExitoso: boolean = false;

  ngOnInit(): void {
    this.generarMensajeWhatsApp();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['jornada'] || changes['selectedCategoriaId'] || changes['categorias']) {
      this.generarMensajeWhatsApp();
    }
  }

  onCategoriaChange(val: string): void {
    this.selectedCategoriaId = val;
    this.generarMensajeWhatsApp();
  }

  generarMensajeWhatsApp(): void {
    if (!this.jornada || !this.jornada.partidos) {
      this.mensajeGenerado = '';
      return;
    }

    let catFilterName = '';
    let partidosFiltrados = [...this.jornada.partidos];

    if (this.selectedCategoriaId !== 'ALL') {
      partidosFiltrados = partidosFiltrados.filter((m: any) => 
        String(m.categoria_id) === String(this.selectedCategoriaId) || 
        m.categoria_nombre === this.selectedCategoriaId
      );
      const catObj = this.categorias?.find(c => String(c.id) === String(this.selectedCategoriaId) || c.nombre === this.selectedCategoriaId);
      if (catObj) catFilterName = catObj.nombre;
    }

    const ligaNom = (this.ligaNombre || 'Liga de Pádel').toUpperCase();
    const jNum = this.jornada.numero_jornada || 1;
    const jNom = (this.jornada.nombre || `JORNADA #${jNum}`).toUpperCase();

    let msg = `🎾 *${ligaNom}* 🎾\n`;
    msg += `📅 *${jNom}*\n`;
    if (catFilterName) {
      msg += `🏷️ *Categoría: ${catFilterName}*\n`;
    }
    if (this.jornada.fecha_limite) {
      const parts = String(this.jornada.fecha_limite).split('T')[0].split('-');
      if (parts.length === 3) {
        msg += `⏰ *Límite de Juego:* ${parts[2]}/${parts[1]}/${parts[0]}\n`;
      }
    }
    msg += `━━━━━━━━━━━━━━━━━━━━\n\n`;

    if (!partidosFiltrados || partidosFiltrados.length === 0) {
      msg += `⚠️ No hay partidos programados para la selección actual.\n\n`;
    } else {
      const byCatMap = new Map<string, any[]>();
      partidosFiltrados.forEach((m: any) => {
        const catName = m.categoria_nombre || 'Categoría General';
        if (!byCatMap.has(catName)) {
          byCatMap.set(catName, []);
        }
        byCatMap.get(catName)!.push(m);
      });

      byCatMap.forEach((pList, catName) => {
        if (this.selectedCategoriaId === 'ALL') {
          msg += `📌 *${catName.toUpperCase()}*\n`;
        }

        pList.forEach((m: any) => {
          const p1 = m.pareja1_nombre || 'Pareja 1';
          const p2 = m.pareja2_nombre || 'Pareja 2';
          let timeStr = '';
          if (m.fecha_hora && !m.fecha_hora.startsWith('0000')) {
            const dtStr = m.fecha_hora.replace(' ', 'T');
            const dt = new Date(dtStr);
            if (!isNaN(dt.getTime())) {
              const diasSem = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
              const diaNom = diasSem[dt.getDay()];
              const dayNum = String(dt.getDate()).padStart(2, '0');
              const monthNum = String(dt.getMonth() + 1).padStart(2, '0');
              const hr = String(dt.getHours()).padStart(2, '0');
              const min = String(dt.getMinutes()).padStart(2, '0');
              timeStr = `🗓️ ${diaNom} ${dayNum}/${monthNum} • ⏰ ${hr}:${min} hrs`;
            }
          }

          const canchaStr = m.cancha_nombre ? `📍 ${m.cancha_nombre}` : '📍 Por Confirmar Cancha';

          msg += `🔹 *${p1}* vs *${p2}*\n`;
          if (timeStr) msg += `   ${timeStr}\n`;
          msg += `   ${canchaStr}\n`;
          if (m.estado === 'Jugado') {
            msg += `   🏆 Score: ${m.set1_p1}-${m.set1_p2} | ${m.set2_p1}-${m.set2_p2}\n`;
          }
          msg += `\n`;
        });
      });
    }

    msg += `📲 *¡Revisa programación y resultados en la App PadelBlox!*`;
    this.mensajeGenerado = msg;
  }

  copiarAlPortapapeles(): void {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(this.mensajeGenerado).then(() => {
        this.copiadoExitoso = true;
        setTimeout(() => this.copiadoExitoso = false, 3000);
      });
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = this.mensajeGenerado;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      this.copiadoExitoso = true;
      setTimeout(() => this.copiadoExitoso = false, 3000);
    }
  }

  abrirWhatsApp(): void {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(this.mensajeGenerado)}`;
    window.open(url, '_blank');
  }

  cerrarModal(): void {
    this.cerrar.emit(true);
  }
}
