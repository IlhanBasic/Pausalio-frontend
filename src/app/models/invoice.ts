import { Currency } from "../enums/currency";
import { PaymentStatus } from "../enums/payment-status";
import { InvoiceStatus } from "../enums/invoice-status";
import { AddInvoiceItemDto, InvoiceItemToReturnDto } from "./invoice-item";
import { PaymentToReturnDto } from "./payment";
import { BusinessProfileToReturnDto } from "./business-profile";
import { ClientToReturnDto } from "./client";

export interface AddInvoiceDto {
  clientId: string;
  dueDate?: Date | null;
  currency?: Currency; 
  notes?: string;
  items?: AddInvoiceItemDto[];
}

export interface InvoiceToReturnDto {
  id: string;
  businessProfile: BusinessProfileToReturnDto;
  client: ClientToReturnDto;
  invoiceNumber: string;
  paymentStatus: PaymentStatus;
  amountToPay: number;
  issueDate: Date;
  dueDate?: Date | null;
  invoiceStatus: InvoiceStatus;
  currency: Currency;
  totalAmount: number;
  totalAmountRSD: number;
  exchangeRate: number;
  referenceNumber?: string | null;
  notes?: string;
  createdAt: Date;
  updatedAt?: Date;
  items?: InvoiceItemToReturnDto[];
  payments?: PaymentToReturnDto[];
}

export interface UpdateInvoiceDto {
  clientId: string;
  paymentStatus?: PaymentStatus;
  dueDate?: Date | null;
  invoiceStatus?: InvoiceStatus;
  currency?: Currency;
  notes?: string;
  items?: AddInvoiceItemDto[];
}

export interface InvoiceSummaryDto
{
  totalDraft: number;
  totalSent: number;
  totalPaid: number;
  totalUnpaid: number;
  totalOverdue: number;
  countDraft: number;
  countSent: number;
  countPaid: number;
  countUnpaid: number;
  countOverdue: number;
}
