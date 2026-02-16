import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { AddBankAccountDto, BankAccountToReturnDto, UpdateBankAccountDto } from "../models/bank-account";
import { ApiResponse } from "../models/api-response";

@Injectable({
    providedIn:"root"
})
export class BankAccountService {
    private http = inject(HttpClient);
    private baseUrl = 'https://localhost:7272/api/BankAccount';
    getAll() : Observable<BankAccountToReturnDto[]>{
        return this.http.get<BankAccountToReturnDto[]>(`${this.baseUrl}`);
    }
    getById(id:string) : Observable<BankAccountToReturnDto> {
        return this.http.get<BankAccountToReturnDto>(`${this.baseUrl}/${id}`);
    }
    create(dto:AddBankAccountDto) : Observable<ApiResponse>{
        return this.http.post<ApiResponse>(`${this.baseUrl}`, dto);
    }
    update(id: string, dto: UpdateBankAccountDto): Observable<ApiResponse> {
        return this.http.put<ApiResponse>(`${this.baseUrl}/${id}`, dto);
    }
    delete(id: string) : Observable<ApiResponse>{
        return this.http.delete<ApiResponse>(`${this.baseUrl}/${id}`);
    }
}