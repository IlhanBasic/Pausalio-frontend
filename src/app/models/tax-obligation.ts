import { TaxObligationType } from "../enums/tax-obligation-type";
import { TaxObligationStatus } from "../enums/tax-obligation-status";
import { PaymentToReturnDto } from "./payment";

export interface AddTaxObligationDto {
  dueDate: Date;
  type?: TaxObligationType;
  totalAmount: number;
}

export interface TaxObligationToReturnDto {
  id: string; 
  year: number;
  month: number;
  status: TaxObligationStatus;
  dueDate: Date;
  referenceNumber?: string | null;
  type: TaxObligationType;
  totalAmount: number;
  paidDate?: Date | null;
  createdAt: Date;
  updatedAt?: Date | null;
  payment?: PaymentToReturnDto | null;
}

export interface UpdateTaxObligationDto {
  status?: TaxObligationStatus;
  dueDate: Date;
  type?: TaxObligationType;
  totalAmount: number;
}

export interface GenerateTaxObligationsDto
{
    year: number;
    monthlyAmount: number;
    type: TaxObligationType;
    dueDayOfMonth: number;
}
export interface TaxObligationSummaryDto
{
  totalPending: number;
  totalPaid: number;
  totalOverdue: number;
  countPending: number;
  countPaid: number;
  countOverdue: number;
}
