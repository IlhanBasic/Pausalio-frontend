export interface AcceptInviteDto {
  inviteToken: string;
}
export interface AddBusinessInviteDto {
  email: string;
}

export interface BusinessInviteToReturnDto {
  id: string;
  email: string;
  expiresAt: Date;
  isUsed: boolean;
  token: string;
  createdAt: Date;
  businessProfileId: string;
  createdById: string;
  createdBy?: string;
  businessName?: string;
}

export interface UpdateBusinessInviteDto {
  isUsed?: boolean;
}
