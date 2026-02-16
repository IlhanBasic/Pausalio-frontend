import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PaymentService } from '../../services/payment.service';
import { InvoiceService } from '../../services/invoice.service';
import { ExpenseService } from '../../services/expense.service';
import { TaxObligationService } from '../../services/tax-obligation.service';
import { PaymentToReturnDto, AddPaymentDto, UpdatePaymentDto } from '../../models/payment';
import { InvoiceToReturnDto } from '../../models/invoice';
import { ExpenseToReturnDto } from '../../models/expense';
import { TaxObligationToReturnDto } from '../../models/tax-obligation';
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
    fb = inject(FormBuilder);

    payments = signal<PaymentToReturnDto[]>([]);
    invoices = signal<InvoiceToReturnDto[]>([]);
    expenses = signal<ExpenseToReturnDto[]>([]);
    taxObligations = signal<TaxObligationToReturnDto[]>([]);

    isLoading = signal(false);
    showModal = signal(false);
    showDeleteConfirm = signal(false);
    editingPayment = signal<PaymentToReturnDto | null>(null);
    deletingPayment = signal<PaymentToReturnDto | null>(null);
    errorMessage = signal<string | null>(null);
    successMessage = signal<string | null>(null);

    PaymentType = PaymentType;
    Currency = Currency;

    paymentForm = this.fb.group({
        paymentType: [PaymentType.InvoicePayment, Validators.required],
        entityId: ['', Validators.required],
        amount: [0, [Validators.required, Validators.min(0.01)]],
        currency: [Currency.RSD, Validators.required],
        referenceNumber: [''],
        description: ['']
    });

    columns: TableColumn[] = [
        { key: 'paymentTypeDisplay', label: 'Tip plaćanja', sortable: true },
        { key: 'entityDisplay', label: 'Entitet', sortable: false },
        { key: 'amount', label: 'Iznos', type: 'currency', sortable: true },
        { key: 'currencyDisplay', label: 'Valuta', sortable: true },
        { key: 'amountRSD', label: 'Iznos (RSD)', type: 'currency', sortable: true },
        { key: 'paymentDate', label: 'Datum plaćanja', type: 'date', sortable: true },
        { key: 'referenceNumber', label: 'Poziv na broj', sortable: false }
    ];

    actions: TableAction[] = [
        { label: 'Izmeni', icon: '✏️', type: 'edit' },
        { label: 'Obriši', icon: '🗑️', type: 'delete' }
    ];

    ngOnInit() {
        this.loadPayments();

        // Load entities when payment type changes
        this.paymentForm.get('paymentType')?.valueChanges.subscribe((paymentType) => {
            this.paymentForm.get('entityId')?.setValue('');
            this.loadEntitiesByType(paymentType || PaymentType.InvoicePayment);
        });

        // Load initial entities
        this.loadEntitiesByType(PaymentType.InvoicePayment);
    }

    loadPayments() {
        this.isLoading.set(true);
        this.paymentService.getAll().subscribe({
            next: (response) => {
                const transformedData = (response.data || []).map(payment => ({
                    ...payment,
                    paymentTypeDisplay: this.getPaymentTypeName(payment.paymentType),
                    currencyDisplay: this.getCurrencyName(payment.currency),
                    entityDisplay: this.getEntityDisplay(payment)
                }));
                this.payments.set(transformedData);
                this.isLoading.set(false);
            },
            error: (err) => {
                console.error('Error loading payments:', err);
                this.showError('Greška pri učitavanju plaćanja');
                this.isLoading.set(false);
            }
        });
    }

    loadEntitiesByType(paymentType: PaymentType) {
        switch (paymentType) {
            case PaymentType.InvoicePayment:
                // Load unpaid and partially paid invoices
                this.invoiceService.getAll().subscribe({
                    next: (response) => {
                        // Filter to show only unpaid and partially paid invoices
                        const unpaidInvoices = (response.data || []).filter(invoice =>
                            invoice.paymentStatus === 1 || invoice.paymentStatus === 3
                        );
                        this.invoices.set(unpaidInvoices);
                    },
                    error: (err) => console.error('Error loading invoices:', err)
                });
                break;
            case PaymentType.ExpensePayment:
                // Load pending expenses
                this.expenseService.getAll().subscribe({
                    next: (response) => {
                        // Filter to show only pending expenses
                        const pendingExpenses = (response.data || []).filter(expense =>
                            expense.status === 1
                        );
                        this.expenses.set(pendingExpenses);
                    },
                    error: (err) => console.error('Error loading expenses:', err)
                });
                break;
            case PaymentType.TaxPayment:
                // Load pending tax obligations
                this.taxObligationService.getAll().subscribe({
                    next: (response) => {
                        // Filter to show only pending tax obligations
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
            description: ''
        });
        this.showModal.set(true);
    }

    openEditModal(payment: PaymentToReturnDto) {
        this.editingPayment.set(payment);
        this.paymentForm.patchValue({
            referenceNumber: payment.referenceNumber || '',
            description: payment.description || ''
        });
        // Disable fields that can't be edited
        this.paymentForm.get('paymentType')?.disable();
        this.paymentForm.get('entityId')?.disable();
        this.paymentForm.get('amount')?.disable();
        this.paymentForm.get('currency')?.disable();
        this.showModal.set(true);
    }

    closeModal() {
        this.showModal.set(false);
        this.paymentForm.reset();
        this.editingPayment.set(null);
        // Re-enable all fields
        this.paymentForm.get('paymentType')?.enable();
        this.paymentForm.get('entityId')?.enable();
        this.paymentForm.get('amount')?.enable();
        this.paymentForm.get('currency')?.enable();
    }

    onSubmit() {
        if (this.paymentForm.invalid) {
            this.paymentForm.markAllAsTouched();
            return;
        }

        const formValue = this.paymentForm.getRawValue();
        const editing = this.editingPayment();

        if (editing) {
            // Update existing payment (only reference number and description)
            const dto: UpdatePaymentDto = {
                referenceNumber: formValue.referenceNumber || undefined,
                description: formValue.description || undefined
            };

            this.paymentService.update(editing.id, dto).subscribe({
                next: () => {
                    this.showSuccess('Plaćanje uspešno ažurirano');
                    this.loadPayments();
                    this.closeModal();
                },
                error: (err) => {
                    console.error('Error updating payment:', err);
                    this.showError('Greška pri ažuriranju plaćanja');
                }
            });
        } else {
            // Create new payment
            const dto: AddPaymentDto = {
                paymentType: formValue.paymentType!,
                entityId: formValue.entityId!,
                amount: formValue.amount!,
                currency: formValue.currency!,
                referenceNumber: formValue.referenceNumber || undefined,
                description: formValue.description || undefined
            };

            this.paymentService.create(dto).subscribe({
                next: () => {
                    this.showSuccess('Plaćanje uspešno dodato');
                    this.loadPayments();
                    this.closeModal();
                },
                error: (err) => {
                    console.error('Error creating payment:', err);
                    this.showError('Greška pri dodavanju plaćanja');
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
                this.showSuccess('Plaćanje uspešno obrisano');
                this.loadPayments();
                this.closeDeleteConfirm();
            },
            error: (err) => {
                console.error('Error deleting payment:', err);
                this.showError('Greška pri brisanju plaćanja');
                this.closeDeleteConfirm();
            }
        });
    }

    getPaymentTypeName(type: PaymentType): string {
        switch (type) {
            case PaymentType.InvoicePayment:
                return 'Plaćanje fakture';
            case PaymentType.TaxPayment:
                return 'Plaćanje poreza';
            case PaymentType.ExpensePayment:
                return 'Plaćanje troška';
            default:
                return 'Nepoznato';
        }
    }

    getCurrencyName(currency: Currency): string {
        switch (currency) {
            case Currency.RSD:
                return 'RSD';
            case Currency.USD:
                return 'USD';
            case Currency.EUR:
                return 'EUR';
            case Currency.GBP:
                return 'GBP';
            case Currency.CHF:
                return 'CHF';
            default:
                return 'N/A';
        }
    }

    getEntityDisplay(payment: PaymentToReturnDto): string {
        if (payment.invoice) {
            return `Faktura #${payment.invoice.invoiceNumber}`;
        } else if (payment.expense) {
            return `Trošak: ${payment.expense.name}`;
        } else if (payment.taxObligation) {
            return `Porez: ${payment.taxObligation.month}/${payment.taxObligation.year}`;
        }
        return 'N/A';
    }

    getAvailableEntities(): any[] {
        const paymentType = this.paymentForm.get('paymentType')?.value;

        switch (paymentType) {
            case PaymentType.InvoicePayment:
                return this.invoices();
            case PaymentType.ExpensePayment:
                return this.expenses();
            case PaymentType.TaxPayment:
                return this.taxObligations();
            default:
                return [];
        }
    }

    getEntityLabel(entity: any): string {
        const paymentType = this.paymentForm.get('paymentType')?.value;

        if (paymentType === PaymentType.InvoicePayment) {
            return `Faktura #${entity.invoiceNumber} - ${entity.client?.name || 'N/A'}`;
        } else if (paymentType === PaymentType.ExpensePayment) {
            return `${entity.name} - ${entity.amount} RSD`;
        } else if (paymentType === PaymentType.TaxPayment) {
            return `${entity.month}/${entity.year} - ${entity.totalAmount} RSD`;
        }
        return 'N/A';
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
