import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { ApiResponse } from "../models/api-response";
import { AddCityDto, CityToReturnDto, UpdateCityDto } from "../models/city";
import { environment } from "../../environments/environment";
@Injectable({
  providedIn: 'root'
})
export class CityService {

  private http = inject(HttpClient);

  private baseUrl = `${environment.apiUrl}/City`;

  getAll(): Observable<CityToReturnDto[]> {
    return this.http.get<CityToReturnDto[]>(this.baseUrl);
  }

  getById(id: string): Observable<CityToReturnDto> {
    return this.http.get<CityToReturnDto>(`${this.baseUrl}/${id}`);
  }

  create(dto: AddCityDto): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.baseUrl}`, dto);
  }

  update(id: string, dto: UpdateCityDto): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.baseUrl}/${id}`, dto);
  }

  delete(id: string): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.baseUrl}/${id}`);
  }
}