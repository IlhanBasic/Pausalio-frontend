import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { ApiResponse } from "../models/api-response";
import { AddClientDto, ClientToReturnDto, UpdateClientDto } from "../models/client";
import { ClientType } from "../enums/client-type";

@Injectable({
  providedIn: 'root'
})
export class ClientService {
  private http = inject(HttpClient);
  private baseUrl = 'https://localhost:7272/api/Client';

  getAll(): Observable<ApiResponse<ClientToReturnDto[]>> {
    return this.http.get<ApiResponse<ClientToReturnDto[]>>(`${this.baseUrl}`);
  }

  getByType(clientType: ClientType): Observable<ApiResponse<ClientToReturnDto[]>> {
    return this.http.get<ApiResponse<ClientToReturnDto[]>>(`${this.baseUrl}/type/${clientType}`);
  }

  getById(id: string): Observable<ApiResponse<ClientToReturnDto>> {
    return this.http.get<ApiResponse<ClientToReturnDto>>(`${this.baseUrl}/${id}`);
  }

  create(dto: AddClientDto): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.baseUrl}`, dto);
  }

  update(id: string, dto: UpdateClientDto): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.baseUrl}/${id}`, dto);
  }

  delete(id: string): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.baseUrl}/${id}`);
  }

  activate(id: string): Observable<ApiResponse> {
    return this.http.patch<ApiResponse>(`${this.baseUrl}/${id}/activate`, {});
  }
}