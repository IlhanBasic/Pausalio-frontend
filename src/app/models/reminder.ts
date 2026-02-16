import { ReminderType } from "../enums/reminder-type";

export interface AddReminderDto {
  title: string;
  description?: string;
  reminderType?: ReminderType;
  dueDate: Date;
}

export interface ReminderToReturnDto {
  id: string;
  title: string;
  description?: string;
  reminderType: ReminderType;
  dueDate: Date;
  isCompleted: boolean;
  completedAt?: Date | null;
  createdAt: Date;
}

export interface UpdateReminderDto {
  title: string;
  description?: string;
  reminderType?: ReminderType;
  dueDate: Date;
}