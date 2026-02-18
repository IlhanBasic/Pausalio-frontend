import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { Currency } from "../enums/currency";
import { ApiResponse } from "../models/api-response";

export interface ExchangeRateDto {
    currency: string;
    rate: number;
    description: string;
    cached: boolean;
}

export interface ConvertResultDto {
    originalAmount: number;
    fromCurrency: string;
    toCurrency: string;
    convertedAmount: number;
    calculation: string;
    cached: boolean;
}

export interface AllRatesDto {
    currency: string;
    rate: number;
    description: string;
}

@Injectable({
    providedIn: 'root'
})
export class ExchangeRateService {
    private http = inject(HttpClient);
    private baseUrl = 'https://localhost:7272/api/ExchangeRate';

    getRate(currency: Currency): Observable<ApiResponse<ExchangeRateDto>> {
        return this.http.get<ApiResponse<ExchangeRateDto>>(`${this.baseUrl}/rate/${currency}`);
    }

    convert(amount: number, from: Currency, to: Currency): Observable<ApiResponse<ConvertResultDto>> {
        return this.http.get<ApiResponse<ConvertResultDto>>(
            `${this.baseUrl}/convert?amount=${amount}&from=${from}&to=${to}`
        );
    }

    getAllRates(): Observable<ApiResponse<AllRatesDto[]>> {
        return this.http.get<ApiResponse<AllRatesDto[]>>(`${this.baseUrl}/all`);
    }

    clearCache(): Observable<ApiResponse<null>> {
        return this.http.delete<ApiResponse<null>>(`${this.baseUrl}/cache/clear`);
    }
}