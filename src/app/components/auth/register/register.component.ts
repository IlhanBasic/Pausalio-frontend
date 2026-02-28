import { Component, inject, OnInit, signal } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth.service';
import { ActivityCodeService } from '../../../services/activity-code.service';
import { FileService } from '../../../services/file.service';
import { ActivityCodeToReturnDto } from '../../../models/activity-code';
import { RegisterOwnerDto, RegisterAssistantDto } from '../../../models/user-profile';
import { CityService } from '../../../services/city.service';
import { CityToReturnDto } from '../../../models/city';
import { forkJoin } from 'rxjs';

@Component({
    selector: 'app-register',
    standalone: true,
    imports: [ReactiveFormsModule, CommonModule, RouterLink],
    templateUrl: './register.component.html',
    styleUrl: './register.component.css'
})
export class RegisterComponent implements OnInit {
    fb = inject(FormBuilder);
    authService = inject(AuthService);
    activityService = inject(ActivityCodeService);
    cityService = inject(CityService);
    fileService = inject(FileService);
    router = inject(Router);
    toastr = inject(ToastrService);

    isOwner = signal(true);
    isLoading = signal(false);
    activityCodes = signal<ActivityCodeToReturnDto[]>([]);
    cities = signal<CityToReturnDto[]>([]);
    filteredCities = signal<CityToReturnDto[]>([]);
    filteredBusinessCities = signal<CityToReturnDto[]>([]);
    showCityDropdown = signal(false);
    showBusinessCityDropdown = signal(false);
    showPassword = signal(false);

    profilePictureFile = signal<File | null>(null);
    companyLogoFile = signal<File | null>(null);
    profilePicturePreview = signal<string | null>(null);
    companyLogoPreview = signal<string | null>(null);

    passwordValidators = [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()\-+={}[\];:'"<>.,?/\\|])/)
    ];

