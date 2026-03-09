import { Component, inject, OnInit, signal } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CityService } from '../../../services/city.service';
import { CityToReturnDto, AddCityDto, UpdateCityDto } from '../../../models/city';
import { DataTableComponent, TableColumn, TableAction } from '../../../components/shared/data-table/data-table.component';

@Component({
    selector: 'app-cities',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, DataTableComponent, TranslateModule],
    templateUrl: './cities.component.html',
    styleUrl: './cities.component.css'
})
export class CitiesComponent implements OnInit {
    cityService = inject(CityService);
    fb = inject(FormBuilder);
    toastr = inject(ToastrService);
    translate = inject(TranslateService);

    cities = signal<CityToReturnDto[]>([]);
    isLoading = signal(false);
    isSubmitting = signal(false);
    showModal = signal(false);
    showDeleteConfirm = signal(false);
    editingCity = signal<CityToReturnDto | null>(null);
    deletingCity = signal<CityToReturnDto | null>(null);

    cityForm = this.fb.group({
        name: ['', Validators.required],
        postalCode: ['', Validators.required]
    });

    columns: TableColumn[] = [
        { key: 'name', label: 'CITIES.COLUMN_NAME', sortable: true },
        { key: 'postalCode', label: 'CITIES.COLUMN_POSTAL_CODE', sortable: true }
    ];

    actions: TableAction[] = [
        { label: this.translate.instant('CITIES.ACTION_EDIT'), icon: '✏️', type: 'edit' },
        { label: this.translate.instant('CITIES.ACTION_DELETE'), icon: '🗑️', type: 'delete' }
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
                this.toastr.error(
                    err.error?.message || this.translate.instant('CITIES.TOAST_LOAD_ERROR'),
                    this.translate.instant('CITIES.TOAST_ERROR_TITLE')
                );
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
        this.cityForm.patchValue({ name: city.name, postalCode: city.postalCode });
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

        this.isSubmitting.set(true);
        const formValue = this.cityForm.value;
        const editing = this.editingCity();

        if (editing) {
            const dto: UpdateCityDto = { name: formValue.name!, postalCode: formValue.postalCode! };
            this.cityService.update(editing.id, dto).subscribe({
                next: () => {
                    this.toastr.success(
                        this.translate.instant('CITIES.TOAST_UPDATE_SUCCESS'),
                        this.translate.instant('CITIES.TOAST_SUCCESS_TITLE')
                    );
                    this.loadCities();
                    this.closeModal();
                    this.isSubmitting.set(false);
                },
                error: (err) => {
                    this.toastr.error(
                        err.error?.message || this.translate.instant('CITIES.TOAST_UPDATE_ERROR'),
                        this.translate.instant('CITIES.TOAST_ERROR_TITLE')
                    );
                    this.isSubmitting.set(false);
                }
            });
        } else {
            const dto: AddCityDto = { name: formValue.name!, postalCode: formValue.postalCode! };
            this.cityService.create(dto).subscribe({
                next: () => {
                    this.toastr.success(
                        this.translate.instant('CITIES.TOAST_CREATE_SUCCESS'),
                        this.translate.instant('CITIES.TOAST_SUCCESS_TITLE')
                    );
                    this.loadCities();
                    this.closeModal();
                    this.isSubmitting.set(false);
                },
                error: (err) => {
                    this.toastr.error(
                        err.error?.message || this.translate.instant('CITIES.TOAST_CREATE_ERROR'),
                        this.translate.instant('CITIES.TOAST_ERROR_TITLE')
                    );
                    this.isSubmitting.set(false);
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

        this.isSubmitting.set(true);
        this.cityService.delete(city.id).subscribe({
            next: () => {
                this.toastr.success(
                    this.translate.instant('CITIES.TOAST_DELETE_SUCCESS'),
                    this.translate.instant('CITIES.TOAST_SUCCESS_TITLE')
                );
                this.loadCities();
                this.closeDeleteConfirm();
                this.isSubmitting.set(false);
            },
            error: (err) => {
                this.toastr.error(
                    err.error?.message || this.translate.instant('CITIES.TOAST_DELETE_ERROR'),
                    this.translate.instant('CITIES.TOAST_ERROR_TITLE')
                );
                this.closeDeleteConfirm();
                this.isSubmitting.set(false);
            }
        });
    }
}