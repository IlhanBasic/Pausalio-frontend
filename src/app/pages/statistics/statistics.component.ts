import { Component, inject, OnInit, signal } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, ChartConfiguration, ChartData, ChartType, registerables } from 'chart.js';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { InvoiceService } from '../../services/invoice.service';
import { ExpenseService } from '../../services/expense.service';
import { PaymentService } from '../../services/payment.service';
import { TaxObligationService } from '../../services/tax-obligation.service';
import { ClientService } from '../../services/client.service';
import { ClientType } from '../../enums/client-type';
import { forkJoin } from 'rxjs';

Chart.register(...registerables);

@Component({
  selector: 'app-statistics',
  standalone: true,
  imports: [CommonModule, BaseChartDirective, TranslateModule],
  templateUrl: './statistics.component.html',
  styleUrl: './statistics.component.css',
})
export class StatisticsComponent implements OnInit {
  invoiceService = inject(InvoiceService);
  expenseService = inject(ExpenseService);
  paymentService = inject(PaymentService);
  taxObligationService = inject(TaxObligationService);
  clientService = inject(ClientService);
  toastr = inject(ToastrService);
  translate = inject(TranslateService);

  isLoading = signal(true);

  // KPI Metrics
  totalRevenue = signal(0);
  totalExpenses = signal(0);
  netResult = signal(0);
  taxObligations = signal(0);

  // Upcoming obligations
  upcomingTaxes = signal<any[]>([]);

  // Line Chart - Monthly Trends
  lineChartData: ChartData<'line'> = { labels: [], datasets: [] };

  lineChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'top' },
      title: {
        display: true,
        text: this.translate.instant('STATISTICS.CHART_LINE_TITLE'),
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => {
            return (
              value.toLocaleString(
                this.translate.currentLang === 'sr-Cyrl' ? 'sr-Cyrl-RS' : 'sr-Latn-RS',
              ) + ' RSD'
            );
          },
        },
      },
    },
  };

  lineChartType: ChartType = 'line';

  // Pie Chart - Payment Status Distribution
  pieChartData: ChartData<'pie'> = { labels: [], datasets: [] };

  pieChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'right' },
      title: {
        display: true,
        text: this.translate.instant('STATISTICS.CHART_PIE_TITLE'),
      },
    },
  };

  pieChartType: ChartType = 'pie';

  // Horizontal Bar Chart - Top 5 Cities (bars go left→right, indexAxis: 'y')
  barChartData: ChartData<'bar'> = { labels: [], datasets: [] };

  barChartOptions: ChartConfiguration['options'] = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: this.translate.instant('STATISTICS.CHART_CITY_TITLE'),
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.parsed.x as number;
            return (
              ' ' +
              new Intl.NumberFormat(
                this.translate.currentLang === 'sr-Cyrl' ? 'sr-Cyrl-RS' : 'sr-Latn-RS',
                {
                  style: 'currency',
                  currency: 'RSD',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                },
              ).format(value)
            );
          },
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: {
          callback: (value) => {
            const num = value as number;

            if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M RSD';
            if (num >= 1000) return (num / 1000).toFixed(0) + 'K RSD';

            return (
              num.toLocaleString(
                this.translate.currentLang === 'sr-Cyrl' ? 'sr-Cyrl-RS' : 'sr-Latn-RS',
              ) + ' RSD'
            );
          },
        },
      },
      y: {
        ticks: { font: { size: 13 } },
      },
    },
  };

  barChartType: ChartType = 'bar';

  // Vertical Bar Chart - Top 5 Countries for foreign clients (bars go bottom→up, indexAxis: 'x')
  countryChartData: ChartData<'bar'> = { labels: [], datasets: [] };

  countryChartOptions: ChartConfiguration['options'] = {
    indexAxis: 'x',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: this.translate.instant('STATISTICS.CHART_COUNTRY_TITLE'),
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.parsed.y as number;
            return (
              ' ' +
              new Intl.NumberFormat(
                this.translate.currentLang === 'sr-Cyrl' ? 'sr-Cyrl-RS' : 'sr-Latn-RS',
                {
                  style: 'currency',
                  currency: 'RSD',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                },
              ).format(value)
            );
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => {
            const num = value as number;

            if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M RSD';
            if (num >= 1000) return (num / 1000).toFixed(0) + 'K RSD';

            return (
              num.toLocaleString(
                this.translate.currentLang === 'sr-Cyrl' ? 'sr-Cyrl-RS' : 'sr-Latn-RS',
              ) + ' RSD'
            );
          },
        },
      },
      x: {
        ticks: { font: { size: 13 } },
      },
    },
  };

  countryChartType: ChartType = 'bar';

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
      taxes: this.taxObligationService.getAll(),
      clients: this.clientService.getAll(),
    }).subscribe({
      next: (data) => {
        this.totalRevenue.set(data.invoiceSummary.data?.totalPaid || 0);
        this.totalExpenses.set(data.expenseSummary.data?.totalPaid || 0);
        this.netResult.set(this.totalRevenue() - this.totalExpenses());
        this.taxObligations.set(data.taxSummary.data?.totalPending || 0);

        this.prepareLineChartData(data.invoices.data || [], data.expenses.data || []);
        this.preparePieChartData(data.invoiceSummary.data);
        this.prepareCityBarChartData(data.invoices.data || [], data.clients.data || []);
        this.prepareCountryBarChartData(data.invoices.data || [], data.clients.data || []);

        const pendingTaxes = (data.taxes.data || [])
          .filter((tax: any) => tax.status === 1)
          .sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
          .slice(0, 5);

        this.upcomingTaxes.set(pendingTaxes);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading statistics:', err);
        this.toastr.error(
          err.error?.message || this.translate.instant('STATISTICS.TOAST_LOAD_ERROR'),
          this.translate.instant('STATISTICS.TOAST_ERROR_TITLE'),
        );
        this.isLoading.set(false);
      },
    });
  }

  prepareLineChartData(invoices: any[], expenses: any[]) {
    const monthlyData: { [key: string]: { revenue: number; expenses: number } } = {};

    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[key] = { revenue: 0, expenses: 0 };
    }

    invoices.forEach((invoice: any) => {
      if (invoice.paymentStatus === 2) {
        const date = new Date(invoice.issueDate);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (monthlyData[key]) monthlyData[key].revenue += invoice.totalAmountRSD || 0;
      }
    });

    expenses.forEach((expense: any) => {
      if (expense.status === 2) {
        const date = new Date(expense.createdAt);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (monthlyData[key]) monthlyData[key].expenses += expense.amount || 0;
      }
    });

    const labels = Object.keys(monthlyData).map((key) => {
      const [, month] = key.split('-');
      return this.getMonthName(parseInt(month));
    });

    this.lineChartData = {
      labels,
      datasets: [
        {
          label: this.translate.instant('STATISTICS.CHART_LINE_REVENUE'),
          data: Object.values(monthlyData).map((d) => d.revenue),
          borderColor: '#48bb78',
          backgroundColor: 'rgba(72, 187, 120, 0.1)',
          tension: 0.4,
          fill: true,
        },
        {
          label: this.translate.instant('STATISTICS.CHART_LINE_EXPENSES'),
          data: Object.values(monthlyData).map((d) => d.expenses),
          borderColor: '#f56565',
          backgroundColor: 'rgba(245, 101, 101, 0.1)',
          tension: 0.4,
          fill: true,
        },
      ],
    };
  }

  preparePieChartData(invoiceSummary: any) {
    if (!invoiceSummary) return;

    this.pieChartData = {
      labels: [
        this.translate.instant('STATISTICS.CHART_PIE_PAID'),
        this.translate.instant('STATISTICS.CHART_PIE_UNPAID'),
        this.translate.instant('STATISTICS.CHART_PIE_OVERDUE'),
      ],
      datasets: [
        {
          data: [
            invoiceSummary.totalPaid || 0,
            invoiceSummary.totalUnpaid || 0,
            invoiceSummary.totalOverdue || 0,
          ],
          backgroundColor: ['#48bb78', '#ed8936', '#f56565'],
          hoverBackgroundColor: ['#38a169', '#dd6b20', '#e53e3e'],
        },
      ],
    };
  }

  prepareCityBarChartData(invoices: any[], clients: any[]) {
    const clientCityMap: { [clientId: string]: string } = {};
    clients.forEach((client: any) => {
      if (client.city) clientCityMap[client.id] = client.city;
    });

    const cityRevenue: { [city: string]: number } = {};
    invoices.forEach((invoice: any) => {
      const clientId = invoice.client?.id;
      const city = clientId ? clientCityMap[clientId] : invoice.client?.city;
      if (!city) return;
      if (!cityRevenue[city]) cityRevenue[city] = 0;
      cityRevenue[city] += invoice.totalAmountRSD || 0;
    });

    const top5 = Object.entries(cityRevenue)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    this.barChartData = {
      labels: top5.map(([city]) => city),
      datasets: [
        {
          label: this.translate.instant('STATISTICS.CHART_LINE_REVENUE'),
          data: top5.map(([, revenue]) => revenue),
          backgroundColor: [
            'rgba(102, 126, 234, 0.85)',
            'rgba(102, 126, 234, 0.70)',
            'rgba(102, 126, 234, 0.55)',
            'rgba(102, 126, 234, 0.42)',
            'rgba(102, 126, 234, 0.30)',
          ].slice(0, top5.length),
          borderColor: [
            'rgba(102, 126, 234, 1)',
            'rgba(102, 126, 234, 0.9)',
            'rgba(102, 126, 234, 0.75)',
            'rgba(102, 126, 234, 0.6)',
            'rgba(102, 126, 234, 0.5)',
          ].slice(0, top5.length),
          borderWidth: 2,
          borderRadius: 6,
        },
      ],
    };
  }

  prepareCountryBarChartData(invoices: any[], clients: any[]) {
    // Build map clientId -> country, only for foreign clients
    const foreignClientCountryMap: { [clientId: string]: string } = {};
    clients.forEach((client: any) => {
      if (client.clientType === ClientType.foreign && client.country) {
        foreignClientCountryMap[client.id] = client.country;
      }
    });

    const countryRevenue: { [country: string]: number } = {};
    invoices.forEach((invoice: any) => {
      const clientId = invoice.client?.id;
      // Primary: lookup from clients list; fallback: inline client on invoice
      const country = clientId
        ? foreignClientCountryMap[clientId]
        : invoice.client?.clientType === ClientType.foreign
          ? invoice.client?.country
          : null;
      if (!country) return;
      if (!countryRevenue[country]) countryRevenue[country] = 0;
      countryRevenue[country] += invoice.totalAmountRSD || 0;
    });

    const top5 = Object.entries(countryRevenue)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    this.countryChartData = {
      labels: top5.map(([country]) => country),
      datasets: [
        {
          label: this.translate.instant('STATISTICS.CHART_LINE_REVENUE'),
          data: top5.map(([, revenue]) => revenue),
          backgroundColor: [
            'rgba(237, 137, 54, 0.85)',
            'rgba(237, 137, 54, 0.70)',
            'rgba(237, 137, 54, 0.55)',
            'rgba(237, 137, 54, 0.42)',
            'rgba(237, 137, 54, 0.30)',
          ].slice(0, top5.length),
          borderColor: [
            'rgba(237, 137, 54, 1)',
            'rgba(237, 137, 54, 0.9)',
            'rgba(237, 137, 54, 0.75)',
            'rgba(237, 137, 54, 0.6)',
            'rgba(237, 137, 54, 0.5)',
          ].slice(0, top5.length),
          borderWidth: 2,
          borderRadius: 6,
        },
      ],
    };
  }

  getMonthName(month: number): string {
    const months = [
      this.translate.instant('STATISTICS.MONTH_JAN'),
      this.translate.instant('STATISTICS.MONTH_FEB'),
      this.translate.instant('STATISTICS.MONTH_MAR'),
      this.translate.instant('STATISTICS.MONTH_APR'),
      this.translate.instant('STATISTICS.MONTH_MAY'),
      this.translate.instant('STATISTICS.MONTH_JUN'),
      this.translate.instant('STATISTICS.MONTH_JUL'),
      this.translate.instant('STATISTICS.MONTH_AUG'),
      this.translate.instant('STATISTICS.MONTH_SEP'),
      this.translate.instant('STATISTICS.MONTH_OCT'),
      this.translate.instant('STATISTICS.MONTH_NOV'),
      this.translate.instant('STATISTICS.MONTH_DEC'),
    ];
    return months[month - 1] || '';
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat(
      this.translate.currentLang === 'sr-Cyrl' ? 'sr-Cyrl-RS' : 'sr-Latn-RS',
      {
        style: 'currency',
        currency: 'RSD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      },
    ).format(amount);
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString(
      this.translate.currentLang === 'sr-Cyrl' ? 'sr-Cyrl-RS' : 'sr-Latn-RS',
      {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      },
    );
  }

  getTaxTypeName(type: number): string {
    switch (type) {
      case 1:
        return this.translate.instant('STATISTICS.TAX_TYPE_INCOME');
      case 2:
        return this.translate.instant('STATISTICS.TAX_TYPE_CONTRIBUTIONS');
      default:
        return this.translate.instant('STATISTICS.TAX_TYPE_OTHER');
    }
  }
}
