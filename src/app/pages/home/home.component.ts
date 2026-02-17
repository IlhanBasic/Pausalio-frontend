import { Component, inject, OnInit, signal } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import { InvoiceService } from '../../services/invoice.service';
import { InvoiceToReturnDto } from '../../models/invoice';
import { forkJoin } from 'rxjs';
import { catchError, of } from 'rxjs';

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
    imports: [CommonModule],
    templateUrl: './home.component.html',
    styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {
    invoiceService = inject(InvoiceService);
    toastr = inject(ToastrService);

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

                // DEBUG — obrisi posle resavanja
                console.log('=== HOME DEBUG ===');
                console.log('Broj faktura:', invoices.length);
                console.log('Prva faktura:', invoices[0]);
                console.log('paymentStatus vrednosti:', [...new Set(invoices.map((i: any) => i.paymentStatus))]);
                console.log('invoiceStatus vrednosti:', [...new Set(invoices.map((i: any) => i.invoiceStatus))]);
                console.log('totalAmountRSD:', invoices.map((i: any) => i.totalAmountRSD));
                console.log('totalAmount:', invoices.map((i: any) => i.totalAmount));
                console.log('=================');

                this.processInvoices(invoices);
                this.isLoading.set(false);
            },
            error: (err) => {
                console.error('Error loading dashboard data', err);
                this.toastr.error('Greška pri učitavanju podataka za kontrolnu tablu', 'Greška');
                this.isLoading.set(false);
            }
        });
    }

    processInvoices(invoices: InvoiceToReturnDto[]) {

        // Pokusaj sve moguce varijante polja za iznos
        const getAmount = (inv: any): number => {
            return inv.totalAmountRSD
                || inv.totalAmount
                || inv.amount
                || inv.total
                || 0;
        };

        // Pokusaj sve moguce varijante za placeni status
        const isPaid = (inv: any): boolean => {
            return inv.paymentStatus === 2
                || inv.paymentStatus === 'Paid'
                || inv.paymentStatus === 1
                || inv.invoiceStatus === 2
                || inv.invoiceStatus === 'Paid';
        };

        // 1. Prihodi — prvo pokusaj samo placene, ako je 0 uzmi sve
        const paidInvoices = invoices.filter(inv => isPaid(inv));
        let totalRev = paidInvoices.reduce((sum, inv) => sum + getAmount(inv), 0);

        console.log('Placene fakture:', paidInvoices.length, '| Prihod iz placenih:', totalRev);

        // Fallback: ako nema placenih ili je 0, uzmi SVE fakture
        if (totalRev === 0) {
            totalRev = invoices.reduce((sum, inv) => sum + getAmount(inv), 0);
            console.log('FALLBACK — prihod iz svih faktura:', totalRev);
        }

        const count = invoices.length;
        const avg = count > 0 ? totalRev / count : 0;

        this.totalRevenue.set(totalRev);
        this.totalInvoicesCount.set(count);
        this.averageInvoiceValue.set(avg);

        this.animateValue(this.displayedRevenue, totalRev, 1500);
        this.animateValue(this.displayedCount, count, 1000);
        this.animateValue(this.displayedAvg, avg, 1500);

        // 2. Top Clients
        const clientMap = new Map<string, TopClient>();

        invoices.forEach((inv: any) => {
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
            client.totalAmount += getAmount(inv);
            client.invoiceCount++;
        });

        const sortedClients = Array.from(clientMap.values())
            .sort((a, b) => b.totalAmount - a.totalAmount)
            .slice(0, 4);

        const maxClientAmount = sortedClients[0]?.totalAmount || 1;
        sortedClients.forEach(c => {
            c.percentage = (c.totalAmount / maxClientAmount) * 100;
        });

        this.topClients.set(sortedClients);

        // 3. Best Selling Items
        const itemMap = new Map<string, BestSellingItem>();

        invoices.forEach((inv: any) => {
            if (inv.items) {
                inv.items.forEach((item: any) => {
                    const key = (item.name || '').trim();
                    if (!key) return;

                    if (!itemMap.has(key)) {
                        itemMap.set(key, {
                            name: key,
                            quantity: 0,
                            revenue: 0
                        });
                    }
                    const existing = itemMap.get(key)!;
                    existing.quantity += item.quantity || 0;
                    existing.revenue += item.totalPrice || item.total || (item.quantity * item.unitPrice) || 0;
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
            const current = start + (target - start) * ease;
            signalSetter.set(Math.floor(current));

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                signalSetter.set(target);
            }
        };

        requestAnimationFrame(animate);
    }
}