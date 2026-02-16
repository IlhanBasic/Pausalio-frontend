import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { ApiResponse } from "../models/api-response";
import { AddPaymentDto, PaymentToReturnDto, UpdatePaymentDto, PaymentSummaryDto } from "../models/payment";
import { PaymentType } from "../enums/payment-type";

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private http = inject(HttpClient);
  private baseUrl = '/api/Payment';

  getAll(): Observable<ApiResponse<PaymentToReturnDto[]>> {
    return this.http.get<ApiResponse<PaymentToReturnDto[]>>(`${this.baseUrl}`);
  }

  getByType(paymentType: PaymentType): Observable<ApiResponse<PaymentToReturnDto[]>> {
    return this.http.get<ApiResponse<PaymentToReturnDto[]>>(`${this.baseUrl}/type/${paymentType}`);
  }

  getById(id: string): Observable<ApiResponse<PaymentToReturnDto>> {
    return this.http.get<ApiResponse<PaymentToReturnDto>>(`${this.baseUrl}/${id}`);
  }

  create(dto: AddPaymentDto): Observable<ApiResponse<PaymentToReturnDto>> {
    return this.http.post<ApiResponse<PaymentToReturnDto>>(`${this.baseUrl}`, dto);
  }

  update(id: string, dto: UpdatePaymentDto): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.baseUrl}/${id}`, dto);
  }

  delete(id: string): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.baseUrl}/${id}`);
  }

  getSummary(): Observable<ApiResponse<PaymentSummaryDto>> {
    return this.http.get<ApiResponse<PaymentSummaryDto>>(`${this.baseUrl}/summary`);
  }
}