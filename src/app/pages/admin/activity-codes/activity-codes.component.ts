import { Component, inject, OnInit, signal } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
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
    toastr = inject(ToastrService);

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
                this.toastr.error('Greška pri učitavanju šifara delatnosti', 'Greška');
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
                    this.toastr.success('Šifra delatnosti uspešno ažurirana', 'Uspeh');
                    this.loadCodes();
                    this.closeModal();
                },
                error: (err) => {
                    console.error('Error updating activity code:', err);
                    this.toastr.error('Greška pri ažuriranju šifre delatnosti', 'Greška');
                }
            });
        } else {
            const dto: AddActivityCodeDto = {
                code: formValue.code!,
                description: formValue.description!
            };

            this.activityCodeService.create(dto).subscribe({
                next: () => {
                    this.toastr.success('Šifra delatnosti uspešno dodata', 'Uspeh');
                    this.loadCodes();
                    this.closeModal();
                },
                error: (err) => {
                    console.error('Error creating activity code:', err);
                    this.toastr.error('Greška pri dodavanju šifre delatnosti', 'Greška');
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
                this.toastr.success('Šifra delatnosti uspešno obrisana', 'Uspeh');
                this.loadCodes();
                this.closeDeleteConfirm();
            },
            error: (err) => {
                console.error('Error deleting activity code:', err);
                this.toastr.error('Greška pri brisanju šifre delatnosti', 'Greška');
                this.closeDeleteConfirm();
            }
        });
    }
}


