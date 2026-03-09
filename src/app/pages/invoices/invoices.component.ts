import { Component, inject, OnInit, signal } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core'; // DODATO
import { InvoiceService } from '../../services/invoice.service';
import { ClientService } from '../../services/client.service';
import { ItemService } from '../../services/item.service';
import { ExchangeRateService } from '../../services/exchange-rate.service';
import { PaymentService } from '../../services/payment.service';
import { BankAccountService } from '../../services/bank-account.service';
import { InvoiceToReturnDto, AddInvoiceDto, UpdateInvoiceDto } from '../../models/invoice';
import { ClientToReturnDto } from '../../models/client';
import { ItemToReturnDto } from '../../models/item';
import { BankAccountToReturnDto } from '../../models/bank-account';
import { InvoiceStatus } from '../../enums/invoice-status';
import { PaymentStatus } from '../../enums/payment-status';
import { Currency } from '../../enums/currency';
import { ItemType } from '../../enums/item-type';
import { ClientType } from '../../enums/client-type';
import { PaymentType } from '../../enums/payment-type';
import { DataTableComponent, TableColumn, TableAction } from '../../components/shared/data-table/data-table.component';
import { AddInvoiceItemDto } from '../../models/invoice-item';
import { Router } from '@angular/router';

@Component({
    selector: 'app-invoices',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, DataTableComponent, TranslateModule], // DODATO TranslateModule
    templateUrl: './invoices.component.html',
    styleUrl: './invoices.component.css'
})
export class InvoicesComponent implements OnInit {
    invoiceService = inject(InvoiceService);
    clientService = inject(ClientService);
    itemService = inject(ItemService);
    exchangeRateService = inject(ExchangeRateService);
    paymentService = inject(PaymentService);
    bankAccountService = inject(BankAccountService);
    fb = inject(FormBuilder);
    toastr = inject(ToastrService);
    private router = inject(Router);
    private translate = inject(TranslateService); // DODATO

    invoices = signal<InvoiceToReturnDto[]>([]);
    clients = signal<ClientToReturnDto[]>([]);
    availableItems = signal<ItemToReturnDto[]>([]);
    bankAccounts = signal<BankAccountToReturnDto[]>([]);
    isLoading = signal(false);
    showModal = signal(false);
    showDeleteConfirm = signal(false);
    showPaymentModal = signal(false);
    showArchiveConfirm = signal(false);
    showCancelConfirm = signal(false);
    editingInvoice = signal<InvoiceToReturnDto | null>(null);
    deletingInvoice = signal<InvoiceToReturnDto | null>(null);
    payingInvoice = signal<InvoiceToReturnDto | null>(null);
    archivingInvoice = signal<InvoiceToReturnDto | null>(null);
    cancellingInvoice = signal<InvoiceToReturnDto | null>(null);
    activeStatusFilter = signal<InvoiceStatus | null>(null);
    convertingItemIndex = signal<number | null>(null);

    InvoiceStatus = InvoiceStatus;
    PaymentStatus = PaymentStatus;
    Currency = Currency;
    ItemType = ItemType;
    ClientType = ClientType;

    invoiceForm: FormGroup = this.fb.group({
        clientId: ['', Validators.required],
        dueDate: [null],
        currency: [Currency.RSD, Validators.required],
        notes: [''],
        items: this.fb.array([])
    });

    paymentForm: FormGroup = this.fb.group({
        amount: [0, [Validators.required, Validators.min(0.01)]],
        bankAccountId: ['']
    });

    columns: TableColumn[] = [
        { key: 'invoiceNumber', label: 'INVOICES.COLUMN_INVOICE_NUMBER', sortable: true },
        { key: 'clientName', label: 'INVOICES.COLUMN_CLIENT', sortable: true },
        { key: 'totalAmount', label: 'INVOICES.COLUMN_AMOUNT', sortable: true },
        { key: 'amountToPay', label: 'INVOICES.COLUMN_REMAINING', sortable: true },
        { key: 'currencyDisplay', label: 'INVOICES.COLUMN_CURRENCY', sortable: true },
        { key: 'statusBadge', label: 'INVOICES.COLUMN_STATUS', type: 'badge', sortable: false },
        { key: 'issueDate', label: 'INVOICES.COLUMN_ISSUE_DATE', type: 'date', sortable: true },
        { key: 'dueDate', label: 'INVOICES.COLUMN_DUE_DATE', type: 'date', sortable: true }
    ];

