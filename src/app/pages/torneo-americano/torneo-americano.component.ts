import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ClubesService } from '../../services/clubes.service';
import { ApiService } from '../../services/api.service';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-torneo-americano',
    standalone: true,
    imports: [CommonModule, FormsModule, SidebarComponent],
    templateUrl: './torneo-americano.component.html',
    styleUrls: ['./torneo-americano.component.scss']
})
export class TorneoAmericanoComponent implements OnInit {
    clubes: any[] = [];
    torneos: any[] = [];
    selectedTorneo: any = null;
    participantes: any[] = [];
    matches: any[] = [];
    allUsers: any[] = [];
    filteredUsers: any[] = [];
    searchTerm: string = '';
    matchesGrouped: any[] = [];
    levelMapping: any = {
        'Primera': 1, 'Segunda': 2, 'Tercera': 3, 'Cuarta': 4, 'Quinta': 5, 'Sexta': 6,
        'A': 3, 'B': 4, 'C': 5, 'D': 6
    };

    // Slots para armar la pareja
    pairingSlot1: any = null;
    pairingSlot2: any = null;
    editingParticipanteId: number | null = null;

    userId: number = 0;
    userName: string = '';
    userFoto: string | null = null;
    userRole: any = 'administrador_club';
    clubId: number | null = null;

    // Tab State
    activeTab: 'create' | 'list' | 'history' = 'list';
    activeDetailTab: 'inscription' | 'fixture' | 'ranking' | 'editar' = 'inscription';
    activeRoundTab: number = 1;
    activeFaseTab: string = '';

    showPodiumReveal: boolean = false;
    revealStep: number = 0;
    flashActive: boolean = false;
    private audioCtx: any = null;

    isCountingDown: boolean = false;
    countdownVal: number = 5;
    countdownShot: string = '';
    countdownIcon: string = '';
    countdownForRank: number = 3;
    private countdownInterval: any = null;
    private musicInterval: any = null;
    private musicNodes: any[] = [];
    private audioEl: HTMLAudioElement | null = null;

    torneo = {
        club_id: 0,
        nombre: '',
        fecha: '',
        hora_inicio: '',
        num_canchas: 2,
        tiempo_por_partido: 20,
        puntos_ganado: 3,
        puntos_empate: 1,
        puntos_1er_lugar: 100,
        puntos_2do_lugar: 60,
        puntos_3er_lugar: 40,
        puntos_4to_lugar: 20,
        puntos_participacion: 5,
        max_parejas: 8,
        categoria: 'Cuarta',
        tipo_torneo: 'estandar',
        modalidad: 'unicategoria',
        valor_suma: null,
        genero: 'Varones',
        precio: 0
    };

    constructor(
        private clubesService: ClubesService,
        private apiService: ApiService,
        private router: Router
    ) { }

    ngOnInit(): void {
        const currentUser = this.apiService.getCurrentUser();

        if (currentUser) {
            this.userId = currentUser.id;
            this.userName = currentUser.nombre || 'Usuario';
            this.userRole = currentUser.rol || 'administrador_club';
            this.userFoto = currentUser.foto || null;
            this.clubId = currentUser.club_id || null;

            const isStaff = this.userRole.toLowerCase().includes('staff');
            const isAdmin = this.userRole.toLowerCase().includes('admin');
            
            // 🔐 SEGURIDAD: Solo Admin y Staff pueden gestionar americanos
            if (!isStaff && !isAdmin) {
                this.router.navigate(['/login']);
                return;
            }

                this.loadTorneos(this.userId, this.clubId);
            this.clubesService.getUsers().subscribe(res => this.allUsers = res);
            this.clubesService.getClubes(this.userId).subscribe(res => {
                this.clubes = res;
                if (this.clubes.length > 0) {
                    this.torneo.club_id = this.clubes[0].id;
                }
            });

            // Fetch fresh profile data (photo URL)
            this.apiService.getPerfil(this.userId).subscribe({
                next: (res) => {
                    if (res.success && res.user) {
                        this.userFoto = res.user.foto_perfil || this.userFoto;
                        this.userName = res.user.nombre || this.userName;
                    }
                }
            });
        } else {
            // Fallback to manual localStorage if BehaviorSubject is empty (e.g. on direct refresh)
            const storedUser = localStorage.getItem('currentUser');
            if (storedUser) {
                const user = JSON.parse(storedUser);
                this.userId = user.id;
                this.userName = user.nombre || 'Usuario';
                this.userRole = user.rol || 'administrador_club';
                this.userFoto = user.foto || null;

                const isStaff = this.userRole.toLowerCase().includes('staff');
                const isAdmin = this.userRole.toLowerCase().includes('admin');
                
                // 🔐 SEGURIDAD: Solo Admin y Staff pueden gestionar americanos
                if (!isStaff && !isAdmin) {
                    this.router.navigate(['/login']);
                    return;
                }

                this.loadTorneos(this.userId, this.clubId);
                this.clubesService.getUsers().subscribe(res => this.allUsers = res);
                this.clubesService.getClubes(this.userId).subscribe(res => {
                    this.clubes = res;
                    if (this.clubes.length > 0) {
                        this.torneo.club_id = this.clubes[0].id;
                    }
                });

                // Fetch fresh profile data (photo URL)
                this.apiService.getPerfil(this.userId).subscribe({
                    next: (res) => {
                        if (res.success && res.user) {
                            this.userFoto = res.user.foto_perfil || this.userFoto;
                            this.userName = res.user.nombre || this.userName;
                        }
                    }
                });
            } else {
                this.router.navigate(['/login']);
            }
        }
    }

