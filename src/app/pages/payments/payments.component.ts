import { Component, inject, OnInit, signal } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PaymentService } from '../../services/payment.service';
import { InvoiceService } from '../../services/invoice.service';
import { ExpenseService } from '../../services/expense.service';
import { TaxObligationService } from '../../services/tax-obligation.service';
import { BankAccountService } from '../../services/bank-account.service';
import { PaymentToReturnDto, AddPaymentDto, UpdatePaymentDto } from '../../models/payment';
import { InvoiceToReturnDto } from '../../models/invoice';
import { ExpenseToReturnDto } from '../../models/expense';
import { TaxObligationToReturnDto } from '../../models/tax-obligation';
import { BankAccountToReturnDto } from '../../models/bank-account';
import { PaymentType } from '../../enums/payment-type';
import { Currency } from '../../enums/currency';
import { DataTableComponent, TableColumn, TableAction } from '../../components/shared/data-table/data-table.component';
import { ClientType } from '../../enums/client-type';
import { TaxObligationType } from '../../enums/tax-obligation-type';
import { InvoiceStatus } from '../../enums/invoice-status';
import { PaymentStatus } from '../../enums/payment-status';

@Component({
    selector: 'app-payments',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, DataTableComponent, TranslateModule],
    templateUrl: './payments.component.html',
    styleUrl: './payments.component.css'
})
export class PaymentsComponent implements OnInit {
    paymentService = inject(PaymentService);
    invoiceService = inject(InvoiceService);
    expenseService = inject(ExpenseService);
    taxObligationService = inject(TaxObligationService);
    bankAccountService = inject(BankAccountService);
    fb = inject(FormBuilder);
    toastr = inject(ToastrService);
    translate = inject(TranslateService);
    allBankAccounts = signal<BankAccountToReturnDto[]>([]);

    payments = signal<PaymentToReturnDto[]>([]);
    invoices = signal<InvoiceToReturnDto[]>([]);
    expenses = signal<ExpenseToReturnDto[]>([]);
    taxObligations = signal<TaxObligationToReturnDto[]>([]);
    bankAccounts = signal<BankAccountToReturnDto[]>([]);

    isLoading = signal(false);
    showModal = signal(false);
    showDeleteConfirm = signal(false);
    editingPayment = signal<PaymentToReturnDto | null>(null);
    deletingPayment = signal<PaymentToReturnDto | null>(null);

    PaymentType = PaymentType;
    Currency = Currency;

    paymentForm = this.fb.group({
        paymentType: [PaymentType.InvoicePayment, Validators.required],
        entityId: ['', Validators.required],
        amount: [0, [Validators.required, Validators.min(0.01)]],
        currency: [Currency.RSD, Validators.required],
        referenceNumber: [''],
        description: [''],
        bankAccountId: ['']
    });

    columns: TableColumn[] = [
        { key: 'paymentTypeDisplay', label: 'PAYMENTS.COLUMN_PAYMENT_TYPE', sortable: true },
        { key: 'entityDisplay', label: 'PAYMENTS.COLUMN_ENTITY', sortable: false },
        { key: 'amount', label: 'PAYMENTS.COLUMN_AMOUNT', type: 'currency', sortable: true },
        { key: 'currencyDisplay', label: 'PAYMENTS.COLUMN_CURRENCY', sortable: true },
        { key: 'amountRSD', label: 'PAYMENTS.COLUMN_AMOUNT_RSD', type: 'currency', sortable: true },
        { key: 'paymentDate', label: 'PAYMENTS.COLUMN_PAYMENT_DATE', type: 'date', sortable: true },
        { key: 'referenceNumber', label: 'PAYMENTS.COLUMN_REFERENCE_NUMBER', sortable: false },
        { key: 'bankAccountDisplay', label: 'PAYMENTS.COLUMN_BANK_ACCOUNT', sortable: false }
    ];

