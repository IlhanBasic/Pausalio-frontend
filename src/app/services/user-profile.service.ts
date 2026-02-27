import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { ProfileToReturnDto, UpdateUserProfileDto, UserProfileToReturnDto } from "../models/user-profile";
import { ApiResponse } from "../models/api-response";
import { Observable } from "rxjs";
import { environment } from "../../environments/environment";

@Injectable({
    providedIn: 'root'
})
export class UserProfileService {
    private http = inject(HttpClient);
    private baseUrl = `${environment.apiUrl}/UserProfile`;
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
    activateUser(id: string): Observable<ApiResponse> {
    return this.http.patch<ApiResponse>(
        `${this.baseUrl}/${id}/activate`,
        {},
        { withCredentials: true }
    );
    }

    deactivateUser(id: string): Observable<ApiResponse> {
    return this.http.patch<ApiResponse>(
        `${this.baseUrl}/${id}/deactivate`,
        {},
        { withCredentials: true }
    );
    }
}