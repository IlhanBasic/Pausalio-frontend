import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { DataTableComponent, TableColumn } from '../../components/shared/data-table/data-table.component';
import { KpoEntryToReturnDto, KpoYearlySummaryDto } from '../../models/kpo-book';
import { KpoService } from '../../services/kpo.service';

@Component({
  selector: 'app-kpo',
  standalone: true,
  imports: [CommonModule, DataTableComponent, TranslateModule],
  templateUrl: './kpo.component.html',
  styleUrl: './kpo.component.css',
})
export class KpoComponent implements OnInit {
  private readonly kpoService = inject(KpoService);
  private readonly toastr = inject(ToastrService);

  summary = signal<KpoYearlySummaryDto | null>(null);
  entries = signal<KpoEntryToReturnDto[]>([]);
  isLoading = signal(false);
  selectedYear = signal<number>(new Date().getFullYear());

  columns: TableColumn[] = [
    { key: 'entryDate', label: 'Datum', type: 'date', sortable: true },
    { key: 'sequenceNumber', label: 'Broj', sortable: true },
    { key: 'description', label: 'Opis', sortable: true },
    { key: 'productIncome', label: 'Proizvodi', type: 'currency', sortable: true },
    { key: 'serviceIncome', label: 'Usluge', type: 'currency', sortable: true },
    { key: 'totalIncome', label: 'Ukupno', type: 'currency', sortable: true },
    { key: 'invoiceNumber', label: 'Faktura', sortable: true },
    { key: 'entryType', label: 'Tip', sortable: true },
  ];

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);

    this.kpoService.getSummary(this.selectedYear()).subscribe({
      next: (summary) => {
        this.summary.set(summary);
      },
      error: () => {
        this.toastr.error('Greška pri učitavanju KPO pregleda.', 'Greška');
      },
    });

    this.kpoService.getByYear(this.selectedYear()).subscribe({
      next: (entries) => {
        this.entries.set(
          (entries || []).map((entry) => ({
            ...entry,
            entryType: entry.entryType === 'Regular' ? 'Regularan' : 'Storno',
          })),
        );
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.toastr.error('Greška pri učitavanju KPO zapisa.', 'Greška');
      },
    });
  }

  onYearChange(year: number): void {
    this.selectedYear.set(year);
    this.loadData();
  }

  exportPdf(): void {
    this.kpoService.exportPdf(this.selectedYear()).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `KPO_${this.selectedYear()}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.toastr.success('PDF je uspešno preuzet.', 'Uspeh');
      },
      error: () => {
        this.toastr.error('PDF nije mogao da se generiše.', 'Greška');
      },
    });
  }

  backfill(): void {
    this.kpoService.backfill(this.selectedYear()).subscribe({
      next: (response) => {
        this.toastr.success(`Backfill je završio: ${response.backfilledCount} zapisa.`, 'Uspeh');
        this.loadData();
      },
      error: () => {
        this.toastr.error('Backfill nije uspeo.', 'Greška');
      },
    });
  }
}
