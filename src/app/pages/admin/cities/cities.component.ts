import { Component, inject, OnInit, signal } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CityService } from '../../../services/city.service';
import { CityToReturnDto, AddCityDto, UpdateCityDto } from '../../../models/city';
import { DataTableComponent, TableColumn, TableAction } from '../../../components/shared/data-table/data-table.component';

@Component({
    selector: 'app-cities',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, DataTableComponent],
    templateUrl: './cities.component.html',
    styleUrl: './cities.component.css'
})
export class CitiesComponent implements OnInit {
    cityService = inject(CityService);
    fb = inject(FormBuilder);

    cities = signal<CityToReturnDto[]>([]);
    isLoading = signal(false);
    showModal = signal(false);
    showDeleteConfirm = signal(false);
    editingCity = signal<CityToReturnDto | null>(null);
    deletingCity = signal<CityToReturnDto | null>(null);
    toastr = inject(ToastrService);

    cityForm = this.fb.group({
        name: ['', Validators.required],
        postalCode: ['', Validators.required]
    });

    columns: TableColumn[] = [
        { key: 'name', label: 'Naziv', sortable: true },
        { key: 'postalCode', label: 'Poštanski broj', sortable: true }
    ];

    actions: TableAction[] = [
        { label: 'Izmeni', icon: '✏️', type: 'edit' },
        { label: 'Obriši', icon: '🗑️', type: 'delete' }
    ];

    ngOnInit() {
        this.loadCities();
    }

    loadCities() {
        this.isLoading.set(true);
        this.cityService.getAll().subscribe({
            next: (data) => {
                this.cities.set(data || []);
                this.isLoading.set(false);
            },
            error: (err) => {
                console.error('Error loading cities:', err);
                this.toastr.error('Greška pri učitavanju gradova', 'Greška');
                this.isLoading.set(false);
            }
        });
    }

    openAddModal() {
        this.editingCity.set(null);
        this.cityForm.reset();
        this.showModal.set(true);
    }

    openEditModal(city: CityToReturnDto) {
        this.editingCity.set(city);
        this.cityForm.patchValue({
            name: city.name,
            postalCode: city.postalCode
        });
        this.showModal.set(true);
    }

    closeModal() {
        this.showModal.set(false);
        this.cityForm.reset();
        this.editingCity.set(null);
    }

    onSubmit() {
        if (this.cityForm.invalid) {
            this.cityForm.markAllAsTouched();
            return;
        }

        const formValue = this.cityForm.value;
        const editing = this.editingCity();

        if (editing) {
            const dto: UpdateCityDto = {
                name: formValue.name!,
                postalCode: formValue.postalCode!
            };

            this.cityService.update(editing.id, dto).subscribe({
                next: () => {
                    this.toastr.success('Grad uspešno ažuriran', 'Uspeh');
                    this.loadCities();
                    this.closeModal();
                },
                error: (err) => {
                    console.error('Error updating city:', err);
                    this.toastr.error('Greška pri ažuriranju grada', 'Greška');
                }
            });
        } else {
            const dto: AddCityDto = {
                name: formValue.name!,
                postalCode: formValue.postalCode!
            };

            this.cityService.create(dto).subscribe({
                next: () => {
                    this.toastr.success('Grad uspešno dodat', 'Uspeh');
                    this.loadCities();
                    this.closeModal();
                },
                error: (err) => {
                    console.error('Error creating city:', err);
                    this.toastr.error('Greška pri dodavanju grada', 'Greška');
                }
            });
        }
    }

    openDeleteConfirm(city: CityToReturnDto) {
        this.deletingCity.set(city);
        this.showDeleteConfirm.set(true);
    }

    closeDeleteConfirm() {
        this.showDeleteConfirm.set(false);
        this.deletingCity.set(null);
    }

    confirmDelete() {
        const city = this.deletingCity();
        if (!city) return;

        this.cityService.delete(city.id).subscribe({
            next: () => {
                this.toastr.success('Grad uspešno obrisan', 'Uspeh');
                this.loadCities();
                this.closeDeleteConfirm();
            },
            error: (err) => {
                console.error('Error deleting city:', err);
                this.toastr.error('Greška pri brisanju grada', 'Greška');
                this.closeDeleteConfirm();
            }
        });
    }
}


