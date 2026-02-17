import { Component, inject, OnInit, signal } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth.service';
import { ActivityCodeService } from '../../../services/activity-code.service';
import { FileService } from '../../../services/file.service';
import { ActivityCodeToReturnDto } from '../../../models/activity-code';
import { AddUserProfileDto, RegisterOwnerDto, RegisterAssistantDto } from '../../../models/user-profile';
import { AddBusinessProfileDto } from '../../../models/business-profile';
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
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    ];

    ownerForm = this.fb.group({
        // User fields
        firstName: ['', Validators.required],
        lastName: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        password: ['', this.passwordValidators],
        phone: [''],
        city: ['', Validators.required],
        address: ['', Validators.required],
        // Business fields
        businessName: ['', Validators.required],
        PIB: ['', Validators.required],
        MB: [''],
        activityCodeId: ['', Validators.required],
        businessCity: ['', Validators.required],
        businessAddress: ['', Validators.required],
        businessEmail: ['', [Validators.required, Validators.email]],
        businessPhone: [''],
        website: ['']
    });

    assistantForm = this.fb.group({
        firstName: ['', Validators.required],
        lastName: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        password: ['', this.passwordValidators],
        phone: [''],
        city: ['', Validators.required],
        address: ['', Validators.required],
        inviteToken: ['', Validators.required]
    });

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
            next: (res) => {
                this.activityCodes.set(res || []);
            },
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
            const filtered = this.cities().filter(c => c.name.toLowerCase().includes(value));
            this.filteredCities.set(filtered);
        } else {
            this.showBusinessCityDropdown.set(true);
            const filtered = this.cities().filter(c => c.name.toLowerCase().includes(value));
            this.filteredBusinessCities.set(filtered);
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

    // Close dropdowns when clicking outside (handled via blur with delay or overlay click)
    closeDropdown(type: 'user' | 'business') {
        setTimeout(() => {
            if (type === 'user') {
                this.showCityDropdown.set(false);
            } else {
                this.showBusinessCityDropdown.set(false);
            }
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
        if (file) {
            this.profilePictureFile.set(file);
            const reader = new FileReader();
            reader.onload = (e: any) => {
                this.profilePicturePreview.set(e.target.result);
            };
            reader.readAsDataURL(file);
        }
    }

    onCompanyLogoSelect(event: any) {
        const file = event.target.files[0];
        if (file) {
            this.companyLogoFile.set(file);
            const reader = new FileReader();
            reader.onload = (e: any) => {
                this.companyLogoPreview.set(e.target.result);
            };
            reader.readAsDataURL(file);
        }
    }

    onSubmit() {
        if (this.activeForm.invalid) {
            this.activeForm.markAllAsTouched();
            return;
        }

        this.isLoading.set(true);

        if (this.isOwner()) {
            this.registerOwner();
        } else {
            this.registerAssistant();
        }
    }

    private registerOwner() {
        const val = this.ownerForm.value;

        // Prepare upload observables
        const uploads: any[] = [];

        if (this.profilePictureFile()) {
            uploads.push(this.fileService.uploadFile(this.profilePictureFile()!));
        }

        if (this.companyLogoFile()) {
            uploads.push(this.fileService.uploadFile(this.companyLogoFile()!));
        }

        // If there are files to upload, upload them first
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
                this.toastr.success('Registracija uspešna! Preusmeravanje...', 'Uspeh');
                setTimeout(() => this.router.navigate(['/login']), 1500);
            },
            error: (err) => {
                this.toastr.error(err.error?.message || 'Greška pri registraciji.', 'Greška');
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
                this.toastr.success('Registracija uspešna! Preusmeravanje...', 'Uspeh');
                setTimeout(() => this.router.navigate(['/login']), 1500);
            },
            error: (err) => {
                this.toastr.error(err.error?.message || 'Greška pri registraciji.', 'Greška');
                this.isLoading.set(false);
            }
        });
    }
}