import { Component, inject, OnInit, signal } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
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
    imports: [CommonModule, ReactiveFormsModule, DataTableComponent, TranslateModule],
    templateUrl: './expenses.component.html',
    styleUrl: './expenses.component.css'
})
export class ExpensesComponent implements OnInit {
    expenseService = inject(ExpenseService);
    paymentService = inject(PaymentService);
    bankAccountService = inject(BankAccountService);
    fb = inject(FormBuilder);
    toastr = inject(ToastrService);
    translate = inject(TranslateService);

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
        bankAccountId: ['', Validators.required]
    });

    columns: TableColumn[] = [
        { key: 'name', label: 'EXPENSES.COLUMN_NAME', sortable: true },
        { key: 'amount', label: 'EXPENSES.COLUMN_AMOUNT', sortable: true },
        { key: 'statusBadge', label: 'EXPENSES.COLUMN_STATUS', type: 'badge', sortable: false },
        { key: 'referenceNumber', label: 'EXPENSES.COLUMN_REFERENCE', sortable: false },
        { key: 'createdAtDisplay', label: 'EXPENSES.COLUMN_CREATED_AT', sortable: true }
    ];

    actions: TableAction[] = [
        {
            label: this.translate.instant('EXPENSES.ACTION_EDIT'),
            icon: '✏️',
            type: 'edit',
            showCondition: (item) => item.status === ExpenseStatus.pending
        },
        {
            label: this.translate.instant('EXPENSES.ACTION_PAY'),
            icon: '💳',
            type: 'custom',
            showCondition: (item) => item.status === ExpenseStatus.pending
        },
        {
            label: this.translate.instant('EXPENSES.ACTION_ARCHIVE'),
            icon: '📦',
            type: 'custom',
            showCondition: (item) => item.status === ExpenseStatus.paid
        },
        {
            label: this.translate.instant('EXPENSES.ACTION_DELETE'),
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
                this.toastr.error(
                    err.error?.message || this.translate.instant('EXPENSES.TOAST_LOAD_ERROR'),
                    this.translate.instant('EXPENSES.TOAST_ERROR_TITLE')
                );
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
            this.toastr.warning(
                this.translate.instant('EXPENSES.WARNING_CANNOT_EDIT'),
                this.translate.instant('EXPENSES.TOAST_WARNING_TITLE')
            );
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
            this.toastr.warning(
                this.translate.instant('EXPENSES.WARNING_CANNOT_PAY'),
                this.translate.instant('EXPENSES.TOAST_WARNING_TITLE')
            );
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
                this.toastr.success(
                    this.translate.instant('EXPENSES.TOAST_PAY_SUCCESS'),
                    this.translate.instant('EXPENSES.TOAST_SUCCESS_TITLE')
                );
                this.loadExpenses(this.activeStatusFilter());
                this.closePaymentModal();
            },
            error: (err) => {
                console.error('Error paying expense:', err);
                this.toastr.error(
                    err.error?.message || this.translate.instant('EXPENSES.TOAST_PAY_ERROR'),
                    this.translate.instant('EXPENSES.TOAST_ERROR_TITLE')
                );
            }
        });
    }

    // --- Archive ---

    archiveExpense(expense: ExpenseToReturnDto) {
        if (expense.status !== ExpenseStatus.paid) {
            this.toastr.warning(
                this.translate.instant('EXPENSES.WARNING_CANNOT_ARCHIVE'),
                this.translate.instant('EXPENSES.TOAST_WARNING_TITLE')
            );
            return;
        }

        this.expenseService.archive(expense.id).subscribe({
            next: () => {
                this.toastr.success(
                    this.translate.instant('EXPENSES.TOAST_ARCHIVE_SUCCESS'),
                    this.translate.instant('EXPENSES.TOAST_SUCCESS_TITLE')
                );
                this.loadExpenses(this.activeStatusFilter());
            },
            error: (err) => {
                console.error('Error archiving expense:', err);
                this.toastr.error(
                    err.error?.message || this.translate.instant('EXPENSES.TOAST_ARCHIVE_ERROR'),
                    this.translate.instant('EXPENSES.TOAST_ERROR_TITLE')
                );
            }
        });
    }

    handleCustomAction(event: { action: string, item: any }) {
        const actionMap: { [key: string]: () => void } = {
            [this.translate.instant('EXPENSES.ACTION_PAY')]: () => this.openPaymentModal(event.item),
            [this.translate.instant('EXPENSES.ACTION_ARCHIVE')]: () => this.archiveExpense(event.item)
        };
        
        const action = actionMap[event.action];
        if (action) {
            action();
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
                this.toastr.success(
                    this.translate.instant('EXPENSES.TOAST_DELETE_SUCCESS'),
                    this.translate.instant('EXPENSES.TOAST_SUCCESS_TITLE')
                );
                this.loadExpenses(this.activeStatusFilter());
                this.closeDeleteConfirm();
            },
            error: (err) => {
                console.error('Error deleting expense:', err);
                this.toastr.error(
                    err.error?.message || this.translate.instant('EXPENSES.TOAST_DELETE_ERROR'),
                    this.translate.instant('EXPENSES.TOAST_ERROR_TITLE')
                );
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
                    this.toastr.success(
                        this.translate.instant('EXPENSES.TOAST_UPDATE_SUCCESS'),
                        this.translate.instant('EXPENSES.TOAST_SUCCESS_TITLE')
                    );
                    this.loadExpenses(this.activeStatusFilter());
                    this.closeModal();
                },
                error: (err) => {
                    console.error('Error updating expense:', err);
                    this.toastr.error(
                        err.error?.message || this.translate.instant('EXPENSES.TOAST_UPDATE_ERROR'),
                        this.translate.instant('EXPENSES.TOAST_ERROR_TITLE')
                    );
                }
            });
        } else {
            const dto: AddExpenseDto = {
                name: formValue.name!,
                amount: formValue.amount!
            };
            this.expenseService.create(dto).subscribe({
                next: () => {
                    this.toastr.success(
                        this.translate.instant('EXPENSES.TOAST_CREATE_SUCCESS'),
                        this.translate.instant('EXPENSES.TOAST_SUCCESS_TITLE')
                    );
                    this.loadExpenses(this.activeStatusFilter());
                    this.closeModal();
                },
                error: (err) => {
                    console.error('Error creating expense:', err);
                    this.toastr.error(
                        err.error?.message || this.translate.instant('EXPENSES.TOAST_CREATE_ERROR'),
                        this.translate.instant('EXPENSES.TOAST_ERROR_TITLE')
                    );
                }
            });
        }
    }

    // --- Helpers ---

    getStatusName(status: ExpenseStatus): string {
        switch (status) {
            case ExpenseStatus.pending: return this.translate.instant('EXPENSES.STATUS_PENDING');
            case ExpenseStatus.paid: return this.translate.instant('EXPENSES.STATUS_PAID');
            case ExpenseStatus.archived: return this.translate.instant('EXPENSES.STATUS_ARCHIVED');
            default: return this.translate.instant('EXPENSES.STATUS_UNKNOWN');
        }
    }

    getStatusBadge(status: ExpenseStatus): string {
        switch (status) {
            case ExpenseStatus.pending:
                return `<span class="badge badge-pending">${this.translate.instant('EXPENSES.STATUS_PENDING')}</span>`;
            case ExpenseStatus.paid:
                return `<span class="badge badge-paid">${this.translate.instant('EXPENSES.STATUS_PAID')}</span>`;
            case ExpenseStatus.archived:
                return `<span class="badge badge-archived">${this.translate.instant('EXPENSES.STATUS_ARCHIVED')}</span>`;
            default:
                return `<span class="badge badge-unknown">${this.translate.instant('EXPENSES.STATUS_UNKNOWN')}</span>`;
        }
    }

    formatDate(date: Date): string {
        return new Date(date).toLocaleDateString(this.translate.currentLang === 'sr-Cyrl' ? 'sr-Cyrl-RS' : 'sr-Latn-RS', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    formatCurrency(amount: number): string {
        return new Intl.NumberFormat(this.translate.currentLang === 'sr-Cyrl' ? 'sr-Cyrl-RS' : 'sr-Latn-RS', {
            style: 'currency',
            currency: 'RSD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }
}