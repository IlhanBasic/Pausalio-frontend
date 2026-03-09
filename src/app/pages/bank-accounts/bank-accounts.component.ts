import { Component, inject, OnInit, signal } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { BankAccountService } from '../../services/bank-account.service';
import { BankAccountToReturnDto, AddBankAccountDto, UpdateBankAccountDto } from '../../models/bank-account';
import { Currency } from '../../enums/currency';
import { DataTableComponent, TableColumn, TableAction } from '../../components/shared/data-table/data-table.component';

@Component({
    selector: 'app-bank-accounts',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, DataTableComponent, TranslateModule],
    templateUrl: './bank-accounts.component.html',
    styleUrl: './bank-accounts.component.css'
})
export class BankAccountsComponent implements OnInit {
    bankService = inject(BankAccountService);
    fb = inject(FormBuilder);
    toastr = inject(ToastrService);
    translate = inject(TranslateService);

    accounts = signal<BankAccountToReturnDto[]>([]);
    isLoading = signal(false);
    showModal = signal(false);
    showDeleteConfirm = signal(false);
    editingAccount = signal<BankAccountToReturnDto | null>(null);
    deletingAccount = signal<BankAccountToReturnDto | null>(null);

    accountForm = this.fb.group({
        bankName: ['', Validators.required],
        accountNumber: ['', Validators.required],
        currency: [Currency.RSD, Validators.required],
        IBAN: [''],
        SWIFT: [''],
    });

    columns: TableColumn[] = [
        { key: 'bankName', label: 'BANK_ACCOUNTS.COLUMN_BANK', sortable: true },
        { key: 'accountNumber', label: 'BANK_ACCOUNTS.COLUMN_ACCOUNT_NUMBER', sortable: true },
        { key: 'currencyDisplay', label: 'BANK_ACCOUNTS.COLUMN_CURRENCY', sortable: true },
        { key: 'details', label: 'BANK_ACCOUNTS.COLUMN_DETAILS', sortable: false },
    ];

    actions: TableAction[] = [
        { label: this.translate.instant('BANK_ACCOUNTS.ACTION_EDIT'), icon: '✏️', type: 'edit' },
        { label: this.translate.instant('BANK_ACCOUNTS.ACTION_DELETE'), icon: '🗑️', type: 'delete' }
    ];

    currencyOptions = [
        { value: Currency.RSD, label: this.translate.instant('BANK_ACCOUNTS.CURRENCY_RSD') },
        { value: Currency.EUR, label: this.translate.instant('BANK_ACCOUNTS.CURRENCY_EUR') },
        { value: Currency.USD, label: this.translate.instant('BANK_ACCOUNTS.CURRENCY_USD') },
        { value: Currency.GBP, label: this.translate.instant('BANK_ACCOUNTS.CURRENCY_GBP') },
        { value: Currency.CHF, label: this.translate.instant('BANK_ACCOUNTS.CURRENCY_CHF') }
    ];

    ngOnInit() {
        this.loadAccounts();
        this.setupCurrencyValidation();
    }

    setupCurrencyValidation() {
        this.accountForm.get('currency')?.valueChanges.subscribe(currency => {
            const isForeign = Number(currency) !== Currency.RSD;
            const validators = isForeign ? [Validators.required] : [];

            const ibanControl = this.accountForm.get('IBAN');
            const swiftControl = this.accountForm.get('SWIFT');

            ibanControl?.setValidators(validators);
            swiftControl?.setValidators(validators);

            ibanControl?.updateValueAndValidity();
            swiftControl?.updateValueAndValidity();

            // Clear values if switching to RSD
            if (!isForeign) {
                ibanControl?.setValue('');
                swiftControl?.setValue('');
            }
        });
    }

    loadAccounts() {
        this.isLoading.set(true);
        this.bankService.getAll().subscribe({
            next: (data) => {
                const transformedData = data.map(account => ({
                    ...account,
                    currencyDisplay: this.getCurrencyName(account.currency),
                    details: this.formatDetails(account)
                }));
                this.accounts.set(transformedData);
                this.isLoading.set(false);
            },
            error: (err) => {
                console.error('Error loading accounts:', err);
                this.toastr.error(
                    err.error?.message || this.translate.instant('BANK_ACCOUNTS.TOAST_LOAD_ERROR'),
                    this.translate.instant('BANK_ACCOUNTS.TOAST_ERROR_TITLE')
                );
                this.isLoading.set(false);
            }
        });
    }

