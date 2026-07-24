import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { of, throwError } from 'rxjs';

import { TaxObligationsComponent } from './tax-obligations.component';
import { TaxObligationService } from '../../services/tax-obligation.service';
import { PaymentService } from '../../services/payment.service';
import { BankAccountService } from '../../services/bank-account.service';
import { ToastrService } from 'ngx-toastr';
import { DataTableComponent } from '../../components/shared/data-table/data-table.component';

import { TaxObligationStatus } from '../../enums/tax-obligation-status';
import { TaxObligationType } from '../../enums/tax-obligation-type';
import { PaymentType } from '../../enums/payment-type';
import { Currency } from '../../enums/currency';
import { BankAccountToReturnDto } from '../../models/bank-account';
import { TaxObligationToReturnDto, TaxObligationSummaryDto } from '../../models/tax-obligation';

const CURRENT_YEAR = new Date().getFullYear();

function makeObligation(overrides: Partial<any> = {}): TaxObligationToReturnDto {
  const due = (overrides as any)['dueDate'] ? new Date((overrides as any)['dueDate']) : new Date(`${CURRENT_YEAR}-06-15`);
  const id = (overrides as any)['id'] !== undefined ? String((overrides as any)['id']) : '1';
  const obj: TaxObligationToReturnDto = {
    id,
    year: due.getFullYear(),
    month: due.getMonth() + 1,
    status: (overrides as any)['status'] ?? TaxObligationStatus.Pending,
    dueDate: due,
    referenceNumber: (overrides as any).referenceNumber ?? null,
    type: (overrides as any)['type'] ?? TaxObligationType.PIO,
    totalAmount: (overrides as any)['totalAmount'] ?? 5000,
    paidDate: (overrides as any).paidDate ? new Date((overrides as any).paidDate) : null,
    createdAt: (overrides as any).createdAt ? new Date((overrides as any).createdAt) : new Date(),
    updatedAt: (overrides as any).updatedAt ?? null,
    payment: (overrides as any).payment ?? null,
  } as TaxObligationToReturnDto;

  return obj;
}

const mockObligations: TaxObligationToReturnDto[] = [
  makeObligation({ id: 1 }),
  makeObligation({ id: 2, status: TaxObligationStatus.Paid }),
];

const mockSummary: TaxObligationSummaryDto = {
  totalPending: 5000,
  totalPaid: 5000,
  totalOverdue: 0,
  countPending: 1,
  countPaid: 1,
  countOverdue: 0,
};

const mockBankAccounts: BankAccountToReturnDto[] = [
  { id: '1', bankName: 'Račun 1', accountNumber: '123456789', isActive: true, currency: Currency.RSD, createdAt: new Date() },
  { id: '2', bankName: 'Račun 2', accountNumber: '987654321', isActive: false, currency: Currency.RSD, createdAt: new Date() },
  { id: '3', bankName: 'Račun EUR', accountNumber: '111222333', isActive: true, currency: Currency.EUR, createdAt: new Date() },
];

