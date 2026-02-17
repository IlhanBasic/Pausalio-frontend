import { Component, inject, OnInit, signal, ViewChild } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, ChartConfiguration, ChartData, ChartType, registerables } from 'chart.js';
import { InvoiceService } from '../../services/invoice.service';
import { ExpenseService } from '../../services/expense.service';
import { PaymentService } from '../../services/payment.service';
import { TaxObligationService } from '../../services/tax-obligation.service';
import { forkJoin } from 'rxjs';

// Register Chart.js components
Chart.register(...registerables);

@Component({
    selector: 'app-statistics',
    standalone: true,
    imports: [CommonModule, BaseChartDirective],
    templateUrl: './statistics.component.html',
    styleUrl: './statistics.component.css'
})
export class StatisticsComponent implements OnInit {
    invoiceService = inject(InvoiceService);
    expenseService = inject(ExpenseService);
    paymentService = inject(PaymentService);
    taxObligationService = inject(TaxObligationService);
    toastr = inject(ToastrService);

    isLoading = signal(true);

    // KPI Metrics
    totalRevenue = signal(0);
    totalExpenses = signal(0);
    netResult = signal(0);
    taxObligations = signal(0);

    // Upcoming obligations
    upcomingTaxes = signal<any[]>([]);

    // Line Chart - Monthly Trends
    lineChartData: ChartData<'line'> = {
        labels: [],
        datasets: []
    };

    lineChartOptions: ChartConfiguration['options'] = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true,
                position: 'top'
            },
            title: {
                display: true,
                text: 'Mesečni trend prihoda i troškova'
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    callback: function (value) {
                        return value.toLocaleString('sr-RS') + ' RSD';
                    }
                }
            }
        }
    };

    lineChartType: ChartType = 'line';

    // Pie Chart - Payment Status Distribution
    pieChartData: ChartData<'pie'> = {
        labels: [],
        datasets: []
    };

    pieChartOptions: ChartConfiguration['options'] = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true,
                position: 'right'
            },
            title: {
                display: true,
                text: 'Raspodela faktura po statusu plaćanja'
            }
        }
    };

    pieChartType: ChartType = 'pie';

    ngOnInit() {
        this.loadStatistics();
    }

    loadStatistics() {
        this.isLoading.set(true);

        forkJoin({
            invoiceSummary: this.invoiceService.getSummary(),
            expenseSummary: this.expenseService.getSummary(),
            paymentSummary: this.paymentService.getSummary(),
            taxSummary: this.taxObligationService.getSummary(),
            invoices: this.invoiceService.getAll(),
            expenses: this.expenseService.getAll(),
            taxes: this.taxObligationService.getAll()
        }).subscribe({
            next: (data) => {
                // Calculate KPIs
                this.totalRevenue.set(data.invoiceSummary.data?.totalPaid || 0);
                this.totalExpenses.set(data.expenseSummary.data?.totalPaid || 0);
                this.netResult.set(this.totalRevenue() - this.totalExpenses());
                this.taxObligations.set(data.taxSummary.data?.totalPending || 0);

                // Prepare line chart data (monthly trends)
                this.prepareLineChartData(data.invoices.data || [], data.expenses.data || []);

                // Prepare pie chart data (invoice payment status)
                this.preparePieChartData(data.invoiceSummary.data);

                // Get upcoming tax obligations
                const pendingTaxes = (data.taxes.data || [])
                    .filter(tax => tax.status === 1) // Pending status
                    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                    .slice(0, 5); // Top 5 upcoming

                this.upcomingTaxes.set(pendingTaxes);

                this.isLoading.set(false);
            },
            error: (err) => {
                console.error('Error loading statistics:', err);
                this.toastr.error('Greška pri učitavanju statistike', 'Greška');
                this.isLoading.set(false);
            }
        });
    }

    prepareLineChartData(invoices: any[], expenses: any[]) {
        // Group by month
        const monthlyData: { [key: string]: { revenue: number, expenses: number } } = {};
        const currentYear = new Date().getFullYear();

        // Initialize last 12 months
        for (let i = 11; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            monthlyData[key] = { revenue: 0, expenses: 0 };
        }

        // Aggregate invoice revenue
        invoices.forEach(invoice => {
            if (invoice.paymentStatus === 2) { // Paid
                const date = new Date(invoice.issueDate);
                const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                if (monthlyData[key]) {
                    monthlyData[key].revenue += invoice.totalAmountRSD || 0;
                }
            }
        });

        // Aggregate expenses
        expenses.forEach(expense => {
            if (expense.status === 2) { // Paid
                const date = new Date(expense.createdAt);
                const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                if (monthlyData[key]) {
                    monthlyData[key].expenses += expense.amount || 0;
                }
            }
        });

        // Prepare chart data
        const labels = Object.keys(monthlyData).map(key => {
            const [year, month] = key.split('-');
            return this.getMonthName(parseInt(month));
        });

        const revenueData = Object.values(monthlyData).map(d => d.revenue);
        const expenseData = Object.values(monthlyData).map(d => d.expenses);

        this.lineChartData = {
            labels: labels,
            datasets: [
                {
                    label: 'Prihodi',
                    data: revenueData,
                    borderColor: '#48bb78',
                    backgroundColor: 'rgba(72, 187, 120, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Troškovi',
                    data: expenseData,
                    borderColor: '#f56565',
                    backgroundColor: 'rgba(245, 101, 101, 0.1)',
                    tension: 0.4,
                    fill: true
                }
            ]
        };
    }

    preparePieChartData(invoiceSummary: any) {
        if (!invoiceSummary) return;

        const paid = invoiceSummary.totalPaid || 0;
        const unpaid = invoiceSummary.totalUnpaid || 0;
        const overdue = invoiceSummary.totalOverdue || 0;

        this.pieChartData = {
            labels: ['Plaćeno', 'Neplaćeno', 'Prekoračeno'],
            datasets: [{
                data: [paid, unpaid, overdue],
                backgroundColor: [
                    '#48bb78',
                    '#ed8936',
                    '#f56565'
                ],
                hoverBackgroundColor: [
                    '#38a169',
                    '#dd6b20',
                    '#e53e3e'
                ]
            }]
        };
    }

    getMonthName(month: number): string {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Avg', 'Sep', 'Okt', 'Nov', 'Dec'];
        return months[month - 1] || '';
    }

    formatCurrency(amount: number): string {
        return new Intl.NumberFormat('sr-RS', {
            style: 'currency',
            currency: 'RSD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }

    formatDate(date: Date): string {
        return new Date(date).toLocaleDateString('sr-RS', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    getTaxTypeName(type: number): string {
        switch (type) {
            case 1:
                return 'Porez na dohodak';
            case 2:
                return 'Doprinosi';
            default:
                return 'Ostalo';
        }
    }
}
