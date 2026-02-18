import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { ProfileToReturnDto, UpdateUserProfileDto, UserProfileToReturnDto } from "../models/user-profile";
import { ApiResponse } from "../models/api-response";
import { Observable } from "rxjs";

@Injectable({
    providedIn: 'root'
})
export class UserProfileService {
    private http = inject(HttpClient);
    private baseUrl = 'https://localhost:7272/api/UserProfile';
    updateProfile(id: string, user: UpdateUserProfileDto): Observable<ApiResponse> {
        return this.http.put<ApiResponse>(`${this.baseUrl}/${id}`, user, {
            withCredentials: true
        });
    }
    getProfile(): Observable<ProfileToReturnDto> {
        return this.http.get<ProfileToReturnDto>(`${this.baseUrl}/me`, {
            withCredentials: true
        });
    }

    getProfiles(): Observable<UserProfileToReturnDto[]> {
        return this.http.get<UserProfileToReturnDto[]>(`${this.baseUrl}`, {
            withCredentials: true
        });
    }

    deleteProfile(id: string): Observable<ApiResponse> {
        return this.http.delete<ApiResponse>(`${this.baseUrl}/${id}`, {
            withCredentials: true
        });
    }
}