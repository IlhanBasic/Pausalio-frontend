import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth.service';

@Component({
    selector: 'app-verify-email',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: './verify-email.component.html',
    styleUrls: ['./verify-email.component.css']
})
export class VerifyEmailComponent implements OnInit {

    loading = true;
    success = false;
    errorMessage = '';

    constructor(
        private route: ActivatedRoute,
        private authService: AuthService,
        private router: Router
    ) { }

    ngOnInit(): void {
        const token = this.route.snapshot.queryParamMap.get('token');
        const email = this.route.snapshot.queryParamMap.get('email');

        if (!token || !email) {
            this.errorMessage = 'Nije prosleđen token ili email.';
            this.loading = false;
            return;
        }

        this.authService.verifyEmail(token, email).subscribe({
            next: () => {
                this.success = true;
                this.loading = false;

                setTimeout(() => {
                    this.router.navigate(['/login']);
                }, 3000);
            },
            error: (err) => {
                console.log(err);

                try {
                    const parsed = typeof err.error === 'string' ? JSON.parse(err.error) : err.error;
                    this.errorMessage = parsed?.message ?? 'Došlo je do greške. Pokušajte ponovo.';
                } catch {
                    this.errorMessage = 'Došlo je do greške. Pokušajte ponovo.';
                }

                this.loading = false;
            }
        });
    }
}