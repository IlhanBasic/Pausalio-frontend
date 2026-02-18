import { Component, inject, OnInit, signal } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { InvoiceService } from '../../services/invoice.service';
import { ClientService } from '../../services/client.service';
import { ItemService } from '../../services/item.service';
import { ExchangeRateService } from '../../services/exchange-rate.service';
import { InvoiceToReturnDto, AddInvoiceDto, UpdateInvoiceDto } from '../../models/invoice';
import { ClientToReturnDto } from '../../models/client';
import { ItemToReturnDto } from '../../models/item';
import { InvoiceStatus } from '../../enums/invoice-status';
import { PaymentStatus } from '../../enums/payment-status';
import { Currency } from '../../enums/currency';
import { ItemType } from '../../enums/item-type';
import { ClientType } from '../../enums/client-type';
import { DataTableComponent, TableColumn, TableAction } from '../../components/shared/data-table/data-table.component';
import { AddInvoiceItemDto } from '../../models/invoice-item';

@Component({
    selector: 'app-invoices',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, DataTableComponent],
    templateUrl: './invoices.component.html',
    styleUrl: './invoices.component.css'
})
export class InvoicesComponent implements OnInit {
    invoiceService = inject(InvoiceService);
    clientService = inject(ClientService);
    itemService = inject(ItemService);
    exchangeRateService = inject(ExchangeRateService);
    fb = inject(FormBuilder);
    toastr = inject(ToastrService);

    invoices = signal<InvoiceToReturnDto[]>([]);
    clients = signal<ClientToReturnDto[]>([]);
    availableItems = signal<ItemToReturnDto[]>([]);
    isLoading = signal(false);
    showModal = signal(false);
    showDeleteConfirm = signal(false);
    editingInvoice = signal<InvoiceToReturnDto | null>(null);
    deletingInvoice = signal<InvoiceToReturnDto | null>(null);
    activeStatusFilter = signal<InvoiceStatus | null>(null);
    convertingItemIndex = signal<number | null>(null); // tracker za loading po stavci

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

    columns: TableColumn[] = [
        { key: 'invoiceNumber', label: 'Broj Fakture', sortable: true },
        { key: 'clientName', label: 'Klijent', sortable: true },
        { key: 'totalAmount', label: 'Iznos', sortable: true },
        { key: 'amountToPay', label: 'Preostalo još', sortable: true },
        { key: 'currencyDisplay', label: 'Valuta', sortable: true },
        { key: 'statusBadge', label: 'Status', type: 'badge', sortable: false },
        { key: 'issueDate', label: 'Datum Izdavanja', type: 'date', sortable: true },
        { key: 'dueDate', label: 'Rok Plaćanja', type: 'date', sortable: true }
    ];

    actions: TableAction[] = [
        { label: 'Izmeni', icon: '✏️', type: 'edit' },
        { label: 'Obriši', icon: '🗑️', type: 'delete' }
    ];

    ngOnInit() {
        this.loadInvoices();
        this.loadClients();
        this.loadItems();

        this.invoiceForm.get('clientId')?.valueChanges.subscribe((clientId) => {
            this.onClientSelected(clientId);
        });

        this.invoiceForm.get('currency')?.valueChanges.subscribe((currency) => {
            this.onCurrencyChanged(currency);
        });
    }

    getClientTypeLabel(clientType: ClientType): string {
        switch (clientType) {
            case ClientType.individual: return 'Domaći';
            case ClientType.domestic: return 'Domaći';
            case ClientType.foreign: return 'Strani';
            default: return 'Nepoznato';
        }
    }

