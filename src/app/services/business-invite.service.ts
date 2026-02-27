import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { ApiResponse, SendInviteResponse  } from "../models/api-response";
import { AddBusinessInviteDto } from "../models/business-invite";
import { environment } from "../../environments/environment";
@Injectable({
  providedIn: 'root'
})
export class BusinessInviteService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/BusinessInvite`;

  sendInvite(dto: AddBusinessInviteDto): Observable<SendInviteResponse> {
    return this.http.post<SendInviteResponse>(`${this.baseUrl}`, dto);
  }

  removeInvite(id: string): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.baseUrl}/${id}`);
  }
}