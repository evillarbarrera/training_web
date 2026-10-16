import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { AnalyticsService } from '../../services/analytics.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-register',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './register.component.html',
    styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
    nombre = '';
    email = '';
    password = '';
    confirmPassword = '';
    rol = 'jugador'; // Default role
    showPassword = false;
    showConfirmPassword = false;
    acceptTerms = false;
    acceptMarketing = false;
    isLoading = false;
    error = '';

    constructor(
        private apiService: ApiService,
        private authService: AuthService,
        private analyticsService: AnalyticsService,
        private router: Router
    ) { }

    selectRole(r: string): void {
        this.rol = r;
    }

    togglePasswordVisibility(): void {
        this.showPassword = !this.showPassword;
    }

    toggleConfirmPasswordVisibility(): void {
        this.showConfirmPassword = !this.showConfirmPassword;
    }

    handleKeyPress(event: KeyboardEvent): void {
        if (event.key === 'Enter') {
            this.register();
        }
    }

    register(): void {
        if (!this.nombre || !this.email || !this.password || !this.confirmPassword) {
            this.error = 'Todos los campos son obligatorios';
            return;
        }

        if (this.password !== this.confirmPassword) {
            this.error = 'Las contraseñas no coinciden';
            return;
        }

        if (!this.acceptTerms) {
            this.error = 'Debes aceptar los Términos y Condiciones y la Política de Privacidad para registrarte';
            return;
        }

        this.isLoading = true;
        this.error = '';

        const userData = {
            nombre: this.nombre,
            email: this.email,
            password: this.password,
            rol: this.rol,
            accept_terms: this.acceptTerms,
            accept_marketing: this.acceptMarketing
        };

        this.apiService.register(userData).subscribe({
            next: (response: any) => {
                if (response.success) {
                    // Extract user data from response
                    const user = response.usuario;

                    // Auto login after register - sync both services
                    this.authService.setCurrentUser(user);
                    this.apiService.setCurrentUser(user);

                    // Trackear evento en Analytics
                    this.analyticsService.trackEvent('sign_up', { 
                        method: 'email', 
                        rol: this.rol 
                    });

                    // Redirige según el rol
                    const role = (user.rol || '').toLowerCase();
                    if (role.includes('administrador') || role.includes('admin')) {
                        this.router.navigate(['/admin-club']);
                    } else if (role.includes('entrenador')) {
                        this.router.navigate(['/entrenador-home']);
                    } else if (role.includes('jugador') || role.includes('alumno')) {
                        this.router.navigate(['/jugador-home']);
                    } else {
                        this.router.navigate(['/']);
                    }
                } else {
                    this.error = response.error || 'Error al registrarse';
                }
                this.isLoading = false;
            },
            error: (err) => {
                console.error('Register error:', err);
                this.error = err.error?.error || 'Error al registrarse. Inténtalo de nuevo.';
                this.isLoading = false;
            }
        });
    }

    goToLogin(): void {
        this.router.navigate(['/login']);
    }

    openTerms(event: Event): void {
        event.preventDefault();
        event.stopPropagation();
        Swal.fire({
            title: 'Términos y Condiciones',
            html: `
                <div style="text-align: left; font-size: 0.9rem; max-height: 350px; overflow-y: auto; color: #cbd5e1; line-height: 1.5;">
                    <p><strong>1. Aceptación del Servicio:</strong> Al registrarte en PadelBlox, aceptas hacer un uso responsable de las canchas, reservas y servicios deportivos ofrecidos por los clubes afiliados.</p>
                    <p style="margin-top: 10px;"><strong>2. Reservas y Cancelaciones:</strong> Las reservas de canchas y clases están sujetas a las políticas de cancelación de cada club o entrenador particular.</p>
                    <p style="margin-top: 10px;"><strong>3. Conducta Deportiva:</strong> Se exige respeto mutuo entre jugadores, árbitros y personal del club en todas las instancias de partidos y torneos.</p>
                    <p style="margin-top: 10px;"><strong>4. Propiedad Intelectual:</strong> Todos los derechos de marca, software y contenidos pertenecen a PadelBlox SpA.</p>
                </div>
            `,
            confirmButtonText: 'Entendido',
            confirmButtonColor: '#ccff00',
            background: '#0f172a',
            color: '#f8fafc',
            customClass: {
                confirmButton: 'swal-btn-volt'
            }
        });
    }

    openPrivacy(event: Event): void {
        event.preventDefault();
        event.stopPropagation();
        Swal.fire({
            title: 'Política de Privacidad',
            html: `
                <div style="text-align: left; font-size: 0.9rem; max-height: 350px; overflow-y: auto; color: #cbd5e1; line-height: 1.5;">
                    <p><strong>Ley N° 19.628 (Protección de Datos Personales):</strong></p>
                    <p style="margin-top: 8px;">Tus datos personales (nombre, correo electrónico y estadísticas de juego) son almacenados de forma segura y utilizados únicamente para:</p>
                    <ul style="margin-left: 20px; margin-top: 6px;">
                        <li>Gestionar tus reservas y partidos en los clubes.</li>
                        <li>Sincronizar tus estadísticas de juego y torneos.</li>
                        <li>Notificarte sobre el estado de tus partidos si así lo autorizas.</li>
                    </ul>
                    <p style="margin-top: 10px;">En ningún caso tus datos serán vendidos a terceros.</p>
                </div>
            `,
            confirmButtonText: 'Entendido',
            confirmButtonColor: '#ccff00',
            background: '#0f172a',
            color: '#f8fafc',
            customClass: {
                confirmButton: 'swal-btn-volt'
            }
        });
    }
}
