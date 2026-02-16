import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { ApiResponse } from "../models/api-response";
import { AddItemDto, ItemToReturnDto, UpdateItemDto } from "../models/item";

@Injectable({
  providedIn: 'root'
})
export class ItemService {
  private http = inject(HttpClient);
  private baseUrl = 'https://localhost:7272/api/Item';

  getAll(): Observable<ItemToReturnDto[]> {
    return this.http.get<ItemToReturnDto[]>(`${this.baseUrl}`);
  }

  getById(id: string): Observable<ItemToReturnDto> {
    return this.http.get<ItemToReturnDto>(`${this.baseUrl}/${id}`);
  }

  create(dto: AddItemDto): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.baseUrl}`, dto);
  }

  update(id: string, dto: UpdateItemDto): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.baseUrl}/${id}`, dto);
  }

  delete(id: string): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.baseUrl}/${id}`);
  }
}