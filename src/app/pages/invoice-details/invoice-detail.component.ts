import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { InvoiceService } from '../../services/invoice.service';
import { InvoiceToReturnDto } from '../../models/invoice';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
    selector: 'app-invoice-detail',
    standalone: true,
    imports: [CommonModule, FormsModule, TranslateModule],
    templateUrl: './invoice-detail.component.html',
    styleUrl: './invoice-detail.component.css'
})
export class InvoiceDetailComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private invoiceService = inject(InvoiceService);
    private toastr = inject(ToastrService);
    private sanitizer = inject(DomSanitizer);
    private translate = inject(TranslateService);

    invoiceId = signal<string>('');
    previewHtml = signal<SafeHtml>('');
    isLoadingPreview = signal(false);
    isExporting = signal(false);
    isSending = signal(false);
    showSendPanel = signal(false);

    emailInput = signal<string>('');
    emails = signal<string[]>([]);

    ngOnInit() {
        const id = this.route.snapshot.paramMap.get('id');
        if (!id) {
            this.router.navigate(['/invoices']);
            return;
        }
        this.invoiceId.set(id);
        this.loadPreview();
    }

    loadPreview() {
        this.isLoadingPreview.set(true);
        this.invoiceService.getPreview(this.invoiceId()).subscribe({
            next: (response) => {
                // Ukloni overflow:hidden sa .invoice-wrapper koji seče tabelu na mobilnom
                const fixed = (response.data || '').replace(
                    '.invoice-wrapper {',
                    '.invoice-wrapper { overflow-x: auto !important; overflow-y: visible !important;'
                );
                const safe = this.sanitizer.bypassSecurityTrustHtml(fixed);
                this.previewHtml.set(safe);
                this.isLoadingPreview.set(false);
            },
            error: (err) => {
                console.error('Error loading preview:', err);
                this.toastr.error(
                    this.translate.instant('INVOICE_DETAIL.TOAST_PREVIEW_ERROR'),
                    this.translate.instant('INVOICE_DETAIL.TOAST_ERROR_TITLE')
                );
                this.isLoadingPreview.set(false);
            }
        });
    }

    exportPdf() {
        this.isExporting.set(true);
        this.invoiceService.exportPdf(this.invoiceId()).subscribe({
            next: (blob) => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Faktura.pdf`;
                a.click();
                window.URL.revokeObjectURL(url);
                this.isExporting.set(false);
            },
            error: (err) => {
                console.error('Error exporting PDF:', err);
                this.toastr.error(
                    this.translate.instant('INVOICE_DETAIL.TOAST_PDF_ERROR'),
                    this.translate.instant('INVOICE_DETAIL.TOAST_ERROR_TITLE')
                );
                this.isExporting.set(false);
            }
        });
    }

    print() {
        const content = document.getElementById('invoice-preview-content')?.innerHTML;
        if (!content) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head><title>Faktura</title></head>
            <body>${content}</body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
    }

    openSendPanel() {
        this.invoiceService.getById(this.invoiceId()).subscribe({
            next: (response) => {
                const clientEmail = response.data?.client?.email;
                if (clientEmail && !this.emails().includes(clientEmail)) {
                    this.emails.set([clientEmail]);
                }
                this.showSendPanel.set(true);
            },
            error: () => this.showSendPanel.set(true)
        });
    }

    closeSendPanel() {
        this.showSendPanel.set(false);
        this.emailInput.set('');
    }

    addEmail() {
        const email = this.emailInput().trim();
        if (!email) return;

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            this.toastr.warning(
                this.translate.instant('INVOICE_DETAIL.TOAST_EMAIL_INVALID'),
                this.translate.instant('INVOICE_DETAIL.TOAST_WARNING_TITLE')
            );
            return;
        }

        if (this.emails().includes(email)) {
            this.toastr.warning(
                this.translate.instant('INVOICE_DETAIL.TOAST_EMAIL_DUPLICATE'),
                this.translate.instant('INVOICE_DETAIL.TOAST_WARNING_TITLE')
            );
            return;
        }

        this.emails.update(list => [...list, email]);
        this.emailInput.set('');
    }

    removeEmail(email: string) {
        this.emails.update(list => list.filter(e => e !== email));
    }

    onEmailKeydown(event: KeyboardEvent) {
        if (event.key === 'Enter' || event.key === ',') {
            event.preventDefault();
            this.addEmail();
        }
    }

    sendInvoice() {
        if (this.emails().length === 0) {
            this.toastr.warning(
                this.translate.instant('INVOICE_DETAIL.TOAST_EMAIL_EMPTY'),
                this.translate.instant('INVOICE_DETAIL.TOAST_WARNING_TITLE')
            );
            return;
        }

        this.isSending.set(true);
        this.invoiceService.sendInvoice(this.invoiceId(), { emails: this.emails() }).subscribe({
            next: () => {
                this.toastr.success(
                    this.translate.instant('INVOICE_DETAIL.TOAST_SEND_SUCCESS'),
                    this.translate.instant('INVOICE_DETAIL.TOAST_SUCCESS_TITLE')
                );
                this.closeSendPanel();
                this.isSending.set(false);
            },
            error: (err) => {
                console.error('Error sending invoice:', err);
                this.toastr.error(
                    err.error?.message || this.translate.instant('INVOICE_DETAIL.TOAST_SEND_ERROR'),
                    this.translate.instant('INVOICE_DETAIL.TOAST_ERROR_TITLE')
                );
                this.isSending.set(false);
            }
        });
    }

    goBack() {
        this.router.navigate(['/invoices']);
    }
}