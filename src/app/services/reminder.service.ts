import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { ApiResponse } from "../models/api-response";
import { AddReminderDto, ReminderToReturnDto, UpdateReminderDto } from "../models/reminder";

@Injectable({
  providedIn: 'root'
})
export class ReminderService {
  private http = inject(HttpClient);
  private baseUrl = 'https://localhost:7272/api/Reminder';

  getAll(): Observable<ReminderToReturnDto[]> {
    return this.http.get<ReminderToReturnDto[]>(`${this.baseUrl}`);
  }

  getById(id: string): Observable<ReminderToReturnDto> {
    return this.http.get<ReminderToReturnDto>(`${this.baseUrl}/${id}`);
  }

  create(dto: AddReminderDto): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.baseUrl}`, dto);
  }

  update(id: string, dto: UpdateReminderDto): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.baseUrl}/${id}`, dto);
  }

  markCompleted(id: string): Observable<ApiResponse> {
    return this.http.patch<ApiResponse>(`${this.baseUrl}/${id}/complete`, {});
  }

  delete(id: string): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.baseUrl}/${id}`);
  }
}