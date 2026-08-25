import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule, NgIf, NgFor } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { SidebarService } from '../../services/sidebar.service';
import { environment } from '../../../environments/environment';
import { Chart, registerables } from 'chart.js';
import Swal from 'sweetalert2';

Chart.register(...registerables);

@Component({
    selector: 'app-admin-dashboard',
    standalone: true,
    imports: [CommonModule, FormsModule, NgIf, NgFor],
    templateUrl: './admin-dashboard.component.html',
    styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit, AfterViewInit {
    userId: number | null = null;
    adminNombre = 'Administrador';
    adminFoto: string | null = null;
    activeTab: 'resumen' | 'entrenadores' | 'analiticas' | 'config' | 'clubes' = 'resumen';
    isSidebarOpen = false;

    stats: any = null;
    isLoading = true;
    
    // New Analytics Properties
    socialStats: any = null;
    analyticsData: any[] = [];
    growthStats: any = null;

    // Filter properties
    coachSearchQuery = '';

    constructor(
        private http: HttpClient, 
        private router: Router,
        public sidebarService: SidebarService
    ) { }

    toggleSidebar() {
        this.isSidebarOpen = !this.isSidebarOpen;
    }

    getPlanName(id: number): string {
        const plans: { [key: number]: string } = {
            1: 'EMPRENDEDOR',
            2: 'INICIAL 20',
            3: 'PRO 40',
            4: 'ELITE'
        };
        return plans[id] || 'SIN PLAN';
    }

    get filteredEntrenadores() {
        let list = this.entrenadores;
        if (this.coachSearchQuery) {
            const query = this.coachSearchQuery.toLowerCase();
            list = this.entrenadores.filter(e => 
                (e.nombre && e.nombre.toLowerCase().includes(query)) || 
                (e.usuario && e.usuario.toLowerCase().includes(query))
            );
        }
        
        // Orden UX Experto: Mayor cantidad de alumnos primero, luego alfabéticamente
        return list.sort((a, b) => {
            const alumnosA = a.total_alumnos ? Number(a.total_alumnos) : 0;
            const alumnosB = b.total_alumnos ? Number(b.total_alumnos) : 0;
            
            if (alumnosB !== alumnosA) {
                return alumnosB - alumnosA;
            }
            // Si tienen los mismos alumnos, ordenar alfabéticamente
            return (a.nombre || '').localeCompare(b.nombre || '');
        });
    }

    switchTab(tab: any) {
        this.activeTab = tab;
        this.isSidebarOpen = false; // Cierra menú en móvil al navegar
        
        if (tab === 'resumen' || tab === 'analiticas') {
            setTimeout(() => this.renderCharts(), 200);
        }
        if (tab === 'entrenadores') {
            this.loadEntrenadores();
        }
        if (tab === 'clubes') {
            this.loadAllClubes();
        }
    }

    // Entrenadores
    entrenadores: any[] = [];
    loadingEntrenadores = false;
    selectedEntrenador: any = null;
    entrenadorStats: any = null;
    loadingStats = false;

    chartData: any = null;
    revenueChart: any;
    usersPacksChart: any;

    // Analytics Charts
    deviceChart: any;
    genderChart: any;
    regionChart: any;
    communeChart: any;
    trafficChart: any;

    selectedYear: number = new Date().getFullYear();
    selectedMonth: number = new Date().getMonth() + 1;

    years: number[] = [this.selectedYear - 1, this.selectedYear, this.selectedYear + 1];
    months = [
        { value: 1, label: 'Enero' }, { value: 2, label: 'Febrero' }, { value: 3, label: 'Marzo' },
        { value: 4, label: 'Abril' }, { value: 5, label: 'Mayo' }, { value: 6, label: 'Junio' },
        { value: 7, label: 'Julio' }, { value: 8, label: 'Agosto' }, { value: 9, label: 'Septiembre' },
        { value: 10, label: 'Octubre' }, { value: 11, label: 'Noviembre' }, { value: 12, label: 'Diciembre' }
    ];

    private apiUrl = environment.apiUrl;
    private getHeaders(): HttpHeaders {
        const token = localStorage.getItem('token');
        return new HttpHeaders({
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
        });
    }

    isBlocked = false;
    subMessage = '';

    ngOnInit(): void {
        this.userId = Number(localStorage.getItem('userId')) || 0;
        const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
        if (user && user.nombre) {
            this.adminNombre = user.nombre;
            this.adminFoto = user.foto_perfil || user.foto || null;
            if (this.adminFoto && !this.adminFoto.startsWith('http')) {
                this.adminFoto = `${environment.apiUrl.replace('/api_training', '')}/${this.adminFoto}`;
            }
        }

        this.checkSubStatus();
        this.loadStats();
    }

    checkSubStatus() {
        const coachId = localStorage.getItem('userId');
        const token = localStorage.getItem('token');
        const authValue = token ? `Bearer ${token}` : '';
        
        fetch(`${environment.apiUrl}/subscriptions/get_subscription_status.php?coach_id=${coachId}`, {
            headers: { 'Authorization': authValue, 'X-Authorization': authValue }
        })
        .then(r => r.json())
        .then(res => {
            if (res.status === 'blocked') {
                this.isBlocked = true;
                this.subMessage = res.message;
            }
        })
        .catch(err => console.error('Error sub check:', err));
    }

    goToBilling() {
        this.router.navigate(['/mi-plan']);
    }

    ngAfterViewInit() {
        this.loadChartData();
    }

    navigate(path: string) {
        this.router.navigate([path]);
    }

    navigateExternal(url: string) {
        window.open(url, '_blank');
    }

    // ===== STATS =====
    loadStats() {
        this.isLoading = true;
        this.http.get<any>(`${this.apiUrl}/admin/dashboard_stats.php?year=${this.selectedYear}&month=${this.selectedMonth}`, { headers: this.getHeaders() }).subscribe({
            next: (res) => {
                if (res.success) {
                    this.stats = res.data;
                    this.socialStats = res.data.social;
                    this.analyticsData = res.data.top_paginas;
                    this.growthStats = res.data.crecimiento;
                }
                setTimeout(() => {
                    this.isLoading = false;
                }, 500);
            },
            error: (err) => {
                console.error('Error fetching admin stats', err);
                this.isLoading = false;
            }
        });
    }

    // ===== CHARTS =====
    loadChartData() {
        this.isLoading = true;
        this.http.get<any>(`${this.apiUrl}/admin/dashboard_chart.php?year=${this.selectedYear}&month=${this.selectedMonth}`, { headers: this.getHeaders() }).subscribe({
            next: (res) => {
                this.isLoading = false;
                if (res.success) {
                    this.chartData = res;
                    setTimeout(() => {
                        this.renderCharts();
                    }, 550);
                }
            },
            error: (err) => {
                console.error('Error fetching chart data', err);
                this.isLoading = false;
            }
        });
    }

    onFilterChange() {
        this.loadChartData();
        this.loadStats();
    }

    renderCharts() {
        if (!this.chartData || !this.chartData.labels) return;

        if (this.revenueChart) this.revenueChart.destroy();
        if (this.usersPacksChart) this.usersPacksChart.destroy();

        const ctxRevenue = document.getElementById('revenueChart') as HTMLCanvasElement;
        const ctxUsersPacks = document.getElementById('usersPacksChart') as HTMLCanvasElement;

        if (ctxRevenue) {
            this.revenueChart = new Chart(ctxRevenue, {
                type: 'line',
                data: {
                    labels: this.chartData.labels,
                    datasets: [{
                        label: 'Ingresos Mensuales ($)',
                        data: this.chartData.datasets.ingresos,
                        borderColor: '#ccff00',
                        backgroundColor: 'rgba(204, 255, 0, 0.1)',
                        borderWidth: 4,
                        pointBackgroundColor: '#fff',
                        pointBorderColor: '#ccff00',
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: { 
                    responsive: true, 
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: { 
                            beginAtZero: true, 
                            grid: { color: 'rgba(0,0,0,0.03)' },
                            ticks: { font: { weight: 'bold' } }
                        },
                        x: { grid: { display: false } }
                    }
                }
            });
        }

        if (ctxUsersPacks) {
            this.usersPacksChart = new Chart(ctxUsersPacks, {
                type: 'bar',
                data: {
                    labels: this.chartData.labels,
                    datasets: [
                        {
                            label: 'Nuevos Usuarios',
                            data: this.chartData.datasets.usuarios,
                            backgroundColor: '#4a90e2',
                            borderRadius: 6
                        },
                        {
                            label: 'Packs Vendidos',
                            data: this.chartData.datasets.packs,
                            backgroundColor: '#ef4444',
                            borderRadius: 6
                        }
                    ]
                },
                options: { 
                    responsive: true, 
                    maintainAspectRatio: false,
                    scales: {
                        y: { grid: { color: 'rgba(0,0,0,0.03)' } },
                        x: { grid: { display: false } }
                    }
                }
            });
        }

        // --- NEW ANALYTICS CHARTS ---
        if (this.activeTab === 'analiticas' && this.stats) {
            // 1. Device Chart
            const ctxDevice = document.getElementById('deviceChart') as HTMLCanvasElement;
            if (ctxDevice) {
                if (this.deviceChart) this.deviceChart.destroy();
                this.deviceChart = new Chart(ctxDevice, {
                    type: 'doughnut',
                    data: {
                        labels: ['Mobile', 'PC'],
                        datasets: [{
                            data: [this.stats.dispositivos.Mobile, this.stats.dispositivos.PC],
                            backgroundColor: ['#ccff00', '#111'],
                            borderWidth: 0,
                            hoverOffset: 10
                        }]
                    },
                    options: { 
                        responsive: true, 
                        maintainAspectRatio: false, 
                        cutout: '70%',
                        plugins: { legend: { position: 'bottom', labels: { font: { weight: 'bold' }, padding: 20 } } } 
                    }
                });
            }

            // 2. Gender Chart
            const ctxGender = document.getElementById('genderChart') as HTMLCanvasElement;
            if (ctxGender) {
                if (this.genderChart) this.genderChart.destroy();
                this.genderChart = new Chart(ctxGender, {
                    type: 'doughnut',
                    data: {
                        labels: ['Hombres', 'Mujeres'],
                        datasets: [{
                            data: [this.stats.genero[0].count, this.stats.genero[1].count],
                            backgroundColor: ['#4a90e2', '#ef4444'],
                            borderWidth: 0,
                            hoverOffset: 10
                        }]
                    },
                    options: { 
                        responsive: true, 
                        maintainAspectRatio: false, 
                        cutout: '70%',
                        plugins: { legend: { position: 'bottom', labels: { font: { weight: 'bold' }, padding: 20 } } } 
                    }
                });
            }

            // 3. Region Chart
            const ctxRegion = document.getElementById('regionChart') as HTMLCanvasElement;
            if (ctxRegion) {
                if (this.regionChart) this.regionChart.destroy();
                this.regionChart = new Chart(ctxRegion, {
                    type: 'bar',
                    data: {
                        labels: this.stats.regiones.map((r: any) => r.region),
                        datasets: [{
                            label: 'Usuarios por Región',
                            data: this.stats.regiones.map((r: any) => r.count),
                            backgroundColor: '#ccff00',
                            borderRadius: 6
                        }]
                    },
                    options: { 
                        indexAxis: 'y', 
                        responsive: true, 
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: { x: { grid: { display: false } }, y: { grid: { display: false } } }
                    }
                });
            }

            // 4. Commune Chart
            const ctxCommune = document.getElementById('communeChart') as HTMLCanvasElement;
            if (ctxCommune && this.stats.comunas) {
                if (this.communeChart) this.communeChart.destroy();
                this.communeChart = new Chart(ctxCommune, {
                    type: 'bar',
                    data: {
                        labels: this.stats.comunas.map((c: any) => c.comuna),
                        datasets: [{
                            label: 'Usuarios por Comuna',
                            data: this.stats.comunas.map((c: any) => c.count),
                            backgroundColor: '#4a90e2',
                            borderRadius: 6
                        }]
                    },
                    options: { 
                        indexAxis: 'y', 
                        responsive: true, 
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: { x: { grid: { display: false } }, y: { grid: { display: false } } }
                    }
                });
            }

            // 5. Daily Traffic Chart
            const ctxTraffic = document.getElementById('trafficChart') as HTMLCanvasElement;
            if (ctxTraffic && this.chartData && this.chartData.datasets && this.chartData.datasets.trafico) {
                if (this.trafficChart) this.trafficChart.destroy();
                this.trafficChart = new Chart(ctxTraffic, {
                    type: 'bar',
                    data: {
                        labels: this.chartData.labels,
                        datasets: [{
                            label: 'Visitas Diarias',
                            data: this.chartData.datasets.trafico,
                            backgroundColor: 'rgba(204, 255, 0, 0.4)',
                            borderColor: '#ccff00',
                            borderWidth: 2,
                            borderRadius: 6
                        }]
                    },
                    options: { 
                        responsive: true, 
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                            y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.03)' } },
                            x: { grid: { display: false } }
                        }
                    }
                });
            }
        }
    }

    // ===== ENTRENADORES =====
    loadEntrenadores() {
        if (this.entrenadores.length > 0) return; // already loaded
        this.loadingEntrenadores = true;
        this.http.get<any>(`${this.apiUrl}/admin/get_entrenadores.php`, { headers: this.getHeaders() }).subscribe({
            next: (res) => {
                this.loadingEntrenadores = false;
                if (res.success) {
                    this.entrenadores = res.data || [];
                    // Fix photo URLs
                    this.entrenadores.forEach(e => {
                        if (e.foto_perfil && !e.foto_perfil.startsWith('http')) {
                            e.foto_perfil = `${this.apiUrl.replace('/api_training', '')}/${e.foto_perfil}`;
                        }
                    });
                    
                    // Auto-select first trainer if none selected
                    if (this.entrenadores.length > 0 && !this.selectedEntrenador) {
                        this.verDetalle(this.entrenadores[0]);
                    }
                } else {
                    this.entrenadores = [];
                }
            },
            error: (err) => {
                this.loadingEntrenadores = false;
                console.error('Error loading entrenadores', err);
            }
        });
    }

    verDetalle(e: any) {
        this.selectedEntrenador = e;
        this.loadingStats = true;
        this.entrenadorStats = null;
        
        this.http.get<any>(`${this.apiUrl}/admin/get_entrenador_stats.php?entrenador_id=${e.id}`, { headers: this.getHeaders() }).subscribe({
            next: (res) => {
                this.loadingStats = false;
                if (res.success) {
                    this.entrenadorStats = res.data;
                    // Actualizar el objeto e con datos frescos si es necesario
                    this.selectedEntrenador.mp_collector_id = res.data.trainer.mp_collector_id;
                    this.selectedEntrenador.email = res.data.trainer.email;
                }
            },
            error: (err) => {
                this.loadingStats = false;
                console.error('Error loading trainer stats', err);
            }
        });
    }

    enviarBienvenida(e: any) {
        Swal.fire({
            title: '¿Enviar correo de bienvenida?',
            text: `Se enviará un correo a ${e.usuario || e.email} con la invitación a la reunión explicativa.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, enviar ahora',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#ccff00',
            cancelButtonColor: '#ff4d4d',
            background: '#111',
            color: '#fff'
        }).then((result) => {
            if (result.isConfirmed) {
                Swal.fire({
                    title: 'Enviando...',
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });

                this.http.post<any>(`${this.apiUrl}/admin/send_welcome_email.php`, {
                    entrenador_id: e.id
                }, { headers: this.getHeaders() }).subscribe({
                    next: (res) => {
                        if (res.success) {
                            Swal.fire('¡Enviado!', res.message, 'success');
                        } else {
                            Swal.fire('Error', res.error, 'error');
                        }
                    },
                    error: (err) => {
                        console.error('Error enviando bienvenida:', err);
                        Swal.fire('Error', 'No se pudo enviar el correo en este momento.', 'error');
                    }
                });
            }
        });
    }

    enviarReactivacion(e: any) {
        Swal.fire({
            title: '¿Enviar Reactivación?',
            text: `Se enviará un correo a ${e.usuario || e.email} con estrategias para conseguir su primer alumno y comenzar en la plataforma.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, enviar Reactivación',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#ff5e00',
            cancelButtonColor: '#ff4d4d',
            background: '#111',
            color: '#fff'
        }).then((result) => {
            if (result.isConfirmed) {
                Swal.fire({
                    title: 'Enviando...',
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });

                this.http.post<any>(`${this.apiUrl}/admin/send_reactivation_email.php`, {
                    entrenador_id: e.id
                }, { headers: this.getHeaders() }).subscribe({
                    next: (res) => {
                        if (res.success) {
                            Swal.fire('¡Enviado!', res.message, 'success');
                        } else {
                            Swal.fire('Error', res.error, 'error');
                        }
                    },
                    error: (err) => {
                        console.error('Error enviando reactivación:', err);
                        Swal.fire('Error', 'No se pudo enviar el correo en este momento.', 'error');
                    }
                });
            }
        });
    }

    enviarIncentivoPacks(e: any) {
        Swal.fire({
            title: '¿Enviar incentivo de Packs?',
            text: `Se enviará un correo a ${e.usuario || e.email} recordándole crear sus packs de clases.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, enviar ahora',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#ccff00',
            cancelButtonColor: '#ff4d4d',
            background: '#111',
            color: '#fff'
        }).then((result) => {
            if (result.isConfirmed) {
                Swal.fire({
                    title: 'Enviando...',
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });

                this.http.post<any>(`${this.apiUrl}/admin/send_no_packs_email.php`, {
                    entrenador_id: e.id
                }, { headers: this.getHeaders() }).subscribe({
                    next: (res) => {
                        if (res.success) {
                            Swal.fire('¡Enviado!', res.message, 'success');
                        } else {
                            Swal.fire('Error', res.error, 'error');
                        }
                    },
                    error: (err) => {
                        console.error('Error enviando correo de packs:', err);
                        Swal.fire('Error', 'No se pudo enviar el correo en este momento.', 'error');
                    }
                });
            }
        });
    }

    enviarIncentivoDisponibilidad(e: any) {
        Swal.fire({
            title: '¿Enviar incentivo de Agenda?',
            text: `Se enviará un correo a ${e.usuario || e.email} recordándole configurar su disponibilidad semanal.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, enviar ahora',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#ccff00',
            cancelButtonColor: '#ff4d4d',
            background: '#111',
            color: '#fff'
        }).then((result) => {
            if (result.isConfirmed) {
                Swal.fire({
                    title: 'Enviando...',
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });

                this.http.post<any>(`${this.apiUrl}/admin/send_no_availability_email.php`, {
                    entrenador_id: e.id
                }, { headers: this.getHeaders() }).subscribe({
                    next: (res) => {
                        if (res.success) {
                            Swal.fire('¡Enviado!', res.message, 'success');
                        } else {
                            Swal.fire('Error', res.error, 'error');
                        }
                    },
                    error: (err) => {
                        console.error('Error enviando correo de disponibilidad:', err);
                        Swal.fire('Error', 'No se pudo enviar el correo en este momento.', 'error');
                    }
                });
            }
        });
    }

    enviarIncentivoMercadoPago(e: any) {
        Swal.fire({
            title: '¿Enviar incentivo de Mercado Pago?',
            text: `Se enviará un correo a ${e.usuario || e.email} recordándole conectar su cuenta de Mercado Pago.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, enviar ahora',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#ccff00',
            cancelButtonColor: '#ff4d4d',
            background: '#111',
            color: '#fff'
        }).then((result) => {
            if (result.isConfirmed) {
                Swal.fire({
                    title: 'Enviando...',
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });

                this.http.post<any>(`${this.apiUrl}/admin/send_no_mp_email.php`, {
                    entrenador_id: e.id
                }, { headers: this.getHeaders() }).subscribe({
                    next: (res) => {
                        if (res.success) {
                            Swal.fire('¡Enviado!', res.message, 'success');
                        } else {
                            Swal.fire('Error', res.error, 'error');
                        }
                    },
                    error: (err) => {
                        console.error('Error enviando correo de Mercado Pago:', err);
                        Swal.fire('Error', 'No se pudo enviar el correo en este momento.', 'error');
                    }
                });
            }
        });
    }

    getWhatsAppLink(phone: string, message: string): string {
        if (!phone) return '';
        let cleanPhone = phone.replace(/\D/g, '');
        // If it starts with 9 and has 9 digits, add 56 (Chile country code)
        if (cleanPhone.length === 9 && cleanPhone.startsWith('9')) {
            cleanPhone = '56' + cleanPhone;
        }
        return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    }

    enviarWABienvenida(e: any) {
        const message = `¡Hola ${e.nombre}! Bienvenido a OverDrive. Soy Emmanuel Villar. Vi que creaste tu cuenta de academia. ¿Te tinca si agendamos una videollamada corta de 10 min para dejarte configurada tu cuenta con tus packs de clases y agenda? Me avisas y coordinamos!`;
        const link = this.getWhatsAppLink(e.telefono, message);
        if (link) {
            window.open(link, '_blank');
        } else {
            Swal.fire('Error', 'El entrenador no tiene un teléfono válido registrado.', 'error');
        }
    }

    enviarWAPacks(e: any) {
        const message = `¡Hola ${e.nombre}! Espero que estés súper bien. Vi que ya tienes tu cuenta en OverDrive pero aún no creas tu primer Pack de Clases. Recuerda que para que tus alumnos te reserven, debes tener un pack activo. Si quieres, envíame los precios y sesiones por aquí y te los configuro yo mismo en 3 minutos!`;
        const link = this.getWhatsAppLink(e.telefono, message);
        if (link) {
            window.open(link, '_blank');
        } else {
            Swal.fire('Error', 'El entrenador no tiene un teléfono válido registrado.', 'error');
        }
    }

    enviarWADisponibilidad(e: any) {
        const message = `¡Hola ${e.nombre}! ¿Cómo va todo? Vi que tienes tus packs listos en OverDrive pero aún no tienes horarios de disponibilidad configurados en tu agenda. Tus alumnos no podrán ver tus horas libres si no las abres. ¿Quieres que te ayude a configurarla hoy mismo? Envíame tus horarios por aquí!`;
        const link = this.getWhatsAppLink(e.telefono, message);
        if (link) {
            window.open(link, '_blank');
        } else {
            Swal.fire('Error', 'El entrenador no tiene un teléfono válido registrado.', 'error');
        }
    }

    enviarWAMercadoPago(e: any) {
        const message = `¡Hola ${e.nombre}! Estaba revisando tu academia en OverDrive. Veo que aún no conectas tu cuenta de Mercado Pago para los cobros automáticos. Esto es súper importante para que tus alumnos te paguen directo con tarjetas al reservar y te olvides de revisar transferencias. Si tienes dudas de cómo conectarlo, avísame y lo hacemos juntos!`;
        const link = this.getWhatsAppLink(e.telefono, message);
        if (link) {
            window.open(link, '_blank');
        } else {
            Swal.fire('Error', 'El entrenador no tiene un teléfono válido registrado.', 'error');
        }
    }

    toggleTransbank(e: any) {
        e.transbank_activo = e.transbank_activo == 1 ? 0 : 1;
        this.updateEntrenadorConfig(e);
    }


    toggleComision(e: any) {
        e.comision_activa = e.comision_activa == 1 ? 0 : 1;
        this.updateEntrenadorConfig(e);
    }

    updateComision(e: any) {
        this.updateEntrenadorConfig(e);
    }

    updateEntrenadorConfig(e: any) {
        this.http.post<any>(`${this.apiUrl}/admin/update_entrenador_config.php`, {
            entrenador_id: e.id,
            transbank_activo: e.transbank_activo,
            comision_activa: e.comision_activa,
            comision_porcentaje: e.comision_porcentaje,
            mp_collector_id: e.mp_collector_id
        }, { headers: this.getHeaders() }).subscribe({

            next: () => { },
            error: (err) => console.error('Error updating config', err)
        });
    }

    verDatosBancarios(e: any) {
        Swal.fire({
            title: `Configuración de Pagos - ${e.nombre}`,
            html: `
                <div style="text-align: left; font-size: 14px; line-height: 2;">
                    <p style="color: #64748b; margin-bottom: 15px;">Vincular cuenta de Mercado Pago para split automático.</p>
                    <label style="font-weight: 700;">Mercado Pago Collector ID</label>
                    <input id="swal-mp-id" class="swal2-input" value="${e.mp_collector_id || ''}" placeholder="Ej: 12345678" style="width:100%; margin: 4px 0 10px 0;">
                </div>
            `,

            confirmButtonText: 'Guardar',
            showCancelButton: true,
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#111',
            preConfirm: () => {
                const mpId = (document.getElementById('swal-mp-id') as HTMLInputElement).value;
                return { mp_collector_id: mpId };
            }
        }).then((result) => {
            if (result.isConfirmed && result.value) {
                const data = result.value;
                e.mp_collector_id = data.mp_collector_id;
                this.updateEntrenadorConfig(e);
                Swal.fire({ icon: 'success', title: 'Guardado', text: 'Configuración de pagos actualizada.', timer: 1500 });
            }
        });
    }


    // ===== CLUBES (SUPER ADMIN) =====
    allClubes: any[] = [];
    loadingClubes = false;

    loadAllClubes() {
        this.loadingClubes = true;
        this.http.get<any[]>(`${this.apiUrl}/clubes/get_clubes.php`, { headers: this.getHeaders() }).subscribe({
            next: (res) => {
                this.allClubes = res;
                this.loadingClubes = false;
            },
            error: (err) => {
                console.error('Error loading all clubs', err);
                this.loadingClubes = false;
            }
        });
    }

    toggleClubModule(club: any, type: 'reservas' | 'academia') {
        const payload = { ...club };
        if (type === 'reservas') {
            payload.reservas_activas = club.reservas_activas == 1 ? 0 : 1;
        } else {
            payload.academia_activa = club.academia_activa == 1 ? 0 : 1;
        }

        this.http.post<any>(`${this.apiUrl}/clubes/update_club.php`, payload, { headers: this.getHeaders() }).subscribe({
            next: (res) => {
                if (res.success) {
                    club.reservas_activas = payload.reservas_activas;
                    club.academia_activa = payload.academia_activa;
                    const Toast = Swal.mixin({
                        toast: true,
                        position: 'top-end',
                        showConfirmButton: false,
                        timer: 2000,
                        timerProgressBar: true
                    });
                    Toast.fire({
                        icon: 'success',
                        title: 'Módulo actualizado'
                    });
                }
            },
            error: (err) => {
                console.error('Error toggling club module', err);
                Swal.fire('Error', 'No se pudo actualizar el módulo', 'error');
            }
        });
    }

    logout() {
        localStorage.clear();
        this.router.navigate(['/login']);
    }
}
