import { Component, inject, OnInit, signal } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
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
    imports: [CommonModule, ReactiveFormsModule, FullCalendarModule, TranslateModule],
    templateUrl: './reminders.component.html',
    styleUrl: './reminders.component.css'
})
export class RemindersComponent implements OnInit {
    reminderService = inject(ReminderService);
    fb = inject(FormBuilder);
    toastr = inject(ToastrService);
    translate = inject(TranslateService);

    reminders = signal<ReminderToReturnDto[]>([]);
    isLoading = signal(false);
    showModal = signal(false);
    showDetailsModal = signal(false);
    showDeleteConfirm = signal(false);
    editingReminder = signal<ReminderToReturnDto | null>(null);
    selectedReminder = signal<ReminderToReturnDto | null>(null);
    deletingReminder = signal<ReminderToReturnDto | null>(null);

    ReminderType = ReminderType;

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
            today: this.translate.instant('REMINDERS.CAL_TODAY'),
            month: this.translate.instant('REMINDERS.CAL_MONTH'),
            week: this.translate.instant('REMINDERS.CAL_WEEK'),
            day: this.translate.instant('REMINDERS.CAL_DAY')
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
        // Ažuriraj dugmad kalendara kad se jezik promeni
        this.translate.onLangChange.subscribe(() => {
            this.calendarOptions = {
                ...this.calendarOptions,
                buttonText: {
                    today: this.translate.instant('REMINDERS.CAL_TODAY'),
                    month: this.translate.instant('REMINDERS.CAL_MONTH'),
                    week: this.translate.instant('REMINDERS.CAL_WEEK'),
                    day: this.translate.instant('REMINDERS.CAL_DAY')
                }
            };
        });

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
                this.toastr.error(
                    err.error?.message || this.translate.instant('REMINDERS.TOAST_LOAD_ERROR'),
                    this.translate.instant('REMINDERS.TOAST_ERROR_TITLE')
                );
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
            extendedProps: { reminder }
        }));

        this.calendarOptions = { ...this.calendarOptions, events };
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

        const clickedDate = new Date(arg.date);
        const now2 = new Date();
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
        this.reminderForm.reset({ title: '', description: '', reminderType: ReminderType.Other, dueDate: formatted });
        this.showModal.set(true);
    }

    openAddModal() {
        this.editingReminder.set(null);
        this.reminderForm.reset({ title: '', description: '', reminderType: ReminderType.Other, dueDate: '' });
        this.showModal.set(true);
    }

    openEditModal(reminder: ReminderToReturnDto) {
        this.editingReminder.set(reminder);
        const formattedDate = new Date(reminder.dueDate).toISOString().slice(0, 16);
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
                    this.toastr.success(
                        this.translate.instant('REMINDERS.TOAST_UPDATE_SUCCESS'),
                        this.translate.instant('REMINDERS.TOAST_SUCCESS_TITLE')
                    );
                    this.loadReminders();
                    this.closeModal();
                },
                error: (err) => {
                    this.toastr.error(
                        err.error?.message || this.translate.instant('REMINDERS.TOAST_UPDATE_ERROR'),
                        this.translate.instant('REMINDERS.TOAST_ERROR_TITLE')
                    );
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
                    this.toastr.success(
                        this.translate.instant('REMINDERS.TOAST_CREATE_SUCCESS'),
                        this.translate.instant('REMINDERS.TOAST_SUCCESS_TITLE')
                    );
                    this.loadReminders();
                    this.closeModal();
                },
                error: (err) => {
                    this.toastr.error(
                        err.error?.message || this.translate.instant('REMINDERS.TOAST_CREATE_ERROR'),
                        this.translate.instant('REMINDERS.TOAST_ERROR_TITLE')
                    );
                }
            });
        }
    }

    markAsCompleted(reminder: ReminderToReturnDto) {
        this.reminderService.markCompleted(reminder.id).subscribe({
            next: () => {
                this.toastr.success(
                    this.translate.instant('REMINDERS.TOAST_COMPLETE_SUCCESS'),
                    this.translate.instant('REMINDERS.TOAST_SUCCESS_TITLE')
                );
                this.loadReminders();
                this.closeDetailsModal();
            },
            error: (err) => {
                this.toastr.error(
                    err.error?.message || this.translate.instant('REMINDERS.TOAST_COMPLETE_ERROR'),
                    this.translate.instant('REMINDERS.TOAST_ERROR_TITLE')
                );
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
                this.toastr.success(
                    this.translate.instant('REMINDERS.TOAST_DELETE_SUCCESS'),
                    this.translate.instant('REMINDERS.TOAST_SUCCESS_TITLE')
                );
                this.loadReminders();
                this.closeDeleteConfirm();
            },
            error: (err) => {
                this.toastr.error(
                    err.error?.message || this.translate.instant('REMINDERS.TOAST_DELETE_ERROR'),
                    this.translate.instant('REMINDERS.TOAST_ERROR_TITLE')
                );
                this.closeDeleteConfirm();
            }
        });
    }

    getReminderTypeName(type: ReminderType): string {
        switch (type) {
            case ReminderType.Tax:     return this.translate.instant('REMINDERS.TYPE_TAX');
            case ReminderType.Expense: return this.translate.instant('REMINDERS.TYPE_EXPENSE');
            case ReminderType.Meeting: return this.translate.instant('REMINDERS.TYPE_MEETING');
            case ReminderType.Other:   return this.translate.instant('REMINDERS.TYPE_OTHER');
            default:                   return this.translate.instant('REMINDERS.TYPE_UNKNOWN');
        }
    }

    formatDate(date: Date): string {
        const lang = this.translate.currentLang;
        const locale = lang === 'sr-Cyrl' ? 'sr-Cyrl-RS' : 'sr-Latn-RS';
        return new Date(date).toLocaleString(locale, {
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