    onCurrencyChanged(currency: Currency | null) {
        if (currency === null || currency === undefined) return;

        const clientType = this.getSelectedClientType();
        if (clientType !== ClientType.foreign) return;

        // Re-konvertuj sve stavke koje imaju selektovan item
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
                        itemGroup.patchValue({
                            unitPrice: response.data.convertedAmount
                        });
                        this.toastr.info(
                            `Stavka ${index + 1}: ${response.data.calculation}`,
                            'Konverzija valute'
                        );
                    }
                    this.convertingItemIndex.set(null);
                },
                error: (err) => {
                    console.error('Error converting currency:', err);
                    this.toastr.warning(
                        `Nije moguće konvertovati cenu za stavku ${index + 1}`,
                        'Upozorenje'
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

        // Osnovno popunjavanje
        itemGroup.patchValue({
            name: selectedItem.name,
            description: selectedItem.description || '',
            itemType: selectedItem.itemType,
            unitPrice: selectedItem.unitPrice
        });

        // Ako je strani klijent i valuta nije RSD - konvertuj cenu
        if (clientType === ClientType.foreign && currency !== Currency.RSD) {
            this.convertingItemIndex.set(index);

            this.exchangeRateService.convert(selectedItem.unitPrice, Currency.RSD, currency).subscribe({
                next: (response) => {
                    if (response.success) {
                        itemGroup.patchValue({
                            unitPrice: response.data?.convertedAmount
                        });
                        this.toastr.info(
                            `Cena konvertovana: ${response.data?.calculation}`,
                            'Konverzija valute'
                        );
                    }
                    this.convertingItemIndex.set(null);
                },
                error: (err) => {
                    console.error('Error converting currency:', err);
                    this.toastr.warning(
                        'Nije moguće konvertovati valutu, unesite cenu ručno',
                        'Upozorenje'
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
                this.toastr.error('Greška pri učitavanju faktura', 'Greška');
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
            next: (response) => {
                this.clients.set(response.data || []);
            },
            error: (err) => console.error('Error loading clients:', err)
        });
    }

    loadItems() {
        this.itemService.getAll().subscribe({
            next: (data) => {
                this.availableItems.set(data || []);
            },
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
        this.invoiceForm.reset({
            clientId: '',
            dueDate: null,
            currency: Currency.RSD,
            notes: ''
        });
        this.invoiceForm.get('currency')?.enable();
        this.itemsFormArray.clear();
        this.addItem();
        this.showModal.set(true);
    }

    openEditModal(invoice: InvoiceToReturnDto) {
        this.editingInvoice.set(invoice);
        this.itemsFormArray.clear();

        if (invoice.items && invoice.items.length > 0) {
            invoice.items.forEach(item => {
                this.itemsFormArray.push(this.createItemGroup(item));
            });
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
                    this.toastr.success('Faktura uspešno ažurirana', 'Uspeh');
                    this.loadInvoices();
                    this.closeModal();
                },
                error: (err) => {
                    console.error('Error updating invoice:', err);
                    this.toastr.error('Greška pri ažuriranju fakture', 'Greška');
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
                    this.toastr.success('Faktura uspešno kreirana', 'Uspeh');
                    this.loadInvoices();
                    this.closeModal();
                },
                error: (err) => {
                    console.error('Error creating invoice:', err);
                    this.toastr.error('Greška pri kreiranju fakture', 'Greška');
                }
            });
        }
    }

    openDeleteConfirm(invoice: InvoiceToReturnDto) {
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
                this.toastr.success('Faktura uspešno obrisana', 'Uspeh');
                this.loadInvoices(this.activeStatusFilter());
                this.closeDeleteConfirm();
            },
            error: (err) => {
                console.error('Error deleting invoice:', err);
                this.toastr.error('Greška pri brisanju fakture', 'Greška');
                this.closeDeleteConfirm();
            }
        });
    }

    getInvoiceStatusName(status: InvoiceStatus): string {
        switch (status) {
            case InvoiceStatus.draft: return 'Nacrt';
            case InvoiceStatus.sent: return 'Poslato';
            case InvoiceStatus.cancelled: return 'Otkazano';
            case InvoiceStatus.finished: return 'Završeno';
            case InvoiceStatus.archived: return 'Arhivirano';
            default: return 'Nepoznato';
        }
    }

    getInvoiceStatusBadge(status: InvoiceStatus): string {
        switch (status) {
            case InvoiceStatus.draft:
                return '<span class="badge badge-draft">Nacrt</span>';
            case InvoiceStatus.sent:
                return '<span class="badge badge-sent">Poslato</span>';
            case InvoiceStatus.cancelled:
                return '<span class="badge badge-cancelled">Otkazano</span>';
            case InvoiceStatus.finished:
                return '<span class="badge badge-finished">Završeno</span>';
            case InvoiceStatus.archived:
                return '<span class="badge badge-archived">Arhivirano</span>';
            default:
                return '<span class="badge badge-unknown">Nepoznato</span>';
        }
    }
}