import { Component, inject, OnInit, signal } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
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
  imports: [CommonModule, DataTableComponent, TranslateModule],
  templateUrl: './companies.component.html',
  styleUrl: './companies.component.css',
})
export class CompaniesComponent implements OnInit {
  businessProfileService = inject(BusinessProfileService);
  toastr = inject(ToastrService);
  translate = inject(TranslateService);

  companies = signal<BusinessProfileToReturnDto[]>([]);
  isLoading = signal(false);
  isSubmitting = signal(false);
  showDeleteConfirm = signal(false);
  showDetailModal = signal(false);
  deletingCompany = signal<BusinessProfileToReturnDto | null>(null);
  selectedCompany = signal<BusinessProfileToReturnDto | null>(null);

  columns: TableColumn[] = [
    { key: 'businessName', label: 'COMPANIES.COLUMN_BUSINESS_NAME', sortable: true },
    { key: 'pib', label: 'COMPANIES.COLUMN_PIB', sortable: true },
    { key: 'email', label: 'COMPANIES.COLUMN_EMAIL', sortable: true },
    { key: 'city', label: 'COMPANIES.COLUMN_CITY', sortable: true },
    { key: 'statusDisplay', label: 'COMPANIES.COLUMN_STATUS', sortable: true },
  ];

  actions: TableAction[] = [
    { label: this.translate.instant('COMPANIES.ACTION_DETAILS'), icon: '🔍', type: 'custom' },
    {
      label: this.translate.instant('COMPANIES.ACTION_ACTIVATE'),
      icon: '✅',
      type: 'custom',
      showCondition: (company: BusinessProfileToReturnDto) => !company.isActive,
    },
    {
      label: this.translate.instant('COMPANIES.ACTION_DEACTIVATE'),
      icon: '⛔',
      type: 'custom',
      showCondition: (company: BusinessProfileToReturnDto) => company.isActive,
    },
    { label: this.translate.instant('COMPANIES.ACTION_DELETE'), icon: '🗑️', type: 'delete' },
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
          statusDisplay: company.isActive 
            ? this.translate.instant('COMPANIES.STATUS_ACTIVE_TABLE')
            : this.translate.instant('COMPANIES.STATUS_INACTIVE_TABLE'),
        }));
        this.companies.set(transformed);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading companies:', err);
        this.toastr.error(
          err.error?.message || this.translate.instant('COMPANIES.TOAST_LOAD_ERROR'),
          this.translate.instant('COMPANIES.TOAST_ERROR_TITLE')
        );
        this.isLoading.set(false);
      },
    });
  }

  onCustomAction(event: { action: string; item: BusinessProfileToReturnDto }) {
    const actionMap: { [key: string]: () => void } = {
      [this.translate.instant('COMPANIES.ACTION_DETAILS')]: () => this.openDetailModal(event.item),
      [this.translate.instant('COMPANIES.ACTION_ACTIVATE')]: () => this.toggleCompanyStatus(event.item),
      [this.translate.instant('COMPANIES.ACTION_DEACTIVATE')]: () => this.toggleCompanyStatus(event.item),
    };
    
    const action = actionMap[event.action];
    if (action) {
      action();
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
          ? this.translate.instant('COMPANIES.TOAST_DEACTIVATE_SUCCESS')
          : this.translate.instant('COMPANIES.TOAST_ACTIVATE_SUCCESS');
        this.toastr.success(
          msg,
          this.translate.instant('COMPANIES.TOAST_SUCCESS_TITLE')
        );
        this.loadCompanies();
        this.isSubmitting.set(false);
      },
      error: (err) => {
        console.error('Error toggling company status:', err);
        this.toastr.error(
          err.error?.message || this.translate.instant('COMPANIES.TOAST_STATUS_ERROR'),
          this.translate.instant('COMPANIES.TOAST_ERROR_TITLE')
        );
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
        this.toastr.success(
          this.translate.instant('COMPANIES.TOAST_DELETE_SUCCESS'),
          this.translate.instant('COMPANIES.TOAST_SUCCESS_TITLE')
        );
        this.loadCompanies();
        this.closeDeleteConfirm();
        this.isSubmitting.set(false);
      },
      error: (err) => {
        console.error('Error deleting company:', err);
        this.toastr.error(
          err.error?.message || this.translate.instant('COMPANIES.TOAST_DELETE_ERROR'),
          this.translate.instant('COMPANIES.TOAST_ERROR_TITLE')
        );
        this.closeDeleteConfirm();
        this.isSubmitting.set(false);
      },
    });
  }
}