    loadTorneos(adminId: number, clubId: number | null = null) {
        this.clubesService.getTorneosAdmin(adminId, clubId || undefined).subscribe((res: any) => {
            this.torneos = res;
            // Sync selectedTorneo if it exists
            if (this.selectedTorneo) {
                const updated = this.torneos.find(t => t.id === this.selectedTorneo.id);
                if (updated) {
                    this.selectedTorneo = { ...updated };
                }
            }
        });
    }

    resetForm() {
        this.torneo = {
            ...this.torneo,
            nombre: '',
            fecha: '',
            hora_inicio: '',
            num_canchas: 2,
            tiempo_por_partido: 20,
            tipo_torneo: 'estandar',
            modalidad: 'unicategoria',
            precio: 0
        };
    }

    crearTorneo() {
        if (!this.torneo.nombre || !this.torneo.club_id || !this.torneo.fecha) {
            Swal.fire('Atención', 'Por favor completa el nombre, club y fecha.', 'warning');
            return;
        }

        this.clubesService.createTorneoAmericano({ ...this.torneo, creator_id: this.userId }).subscribe({
            next: () => {
                Swal.fire('¡Éxito!', 'Torneo creado correctamente.', 'success');
                this.loadTorneos(this.userId);
                this.activeTab = 'list';
                this.resetForm();
            },
            error: (err) => {
                Swal.fire('Error', err.error?.error || 'No se pudo crear el torneo.', 'error');
            }
        });
    }

    actualizarAmericano() {
        if (!this.selectedTorneo.nombre || !this.selectedTorneo.fecha || !this.selectedTorneo.hora_inicio) {
            Swal.fire('Datos Incompletos', 'Nombre, fecha y hora son obligatorios.', 'warning');
            return;
        }

        const payload = {
            id: this.selectedTorneo.id,
            nombre: this.selectedTorneo.nombre,
            fecha: this.selectedTorneo.fecha,
            hora_inicio: this.selectedTorneo.hora_inicio,
            precio: this.selectedTorneo.precio,
            tiempo_por_partido: this.selectedTorneo.tiempo_por_partido,
            num_canchas: this.selectedTorneo.num_canchas,
            max_parejas: this.selectedTorneo.max_parejas
        };

        this.clubesService.updateAmericano(payload).subscribe({
            next: () => {
                Swal.fire('¡Torneo Actualizado!', 'Los detalles han sido guardados.', 'success');
                this.loadTorneos(this.userId);
            },
            error: (err) => {
                Swal.fire('Error', 'No se pudo actualizar el torneo.', 'error');
            }
        });
    }

    cancelarTorneo(torneoId: number) {
        Swal.fire({
            title: '¿Cancelar Torneo?',
            text: "El torneo desaparecerá para los jugadores y no se podrán registrar más parejas.",
            icon: 'error',
            showCancelButton: true,
            confirmButtonText: 'Sí, cancelar torneo',
            confirmButtonColor: '#d33',
            cancelButtonText: 'Volver'
        }).then((result) => {
            if (result.isConfirmed) {
                this.clubesService.cancelarTorneoAmericano(torneoId).subscribe({
                    next: () => {
                        Swal.fire('Cancelado', 'El torneo ha sido cerrado.', 'success');
                        this.loadTorneos(this.userId);
                        this.selectedTorneo.estado = 'Cerrado';
                    },
                    error: (err: any) => Swal.fire('Error', 'No se pudo cancelar el torneo.', 'error')
                });
            }
        });
    }

