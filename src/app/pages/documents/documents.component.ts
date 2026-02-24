import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { DocumentService } from '../../services/document.service';
import { FileService } from '../../services/file.service';
import { DocumentToReturnDto, AddDocumentDto, UpdateDocumentDto } from '../../models/document';
import { DocumentType } from '../../enums/document-type';
import {
  DataTableComponent,
  TableAction,
  TableColumn,
} from '../../components/shared/data-table/data-table.component';

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DataTableComponent],
  templateUrl: './documents.component.html',
  styleUrl: './documents.component.css',
})
export class DocumentsComponent implements OnInit {
  documentService = inject(DocumentService);
  fileService = inject(FileService);
  fb = inject(FormBuilder);
  toastr = inject(ToastrService);

  documents = signal<DocumentToReturnDto[]>([]);
  editingDocument = signal<DocumentToReturnDto | null>(null);
  deletingDocument = signal<DocumentToReturnDto | null>(null);
  isLoading = signal(false);
  showModal = signal(false);
  showDeleteConfirm = signal(false);

  selectedFile = signal<File | null>(null);

  DocumentType = DocumentType;

  documentForm: FormGroup = this.fb.group({
    documentType: ['', Validators.required],
    documentNumber: ['', Validators.required],
    filePath: [''],
  });

  columns: TableColumn[] = [
    { key: 'documentTypeBadge', label: 'Tip dokumenta', type: 'badge', sortable: false },
    { key: 'documentNumber', label: 'Broj dokumenta', sortable: true },
    { key: 'filePath', label: 'Putanja', type: 'link', sortable: false },
    { key: 'uploadedAtDisplay', label: 'Datum uploada', sortable: true },
  ];

  actions: TableAction[] = [
    { label: 'Izmeni', icon: '✏️', type: 'edit' },
    { label: 'Obriši', icon: '🗑️', type: 'delete' },
  ];

  ngOnInit(): void {
    this.loadDocuments();
  }

  loadDocuments() {
    this.isLoading.set(true);
    this.documentService.getAll().subscribe({
      next: (docs) => {
        const transformed = docs.map((doc) => ({
          ...doc,
          documentTypeBadge: this.getDocumentTypeBadge(doc.documentType),
          uploadedAtDisplay: this.formatDate(doc.uploadedAt),
        }));
        this.documents.set(transformed);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.toastr.error(err.error?.message || 'Greška pri učitavanju dokumenata', 'Greška');
        this.isLoading.set(false);
      },
    });
  }

  openAddModal() {
    this.editingDocument.set(null);
    this.selectedFile.set(null);
    this.documentForm.reset({ documentType: '', documentNumber: '', filePath: '' });
    this.showModal.set(true);
  }

  openEditModal(document: DocumentToReturnDto) {
    this.editingDocument.set(document);
    this.selectedFile.set(null);
    this.documentForm.patchValue({
      documentType: document.documentType,
      documentNumber: document.documentNumber,
      filePath: document.filePath,
    });
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.selectedFile.set(null);
    this.documentForm.reset();
    this.editingDocument.set(null);
  }

  onFileSelect(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const maxSizeInBytes = 25 * 1024 * 1024;
    if (file.size > maxSizeInBytes) {
      this.toastr.error('Fajl ne sme biti veći od 25MB', 'Greška');
      event.target.value = '';
      return;
    }

    this.selectedFile.set(file);
  }

  onSubmit() {
    if (this.documentForm.invalid) {
      this.documentForm.markAllAsTouched();
      return;
    }

    const editing = this.editingDocument();
    const file = this.selectedFile();

    // Ako ima novi fajl, prvo ga upload-uj
    if (file) {
      this.isLoading.set(true);
      this.fileService.uploadFile(file).subscribe({
        next: (res) => {
          this.saveDocument(res.url || '', editing);
        },
        error: (err) => {
          this.toastr.error(err.error?.message || 'Greška pri upload-u fajla', 'Greška');
          this.isLoading.set(false);
        },
      });
    } else {
      // Nema novog fajla, koristi postojeću putanju
      this.saveDocument(this.documentForm.value.filePath || '', editing);
    }
  }

  private saveDocument(filePath: string, editing: DocumentToReturnDto | null) {
    const formValue = this.documentForm.value;

    if (editing) {
      const dto: UpdateDocumentDto = {
        documentType: Number(formValue.documentType),
        documentNumber: formValue.documentNumber,
        filePath: filePath,
      };
      this.documentService.update(editing.id, dto).subscribe({
        next: () => {
          this.toastr.success('Dokument uspešno ažuriran', 'Uspeh');
          this.loadDocuments();
          this.closeModal();
          this.isLoading.set(false);
        },
        error: (err) => {
          this.toastr.error(err.error?.message || 'Greška pri ažuriranju dokumenta', 'Greška');
          this.isLoading.set(false);
        },
      });
    } else {
      const dto: AddDocumentDto = {
        documentType: Number(formValue.documentType),
        documentNumber: formValue.documentNumber,
        filePath: filePath,
      };
      this.documentService.create(dto).subscribe({
        next: () => {
          this.toastr.success('Dokument uspešno dodat', 'Uspeh');
          this.loadDocuments();
          this.closeModal();
          this.isLoading.set(false);
        },
        error: (err) => {
          this.toastr.error(err.error?.message || 'Greška pri dodavanju dokumenta', 'Greška');
          this.isLoading.set(false);
        },
      });
    }
  }

  openDeleteConfirm(document: DocumentToReturnDto) {
    this.deletingDocument.set(document);
    this.showDeleteConfirm.set(true);
  }

  closeDeleteConfirm() {
    this.showDeleteConfirm.set(false);
    this.deletingDocument.set(null);
  }

  confirmDelete() {
    const document = this.deletingDocument();
    if (!document) return;

    this.documentService.delete(document.id).subscribe({
      next: () => {
        this.toastr.success('Dokument uspešno obrisan', 'Uspeh');
        this.loadDocuments();
        this.closeDeleteConfirm();
      },
      error: (err) => {
        this.toastr.error(err.error?.message || 'Greška pri brisanju dokumenta', 'Greška');
        this.closeDeleteConfirm();
      },
    });
  }

  getDocumentTypeBadge(type: DocumentType): string {
    switch (type) {
      case DocumentType.tax:
        return '<span class="badge badge-tax">Poreski</span>';
      case DocumentType.expense:
        return '<span class="badge badge-expense">Trošak</span>';
      case DocumentType.invoice:
        return '<span class="badge badge-invoice">Faktura</span>';
      case DocumentType.payment:
        return '<span class="badge badge-payment">Plaćanje</span>';
      case DocumentType.other:
        return '<span class="badge badge-other">Ostalo</span>';
      default:
        return '<span class="badge badge-other">Nepoznato</span>';
    }
  }

  getDocumentTypeName(type: DocumentType): string {
    switch (type) {
      case DocumentType.tax:
        return 'Poreski';
      case DocumentType.expense:
        return 'Trošak';
      case DocumentType.invoice:
        return 'Faktura';
      case DocumentType.payment:
        return 'Plaćanje';
      case DocumentType.other:
        return 'Ostalo';
      default:
        return 'Nepoznato';
    }
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('sr-Latn-RS', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}
