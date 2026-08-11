import { Component, Input, Output, EventEmitter, NgZone, ChangeDetectorRef, HostListener, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DropzoneComponent } from '../dropzone/dropzone'; 
import { toast } from 'ngx-sonner';
import { PinataService } from '../../services/pinata.service';
import { BlockchainService } from '../../services/blockchain.service';

type Tab = 'register' | 'verify';

interface VerificationResult {
  hash: string;
  owner?: string;
  ipfsUri?: string;
  timestamp?: string; 
  isRevoked?: boolean;     
  revokedDate?: string; 
}

@Component({
  selector: 'app-main-card',
  standalone: true,
  imports: [CommonModule, DropzoneComponent],
  templateUrl: './main-card.html',
  host: {
    'class': 'block w-full max-w-4xl mx-auto relative z-10'
  }
})
export class MainCardComponent implements OnChanges {
  @Input() walletAddress: string | null = null;
  @Output() onConnect = new EventEmitter<void>();
  @Output() processingStatus = new EventEmitter<boolean>();

  private delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  constructor(
    private ngZone: NgZone, 
    private cdr: ChangeDetectorRef,
    private pinataService: PinataService,
    private blockchainService: BlockchainService,
  ) {}

  activeTab: Tab = 'verify';
  file: File | null = null;
  isProcessing = false;
  result: VerificationResult | null = null;
  private txTimeout: any;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['walletAddress']) {
      const newAddress = changes['walletAddress'].currentValue;
      
      if (!newAddress && this.activeTab === 'register') {
        this.activeTab = 'verify';
        this.result = null;
      }
    }
  }

  @HostListener('window:beforeunload', ['$event'])
  unloadNotification($event: any) {
    if (this.isProcessing) {
      $event.returnValue = true; 
    }
  }

  switchTab(tab: Tab) {
    if (this.isProcessing) {
      toast.warning('Aguarde a transação atual finalizar para trocar de aba.');
      return; 
    }
    this.activeTab = tab;
    this.result = null;
  }

  handleFileAccepted(acceptedFile: File) {
    this.file = acceptedFile;
    this.result = null;
  }

  async generateHash(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async handleAction() {
    if (!this.file) {
      toast.error('Por favor, selecione um documento primeiro.');
      return;
    }

    this.isProcessing = true;
    this.processingStatus.emit(true);
    let ipfsCid: string | null = null;
    
    try {
      const hash = await this.generateHash(this.file!);

      if (this.activeTab === 'register') {
        if (!this.walletAddress) {
          toast.error('Conecte sua carteira para registrar o documento.');
          this.onConnect.emit();
          this.isProcessing = false;
          return;
        }

        if (!(window as any).ethereum) {
          toast.error('Carteira Web3 não detectada no navegador.');
          this.isProcessing = false;
          return;
        }
        
        toast.loading('Processando metadados e enviando para o IPFS...', { id: 'ipfs-toast' });
        
        const formattedDate = new Date().toLocaleDateString('pt-BR');

        const tokenUriJson = await this.pinataService.uploadToIPFS(
          this.file!, 
          this.file!.name, 
          hash, 
          formattedDate
        ); 
        
        toast.dismiss('ipfs-toast');

        if (!tokenUriJson) {
          toast.error('Falha no upload para a nuvem. Transação cancelada.');
          this.isProcessing = false;
          return;
        }

        const ipfsUri = tokenUriJson.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');

        toast.loading('Confirme ou cancele a transação na sua carteira MetaMask para proceder.', { 
          id: 'tx-toast', 
          duration: Infinity 
        });
        
        this.txTimeout = setTimeout(() => {
          if (this.isProcessing) {
            toast.dismiss('tx-toast');
            toast.warning('Aprovação pendente. Verifique a extensão da MetaMask.', { 
              duration: 8000, 
              position: 'bottom-right' 
            });
          }
        }, 30000);

        const tx = await this.blockchainService.registerDocument(hash, ipfsUri); 
        
        clearTimeout(this.txTimeout); 
        toast.dismiss('tx-toast');    
        
        toast.loading('Transação enviada! Aguardando confirmação da rede...', { id: 'tx-mining', duration: Infinity });
        
        await tx.wait(); 

        await this.delay(1000);
        
        toast.dismiss('tx-mining');

        this.ngZone.run(() => {
          this.result = { 
            hash,
            owner: this.walletAddress!,
            timestamp: new Date().toISOString(), 
            ipfsUri: ipfsUri 
          };
          toast.success('Documento registrado com sucesso!', {
            description: 'O arquivo foi criptografado e salvo de forma imutável.',
          });
        });

      } else {      
        const [isRegistered, owner, uri, revokeTimestamp] = await this.blockchainService.verifyDocument(hash);

        this.ngZone.run(() => {
          if (isRegistered) {
            const revokeTimeNum = Number(revokeTimestamp);
            const isRevoked = revokeTimeNum > 0;
            let revokedDateStr = '';
            
            if (isRevoked) {
              const date = new Date(revokeTimeNum * 1000);
              revokedDateStr = date.toLocaleDateString('pt-BR');
            }

            this.result = { 
              hash, 
              owner: owner,
              ipfsUri: uri,
              timestamp: new Date().toISOString(),
              isRevoked: isRevoked,
              revokedDate: revokedDateStr
            };
            
            if (isRevoked) {
              toast.error('Documento Revogado!', {
                description: `Este documento foi emitido por ${owner.slice(0,6)}...${owner.slice(-4)}, mas foi revogado em ${revokedDateStr}.`
              });
            } else {
              toast.success('Documento íntegro e autêntico!', {
                 description: `Emitido pela carteira: ${owner.slice(0,6)}...${owner.slice(-4)}`,
              });
            }

          } else {
            toast.error('Documento não encontrado.', {
              description: 'Este arquivo pode ter sido alterado ou nunca foi registrado.'
            });
            this.result = null;
          }
        });
      }
    } catch (error: any) {
      console.error(error);
      
      clearTimeout(this.txTimeout);
      toast.dismiss('tx-toast');
      toast.dismiss('tx-mining');
      
      if (ipfsCid) {
        console.log('Transação falhou. Iniciando remoção no Pinata...');
        toast.loading('Revertendo envio do arquivo...', { id: 'rollback-toast' });
        await this.pinataService.deleteFromIPFS(ipfsCid);
        toast.dismiss('rollback-toast');
      }

      this.ngZone.run(() => {
        toast.dismiss('tx-toast');
        toast.dismiss('ipfs-toast');
        
        if (error.code === 'ACTION_REJECTED') {
          toast.error('Transação cancelada na carteira.');
        } else if (error.message && error.message.includes('Documento ja registrado')) {
          toast.warning('Aviso: Este documento já está registrado!');
        } else {
          toast.error('Erro de comunicação com a blockchain.');
        }
      });
    } finally {
      this.ngZone.run(() => {
        this.isProcessing = false;
        this.processingStatus.emit(false);
        this.cdr.detectChanges();
      });
    }
  }
}