    actions: TableAction[] = [
        {
            label: this.translate.instant('INVOICES.ACTION_EDIT'),
            icon: '✏️',
            type: 'edit',
            showCondition: (item) =>
                item.paymentStatus !== PaymentStatus.paid &&
                item.invoiceStatus !== InvoiceStatus.cancelled &&
                item.invoiceStatus !== InvoiceStatus.archived
        },
        {
            label: this.translate.instant('INVOICES.ACTION_PAY'),
            icon: '💳',
            type: 'custom',
            showCondition: (item) =>
                item.paymentStatus !== PaymentStatus.paid &&
                item.invoiceStatus !== InvoiceStatus.cancelled &&
                item.invoiceStatus !== InvoiceStatus.archived
        },
        {
            label: this.translate.instant('INVOICES.ACTION_ARCHIVE'),
            icon: '📦',
            type: 'custom',
            showCondition: (item) =>
                item.invoiceStatus === InvoiceStatus.finished
        },
        {
            label: this.translate.instant('INVOICES.ACTION_CANCEL'),
            icon: '❌',
            type: 'custom',
            showCondition: (item) =>
                item.invoiceStatus !== InvoiceStatus.archived &&
                item.invoiceStatus !== InvoiceStatus.cancelled
        },
        {
            label: this.translate.instant('INVOICES.ACTION_DELETE'),
            icon: '🗑️',
            type: 'delete',
            showCondition: (item) =>
                item.invoiceStatus !== InvoiceStatus.archived
        },
        {
            label: this.translate.instant('INVOICES.ACTION_DETAILS'),
            icon: '👁️',
            type: 'custom',
            showCondition: () => true
        },
    ];

    // --- Custom actions handling from table ---
    onCustomAction(event: { action: string, item: any }) {
        const invoice = event.item;

        switch (event.action) {
            case this.translate.instant('INVOICES.ACTION_PAY'):
                this.openPaymentModal(invoice);
                break;
            case this.translate.instant('INVOICES.ACTION_ARCHIVE'):
                this.openArchiveConfirm(invoice);
                break;
            case this.translate.instant('INVOICES.ACTION_CANCEL'):
                this.openCancelConfirm(invoice);
                break;
            case this.translate.instant('INVOICES.ACTION_DETAILS'):
                this.router.navigate(['/invoices', invoice.id]);
                break;
            default:
                console.warn('Nepoznata akcija:', event.action);
        }
    }

