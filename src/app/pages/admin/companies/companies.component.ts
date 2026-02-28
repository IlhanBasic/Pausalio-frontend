import { Component, inject, OnInit, signal } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import { BusinessProfileService } from '../../../services/business-profile.service';
import { BusinessProfileToReturnDto } from '../../../models/business-profile';
import {
  DataTableComponent,
  TableColumn,
  TableAction,
} from '../../../components/shared/data-table/data-table.component';

@Component({
  selector: 'app-companies',
  standalone: true,
  imports: [CommonModule, DataTableComponent],
  templateUrl: './companies.component.html',
  styleUrl: './companies.component.css',
})
export class CompaniesComponent implements OnInit {
  businessProfileService = inject(BusinessProfileService);
  toastr = inject(ToastrService);

  companies = signal<BusinessProfileToReturnDto[]>([]);
  isLoading = signal(false);
  isSubmitting = signal(false);
  showDeleteConfirm = signal(false);
  showDetailModal = signal(false);
  deletingCompany = signal<BusinessProfileToReturnDto | null>(null);
  selectedCompany = signal<BusinessProfileToReturnDto | null>(null);

  columns: TableColumn[] = [
    { key: 'businessName', label: 'Naziv firme', sortable: true },
    { key: 'pib', label: 'PIB', sortable: true },
    { key: 'email', label: 'Email', sortable: true },
    { key: 'city', label: 'Grad', sortable: true },
    { key: 'statusDisplay', label: 'Status', sortable: true },
  ];

  actions: TableAction[] = [
    { label: 'Detalji', icon: '🔍', type: 'custom' },
    {
      label: 'Aktiviraj',
      icon: '✅',
      type: 'custom',
      showCondition: (company: BusinessProfileToReturnDto) => !company.isActive,
    },
    {
      label: 'Deaktiviraj',
      icon: '⛔',
      type: 'custom',
      showCondition: (company: BusinessProfileToReturnDto) => company.isActive,
    },
    { label: 'Obriši', icon: '🗑️', type: 'delete' },
  ];

  ngOnInit() {
    this.loadCompanies();
  }

  loadCompanies() {
    this.isLoading.set(true);
    this.businessProfileService.getAllCompanies().subscribe({
      next: (res) => {
        const transformed = (res.data || []).map(company => ({
          ...company,
          statusDisplay: company.isActive ? 'Aktivan' : 'Neaktivan',
        }));
        this.companies.set(transformed);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading companies:', err);
        this.toastr.error(err.error?.message || 'Greška pri učitavanju kompanija', 'Greška');
        this.isLoading.set(false);
      },
    });
  }

  onCustomAction(event: { action: string; item: BusinessProfileToReturnDto }) {
    if (event.action === 'Detalji') {
      this.openDetailModal(event.item);
    } else if (event.action === 'Aktiviraj') {
      this.toggleCompanyStatus(event.item);
    } else if (event.action === 'Deaktiviraj') {
      this.toggleCompanyStatus(event.item);
    }
  }

  openDetailModal(company: BusinessProfileToReturnDto) {
    this.selectedCompany.set(company);
    this.showDetailModal.set(true);
  }

  closeDetailModal() {
    this.showDetailModal.set(false);
    this.selectedCompany.set(null);
  }

  toggleCompanyStatus(company: BusinessProfileToReturnDto) {
    this.isSubmitting.set(true);
    const action$ = company.isActive
      ? this.businessProfileService.deactivateCompany(company.id)
      : this.businessProfileService.activateCompany(company.id);

    action$.subscribe({
      next: () => {
        const msg = company.isActive
          ? 'Kompanija uspešno deaktivirana'
          : 'Kompanija uspešno aktivirana';
        this.toastr.success(msg, 'Uspeh');
        this.loadCompanies();
        this.isSubmitting.set(false);
      },
      error: (err) => {
        console.error('Error toggling company status:', err);
        this.toastr.error(err.error?.message || 'Greška pri promeni statusa', 'Greška');
        this.isSubmitting.set(false);
      },
    });
  }

  openDeleteConfirm(company: BusinessProfileToReturnDto) {
    this.deletingCompany.set(company);
    this.showDeleteConfirm.set(true);
  }

  closeDeleteConfirm() {
    this.showDeleteConfirm.set(false);
    this.deletingCompany.set(null);
  }

  confirmDelete() {
    const company = this.deletingCompany();
    if (!company) return;

    this.isSubmitting.set(true);
    this.businessProfileService.deleteCompany(company.id).subscribe({
      next: () => {
        this.toastr.success('Kompanija uspešno obrisana', 'Uspeh');
        this.loadCompanies();
        this.closeDeleteConfirm();
        this.isSubmitting.set(false);
      },
      error: (err) => {
        console.error('Error deleting company:', err);
        this.toastr.error(err.error?.message || 'Greška pri brisanju kompanije', 'Greška');
        this.closeDeleteConfirm();
        this.isSubmitting.set(false);
      },
    });
  }
}