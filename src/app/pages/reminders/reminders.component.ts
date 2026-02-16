import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventClickArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { ReminderService } from '../../services/reminder.service';
import { ReminderToReturnDto, AddReminderDto, UpdateReminderDto } from '../../models/reminder';
import { ReminderType } from '../../enums/reminder-type';

@Component({
    selector: 'app-reminders',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, FullCalendarModule],
    templateUrl: './reminders.component.html',
    styleUrl: './reminders.component.css'
})
export class RemindersComponent implements OnInit {
    reminderService = inject(ReminderService);
    fb = inject(FormBuilder);

    reminders = signal<ReminderToReturnDto[]>([]);
    isLoading = signal(false);
    showModal = signal(false);
    showDetailsModal = signal(false);
    showDeleteConfirm = signal(false);
    editingReminder = signal<ReminderToReturnDto | null>(null);
    selectedReminder = signal<ReminderToReturnDto | null>(null);
    deletingReminder = signal<ReminderToReturnDto | null>(null);
    errorMessage = signal<string | null>(null);
    successMessage = signal<string | null>(null);

    ReminderType = ReminderType;

    reminderForm = this.fb.group({
        title: ['', Validators.required],
        description: [''],
        reminderType: [ReminderType.Other, Validators.required],
        dueDate: ['', Validators.required]
    });

    calendarOptions: CalendarOptions = {
        plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        editable: false,
        selectable: true,
        selectMirror: true,
        dayMaxEvents: true,
        weekends: true,
        events: [],
        eventClick: this.handleEventClick.bind(this),
        height: 'auto'
    };

    ngOnInit() {
        this.loadReminders();
    }

    loadReminders() {
        this.isLoading.set(true);
        this.reminderService.getAll().subscribe({
            next: (reminders) => {
                this.reminders.set(reminders || []);
                this.updateCalendarEvents();
                this.isLoading.set(false);
            },
            error: (err) => {
                console.error('Error loading reminders:', err);
                this.showError('Greška pri učitavanju podsetnika');
                this.isLoading.set(false);
            }
        });
    }

    updateCalendarEvents() {
        const events = this.reminders().map(reminder => ({
            id: reminder.id,
            title: reminder.title,
            start: new Date(reminder.dueDate),
            backgroundColor: this.getEventColor(reminder),
            borderColor: this.getEventColor(reminder),
            extendedProps: {
                reminder: reminder
            }
        }));

        this.calendarOptions = {
            ...this.calendarOptions,
            events: events
        };
    }

    getEventColor(reminder: ReminderToReturnDto): string {
        if (reminder.isCompleted) {
            return '#68d391'; // Green for completed
        }

        switch (reminder.reminderType) {
            case ReminderType.Tax:
                return '#f56565'; // Red for tax
            case ReminderType.Expense:
                return '#ed8936'; // Orange for expense
            case ReminderType.Meeting:
                return '#4299e1'; // Blue for meeting
            case ReminderType.Other:
                return '#9f7aea'; // Purple for other
            default:
                return '#718096'; // Gray default
        }
    }

    handleEventClick(clickInfo: EventClickArg) {
        const reminder = clickInfo.event.extendedProps['reminder'] as ReminderToReturnDto;
        this.selectedReminder.set(reminder);
        this.showDetailsModal.set(true);
    }

    openAddModal() {
        this.editingReminder.set(null);
        this.reminderForm.reset({
            title: '',
            description: '',
            reminderType: ReminderType.Other,
            dueDate: ''
        });
        this.showModal.set(true);
    }

    openEditModal(reminder: ReminderToReturnDto) {
        this.editingReminder.set(reminder);
        const dueDate = new Date(reminder.dueDate);
        const formattedDate = dueDate.toISOString().slice(0, 16);

        this.reminderForm.patchValue({
            title: reminder.title,
            description: reminder.description || '',
            reminderType: reminder.reminderType,
            dueDate: formattedDate
        });
        this.showDetailsModal.set(false);
        this.showModal.set(true);
    }

    closeModal() {
        this.showModal.set(false);
        this.reminderForm.reset();
        this.editingReminder.set(null);
    }

    closeDetailsModal() {
        this.showDetailsModal.set(false);
        this.selectedReminder.set(null);
    }

    onSubmit() {
        if (this.reminderForm.invalid) {
            this.reminderForm.markAllAsTouched();
            return;
        }

        const formValue = this.reminderForm.value;
        const editing = this.editingReminder();

        if (editing) {
            // Update existing reminder
            const dto: UpdateReminderDto = {
                title: formValue.title!,
                description: formValue.description || undefined,
                reminderType: formValue.reminderType!,
                dueDate: new Date(formValue.dueDate!)
            };

            this.reminderService.update(editing.id, dto).subscribe({
                next: () => {
                    this.showSuccess('Podsetnik uspešno ažuriran');
                    this.loadReminders();
                    this.closeModal();
                },
                error: (err) => {
                    console.error('Error updating reminder:', err);
                    this.showError('Greška pri ažuriranju podsetnika');
                }
            });
        } else {
            // Create new reminder
            const dto: AddReminderDto = {
                title: formValue.title!,
                description: formValue.description || undefined,
                reminderType: formValue.reminderType!,
                dueDate: new Date(formValue.dueDate!)
            };

            this.reminderService.create(dto).subscribe({
                next: () => {
                    this.showSuccess('Podsetnik uspešno dodat');
                    this.loadReminders();
                    this.closeModal();
                },
                error: (err) => {
                    console.error('Error creating reminder:', err);
                    this.showError('Greška pri dodavanju podsetnika');
                }
            });
        }
    }

    markAsCompleted(reminder: ReminderToReturnDto) {
        this.reminderService.markCompleted(reminder.id).subscribe({
            next: () => {
                this.showSuccess('Podsetnik označen kao završen');
                this.loadReminders();
                this.closeDetailsModal();
            },
            error: (err) => {
                console.error('Error marking reminder as completed:', err);
                this.showError('Greška pri označavanju podsetnika');
            }
        });
    }

    openDeleteConfirm(reminder: ReminderToReturnDto) {
        this.deletingReminder.set(reminder);
        this.showDetailsModal.set(false);
        this.showDeleteConfirm.set(true);
    }

    closeDeleteConfirm() {
        this.showDeleteConfirm.set(false);
        this.deletingReminder.set(null);
    }

    confirmDelete() {
        const reminder = this.deletingReminder();
        if (!reminder) return;

        this.reminderService.delete(reminder.id).subscribe({
            next: () => {
                this.showSuccess('Podsetnik uspešno obrisan');
                this.loadReminders();
                this.closeDeleteConfirm();
            },
            error: (err) => {
                console.error('Error deleting reminder:', err);
                this.showError('Greška pri brisanju podsetnika');
                this.closeDeleteConfirm();
            }
        });
    }

    getReminderTypeName(type: ReminderType): string {
        switch (type) {
            case ReminderType.Tax:
                return 'Porez';
            case ReminderType.Expense:
                return 'Trošak';
            case ReminderType.Meeting:
                return 'Sastanak';
            case ReminderType.Other:
                return 'Ostalo';
            default:
                return 'Nepoznato';
        }
    }

    formatDate(date: Date): string {
        return new Date(date).toLocaleString('sr-RS', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    showError(message: string) {
        this.errorMessage.set(message);
        setTimeout(() => this.errorMessage.set(null), 5000);
    }

    showSuccess(message: string) {
        this.successMessage.set(message);
        setTimeout(() => this.successMessage.set(null), 3000);
    }
}
