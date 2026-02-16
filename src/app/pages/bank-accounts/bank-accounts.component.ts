import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { BankAccountService } from '../../services/bank-account.service';
import { BankAccountToReturnDto, AddBankAccountDto, UpdateBankAccountDto } from '../../models/bank-account';
import { Currency } from '../../enums/currency';
import { DataTableComponent, TableColumn, TableAction } from '../../components/shared/data-table/data-table.component';

@Component({
    selector: 'app-bank-accounts',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, DataTableComponent],
    templateUrl: './bank-accounts.component.html',
    styleUrl: './bank-accounts.component.css'
})
export class BankAccountsComponent implements OnInit {
    bankService = inject(BankAccountService);
    fb = inject(FormBuilder);

    accounts = signal<BankAccountToReturnDto[]>([]);
    isLoading = signal(false);
    showModal = signal(false);
    showDeleteConfirm = signal(false);
    editingAccount = signal<BankAccountToReturnDto | null>(null);
    deletingAccount = signal<BankAccountToReturnDto | null>(null);
    errorMessage = signal<string | null>(null);
    successMessage = signal<string | null>(null);

    accountForm = this.fb.group({
        bankName: ['', Validators.required],
        accountNumber: ['', Validators.required],
        currency: [Currency.RSD, Validators.required],
        IBAN: [''],
        SWIFT: [''],
        isActive: [true]
    });

    columns: TableColumn[] = [
        { key: 'bankName', label: 'Banka', sortable: true },
        { key: 'accountNumber', label: 'Broj računa', sortable: true },
        { key: 'currencyDisplay', label: 'Valuta', sortable: true },
        { key: 'details', label: 'Detalji (IBAN/SWIFT)', sortable: false },
        { key: 'statusDisplay', label: 'Status', sortable: true }
    ];

    actions: TableAction[] = [
        { label: 'Izmeni', icon: '✏️', type: 'edit' },
        { label: 'Obriši', icon: '🗑️', type: 'delete' }
    ];

    currencyOptions = [
        { value: Currency.RSD, label: 'RSD' },
        { value: Currency.EUR, label: 'EUR' },
        { value: Currency.USD, label: 'USD' },
        { value: Currency.GBP, label: 'GBP' },
        { value: Currency.CHF, label: 'CHF' }
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
                    statusDisplay: account.isActive ? 'Aktivan' : 'Neaktivan',
                    details: this.formatDetails(account)
                }));
                this.accounts.set(transformedData);
                this.isLoading.set(false);
            },
            error: (err) => {
                console.error('Error loading accounts:', err);
                this.showError('Greška pri učitavanju računa');
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
            isActive: true
        });
        this.showModal.set(true);
    }

    openEditModal(account: BankAccountToReturnDto) {
        this.editingAccount.set(account);
        this.accountForm.patchValue({
            bankName: account.bankName,
            accountNumber: account.accountNumber,
            currency: account.currency,
            IBAN: account.IBAN || '',
            SWIFT: account.SWIFT || '',
            isActive: account.isActive
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
                isActive: formValue.isActive !== null ? formValue.isActive : undefined
            };

            this.bankService.update(editing.id, dto).subscribe({
                next: () => {
                    this.showSuccess('Račun uspešno ažuriran');
                    this.loadAccounts();
                    this.closeModal();
                },
                error: (err) => {
                    console.error('Error updating account:', err);
                    this.showError('Greška pri ažuriranju računa');
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
                    this.showSuccess('Račun uspešno dodat');
                    this.loadAccounts();
                    this.closeModal();
                },
                error: (err) => {
                    console.error('Error creating account:', err);
                    this.showError('Greška pri dodavanju računa');
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
                this.showSuccess('Račun uspešno obrisan');
                this.loadAccounts();
                this.closeDeleteConfirm();
            },
            error: (err) => {
                console.error('Error deleting account:', err);
                this.showError('Greška pri brisanju računa');
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
            return '-';
        }
        return `IBAN: ${account.IBAN || '-'} / SWIFT: ${account.SWIFT || '-'}`;
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
