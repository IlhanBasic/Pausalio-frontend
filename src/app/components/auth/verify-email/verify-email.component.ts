import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../../services/auth.service';

@Component({
    selector: 'app-verify-email',
    standalone: true,
    imports: [CommonModule, RouterLink, TranslateModule],
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
        private router: Router,
        private translate: TranslateService
    ) { }

    ngOnInit(): void {
        const token = this.route.snapshot.queryParamMap.get('token');
        const email = this.route.snapshot.queryParamMap.get('email');

        if (!token || !email) {
            this.errorMessage = this.translate.instant('VERIFY_EMAIL.ERROR.MISSING_PARAMS');
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
                try {
                    const parsed = typeof err.error === 'string' ? JSON.parse(err.error) : err.error;
                    this.errorMessage = parsed?.message ?? this.translate.instant('VERIFY_EMAIL.ERROR.DEFAULT_MESSAGE');
                } catch {
                    this.errorMessage = this.translate.instant('VERIFY_EMAIL.ERROR.DEFAULT_MESSAGE');
                }

                this.loading = false;
            }
        });
    }
}