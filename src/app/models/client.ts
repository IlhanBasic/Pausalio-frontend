import { ClientType } from "../enums/client-type";

export interface AddClientDto {
  clientType?: ClientType;
  name: string;
  pib?: string | null;
  mb?: string;
  address?: string;
  city?: string;
  email?: string;
  phone?: string;
  countryId?: string;
}

export interface ClientToReturnDto {
  id: string;
  clientType: ClientType;
  name: string;
  pib?: string | null;
  mb?: string;
  address?: string;
  city?: string;
  email?: string;
  phone?: string;
  country?: string;
  countryId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

export interface UpdateClientDto {
  clientType?: ClientType;
  name: string;
  pib?: string | null;
  mb?: string;
  address?: string;
  city?: string;
  email?: string;
  phone?: string;
  countryId?: string;
  isActive?: boolean;
}