    actions: TableAction[] = [
        { label: this.translate.instant('PAYMENTS.ACTION_EDIT'), icon: '✏️', type: 'edit' },
        { label: this.translate.instant('PAYMENTS.ACTION_DELETE'), icon: '🗑️', type: 'delete' }
    ];

    ngOnInit() {
        this.loadPayments();
        this.loadBankAccounts();

        this.paymentForm.get('paymentType')?.valueChanges.subscribe((paymentType) => {
            this.paymentForm.get('entityId')?.setValue('');
            this.paymentForm.get('amount')?.enable();
            this.paymentForm.get('currency')?.enable();
            this.bankAccounts.set(this.allBankAccounts());
            this.loadEntitiesByType(paymentType || PaymentType.InvoicePayment);
        });

        this.paymentForm.get('entityId')?.valueChanges.subscribe((entityId) => {
            this.onEntitySelected(entityId);
        });

        this.loadEntitiesByType(PaymentType.InvoicePayment);
    }

    onEntitySelected(entityId: string | null) {
        const paymentType = this.paymentForm.get('paymentType')?.value;
        const amountControl = this.paymentForm.get('amount');
        const currencyControl = this.paymentForm.get('currency');

        if (!entityId) {
            amountControl?.enable();
            currencyControl?.enable();
            return;
        }

        if (paymentType === PaymentType.InvoicePayment) {
            const invoice = this.invoices().find(i => i.id === entityId);

            if (invoice) {
                currencyControl?.setValue(invoice.currency);
                currencyControl?.disable();

                this.filterBankAccountsByClient(invoice.client.clientType);
            }

            amountControl?.enable();
        } else if (paymentType === PaymentType.ExpensePayment) {
            const expense = this.expenses().find(e => e.id === entityId);
            if (expense) {
                amountControl?.setValue(expense.amount);
                amountControl?.disable();
                currencyControl?.setValue(Currency.RSD);
                currencyControl?.disable();
                this.filterBankAccountForDomesticPayments();
            }
        } else if (paymentType === PaymentType.TaxPayment) {
            const tax = this.taxObligations().find(t => t.id === entityId);
            if (tax) {
                amountControl?.setValue(tax.totalAmount);
                amountControl?.disable();
                currencyControl?.setValue(Currency.RSD);
                currencyControl?.disable();
                this.filterBankAccountForDomesticPayments();
            }
        }
    }

    private filterBankAccountsByClient(clientType: ClientType) {
        const allAccounts = this.allBankAccounts();

        if (clientType === ClientType.foreign) {
            this.bankAccounts.set(allAccounts.filter(a => a.currency !== Currency.RSD));
        } else {
            this.bankAccounts.set(allAccounts.filter(a => a.currency === Currency.RSD));
        }
    }

    private filterBankAccountForDomesticPayments(){
        const allAccounts = this.allBankAccounts();
        if (this.paymentForm.get('paymentType')?.value === PaymentType.ExpensePayment ||
            this.paymentForm.get('paymentType')?.value === PaymentType.TaxPayment) {
            this.bankAccounts.set(allAccounts.filter(a => a.currency === Currency.RSD));    
        }
    }

    loadPayments() {
        this.isLoading.set(true);
        this.paymentService.getAll().subscribe({
            next: (response) => {
                const transformedData = (response.data || []).map(payment => ({
                    ...payment,
                    paymentTypeDisplay: this.getPaymentTypeName(payment.paymentType),
                    currencyDisplay: this.getCurrencyName(payment.currency),
                    entityDisplay: this.getEntityDisplay(payment),
                    bankAccountDisplay: payment.bankAccount
                        ? `${payment.bankAccount.bankName} - ${payment.bankAccount.accountNumber}`
                        : '—'
                }));
                this.payments.set(transformedData);
                this.isLoading.set(false);
            },
            error: (err) => {
                console.error('Error loading payments:', err);
                this.toastr.error(
                    err.error?.message || this.translate.instant('PAYMENTS.TOAST_LOAD_ERROR'),
                    this.translate.instant('PAYMENTS.TOAST_ERROR_TITLE')
                );
                this.isLoading.set(false);
            }
        });
    }

