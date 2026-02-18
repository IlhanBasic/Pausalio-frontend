import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TaxObligationService } from '../../services/tax-obligation.service';
import {
    TaxObligationToReturnDto,
    AddTaxObligationDto,
    UpdateTaxObligationDto,
    GenerateTaxObligationsDto,
    TaxObligationSummaryDto
} from '../../models/tax-obligation';
import { TaxObligationStatus } from '../../enums/tax-obligation-status';
import { TaxObligationType } from '../../enums/tax-obligation-type';
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

    handleCustomAction(event: { action: string, item: any }) {
        if (event.action === 'Označi kao plaćeno') {
            this.markAsPaid(event.item);
        }
    }
    fb = inject(FormBuilder);

    obligations = signal<TaxObligationToReturnDto[]>([]);
    summary = signal<TaxObligationSummaryDto | null>(null);
    isLoading = signal(false);
    showGenerateModal = signal(false);
    showAddModal = signal(false);
    showDeleteConfirm = signal(false);
    editingObligation = signal<TaxObligationToReturnDto | null>(null);
    deletingObligation = signal<TaxObligationToReturnDto | null>(null);
    activeStatusFilter = signal<TaxObligationStatus | null>(null);

    TaxObligationStatus = TaxObligationStatus;
    TaxObligationType = TaxObligationType;
    toastr = inject(ToastrService);
    selectedYear = signal<number>(new Date().getFullYear());

    generateForm = this.fb.group({
        year: [new Date().getFullYear(), [Validators.required, Validators.min(2020), Validators.max(2030)]],
        monthlyAmount: [0, [Validators.required, Validators.min(1)]],
        type: [TaxObligationType.PIO, Validators.required],
        dueDayOfMonth: [15, [Validators.required, Validators.min(1), Validators.max(28)]]
    });

    obligationForm = this.fb.group({
        dueDate: ['', Validators.required],
        type: [TaxObligationType.PIO, Validators.required],
        totalAmount: [0, [Validators.required, Validators.min(1)]]
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
            label: 'Označi kao plaćeno',
            icon: '✅',
            type: 'custom',
            color: '#48bb78',
            showCondition: (item: TaxObligationToReturnDto) => item.status === TaxObligationStatus.Pending
        },
        { label: 'Izmeni', icon: '✏️', type: 'edit' },
        { label: 'Obriši', icon: '🗑️', type: 'delete' }
    ];

    ngOnInit() {
        this.loadTaxObligations();
        this.loadSummary();
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
                    year: new Date(obligation.dueDate).getFullYear(), // Added for new columns
                    month: new Date(obligation.dueDate).getMonth() + 1 // Added for new columns
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
            next: (response) => {
                this.summary.set(response.data || null);
            },
            error: (err) => {
                console.error('Error loading summary:', err);
            }
        });
    }

    onYearChange(year: number) {
        this.selectedYear.set(year);
        this.loadTaxObligations();
        this.loadSummary();
    }

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

    openAddModal() {
        this.editingObligation.set(null);
        this.obligationForm.reset({
            dueDate: '',
            type: TaxObligationType.PIO,
            totalAmount: 0
        });
        this.showAddModal.set(true);
    }

    openEditModal(obligation: TaxObligationToReturnDto) {
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
            // Update
            const dto: UpdateTaxObligationDto = {
                dueDate: new Date(formValue.dueDate!),
                type: Number(formValue.type!),
                totalAmount: Number(formValue.totalAmount!)
            };

            this.taxService.update(editing.id, dto).subscribe({
                next: () => {
                    this.toastr.success('Obaveza uspešno ažurirana', 'Uspeh');
                    this.loadTaxObligations();
                    this.loadSummary();
                    this.closeAddModal();
                },
                error: (err) => {
                    console.error('Error updating obligation:', err);
                    this.toastr.error('Greška pri ažuriranju obaveze', 'Greška');
                }
            });
        } else {
            // Create
            const dto: AddTaxObligationDto = {
                dueDate: new Date(formValue.dueDate!),
                type: Number(formValue.type!),
                totalAmount: Number(formValue.totalAmount!)
            };

            this.taxService.create(dto).subscribe({
                next: () => {
                    this.toastr.success('Obaveza uspešno dodata', 'Uspeh');
                    this.loadTaxObligations();
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
                this.loadTaxObligations();
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

    markAsPaid(obligation: TaxObligationToReturnDto) {
        if (obligation.status !== TaxObligationStatus.Pending) return;

        this.taxService.markAsPaid(obligation.id).subscribe({
            next: () => {
                this.toastr.success('Obaveza označena kao plaćena', 'Uspeh');
                this.loadTaxObligations();
                this.loadSummary();
            },
            error: (err) => {
                console.error('Error marking as paid:', err);
                this.toastr.error('Greška pri označavanju kao plaćeno', 'Greška');
            }
        });
    }

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

    canMarkAsPaid(obligation: TaxObligationToReturnDto): boolean {
        return obligation.status === TaxObligationStatus.Pending;
    }


}
