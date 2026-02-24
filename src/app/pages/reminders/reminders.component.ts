import { Component, inject, OnInit, signal } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventClickArg } from '@fullcalendar/core';
import { DateClickArg } from '@fullcalendar/interaction';
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
    toastr = inject(ToastrService);

    ReminderType = ReminderType;

    // Track double-click logic
    private lastClickedDate: string | null = null;
    private lastClickTime: number = 0;

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
        buttonText: {
            today: 'Danas',
            month: 'Mesec',
            week: 'Nedelja',
            day: 'Dan'
        },
        editable: false,
        selectable: true,
        selectMirror: true,
        dayMaxEvents: true,
        weekends: true,
        events: [],
        eventClick: this.handleEventClick.bind(this),
        dateClick: this.handleDateClick.bind(this),
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
                this.toastr.error(err.error?.message || 'Greška pri učitavanju podsetnika', 'Greška');
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
        if (reminder.isCompleted) return '#68d391';

        switch (reminder.reminderType) {
            case ReminderType.Tax:     return '#f56565';
            case ReminderType.Expense: return '#ed8936';
            case ReminderType.Meeting: return '#4299e1';
            case ReminderType.Other:   return '#9f7aea';
            default:                   return '#718096';
        }
    }

    handleEventClick(clickInfo: EventClickArg) {
        const reminder = clickInfo.event.extendedProps['reminder'] as ReminderToReturnDto;
        this.selectedReminder.set(reminder);
        this.showDetailsModal.set(true);
    }

    handleDateClick(arg: DateClickArg) {
        const now = Date.now();
        const sameDate = this.lastClickedDate === arg.dateStr;
        const isDoubleClick = sameDate && (now - this.lastClickTime) < 400;

        this.lastClickedDate = arg.dateStr;
        this.lastClickTime = now;

        if (!isDoubleClick) return;

        // Pre-fill date: use clicked date at current time, or 09:00 as default
        const clickedDate = new Date(arg.date);
        const now2 = new Date();

        // If clicked date is today, use current time rounded up to next 5min; otherwise 09:00
        const isToday = clickedDate.toDateString() === now2.toDateString();
        if (isToday) {
            clickedDate.setHours(now2.getHours(), Math.ceil(now2.getMinutes() / 5) * 5, 0, 0);
        } else {
            clickedDate.setHours(9, 0, 0, 0);
        }

        const formatted = new Date(clickedDate.getTime() - (clickedDate.getTimezoneOffset() * 60000))
            .toISOString()
            .slice(0, 16);

        this.editingReminder.set(null);
        this.reminderForm.reset({
            title: '',
            description: '',
            reminderType: ReminderType.Other,
            dueDate: formatted
        });
        this.showModal.set(true);
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
            const dto: UpdateReminderDto = {
                title: formValue.title!,
                description: formValue.description || undefined,
                reminderType: formValue.reminderType!,
                dueDate: new Date(formValue.dueDate!)
            };

            this.reminderService.update(editing.id, dto).subscribe({
                next: () => {
                    this.toastr.success('Podsetnik uspešno ažuriran', 'Uspeh');
                    this.loadReminders();
                    this.closeModal();
                },
                error: (err) => {
                    console.error('Error updating reminder:', err);
                    this.toastr.error(err.error?.message || 'Greška pri ažuriranju podsetnika', 'Greška');
                }
            });
        } else {
            const dto: AddReminderDto = {
                title: formValue.title!,
                description: formValue.description || undefined,
                reminderType: formValue.reminderType!,
                dueDate: formValue.dueDate!
            };

            this.reminderService.create(dto).subscribe({
                next: () => {
                    this.toastr.success('Podsetnik uspešno dodat', 'Uspeh');
                    this.loadReminders();
                    this.closeModal();
                },
                error: (err) => {
                    console.error('Error creating reminder:', err);
                    this.toastr.error(err.error?.message || 'Greška pri dodavanju podsetnika', 'Greška');
                }
            });
        }
    }

    markAsCompleted(reminder: ReminderToReturnDto) {
        this.reminderService.markCompleted(reminder.id).subscribe({
            next: () => {
                this.toastr.success('Podsetnik označen kao završen', 'Uspeh');
                this.loadReminders();
                this.closeDetailsModal();
            },
            error: (err) => {
                console.error('Error marking reminder as completed:', err);
                this.toastr.error(err.error?.message || 'Greška pri označavanju podsetnika', 'Greška');
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
                this.toastr.success('Podsetnik uspešno obrisan', 'Uspeh');
                this.loadReminders();
                this.closeDeleteConfirm();
            },
            error: (err) => {
                console.error('Error deleting reminder:', err);
                this.toastr.error(err.error?.message || 'Greška pri brisanju podsetnika', 'Greška');
                this.closeDeleteConfirm();
            }
        });
    }

    getReminderTypeName(type: ReminderType): string {
        switch (type) {
            case ReminderType.Tax:     return 'Porez';
            case ReminderType.Expense: return 'Trošak';
            case ReminderType.Meeting: return 'Sastanak';
            case ReminderType.Other:   return 'Ostalo';
            default:                   return 'Nepoznato';
        }
    }

    formatDate(date: Date): string {
        return new Date(date).toLocaleString('sr-Latn-RS', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    get minDateTime(): string {
        const now = new Date();
        return new Date(now.getTime() - (now.getTimezoneOffset() * 60000))
            .toISOString()
            .slice(0, 16);
    }
}