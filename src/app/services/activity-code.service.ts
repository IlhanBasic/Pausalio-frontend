import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { ActivityCodeToReturnDto, AddActivityCodeDto, UpdateActivityCodeDto } from "../models/activity-code";
import { ApiResponse } from "../models/api-response";

@Injectable({
  providedIn: 'root'
})
export class ActivityCodeService {

  private http = inject(HttpClient);

  private baseUrl = '/api/ActivityCode';

  getAll(): Observable<ActivityCodeToReturnDto[]> {
    return this.http.get<ActivityCodeToReturnDto[]>(this.baseUrl);
  }

  getById(id: string): Observable<ActivityCodeToReturnDto> {
    return this.http.get<ActivityCodeToReturnDto>(`${this.baseUrl}/${id}`);
  }

  create(dto: AddActivityCodeDto): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.baseUrl}`, dto);
  }

  update(id: string, dto: UpdateActivityCodeDto): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.baseUrl}/${id}`, dto);
  }

  delete(id: string): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.baseUrl}/${id}`);
  }
}