    openAddModal() {
        this.editingAccount.set(null);
        this.accountForm.reset({
            bankName: '',
            accountNumber: '',
            currency: Currency.RSD,
            IBAN: '',
            SWIFT: '',
        });
        this.showModal.set(true);
    }

    openEditModal(account: BankAccountToReturnDto) {
        this.editingAccount.set(account);
        this.accountForm.patchValue({
            bankName: account.bankName,
            accountNumber: account.accountNumber,
            currency: account.currency,
            IBAN: account.iban || '',
            SWIFT: account.swift || '',
        });
        this.showModal.set(true);
    }

    closeModal() {
        this.showModal.set(false);
        this.accountForm.reset();
        this.editingAccount.set(null);
    }

    onSubmit() {
        if (this.accountForm.invalid) {
            this.accountForm.markAllAsTouched();
            return;
        }

        const formValue = this.accountForm.value;
        const editing = this.editingAccount();

        if (editing) {
            // Update
            const dto: UpdateBankAccountDto = {
                bankName: formValue.bankName!,
                accountNumber: formValue.accountNumber!,
                currency: Number(formValue.currency!),
                IBAN: formValue.IBAN || undefined,
                SWIFT: formValue.SWIFT || undefined,
            };

            this.bankService.update(editing.id, dto).subscribe({
                next: () => {
                    this.toastr.success(
                        this.translate.instant('BANK_ACCOUNTS.TOAST_UPDATE_SUCCESS'),
                        this.translate.instant('BANK_ACCOUNTS.TOAST_SUCCESS_TITLE')
                    );
                    this.loadAccounts();
                    this.closeModal();
                },
                error: (err) => {
                    console.error('Error updating account:', err);
                    this.toastr.error(
                        err.error?.message || this.translate.instant('BANK_ACCOUNTS.TOAST_UPDATE_ERROR'),
                        this.translate.instant('BANK_ACCOUNTS.TOAST_ERROR_TITLE')
                    );
                }
            });
        } else {
            // Create
            const dto: AddBankAccountDto = {
                bankName: formValue.bankName!,
                accountNumber: formValue.accountNumber!,
                currency: Number(formValue.currency!),
                IBAN: formValue.IBAN || undefined,
                SWIFT: formValue.SWIFT || undefined
            };

            this.bankService.create(dto).subscribe({
                next: () => {
                    this.toastr.success(
                        this.translate.instant('BANK_ACCOUNTS.TOAST_CREATE_SUCCESS'),
                        this.translate.instant('BANK_ACCOUNTS.TOAST_SUCCESS_TITLE')
                    );
                    this.loadAccounts();
                    this.closeModal();
                },
                error: (err) => {
                    console.error('Error creating account:', err);
                    this.toastr.error(
                        err.error?.message || this.translate.instant('BANK_ACCOUNTS.TOAST_CREATE_ERROR'),
                        this.translate.instant('BANK_ACCOUNTS.TOAST_ERROR_TITLE')
                    );
                }
            });
        }
    }

    openDeleteConfirm(account: BankAccountToReturnDto) {
        this.deletingAccount.set(account);
        this.showDeleteConfirm.set(true);
    }

    closeDeleteConfirm() {
        this.showDeleteConfirm.set(false);
        this.deletingAccount.set(null);
    }

    confirmDelete() {
        const account = this.deletingAccount();
        if (!account) return;

        this.bankService.delete(account.id).subscribe({
            next: () => {
                this.toastr.success(
                    this.translate.instant('BANK_ACCOUNTS.TOAST_DELETE_SUCCESS'),
                    this.translate.instant('BANK_ACCOUNTS.TOAST_SUCCESS_TITLE')
                );
                this.loadAccounts();
                this.closeDeleteConfirm();
            },
            error: (err) => {
                console.error('Error deleting account:', err);
                this.toastr.error(
                    err.error?.message || this.translate.instant('BANK_ACCOUNTS.TOAST_DELETE_ERROR'),
                    this.translate.instant('BANK_ACCOUNTS.TOAST_ERROR_TITLE')
                );
                this.closeDeleteConfirm();
            }
        });
    }

    getCurrencyName(currency: Currency): string {
        return Currency[currency];
    }

    isRsdSelected(): boolean {
        return Number(this.accountForm.get('currency')?.value) === Currency.RSD;
    }

    formatDetails(account: BankAccountToReturnDto): string {
        if (account.currency === Currency.RSD) {
            return this.translate.instant('BANK_ACCOUNTS.DETAILS_RSD');
        }
        return this.translate.instant('BANK_ACCOUNTS.DETAILS_FORMAT', {
            iban: account.iban || '-',
            swift: account.swift || '-'
        });
    }
}