import { Component, inject, OnInit, signal } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../../services/auth.service';
import { ActivityCodeService } from '../../../services/activity-code.service';
import { FileService } from '../../../services/file.service';
import { ActivityCodeToReturnDto } from '../../../models/activity-code';
import { RegisterOwnerDto, RegisterAssistantDto } from '../../../models/user-profile';
import { CityService } from '../../../services/city.service';
import { CityToReturnDto } from '../../../models/city';
import { forkJoin } from 'rxjs';
import { PASSWORD_REGEX } from '../../shared/constants/password-regex';

@Component({
    selector: 'app-register',
    standalone: true,
    imports: [ReactiveFormsModule, CommonModule, RouterLink, TranslateModule],
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
    translate = inject(TranslateService);

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
        Validators.pattern(PASSWORD_REGEX)
    ];

    ownerForm = this.fb.group({
        // User fields
        firstName: ['', [Validators.required, Validators.maxLength(50)]],
        lastName: ['', [Validators.required, Validators.maxLength(50)]],
        email: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
        password: ['', this.passwordValidators],
        phone: ['', [Validators.pattern(/^[\+]?[0-9\s\-\(\)]{10,15}$/)]],
        city: ['', [Validators.required, Validators.maxLength(100)]],
        address: ['', [Validators.required, Validators.maxLength(200)]],
        // Business fields
        businessName: ['', [Validators.required, Validators.maxLength(200)]],
        PIB: ['', [Validators.required, Validators.pattern(/^\d{9}$/)]],
        MB: ['', [Validators.pattern(/^\d{8}$/)]],
        activityCodeId: ['', Validators.required],
        businessCity: ['', [Validators.required, Validators.maxLength(100)]],
        businessAddress: ['', [Validators.required, Validators.maxLength(200)]],
        businessEmail: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
        businessPhone: ['', [Validators.pattern(/^[\+]?[0-9\s\-\(\)]{10,15}$/)]],
        website: ['', [Validators.pattern(/^(https?:\/\/)?([\w\-]+\.)+[\w\-]+(\/[\w\-._~:/?#[\]@!$&'()*+,;=]*)?$/)]]
    });

    assistantForm = this.fb.group({
        firstName: ['', [Validators.required, Validators.maxLength(50)]],
        lastName: ['', [Validators.required, Validators.maxLength(50)]],
        email: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
        password: ['', this.passwordValidators],
        phone: ['', [Validators.pattern(/^[\+]?[0-9\s\-\(\)]{10,15}$/)]],
        city: ['', [Validators.required, Validators.maxLength(100)]],
        address: ['', [Validators.required, Validators.maxLength(200)]],
        inviteToken: ['', [Validators.required, Validators.maxLength(10)]]
    });

    // Mapiranje backend polja na srpske poruke
    private fieldMessages: Record<string, string> = {
        'User.FirstName': this.translate.instant('REGISTER.SECTIONS.PERSONAL_INFO.FIRST_NAME').replace(' *', ''),
        'User.LastName': this.translate.instant('REGISTER.SECTIONS.PERSONAL_INFO.LAST_NAME').replace(' *', ''),
        'User.Email': this.translate.instant('REGISTER.SECTIONS.PERSONAL_INFO.EMAIL').replace(' *', ''),
        'User.Password': this.translate.instant('REGISTER.SECTIONS.PERSONAL_INFO.PASSWORD').replace(' *', ''),
        'User.Phone': this.translate.instant('REGISTER.SECTIONS.PERSONAL_INFO.PHONE'),
        'User.City': this.translate.instant('REGISTER.SECTIONS.PERSONAL_INFO.CITY').replace(' *', ''),
        'User.Address': this.translate.instant('REGISTER.SECTIONS.PERSONAL_INFO.ADDRESS').replace(' *', ''),
        'Business.BusinessName': this.translate.instant('REGISTER.SECTIONS.BUSINESS_INFO.BUSINESS_NAME').replace(' *', ''),
        'Business.PIB': this.translate.instant('REGISTER.SECTIONS.BUSINESS_INFO.PIB').replace(' *', ''),
        'Business.MB': this.translate.instant('REGISTER.SECTIONS.BUSINESS_INFO.MB'),
        'Business.Email': this.translate.instant('REGISTER.SECTIONS.BUSINESS_INFO.EMAIL').replace(' *', ''),
        'Business.Phone': this.translate.instant('REGISTER.SECTIONS.BUSINESS_INFO.PHONE'),
        'Business.Website': this.translate.instant('REGISTER.SECTIONS.BUSINESS_INFO.WEBSITE'),
        'Business.Address': this.translate.instant('REGISTER.SECTIONS.BUSINESS_INFO.ADDRESS').replace(' *', ''),
        'Business.ActivityCodeId': this.translate.instant('REGISTER.SECTIONS.BUSINESS_INFO.ACTIVITY_CODE').replace(' *', ''),
        'InviteToken': this.translate.instant('REGISTER.SECTIONS.INVITE_TOKEN.FIELD').replace(' *', ''),
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
                this.toastr.error(
                    this.translate.instant('REGISTER.TOAST.LOAD_ACTIVITY_CODES_ERROR'),
                    this.translate.instant('COMMON.ERROR')
                );
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
                this.toastr.error(
                    this.translate.instant('REGISTER.TOAST.LOAD_CITIES_ERROR'),
                    this.translate.instant('COMMON.ERROR')
                );
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
            this.toastr.error(
                this.translate.instant('REGISTER.TOAST.IMAGE_TYPE_ERROR'),
                this.translate.instant('COMMON.ERROR')
            );
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            this.toastr.error(
                this.translate.instant('REGISTER.TOAST.IMAGE_SIZE_ERROR'),
                this.translate.instant('COMMON.ERROR')
            );
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
            this.toastr.error(
                this.translate.instant('REGISTER.TOAST.IMAGE_TYPE_ERROR'),
                this.translate.instant('COMMON.ERROR')
            );
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            this.toastr.error(
                this.translate.instant('REGISTER.TOAST.IMAGE_SIZE_ERROR'),
                this.translate.instant('COMMON.ERROR')
            );
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
                messages.forEach(msg => this.toastr.error(msg, this.translate.instant('COMMON.ERROR')));
                return;
            }
        }

        // Fallback na generičku poruku
        const fallback = err?.error?.message || err?.error?.title || this.translate.instant('REGISTER.TOAST.REGISTER_ERROR');
        this.toastr.error(fallback, this.translate.instant('COMMON.ERROR'));
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
            firstName: this.translate.instant('REGISTER.SECTIONS.PERSONAL_INFO.FIRST_NAME').replace(' *', ''),
            lastName: this.translate.instant('REGISTER.SECTIONS.PERSONAL_INFO.LAST_NAME').replace(' *', ''),
            email: this.translate.instant('REGISTER.SECTIONS.PERSONAL_INFO.EMAIL').replace(' *', ''),
            password: this.translate.instant('REGISTER.SECTIONS.PERSONAL_INFO.PASSWORD').replace(' *', ''),
            phone: this.translate.instant('REGISTER.SECTIONS.PERSONAL_INFO.PHONE'),
            city: this.translate.instant('REGISTER.SECTIONS.PERSONAL_INFO.CITY').replace(' *', ''),
            address: this.translate.instant('REGISTER.SECTIONS.PERSONAL_INFO.ADDRESS').replace(' *', ''),
            businessName: this.translate.instant('REGISTER.SECTIONS.BUSINESS_INFO.BUSINESS_NAME').replace(' *', ''),
            PIB: this.translate.instant('REGISTER.SECTIONS.BUSINESS_INFO.PIB').replace(' *', '') + ' (9 cifara)',
            MB: this.translate.instant('REGISTER.SECTIONS.BUSINESS_INFO.MB') + ' (8 cifara)',
            activityCodeId: this.translate.instant('REGISTER.SECTIONS.BUSINESS_INFO.ACTIVITY_CODE').replace(' *', ''),
            businessCity: this.translate.instant('REGISTER.SECTIONS.BUSINESS_INFO.CITY').replace(' *', ''),
            businessAddress: this.translate.instant('REGISTER.SECTIONS.BUSINESS_INFO.ADDRESS').replace(' *', ''),
            businessEmail: this.translate.instant('REGISTER.SECTIONS.BUSINESS_INFO.EMAIL').replace(' *', ''),
            businessPhone: this.translate.instant('REGISTER.SECTIONS.BUSINESS_INFO.PHONE'),
            website: this.translate.instant('REGISTER.SECTIONS.BUSINESS_INFO.WEBSITE'),
            inviteToken: this.translate.instant('REGISTER.SECTIONS.INVITE_TOKEN.FIELD').replace(' *', ''),
        };

        Object.keys(form.controls).forEach(key => {
            const control = form.get(key);
            if (control?.invalid) {
                const label = fieldLabels[key] || key;
                if (control.errors?.['required']) {
                    this.toastr.warning(
                        this.translate.instant('REGISTER.VALIDATION.FIELD_REQUIRED', { field: label }),
                        this.translate.instant('REGISTER.TOAST.VALIDATION_ERROR_TITLE')
                    );
                } else if (control.errors?.['pattern']) {
                    this.toastr.warning(
                        this.translate.instant('REGISTER.VALIDATION.FIELD_FORMAT', { field: label }),
                        this.translate.instant('REGISTER.TOAST.VALIDATION_ERROR_TITLE')
                    );
                } else if (control.errors?.['email']) {
                    this.toastr.warning(
                        this.translate.instant('REGISTER.VALIDATION.FIELD_EMAIL', { field: label }),
                        this.translate.instant('REGISTER.TOAST.VALIDATION_ERROR_TITLE')
                    );
                } else if (control.errors?.['maxlength']) {
                    this.toastr.warning(
                        this.translate.instant('REGISTER.VALIDATION.FIELD_MAXLENGTH', { field: label }),
                        this.translate.instant('REGISTER.TOAST.VALIDATION_ERROR_TITLE')
                    );
                } else if (control.errors?.['minlength']) {
                    this.toastr.warning(
                        this.translate.instant('REGISTER.VALIDATION.FIELD_MINLENGTH', { field: label }),
                        this.translate.instant('REGISTER.TOAST.VALIDATION_ERROR_TITLE')
                    );
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
                    this.toastr.error(
                        this.translate.instant('REGISTER.TOAST.UPLOAD_ERROR', { 
                            message: err.error?.message || this.translate.instant('COMMON.UNKNOWN_ERROR') 
                        }),
                        this.translate.instant('COMMON.ERROR')
                    );
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
                this.toastr.success(
                    this.translate.instant('REGISTER.TOAST.REGISTER_SUCCESS'),
                    this.translate.instant('COMMON.SUCCESS')
                );
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
                this.toastr.success(
                    this.translate.instant('REGISTER.TOAST.REGISTER_SUCCESS'),
                    this.translate.instant('COMMON.SUCCESS')
                );
                setTimeout(() => this.router.navigate(['/login']), 1500);
            },
            error: (err) => {
                this.handleBackendErrors(err);
                this.isLoading.set(false);
            }
        });
    }
}