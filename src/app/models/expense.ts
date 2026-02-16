import { ExpenseStatus } from "../enums/expense-status";
import { PaymentToReturnDto } from "./payment";

export interface AddExpenseDto {
  name: string;
  amount: number;
}

export interface ExpenseToReturnDto {
  id: string;
  status: ExpenseStatus;
  name: string;
  referenceNumber?: string | null;
  amount: number;
  createdAt: Date;
  payment?: PaymentToReturnDto | null;
}

export interface UpdateExpenseDto {
  status?: ExpenseStatus;
  name: string;
  amount: number;
}
export interface ExpenseSummaryDto {
  totalPending: number;
  totalPaid: number;
  totalArchived: number;
  countPending: number;
  countPaid: number;
  countArchived: number;
}