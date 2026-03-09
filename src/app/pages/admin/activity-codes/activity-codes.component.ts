import { Component, inject, OnInit, signal } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ActivityCodeService } from '../../../services/activity-code.service';
import { ActivityCodeToReturnDto, AddActivityCodeDto, UpdateActivityCodeDto } from '../../../models/activity-code';
import { DataTableComponent, TableColumn, TableAction } from '../../../components/shared/data-table/data-table.component';

@Component({
    selector: 'app-activity-codes',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, DataTableComponent, TranslateModule],
    templateUrl: './activity-codes.component.html',
    styleUrl: './activity-codes.component.css'
})
export class ActivityCodesComponent implements OnInit {
    activityCodeService = inject(ActivityCodeService);
    fb = inject(FormBuilder);
    toastr = inject(ToastrService);
    translate = inject(TranslateService);

    activityCodes = signal<ActivityCodeToReturnDto[]>([]);
    isLoading = signal(false);
    isSubmitting = signal(false);
    showModal = signal(false);
    showDeleteConfirm = signal(false);
    editingCode = signal<ActivityCodeToReturnDto | null>(null);
    deletingCode = signal<ActivityCodeToReturnDto | null>(null);

    codeForm = this.fb.group({
        code: ['', Validators.required],
        description: ['', Validators.required]
    });

    columns: TableColumn[] = [
        { key: 'code', label: 'ACTIVITY_CODES.COLUMN_CODE', sortable: true },
        { key: 'description', label: 'ACTIVITY_CODES.COLUMN_DESCRIPTION', sortable: true }
    ];

    actions: TableAction[] = [
        { label: this.translate.instant('ACTIVITY_CODES.ACTION_EDIT'), icon: '✏️', type: 'edit' },
        { label: this.translate.instant('ACTIVITY_CODES.ACTION_DELETE'), icon: '🗑️', type: 'delete' }
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
                this.toastr.error(
                    err.error?.message || this.translate.instant('ACTIVITY_CODES.TOAST_LOAD_ERROR'),
                    this.translate.instant('ACTIVITY_CODES.TOAST_ERROR_TITLE')
                );
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
        this.codeForm.patchValue({ code: code.code, description: code.description });
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

        this.isSubmitting.set(true);
        const formValue = this.codeForm.value;
        const editing = this.editingCode();

        if (editing) {
            const dto: UpdateActivityCodeDto = { code: formValue.code!, description: formValue.description! };
            this.activityCodeService.update(editing.id.toString(), dto).subscribe({
                next: () => {
                    this.toastr.success(
                        this.translate.instant('ACTIVITY_CODES.TOAST_UPDATE_SUCCESS'),
                        this.translate.instant('ACTIVITY_CODES.TOAST_SUCCESS_TITLE')
                    );
                    this.loadCodes();
                    this.closeModal();
                    this.isSubmitting.set(false);
                },
                error: (err) => {
                    this.toastr.error(
                        err.error?.message || this.translate.instant('ACTIVITY_CODES.TOAST_UPDATE_ERROR'),
                        this.translate.instant('ACTIVITY_CODES.TOAST_ERROR_TITLE')
                    );
                    this.isSubmitting.set(false);
                }
            });
        } else {
            const dto: AddActivityCodeDto = { code: formValue.code!, description: formValue.description! };
            this.activityCodeService.create(dto).subscribe({
                next: () => {
                    this.toastr.success(
                        this.translate.instant('ACTIVITY_CODES.TOAST_CREATE_SUCCESS'),
                        this.translate.instant('ACTIVITY_CODES.TOAST_SUCCESS_TITLE')
                    );
                    this.loadCodes();
                    this.closeModal();
                    this.isSubmitting.set(false);
                },
                error: (err) => {
                    this.toastr.error(
                        err.error?.message || this.translate.instant('ACTIVITY_CODES.TOAST_CREATE_ERROR'),
                        this.translate.instant('ACTIVITY_CODES.TOAST_ERROR_TITLE')
                    );
                    this.isSubmitting.set(false);
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

        this.isSubmitting.set(true);
        this.activityCodeService.delete(code.id.toString()).subscribe({
            next: () => {
                this.toastr.success(
                    this.translate.instant('ACTIVITY_CODES.TOAST_DELETE_SUCCESS'),
                    this.translate.instant('ACTIVITY_CODES.TOAST_SUCCESS_TITLE')
                );
                this.loadCodes();
                this.closeDeleteConfirm();
                this.isSubmitting.set(false);
            },
            error: (err) => {
                this.toastr.error(
                    err.error?.message || this.translate.instant('ACTIVITY_CODES.TOAST_DELETE_ERROR'),
                    this.translate.instant('ACTIVITY_CODES.TOAST_ERROR_TITLE')
                );
                this.closeDeleteConfirm();
                this.isSubmitting.set(false);
            }
        });
    }
}