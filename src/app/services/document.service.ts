import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { ApiResponse } from "../models/api-response";
import { AddDocumentDto, DocumentToReturnDto, UpdateDocumentDto } from "../models/document";

@Injectable({
  providedIn: 'root'
})
export class DocumentService {
  private http = inject(HttpClient);
  private baseUrl = '/api/Document';

  getAll(): Observable<DocumentToReturnDto[]> {
    return this.http.get<DocumentToReturnDto[]>(`${this.baseUrl}`);
  }

  getById(id: string): Observable<DocumentToReturnDto> {
    return this.http.get<DocumentToReturnDto>(`${this.baseUrl}/${id}`);
  }

  create(dto: AddDocumentDto): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.baseUrl}`, dto);
  }

  update(id: string, dto: UpdateDocumentDto): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.baseUrl}/${id}`, dto);
  }

  delete(id: string): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.baseUrl}/${id}`);
  }
}