    cerrarTorneo(torneoId: number) {
        Swal.fire({
            title: '¿Cerrar Americano?',
            text: "Se distribuirán los puntos a los jugadores y no se podrán realizar más cambios.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, cerrar y repartir puntos',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                this.clubesService.closeTorneoAmericano(torneoId).subscribe({
                    next: (res: any) => {
                        Swal.fire('¡Cerrado!', res.mensaje || 'Torneo finalizado con éxito.', 'success');
                        if (this.selectedTorneo) {
                            this.selectedTorneo.estado = 'Cerrado';
                        }
                        this.loadTorneos(this.userId);
                    },
                    error: (err) => {
                        Swal.fire('Error', err.error?.error || 'No se pudo cerrar el torneo.', 'error');
                    }
                });
            }
        });
    }

    get isCerrado(): boolean {
        return this.selectedTorneo?.estado === 'Cerrado';
    }

    get isGrupos(): boolean {
        return this.selectedTorneo?.tipo_torneo === 'grupos';
    }

    selectTorneo(torneo: any) {
        if (!torneo) return;
        this.selectedTorneo = { ...torneo };
        this.activeDetailTab = 'inscription';
        this.loadParticipantes(torneo.id);
        this.loadMatches(torneo.id);
    }

    loadParticipantes(torneoId: number) {
        this.clubesService.getParticipantesTorneo(torneoId).subscribe(res => {
            this.participantes = res;
        });
    }

    loadMatches(torneoId: number) {
        this.clubesService.getTorneoMatches(torneoId).subscribe(res => {
            this.matches = res || [];
            this.groupMatches();
        });
    }

    groupMatches() {
        if (!this.matches || this.matches.length === 0) {
            this.matchesGrouped = [];
            return;
        }

        const groups = this.matches.reduce((acc: any, m: any) => {
            const faseKey = m.fase || 'Grupos';
            if (!acc[faseKey]) acc[faseKey] = {};

            const grupoKey = m.grupo_id || 'General';
            if (!acc[faseKey][grupoKey]) acc[faseKey][grupoKey] = {};

            if (!acc[faseKey][grupoKey][m.ronda]) acc[faseKey][grupoKey][m.ronda] = [];
            acc[faseKey][grupoKey][m.ronda].push(m);
            return acc;
        }, {});

        // Re-estructuramos para la vista
        this.matchesGrouped = Object.keys(groups).map(fase => ({
            name: fase,
            groups: Object.keys(groups[fase]).map(grupo => {
                const rounds = Object.keys(groups[fase][grupo]).map(r => {
                    const sortedMatches = groups[fase][grupo][r].sort((a: any, b: any) => {
                        const courtA = Number(a.num_cancha || 0);
                        const courtB = Number(b.num_cancha || 0);
                        return courtA - courtB;
                    });
                    return {
                        number: parseInt(r),
                        matches: sortedMatches
                    };
                }).sort((a, b) => a.number - b.number);

                return {
                    name: grupo,
                    rounds: rounds,
                    activeRound: rounds.length > 0 ? rounds[0].number : 1
                };
            })
        }));

        if (this.matchesGrouped.length > 0) {
            if (!this.activeFaseTab || !this.matchesGrouped.find(f => f.name === this.activeFaseTab)) {
                this.activeFaseTab = this.matchesGrouped[0].name;
            }
        }
    }

    closeGroupsAndGeneratePlayoffs() {
        if (!this.selectedTorneo) return;

        Swal.fire({
            title: '¿Cerrar Grupos y Generar Playoffs?',
            text: "Se calcularán las posiciones y se crearán las llaves de Oro y Plata.",
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, generar playoffs'
        }).then((result) => {
            if (result.isConfirmed) {
                this.clubesService.generatePlayoffs(this.selectedTorneo.id).subscribe({
                    next: () => {
                        Swal.fire('¡Éxito!', 'Llaves generadas correctamente.', 'success');
                        this.loadMatches(this.selectedTorneo.id);
                        this.activeFaseTab = 'Semifinales';
                    },
                    error: (err: any) => {
                        Swal.fire('Error', err.error?.error || 'No se pudo generar los playoffs.', 'error');
                    }
                });
            }
        });
    }

    hasPhase(name: string): boolean {
        return !!this.matchesGrouped.find(g => g.name === name);
    }

    generateFinals() {
        if (!this.selectedTorneo) return;

        // Check if semifinals are done
        const semis = this.matches.filter(m => m.fase === 'Semifinales');
        if (semis.length === 0) {
            Swal.fire('Error', 'No hay semifinales generadas.', 'warning');
            return;
        }
        const pending = semis.filter(m => !m.finalizado);
        if (pending.length > 0) {
            Swal.fire('Semifinales en curso', 'Debes finalizar todos los partidos de semifinales antes de generar las finales.', 'warning');
            return;
        }

        Swal.fire({
            title: '¿Generar Finales?',
            text: "Se crearán los partidos finales de Oro y Plata.",
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, generar finales'
        }).then((result) => {
            if (result.isConfirmed) {
                this.clubesService.generateFinals(this.selectedTorneo.id).subscribe({
                    next: () => {
                        Swal.fire('¡Éxito!', 'Finales generadas correctamente.', 'success');
                        this.loadMatches(this.selectedTorneo.id);
                        this.activeFaseTab = 'Finales'; // Switch tab
                    },
                    error: (err: any) => {
                        Swal.fire('Error', err.error?.error || 'No se pudo generar las finales.', 'error');
                    }
                });
            }
        });
    }

    searchPlayers() {
        if (!this.searchTerm.trim()) {
            this.filteredUsers = [];
            return;
        }
        const term = this.searchTerm.toLowerCase();
        this.filteredUsers = this.allUsers.filter(u =>
            u.nombre?.toLowerCase().includes(term) || u.usuario?.toLowerCase().includes(term)
        ).slice(0, 5);
    }

    selectPlayerForPair(user: any) {
        const playerObj = { ...user, isManual: false };
        if (!this.pairingSlot1) {
            this.pairingSlot1 = playerObj;
        } else if (!this.pairingSlot2) {
            if (!playerObj.isManual && this.pairingSlot1.id === playerObj.id) {
                Swal.fire('Error', 'No puedes seleccionar al mismo jugador dos veces.', 'error');
                return;
            }
            this.pairingSlot2 = playerObj;
        }
        this.searchTerm = '';
        this.filteredUsers = [];
    }

    addManualPlayer(name: string) {
        if (!name.trim()) return;
        const manualObj = { id: null, nombre: name + ' (Invitado)', isManual: true, realName: name };
        if (!this.pairingSlot1) {
            this.pairingSlot1 = manualObj;
        } else if (!this.pairingSlot2) {
            this.pairingSlot2 = manualObj;
        }
        this.searchTerm = '';
        this.filteredUsers = [];
    }

    removePlayerFromPair(slotNum: number) {
        if (slotNum === 1) this.pairingSlot1 = null;
        if (slotNum === 2) this.pairingSlot2 = null;
    }

    addPair() {
        if (!this.selectedTorneo || (!this.pairingSlot1 && !this.pairingSlot2)) return;
        if (this.isCerrado) {
            Swal.fire('Torneo Cerrado', 'No puedes inscribir más parejas.', 'info');
            return;
        }

        if (this.selectedTorneo.modalidad === 'suma' && this.selectedTorneo.valor_suma && this.pairingSlot1 && this.pairingSlot2) {
            const sum = this.calculatePairSum();
            if (sum !== this.selectedTorneo.valor_suma) {
                Swal.fire('Atención', `La suma de niveles (${sum}) no coincide con el valor del torneo (${this.selectedTorneo.valor_suma}).`, 'warning');
            }
        }

        const p1Name = this.pairingSlot1 ? this.pairingSlot1.nombre : 'Jugador Pendiente';
        const p2Name = this.pairingSlot2 ? this.pairingSlot2.nombre : 'Jugador Pendiente';

        const payload: any = {
            torneo_id: this.selectedTorneo.id,
            jugador1_id: this.pairingSlot1 ? this.pairingSlot1.id : null,
            jugador2_id: this.pairingSlot2 ? this.pairingSlot2.id : null,
            nombre_pareja: `${p1Name} & ${p2Name}`
        };

        if (this.pairingSlot1 && this.pairingSlot1.isManual) payload.nombre_1 = this.pairingSlot1.realName;
        if (this.pairingSlot2 && this.pairingSlot2.isManual) payload.nombre_2 = this.pairingSlot2.realName;

        if (this.editingParticipanteId) {
            payload.id = this.editingParticipanteId;
            this.clubesService.updateParticipante(payload).subscribe({
                next: (res) => {
                    Swal.fire('¡Éxito!', res.mensaje || 'Pareja actualizada.', 'success');
                    this.loadParticipantes(this.selectedTorneo.id);
                    this.loadMatches(this.selectedTorneo.id);
                    this.loadTorneos(this.userId);
                    this.cancelEdit();
                },
                error: (err) => {
                    Swal.fire('Error', err.error?.error || 'No se pudo actualizar.', 'error');
                }
            });
        } else {
            this.clubesService.joinTorneoManual(payload).subscribe({
                next: () => {
                    Swal.fire('¡Éxito!', 'Pareja inscrita.', 'success');
                    this.loadParticipantes(this.selectedTorneo.id);
                    this.pairingSlot1 = null;
                    this.pairingSlot2 = null;
                },
                error: (err) => {
                    Swal.fire('Error', err.error?.error || 'No se pudo agregar la pareja.', 'error');
                }
            });
        }
    }

    editPair(p: any) {
        if (this.isCerrado) return;
        this.editingParticipanteId = p.id;

        const hasJ1 = p.jugador_id || p.nombre_externo_1;
        this.pairingSlot1 = hasJ1 ? {
            id: p.jugador_id,
            nombre: p.nombre_externo_1 ? p.nombre_externo_1 + ' (Invitado)' : p.jugador1_nombre,
            isManual: !!p.nombre_externo_1,
            realName: p.nombre_externo_1 || p.jugador1_nombre
        } : null;

        const hasJ2 = p.jugador2_id || p.nombre_externo_2;
        this.pairingSlot2 = hasJ2 ? {
            id: p.jugador2_id,
            nombre: p.nombre_externo_2 ? p.nombre_externo_2 + ' (Invitado)' : p.jugador2_nombre,
            isManual: !!p.nombre_externo_2,
            realName: p.nombre_externo_2 || p.jugador2_nombre
        } : null;

        // Scroll up to the builder
        const el = document.querySelector('.pair-builder-container');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
    }

    cancelEdit() {
        this.editingParticipanteId = null;
        this.pairingSlot1 = null;
        this.pairingSlot2 = null;
    }

    removePair(participanteId: number) {
        if (this.isCerrado) return;

        Swal.fire({
            title: '¿Quitar pareja?',
            text: "Se eliminarán los partidos generados y deberás crearlos de nuevo.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, quitar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                this.clubesService.removeParticipante(this.selectedTorneo.id, participanteId).subscribe({
                    next: (res) => {
                        Swal.fire('Eliminado', res.mensaje || 'Pareja removida correctamente.', 'success');
                        this.loadParticipantes(this.selectedTorneo.id);
                        this.loadMatches(this.selectedTorneo.id);
                        this.loadTorneos(this.userId);
                    },
                    error: (err) => {
                        Swal.fire('Error', err.error?.error || 'No se pudo quitar la pareja.', 'error');
                    }
                });
            }
        });
    }

    updateMatch(match: any) {
        this.saveScore(match);
    }

    saveScore(match: any, silent: boolean = false) {
        if (this.isCerrado) {
            if (!silent) Swal.fire('Torneo Cerrado', 'No puedes editar resultados.', 'info');
            return;
        }
        if (match.puntos_t1 == null || match.puntos_t2 == null) {
            if (!silent) Swal.fire('Atención', 'Ingresa los puntos.', 'warning');
            return;
        }

        this.clubesService.updateMatchResult(match.id, match.puntos_t1, match.puntos_t2).subscribe({
            next: () => {
                if (!silent) Swal.fire('Guardado', 'Resultado actualizado.', 'success');
                match.finalizado = 1;
                this.loadParticipantes(this.selectedTorneo.id);
            },
            error: (err) => {
                if (!silent) Swal.fire('Error', err.error?.error || 'No se pudo guardar.', 'error');
            }
        });
    }

    saveRound(round: number) {
        if (this.isCerrado) {
            Swal.fire('Torneo Cerrado', 'No puedes editar resultados.', 'info');
            return;
        }
        const pending = this.matches.filter(m => m.ronda === round && m.puntos_t1 != null && m.puntos_t2 != null);
        if (pending.length === 0) {
            Swal.fire('Atención', 'No hay resultados válidos.', 'warning');
            return;
        }

        Swal.fire({
            title: `¿Guardar Ronda ${round}?`,
            text: `Se actualizarán ${pending.length} partidos.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, guardar'
        }).then((result) => {
            if (result.isConfirmed) {
                pending.forEach(m => this.saveScore(m, true));
                Swal.fire('Procesado', 'Resultados de la ronda enviados.', 'success');
            }
        });
    }

    getCoupleLabel(playerId: number | null, name: string = ''): string {
        if (!playerId && !name) return '?';
        const index = this.participantes.findIndex(p =>
            (playerId && (p.jugador_id === playerId || p.jugador2_id === playerId)) ||
            (name && (p.jugador1_nombre === name || p.jugador2_nombre === name))
        );
        return index !== -1 ? `P${index + 1}` : '?';
    }

    generarPartidos(torneoId: number) {
        if (this.isCerrado) {
            Swal.fire('Torneo Cerrado', 'No puedes regenerar partidos.', 'info');
            return;
        }
        if (this.participantes.length < 4) {
            Swal.fire('Faltan jugadores', 'Necesitas al menos 4 jugadores.', 'warning');
            return;
        }

        Swal.fire({
            title: '¿Generar Fixture?',
            text: "Se borrarán los partidos previos.",
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, generar'
        }).then((result) => {
            if (result.isConfirmed) {
                this.clubesService.generateMatches(torneoId).subscribe({
                    next: () => {
                        Swal.fire('¡Listo!', 'Fixture generado.', 'success');
                        this.loadMatches(torneoId);
                        this.loadTorneos(this.userId);
                    },
                    error: (err) => {
                        Swal.fire('Error', err.error?.error || 'No se pudo generar.', 'error');
                    }
                });
            }
        });
    }

    calculatePairSum(): number {
        const getLevelNum = (player: any) => {
            if (!player) return 0;
            // Primero intentamos buscar nivel en el perfil (si existiera)
            if (player.nivel && this.levelMapping[player.nivel]) return this.levelMapping[player.nivel];
            // Si no, podríamos tener una selección manual o fallback
            return 0;
        };

        const s1 = getLevelNum(this.pairingSlot1);
        const s2 = getLevelNum(this.pairingSlot2);
        return s1 + s2;
    }

    hasActiveTournaments(): boolean {
        return this.torneos.some(t => t.estado === 'Abierto');
    }

    hasHistoryTournaments(): boolean {
        return this.torneos.some(t => t.estado !== 'Abierto');
    }

    hasRank(rank: number): boolean {
        return this.participantes.some(p => p.final_rank === rank);
    }

    toggleCheckIn(p: any, playerNum: number) {
        if (this.isCerrado) return;
        
        const currentVal = playerNum === 1 ? p.check_in_1 : p.check_in_2;
        const newVal = !currentVal;
        
        this.clubesService.updateCheckIn(p.id, playerNum, newVal).subscribe({
            next: (res) => {
                if (res.success) {
                    if (playerNum === 1) {
                        p.check_in_1 = newVal ? 1 : 0;
                    } else {
                        p.check_in_2 = newVal ? 1 : 0;
                    }
                }
            },
            error: (err) => {
                Swal.fire('Error', err.error?.error || 'No se pudo actualizar la asistencia.', 'error');
            }
        });
    }

    startReveal() {
        if (!this.participantes || this.participantes.length === 0) {
            Swal.fire('Atención', 'No hay participantes registrados para revelar el podio.', 'warning');
            return;
        }
        this.showPodiumReveal = true;
        this.revealStep = 0; // 0: all locked, 1: 3rd revealed, 2: 2nd & 3rd revealed, 3: all revealed
        this.isCountingDown = false;
        this.countdownVal = 5;
        this.countdownForRank = 3; // start counting for 3rd
        
        // Start Europe - The Final Countdown audio track loop
        try {
            this.stopBackgroundMusic();
            this.audioEl = new Audio('assets/final_countdown.mp3');
            this.audioEl.loop = true;
            this.audioEl.volume = 0.55;
            this.audioEl.play().catch(err => console.log('Audio autoplay blocked by browser:', err));
        } catch (e) {
            console.warn('Could not initialize final countdown audio', e);
        }
    }

    startCountdownFor(rank: number) {
        if (this.isCountingDown) return;
        this.countdownForRank = rank;
        this.isCountingDown = true;
        this.countdownVal = 5;
        this.updateCountdownShot();
        this.playCountdownBeep();

        this.countdownInterval = setInterval(() => {
            this.countdownVal--;
            if (this.countdownVal > 0) {
                this.updateCountdownShot();
                this.playCountdownBeep();
            } else {
                clearInterval(this.countdownInterval);
                this.isCountingDown = false;
                
                // End of countdown - Reveal specific rank!
                this.triggerFlash();
                
                if (rank === 3) {
                    this.revealStep = 1; // 3rd place revealed
                    this.playImpactSound(false);
                } else if (rank === 2) {
                    this.revealStep = 2; // 2nd place revealed
                    this.playImpactSound(false);
                } else if (rank === 1) {
                    this.revealStep = 3; // 1st place (Champions) revealed
                    this.playImpactSound(true);
                    this.playApplauseSound(5.0); // Play massive crowd applause overlay
                    setTimeout(() => {
                        this.playFanfareSound();
                    }, 100);
                }
            }
        }, 1000);
    }

    private updateCountdownShot() {
        const shots = [
            { text: 'SAQUE INICIAL 🥎', icon: '🥎' },
            { text: 'DERECHA PROFUNDA 🎾', icon: '🎾' },
            { text: 'REVÉS CRUZADO 🔄', icon: '🔄' },
            { text: 'VOLEA DE ATAQUE ⚡', icon: '⚡' },
            { text: 'REMATE SMASH EXTRACCIÓN! 💥', icon: '💥' }
        ];
        const idx = 5 - this.countdownVal;
        if (idx >= 0 && idx < shots.length) {
            this.countdownShot = shots[idx].text;
            this.countdownIcon = shots[idx].icon;
        }
    }

    private playCountdownBeep() {
        try {
            const ctx = this.getAudioContext();
            if (ctx.state === 'suspended') ctx.resume();
            
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.type = 'sine';
            const frequencies = [0, 880, 784, 698, 587, 523];
            osc.frequency.setValueAtTime(frequencies[this.countdownVal] || 440, ctx.currentTime);
            
            gain.gain.setValueAtTime(0.12, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.start();
            osc.stop(ctx.currentTime + 0.15);
        } catch (e) {
            console.warn(e);
        }
    }

    private playApplauseSound(durationSec: number = 2.5) {
        try {
            const ctx = this.getAudioContext();
            if (ctx.state === 'suspended') ctx.resume();

            // Create a buffer filled with white noise
            const bufferSize = ctx.sampleRate * durationSec;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }

            // Create noise source
            const noise = ctx.createBufferSource();
            noise.buffer = buffer;

            // Apply a bandpass filter to sound like clapping hands/cheers
            const filter = ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = 1200;
            filter.Q.value = 1.0;

            // Amplitude envelope to fade out applause
            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationSec);

            // Create multiple overlapping clap clicks to sound like a crowd
            for (let j = 0; j < 40; j++) {
                const clapTime = ctx.currentTime + Math.random() * (durationSec - 1.0);
                const clapOsc = ctx.createOscillator();
                const clapGain = ctx.createGain();
                
                clapOsc.type = 'triangle';
                clapOsc.frequency.setValueAtTime(150 + Math.random() * 200, clapTime);
                
                clapGain.gain.setValueAtTime(0.06, clapTime);
                clapGain.gain.exponentialRampToValueAtTime(0.001, clapTime + 0.08);
                
                clapOsc.connect(clapGain);
                clapGain.connect(ctx.destination);
                
                clapOsc.start(clapTime);
                clapOsc.stop(clapTime + 0.1);
            }

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);

            noise.start();
            noise.stop(ctx.currentTime + durationSec);
        } catch (e) {
            console.warn('Web Audio applause failed', e);
        }
    }

    private triggerFlash() {
        this.flashActive = true;
        setTimeout(() => {
            this.flashActive = false;
        }, 150);
    }

    closeReveal() {
        this.showPodiumReveal = false;
        this.revealStep = 0;
        this.isCountingDown = false;
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }
        this.stopBackgroundMusic();
        
        // Stop Europe audio track immediately
        if (this.audioEl) {
            try {
                this.audioEl.pause();
            } catch (e) {}
            this.audioEl = null;
        }
    }

    private stopBackgroundMusic() {
        if (this.musicInterval) {
            clearInterval(this.musicInterval);
        }
        this.musicNodes.forEach(node => {
            try {
                node.stop();
            } catch (e) {}
        });
        this.musicNodes = [];
    }

    getWinners(): { first: any, second: any, third: any } {
        let first: any = null;
        let second: any = null;
        let third: any = null;

        if (this.isGrupos) {
            first = this.participantes.find(p => p.final_rank === 1) || null;
            second = this.participantes.find(p => p.final_rank === 2) || null;
            third = this.participantes.find(p => p.final_rank === 3) || null;
        } else {
            // Standard Torneo is sorted by rank/points
            first = this.participantes[0] || null;
            second = this.participantes[1] || null;
            third = this.participantes[2] || null;
        }

        return { first, second, third };
    }

    private getAudioContext(): AudioContext {
        if (!this.audioCtx) {
            this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        return this.audioCtx;
    }

    private playSuspenseRiser(duration: number = 1.2) {
        try {
            const ctx = this.getAudioContext();
            if (ctx.state === 'suspended') ctx.resume();
            
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(100, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + duration);
            
            gain.gain.setValueAtTime(0.01, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + duration - 0.2);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.start();
            osc.stop(ctx.currentTime + duration);
        } catch (e) {
            console.warn('Audio synthesis not supported or blocked by browser policy', e);
        }
    }

    private playImpactSound(isGold: boolean = false) {
        try {
            const ctx = this.getAudioContext();
            if (ctx.state === 'suspended') ctx.resume();

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(isGold ? 150 : 100, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
            
            gain.gain.setValueAtTime(isGold ? 0.35 : 0.25, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
            
            const filter = ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = isGold ? 1000 : 600;
            filter.Q.value = 3.0;

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);
            
            osc.start();
            osc.stop(ctx.currentTime + 0.8);
        } catch (e) {
            console.warn(e);
        }
    }

    private playFanfareSound() {
        try {
            const ctx = this.getAudioContext();
            if (ctx.state === 'suspended') ctx.resume();

            const notes = [261.63, 329.63, 392.00, 523.25];
            const delays = [0, 0.15, 0.3, 0.45];
            
            notes.forEach((freq, index) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                
                osc.type = 'sine';
                osc.frequency.value = freq;
                
                const startTime = ctx.currentTime + delays[index];
                gain.gain.setValueAtTime(0, ctx.currentTime);
                gain.gain.setValueAtTime(0.15, startTime);
                gain.gain.exponentialRampToValueAtTime(0.001, startTime + 1.2);
                
                const lfo = ctx.createOscillator();
                const lfoGain = ctx.createGain();
                lfo.frequency.value = 8;
                lfoGain.gain.value = 5;
                lfo.connect(lfoGain);
                lfoGain.connect(osc.frequency);
                
                osc.connect(gain);
                gain.connect(ctx.destination);
                
                lfo.start(startTime);
                osc.start(startTime);
                
                lfo.stop(startTime + 1.2);
                osc.stop(startTime + 1.2);
            });
        } catch (e) {
            console.warn(e);
        }
    }

    private playMusicBeat() {
        try {
            const ctx = this.getAudioContext();
            if (ctx.state === 'suspended') ctx.resume();

            let beat = 0;
            const chords = [
                [261.63, 329.63, 392.00], // C Major
                [220.00, 261.63, 329.63], // A Minor
                [174.61, 220.00, 261.63], // F Major
                [196.00, 246.94, 293.66]  // G Major
            ];
            const bass = [65.41, 55.00, 43.65, 49.00];

            this.musicInterval = setInterval(() => {
                const chordIdx = Math.floor(beat / 4) % chords.length;
                const bassFreq = bass[chordIdx];
                const chordFreqs = chords[chordIdx];

                // Play bass note
                const bassOsc = ctx.createOscillator();
                const bassGain = ctx.createGain();
                bassOsc.type = 'triangle';
                bassOsc.frequency.setValueAtTime(bassFreq, ctx.currentTime);
                bassGain.gain.setValueAtTime(0.15, ctx.currentTime);
                bassGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
                bassOsc.connect(bassGain);
                bassGain.connect(ctx.destination);
                bassOsc.start();
                bassOsc.stop(ctx.currentTime + 0.5);
                this.musicNodes.push(bassOsc);

                // Play arpeggio note (one note of the chord per beat)
                const noteFreq = chordFreqs[beat % chordFreqs.length] * 2;
                const leadOsc = ctx.createOscillator();
                const leadGain = ctx.createGain();
                leadOsc.type = 'sine';
                leadOsc.frequency.setValueAtTime(noteFreq, ctx.currentTime);
                leadGain.gain.setValueAtTime(0.06, ctx.currentTime);
                leadGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
                leadOsc.connect(leadGain);
                leadGain.connect(ctx.destination);
                leadOsc.start();
                leadOsc.stop(ctx.currentTime + 0.3);
                this.musicNodes.push(leadOsc);

                beat++;
                
                // Keep memory clean
                if (this.musicNodes.length > 50) {
                    this.musicNodes = this.musicNodes.slice(-20);
                }
            }, 250); // 250ms loop
        } catch (e) {
            console.warn(e);
        }
    }

    private startSuspenseMusicLoop() {
        this.stopBackgroundMusic(); // clear any previous music
        try {
            const ctx = this.getAudioContext();
            if (ctx.state === 'suspended') ctx.resume();

            let beat = 0;
            this.musicInterval = setInterval(() => {
                // Heartbeat double pulse
                const timeOffsets = [0, 0.15];
                timeOffsets.forEach(offset => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(60, ctx.currentTime + offset);
                    
                    gain.gain.setValueAtTime(0.2, ctx.currentTime + offset);
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.12);
                    
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    
                    osc.start(ctx.currentTime + offset);
                    osc.stop(ctx.currentTime + offset + 0.15);
                    this.musicNodes.push(osc);
                });
                
                beat++;
                if (this.musicNodes.length > 50) {
                    this.musicNodes = this.musicNodes.slice(-20);
                }
            }, 600); // 100 BPM heartbeat
        } catch (e) {
            console.warn(e);
        }
    }
}
