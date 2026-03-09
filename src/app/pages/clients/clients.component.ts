import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ClientService } from '../../services/client.service';
import { ClientToReturnDto, AddClientDto, UpdateClientDto } from '../../models/client';
import { ClientType } from '../../enums/client-type';
import { DataTableComponent, TableColumn, TableAction } from '../../components/shared/data-table/data-table.component';
import { CountryService } from '../../services/country.service';
import { CountryToReturnDto } from '../../models/country';

@Component({
    selector: 'app-clients',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, DataTableComponent, TranslateModule],
    templateUrl: './clients.component.html',
    styleUrl: './clients.component.css'
})
export class ClientsComponent implements OnInit {
    clientService = inject(ClientService);
    countryService = inject(CountryService);
    fb = inject(FormBuilder);
    toastr = inject(ToastrService);
    translate = inject(TranslateService);

    clients = signal<ClientToReturnDto[]>([]);
    countries = signal<CountryToReturnDto[]>([]);
    countrySearchText = signal('');
    showCountryDropdown = signal(false);
    isLoading = signal(false);
    showModal = signal(false);
    showDeleteConfirm = signal(false);
    editingClient = signal<ClientToReturnDto | null>(null);
    deletingClient = signal<ClientToReturnDto | null>(null);
    activeClientTypeFilter = signal<ClientType | null>(null);

    ClientType = ClientType;

    // Filtered countries based on search text
    filteredCountries = computed(() => {
        const searchText = this.countrySearchText().toLowerCase();
        if (!searchText) {
            return this.countries();
        }
        return this.countries().filter(country =>
            country.name.toLowerCase().includes(searchText) ||
            country.code.toLowerCase().includes(searchText)
        );
    });

    clientForm = this.fb.group({
        name: ['', Validators.required],
        clientType: [1, Validators.required], // Default to Individual
        pib: [''],
        mb: [''],
        address: [''],
        city: [''],
        email: ['', Validators.email],
        phone: ['', Validators.pattern(/^[0-9+ ]*$/)],
        countryId: [''],
        countrySearch: ['']
    });

    columns: TableColumn[] = [
        { key: 'name', label: 'CLIENTS.COLUMN_NAME', sortable: true },
        { key: 'clientTypeBadge', label: 'CLIENTS.COLUMN_TYPE', type: 'badge', sortable: false },
        { key: 'pib', label: 'CLIENTS.COLUMN_PIB', sortable: false },
        { key: 'city', label: 'CLIENTS.COLUMN_CITY', sortable: true },
        { key: 'email', label: 'CLIENTS.COLUMN_EMAIL', sortable: false },
        { key: 'phone', label: 'CLIENTS.COLUMN_PHONE', sortable: false }
    ];

    actions: TableAction[] = [
        { label: this.translate.instant('CLIENTS.ACTION_EDIT'), icon: '✏️', type: 'edit' },
        { label: this.translate.instant('CLIENTS.ACTION_DELETE'), icon: '🗑️', type: 'delete' }
    ];

    ngOnInit() {
        this.loadClients();
        this.loadCountries();

        // Add conditional validation for PIB and Country based on client type
        this.clientForm.get('clientType')?.valueChanges.subscribe(clientType => {
            const pibControl = this.clientForm.get('pib');
            const countryIdControl = this.clientForm.get('countryId');

            // PIB is required for legal entities (domestic=2 or foreign=3)
            if (clientType === 2 || clientType === 3) {
                pibControl?.setValidators([Validators.required]);
            } else {
                pibControl?.clearValidators();
            }
            pibControl?.updateValueAndValidity();

            // Country is required for foreign clients (foreign=3)
            if (clientType === 3) {
                countryIdControl?.setValidators([Validators.required]);
            } else {
                countryIdControl?.clearValidators();
                countryIdControl?.setValue('');
                this.clientForm.get('countrySearch')?.setValue('');
            }
            countryIdControl?.updateValueAndValidity();
        });

        // Handle country search input
        this.clientForm.get('countrySearch')?.valueChanges.subscribe(value => {
            this.countrySearchText.set(value || '');
        });
    }

