import { Currency } from "../enums/currency";

export interface AddBankAccountDto {
  bankName: string;
  accountNumber: string;
  currency: Currency;
  IBAN?: string;
  SWIFT?: string;
}

export interface BankAccountToReturnDto {
  id: string;
  bankName: string;
  accountNumber: string;
  currency: Currency;
  iban?: string;
  swift?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

export interface UpdateBankAccountDto {
  bankName: string;
  accountNumber: string;
  currency: Currency;
  IBAN?: string;
  SWIFT?: string;
  isActive?: boolean;
}