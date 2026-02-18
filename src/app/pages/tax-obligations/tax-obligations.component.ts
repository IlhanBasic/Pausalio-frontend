import { Component, inject, OnInit, signal } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TaxObligationService } from '../../services/tax-obligation.service';
import { PaymentService } from '../../services/payment.service';
import { BankAccountService } from '../../services/bank-account.service';
import {
    TaxObligationToReturnDto,
    AddTaxObligationDto,
    UpdateTaxObligationDto,
    GenerateTaxObligationsDto,
    TaxObligationSummaryDto
} from '../../models/tax-obligation';
import { BankAccountToReturnDto } from '../../models/bank-account';
import { TaxObligationStatus } from '../../enums/tax-obligation-status';
import { TaxObligationType } from '../../enums/tax-obligation-type';
import { PaymentType } from '../../enums/payment-type';
import { Currency } from '../../enums/currency';
import { DataTableComponent, TableColumn, TableAction } from '../../components/shared/data-table/data-table.component';

@Component({
    selector: 'app-tax-obligations',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, DataTableComponent],
    templateUrl: './tax-obligations.component.html',
    styleUrl: './tax-obligations.component.css'
})
export class TaxObligationsComponent implements OnInit {
    taxService = inject(TaxObligationService);
    paymentService = inject(PaymentService);
    bankAccountService = inject(BankAccountService);
    fb = inject(FormBuilder);
    toastr = inject(ToastrService);

    obligations = signal<TaxObligationToReturnDto[]>([]);
    summary = signal<TaxObligationSummaryDto | null>(null);
    bankAccounts = signal<BankAccountToReturnDto[]>([]);
    isLoading = signal(false);
    showGenerateModal = signal(false);
    showAddModal = signal(false);
    showDeleteConfirm = signal(false);
    showPaymentModal = signal(false);
    editingObligation = signal<TaxObligationToReturnDto | null>(null);
    deletingObligation = signal<TaxObligationToReturnDto | null>(null);
    payingObligation = signal<TaxObligationToReturnDto | null>(null);
    activeStatusFilter = signal<TaxObligationStatus | null>(null);
    selectedYear = signal<number>(new Date().getFullYear());

    TaxObligationStatus = TaxObligationStatus;
    TaxObligationType = TaxObligationType;

    generateForm: FormGroup = this.fb.group({
        year: [new Date().getFullYear(), [Validators.required, Validators.min(2020), Validators.max(2030)]],
        monthlyAmount: [0, [Validators.required, Validators.min(1)]],
        type: [TaxObligationType.PIO, Validators.required],
        dueDayOfMonth: [15, [Validators.required, Validators.min(1), Validators.max(28)]]
    });

    obligationForm: FormGroup = this.fb.group({
        dueDate: ['', Validators.required],
        type: [TaxObligationType.PIO, Validators.required],
        totalAmount: [0, [Validators.required, Validators.min(1)]]
    });

    paymentForm: FormGroup = this.fb.group({
        bankAccountId: ['', Validators.required]
    });

    columns: TableColumn[] = [
        { key: 'typeDisplay', label: 'Tip', sortable: true },
        { key: 'totalAmount', label: 'Iznos (RSD)', type: 'currency', sortable: true },
        { key: 'statusBadge', label: 'Status', type: 'badge', sortable: false },
        { key: 'dueDate', label: 'Rok plaćanja', type: 'date', sortable: true },
        { key: 'year', label: 'Godina', sortable: true },
        { key: 'month', label: 'Mesec', sortable: true }
    ];

    actions: TableAction[] = [
        {
            label: 'Plati',
            icon: '💳',
            type: 'custom',
            color: '#48bb78',
            showCondition: (item) => item.status === TaxObligationStatus.Pending
        },
        {
            label: 'Izmeni',
            icon: '✏️',
            type: 'edit',
            showCondition: (item) => item.status === TaxObligationStatus.Pending
        },
        {
            label: 'Obriši',
            icon: '🗑️',
            type: 'delete',
            showCondition: (item) => item.status === TaxObligationStatus.Pending
        }
    ];

    ngOnInit() {
        this.loadTaxObligations();
        this.loadSummary();
        this.loadBankAccounts();
    }

    loadBankAccounts() {
        this.bankAccountService.getAll().subscribe({
            next: (accounts) => {
                this.bankAccounts.set(accounts.filter(a => a.isActive && a.currency === Currency.RSD));
            },
            error: (err) => console.error('Error loading bank accounts:', err)
        });
    }

