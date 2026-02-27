import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { ApiResponse } from "../models/api-response";
import { AddExpenseDto, ExpenseToReturnDto, UpdateExpenseDto, ExpenseSummaryDto } from "../models/expense";
import { ExpenseStatus } from "../enums/expense-status";
import { environment } from "../../environments/environment";

@Injectable({
  providedIn: 'root'
})
export class ExpenseService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/Expense`;

  getAll(): Observable<ApiResponse<ExpenseToReturnDto[]>> {
    return this.http.get<ApiResponse<ExpenseToReturnDto[]>>(`${this.baseUrl}`);
  }

  getByStatus(status: ExpenseStatus): Observable<ApiResponse<ExpenseToReturnDto[]>> {
    return this.http.get<ApiResponse<ExpenseToReturnDto[]>>(`${this.baseUrl}/status/${status}`);
  }

  getById(id: string): Observable<ApiResponse<ExpenseToReturnDto>> {
    return this.http.get<ApiResponse<ExpenseToReturnDto>>(`${this.baseUrl}/${id}`);
  }

  create(dto: AddExpenseDto): Observable<ApiResponse<ExpenseToReturnDto>> {
    return this.http.post<ApiResponse<ExpenseToReturnDto>>(`${this.baseUrl}`, dto);
  }

  update(id: string, dto: UpdateExpenseDto): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.baseUrl}/${id}`, dto);
  }

  delete(id: string): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.baseUrl}/${id}`);
  }

  archive(id: string): Observable<ApiResponse> {
    return this.http.patch<ApiResponse>(`${this.baseUrl}/${id}/archive`, {});
  }

  getSummary(): Observable<ApiResponse<ExpenseSummaryDto>> {
    return this.http.get<ApiResponse<ExpenseSummaryDto>>(`${this.baseUrl}/summary`);
  }
}