import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { ApiResponse } from "../models/api-response";
import { BusinessProfileToReturnDto, UpdateBusinessProfileDto } from "../models/business-profile";
import { environment } from "../../environments/environment";
@Injectable({
  providedIn: 'root'
})
export class BusinessProfileService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/BusinessProfile`;

  getUserCompany(): Observable<ApiResponse<BusinessProfileToReturnDto>> {
    return this.http.get<ApiResponse<BusinessProfileToReturnDto>>(`${this.baseUrl}`);
  }

  getUserCompanies(): Observable<ApiResponse<BusinessProfileToReturnDto[]>> {
    return this.http.get<ApiResponse<BusinessProfileToReturnDto[]>>(`${this.baseUrl}/user/all`);
  }

  updateCompany(dto: UpdateBusinessProfileDto): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.baseUrl}`, dto);
  }

  // Admin endpoints
  getAllCompanies(): Observable<ApiResponse<BusinessProfileToReturnDto[]>> {
    return this.http.get<ApiResponse<BusinessProfileToReturnDto[]>>(`${this.baseUrl}/admin/all`);
  }

  getCompanyById(id: string): Observable<ApiResponse<BusinessProfileToReturnDto>> {
    return this.http.get<ApiResponse<BusinessProfileToReturnDto>>(`${this.baseUrl}/admin/${id}`);
  }

  deactivateCompany(id: string): Observable<ApiResponse> {
    return this.http.patch<ApiResponse>(`${this.baseUrl}/admin/${id}/deactivate`, {});
  }

  activateCompany(id: string): Observable<ApiResponse> {
    return this.http.patch<ApiResponse>(`${this.baseUrl}/admin/${id}/activate`, {});
  }

  deleteCompany(id: string): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.baseUrl}/admin/${id}`);
  }
}