    loadTaxObligations(status?: TaxObligationStatus | null) {
        this.isLoading.set(true);
        const obs = (status !== null && status !== undefined)
            ? this.taxService.getByStatus(status)
            : this.taxService.getAll();
        obs.subscribe({
            next: (response) => {
                const transformedData = (response.data || []).map(obligation => ({
                    ...obligation,
                    typeDisplay: this.getTypeName(obligation.type),
                    statusDisplay: this.getStatusName(obligation.status),
                    statusBadge: this.getStatusBadge(obligation.status),
                    year: new Date(obligation.dueDate).getFullYear(),
                    month: new Date(obligation.dueDate).getMonth() + 1
                }));
                this.obligations.set(transformedData);
                this.isLoading.set(false);
            },
            error: (err) => {
                console.error('Error loading tax obligations:', err);
                this.toastr.error('Greška pri učitavanju poreskih obaveza', 'Greška');
                this.isLoading.set(false);
            }
        });
    }

    setStatusFilter(status: TaxObligationStatus | null) {
        this.activeStatusFilter.set(status);
        this.loadTaxObligations(status);
    }

    loadSummary() {
        const year = this.selectedYear();
        this.taxService.getSummary(year).subscribe({
            next: (response) => this.summary.set(response.data || null),
            error: (err) => console.error('Error loading summary:', err)
        });
    }

    onYearChange(year: number) {
        this.selectedYear.set(year);
        this.loadTaxObligations();
        this.loadSummary();
    }

    // --- Generate ---

    openGenerateModal() {
        this.generateForm.reset({
            year: new Date().getFullYear(),
            monthlyAmount: 0,
            type: TaxObligationType.PIO,
            dueDayOfMonth: 15
        });
        this.showGenerateModal.set(true);
    }

    closeGenerateModal() {
        this.showGenerateModal.set(false);
        this.generateForm.reset();
    }

    onGenerateSubmit() {
        if (this.generateForm.invalid) {
            this.generateForm.markAllAsTouched();
            return;
        }

        const formValue = this.generateForm.value;
        const dto: GenerateTaxObligationsDto = {
            year: Number(formValue.year!),
            monthlyAmount: Number(formValue.monthlyAmount!),
            type: Number(formValue.type!),
            dueDayOfMonth: Number(formValue.dueDayOfMonth!)
        };

        this.taxService.generateAnnualTaxObligations(dto).subscribe({
            next: () => {
                this.toastr.success('Godišnje obaveze uspešno generisane', 'Uspeh');
                this.loadTaxObligations();
                this.loadSummary();
                this.closeGenerateModal();
            },
            error: (err) => {
                console.error('Error generating obligations:', err);
                this.toastr.error('Greška pri generisanju obaveza', 'Greška');
            }
        });
    }

    // --- Add/Edit ---

    openAddModal() {
        this.editingObligation.set(null);
        this.obligationForm.reset({ dueDate: '', type: TaxObligationType.PIO, totalAmount: 0 });
        this.showAddModal.set(true);
    }

    openEditModal(obligation: TaxObligationToReturnDto) {
        if (obligation.status !== TaxObligationStatus.Pending) {
            this.toastr.warning('Može se menjati samo obaveza na čekanju', 'Upozorenje');
            return;
        }
        this.editingObligation.set(obligation);
        this.obligationForm.patchValue({
            dueDate: new Date(obligation.dueDate).toISOString().split('T')[0],
            type: obligation.type,
            totalAmount: obligation.totalAmount
        });
        this.showAddModal.set(true);
    }

    closeAddModal() {
        this.showAddModal.set(false);
        this.obligationForm.reset();
        this.editingObligation.set(null);
    }

    onObligationSubmit() {
        if (this.obligationForm.invalid) {
            this.obligationForm.markAllAsTouched();
            return;
        }

        const formValue = this.obligationForm.value;
        const editing = this.editingObligation();

        if (editing) {
            const dto: UpdateTaxObligationDto = {
                dueDate: new Date(formValue.dueDate!),
                type: Number(formValue.type!),
                totalAmount: Number(formValue.totalAmount!)
            };
            this.taxService.update(editing.id, dto).subscribe({
                next: () => {
                    this.toastr.success('Obaveza uspešno ažurirana', 'Uspeh');
                    this.loadTaxObligations(this.activeStatusFilter());
                    this.loadSummary();
                    this.closeAddModal();
                },
                error: (err) => {
                    console.error('Error updating obligation:', err);
                    this.toastr.error('Greška pri ažuriranju obaveze', 'Greška');
                }
            });
        } else {
            const dto: AddTaxObligationDto = {
                dueDate: new Date(formValue.dueDate!),
                type: Number(formValue.type!),
                totalAmount: Number(formValue.totalAmount!)
            };
            this.taxService.create(dto).subscribe({
                next: () => {
                    this.toastr.success('Obaveza uspešno dodata', 'Uspeh');
                    this.loadTaxObligations(this.activeStatusFilter());
                    this.loadSummary();
                    this.closeAddModal();
                },
                error: (err) => {
                    console.error('Error creating obligation:', err);
                    this.toastr.error('Greška pri dodavanju obaveze', 'Greška');
                }
            });
        }
    }

