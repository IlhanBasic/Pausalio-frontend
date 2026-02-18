import { Component, inject, OnInit, signal } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
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

@Component({
    selector: 'app-payments',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, DataTableComponent],
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
        { key: 'paymentTypeDisplay', label: 'Tip plaćanja', sortable: true },
        { key: 'entityDisplay', label: 'Entitet', sortable: false },
        { key: 'amount', label: 'Iznos', type: 'currency', sortable: true },
        { key: 'currencyDisplay', label: 'Valuta', sortable: true },
        { key: 'amountRSD', label: 'Iznos (RSD)', type: 'currency', sortable: true },
        { key: 'paymentDate', label: 'Datum plaćanja', type: 'date', sortable: true },
        { key: 'referenceNumber', label: 'Poziv na broj', sortable: false },
        { key: 'bankAccountDisplay', label: 'Bankovni račun', sortable: false }
    ];

    actions: TableAction[] = [
        { label: 'Izmeni', icon: '✏️', type: 'edit' },
        { label: 'Obriši', icon: '🗑️', type: 'delete' }
    ];

    ngOnInit() {
        this.loadPayments();
        this.loadBankAccounts();

        this.paymentForm.get('paymentType')?.valueChanges.subscribe((paymentType) => {
            this.paymentForm.get('entityId')?.setValue('');
            this.paymentForm.get('amount')?.enable();
            this.paymentForm.get('currency')?.enable();
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
            }
            amountControl?.enable();
        } else if (paymentType === PaymentType.ExpensePayment) {
            const expense = this.expenses().find(e => e.id === entityId);
            if (expense) {
                amountControl?.setValue(expense.amount);
                amountControl?.disable();
                currencyControl?.setValue(Currency.RSD);
                currencyControl?.disable();
            }
        } else if (paymentType === PaymentType.TaxPayment) {
            const tax = this.taxObligations().find(t => t.id === entityId);
            if (tax) {
                amountControl?.setValue(tax.totalAmount);
                amountControl?.disable();
                currencyControl?.setValue(Currency.RSD);
                currencyControl?.disable();
            }
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
                this.toastr.error('Greška pri učitavanju plaćanja', 'Greška');
                this.isLoading.set(false);
            }
        });
    }

    loadBankAccounts() {
        this.bankAccountService.getAll().subscribe({
            next: (accounts) => {
                this.bankAccounts.set(accounts.filter(a => a.isActive));
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
                            invoice.paymentStatus === 1 || invoice.paymentStatus === 3
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

        if (editing) {
            const dto: UpdatePaymentDto = {
                referenceNumber: formValue.referenceNumber || undefined,
                description: formValue.description || undefined
            };

            this.paymentService.update(editing.id, dto).subscribe({
                next: () => {
                    this.toastr.success('Plaćanje uspešno ažurirano', 'Uspeh');
                    this.loadPayments();
                    this.closeModal();
                },
                error: (err) => {
                    console.error('Error updating payment:', err);
                    this.toastr.error('Greška pri ažuriranju plaćanja', 'Greška');
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
                    this.toastr.success('Plaćanje uspešno dodato', 'Uspeh');
                    this.loadPayments();
                    this.closeModal();
                },
                error: (err) => {
                    console.error('Error creating payment:', err);
                    this.toastr.error('Greška pri dodavanju plaćanja', 'Greška');
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
                this.toastr.success('Plaćanje uspešno obrisano', 'Uspeh');
                this.loadPayments();
                this.closeDeleteConfirm();
            },
            error: (err) => {
                console.error('Error deleting payment:', err);
                this.toastr.error('Greška pri brisanju plaćanja', 'Greška');
                this.closeDeleteConfirm();
            }
        });
    }

    getPaymentTypeName(type: PaymentType): string {
        switch (type) {
            case PaymentType.InvoicePayment: return 'Plaćanje fakture';
            case PaymentType.TaxPayment: return 'Plaćanje poreza';
            case PaymentType.ExpensePayment: return 'Plaćanje troška';
            default: return 'Nepoznato';
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
        if (payment.invoice) return `Faktura #${payment.invoice.invoiceNumber}`;
        if (payment.expense) return `Trošak: ${payment.expense.name}`;
        if (payment.taxObligation) return `Porez: ${payment.taxObligation.month}/${payment.taxObligation.year}`;
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
            return `Faktura #${entity.invoiceNumber} - ${entity.client?.name || 'N/A'} - ${entity.amountToPay} ${this.getCurrencyLabel(entity.currency)}`;
        } else if (paymentType === PaymentType.ExpensePayment) {
            return `${entity.name} - ${entity.amount} RSD`;
        } else if (paymentType === PaymentType.TaxPayment) {
            return `${entity.month}/${entity.year} - ${entity.totalAmount} RSD`;
        }
        return 'N/A';
    }
}