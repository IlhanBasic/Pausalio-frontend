import { DocumentType } from "../enums/document-type";

export interface AddDocumentDto {
  documentType: DocumentType;
  documentNumber: string;
  filePath: string;
}

export interface DocumentToReturnDto {
  id: string;
  documentType: DocumentType;
  documentNumber: string;
  filePath: string;
  uploadedAt: Date;
}

export interface UpdateDocumentDto {
  documentType: DocumentType;
  documentNumber: string;
  filePath: string;
}