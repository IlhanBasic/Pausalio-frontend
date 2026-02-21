import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { ApiResponse } from "../models/api-response";
import { AddInvoiceDto, InvoiceToReturnDto, UpdateInvoiceDto, InvoiceSummaryDto } from "../models/invoice";
import { InvoiceStatus } from "../enums/invoice-status";
import { PaymentStatus } from "../enums/payment-status";

@Injectable({
  providedIn: 'root'
})
export class InvoiceService {
  private http = inject(HttpClient);
  private baseUrl = 'https://localhost:7272/api/Invoice';

  getAll(): Observable<ApiResponse<InvoiceToReturnDto[]>> {
    return this.http.get<ApiResponse<InvoiceToReturnDto[]>>(`${this.baseUrl}`);
  }

  getById(id: string): Observable<ApiResponse<InvoiceToReturnDto>> {
    return this.http.get<ApiResponse<InvoiceToReturnDto>>(`${this.baseUrl}/${id}`);
  }

  getByStatus(status: InvoiceStatus): Observable<ApiResponse<InvoiceToReturnDto[]>> {
    return this.http.get<ApiResponse<InvoiceToReturnDto[]>>(`${this.baseUrl}/status/${status}`);
  }

  getByPaymentStatus(paymentStatus: PaymentStatus): Observable<ApiResponse<InvoiceToReturnDto[]>> {
    return this.http.get<ApiResponse<InvoiceToReturnDto[]>>(`${this.baseUrl}/payment-status/${paymentStatus}`);
  }

  create(dto: AddInvoiceDto): Observable<ApiResponse<InvoiceToReturnDto>> {
    return this.http.post<ApiResponse<InvoiceToReturnDto>>(`${this.baseUrl}`, dto);
  }

  update(id: string, dto: UpdateInvoiceDto): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.baseUrl}/${id}`, dto);
  }

  delete(id: string): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.baseUrl}/${id}`);
  }

  getSummary(): Observable<ApiResponse<InvoiceSummaryDto>> {
    return this.http.get<ApiResponse<InvoiceSummaryDto>>(`${this.baseUrl}/summary`);
  }

  archiveInvoice(id: string): Observable<ApiResponse> {
    return this.http.patch<ApiResponse>(`${this.baseUrl}/archive/${id}`, null);
  }

  cancelInvoice(id: string): Observable<ApiResponse> {
    return this.http.patch<ApiResponse>(`${this.baseUrl}/cancel/${id}`, null);
  }
  getPreview(id: string): Observable<ApiResponse<string>> {
    return this.http.get<ApiResponse<string>>(`${this.baseUrl}/${id}/preview`);
  }

  exportPdf(id: string): Observable<Blob> {
      return this.http.get(`${this.baseUrl}/${id}/export`, { responseType: 'blob' });
  }

  sendInvoice(id: string, dto: { emails: string[] }): Observable<ApiResponse> {
      return this.http.post<ApiResponse>(`${this.baseUrl}/${id}/send`, dto);
  }
}