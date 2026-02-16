import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface TableColumn {
    key: string;
    label: string;
    type?: 'text' | 'number' | 'currency' | 'date';
    sortable?: boolean;
}

export interface TableAction {
    label: string;
    icon: string;
    type: 'edit' | 'delete' | 'custom';
    color?: string;
    showCondition?: (item: any) => boolean;
}

@Component({
    selector: 'app-data-table',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './data-table.component.html',
    styleUrl: './data-table.component.css'
})
export class DataTableComponent {
    @Input() columns: TableColumn[] = [];
    @Input() set data(value: any[]) {
        this.dataSignal.set(value);
    }
    @Input() actions: TableAction[] = [];
    @Input() searchPlaceholder = 'Pretraži...';
    @Input() emptyMessage = 'Nema podataka za prikaz';

    @Output() onEdit = new EventEmitter<any>();
    @Output() onDelete = new EventEmitter<any>();
    @Output() onCustomAction = new EventEmitter<{ action: string, item: any }>();

    dataSignal = signal<any[]>([]);
    searchTerm = signal('');
    sortColumn = signal<string | null>(null);
    sortDirection = signal<'asc' | 'desc'>('asc');

    filteredData = computed(() => {
        let result = [...this.dataSignal()];

        // Search filter
        const search = this.searchTerm().toLowerCase();
        if (search) {
            result = result.filter(item => {
                return this.columns.some(col => {
                    const value = item[col.key];
                    return value?.toString().toLowerCase().includes(search);
                });
            });
        }

        // Sorting
        const sortCol = this.sortColumn();
        if (sortCol) {
            result.sort((a, b) => {
                const aVal = a[sortCol];
                const bVal = b[sortCol];

                if (aVal === bVal) return 0;

                const comparison = aVal > bVal ? 1 : -1;
                return this.sortDirection() === 'asc' ? comparison : -comparison;
            });
        }

        return result;
    });

    onSearchChange(value: string) {
        this.searchTerm.set(value);
    }

    toggleSort(column: TableColumn) {
        if (!column.sortable) return;

        if (this.sortColumn() === column.key) {
            this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
        } else {
            this.sortColumn.set(column.key);
            this.sortDirection.set('asc');
        }
    }

    formatValue(value: any, type?: string): string {
        if (value === null || value === undefined) return '-';

        switch (type) {
            case 'currency':
                return new Intl.NumberFormat('sr-RS', {
                    style: 'currency',
                    currency: 'RSD'
                }).format(value);
            case 'number':
                return new Intl.NumberFormat('sr-RS').format(value);
            case 'date':
                return new Date(value).toLocaleDateString('sr-RS');
            default:
                return value.toString();
        }
    }

    handleEdit(item: any) {
        this.onEdit.emit(item);
    }

    handleDelete(item: any) {
        this.onDelete.emit(item);
    }

    handleCustomAction(action: TableAction, item: any) {
        this.onCustomAction.emit({ action: action.label, item });
    }

    getSortIcon(column: TableColumn): string {
        if (!column.sortable) return '';
        if (this.sortColumn() !== column.key) return '⇅';
        return this.sortDirection() === 'asc' ? '↑' : '↓';
    }
}
