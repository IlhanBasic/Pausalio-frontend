import { Component, inject, OnInit, signal } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { InvoiceService } from '../../services/invoice.service';
import { InvoiceToReturnDto } from '../../models/invoice';
import { Currency } from '../../enums/currency';
import { PaymentStatus } from '../../enums/payment-status';
import { InvoiceStatus } from '../../enums/invoice-status';

interface TopClient {
    id: string;
    name: string;
    totalAmount: number;
    invoiceCount: number;
    percentage: number;
}

interface BestSellingItem {
    name: string;
    quantity: number;
    revenue: number;
}

@Component({
    selector: 'app-home',
    standalone: true,
    imports: [CommonModule, TranslateModule],
    templateUrl: './home.component.html',
    styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {
    invoiceService = inject(InvoiceService);
    toastr = inject(ToastrService);
    translate = inject(TranslateService);

    isLoading = signal(true);
    totalRevenue = signal(0);
    totalInvoicesCount = signal(0);
    averageInvoiceValue = signal(0);
    topClients = signal<TopClient[]>([]);
    bestSellingItems = signal<BestSellingItem[]>([]);
    displayedRevenue = signal(0);
    displayedCount = signal(0);
    displayedAvg = signal(0);

    ngOnInit() {
        this.loadDashboardData();
    }

    loadDashboardData() {
        this.isLoading.set(true);

        this.invoiceService.getAll().subscribe({
            next: (response) => {
                const invoices = response.data || [];
                this.processInvoices(invoices);
                this.isLoading.set(false);
            },
            error: (err) => {
                console.error('Error loading dashboard data', err);
                this.toastr.error(
                    err.error?.message || this.translate.instant('HOME.TOAST_ERROR'),
                    this.translate.instant('HOME.TOAST_ERROR_TITLE')
                );
                this.isLoading.set(false);
            }
        });
    }

    processInvoices(invoices: InvoiceToReturnDto[]) {
        const isPaid = (inv: InvoiceToReturnDto): boolean =>
            inv.paymentStatus === PaymentStatus.paid || inv.invoiceStatus === InvoiceStatus.finished;

        const paidInvoices = invoices.filter(inv => isPaid(inv));
        const totalRev = paidInvoices.reduce((sum, inv) => sum + (inv.totalAmountRSD || 0), 0);
        const count = invoices.length;
        const avg = count > 0 ? totalRev / count : 0;

        this.totalRevenue.set(totalRev);
        this.totalInvoicesCount.set(count);
        this.averageInvoiceValue.set(avg);

        this.animateValue(this.displayedRevenue, totalRev, 1500);
        this.animateValue(this.displayedCount, count, 1000);
        this.animateValue(this.displayedAvg, avg, 1500);

        const clientMap = new Map<string, TopClient>();
        invoices.forEach((inv: InvoiceToReturnDto) => {
            const clientId = inv.client?.id;
            if (!clientId) return;
            if (!clientMap.has(clientId)) {
                clientMap.set(clientId, {
                    id: clientId,
                    name: inv.client?.name || 'Nepoznato',
                    totalAmount: 0,
                    invoiceCount: 0,
                    percentage: 0
                });
            }
            const client = clientMap.get(clientId)!;
            client.totalAmount += inv.totalAmountRSD || 0;
            client.invoiceCount++;
        });

        const sortedClients = Array.from(clientMap.values())
            .sort((a, b) => b.totalAmount - a.totalAmount)
            .slice(0, 4);
        const maxClientAmount = sortedClients[0]?.totalAmount || 1;
        sortedClients.forEach(c => c.percentage = (c.totalAmount / maxClientAmount) * 100);
        this.topClients.set(sortedClients);

        const itemMap = new Map<string, BestSellingItem>();
        invoices.forEach((inv: InvoiceToReturnDto) => {
            if (inv.items) {
                inv.items.forEach((item: any) => {
                    const key = (item.name || '').trim();
                    if (!key) return;
                    if (!itemMap.has(key)) {
                        itemMap.set(key, { name: key, quantity: 0, revenue: 0 });
                    }
                    const existing = itemMap.get(key)!;
                    existing.quantity += item.quantity || 0;
                    const itemTotal = item.totalPrice || item.total || ((item.quantity || 0) * (item.unitPrice || 0)) || 0;
                    const exchangeRate = inv.exchangeRate && inv.exchangeRate > 0 ? inv.exchangeRate : 1;
                    existing.revenue += inv.currency === Currency.RSD ? itemTotal : itemTotal * exchangeRate;
                });
            }
        });

        const sortedItems = Array.from(itemMap.values())
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 5);
        this.bestSellingItems.set(sortedItems);
    }

    animateValue(signalSetter: any, target: number, duration: number) {
        const start = 0;
        const startTime = performance.now();
        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 4);
            signalSetter.set(Math.floor(start + (target - start) * ease));
            if (progress < 1) requestAnimationFrame(animate);
            else signalSetter.set(target);
        };
        requestAnimationFrame(animate);
    }
}