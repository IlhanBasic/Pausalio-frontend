import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivityCodeService } from '../../../services/activity-code.service';
import { ActivityCodeToReturnDto, AddActivityCodeDto, UpdateActivityCodeDto } from '../../../models/activity-code';
import { DataTableComponent, TableColumn, TableAction } from '../../../components/shared/data-table/data-table.component';

@Component({
    selector: 'app-activity-codes',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, DataTableComponent],
    templateUrl: './activity-codes.component.html',
    styleUrl: './activity-codes.component.css'
})
export class ActivityCodesComponent implements OnInit {
    activityCodeService = inject(ActivityCodeService);
    fb = inject(FormBuilder);

    activityCodes = signal<ActivityCodeToReturnDto[]>([]);
    isLoading = signal(false);
    showModal = signal(false);
    showDeleteConfirm = signal(false);
    editingCode = signal<ActivityCodeToReturnDto | null>(null);
    deletingCode = signal<ActivityCodeToReturnDto | null>(null);
    errorMessage = signal<string | null>(null);
    successMessage = signal<string | null>(null);

    codeForm = this.fb.group({
        code: ['', Validators.required],
        description: ['', Validators.required]
    });

    columns: TableColumn[] = [
        { key: 'code', label: 'Šifra', sortable: true },
        { key: 'description', label: 'Opis', sortable: true }
    ];

    actions: TableAction[] = [
        { label: 'Izmeni', icon: '✏️', type: 'edit' },
        { label: 'Obriši', icon: '🗑️', type: 'delete' }
    ];

    ngOnInit() {
        this.loadCodes();
    }

    loadCodes() {
        this.isLoading.set(true);
        this.activityCodeService.getAll().subscribe({
            next: (data) => {
                this.activityCodes.set(data || []);
                this.isLoading.set(false);
            },
            error: (err) => {
                console.error('Error loading activity codes:', err);
                this.showError('Greška pri učitavanju šifara delatnosti');
                this.isLoading.set(false);
            }
        });
    }

    openAddModal() {
        this.editingCode.set(null);
        this.codeForm.reset();
        this.showModal.set(true);
    }

    openEditModal(code: ActivityCodeToReturnDto) {
        this.editingCode.set(code);
        this.codeForm.patchValue({
            code: code.code,
            description: code.description
        });
        this.showModal.set(true);
    }

    closeModal() {
        this.showModal.set(false);
        this.codeForm.reset();
        this.editingCode.set(null);
    }

    onSubmit() {
        if (this.codeForm.invalid) {
            this.codeForm.markAllAsTouched();
            return;
        }

        const formValue = this.codeForm.value;
        const editing = this.editingCode();

        if (editing) {
            const dto: UpdateActivityCodeDto = {
                code: formValue.code!,
                description: formValue.description!
            };

            this.activityCodeService.update(editing.id.toString(), dto).subscribe({
                next: () => {
                    this.showSuccess('Šifra delatnosti uspešno ažurirana');
                    this.loadCodes();
                    this.closeModal();
                },
                error: (err) => {
                    console.error('Error updating activity code:', err);
                    this.showError('Greška pri ažuriranju šifre delatnosti');
                }
            });
        } else {
            const dto: AddActivityCodeDto = {
                code: formValue.code!,
                description: formValue.description!
            };

            this.activityCodeService.create(dto).subscribe({
                next: () => {
                    this.showSuccess('Šifra delatnosti uspešno dodata');
                    this.loadCodes();
                    this.closeModal();
                },
                error: (err) => {
                    console.error('Error creating activity code:', err);
                    this.showError('Greška pri dodavanju šifre delatnosti');
                }
            });
        }
    }

    openDeleteConfirm(code: ActivityCodeToReturnDto) {
        this.deletingCode.set(code);
        this.showDeleteConfirm.set(true);
    }

    closeDeleteConfirm() {
        this.showDeleteConfirm.set(false);
        this.deletingCode.set(null);
    }

    confirmDelete() {
        const code = this.deletingCode();
        if (!code) return;

        this.activityCodeService.delete(code.id.toString()).subscribe({
            next: () => {
                this.showSuccess('Šifra delatnosti uspešno obrisana');
                this.loadCodes();
                this.closeDeleteConfirm();
            },
            error: (err) => {
                console.error('Error deleting activity code:', err);
                this.showError('Greška pri brisanju šifre delatnosti');
                this.closeDeleteConfirm();
            }
        });
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