    // --- Payment ---

    openPaymentModal(obligation: TaxObligationToReturnDto) {
        if (obligation.status !== TaxObligationStatus.Pending) {
            this.toastr.warning('Obaveza nije na čekanju', 'Upozorenje');
            return;
        }
        this.payingObligation.set(obligation);
        this.paymentForm.reset({ bankAccountId: '' });
        this.showPaymentModal.set(true);
    }

    closePaymentModal() {
        this.showPaymentModal.set(false);
        this.payingObligation.set(null);
        this.paymentForm.reset();
    }

    onSubmitPayment() {
        if (this.paymentForm.invalid) {
            this.paymentForm.markAllAsTouched();
            return;
        }

        const obligation = this.payingObligation();
        if (!obligation) return;

        const dto = {
            paymentType: PaymentType.TaxPayment,
            entityId: obligation.id,
            amount: obligation.totalAmount,
            currency: Currency.RSD,
            bankAccountId: this.paymentForm.value.bankAccountId
        };

        this.paymentService.create(dto).subscribe({
            next: () => {
                this.toastr.success('Poreska obaveza uspešno plaćena', 'Uspeh');
                this.loadTaxObligations(this.activeStatusFilter());
                this.loadSummary();
                this.closePaymentModal();
            },
            error: (err) => {
                console.error('Error paying tax obligation:', err);
                this.toastr.error(err.error?.message || 'Greška pri plaćanju poreske obaveze', 'Greška');
            }
        });
    }

    handleCustomAction(event: { action: string, item: any }) {
        switch (event.action) {
            case 'Plati':
                this.openPaymentModal(event.item);
                break;
        }
    }

    // --- Delete ---

    openDeleteConfirm(obligation: TaxObligationToReturnDto) {
        this.deletingObligation.set(obligation);
        this.showDeleteConfirm.set(true);
    }

    closeDeleteConfirm() {
        this.showDeleteConfirm.set(false);
        this.deletingObligation.set(null);
    }

    confirmDelete() {
        const obligation = this.deletingObligation();
        if (!obligation) return;

        this.taxService.delete(obligation.id).subscribe({
            next: () => {
                this.toastr.success('Obaveza uspešno obrisana', 'Uspeh');
                this.loadTaxObligations(this.activeStatusFilter());
                this.loadSummary();
                this.closeDeleteConfirm();
            },
            error: (err) => {
                console.error('Error deleting obligation:', err);
                this.toastr.error('Greška pri brisanju obaveze', 'Greška');
                this.closeDeleteConfirm();
            }
        });
    }

    // --- Helpers ---

    getMonthName(month: number): string {
        const months = ['Januar', 'Februar', 'Mart', 'April', 'Maj', 'Jun',
            'Jul', 'Avgust', 'Septembar', 'Oktobar', 'Novembar', 'Decembar'];
        return months[month - 1] || '';
    }

    getStatusName(status: TaxObligationStatus): string {
        switch (status) {
            case TaxObligationStatus.Pending: return 'Na čekanju';
            case TaxObligationStatus.Paid: return 'Plaćeno';
            case TaxObligationStatus.Archived: return 'Arhivirano';
            default: return 'Nepoznato';
        }
    }

    getStatusBadge(status: TaxObligationStatus): string {
        switch (status) {
            case TaxObligationStatus.Pending:
                return '<span class="badge badge-pending">Na čekanju</span>';
            case TaxObligationStatus.Paid:
                return '<span class="badge badge-paid">Plaćeno</span>';
            case TaxObligationStatus.Archived:
                return '<span class="badge badge-archived">Arhivirano</span>';
            default:
                return '<span class="badge badge-unknown">Nepoznato</span>';
        }
    }

    getTypeName(type: TaxObligationType): string {
        switch (type) {
            case TaxObligationType.VAT: return 'PDV';
            case TaxObligationType.PIO: return 'PIO';
            case TaxObligationType.Health: return 'Zdravstveno';
            case TaxObligationType.Unemployment: return 'Nezaposlenost';
            default: return 'Nepoznato';
        }
    }

    getStatusClass(status: TaxObligationStatus): string {
        switch (status) {
            case TaxObligationStatus.Pending: return 'status-pending';
            case TaxObligationStatus.Paid: return 'status-paid';
            case TaxObligationStatus.Archived: return 'status-archived';
            default: return '';
        }
    }

    formatCurrency(amount: number): string {
        return new Intl.NumberFormat('sr-Latn-RS', {
            style: 'currency',
            currency: 'RSD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }
}