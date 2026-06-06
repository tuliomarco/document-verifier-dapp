import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

interface DocumentRecord {
  id: string;
  fileName: string;
  registeredDate: string;
  hash: string;
  ipfsUrl: string;
}

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './documents.html'
})
export class DocumentsComponent {
  @Output() onBackToHome = new EventEmitter<void>();

  // Estados de Visualização
  viewMode: 'grid' | 'list' = 'grid';
  currentPage = 1;
  itemsPerPageGrid = 8;
  itemsPerPageList = 6;

  // Array de documentos
  documents: DocumentRecord[] = [
    { id: '1', fileName: 'Diploma_Graduacao.pdf', registeredDate: '06 de Maio de 2026', hash: '0x71C7...f3f9A', ipfsUrl: 'https://ipfs.io/ipfs/QmX7Y8Z9...' },
    { id: '2', fileName: 'Certidao_Nascimento.pdf', registeredDate: '03 de Maio de 2026', hash: '0xA4B3...34567', ipfsUrl: 'https://ipfs.io/ipfs/QmA1B2C3...' },
    { id: '3', fileName: 'Contrato_Trabalho.pdf', registeredDate: '28 de Abril de 2026', hash: '0x9F8E...87654', ipfsUrl: 'https://ipfs.io/ipfs/QmD4E5F6...' },
    { id: '4', fileName: 'Certificado_Especializacao.pdf', registeredDate: '15 de Abril de 2026', hash: '0x1234...8ABCD', ipfsUrl: 'https://ipfs.io/ipfs/QmG7H8I9...' }
  ];

  // --- LÓGICA DE PAGINAÇÃO ---
  get itemsPerPage() {
    return this.viewMode === 'grid' ? this.itemsPerPageGrid : this.itemsPerPageList;
  }

  get totalPages() {
    return Math.ceil(this.documents.length / this.itemsPerPage);
  }

  get currentDocuments() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.documents.slice(startIndex, startIndex + this.itemsPerPage);
  }

  handlePageChange(page: number) {
    this.currentPage = page;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  handleViewModeChange(mode: 'grid' | 'list') {
    this.viewMode = mode;
    this.currentPage = 1;
  }
}