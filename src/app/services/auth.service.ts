import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { AddUserProfileDto, ChangePasswordDto, ForgotPasswordDto, LoginDto, RegisterAssistantDto, RegisterOwnerDto, ResendVerificationDto, ResetPasswordDto } from "../models/user-profile";
import { Observable } from "rxjs";
import { AcceptInviteResponse, ApiResponse, LoginResponse } from "../models/api-response";
import { AcceptInviteDto } from "../models/business-invite";
import { environment } from "../../environments/environment";
@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/Auth`;
  
  login(dto: LoginDto): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(
      `${this.baseUrl}/login`,
      dto,
      { withCredentials: true }
    );
  }

  acceptInvite(dto: AcceptInviteDto): Observable<AcceptInviteResponse> {
    return this.http.post<AcceptInviteResponse>(
      `${this.baseUrl}/accept-invite`,
      dto,
      { withCredentials: true }
    );
  }

  registerAdmin(dto: AddUserProfileDto): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.baseUrl}/register-admin`,
      dto
    );
  }

  registerAssistant(dto: RegisterAssistantDto): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.baseUrl}/register-assistant`,
      dto
    );
  }

  registerOwner(dto: RegisterOwnerDto): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.baseUrl}/register-owner`,
      dto
    );
  }

  resendVerification(resendVerificationDto: ResendVerificationDto): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.baseUrl}/resend-verification`,
      resendVerificationDto
    );
  }

  logout(): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.baseUrl}/logout`,
      {},
      { withCredentials: true }
    );
  }

  changePassword(dto: ChangePasswordDto): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.baseUrl}/change-password`,
      dto,
      { withCredentials: true }
    );
  }

  forgotPassword(dto: ForgotPasswordDto): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.baseUrl}/forgot-password`,
      dto
    );
  }

  resetPassword(dto: ResetPasswordDto): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.baseUrl}/reset-password`,
      dto
    );
  }
  refreshToken(): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(
        `${this.baseUrl}/refresh-token`,
        {},
        { withCredentials: true }
    );
  }

  verifyEmail(token: string, email: string): Observable<any> {
    return this.http.get(
      `${this.baseUrl}/verify-email?token=${token}&email=${email}`,
      { responseType: 'text' }
    );
  }
}