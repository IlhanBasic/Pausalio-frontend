export interface KpoEntryToReturnDto {
  id: string;
  year: number;
  sequenceNumber: number;
  entryDate: string;
  description: string;
  productIncome: number;
  serviceIncome: number;
  totalIncome: number;
  originalCurrency: string;
  originalAmount: number;
  exchangeRate: number;
  entryType: string;
  invoiceId: string;
  invoiceNumber?: string | null;
  originalEntryId?: string | null;
  createdAt: string;
}

export interface KpoAlertDto {
  thresholdName: string;
  thresholdAmount: number;
  currentTotal: number;
  isExceeded: boolean;
}

export interface KpoYearlySummaryDto {
  year: number;
  totalProductIncome: number;
  totalServiceIncome: number;
  grandTotal: number;
  entryCount: number;
  remainingTo6MLimit: number;
  remainingTo8MLimit: number;
  vatExposureTotal: number;
  alerts: KpoAlertDto[];
}
