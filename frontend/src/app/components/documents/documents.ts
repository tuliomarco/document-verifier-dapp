import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toast } from 'ngx-sonner';
import { Subscription } from 'rxjs';
import { BlockchainService } from '../../services/blockchain.service';
import { WalletService } from '../../services/wallet.service';
import { Router, RouterModule } from '@angular/router';

export interface DocumentRecord {
  id: string;
  fileName: string;
  registeredDate: string;
  hash: string;
  ipfsUrl: string;
  isRevoked: boolean;     
  revokedDate?: string; 
}

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './documents.html',
  styleUrl: './documents.css'
})
export class DocumentsComponent implements OnInit, OnDestroy {
  walletAddress: string | null = null;
  documents: DocumentRecord[] = [];
  
  currentPage: number = 1;
  itemsPerPage: number = 8;
  totalPages: number = 1;
  totalDocuments: number = 0;
  
  isLoading: boolean = false;
  isProcessing: boolean = false;
  ipfsError: boolean = false;

  viewMode: 'grid' | 'list' = 'grid';
  isRevokeModalOpen: boolean = false;
  documentIdToRevoke: string | null = null;

  private sub!: Subscription;
  private delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  constructor(
    private blockchainService: BlockchainService,
    private walletService: WalletService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit() {
    this.sub = this.walletService.userAddress$.subscribe(address => {
      this.walletAddress = address;
      
      if (this.walletAddress) {
        const savedViewMode = localStorage.getItem('docsViewMode') as 'grid' | 'list';
        const savedPage = sessionStorage.getItem('docsCurrentPage');
        if (savedPage) {
          this.currentPage = Number(savedPage);
        }
        if (savedViewMode) {
          this.viewMode = savedViewMode;
        }
        this.fetchUserDocuments(this.walletAddress, this.currentPage);
      } else {
        const isStillInitializing = (this.walletService as any).isInitializing$?.value;
        
        if (!isStillInitializing) {
          this.documents = [];
          this.router.navigate(['/']);
        }
      }
    });
  }

  ngOnDestroy() {
    if (this.sub) this.sub.unsubscribe();
  }

  async fetchUserDocuments(walletAddress: string, page: number = this.currentPage) {
    try {
      this.isLoading = true;
      this.ipfsError = false;
      
      this.totalDocuments = await this.blockchainService.getUserDocumentCount(walletAddress);
      this.totalPages = Math.ceil(this.totalDocuments / this.itemsPerPage) || 1;
      
      const offset = (page - 1) * this.itemsPerPage;
      const [tokenIds, revokeTimes] = await this.blockchainService.getPaginatedDocuments(walletAddress, offset, this.itemsPerPage);
      
      const fetchedDocuments: DocumentRecord[] = [];

      for (let i = 0; i < tokenIds.length; i++) {
        const tokenId = tokenIds[i].toString();
        const revokeTimestamp = Number(revokeTimes[i]); 
        
        const uri = await this.blockchainService.getTokenURI(tokenId);
        
        const dedicatedGateway = 'https://bronze-imperial-lizard-952.mypinata.cloud/ipfs/';

        const formattedUri = uri.startsWith('ipfs://') 
          ? uri.replace('ipfs://', dedicatedGateway)
          : uri.replace('https://gateway.pinata.cloud/ipfs/', dedicatedGateway);

        const ipfsResponse = await fetch(formattedUri);
        if (!ipfsResponse.ok) throw new Error('Falha na resposta da rede IPFS');
        const ipfsData = await ipfsResponse.json();
        
        const isRevoked = revokeTimestamp > 0;
        let revokedDateStr = '';
        
        if (isRevoked) {
          const date = new Date(revokeTimestamp * 1000);
          revokedDateStr = date.toLocaleDateString('pt-BR');
        }

        let finalFileUrl = uri; 
        if (ipfsData.documentUrl) {
          finalFileUrl = ipfsData.documentUrl.startsWith('ipfs://') 
            ? ipfsData.documentUrl.replace('ipfs://', dedicatedGateway) 
            : ipfsData.documentUrl;
        }

        fetchedDocuments.push({
          id: tokenId,
          fileName: ipfsData.name,
          registeredDate: ipfsData.date,
          hash: ipfsData.hash,
          ipfsUrl: finalFileUrl,
          isRevoked: isRevoked,
          revokedDate: revokedDateStr
        });
      }

      this.documents = fetchedDocuments;
    } catch (error) {
      console.error('Erro ao buscar documentos:', error);
      
      this.ipfsError = true; 
      toast.error('Atraso na rede IPFS ou falha de conexão.');
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  async revokeDocumentTransaction(tokenId: string) {
    this.isProcessing = true; 
    try {
      const tx = await this.blockchainService.revokeDocument(tokenId);
      await tx.wait();
      await this.delay(1000);
      
      await this.fetchUserDocuments(this.walletAddress!, this.currentPage);

      this.isProcessing = false;
      this.cdr.detectChanges();

      toast.success('Documento revogado com sucesso!', {
        description: 'A invalidação foi registrada de forma imutável na blockchain.',
      });
    } catch (error: any) {
      console.error('Erro na revogação:', error);
      if (error.code === 'ACTION_REJECTED' || error.code === 4001) {
        toast.error('Transação cancelada na carteira.');
      } else {
        toast.error('Falha ao comunicar com a blockchain.');
      }
    } finally {
      this.isProcessing = false;
      this.cdr.detectChanges();
    }
  }

  // --- FUNÇÕES DA INTERFACE (Visuais) ---

  openRevokeModal(id: string) {
    this.documentIdToRevoke = id;
    this.isRevokeModalOpen = true;
  }

  closeRevokeModal() {
    this.isRevokeModalOpen = false;
    this.documentIdToRevoke = null;
  }

  confirmRevoke() {
    if (this.documentIdToRevoke) {
      this.revokeDocumentTransaction(this.documentIdToRevoke);
      this.closeRevokeModal();
    }
  }

  handlePageChange(page: number) {
    this.currentPage = page;
    sessionStorage.setItem('docsCurrentPage', this.currentPage.toString());
    this.fetchUserDocuments(this.walletAddress!, this.currentPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  handleViewModeChange(mode: 'grid' | 'list') {
    this.viewMode = mode;
    localStorage.setItem('docsViewMode', mode);
  }

  copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Hash copiado!');
    });
  }
}