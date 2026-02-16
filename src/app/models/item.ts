import { ItemType } from "../enums/item-type";

export interface AddItemDto {
  name: string;
  description?: string | null;
  itemType?: ItemType;
  unitPrice: number;
}

export interface ItemToReturnDto {
  id: string;
  name: string;
  description?: string | null;
  itemType: ItemType;
  unitPrice: number;
}

export interface UpdateItemDto {
  name: string;
  description?: string | null;
  itemType?: ItemType;
  unitPrice: number;
}