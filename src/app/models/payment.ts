import { PaymentType } from "../enums/payment-type";
import { Currency } from "../enums/currency";
import { InvoiceToReturnDto } from "./invoice";
import { TaxObligationToReturnDto } from "./tax-obligation";
import { ExpenseToReturnDto } from "./expense";
import { BankAccountToReturnDto } from "./bank-account";

export interface AddPaymentDto {
  paymentType?: PaymentType;
  entityId: string;
  amount?: number;
  currency?: Currency;
  referenceNumber?: string;
  description?: string;
  bankAccountId?: string;
}

export interface PaymentToReturnDto {
  id: string;
  paymentType: PaymentType;
  invoice?: InvoiceToReturnDto | null;
  taxObligation?: TaxObligationToReturnDto | null;
  expense?: ExpenseToReturnDto | null;
  amount: number;
  currency: Currency;
  exchangeRate?: number | null;
  amountRSD: number;
  referenceNumber?: string;
  description?: string;
  paymentDate: Date;
  createdAt: Date;
  bankAccount?: BankAccountToReturnDto;
}

export interface UpdatePaymentDto {
  referenceNumber?: string;
  description?: string;
}
export interface PaymentSummaryDto
{
  totalInvoicePayments: number;
  totalTaxPayments: number;
  totalExpensePayments: number;
  countInvoicePayments: number;
  countTaxPayments: number;
  countExpensePayments: number;
}