    loadBankAccounts() {
        this.bankAccountService.getAll().subscribe({
            next: (accounts) => {
                const active = accounts.filter(a => a.isActive);
                this.allBankAccounts.set(active);
                this.bankAccounts.set(active);
            },
            error: (err) => console.error('Error loading bank accounts:', err)
        });
    }


    loadEntitiesByType(paymentType: PaymentType) {
        switch (paymentType) {
            case PaymentType.InvoicePayment:
                this.invoiceService.getAll().subscribe({
                    next: (response) => {
                        const unpaidInvoices = (response.data || []).filter(invoice =>
                            (invoice.paymentStatus === PaymentStatus.unpaid || invoice.paymentStatus === PaymentStatus.partiallyPaid) && invoice.invoiceStatus != InvoiceStatus.cancelled 
                        );
                        this.invoices.set(unpaidInvoices);
                    },
                    error: (err) => console.error('Error loading invoices:', err)
                });
                break;
            case PaymentType.ExpensePayment:
                this.expenseService.getAll().subscribe({
                    next: (response) => {
                        const pendingExpenses = (response.data || []).filter(expense =>
                            expense.status === 1
                        );
                        this.expenses.set(pendingExpenses);
                    },
                    error: (err) => console.error('Error loading expenses:', err)
                });
                break;
            case PaymentType.TaxPayment:
                this.taxObligationService.getAll().subscribe({
                    next: (response) => {
                        const pendingTaxes = (response.data || []).filter(tax =>
                            tax.status === 1
                        );
                        this.taxObligations.set(pendingTaxes);
                    },
                    error: (err) => console.error('Error loading tax obligations:', err)
                });
                break;
        }
    }

    openAddModal() {
        this.editingPayment.set(null);
        this.paymentForm.reset({
            paymentType: PaymentType.InvoicePayment,
            entityId: '',
            amount: 0,
            currency: Currency.RSD,
            referenceNumber: '',
            description: '',
            bankAccountId: ''
        });
        this.paymentForm.get('amount')?.enable();
        this.paymentForm.get('currency')?.enable();
        this.loadEntitiesByType(PaymentType.InvoicePayment);
        this.showModal.set(true);
    }

    openEditModal(payment: PaymentToReturnDto) {
        this.editingPayment.set(payment);
        this.paymentForm.patchValue({
            referenceNumber: payment.referenceNumber || '',
            description: payment.description || ''
        });
        this.paymentForm.get('paymentType')?.disable();
        this.paymentForm.get('entityId')?.disable();
        this.paymentForm.get('amount')?.disable();
        this.paymentForm.get('currency')?.disable();
        this.paymentForm.get('bankAccountId')?.disable();
        this.showModal.set(true);
    }

    closeModal() {
        this.showModal.set(false);
        this.paymentForm.reset();
        this.editingPayment.set(null);
        this.paymentForm.get('paymentType')?.enable();
        this.paymentForm.get('entityId')?.enable();
        this.paymentForm.get('amount')?.enable();
        this.paymentForm.get('currency')?.enable();
        this.paymentForm.get('bankAccountId')?.enable();
    }

