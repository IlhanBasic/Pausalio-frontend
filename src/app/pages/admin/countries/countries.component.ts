import { Component, inject, OnInit, signal } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CountryService } from '../../../services/country.service';
import { CountryToReturnDto, AddCountryDto, UpdateCountryDto } from '../../../models/country';
import { DataTableComponent, TableColumn, TableAction } from '../../../components/shared/data-table/data-table.component';

@Component({
    selector: 'app-countries',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, DataTableComponent],
    templateUrl: './countries.component.html',
    styleUrl: './countries.component.css'
})
export class CountriesComponent implements OnInit {
    countryService = inject(CountryService);
    fb = inject(FormBuilder);

    countries = signal<CountryToReturnDto[]>([]);
    isLoading = signal(false);
    showModal = signal(false);
    showDeleteConfirm = signal(false);
    editingCountry = signal<CountryToReturnDto | null>(null);
    deletingCountry = signal<CountryToReturnDto | null>(null);
    toastr = inject(ToastrService);

    countryForm = this.fb.group({
        name: ['', Validators.required],
        code: ['', Validators.required]
    });

    columns: TableColumn[] = [
        { key: 'name', label: 'Naziv', sortable: true },
        { key: 'code', label: 'Oznaka', sortable: true }
    ];

    actions: TableAction[] = [
        { label: 'Izmeni', icon: '✏️', type: 'edit' },
        { label: 'Obriši', icon: '🗑️', type: 'delete' }
    ];

    ngOnInit() {
        this.loadCountries();
    }

    loadCountries() {
        this.isLoading.set(true);
        this.countryService.getAll().subscribe({
            next: (data) => {
                this.countries.set(data || []);
                this.isLoading.set(false);
            },
            error: (err) => {
                console.error('Error loading countries:', err);
                this.toastr.error(err.error?.message || 'Greška pri učitavanju država', 'Greška');
                this.isLoading.set(false);
            }
        });
    }

    openAddModal() {
        this.editingCountry.set(null);
        this.countryForm.reset();
        this.showModal.set(true);
    }

    openEditModal(country: CountryToReturnDto) {
        this.editingCountry.set(country);
        this.countryForm.patchValue({
            name: country.name,
            code: country.code
        });
        this.showModal.set(true);
    }

    closeModal() {
        this.showModal.set(false);
        this.countryForm.reset();
        this.editingCountry.set(null);
    }

    onSubmit() {
        if (this.countryForm.invalid) {
            this.countryForm.markAllAsTouched();
            return;
        }

        const formValue = this.countryForm.value;
        const editing = this.editingCountry();

        if (editing) {
            const dto: UpdateCountryDto = {
                name: formValue.name!,
                code: formValue.code!
            };

            this.countryService.update(editing.id, dto).subscribe({
                next: () => {
                    this.toastr.success('Država uspešno ažurirana', 'Uspeh');
                    this.loadCountries();
                    this.closeModal();
                },
                error: (err) => {
                    console.error('Error updating country:', err);
                    this.toastr.error(err.error?.message || 'Greška pri ažuriranju države', 'Greška');
                }
            });
        } else {
            const dto: AddCountryDto = {
                name: formValue.name!,
                code: formValue.code!
            };

            this.countryService.create(dto).subscribe({
                next: () => {
                    this.toastr.success('Država uspešno dodata', 'Uspeh');
                    this.loadCountries();
                    this.closeModal();
                },
                error: (err) => {
                    console.error('Error creating country:', err);
                    this.toastr.error(err.error?.message || 'Greška pri dodavanju države', 'Greška');
                }
            });
        }
    }

    openDeleteConfirm(country: CountryToReturnDto) {
        this.deletingCountry.set(country);
        this.showDeleteConfirm.set(true);
    }

    closeDeleteConfirm() {
        this.showDeleteConfirm.set(false);
        this.deletingCountry.set(null);
    }

    confirmDelete() {
        const country = this.deletingCountry();
        if (!country) return;

        this.countryService.delete(country.id).subscribe({
            next: () => {
                this.toastr.success('Država uspešno obrisana', 'Uspeh');
                this.loadCountries();
                this.closeDeleteConfirm();
            },
            error: (err) => {
                console.error('Error deleting country:', err);
                this.toastr.error(err.error?.message || 'Greška pri brisanju države', 'Greška');
                this.closeDeleteConfirm();
            }
        });
    }
}


