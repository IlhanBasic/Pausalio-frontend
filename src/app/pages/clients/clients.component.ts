import { Component, inject, OnInit, signal } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ClientService } from '../../services/client.service';
import { ClientToReturnDto, AddClientDto, UpdateClientDto } from '../../models/client';
import { ClientType } from '../../enums/client-type';
import { DataTableComponent, TableColumn, TableAction } from '../../components/shared/data-table/data-table.component';

@Component({
    selector: 'app-clients',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, DataTableComponent],
    templateUrl: './clients.component.html',
    styleUrl: './clients.component.css'
})
export class ClientsComponent implements OnInit {
    clientService = inject(ClientService);
    fb = inject(FormBuilder);
    toastr = inject(ToastrService);

    clients = signal<ClientToReturnDto[]>([]);
    isLoading = signal(false);
    showModal = signal(false);
    showDeleteConfirm = signal(false);
    editingClient = signal<ClientToReturnDto | null>(null);
    deletingClient = signal<ClientToReturnDto | null>(null);

    clientForm = this.fb.group({
        name: ['', Validators.required],
        clientType: [1, Validators.required], // Default to Individual
        PIB: [''],
        MB: [''],
        address: [''],
        city: [''],
        email: ['', Validators.email],
        phone: ['']
    });

    columns: TableColumn[] = [
        { key: 'name', label: 'Naziv', sortable: true },
        { key: 'clientTypeDisplay', label: 'Tip', sortable: true },
        { key: 'PIB', label: 'PIB', sortable: false },
        { key: 'city', label: 'Grad', sortable: true },
        { key: 'email', label: 'Email', sortable: false },
        { key: 'phone', label: 'Telefon', sortable: false }
    ];

    actions: TableAction[] = [
        { label: 'Izmeni', icon: '✏️', type: 'edit' },
        { label: 'Obriši', icon: '🗑️', type: 'delete' }
    ];

    ngOnInit() {
        this.loadClients();

        // Add conditional validation for PIB based on client type
        this.clientForm.get('clientType')?.valueChanges.subscribe(clientType => {
            const pibControl = this.clientForm.get('PIB');

            // PIB is required for legal entities (domestic=2 or foreign=3)
            if (clientType === 2 || clientType === 3) {
                pibControl?.setValidators([Validators.required]);
            } else {
                pibControl?.clearValidators();
            }
            pibControl?.updateValueAndValidity();
        });
    }

    loadClients() {
        this.isLoading.set(true);
        this.clientService.getAll().subscribe({
            next: (response) => {
                const transformedData = (response.data || []).map(client => ({
                    ...client,
                    clientTypeDisplay: this.getClientTypeName(client.clientType)
                }));
                this.clients.set(transformedData);
                this.isLoading.set(false);
            },
            error: (err) => {
                console.error('Error loading clients:', err);
                this.toastr.error('Greška pri učitavanju klijenata', 'Greška');
                this.isLoading.set(false);
            }
        });
    }

    openAddModal() {
        this.editingClient.set(null);
        this.clientForm.reset({
            name: '',
            clientType: 1, // Individual
            PIB: '',
            MB: '',
            address: '',
            city: '',
            email: '',
            phone: ''
        });
        this.showModal.set(true);
    }

    openEditModal(client: ClientToReturnDto) {
        this.editingClient.set(client);
        this.clientForm.patchValue({
            name: client.name,
            clientType: client.clientType,
            PIB: client.PIB || '',
            MB: client.MB || '',
            address: client.address || '',
            city: client.city || '',
            email: client.email || '',
            phone: client.phone || ''
        });
        this.showModal.set(true);
    }

    closeModal() {
        this.showModal.set(false);
        this.clientForm.reset();
        this.editingClient.set(null);
    }

    onSubmit() {
        if (this.clientForm.invalid) {
            this.clientForm.markAllAsTouched();
            return;
        }

        const formValue = this.clientForm.value;
        const editing = this.editingClient();

        if (editing) {
            // Update existing client
            const dto: UpdateClientDto = {
                name: formValue.name!,
                clientType: Number(formValue.clientType!),
                PIB: formValue.PIB || null,
                MB: formValue.MB || undefined,
                address: formValue.address || undefined,
                city: formValue.city || undefined,
                email: formValue.email || undefined,
                phone: formValue.phone || undefined
            };

            this.clientService.update(editing.id, dto).subscribe({
                next: () => {
                    this.toastr.success('Klijent uspešno ažuriran', 'Uspeh');
                    this.loadClients();
                    this.closeModal();
                },
                error: (err) => {
                    console.error('Error updating client:', err);
                    this.toastr.error('Greška pri ažuriranju klijenta', 'Greška');
                }
            });
        } else {
            // Create new client
            const dto: AddClientDto = {
                name: formValue.name!,
                clientType: Number(formValue.clientType!),
                PIB: formValue.PIB || null,
                MB: formValue.MB || undefined,
                address: formValue.address || undefined,
                city: formValue.city || undefined,
                email: formValue.email || undefined,
                phone: formValue.phone || undefined
            };

            this.clientService.create(dto).subscribe({
                next: () => {
                    this.toastr.success('Klijent uspešno dodat', 'Uspeh');
                    this.loadClients();
                    this.closeModal();
                },
                error: (err) => {
                    console.error('Error creating client:', err);
                    this.toastr.error('Greška pri dodavanju klijenta', 'Greška');
                }
            });
        }
    }

    openDeleteConfirm(client: ClientToReturnDto) {
        this.deletingClient.set(client);
        this.showDeleteConfirm.set(true);
    }

    closeDeleteConfirm() {
        this.showDeleteConfirm.set(false);
        this.deletingClient.set(null);
    }

    confirmDelete() {
        const client = this.deletingClient();
        if (!client) return;

        this.clientService.delete(client.id).subscribe({
            next: () => {
                this.toastr.success('Klijent uspešno obrisan', 'Uspeh');
                this.loadClients();
                this.closeDeleteConfirm();
            },
            error: (err) => {
                console.error('Error deleting client:', err);
                this.toastr.error('Greška pri brisanju klijenta', 'Greška');
                this.closeDeleteConfirm();
            }
        });
    }

    getClientTypeName(type: ClientType): string {
        switch (type) {
            case ClientType.individual:
                return 'Domaće fizičko lice';
            case ClientType.domestic:
                return 'Domaće pravno lice';
            case ClientType.foreign:
                return 'Strano pravno lice';
            default:
                return 'Nepoznato';
        }
    }


}
