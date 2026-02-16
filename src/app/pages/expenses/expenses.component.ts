import { Component, inject, OnInit, signal } from '@angular/core';
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

    expenses = signal<ExpenseToReturnDto[]>([]);
    isLoading = signal(false);
    showModal = signal(false);
    showDeleteConfirm = signal(false);
    editingExpense = signal<ExpenseToReturnDto | null>(null);
    deletingExpense = signal<ExpenseToReturnDto | null>(null);
    errorMessage = signal<string | null>(null);
    successMessage = signal<string | null>(null);

    ExpenseStatus = ExpenseStatus;

    expenseForm = this.fb.group({
        name: ['', Validators.required],
        amount: [0, [Validators.required, Validators.min(0.01)]]
    });

    columns: TableColumn[] = [
        { key: 'name', label: 'Naziv', sortable: true },
        { key: 'amount', label: 'Iznos (RSD)', sortable: true },
        { key: 'statusDisplay', label: 'Status', sortable: true },
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

    loadExpenses() {
        this.isLoading.set(true);
        this.expenseService.getAll().subscribe({
            next: (response) => {
                const transformedData = (response.data || []).map(expense => ({
                    ...expense,
                    statusDisplay: this.getStatusName(expense.status),
                    createdAtDisplay: this.formatDate(expense.createdAt)
                }));
                this.expenses.set(transformedData);
                this.isLoading.set(false);
            },
            error: (err) => {
                console.error('Error loading expenses:', err);
                this.showError('Greška pri učitavanju troškova');
                this.isLoading.set(false);
            }
        });
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
                    this.showSuccess('Trošak uspešno ažuriran');
                    this.loadExpenses();
                    this.closeModal();
                },
                error: (err) => {
                    console.error('Error updating expense:', err);
                    this.showError('Greška pri ažuriranju troška');
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
                    this.showSuccess('Trošak uspešno dodat');
                    this.loadExpenses();
                    this.closeModal();
                },
                error: (err) => {
                    console.error('Error creating expense:', err);
                    this.showError('Greška pri dodavanju troška');
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
            this.showError('Trošak je već arhiviran');
            return;
        }

        this.expenseService.archive(expense.id).subscribe({
            next: () => {
                this.showSuccess('Trošak uspešno arhiviran');
                this.loadExpenses();
            },
            error: (err) => {
                console.error('Error archiving expense:', err);
                this.showError('Greška pri arhiviranju troška');
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
                this.showSuccess('Trošak uspešno obrisan');
                this.loadExpenses();
                this.closeDeleteConfirm();
            },
            error: (err) => {
                console.error('Error deleting expense:', err);
                this.showError('Greška pri brisanju troška');
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

    formatDate(date: Date): string {
        return new Date(date).toLocaleDateString('sr-RS', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    formatCurrency(amount: number): string {
        return new Intl.NumberFormat('sr-RS', {
            style: 'currency',
            currency: 'RSD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }

    showError(message: string) {
        this.errorMessage.set(message);
        setTimeout(() => this.errorMessage.set(null), 5000);
    }

    showSuccess(message: string) {
        this.successMessage.set(message);
        setTimeout(() => this.successMessage.set(null), 3000);
    }
}