    ngOnInit() {
        this.loadInvoices();
        this.loadClients();
        this.loadItems();
        this.loadBankAccounts();

        this.invoiceForm.get('clientId')?.valueChanges.subscribe((clientId) => {
            this.onClientSelected(clientId);
        });

        this.invoiceForm.get('currency')?.valueChanges.subscribe((currency) => {
            this.onCurrencyChanged(currency);
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

    getClientTypeLabel(clientType: ClientType): string {
        switch (clientType) {
            case ClientType.individual:
            case ClientType.domestic:
                return this.translate.instant('INVOICES.FIELD_CLIENT_DOMESTIC');
            case ClientType.foreign:
                return this.translate.instant('INVOICES.FIELD_CLIENT_FOREIGN');
            default:
                return this.translate.instant('INVOICES.FIELD_CLIENT_UNKNOWN');
        }
    }

    onCurrencyChanged(currency: Currency | null) {
        if (currency === null || currency === undefined) return;

        const clientType = this.getSelectedClientType();
        if (clientType !== ClientType.foreign) return;

        this.itemsFormArray.controls.forEach((control, index) => {
            const itemGroup = control as FormGroup;
            const selectedItemId = itemGroup.get('selectedItemId')?.value;
            if (!selectedItemId) return;

            const selectedItem = this.availableItems().find(x => x.id === selectedItemId);
            if (!selectedItem) return;

            this.convertingItemIndex.set(index);

            this.exchangeRateService.convert(selectedItem.unitPrice, Currency.RSD, currency).subscribe({
                next: (response) => {
                    if (response.success && response.data) {
                        itemGroup.patchValue({ unitPrice: response.data.convertedAmount });
                        this.toastr.info(
                            this.translate.instant('INVOICES.TOAST_CONVERT_INFO', {
                                index: index + 1,
                                calculation: response.data.calculation
                            }),
                            this.translate.instant('INVOICES.TOAST_INFO_TITLE')
                        );
                    }
                    this.convertingItemIndex.set(null);
                },
                error: (err) => {
                    console.error('Error converting currency:', err);
                    this.toastr.warning(
                        this.translate.instant('INVOICES.TOAST_CONVERT_WARNING', { index: index + 1 }),
                        this.translate.instant('INVOICES.TOAST_WARNING_TITLE')
                    );
                    this.convertingItemIndex.set(null);
                }
            });
        });
    }

    onClientSelected(clientId: string | null) {
        const currencyControl = this.invoiceForm.get('currency');

        if (!clientId) {
            currencyControl?.enable();
            currencyControl?.setValue(Currency.RSD);
            return;
        }

        const client = this.clients().find(c => c.id === clientId);
        if (!client) return;

        if (client.clientType === ClientType.individual || client.clientType === ClientType.domestic) {
            currencyControl?.setValue(Currency.RSD);
            currencyControl?.disable();
        } else {
            currencyControl?.enable();
            currencyControl?.setValue(Currency.EUR);
        }
    }

    onItemSelect(index: number, event: any) {
        const selectedId = event.target.value;
        const selectedItem = this.availableItems().find(x => x.id === selectedId);
        if (!selectedItem) return;

        const itemGroup = this.itemsFormArray.at(index) as FormGroup;
        const clientType = this.getSelectedClientType();
        const currency = this.invoiceForm.getRawValue().currency as Currency;

        itemGroup.patchValue({
            name: selectedItem.name,
            description: selectedItem.description || '',
            itemType: selectedItem.itemType,
            unitPrice: selectedItem.unitPrice
        });

        if (clientType === ClientType.foreign && currency !== Currency.RSD) {
            this.convertingItemIndex.set(index);

            this.exchangeRateService.convert(selectedItem.unitPrice, Currency.RSD, currency).subscribe({
                next: (response) => {
                    if (response.success && response.data) {
                        itemGroup.patchValue({ unitPrice: response.data.convertedAmount });
                        this.toastr.info(
                            this.translate.instant('INVOICES.TOAST_CONVERT_CURRENCY', {
                                calculation: response.data.calculation
                            }),
                            this.translate.instant('INVOICES.TOAST_INFO_TITLE')
                        );
                    }
                    this.convertingItemIndex.set(null);
                },
                error: (err) => {
                    console.error('Error converting currency:', err);
                    this.toastr.warning(
                        err.error?.message || this.translate.instant('INVOICES.TOAST_CONVERT_WARNING', { index: index + 1 }),
                        this.translate.instant('INVOICES.TOAST_WARNING_TITLE')
                    );
                    this.convertingItemIndex.set(null);
                }
            });
        }
    }

    getSelectedClientType(): ClientType | null {
        const clientId = this.invoiceForm.get('clientId')?.value;
        if (!clientId) return null;
        const client = this.clients().find(c => c.id === clientId);
        return client?.clientType ?? null;
    }

    getPayingInvoiceClientType(): ClientType | null {
        const invoice = this.payingInvoice();
        if (!invoice) return null;
        return invoice.client.clientType;
    }

    get itemsFormArray() {
        return this.invoiceForm.get('items') as FormArray;
    }

    loadInvoices(status?: InvoiceStatus | null) {
        this.isLoading.set(true);
        const obs = (status !== null && status !== undefined)
            ? this.invoiceService.getByStatus(status)
            : this.invoiceService.getAll();
        obs.subscribe({
            next: (response) => {
                const transformedData = (response.data || []).map(invoice => ({
                    ...invoice,
                    clientName: invoice.client?.name || 'Nepoznato',
                    currencyDisplay: Currency[invoice.currency],
                    statusDisplay: this.getInvoiceStatusName(invoice.invoiceStatus),
                    statusBadge: this.getInvoiceStatusBadge(invoice.invoiceStatus)
                }));
                this.invoices.set(transformedData);
                this.isLoading.set(false);
            },
            error: (err) => {
                console.error('Error loading invoices:', err);
                this.toastr.error(
                    err.error?.message || this.translate.instant('INVOICES.TOAST_LOAD_ERROR'),
                    this.translate.instant('INVOICES.TOAST_ERROR_TITLE')
                );
                this.isLoading.set(false);
            }
        });
    }

    setStatusFilter(status: InvoiceStatus | null) {
        this.activeStatusFilter.set(status);
        this.loadInvoices(status);
    }

    loadClients() {
        this.clientService.getAll().subscribe({
            next: (response) => this.clients.set(response.data || []),
            error: (err) => console.error('Error loading clients:', err)
        });
    }

    loadItems() {
        this.itemService.getAll().subscribe({
            next: (data) => this.availableItems.set(data || []),
            error: (err) => console.error('Error loading items:', err)
        });
    }

    createItemGroup(item?: any): FormGroup {
        return this.fb.group({
            selectedItemId: [''],
            name: [item?.name || '', Validators.required],
            description: [item?.description || ''],
            itemType: [item?.itemType || ItemType.service, Validators.required],
            quantity: [item?.quantity || 1, [Validators.required, Validators.min(0.01)]],
            unitPrice: [item?.unitPrice || 0, [Validators.required, Validators.min(0)]]
        });
    }

    addItem() {
        this.itemsFormArray.push(this.createItemGroup());
    }

    removeItem(index: number) {
        this.itemsFormArray.removeAt(index);
    }

    openAddModal() {
        this.editingInvoice.set(null);
        this.invoiceForm.reset({ clientId: '', dueDate: null, currency: Currency.RSD, notes: '' });
        this.invoiceForm.get('currency')?.enable();
        this.itemsFormArray.clear();
        this.addItem();
        this.showModal.set(true);
    }

    openEditModal(invoice: InvoiceToReturnDto) {
        // Arhivirane i otkazane fakture se ne mogu menjati
        if (invoice.invoiceStatus === InvoiceStatus.archived) {
            this.toastr.warning(
                this.translate.instant('INVOICES.WARNING_CANNOT_EDIT_ARCHIVED'),
                this.translate.instant('INVOICES.TOAST_WARNING_TITLE')
            );
            return;
        }

        if (invoice.invoiceStatus === InvoiceStatus.cancelled) {
            this.toastr.warning(
                this.translate.instant('INVOICES.WARNING_CANNOT_EDIT_CANCELLED'),
                this.translate.instant('INVOICES.TOAST_WARNING_TITLE')
            );
            return;
        }
        if (invoice.paymentStatus === PaymentStatus.paid) {
            this.toastr.warning(
                this.translate.instant('INVOICES.WARNING_CANNOT_EDIT_PAID'),
                this.translate.instant('INVOICES.TOAST_WARNING_TITLE')
            );
            return;
        }

        this.editingInvoice.set(invoice);
        this.itemsFormArray.clear();

        if (invoice.items && invoice.items.length > 0) {
            invoice.items.forEach(item => this.itemsFormArray.push(this.createItemGroup(item)));
        } else {
            this.addItem();
        }

        this.invoiceForm.patchValue({
            clientId: invoice.client.id,
            dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : null,
            currency: invoice.currency,
            notes: invoice.notes
        });

        const client = this.clients().find(c => c.id === invoice.client.id);
        if (client && (client.clientType === ClientType.individual || client.clientType === ClientType.domestic)) {
            this.invoiceForm.get('currency')?.disable();
        } else {
            this.invoiceForm.get('currency')?.enable();
        }

        this.showModal.set(true);
    }

    closeModal() {
        this.showModal.set(false);
        this.invoiceForm.reset();
        this.itemsFormArray.clear();
        this.editingInvoice.set(null);
        this.invoiceForm.get('currency')?.enable();
        this.convertingItemIndex.set(null);
    }

    // --- Payment Modal ---
    openPaymentModal(invoice: InvoiceToReturnDto) {
        if (invoice.invoiceStatus === InvoiceStatus.archived) {
            this.toastr.warning(
                this.translate.instant('INVOICES.WARNING_CANNOT_PAY_ARCHIVED'),
                this.translate.instant('INVOICES.TOAST_WARNING_TITLE')
            );
            return;
        }

        if (invoice.invoiceStatus === InvoiceStatus.cancelled) {
            this.toastr.warning(
                this.translate.instant('INVOICES.WARNING_CANNOT_PAY_CANCELLED'),
                this.translate.instant('INVOICES.TOAST_WARNING_TITLE')
            );
            return;
        }

        if (invoice.paymentStatus === PaymentStatus.paid) {
            this.toastr.info(
                this.translate.instant('INVOICES.WARNING_ALREADY_PAID'),
                this.translate.instant('INVOICES.TOAST_INFO_TITLE')
            );
            return;
        }

        this.payingInvoice.set(invoice);

        const clientType = invoice.client.clientType;
        const bankAccountIdControl = this.paymentForm.get('bankAccountId');

        // Strani klijent - bankovni racun obavezan
        if (clientType === ClientType.foreign) {
            bankAccountIdControl?.setValidators([Validators.required]);
        } else {
            bankAccountIdControl?.clearValidators();
        }
        bankAccountIdControl?.updateValueAndValidity();

        this.bankAccountService.getAll().subscribe({
        next: (accounts) => {
        const filtered = accounts.filter(a => {
            if (!a.isActive) return false;
            if (clientType === ClientType.foreign) {
            return a.currency !== Currency.RSD;
            } else {
            return a.currency === Currency.RSD;
            }
        });
        this.bankAccounts.set(filtered);
        },
        error: (err) => console.error('Error loading bank accounts:', err)
        });

        this.paymentForm.reset({
            amount: invoice.amountToPay,
            bankAccountId: ''
        });

        this.showPaymentModal.set(true);
    }

    closePaymentModal() {
        this.showPaymentModal.set(false);
        this.payingInvoice.set(null);
        this.paymentForm.reset();
        this.paymentForm.get('bankAccountId')?.clearValidators();
        this.paymentForm.get('bankAccountId')?.updateValueAndValidity();
    }

    onSubmitPayment() {
        if (this.paymentForm.invalid) {
            this.paymentForm.markAllAsTouched();
            return;
        }

        const invoice = this.payingInvoice();
        if (!invoice) return;

        const formValue = this.paymentForm.value;

        const dto = {
            paymentType: PaymentType.InvoicePayment,
            entityId: invoice.id,
            amount: formValue.amount,
            currency: invoice.currency,
            bankAccountId: formValue.bankAccountId || undefined
        };

        this.paymentService.create(dto).subscribe({
            next: () => {
                this.toastr.success(
                    this.translate.instant('INVOICES.TOAST_PAYMENT_SUCCESS'),
                    this.translate.instant('INVOICES.TOAST_SUCCESS_TITLE')
                );
                this.loadInvoices(this.activeStatusFilter());
                this.closePaymentModal();
            },
            error: (err) => {
                console.error('Error creating payment:', err);
                this.toastr.error(
                    err.error?.message || this.translate.instant('INVOICES.TOAST_PAYMENT_ERROR'),
                    this.translate.instant('INVOICES.TOAST_ERROR_TITLE')
                );
            }
        });
    }

    getCurrencyLabel(currency: Currency): string {
        return Currency[currency];
    }

    // --- Archive ---
    openArchiveConfirm(invoice: InvoiceToReturnDto) {
        if (invoice.invoiceStatus !== InvoiceStatus.finished) {
            this.toastr.warning(
                this.translate.instant('INVOICES.WARNING_CANNOT_ARCHIVE_NOT_FINISHED'),
                this.translate.instant('INVOICES.TOAST_WARNING_TITLE')
            );
            return;
        }

        this.archivingInvoice.set(invoice);
        this.showArchiveConfirm.set(true);
    }

    closeArchiveConfirm() {
        this.showArchiveConfirm.set(false);
        this.archivingInvoice.set(null);
    }

    confirmArchive() {
        const invoice = this.archivingInvoice();
        if (!invoice) return;

        this.invoiceService.archiveInvoice(invoice.id).subscribe({
            next: () => {
                this.toastr.success(
                    this.translate.instant('INVOICES.TOAST_ARCHIVE_SUCCESS'),
                    this.translate.instant('INVOICES.TOAST_SUCCESS_TITLE')
                );
                this.loadInvoices(this.activeStatusFilter());
                this.closeArchiveConfirm();
            },
            error: (err) => {
                console.error('Error archiving invoice:', err);
                this.toastr.error(
                    err.error?.message || this.translate.instant('INVOICES.TOAST_ARCHIVE_ERROR'),
                    this.translate.instant('INVOICES.TOAST_ERROR_TITLE')
                );
                this.closeArchiveConfirm();
            }
        });
    }

    // --- Cancel ---
    openCancelConfirm(invoice: InvoiceToReturnDto) {
        if (invoice.invoiceStatus === InvoiceStatus.cancelled) {
            this.toastr.warning(
                this.translate.instant('INVOICES.WARNING_ALREADY_CANCELLED'),
                this.translate.instant('INVOICES.TOAST_WARNING_TITLE')
            );
            return;
        }

        if (invoice.invoiceStatus === InvoiceStatus.archived) {
            this.toastr.warning(
                this.translate.instant('INVOICES.WARNING_CANNOT_CANCEL_ARCHIVED'),
                this.translate.instant('INVOICES.TOAST_WARNING_TITLE')
            );
            return;
        }

        this.cancellingInvoice.set(invoice);
        this.showCancelConfirm.set(true);
    }

    closeCancelConfirm() {
        this.showCancelConfirm.set(false);
        this.cancellingInvoice.set(null);
    }

    confirmCancel() {
        const invoice = this.cancellingInvoice();
        if (!invoice) return;

        this.invoiceService.cancelInvoice(invoice.id).subscribe({
            next: () => {
                this.toastr.success(
                    this.translate.instant('INVOICES.TOAST_CANCEL_SUCCESS'),
                    this.translate.instant('INVOICES.TOAST_SUCCESS_TITLE')
                );
                this.loadInvoices(this.activeStatusFilter());
                this.closeCancelConfirm();
            },
            error: (err) => {
                console.error('Error cancelling invoice:', err);
                this.toastr.error(
                    err.error?.message || this.translate.instant('INVOICES.TOAST_CANCEL_ERROR'),
                    this.translate.instant('INVOICES.TOAST_ERROR_TITLE')
                );
                this.closeCancelConfirm();
            }
        });
    }

    // --- Delete ---
    openDeleteConfirm(invoice: InvoiceToReturnDto) {
        if (invoice.invoiceStatus === InvoiceStatus.archived) {
            this.toastr.warning(
                this.translate.instant('INVOICES.WARNING_CANNOT_DELETE_ARCHIVED'),
                this.translate.instant('INVOICES.TOAST_WARNING_TITLE')
            );
            return;
        }

        this.deletingInvoice.set(invoice);
        this.showDeleteConfirm.set(true);
    }

    closeDeleteConfirm() {
        this.showDeleteConfirm.set(false);
        this.deletingInvoice.set(null);
    }

    confirmDelete() {
        const invoice = this.deletingInvoice();
        if (!invoice) return;

        this.invoiceService.delete(invoice.id).subscribe({
            next: () => {
                this.toastr.success(
                    this.translate.instant('INVOICES.TOAST_DELETE_SUCCESS'),
                    this.translate.instant('INVOICES.TOAST_SUCCESS_TITLE')
                );
                this.loadInvoices(this.activeStatusFilter());
                this.closeDeleteConfirm();
            },
            error: (err) => {
                console.error('Error deleting invoice:', err);
                this.toastr.error(
                    err.error?.message || this.translate.instant('INVOICES.TOAST_DELETE_ERROR'),
                    this.translate.instant('INVOICES.TOAST_ERROR_TITLE')
                );
                this.closeDeleteConfirm();
            }
        });
    }

    // --- Submit invoice form ---
    onSubmit() {
        if (this.invoiceForm.invalid) {
            this.invoiceForm.markAllAsTouched();
            return;
        }

        const formValue = this.invoiceForm.getRawValue();
        const editing = this.editingInvoice();

        const itemsDto: AddInvoiceItemDto[] = formValue.items.map((item: any) => ({
            name: item.name,
            description: item.description,
            itemType: Number(item.itemType),
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice)
        }));

        if (editing) {
            const dto: UpdateInvoiceDto = {
                clientId: formValue.clientId,
                dueDate: formValue.dueDate ? new Date(formValue.dueDate) : null,
                currency: Number(formValue.currency),
                notes: formValue.notes,
                items: itemsDto,
                invoiceStatus: editing.invoiceStatus,
                paymentStatus: editing.paymentStatus
            };

            this.invoiceService.update(editing.id, dto).subscribe({
                next: () => {
                    this.toastr.success(
                        this.translate.instant('INVOICES.TOAST_UPDATE_SUCCESS'),
                        this.translate.instant('INVOICES.TOAST_SUCCESS_TITLE')
                    );
                    this.loadInvoices();
                    this.closeModal();
                },
                error: (err) => {
                    console.error('Error updating invoice:', err);
                    this.toastr.error(
                        err.error?.message || this.translate.instant('INVOICES.TOAST_UPDATE_ERROR'),
                        this.translate.instant('INVOICES.TOAST_ERROR_TITLE')
                    );
                }
            });
        } else {
            const dto: AddInvoiceDto = {
                clientId: formValue.clientId,
                dueDate: formValue.dueDate ? new Date(formValue.dueDate) : null,
                currency: Number(formValue.currency),
                notes: formValue.notes,
                items: itemsDto
            };

            this.invoiceService.create(dto).subscribe({
                next: () => {
                    this.toastr.success(
                        this.translate.instant('INVOICES.TOAST_CREATE_SUCCESS'),
                        this.translate.instant('INVOICES.TOAST_SUCCESS_TITLE')
                    );
                    this.loadInvoices();
                    this.closeModal();
                },
                error: (err) => {
                    console.error('Error creating invoice:', err);
                    this.toastr.error(
                        err.error?.message || this.translate.instant('INVOICES.TOAST_CREATE_ERROR'),
                        this.translate.instant('INVOICES.TOAST_ERROR_TITLE')
                    );
                }
            });
        }
    }

    // --- Helpers ---
    getInvoiceStatusName(status: InvoiceStatus): string {
        switch (status) {
            case InvoiceStatus.draft: return this.translate.instant('INVOICES.STATUS_DRAFT');
            case InvoiceStatus.sent: return this.translate.instant('INVOICES.STATUS_SENT');
            case InvoiceStatus.cancelled: return this.translate.instant('INVOICES.STATUS_CANCELLED');
            case InvoiceStatus.finished: return this.translate.instant('INVOICES.STATUS_FINISHED');
            case InvoiceStatus.archived: return this.translate.instant('INVOICES.STATUS_ARCHIVED');
            default: return this.translate.instant('INVOICES.STATUS_UNKNOWN');
        }
    }

    getInvoiceStatusBadge(status: InvoiceStatus): string {
        switch (status) {
            case InvoiceStatus.draft:
                return `<span class="badge badge-draft">${this.translate.instant('INVOICES.STATUS_DRAFT')}</span>`;
            case InvoiceStatus.sent:
                return `<span class="badge badge-sent">${this.translate.instant('INVOICES.STATUS_SENT')}</span>`;
            case InvoiceStatus.cancelled:
                return `<span class="badge badge-cancelled">${this.translate.instant('INVOICES.STATUS_CANCELLED')}</span>`;
            case InvoiceStatus.finished:
                return `<span class="badge badge-finished">${this.translate.instant('INVOICES.STATUS_FINISHED')}</span>`;
            case InvoiceStatus.archived:
                return `<span class="badge badge-archived">${this.translate.instant('INVOICES.STATUS_ARCHIVED')}</span>`;
            default:
                return `<span class="badge badge-unknown">${this.translate.instant('INVOICES.STATUS_UNKNOWN')}</span>`;
        }
    }
}