import { Component, inject, OnInit, signal } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ExpenseService } from '../../services/expense.service';
import { PaymentService } from '../../services/payment.service';
import { BankAccountService } from '../../services/bank-account.service';
import { ExpenseToReturnDto, AddExpenseDto, UpdateExpenseDto } from '../../models/expense';
import { BankAccountToReturnDto } from '../../models/bank-account';
import { ExpenseStatus } from '../../enums/expense-status';
import { PaymentType } from '../../enums/payment-type';
import { Currency } from '../../enums/currency';
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
    paymentService = inject(PaymentService);
    bankAccountService = inject(BankAccountService);
    fb = inject(FormBuilder);
    toastr = inject(ToastrService);

    expenses = signal<ExpenseToReturnDto[]>([]);
    bankAccounts = signal<BankAccountToReturnDto[]>([]);
    isLoading = signal(false);
    showModal = signal(false);
    showDeleteConfirm = signal(false);
    showPaymentModal = signal(false);
    editingExpense = signal<ExpenseToReturnDto | null>(null);
    deletingExpense = signal<ExpenseToReturnDto | null>(null);
    payingExpense = signal<ExpenseToReturnDto | null>(null);
    activeStatusFilter = signal<ExpenseStatus | null>(null);

    ExpenseStatus = ExpenseStatus;
    Currency = Currency;

    expenseForm: FormGroup = this.fb.group({
        name: ['', Validators.required],
        amount: [0, [Validators.required, Validators.min(0.01)]]
    });

    paymentForm: FormGroup = this.fb.group({
        bankAccountId: ['',Validators.required]
    });

    columns: TableColumn[] = [
        { key: 'name', label: 'Naziv', sortable: true },
        { key: 'amount', label: 'Iznos (RSD)', sortable: true },
        { key: 'statusBadge', label: 'Status', type: 'badge', sortable: false },
        { key: 'referenceNumber', label: 'Referenca', sortable: false },
        { key: 'createdAtDisplay', label: 'Datum kreiranja', sortable: true }
    ];

    actions: TableAction[] = [
        {
            label: 'Izmeni',
            icon: '✏️',
            type: 'edit',
            showCondition: (item) => item.status === ExpenseStatus.pending
        },
        {
            label: 'Plati',
            icon: '💳',
            type: 'custom',
            showCondition: (item) => item.status === ExpenseStatus.pending
        },
        {
            label: 'Arhiviraj',
            icon: '📦',
            type: 'custom',
            showCondition: (item) => item.status === ExpenseStatus.paid
        },
        {
            label: 'Obriši',
            icon: '🗑️',
            type: 'delete',
            showCondition: (item) => item.status !== ExpenseStatus.archived
        }
    ];

    ngOnInit() {
        this.loadExpenses();
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
                this.toastr.error(err.error?.message || 'Greška pri učitavanju troškova', 'Greška');
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
        this.expenseForm.reset({ name: '', amount: 0 });
        this.showModal.set(true);
    }

    openEditModal(expense: ExpenseToReturnDto) {
        if (expense.status !== ExpenseStatus.pending) {
            this.toastr.warning('Može se menjati samo trošak na čekanju', 'Upozorenje');
            return;
        }
        this.editingExpense.set(expense);
        this.expenseForm.patchValue({ name: expense.name, amount: expense.amount });
        this.showModal.set(true);
    }

    closeModal() {
        this.showModal.set(false);
        this.expenseForm.reset();
        this.editingExpense.set(null);
    }

    // --- Payment ---

    openPaymentModal(expense: ExpenseToReturnDto) {
        if (expense.status !== ExpenseStatus.pending) {
            this.toastr.warning('Trošak nije na čekanju', 'Upozorenje');
            return;
        }
        this.payingExpense.set(expense);
        this.paymentForm.reset({ bankAccountId: '' });
        this.showPaymentModal.set(true);
    }

    closePaymentModal() {
        this.showPaymentModal.set(false);
        this.payingExpense.set(null);
        this.paymentForm.reset();
    }

    onSubmitPayment() {
        const expense = this.payingExpense();
        if (!expense) return;

        const dto = {
            paymentType: PaymentType.ExpensePayment,
            entityId: expense.id,
            amount: expense.amount,
            currency: Currency.RSD,
            bankAccountId: this.paymentForm.value.bankAccountId || undefined
        };

        this.paymentService.create(dto).subscribe({
            next: () => {
                this.toastr.success('Trošak uspešno plaćen', 'Uspeh');
                this.loadExpenses(this.activeStatusFilter());
                this.closePaymentModal();
            },
            error: (err) => {
                console.error('Error paying expense:', err);
                this.toastr.error(err.error?.message || 'Greška pri plaćanju troška', 'Greška');
            }
        });
    }

    // --- Archive ---

    archiveExpense(expense: ExpenseToReturnDto) {
        if (expense.status !== ExpenseStatus.paid) {
            this.toastr.warning('Može se arhivirati samo plaćeni trošak', 'Upozorenje');
            return;
        }

        this.expenseService.archive(expense.id).subscribe({
            next: () => {
                this.toastr.success('Trošak uspešno arhiviran', 'Uspeh');
                this.loadExpenses(this.activeStatusFilter());
            },
            error: (err) => {
                console.error('Error archiving expense:', err);
                this.toastr.error(err.error?.message || 'Greška pri arhiviranju troška', 'Greška');
            }
        });
    }

    handleCustomAction(event: { action: string, item: any }) {
        switch (event.action) {
            case 'Plati':
                this.openPaymentModal(event.item);
                break;
            case 'Arhiviraj':
                this.archiveExpense(event.item);
                break;
        }
    }

    // --- Delete ---

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
                this.loadExpenses(this.activeStatusFilter());
                this.closeDeleteConfirm();
            },
            error: (err) => {
                console.error('Error deleting expense:', err);
                this.toastr.error(err.error?.message || 'Greška pri brisanju troška', 'Greška');
                this.closeDeleteConfirm();
            }
        });
    }

    // --- Submit expense form ---

    onSubmit() {
        if (this.expenseForm.invalid) {
            this.expenseForm.markAllAsTouched();
            return;
        }

        const formValue = this.expenseForm.value;
        const editing = this.editingExpense();

        if (editing) {
            const dto: UpdateExpenseDto = {
                name: formValue.name!,
                amount: formValue.amount!
            };
            this.expenseService.update(editing.id, dto).subscribe({
                next: () => {
                    this.toastr.success('Trošak uspešno ažuriran', 'Uspeh');
                    this.loadExpenses(this.activeStatusFilter());
                    this.closeModal();
                },
                error: (err) => {
                    console.error('Error updating expense:', err);
                    this.toastr.error(err.error?.message || 'Greška pri ažuriranju troška', 'Greška');
                }
            });
        } else {
            const dto: AddExpenseDto = {
                name: formValue.name!,
                amount: formValue.amount!
            };
            this.expenseService.create(dto).subscribe({
                next: () => {
                    this.toastr.success('Trošak uspešno dodat', 'Uspeh');
                    this.loadExpenses(this.activeStatusFilter());
                    this.closeModal();
                },
                error: (err) => {
                    console.error('Error creating expense:', err);
                    this.toastr.error(err.error?.message || 'Greška pri dodavanju troška', 'Greška');
                }
            });
        }
    }

    // --- Helpers ---

    getStatusName(status: ExpenseStatus): string {
        switch (status) {
            case ExpenseStatus.pending: return 'Na čekanju';
            case ExpenseStatus.paid: return 'Plaćeno';
            case ExpenseStatus.archived: return 'Arhivirano';
            default: return 'Nepoznato';
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