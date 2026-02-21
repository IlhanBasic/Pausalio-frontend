import { Component, inject, OnInit, signal, effect } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { AuthStore } from '../../stores/auth.store';
import { CommonModule } from '@angular/common';
import { UserProfileService } from '../../services/user-profile.service';
import { BusinessProfileService } from '../../services/business-profile.service';
import { ActivityCodeService } from '../../services/activity-code.service';
import { BusinessInviteService } from '../../services/business-invite.service';
import { FileService } from '../../services/file.service';
import { UpdateUserProfileDto, UserProfileToReturnDto } from '../../models/user-profile';
import { BusinessProfileToReturnDto, UpdateBusinessProfileDto } from '../../models/business-profile';
import { ActivityCodeToReturnDto } from '../../models/activity-code';
import { AddBusinessInviteDto } from '../../models/business-invite';
import { UserProfileStore } from '../../stores/user-profile.store';

@Component({
    selector: 'app-profile',
    standalone: true,
    imports: [ReactiveFormsModule, CommonModule],
    templateUrl: './profile.component.html',
    styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit {
    fb = inject(FormBuilder);
    authService = inject(AuthService);
    userProfileService = inject(UserProfileService);
    businessProfileService = inject(BusinessProfileService);
    activityCodeService = inject(ActivityCodeService);
    businessInviteService = inject(BusinessInviteService);
    fileService = inject(FileService);
    store = inject(AuthStore);
    userProfileStore = inject(UserProfileStore);
    toastr = inject(ToastrService);

    isLoading = signal(false);
    isLoadingProfile = signal(true);

    // Lokalni signali koji se pune iz store-a reaktivno
    userProfile = signal<UserProfileToReturnDto | null | undefined>(null);
    businessProfile = signal<BusinessProfileToReturnDto | null | undefined>(null);

    activityCodes = signal<ActivityCodeToReturnDto[]>([]);

    showUserEditModal = signal(false);
    showBusinessEditModal = signal(false);
    showPasswordModal = signal(false);
    showInviteModal = signal(false);
    showAcceptInviteModal = signal(false);

    showOldPassword = signal(false);
    showNewPassword = signal(false);
    showConfirmPassword = signal(false);

    profilePictureFile = signal<File | null>(null);
    companyLogoFile = signal<File | null>(null);
    profilePicturePreview = signal<string | null>(null);
    companyLogoPreview = signal<string | null>(null);

    changePasswordForm = this.fb.group({
        oldPassword: ['', Validators.required],
        newPassword: ['', [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)]],
        confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });

    userProfileForm = this.fb.group({
        firstName: ['', Validators.required],
        lastName: ['', Validators.required],
        phone: [''],
        city: [''],
        address: [''],
    });

    businessProfileForm = this.fb.group({
        businessName: ['', Validators.required],
        PIB: ['', Validators.required],
        MB: [''],
        activityCodeId: ['', Validators.required],
        city: [''],
        address: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        phone: [''],
        website: ['']
    });

    inviteForm = this.fb.group({
        email: ['', [Validators.required, Validators.email]]
    });

    acceptInviteForm = this.fb.group({
        inviteToken: ['', Validators.required]
    });

    constructor() {
        // Effect reaguje svaki put kada se store signal promeni
        effect(() => {
            const profile = this.userProfileStore.Profile();
            if (profile) {
                this.userProfile.set(profile.userProfile);
                this.businessProfile.set(profile.businessProfile);
                this.isLoadingProfile.set(false);
            }
        });
    }

    ngOnInit() {
        this.loadProfileData();
        this.loadActivityCodes();
    }

    loadProfileData() {
        this.isLoadingProfile.set(true);
        this.userProfileStore.loadProfile().subscribe({
            error: () => {
                this.toastr.error('Greška pri učitavanju profila', 'Greška');
                this.isLoadingProfile.set(false);
            }
        });
    }

    loadActivityCodes() {
        this.activityCodeService.getAll().subscribe({
            next: (codes) => {
                this.activityCodes.set(codes || []);
            },
            error: (err) => {
                console.error('Error loading activity codes:', err);
            }
        });
    }

    passwordMatchValidator(g: any) {
        return g.get('newPassword')?.value === g.get('confirmPassword')?.value
            ? null : { mismatch: true };
    }

    toggleVisibility(field: 'old' | 'new' | 'confirm') {
        if (field === 'old') this.showOldPassword.set(!this.showOldPassword());
        if (field === 'new') this.showNewPassword.set(!this.showNewPassword());
        if (field === 'confirm') this.showConfirmPassword.set(!this.showConfirmPassword());
    }

    openPasswordModal() {
        this.showPasswordModal.set(true);
    }

    closePasswordModal() {
        this.showPasswordModal.set(false);
        this.changePasswordForm.reset();
    }

    onSubmitPasswordChange() {
        if (this.changePasswordForm.invalid) return;

        this.isLoading.set(true);

        const val = this.changePasswordForm.value;

        this.authService.changePassword({
            oldPassword: val.oldPassword!,
            newPassword: val.newPassword!
        }).subscribe({
            next: () => {
                this.toastr.success('Lozinka uspešno promenjena.', 'Uspeh');
                this.closePasswordModal();
                this.isLoading.set(false);
            },
            error: (err) => {
                this.toastr.error(err.error?.message || 'Došlo je do greške prilikom promene lozinke.', 'Greška');
                this.isLoading.set(false);
            }
        });
    }

    openUserEditModal() {
        const user = this.userProfile();
        if (user) {
            this.userProfileForm.patchValue({
                firstName: user.firstName,
                lastName: user.lastName,
                phone: user.phone || '',
                city: user.city || '',
                address: user.address || ''
            });
            this.profilePicturePreview.set(user.profilePicture || null);
            this.showUserEditModal.set(true);
        }
    }

    closeUserEditModal() {
        this.showUserEditModal.set(false);
        this.userProfileForm.reset();
        this.profilePictureFile.set(null);
        this.profilePicturePreview.set(null);
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

    deleteProfilePicture() {
        const user = this.userProfile();
        if (!user?.profilePicture) {
            this.profilePicturePreview.set(null);
            this.profilePictureFile.set(null);
            return;
        }

        this.isLoading.set(true);
        this.fileService.deleteFile(user.profilePicture).subscribe({
            next: () => {
                this.profilePicturePreview.set(null);
                this.profilePictureFile.set(null);
                this.toastr.success('Slika obrisana', 'Uspeh');
                this.isLoading.set(false);
            },
            error: (err) => {
                this.toastr.error(err.error?.message || 'Greška pri brisanju slike', 'Greška');
                this.isLoading.set(false);
            }
        });
    }

    onSubmitUserProfile() {
        if (this.userProfileForm.invalid) return;

        const user = this.userProfile();
        if (!user) return;

        this.isLoading.set(true);

        if (this.profilePictureFile()) {
            this.fileService.uploadFile(this.profilePictureFile()!).subscribe({
                next: (response) => {
                    this.submitUserProfileUpdate(user.id, response.url || null);
                },
                error: (err) => {
                    this.toastr.error(err.error?.message || 'Greška pri upload-u slike', 'Greška');
                    this.isLoading.set(false);
                }
            });
        } else {
            this.submitUserProfileUpdate(user.id, user.profilePicture || null);
        }
    }

    private submitUserProfileUpdate(userId: string, profilePictureUrl: string | null) {
        const dto: UpdateUserProfileDto = {
            firstName: this.userProfileForm.value.firstName!,
            lastName: this.userProfileForm.value.lastName!,
            phone: this.userProfileForm.value.phone || null,
            city: this.userProfileForm.value.city || '',
            address: this.userProfileForm.value.address || null,
            profilePicture: profilePictureUrl
        };

        this.userProfileService.updateProfile(userId, dto).subscribe({
            next: () => {
                this.toastr.success('Profil uspešno ažuriran', 'Uspeh');
                this.closeUserEditModal();
                this.loadProfileData();
                this.isLoading.set(false);
            },
            error: (err) => {
                this.toastr.error(err.error?.message || 'Greška pri ažuriranju profila', 'Greška');
                this.isLoading.set(false);
            }
        });
    }

    openBusinessEditModal() {
        const business = this.businessProfile();
        if (business) {
            const activityCode = this.activityCodes().find(ac => ac.description === business.activityCode);
            this.businessProfileForm.patchValue({
                businessName: business.businessName,
                PIB: business.pib,
                MB: business.mb || '',
                activityCodeId: activityCode?.id?.toString() || '',
                city: business.city || '',
                address: business.address,
                email: business.email,
                phone: business.phone || '',
                website: business.website || ''
            });
            this.companyLogoPreview.set(business.companyLogo || null);
            this.showBusinessEditModal.set(true);
        }
    }

    closeBusinessEditModal() {
        this.showBusinessEditModal.set(false);
        this.businessProfileForm.reset();
        this.companyLogoFile.set(null);
        this.companyLogoPreview.set(null);
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

    deleteCompanyLogo() {
        const business = this.businessProfile();
        if (!business?.companyLogo) {
            this.companyLogoPreview.set(null);
            this.companyLogoFile.set(null);
            return;
        }

        this.isLoading.set(true);
        this.fileService.deleteFile(business.companyLogo).subscribe({
            next: () => {
                this.companyLogoPreview.set(null);
                this.companyLogoFile.set(null);
                this.toastr.success('Logo obrisan', 'Uspeh');
                this.isLoading.set(false);
            },
            error: (err) => {
                this.toastr.error(err.error?.message || 'Greška pri brisanju loga', 'Greška');
                this.isLoading.set(false);
            }
        });
    }

    onSubmitBusinessProfile() {
        if (this.businessProfileForm.invalid) return;

        this.isLoading.set(true);

        const business = this.businessProfile();

        if (this.companyLogoFile()) {
            this.fileService.uploadFile(this.companyLogoFile()!).subscribe({
                next: (response) => {
                    this.submitBusinessProfileUpdate(response.url);
                },
                error: (err) => {
                    this.toastr.error(err.error?.message || 'Greška pri upload-u loga', 'Greška');
                    this.isLoading.set(false);
                }
            });
        } else {
            this.submitBusinessProfileUpdate(business?.companyLogo || undefined);
        }
    }

    private submitBusinessProfileUpdate(companyLogoUrl: string | undefined) {
        const dto: UpdateBusinessProfileDto = {
            businessName: this.businessProfileForm.value.businessName!,
            PIB: this.businessProfileForm.value.PIB!,
            MB: this.businessProfileForm.value.MB || undefined,
            activityCodeId: this.businessProfileForm.value.activityCodeId!,
            city: this.businessProfileForm.value.city || undefined,
            address: this.businessProfileForm.value.address!,
            email: this.businessProfileForm.value.email!,
            phone: this.businessProfileForm.value.phone || undefined,
            website: this.businessProfileForm.value.website || undefined,
            companyLogo: companyLogoUrl || undefined
        };

        this.businessProfileService.updateCompany(dto).subscribe({
            next: () => {
                this.toastr.success('Profil firme uspešno ažuriran', 'Uspeh');
                this.closeBusinessEditModal();
                this.loadProfileData();
                this.isLoading.set(false);
            },
            error: (err) => {
                this.toastr.error(err.error?.message || 'Greška pri ažuriranju profila firme', 'Greška');
                this.isLoading.set(false);
            }
        });
    }

    openInviteModal() {
        this.showInviteModal.set(true);
    }

    closeInviteModal() {
        this.showInviteModal.set(false);
        this.inviteForm.reset();
    }

    onSubmitInvite() {
        if (this.inviteForm.invalid) return;

        this.isLoading.set(true);

        const dto: AddBusinessInviteDto = {
            email: this.inviteForm.value.email!
        };

        this.businessInviteService.sendInvite(dto).subscribe({
            next: () => {
                this.toastr.success('Pozivnica uspešno poslata na ' + dto.email, 'Uspeh');
                this.closeInviteModal();
                this.isLoading.set(false);
            },
            error: (err) => {
                this.toastr.error(err.error?.message || 'Greška pri slanju pozivnice', 'Greška');
                this.isLoading.set(false);
            }
        });
    }

    openAcceptInviteModal() {
        this.showAcceptInviteModal.set(true);
    }

    closeAcceptInviteModal() {
        this.showAcceptInviteModal.set(false);
        this.acceptInviteForm.reset();
    }

    onSubmitAcceptInvite() {
        if (this.acceptInviteForm.invalid) return;

        this.isLoading.set(true);

        const dto = {
            inviteToken: this.acceptInviteForm.value.inviteToken!
        };

        this.authService.acceptInvite(dto).subscribe({
            next: (response) => {
                this.toastr.success('Uspešno ste se pridružili kompaniji: ' + response.businessName, 'Uspeh');
                this.closeAcceptInviteModal();
                this.loadProfileData();
                this.isLoading.set(false);
            },
            error: (err) => {
                this.toastr.error(err.error?.message || 'Greška pri prihvatanju pozivnice', 'Greška');
                this.isLoading.set(false);
            }
        });
    }

    getUserFullName(): string {
        const user = this.userProfile();
        return user ? `${user.firstName} ${user.lastName}` : '';
    }

    getUserEmail(): string {
        return this.userProfile()?.email || '';
    }

    getUserRole(): string {
        return this.store.isOwner() ? 'Vlasnik' : this.store.isAdmin() ? 'Administrator' : 'Asistent';
    }

    isOwner(): boolean {
        return this.store.isOwner();
    }

    isAdmin(): boolean {
        return this.store.isAdmin();
    }

    getProfilePictureUrl(): string {
        return this.userProfile()?.profilePicture || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(this.getUserFullName()) + '&size=200&background=667eea&color=fff';
    }

    getCompanyLogoUrl(): string {
        const business = this.businessProfile();
        return business?.companyLogo || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(business?.businessName || 'Company') + '&size=200&background=764ba2&color=fff';
    }
}