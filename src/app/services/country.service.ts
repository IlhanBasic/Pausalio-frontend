import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { ApiResponse } from "../models/api-response";
import { AddCountryDto, CountryToReturnDto, UpdateCountryDto } from "../models/country";

@Injectable({
  providedIn: 'root'
})
export class CountryService {

  private http = inject(HttpClient);

  private baseUrl = 'https://localhost:7272/api/Country';

  getAll(): Observable<CountryToReturnDto[]> {
    return this.http.get<CountryToReturnDto[]>(this.baseUrl);
  }

  getById(id: string): Observable<CountryToReturnDto> {
    return this.http.get<CountryToReturnDto>(`${this.baseUrl}/${id}`);
  }

  create(dto: AddCountryDto): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.baseUrl}`, dto);
  }

  update(id: string, dto: UpdateCountryDto): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.baseUrl}/${id}`, dto);
  }

  delete(id: string): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.baseUrl}/${id}`);
  }
}