import { HttpClient, HttpParams } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { ApiResponse, FileUploadResponse } from "../models/api-response";

@Injectable({
  providedIn: 'root'
})
export class FileService {
  private http = inject(HttpClient);
  private baseUrl = '/api/File';

  uploadFile(file: File): Observable<FileUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<FileUploadResponse>(`${this.baseUrl}/upload`, formData);
  }

  deleteFile(url: string): Observable<ApiResponse> {
    const params = new HttpParams().set('url', url);
    return this.http.delete<ApiResponse>(`${this.baseUrl}`, { params });
  }
}