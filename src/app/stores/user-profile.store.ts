import { Injectable, signal, computed } from '@angular/core';
import { ProfileToReturnDto } from '../models/user-profile';
import { UserProfileService } from '../services/user-profile.service';
import { Observable, tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UserProfileStore {
    private _profile = signal<ProfileToReturnDto | null>(null);
    readonly Profile = computed(() => this._profile());

    constructor(private userProfileService: UserProfileService) {
        this.loadProfile().subscribe();
    }

    loadProfile(): Observable<ProfileToReturnDto> {
        return this.userProfileService.getProfile().pipe(
            tap((profile: ProfileToReturnDto) => this._profile.set(profile))
        );
    }
}