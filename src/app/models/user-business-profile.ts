import { UserBusinessRole } from "../enums/user-business-role";
import { BusinessProfileToReturnDto } from "./business-profile";
import { UserProfileToReturnDto } from "./user-profile";

export interface AddUserBusinessProfileDto {
  id: string;
  userId: string;
  businessProfileId: string;
  role: UserBusinessRole;
}

export interface UpdateUserBusinessProfileDto {
  role: UserBusinessRole;
}

export interface UserBusinessProfileToReturnDto {
  id: string;
  user: UserProfileToReturnDto;
  businessProfile: BusinessProfileToReturnDto;
  role: UserBusinessRole;
  createdAt: Date;
}