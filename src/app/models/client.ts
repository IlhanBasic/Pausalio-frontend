import { ClientType } from "../enums/client-type";
import { InvoiceToReturnDto } from "./invoice";

export interface AddClientDto {
  clientType?: ClientType;
  name: string;
  PIB?: string | null;
  MB?: string;
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
  PIB?: string | null;
  MB?: string;
  address?: string;
  city?: string;
  email?: string;
  phone?: string;
  country?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

export interface UpdateClientDto {
  clientType?: ClientType;
  name: string;
  PIB?: string | null;
  MB?: string;
  address?: string;
  city?: string;
  email?: string;
  phone?: string;
  countryId?: string;
  isActive?: boolean;
}