const apiResponse = (data: any) => ({ data, success: true, message: 'OK' });
describe('TaxObligationsComponent', () => {
  let fixture: ComponentFixture<TaxObligationsComponent>;
  let component: TaxObligationsComponent;

  let taxService: jasmine.SpyObj<TaxObligationService>;
  let paymentService: jasmine.SpyObj<PaymentService>;
  let bankAccountService: jasmine.SpyObj<BankAccountService>;
  let toastr: jasmine.SpyObj<ToastrService>;

  beforeEach(async () => {
    taxService = jasmine.createSpyObj('TaxObligationService', [
      'getAll', 'getByStatus', 'getSummary',
      'create', 'update', 'delete',
      'generateAnnualTaxObligations',
    ]);
    paymentService = jasmine.createSpyObj('PaymentService', ['create']);
    bankAccountService = jasmine.createSpyObj('BankAccountService', ['getAll']);
    toastr = jasmine.createSpyObj('ToastrService', ['success', 'error', 'warning']);

    taxService.getAll.and.returnValue(of(apiResponse(mockObligations)));
    taxService.getByStatus.and.returnValue(of(apiResponse(mockObligations)));
    taxService.getSummary.and.returnValue(of(apiResponse(mockSummary)));
    taxService.create.and.returnValue(of(apiResponse(null)));
    taxService.update.and.returnValue(of(apiResponse(null)));
    taxService.delete.and.returnValue(of(apiResponse(null)));
    taxService.generateAnnualTaxObligations.and.returnValue(of(apiResponse(null)));
    paymentService.create.and.returnValue(of(apiResponse(null)));
    bankAccountService.getAll.and.returnValue(of(mockBankAccounts));

    await TestBed.configureTestingModule({
      declarations: [TaxObligationsComponent, DataTableComponent],
      imports: [
        ReactiveFormsModule,
        CommonModule,
      ],
      providers: [
        { provide: TaxObligationService, useValue: taxService },
        { provide: PaymentService, useValue: paymentService },
        { provide: BankAccountService, useValue: bankAccountService },
        { provide: ToastrService, useValue: toastr },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TaxObligationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should load obligations, summary and bank accounts on init', () => {
    expect(taxService.getAll).toHaveBeenCalled();
    expect(taxService.getSummary).toHaveBeenCalledWith(CURRENT_YEAR);
    expect(bankAccountService.getAll).toHaveBeenCalled();
  });

  it('should filter only active RSD bank accounts', () => {
    expect(component.bankAccounts().length).toBe(1);
    expect(component.bankAccounts()[0].id).toBe('1');
  });

  it('should show error toast when loading obligations fails', () => {
    taxService.getAll.and.returnValue(throwError(() => ({ error: { message: 'Server error' } })));
    component.loadTaxObligations();
    expect(toastr.error).toHaveBeenCalled();
    expect(component.isLoading()).toBeFalse();
  });

  it('should filter obligations by selected year', () => {
    const pastObligation = makeObligation({ id: '99', dueDate: new Date(`${CURRENT_YEAR - 1}-06-15`).toISOString() });
    taxService.getAll.and.returnValue(of(apiResponse([...mockObligations, pastObligation])));
    component.selectedYear.set(CURRENT_YEAR);
    component.loadTaxObligations();
    const ids = component.obligations().map(o => o.id);
    expect(ids).not.toContain('99');
  });

  it('should load obligations by selected status', () => {
    component.setStatusFilter(TaxObligationStatus.Pending);
    expect(taxService.getByStatus).toHaveBeenCalledWith(TaxObligationStatus.Pending);
  });

  it('should call getAll when status filter is null', () => {
    taxService.getAll.calls.reset();
    component.setStatusFilter(null);
    expect(taxService.getAll).toHaveBeenCalled();
  });

  it('should update selected year and reload data on year change', () => {
    taxService.getAll.calls.reset();
    taxService.getSummary.calls.reset();
    component.onYearChange(2023);
    expect(Number(component.selectedYear())).toBe(2023);
    expect(taxService.getAll).toHaveBeenCalled();
    expect(taxService.getSummary).toHaveBeenCalledWith(2023);
  });

  it('should open generate modal with reset form', () => {
    component.generateForm.get('monthlyAmount')?.setValue(9999);
    component.openGenerateModal();
    expect(component.showGenerateModal()).toBeTrue();
    expect(component.generateForm.get('monthlyAmount')?.value).toBe(0);
    expect(component.generateForm.get('dueDayOfMonth')?.value).toBe(15);
  });

  it('should close generate modal and reset form', () => {
    component.showGenerateModal.set(true);
    component.closeGenerateModal();
    expect(component.showGenerateModal()).toBeFalse();
  });

  it('should not submit generate form when invalid', () => {
    component.generateForm.get('monthlyAmount')?.setValue(0);
    component.onGenerateSubmit();
    expect(taxService.generateAnnualTaxObligations).not.toHaveBeenCalled();
  });

  it('should generate annual obligations successfully', () => {
    component.generateForm.setValue({
      year: CURRENT_YEAR,
      monthlyAmount: 5000,
      type: TaxObligationType.PIO,
      dueDayOfMonth: 15,
    });
    component.onGenerateSubmit();
    expect(taxService.generateAnnualTaxObligations).toHaveBeenCalledWith({
      year: CURRENT_YEAR,
      monthlyAmount: 5000,
      type: TaxObligationType.PIO,
      dueDayOfMonth: 15,
    });
    expect(toastr.success).toHaveBeenCalled();
    expect(component.showGenerateModal()).toBeFalse();
  });

  it('should show error toast when generation fails', () => {
    taxService.generateAnnualTaxObligations.and.returnValue(
      throwError(() => ({ error: { message: 'Greška' } }))
    );
    component.generateForm.setValue({
      year: CURRENT_YEAR, monthlyAmount: 5000,
      type: TaxObligationType.PIO, dueDayOfMonth: 15,
    });
    component.onGenerateSubmit();
    expect(toastr.error).toHaveBeenCalled();
  });

  it('should open add modal with reset form', () => {
    component.openAddModal();
    expect(component.showAddModal()).toBeTrue();
    expect(component.editingObligation()).toBeNull();
    expect(component.obligationForm.get('dueDate')?.value).toBe('');
  });

  it('should close add modal and clear editing obligation', () => {
    component.editingObligation.set(makeObligation());
    component.showAddModal.set(true);
    component.closeAddModal();
    expect(component.showAddModal()).toBeFalse();
    expect(component.editingObligation()).toBeNull();
  });

  it('should not allow editing non-pending obligation', () => {
    const paid = makeObligation({ status: TaxObligationStatus.Paid });
    component.openEditModal(paid);
    expect(toastr.warning).toHaveBeenCalled();
    expect(component.showAddModal()).toBeFalse();
  });

  it('should open edit modal and patch form values', () => {
    const ob = makeObligation({ totalAmount: 7500, type: TaxObligationType.Health });
    component.openEditModal(ob);
    expect(component.showAddModal()).toBeTrue();
    expect(component.editingObligation()).toBe(ob);
    expect(component.obligationForm.get('totalAmount')?.value).toBe(7500);
  });

  it('should not submit obligation form when invalid', () => {
    component.obligationForm.get('dueDate')?.setValue('');
    component.onObligationSubmit();
    expect(taxService.create).not.toHaveBeenCalled();
    expect(taxService.update).not.toHaveBeenCalled();
  });

  it('should create obligation successfully', () => {
    component.editingObligation.set(null);
    component.obligationForm.setValue({
      dueDate: `${CURRENT_YEAR}-06-15`,
      type: TaxObligationType.PIO,
      totalAmount: 5000,
    });
    component.onObligationSubmit();
    expect(taxService.create).toHaveBeenCalled();
    expect(toastr.success).toHaveBeenCalled();
    expect(component.showAddModal()).toBeFalse();
  });

  it('should show error toast when creation fails', () => {
    taxService.create.and.returnValue(throwError(() => ({ error: { message: 'Greška' } })));
    component.editingObligation.set(null);
    component.obligationForm.setValue({
      dueDate: `${CURRENT_YEAR}-06-15`,
      type: TaxObligationType.PIO,
      totalAmount: 5000,
    });
    component.onObligationSubmit();
    expect(toastr.error).toHaveBeenCalled();
  });

  it('should update obligation successfully', () => {
    const ob = makeObligation({ id: '42' });
    component.editingObligation.set(ob);
    component.obligationForm.setValue({
      dueDate: `${CURRENT_YEAR}-06-15`,
      type: TaxObligationType.PIO,
      totalAmount: 6000,
    });
    component.onObligationSubmit();
    expect(taxService.update).toHaveBeenCalledWith('42', jasmine.objectContaining({ totalAmount: 6000 }));
    expect(toastr.success).toHaveBeenCalled();
  });

  it('should preserve original status during update', () => {
    const ob = makeObligation({ id: '42', status: TaxObligationStatus.Pending });
    component.editingObligation.set(ob);
    component.obligationForm.setValue({
      dueDate: `${CURRENT_YEAR}-06-15`,
      type: TaxObligationType.PIO,
      totalAmount: 6000,
    });
    component.onObligationSubmit();
    expect(taxService.update).toHaveBeenCalledWith('42',
      jasmine.objectContaining({ status: TaxObligationStatus.Pending })
    );
  });

  it('should show error toast when update fails', () => {
    taxService.update.and.returnValue(throwError(() => ({ error: { message: 'Greška' } })));
    const ob = makeObligation({ id: '42' });
    component.editingObligation.set(ob);
    component.obligationForm.setValue({
      dueDate: `${CURRENT_YEAR}-06-15`,
      type: TaxObligationType.PIO,
      totalAmount: 6000,
    });
    component.onObligationSubmit();
    expect(toastr.error).toHaveBeenCalled();
  });

  it('should not allow payment for non-pending obligation', () => {
    const paid = makeObligation({ status: TaxObligationStatus.Paid });
    component.openPaymentModal(paid);
    expect(toastr.warning).toHaveBeenCalled();
    expect(component.showPaymentModal()).toBeFalse();
  });

  it('should open payment modal and reset form', () => {
    const ob = makeObligation();
    component.openPaymentModal(ob);
    expect(component.showPaymentModal()).toBeTrue();
    expect(component.payingObligation()).toBe(ob);
    expect(component.paymentForm.get('bankAccountId')?.value).toBe('');
  });

  it('should close payment modal and clear state', () => {
    component.payingObligation.set(makeObligation());
    component.showPaymentModal.set(true);
    component.closePaymentModal();
    expect(component.showPaymentModal()).toBeFalse();
    expect(component.payingObligation()).toBeNull();
  });

  it('should not submit payment form when invalid', () => {
    component.paymentForm.get('bankAccountId')?.setValue('');
    component.onSubmitPayment();
    expect(paymentService.create).not.toHaveBeenCalled();
  });

  it('should not submit payment when no obligation selected', () => {
    component.payingObligation.set(null);
    component.paymentForm.get('bankAccountId')?.setValue('1');
    component.onSubmitPayment();
    expect(paymentService.create).not.toHaveBeenCalled();
  });

  it('should create payment with correct dto', () => {
    const ob = makeObligation({ id: '7', totalAmount: 3000 });
    component.payingObligation.set(ob);
    component.paymentForm.get('bankAccountId')?.setValue('1');
    component.onSubmitPayment();
    expect(paymentService.create).toHaveBeenCalledWith(jasmine.objectContaining({
      paymentType: PaymentType.TaxPayment,
      entityId: '7',
      amount: 3000,
      currency: Currency.RSD,
      bankAccountId: '1',
    }));
  });

  it('should reload data and close modal after successful payment', () => {
    taxService.getAll.calls.reset();
    taxService.getSummary.calls.reset();
    const ob = makeObligation();
    component.payingObligation.set(ob);
    component.paymentForm.get('bankAccountId')?.setValue('1');
    component.onSubmitPayment();
    expect(toastr.success).toHaveBeenCalled();
    expect(taxService.getAll).toHaveBeenCalled();
    expect(taxService.getSummary).toHaveBeenCalled();
    expect(component.showPaymentModal()).toBeFalse();
  });

  it('should show error toast when payment fails', () => {
    paymentService.create.and.returnValue(throwError(() => ({ error: { message: 'Greška' } })));
    const ob = makeObligation();
    component.payingObligation.set(ob);
    component.paymentForm.get('bankAccountId')?.setValue('1');
    component.onSubmitPayment();
    expect(toastr.error).toHaveBeenCalled();
  });

  it("should open payment modal when custom action is 'Plati'", () => {
    const ob = makeObligation();
    spyOn(component, 'openPaymentModal');
    component.handleCustomAction({ action: 'Plati', item: ob });
    expect(component.openPaymentModal).toHaveBeenCalledWith(ob);
  });

  it('should open delete confirmation modal', () => {
    const ob = makeObligation();
    component.openDeleteConfirm(ob);
    expect(component.showDeleteConfirm()).toBeTrue();
    expect(component.deletingObligation()).toBe(ob);
  });

  it('should close delete confirmation modal', () => {
    component.showDeleteConfirm.set(true);
    component.deletingObligation.set(makeObligation());
    component.closeDeleteConfirm();
    expect(component.showDeleteConfirm()).toBeFalse();
    expect(component.deletingObligation()).toBeNull();
  });

  it('should not delete when no obligation selected', () => {
    component.deletingObligation.set(null);
    component.confirmDelete();
    expect(taxService.delete).not.toHaveBeenCalled();
  });

  it('should delete obligation successfully', () => {
    const ob = makeObligation({ id: '5' });
    component.deletingObligation.set(ob);
    component.confirmDelete();
    expect(taxService.delete).toHaveBeenCalledWith('5');
    expect(toastr.success).toHaveBeenCalled();
    expect(component.showDeleteConfirm()).toBeFalse();
  });

  it('should show error toast when deletion fails', () => {
    taxService.delete.and.returnValue(throwError(() => ({ error: { message: 'Greška' } })));
    component.deletingObligation.set(makeObligation({ id: '5' }));
    component.confirmDelete();
    expect(toastr.error).toHaveBeenCalled();
    expect(component.showDeleteConfirm()).toBeFalse();
  });

  it('should return correct month name', () => {
    expect(component.getMonthName(1)).toBe('Januar');
    expect(component.getMonthName(6)).toBe('Jun');
    expect(component.getMonthName(12)).toBe('Decembar');
    expect(component.getMonthName(99)).toBe('');
  });

  it('should return correct status name', () => {
    expect(component.getStatusName(TaxObligationStatus.Pending)).toBe('Na čekanju');
    expect(component.getStatusName(TaxObligationStatus.Paid)).toBe('Plaćeno');
    expect(component.getStatusName(TaxObligationStatus.Archived)).toBe('Arhivirano');
  });

  it('should return correct type name', () => {
    expect(component.getTypeName(TaxObligationType.PIO)).toBe('PIO');
    expect(component.getTypeName(TaxObligationType.VAT)).toBe('PDV');
    expect(component.getTypeName(TaxObligationType.Health)).toBe('Zdravstveno');
    expect(component.getTypeName(TaxObligationType.Unemployment)).toBe('Nezaposlenost');
  });

  it('should return correct status class', () => {
    expect(component.getStatusClass(TaxObligationStatus.Pending)).toBe('status-pending');
    expect(component.getStatusClass(TaxObligationStatus.Paid)).toBe('status-paid');
    expect(component.getStatusClass(TaxObligationStatus.Archived)).toBe('status-archived');
  });

  it('should format currency correctly', () => {
    const result = component.formatCurrency(5000);
    expect(result).toContain('5');
    expect(result).toContain('000');
    expect(result.length).toBeGreaterThan(3);
  });

  it('should return correct status badge HTML for Pending', () => {
    const badge = component.getStatusBadge(TaxObligationStatus.Pending);
    expect(badge).toContain('badge-pending');
    expect(badge).toContain('Na čekanju');
  });

  it('should return correct status badge HTML for Paid', () => {
    const badge = component.getStatusBadge(TaxObligationStatus.Paid);
    expect(badge).toContain('badge-paid');
  });

  it('should set summary after successful load', () => {
    expect(component.summary()).toEqual(mockSummary);
  });

  it('should keep summary null when load fails', () => {
    taxService.getSummary.and.returnValue(throwError(() => ({})));
    component.summary.set(null);
    component.loadSummary();
    expect(component.summary()).toBeNull();
  });

  it('should set isLoading to false after successful obligations load', () => {
    component.loadTaxObligations();
    expect(component.isLoading()).toBeFalse();
  });

  it('should set isLoading to false after failed obligations load', () => {
    taxService.getAll.and.returnValue(throwError(() => ({ error: {} })));
    component.loadTaxObligations();
    expect(component.isLoading()).toBeFalse();
  });

  it('should update activeStatusFilter when setStatusFilter is called', () => {
    component.setStatusFilter(TaxObligationStatus.Paid);
    expect(component.activeStatusFilter()).toBe(TaxObligationStatus.Paid);
  });

  it('should reset activeStatusFilter to null', () => {
    component.activeStatusFilter.set(TaxObligationStatus.Paid);
    component.setStatusFilter(null);
    expect(component.activeStatusFilter()).toBeNull();
  });
});