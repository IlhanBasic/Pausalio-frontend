// api-response.ts
export interface ApiResponse<T = null> {
  success: boolean;
  message: string;
  data?: T;
  count?: number;
  cached?: boolean;
}

export interface LoginResponse extends ApiResponse {
  token?: string;
}

export interface FileUploadResponse extends ApiResponse {
  url?: string;
}

export interface AcceptInviteResponse extends ApiResponse {
  businessName?: string;
  businessId?: string;
}

export interface SendInviteResponse extends ApiResponse {
  invitedUserExists?: boolean;
}