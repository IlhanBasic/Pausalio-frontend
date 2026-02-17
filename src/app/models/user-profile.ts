import { UserRole } from "../enums/user-role";
import { AddBusinessProfileDto, BusinessProfileToReturnDto } from "./business-profile";
import { UserBusinessProfileToReturnDto } from "./user-business-profile";

export interface ChangePasswordDto {
  oldPassword: string;
  newPassword: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  email: string;
  pin: string;
  newPassword: string;
}

export interface AddUserProfileDto {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  profilePicture?: string | null;
  phone?: string | null;
  city?: string;
  address?: string | null;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterAssistantDto {
  inviteToken: string;
  user: AddUserProfileDto;
}

export interface RegisterOwnerDto {
  user: AddUserProfileDto;
  business: AddBusinessProfileDto;
}

export interface ResendVerificationDto {
  email: string;
}

export interface UpdateUserProfileDto {
  firstName: string;
  lastName: string;
  profilePicture?: string | null;
  phone?: string | null;
  city?: string;
  address?: string | null;
}

export interface UserProfileToReturnDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  profilePicture?: string | null;
  phone?: string | null;
  city?: string;
  address?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt?: Date | null;
  userBusinessProfiles?: UserBusinessProfileToReturnDto[];
  isEmailVerified: boolean;
  emailVerificationToken?: string | null;
  emailVerificationTokenExpiration?: Date | null;
  passwordResetToken?: string | null;
  passwordResetTokenExpiration?: Date | null;
  role: UserRole;
}


export interface ProfileToReturnDto {
  userProfile: UserProfileToReturnDto;
  businessProfile: BusinessProfileToReturnDto;
}