    onSubmit() {

        if (this.paymentForm.invalid) {
            this.paymentForm.markAllAsTouched();
            return;
        }

        const formValue = this.paymentForm.getRawValue();
        const editing = this.editingPayment();

        if (!editing && formValue.paymentType === PaymentType.InvoicePayment) {

            const invoice = this.invoices().find(i => i.id === formValue.entityId);

            if (invoice?.client.clientType === ClientType.foreign && !formValue.bankAccountId) {
                this.toastr.error(
                    this.translate.instant('PAYMENTS.TOAST_VALIDATION_FOREIGN_CLIENT'),
                    this.translate.instant('PAYMENTS.TOAST_ERROR_TITLE')
                );
                return;
            }
        }

        if (!editing && formValue.paymentType === PaymentType.ExpensePayment) {

            if (formValue.currency !== Currency.RSD) {
                this.toastr.error(
                    this.translate.instant('PAYMENTS.TOAST_VALIDATION_EXPENSE_CURRENCY'),
                    this.translate.instant('PAYMENTS.TOAST_ERROR_TITLE')
                );
                return;
            }

            if (!formValue.bankAccountId) {
                this.toastr.error(
                    this.translate.instant('PAYMENTS.TOAST_VALIDATION_EXPENSE_BANK'),
                    this.translate.instant('PAYMENTS.TOAST_ERROR_TITLE')
                );
                return;
            }
        }

        if (!editing && formValue.paymentType === PaymentType.TaxPayment) {

            if (formValue.currency !== Currency.RSD) {
                this.toastr.error(
                    this.translate.instant('PAYMENTS.TOAST_VALIDATION_TAX_CURRENCY'),
                    this.translate.instant('PAYMENTS.TOAST_ERROR_TITLE')
                );
                return;
            }

            if (!formValue.bankAccountId) {
                this.toastr.error(
                    this.translate.instant('PAYMENTS.TOAST_VALIDATION_TAX_BANK'),
                    this.translate.instant('PAYMENTS.TOAST_ERROR_TITLE')
                );
                return;
            }
        }

        if (editing) {

            const dto: UpdatePaymentDto = {
                referenceNumber: formValue.referenceNumber || undefined,
                description: formValue.description || undefined
            };

            this.paymentService.update(editing.id, dto).subscribe({
                next: () => {
                    this.toastr.success(
                        this.translate.instant('PAYMENTS.TOAST_UPDATE_SUCCESS'),
                        this.translate.instant('PAYMENTS.TOAST_SUCCESS_TITLE')
                    );
                    this.loadPayments();
                    this.closeModal();
                },
                error: (err) => {
                    console.error('Error updating payment:', err);
                    this.toastr.error(
                        err.error?.message || this.translate.instant('PAYMENTS.TOAST_UPDATE_ERROR'),
                        this.translate.instant('PAYMENTS.TOAST_ERROR_TITLE')
                    );
                }
            });

        } else {

            const dto: AddPaymentDto = {
                paymentType: formValue.paymentType!,
                entityId: formValue.entityId!,
                amount: formValue.amount!,
                currency: formValue.currency!,
                referenceNumber: formValue.referenceNumber || undefined,
                description: formValue.description || undefined,
                bankAccountId: formValue.bankAccountId || undefined
            };

            this.paymentService.create(dto).subscribe({
                next: () => {
                    this.toastr.success(
                        this.translate.instant('PAYMENTS.TOAST_CREATE_SUCCESS'),
                        this.translate.instant('PAYMENTS.TOAST_SUCCESS_TITLE')
                    );
                    this.loadPayments();
                    this.closeModal();
                },
                error: (err) => {
                    console.error('Error creating payment:', err);
                    this.toastr.error(
                        err.error?.message || this.translate.instant('PAYMENTS.TOAST_CREATE_ERROR'),
                        this.translate.instant('PAYMENTS.TOAST_ERROR_TITLE')
                    );
                }
            });
        }
    }

    openDeleteConfirm(payment: PaymentToReturnDto) {
        this.deletingPayment.set(payment);
        this.showDeleteConfirm.set(true);
    }

    closeDeleteConfirm() {
        this.showDeleteConfirm.set(false);
        this.deletingPayment.set(null);
    }

    confirmDelete() {
        const payment = this.deletingPayment();
        if (!payment) return;

        this.paymentService.delete(payment.id).subscribe({
            next: () => {
                this.toastr.success(
                    this.translate.instant('PAYMENTS.TOAST_DELETE_SUCCESS'),
                    this.translate.instant('PAYMENTS.TOAST_SUCCESS_TITLE')
                );
                this.loadPayments();
                this.closeDeleteConfirm();
            },
            error: (err) => {
                console.error('Error deleting payment:', err);
                this.toastr.error(
                    err.error?.message || this.translate.instant('PAYMENTS.TOAST_DELETE_ERROR'),
                    this.translate.instant('PAYMENTS.TOAST_ERROR_TITLE')
                );
                this.closeDeleteConfirm();
            }
        });
    }

