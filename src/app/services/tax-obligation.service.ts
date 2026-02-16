import { HttpClient, HttpParams } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { ApiResponse } from "../models/api-response";
import { 
  AddTaxObligationDto, 
  GenerateTaxObligationsDto, 
  TaxObligationToReturnDto, 
  UpdateTaxObligationDto,
  TaxObligationSummaryDto 
} from "../models/tax-obligation";
import { TaxObligationStatus } from "../enums/tax-obligation-status";

@Injectable({
  providedIn: 'root'
})
export class TaxObligationService {
  private http = inject(HttpClient);
  private baseUrl = '/api/TaxObligation';

  getAll(): Observable<ApiResponse<TaxObligationToReturnDto[]>> {
    return this.http.get<ApiResponse<TaxObligationToReturnDto[]>>(`${this.baseUrl}`);
  }

  getByYear(year: number): Observable<ApiResponse<TaxObligationToReturnDto[]>> {
    return this.http.get<ApiResponse<TaxObligationToReturnDto[]>>(`${this.baseUrl}/year/${year}`);
  }

  getByYearAndMonth(year: number, month: number): Observable<ApiResponse<TaxObligationToReturnDto>> {
    return this.http.get<ApiResponse<TaxObligationToReturnDto>>(`${this.baseUrl}/year/${year}/month/${month}`);
  }

  getByStatus(status: TaxObligationStatus): Observable<ApiResponse<TaxObligationToReturnDto[]>> {
    return this.http.get<ApiResponse<TaxObligationToReturnDto[]>>(`${this.baseUrl}/status/${status}`);
  }

  getById(id: string): Observable<ApiResponse<TaxObligationToReturnDto>> {
    return this.http.get<ApiResponse<TaxObligationToReturnDto>>(`${this.baseUrl}/${id}`);
  }

  generateAnnualTaxObligations(dto: GenerateTaxObligationsDto): Observable<ApiResponse<TaxObligationToReturnDto[]>> {
    return this.http.post<ApiResponse<TaxObligationToReturnDto[]>>(`${this.baseUrl}/generate`, dto);
  }

  create(dto: AddTaxObligationDto): Observable<ApiResponse<TaxObligationToReturnDto>> {
    return this.http.post<ApiResponse<TaxObligationToReturnDto>>(`${this.baseUrl}`, dto);
  }

  update(id: string, dto: UpdateTaxObligationDto): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.baseUrl}/${id}`, dto);
  }

  delete(id: string): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.baseUrl}/${id}`);
  }

  markAsPaid(id: string): Observable<ApiResponse> {
    return this.http.patch<ApiResponse>(`${this.baseUrl}/${id}/mark-paid`, {});
  }

  getSummary(year?: number): Observable<ApiResponse<TaxObligationSummaryDto>> {
    let params = new HttpParams();
    if (year) {
      params = params.set('year', year.toString());
    }
    return this.http.get<ApiResponse<TaxObligationSummaryDto>>(`${this.baseUrl}/summary`, { params });
  }
}