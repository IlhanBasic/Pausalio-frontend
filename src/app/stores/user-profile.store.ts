import { Injectable, signal, computed, effect } from '@angular/core';
import { ProfileToReturnDto } from '../models/user-profile';
import { UserProfileService } from '../services/user-profile.service';
import { Observable, tap } from 'rxjs';
import { AuthStore } from './auth.store';

@Injectable({ providedIn: 'root' })
export class UserProfileStore {
    private _profile = signal<ProfileToReturnDto | null>(null);
    readonly Profile = computed(() => this._profile());

    constructor(
        private userProfileService: UserProfileService,
        private authStore: AuthStore
    ) {
        // Učitaj profil samo kad je korisnik autentifikovan
        effect(() => {
            const isAuthenticated = this.authStore.isAuthenticated();
            if (isAuthenticated) {
                this.loadProfile().subscribe();
            } else {
                this._profile.set(null);
            }
        });
    }

    loadProfile(): Observable<ProfileToReturnDto> {
        return this.userProfileService.getProfile().pipe(
            tap((profile: ProfileToReturnDto) => this._profile.set(profile))
        );
    }
}