    getPaymentTypeName(type: PaymentType): string {
        switch (type) {
            case PaymentType.InvoicePayment: return this.translate.instant('PAYMENTS.TYPE_INVOICE');
            case PaymentType.TaxPayment: return this.translate.instant('PAYMENTS.TYPE_TAX');
            case PaymentType.ExpensePayment: return this.translate.instant('PAYMENTS.TYPE_EXPENSE');
            default: return this.translate.instant('PAYMENTS.TYPE_UNKNOWN');
        }
    }

    getTaxObligationTypeName(type: TaxObligationType): string {
        switch (type) {
            case TaxObligationType.Health: return this.translate.instant('PAYMENTS.TAX_TYPE_HEALTH');
            case TaxObligationType.PIO: return this.translate.instant('PAYMENTS.TAX_TYPE_PIO');
            case TaxObligationType.VAT: return this.translate.instant('PAYMENTS.TAX_TYPE_VAT');
            case TaxObligationType.Unemployment: return this.translate.instant('PAYMENTS.TAX_TYPE_UNEMPLOYMENT');
            default: return this.translate.instant('PAYMENTS.TAX_TYPE_UNKNOWN');
        }
    }

    getCurrencyName(currency: Currency): string {
        switch (currency) {
            case Currency.RSD: return 'RSD';
            case Currency.USD: return 'USD';
            case Currency.EUR: return 'EUR';
            case Currency.GBP: return 'GBP';
            case Currency.CHF: return 'CHF';
            default: return 'N/A';
        }
    }

    getCurrencyLabel(currency: Currency): string {
        return Currency[currency];
    }

    getEntityDisplay(payment: PaymentToReturnDto): string {
        if (payment.invoice) return this.translate.instant('PAYMENTS.ENTITY_INVOICE', { number: payment.invoice.invoiceNumber });
        if (payment.expense) return this.translate.instant('PAYMENTS.ENTITY_EXPENSE', { name: payment.expense.name });
        if (payment.taxObligation) return this.translate.instant('PAYMENTS.ENTITY_TAX', { 
            month: payment.taxObligation.month, 
            year: payment.taxObligation.year 
        });
        return 'N/A';
    }

    getAvailableEntities(): any[] {
        const paymentType = this.paymentForm.get('paymentType')?.value;
        switch (paymentType) {
            case PaymentType.InvoicePayment: return this.invoices();
            case PaymentType.ExpensePayment: return this.expenses();
            case PaymentType.TaxPayment: return this.taxObligations();
            default: return [];
        }
    }

    getEntityLabel(entity: any): string {
        const paymentType = this.paymentForm.get('paymentType')?.value;
        if (paymentType === PaymentType.InvoicePayment) {
            return this.translate.instant('PAYMENTS.ENTITY_INVOICE_WITH_CLIENT', {
                number: entity.invoiceNumber,
                client: entity.client?.name || 'N/A',
                amount: entity.amountToPay,
                currency: this.getCurrencyLabel(entity.currency)
            });
        } else if (paymentType === PaymentType.ExpensePayment) {
            return this.translate.instant('PAYMENTS.ENTITY_EXPENSE_WITH_AMOUNT', {
                name: entity.name,
                amount: entity.amount
            });
        } else if (paymentType === PaymentType.TaxPayment) {
            return this.translate.instant('PAYMENTS.ENTITY_TAX_WITH_TYPE', {
                type: this.getTaxObligationTypeName(entity.type),
                month: entity.month,
                year: entity.year,
                amount: entity.totalAmount
            });
        }
        return 'N/A';
    }
}