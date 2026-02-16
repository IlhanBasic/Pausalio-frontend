import { ItemType } from "../enums/item-type";

export interface AddInvoiceItemDto {
  name: string;
  description?: string;
  itemType: ItemType;
  quantity: number;
  unitPrice: number;
}

export interface InvoiceItemToReturnDto {
  id: string;
  name: string;
  description?: string;
  itemType: ItemType;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface UpdateInvoiceItemDto {
  name: string;
  description?: string;
  itemType: ItemType;
  quantity: number;
  unitPrice: number;
}