export interface AddBusinessProfileDto {
  businessName: string;
  PIB: string;
  MB?: string;
  activityCodeId: string;
  city?: string;
  address: string;
  email: string;
  phone?: string;
  website?: string;
  companyLogo?: string;
}

export interface UpdateBusinessProfileDto {
  businessName: string;
  PIB: string;
  MB?: string;
  activityCodeId: string;
  city?: string;
  address: string;
  email: string;
  phone?: string;
  website?: string;
  companyLogo?: string;
}

export interface BusinessProfileToReturnDto {
  id: string;
  businessName: string;
  pib: string;
  mb?: string;
  activityCode?: string;
  city?: string;
  address: string;
  email: string;
  phone?: string;
  website?: string;
  companyLogo?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt?: Date;
}