    ownerForm = this.fb.group({
        // User fields
        firstName: ['', [Validators.required, Validators.maxLength(50)]],
        lastName: ['', [Validators.required, Validators.maxLength(50)]],
        email: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
        password: ['', this.passwordValidators],
        phone: ['', [Validators.pattern(/^[\+]?[0-9\s\-\(\)]{6,15}$/)]],
        city: ['', Validators.required],
        address: ['', [Validators.required, Validators.maxLength(200)]],
        // Business fields
        businessName: ['', [Validators.required, Validators.maxLength(200)]],
        PIB: ['', [Validators.required, Validators.pattern(/^\d{9}$/)]],
        MB: ['', [Validators.pattern(/^\d{8}$/)]],
        activityCodeId: ['', Validators.required],
        businessCity: ['', Validators.required],
        businessAddress: ['', [Validators.required, Validators.maxLength(200)]],
        businessEmail: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
        businessPhone: ['', [Validators.pattern(/^[\+]?[0-9\s\-\(\)]{6,15}$/)]],
        website: ['', [Validators.pattern(/^(https?:\/\/)?([\w\-]+\.)+[\w\-]+(\/[\w\-._~:/?#[\]@!$&'()*+,;=]*)?$/)]]
    });

    assistantForm = this.fb.group({
        firstName: ['', [Validators.required, Validators.maxLength(50)]],
        lastName: ['', [Validators.required, Validators.maxLength(50)]],
        email: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
        password: ['', this.passwordValidators],
        phone: ['', [Validators.pattern(/^[\+]?[0-9\s\-\(\)]{6,15}$/)]],
        city: ['', Validators.required],
        address: ['', [Validators.required, Validators.maxLength(200)]],
        inviteToken: ['', Validators.required]
    });

    // Mapiranje backend polja na srpske poruke
    private fieldMessages: Record<string, string> = {
        'User.FirstName': 'Ime',
        'User.LastName': 'Prezime',
        'User.Email': 'Email adresa',
        'User.Password': 'Lozinka',
        'User.Phone': 'Telefon',
        'User.City': 'Grad',
        'User.Address': 'Adresa',
        'Business.BusinessName': 'Naziv firme',
        'Business.PIB': 'PIB',
        'Business.MB': 'Matični broj',
        'Business.Email': 'Email firme',
        'Business.Phone': 'Telefon firme',
        'Business.Website': 'Website',
        'Business.Address': 'Adresa firme',
        'Business.ActivityCodeId': 'Šifra delatnosti',
        'InviteToken': 'Token za pozivnicu',
    };

    get activeForm(): FormGroup {
        return this.isOwner() ? this.ownerForm : this.assistantForm;
    }

    getControl(controlName: string): AbstractControl | null {
        return this.activeForm.get(controlName);
    }

    ngOnInit() {
        this.loadActivityCodes();
        this.loadCities();
    }

    loadActivityCodes() {
        this.activityService.getAll().subscribe({
            next: (res) => this.activityCodes.set(res || []),
            error: (err) => {
                console.error('Error loading activity codes:', err);
                this.toastr.error('Greška pri učitavanju šifara delatnosti', 'Greška');
            }
        });
    }

    loadCities() {
        this.cityService.getAll().subscribe({
            next: (res) => {
                this.cities.set(res || []);
                this.filteredCities.set(res || []);
                this.filteredBusinessCities.set(res || []);
            },
            error: (err) => {
                console.error('Error loading cities:', err);
                this.toastr.error('Greška pri učitavanju gradova', 'Greška');
            }
        });
    }

    onCityInput(event: Event, type: 'user' | 'business') {
        const input = event.target as HTMLInputElement;
        const value = input.value.toLowerCase();

        if (type === 'user') {
            this.showCityDropdown.set(true);
            this.filteredCities.set(this.cities().filter(c => c.name.toLowerCase().includes(value)));
        } else {
            this.showBusinessCityDropdown.set(true);
            this.filteredBusinessCities.set(this.cities().filter(c => c.name.toLowerCase().includes(value)));
        }
    }

    selectCity(city: CityToReturnDto, type: 'user' | 'business') {
        if (type === 'user') {
            this.activeForm.get('city')?.setValue(city.name);
            this.showCityDropdown.set(false);
        } else {
            this.ownerForm.get('businessCity')?.setValue(city.name);
            this.showBusinessCityDropdown.set(false);
        }
    }

    closeDropdown(type: 'user' | 'business') {
        setTimeout(() => {
            if (type === 'user') this.showCityDropdown.set(false);
            else this.showBusinessCityDropdown.set(false);
        }, 200);
    }

    setRole(isOwner: boolean) {
        this.isOwner.set(isOwner);
    }

    togglePasswordVisibility() {
        this.showPassword.set(!this.showPassword());
    }

    onProfilePictureSelect(event: any) {
        const file = event.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            this.toastr.error('Fajl mora biti slika (jpg, png, gif, ...).', 'Greška');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            this.toastr.error('Fajl ne sme biti veći od 10MB', 'Greška');
            event.target.value = '';
            this.profilePictureFile.set(null);
            this.profilePicturePreview.set(null);
            return;
        }
        this.profilePictureFile.set(file);
        const reader = new FileReader();
        reader.onload = (e: any) => this.profilePicturePreview.set(e.target.result);
        reader.readAsDataURL(file);
    }

    onCompanyLogoSelect(event: any) {
        const file = event.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            this.toastr.error('Fajl mora biti slika (jpg, png, gif, ...).', 'Greška');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            this.toastr.error('Fajl ne sme biti veći od 10MB', 'Greška');
            event.target.value = '';
            this.companyLogoFile.set(null);
            this.companyLogoPreview.set(null);
            return;
        }
        this.companyLogoFile.set(file);
        const reader = new FileReader();
        reader.onload = (e: any) => this.companyLogoPreview.set(e.target.result);
        reader.readAsDataURL(file);
    }

    // Parsira Fluent Validation errors objekat i prikazuje toastr za svaki
    private handleBackendErrors(err: any): void {
        const errors = err?.error?.errors;

        if (errors && typeof errors === 'object') {
            const messages: string[] = [];

            Object.entries(errors).forEach(([field, msgs]) => {
                const fieldLabel = this.fieldMessages[field] || field;
                const msgArray = Array.isArray(msgs) ? msgs : [msgs];
                msgArray.forEach((msg: any) => {
                    messages.push(`${fieldLabel}: ${msg}`);
                });
            });

            if (messages.length > 0) {
                // Prikaži svaku grešku kao poseban toast
                messages.forEach(msg => this.toastr.error(msg, 'Greška validacije'));
                return;
            }
        }

        // Fallback na generičku poruku
        const fallback = err?.error?.message || err?.error?.title || 'Greška pri registraciji.';
        this.toastr.error(fallback, 'Greška');
    }

    onSubmit() {
        if (this.activeForm.invalid) {
            this.activeForm.markAllAsTouched();
            this.showFrontendValidationErrors();
            return;
        }

        this.isLoading.set(true);

        if (this.isOwner()) {
            this.registerOwner();
        } else {
            this.registerAssistant();
        }
    }

    // Prikazuje frontend validacione greške kao toastr pre slanja na backend
    private showFrontendValidationErrors(): void {
        const form = this.activeForm;
        const fieldLabels: Record<string, string> = {
            firstName: 'Ime',
            lastName: 'Prezime',
            email: 'Email adresa',
            password: 'Lozinka',
            phone: 'Telefon',
            city: 'Grad',
            address: 'Adresa',
            businessName: 'Naziv firme',
            PIB: 'PIB (mora biti 9 cifara)',
            MB: 'Matični broj (mora biti 8 cifara)',
            activityCodeId: 'Šifra delatnosti',
            businessCity: 'Grad firme',
            businessAddress: 'Adresa firme',
            businessEmail: 'Email firme',
            businessPhone: 'Telefon firme',
            website: 'Website (mora biti validan URL, npr. https://example.com)',
            inviteToken: 'Token za pozivnicu',
        };

        Object.keys(form.controls).forEach(key => {
            const control = form.get(key);
            if (control?.invalid) {
                const label = fieldLabels[key] || key;
                if (control.errors?.['required']) {
                    this.toastr.warning(`${label} je obavezno polje`, 'Nepotpuna forma');
                } else if (control.errors?.['pattern']) {
                    this.toastr.warning(`${label} nije u ispravnom formatu`, 'Nepotpuna forma');
                } else if (control.errors?.['email']) {
                    this.toastr.warning(`${label} nije ispravna email adresa`, 'Nepotpuna forma');
                } else if (control.errors?.['maxlength']) {
                    this.toastr.warning(`${label} je predugačko`, 'Nepotpuna forma');
                } else if (control.errors?.['minlength']) {
                    this.toastr.warning(`${label} je prekratko`, 'Nepotpuna forma');
                }
            }
        });
    }

    private registerOwner() {
        const val = this.ownerForm.value;
        const uploads: any[] = [];

        if (this.profilePictureFile()) uploads.push(this.fileService.uploadFile(this.profilePictureFile()!));
        if (this.companyLogoFile()) uploads.push(this.fileService.uploadFile(this.companyLogoFile()!));

        if (uploads.length > 0) {
            forkJoin(uploads).subscribe({
                next: (responses: any[]) => {
                    let profilePictureUrl = null;
                    let companyLogoUrl = null;

                    if (this.profilePictureFile() && this.companyLogoFile()) {
                        profilePictureUrl = responses[0].url;
                        companyLogoUrl = responses[1].url;
                    } else if (this.profilePictureFile()) {
                        profilePictureUrl = responses[0].url;
                    } else if (this.companyLogoFile()) {
                        companyLogoUrl = responses[0].url;
                    }

                    this.submitOwnerRegistration(val, profilePictureUrl, companyLogoUrl);
                },
                error: (err) => {
                    this.toastr.error('Greška pri upload-u slika: ' + (err.error?.message || 'Nepoznata greška'), 'Greška');
                    this.isLoading.set(false);
                }
            });
        } else {
            this.submitOwnerRegistration(val, null, null);
        }
    }

    private submitOwnerRegistration(val: any, profilePictureUrl: string | null, companyLogoUrl: string | null) {
        const dto: RegisterOwnerDto = {
            user: {
                firstName: val.firstName!,
                lastName: val.lastName!,
                email: val.email!,
                password: val.password!,
                city: val.city!,
                address: val.address!,
                phone: val.phone || null,
                profilePicture: profilePictureUrl
            },
            business: {
                businessName: val.businessName!,
                PIB: val.PIB!,
                MB: val.MB || undefined,
                activityCodeId: val.activityCodeId!,
                city: val.businessCity!,
                address: val.businessAddress!,
                email: val.businessEmail!,
                phone: val.businessPhone || undefined,
                website: val.website || undefined,
                companyLogo: companyLogoUrl || undefined
            }
        };

        this.authService.registerOwner(dto).subscribe({
            next: () => {
                this.toastr.success('Registracija uspešna! Proverite email za verifikaciju.', 'Uspeh');
                setTimeout(() => this.router.navigate(['/login']), 1500);
            },
            error: (err) => {
                this.handleBackendErrors(err);
                this.isLoading.set(false);
            }
        });
    }

    private registerAssistant() {
        const val = this.assistantForm.value;
        const dto: RegisterAssistantDto = {
            inviteToken: val.inviteToken!,
            user: {
                firstName: val.firstName!,
                lastName: val.lastName!,
                email: val.email!,
                password: val.password!,
                phone: val.phone || null,
                city: val.city!,
                address: val.address!
            }
        };

        this.authService.registerAssistant(dto).subscribe({
            next: () => {
                this.toastr.success('Registracija uspešna! Proverite email za verifikaciju.', 'Uspeh');
                setTimeout(() => this.router.navigate(['/login']), 1500);
            },
            error: (err) => {
                this.handleBackendErrors(err);
                this.isLoading.set(false);
            }
        });
    }
}