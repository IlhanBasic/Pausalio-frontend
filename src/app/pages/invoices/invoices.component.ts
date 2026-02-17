import { Component, inject, OnInit, signal } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { InvoiceService } from '../../services/invoice.service';
import { ClientService } from '../../services/client.service';
import { ItemService } from '../../services/item.service';
import { InvoiceToReturnDto, AddInvoiceDto, UpdateInvoiceDto } from '../../models/invoice';
import { ClientToReturnDto } from '../../models/client';
import { ItemToReturnDto } from '../../models/item';
import { InvoiceStatus } from '../../enums/invoice-status';
import { PaymentStatus } from '../../enums/payment-status';
import { Currency } from '../../enums/currency';
import { ItemType } from '../../enums/item-type';
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
    fb = inject(FormBuilder);

    invoices = signal<InvoiceToReturnDto[]>([]);
    clients = signal<ClientToReturnDto[]>([]);
    availableItems = signal<ItemToReturnDto[]>([]);
    isLoading = signal(false);
    showModal = signal(false);
    showDeleteConfirm = signal(false);
    editingInvoice = signal<InvoiceToReturnDto | null>(null);
    deletingInvoice = signal<InvoiceToReturnDto | null>(null);
    toastr = inject(ToastrService);

    // Enums for template
    InvoiceStatus = InvoiceStatus;
    PaymentStatus = PaymentStatus;
    Currency = Currency;
    ItemType = ItemType;

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
        { key: 'currencyDisplay', label: 'Valuta', sortable: true },
        { key: 'statusDisplay', label: 'Status', sortable: true },
        { key: 'issueDate', label: 'Datum Izdavanja', sortable: true },
        { key: 'dueDate', label: 'Rok Plaćanja', sortable: true }
    ];

    actions: TableAction[] = [
        { label: 'Izmeni', icon: '✏️', type: 'edit' },
        { label: 'Obriši', icon: '🗑️', type: 'delete' }
    ];

    ngOnInit() {
        this.loadInvoices();
        this.loadClients();
        this.loadItems();
    }

    get itemsFormArray() {
        return this.invoiceForm.get('items') as FormArray;
    }

    loadInvoices() {
        this.isLoading.set(true);
        this.invoiceService.getAll().subscribe({
            next: (response) => {
                const transformedData = (response.data || []).map(invoice => ({
                    ...invoice,
                    clientName: invoice.client?.name || 'Nepoznato',
                    currencyDisplay: Currency[invoice.currency],
                    statusDisplay: InvoiceStatus[invoice.invoiceStatus]
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

    loadClients() {
        this.clientService.getAll().subscribe({
            next: (response) => {
                this.clients.set(response.data || []);
            },
            error: (err) => {
                console.error('Error loading clients:', err);
            }
        });
    }

    loadItems() {
        this.itemService.getAll().subscribe({
            next: (data) => {
                this.availableItems.set(data || []);
            },
            error: (err) => {
                console.error('Error loading items:', err);
            }
        });
    }

    createItemGroup(item?: any): FormGroup {
        return this.fb.group({
            selectedItemId: [''], // Control for the dropdown
            name: [item?.name || '', Validators.required],
            description: [item?.description || ''],
            itemType: [item?.itemType || ItemType.service, Validators.required],
            quantity: [item?.quantity || 1, [Validators.required, Validators.min(0.01)]],
            unitPrice: [item?.unitPrice || 0, [Validators.required, Validators.min(0)]]
        });
    }

    onItemSelect(index: number, event: any) {
        const selectedId = event.target.value;
        const selectedItem = this.availableItems().find(x => x.id === selectedId);

        if (selectedItem) {
            const itemGroup = this.itemsFormArray.at(index) as FormGroup;
            itemGroup.patchValue({
                name: selectedItem.name,
                description: selectedItem.description || '',
                itemType: selectedItem.itemType,
                unitPrice: selectedItem.unitPrice
            });
        }
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
        this.itemsFormArray.clear();
        this.addItem(); // Add one empty item by default
        this.showModal.set(true);
    }

    openEditModal(invoice: InvoiceToReturnDto) {
        this.editingInvoice.set(invoice);

        // Clear existing items
        this.itemsFormArray.clear();

        // Add items from invoice
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

        this.showModal.set(true);
    }

    closeModal() {
        this.showModal.set(false);
        this.invoiceForm.reset();
        this.itemsFormArray.clear();
        this.editingInvoice.set(null);
    }

    onSubmit() {
        if (this.invoiceForm.invalid) {
            this.invoiceForm.markAllAsTouched();
            return;
        }

        const formValue = this.invoiceForm.value;
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
                // Preserve existing status/payment status if not managed here
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
                this.loadInvoices();
                this.closeDeleteConfirm();
            },
            error: (err) => {
                console.error('Error deleting invoice:', err);
                this.toastr.error('Greška pri brisanju fakture', 'Greška');
                this.closeDeleteConfirm();
            }
        });
    }


}