    loadClients(type?: ClientType | null) {
        this.isLoading.set(true);
        const obs = (type !== null && type !== undefined)
            ? this.clientService.getByType(type)
            : this.clientService.getAll();
        obs.subscribe({
            next: (response) => {
                const transformedData = (response.data || []).map(client => ({
                    ...client,
                    clientTypeDisplay: this.getClientTypeName(client.clientType),
                    clientTypeBadge: this.getClientTypeBadge(client.clientType)
                }));
                this.clients.set(transformedData);
                this.isLoading.set(false);
            },
            error: (err) => {
                console.error('Error loading clients:', err);
                this.toastr.error(
                    err.error?.message || this.translate.instant('CLIENTS.TOAST_LOAD_CLIENTS_ERROR'),
                    this.translate.instant('CLIENTS.TOAST_ERROR_TITLE')
                );
                this.isLoading.set(false);
            }
        });
    }

    setClientTypeFilter(type: ClientType | null) {
        this.activeClientTypeFilter.set(type);
        this.loadClients(type);
    }

    loadCountries() {
        this.countryService.getAll().subscribe({
            next: (countries) => {
                this.countries.set(countries);
            },
            error: (err) => {
                console.error('Error loading countries:', err);
                this.toastr.error(
                    err.error?.message || this.translate.instant('CLIENTS.TOAST_LOAD_COUNTRIES_ERROR'),
                    this.translate.instant('CLIENTS.TOAST_ERROR_TITLE')
                );
            }
        });
    }

    openAddModal() {
        this.editingClient.set(null);
        this.clientForm.reset({
            name: '',
            clientType: 1, // Individual
            pib: '',
            mb: '',
            address: '',
            city: '',
            email: '',
            phone: '',
            countryId: '',
            countrySearch: ''
        });
        this.countrySearchText.set('');
        this.showCountryDropdown.set(false);
        this.showModal.set(true);
    }

    openEditModal(client: ClientToReturnDto) {
        this.editingClient.set(client);

        // Find country name and ID if client has a country
        const countryName = client.country || '';
        const countryId = client.countryId || '';

        this.clientForm.patchValue({
            name: client.name,
            clientType: client.clientType,
            pib: client.pib || '',
            mb: client.mb || '',
            address: client.address || '',
            city: client.city || '',
            email: client.email || '',
            phone: client.phone || '',
            countrySearch: countryName,
            countryId: countryId // Set directly if backend provides it
        });

        // If we don't have countryId but have country name, try to find it
        if (!countryId && countryName) {
            if (this.countries().length > 0) {
                this.setCountryIdFromName(countryName);
            } else {
                // Countries not loaded yet, wait for them
                const subscription = this.countryService.getAll().subscribe({
                    next: (countries) => {
                        this.countries.set(countries);
                        this.setCountryIdFromName(countryName);
                        subscription.unsubscribe();
                    },
                    error: (err) => {
                        console.error('Error loading countries for edit:', err);
                        subscription.unsubscribe();
                    }
                });
            }
        }

        this.showCountryDropdown.set(false);
        this.showModal.set(true);
    }

    private setCountryIdFromName(countryName: string) {
        const country = this.countries().find(c => c.name.toLowerCase() === countryName.toLowerCase());
        if (country) {
            this.clientForm.patchValue({ countryId: country.id });
        } else {
            console.warn('Country not found:', countryName, 'Available countries:', this.countries().length);
        }
    }

    closeModal() {
        this.showModal.set(false);
        this.clientForm.reset();
        this.editingClient.set(null);
        this.countrySearchText.set('');
        this.showCountryDropdown.set(false);
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
                pib: formValue.pib || null,
                mb: formValue.mb || undefined,
                address: formValue.address || undefined,
                city: formValue.city || undefined,
                email: formValue.email || undefined,
                phone: formValue.phone || undefined,
                // Only send countryId for foreign clients
                countryId: formValue.clientType === 3 ? formValue.countryId || undefined : undefined
            };

