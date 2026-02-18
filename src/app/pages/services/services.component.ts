import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ItemService } from '../../services/item.service';
import { ItemToReturnDto, AddItemDto, UpdateItemDto } from '../../models/item';
import { ItemType } from '../../enums/item-type';
import { DataTableComponent, TableColumn, TableAction } from '../../components/shared/data-table/data-table.component';

@Component({
    selector: 'app-services',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, DataTableComponent],
    templateUrl: './services.component.html',
    styleUrl: './services.component.css'
})
export class ServicesComponent implements OnInit {
    itemService = inject(ItemService);
    fb = inject(FormBuilder);

    services = signal<ItemToReturnDto[]>([]);
    isLoading = signal(false);
    showModal = signal(false);
    showDeleteConfirm = signal(false);
    editingService = signal<ItemToReturnDto | null>(null);
    deletingService = signal<ItemToReturnDto | null>(null);
    toastr = inject(ToastrService);
    activeItemTypeFilter = signal<ItemType | null>(null);

    ItemType = ItemType;

    filteredServices = computed(() => {
        const filter = this.activeItemTypeFilter();
        if (filter === null) return this.services();
        return this.services().filter(s => s.itemType === filter);
    });

    serviceForm = this.fb.group({
        name: ['', Validators.required],
        description: [''],
        itemType: [ItemType.service, Validators.required],
        unitPrice: [0, [Validators.required, Validators.min(0)]]
    });

    columns: TableColumn[] = [
        { key: 'name', label: 'Naziv', sortable: true },
        { key: 'description', label: 'Opis', sortable: false },
        { key: 'itemTypeBadge', label: 'Tip', type: 'badge', sortable: false },
        { key: 'unitPrice', label: 'Cena (RSD)', type: 'currency', sortable: true }
    ];

    actions: TableAction[] = [
        { label: 'Izmeni', icon: '✏️', type: 'edit' },
        { label: 'Obriši', icon: '🗑️', type: 'delete' }
    ];

    ngOnInit() {
        this.loadServices();
    }

    loadServices() {
        this.isLoading.set(true);
        this.itemService.getAll().subscribe({
            next: (data) => {
                // Transform data to include display values
                const transformedData = data.map(item => ({
                    ...item,
                    itemTypeDisplay: this.getItemTypeName(item.itemType),
                    itemTypeBadge: this.getItemTypeBadge(item.itemType)
                }));
                this.services.set(transformedData);
                this.isLoading.set(false);
            },
            error: (err) => {
                console.error('Error loading services:', err);
                this.toastr.error(err.error?.message || 'Greška pri učitavanju usluga', 'Greška');
                this.isLoading.set(false);
            }
        });
    }

    setItemTypeFilter(type: ItemType | null) {
        this.activeItemTypeFilter.set(type);
    }

    openAddModal() {
        this.editingService.set(null);
        this.serviceForm.reset({
            name: '',
            description: '',
            itemType: ItemType.service,
            unitPrice: 0
        });
        this.showModal.set(true);
    }

    openEditModal(service: ItemToReturnDto) {
        this.editingService.set(service);
        this.serviceForm.patchValue({
            name: service.name,
            description: service.description || '',
            itemType: service.itemType,
            unitPrice: service.unitPrice
        });
        this.showModal.set(true);
    }

    closeModal() {
        this.showModal.set(false);
        this.serviceForm.reset();
        this.editingService.set(null);
    }

    onSubmit() {
        if (this.serviceForm.invalid) {
            this.serviceForm.markAllAsTouched();
            return;
        }

        const formValue = this.serviceForm.value;
        const editing = this.editingService();

        if (editing) {
            // Update existing service
            const dto: UpdateItemDto = {
                name: formValue.name!,
                description: formValue.description || null,
                itemType: Number(formValue.itemType!),
                unitPrice: Number(formValue.unitPrice!)
            };

            this.itemService.update(editing.id, dto).subscribe({
                next: () => {
                    this.toastr.success('Usluga uspešno ažurirana', 'Uspeh');
                    this.loadServices();
                    this.closeModal();
                },
                error: (err) => {
                    console.error('Error updating service:', err);
                    this.toastr.error(err.error?.message || 'Greška pri ažuriranju usluge', 'Greška');
                }
            });
        } else {
            // Create new service
            const dto: AddItemDto = {
                name: formValue.name!,
                description: formValue.description || null,
                itemType: Number(formValue.itemType!),
                unitPrice: Number(formValue.unitPrice!)
            };

            this.itemService.create(dto).subscribe({
                next: () => {
                    this.toastr.success('Usluga uspešno dodata', 'Uspeh');
                    this.loadServices();
                    this.closeModal();
                },
                error: (err) => {
                    console.error('Error creating service:', err);
                    this.toastr.error(err.error?.message || 'Greška pri dodavanju usluge', 'Greška');
                }
            });
        }
    }

    openDeleteConfirm(service: ItemToReturnDto) {
        this.deletingService.set(service);
        this.showDeleteConfirm.set(true);
    }

    closeDeleteConfirm() {
        this.showDeleteConfirm.set(false);
        this.deletingService.set(null);
    }

    confirmDelete() {
        const service = this.deletingService();
        if (!service) return;

        this.itemService.delete(service.id).subscribe({
            next: () => {
                this.toastr.success('Usluga uspešno obrisana', 'Uspeh');
                this.loadServices();
                this.closeDeleteConfirm();
            },
            error: (err) => {
                console.error('Error deleting service:', err);
                this.toastr.error(err.error?.message || 'Greška pri brisanju usluge', 'Greška');
                this.closeDeleteConfirm();
            }
        });
    }

    getItemTypeName(type: ItemType): string {
        return type === ItemType.product ? 'Proizvod' : 'Usluga';
    }

    getItemTypeBadge(type: ItemType): string {
        if (type === ItemType.product) {
            return '<span class="badge badge-product">Proizvod</span>';
        }
        return '<span class="badge badge-service">Usluga</span>';
    }


}
