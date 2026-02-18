import { Component, inject, OnInit, signal } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ExpenseService } from '../../services/expense.service';
import { ExpenseToReturnDto, AddExpenseDto, UpdateExpenseDto } from '../../models/expense';
import { ExpenseStatus } from '../../enums/expense-status';
import { DataTableComponent, TableColumn, TableAction } from '../../components/shared/data-table/data-table.component';

@Component({
    selector: 'app-expenses',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, DataTableComponent],
    templateUrl: './expenses.component.html',
    styleUrl: './expenses.component.css'
})
export class ExpensesComponent implements OnInit {
    expenseService = inject(ExpenseService);
    fb = inject(FormBuilder);
    toastr = inject(ToastrService);

    expenses = signal<ExpenseToReturnDto[]>([]);
    isLoading = signal(false);
    showModal = signal(false);
    showDeleteConfirm = signal(false);
    editingExpense = signal<ExpenseToReturnDto | null>(null);
    deletingExpense = signal<ExpenseToReturnDto | null>(null);
    activeStatusFilter = signal<ExpenseStatus | null>(null);

    ExpenseStatus = ExpenseStatus;

    expenseForm = this.fb.group({
        name: ['', Validators.required],
        amount: [0, [Validators.required, Validators.min(0.01)]]
    });

    columns: TableColumn[] = [
        { key: 'name', label: 'Naziv', sortable: true },
        { key: 'amount', label: 'Iznos (RSD)', sortable: true },
        { key: 'statusBadge', label: 'Status', type: 'badge', sortable: false },
        { key: 'referenceNumber', label: 'Referenca', sortable: false },
        { key: 'createdAtDisplay', label: 'Datum kreiranja', sortable: true }
    ];

    actions: TableAction[] = [
        { label: 'Izmeni', icon: '✏️', type: 'edit' },
        { label: 'Arhiviraj', icon: '📦', type: 'custom' },
        { label: 'Obriši', icon: '🗑️', type: 'delete' }
    ];

    ngOnInit() {
        this.loadExpenses();
    }

    loadExpenses(status?: ExpenseStatus | null) {
        this.isLoading.set(true);
        const obs = (status !== null && status !== undefined)
            ? this.expenseService.getByStatus(status)
            : this.expenseService.getAll();
        obs.subscribe({
            next: (response) => {
                const transformedData = (response.data || []).map(expense => ({
                    ...expense,
                    statusDisplay: this.getStatusName(expense.status),
                    statusBadge: this.getStatusBadge(expense.status),
                    createdAtDisplay: this.formatDate(expense.createdAt)
                }));
                this.expenses.set(transformedData);
                this.isLoading.set(false);
            },
            error: (err) => {
                console.error('Error loading expenses:', err);
                this.toastr.error('Greška pri učitavanju troškova', 'Greška');
                this.isLoading.set(false);
            }
        });
    }

    setStatusFilter(status: ExpenseStatus | null) {
        this.activeStatusFilter.set(status);
        this.loadExpenses(status);
    }

    openAddModal() {
        this.editingExpense.set(null);
        this.expenseForm.reset({
            name: '',
            amount: 0
        });
        this.showModal.set(true);
    }

    openEditModal(expense: ExpenseToReturnDto) {
        this.editingExpense.set(expense);
        this.expenseForm.patchValue({
            name: expense.name,
            amount: expense.amount
        });
        this.showModal.set(true);
    }

    closeModal() {
        this.showModal.set(false);
        this.expenseForm.reset();
        this.editingExpense.set(null);
    }

    onSubmit() {
        if (this.expenseForm.invalid) {
            this.expenseForm.markAllAsTouched();
            return;
        }

        const formValue = this.expenseForm.value;
        const editing = this.editingExpense();

        if (editing) {
            // Update existing expense
            const dto: UpdateExpenseDto = {
                name: formValue.name!,
                amount: formValue.amount!
            };

            this.expenseService.update(editing.id, dto).subscribe({
                next: () => {
                    this.toastr.success('Trošak uspešno ažuriran', 'Uspeh');
                    this.loadExpenses();
                    this.closeModal();
                },
                error: (err) => {
                    console.error('Error updating expense:', err);
                    this.toastr.error('Greška pri ažuriranju troška', 'Greška');
                }
            });
        } else {
            // Create new expense
            const dto: AddExpenseDto = {
                name: formValue.name!,
                amount: formValue.amount!
            };

            this.expenseService.create(dto).subscribe({
                next: () => {
                    this.toastr.success('Trošak uspešno dodat', 'Uspeh');
                    this.loadExpenses();
                    this.closeModal();
                },
                error: (err) => {
                    console.error('Error creating expense:', err);
                    this.toastr.error('Greška pri dodavanju troška', 'Greška');
                }
            });
        }
    }

    handleCustomAction(event: { action: string, item: any }) {
        if (event.action === 'Arhiviraj') {
            this.archiveExpense(event.item);
        }
    }

    archiveExpense(expense: ExpenseToReturnDto) {
        if (expense.status === ExpenseStatus.archived) {
            this.toastr.warning('Trošak je već arhiviran', 'Upozorenje');
            return;
        }

        this.expenseService.archive(expense.id).subscribe({
            next: () => {
                this.toastr.success('Trošak uspešno arhiviran', 'Uspeh');
                this.loadExpenses();
            },
            error: (err) => {
                console.error('Error archiving expense:', err);
                this.toastr.error('Greška pri arhiviranju troška', 'Greška');
            }
        });
    }

    openDeleteConfirm(expense: ExpenseToReturnDto) {
        this.deletingExpense.set(expense);
        this.showDeleteConfirm.set(true);
    }

    closeDeleteConfirm() {
        this.showDeleteConfirm.set(false);
        this.deletingExpense.set(null);
    }

    confirmDelete() {
        const expense = this.deletingExpense();
        if (!expense) return;

        this.expenseService.delete(expense.id).subscribe({
            next: () => {
                this.toastr.success('Trošak uspešno obrisan', 'Uspeh');
                this.loadExpenses();
                this.closeDeleteConfirm();
            },
            error: (err) => {
                console.error('Error deleting expense:', err);
                this.toastr.error('Greška pri brisanju troška', 'Greška');
                this.closeDeleteConfirm();
            }
        });
    }

    getStatusName(status: ExpenseStatus): string {
        switch (status) {
            case ExpenseStatus.pending:
                return 'Na čekanju';
            case ExpenseStatus.paid:
                return 'Plaćeno';
            case ExpenseStatus.archived:
                return 'Arhivirano';
            default:
                return 'Nepoznato';
        }
    }

    getStatusBadge(status: ExpenseStatus): string {
        switch (status) {
            case ExpenseStatus.pending:
                return '<span class="badge badge-pending">Na čekanju</span>';
            case ExpenseStatus.paid:
                return '<span class="badge badge-paid">Plaćeno</span>';
            case ExpenseStatus.archived:
                return '<span class="badge badge-archived">Arhivirano</span>';
            default:
                return '<span class="badge badge-unknown">Nepoznato</span>';
        }
    }

    formatDate(date: Date): string {
        return new Date(date).toLocaleDateString('sr-Latn-RS', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
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