            this.clientService.update(editing.id, dto).subscribe({
                next: () => {
                    this.toastr.success(
                        this.translate.instant('CLIENTS.TOAST_UPDATE_SUCCESS'),
                        this.translate.instant('CLIENTS.TOAST_SUCCESS_TITLE')
                    );
                    this.loadClients();
                    this.closeModal();
                },
                error: (err) => {
                    console.error('Error updating client:', err);
                    this.toastr.error(
                        err.error?.message || this.translate.instant('CLIENTS.TOAST_UPDATE_ERROR'),
                        this.translate.instant('CLIENTS.TOAST_ERROR_TITLE')
                    );
                }
            });
        } else {
            // Create new client
            const dto: AddClientDto = {
                name: formValue.name!,
                clientType: Number(formValue.clientType!),
                pib: formValue.pib || null,
                mb: formValue.mb || undefined,
                address: formValue.address || undefined,
                city: formValue.city || undefined,
                email: formValue.email || undefined,
                phone: formValue.phone || undefined,
                // Only send countryId for foreign clients
                countryId: formValue.clientType === 3 ? formValue.countryId || undefined : undefined
            };

            this.clientService.create(dto).subscribe({
                next: () => {
                    this.toastr.success(
                        this.translate.instant('CLIENTS.TOAST_CREATE_SUCCESS'),
                        this.translate.instant('CLIENTS.TOAST_SUCCESS_TITLE')
                    );
                    this.loadClients();
                    this.closeModal();
                },
                error: (err) => {
                    console.error('Error creating client:', err);
                    this.toastr.error(
                        err.error?.message || this.translate.instant('CLIENTS.TOAST_CREATE_ERROR'),
                        this.translate.instant('CLIENTS.TOAST_ERROR_TITLE')
                    );
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
                this.toastr.success(
                    this.translate.instant('CLIENTS.TOAST_DELETE_SUCCESS'),
                    this.translate.instant('CLIENTS.TOAST_SUCCESS_TITLE')
                );
                this.loadClients();
                this.closeDeleteConfirm();
            },
            error: (err) => {
                console.error('Error deleting client:', err);
                this.toastr.error(
                    err.error?.message || this.translate.instant('CLIENTS.TOAST_DELETE_ERROR'),
                    this.translate.instant('CLIENTS.TOAST_ERROR_TITLE')
                );
                this.closeDeleteConfirm();
            }
        });
    }

    getClientTypeName(type: ClientType): string {
        switch (type) {
            case ClientType.individual:
                return this.translate.instant('CLIENTS.TYPE_INDIVIDUAL');
            case ClientType.domestic:
                return this.translate.instant('CLIENTS.TYPE_DOMESTIC');
            case ClientType.foreign:
                return this.translate.instant('CLIENTS.TYPE_FOREIGN');
            default:
                return this.translate.instant('CLIENTS.TYPE_UNKNOWN');
        }
    }

    getClientTypeBadge(type: ClientType): string {
        switch (type) {
            case ClientType.individual:
                return `<span class="badge badge-individual">${this.translate.instant('CLIENTS.TYPE_INDIVIDUAL')}</span>`;
            case ClientType.domestic:
                return `<span class="badge badge-domestic">${this.translate.instant('CLIENTS.TYPE_DOMESTIC')}</span>`;
            case ClientType.foreign:
                return `<span class="badge badge-foreign">${this.translate.instant('CLIENTS.TYPE_FOREIGN')}</span>`;
            default:
                return `<span class="badge badge-unknown">${this.translate.instant('CLIENTS.TYPE_UNKNOWN')}</span>`;
        }
    }

    selectCountry(country: CountryToReturnDto) {
        this.clientForm.patchValue({
            countryId: country.id,
            countrySearch: country.name
        });
        this.showCountryDropdown.set(false);
    }

    onCountrySearchFocus() {
        this.showCountryDropdown.set(true);
    }

    onCountrySearchBlur() {
        // Delay to allow click on dropdown item
        setTimeout(() => {
            this.showCountryDropdown.set(false);
        }, 200);
    }

    isForeignClient(): boolean {
        return this.clientForm.get('clientType')?.value === 3;
    }
}