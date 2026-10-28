import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { KpoEntryToReturnDto, KpoYearlySummaryDto } from '../models/kpo-book';

@Injectable({
  providedIn: 'root',
})
export class KpoService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/kpo`;

  getByYear(year: number): Observable<KpoEntryToReturnDto[]> {
    return this.http.get<KpoEntryToReturnDto[]>(`${this.baseUrl}/${year}`);
  }

  getSummary(year: number): Observable<KpoYearlySummaryDto> {
    return this.http.get<KpoYearlySummaryDto>(`${this.baseUrl}/${year}/summary`);
  }

  exportPdf(year: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${year}/export/pdf`, { responseType: 'blob' });
  }

  backfill(year: number): Observable<{ backfilledCount: number }> {
    return this.http.post<{ backfilledCount: number }>(`${this.baseUrl}/backfill/${year}`, {});
  }
}
