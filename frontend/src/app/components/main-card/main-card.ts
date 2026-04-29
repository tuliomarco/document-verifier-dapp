import { Component, Input, Output, EventEmitter, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DropzoneComponent } from '../dropzone/dropzone'; 
import { toast } from 'ngx-sonner';
import { BrowserProvider, Contract } from 'ethers';

import DocumentVerifierArtifact from '../../artifacts/DocumentVerifier.json';

const CONTRACT_ABI = DocumentVerifierArtifact.abi;
const CONTRACT_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';

type Tab = 'register' | 'verify';

@Component({
  selector: 'app-main-card',
  standalone: true,
  imports: [CommonModule, DropzoneComponent],
  templateUrl: './main-card.html',
  host: {
    'class': 'block w-full max-w-4xl mx-auto relative z-10'
  }
})
export class MainCardComponent {
  @Input() walletAddress: string | null = null;
  @Output() onConnect = new EventEmitter<void>();

  constructor(private ngZone: NgZone, private cdr: ChangeDetectorRef) {}

  activeTab: Tab = 'register';
  file: File | null = null;
  isProcessing = false;
  result: { hash: string; timestamp: string } | null = null;

  switchTab(tab: Tab) {
    this.activeTab = tab;
    this.file = null;
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
    if (!this.walletAddress) {
      toast.error('Por favor, conecte sua carteira primeiro.');
      this.onConnect.emit();
      return;
    }

    if (!this.file) {
      toast.error('Por favor, selecione um documento.');
      return;
    }

    // Verifica se a MetaMask (ou outra carteira) está instalada
    if (!(window as any).ethereum) {
      toast.error('Carteira Web3 não detectada no navegador.');
      return;
    }

    this.isProcessing = true;
    
    try {
      // 1. Gera o Hash localmente no navegador (Rápido e sem custo)
      const hash = await this.generateHash(this.file);

      // 2. Conecta ao provedor da MetaMask e prepara o Contrato
      const provider = new BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer) as any;

      if (this.activeTab === 'register') {
        
        // REGISTRAR: Pede assinatura na MetaMask e manda para a blockchain
        const tx = await contract.registerDocument(hash);
        
        toast.loading('Confirmando transação na rede...', { id: 'tx-toast' });
        
        // Aguarda a confirmação do bloco
        await tx.wait();
        
        toast.dismiss('tx-toast');

        // Atualiza a tela (NgZone garante que o Angular perceba a mudança)
        this.ngZone.run(() => {
          this.result = { 
            hash, 
            timestamp: new Date().toISOString() 
          };
          toast.success('Documento registrado com sucesso na blockchain!', {
            description: `Hash: ${hash.slice(0, 10)}...`,
          });
        });

      } else {
        
        // VERIFICAR: Lê da blockchain (Gratuito, não abre MetaMask)
        const [isRegistered, blockTimestamp, issuer] = await contract.verifyDocument(hash);

        this.ngZone.run(() => {
          if (isRegistered) {
            // Converte o tempo do bloco da rede para data normal
            const date = new Date(Number(blockTimestamp) * 1000).toISOString();
            this.result = { hash, timestamp: date };
            
            toast.success('Documento verificado e autêntico!', {
               description: `Emitido pela carteira: ${issuer.slice(0,6)}...${issuer.slice(-4)}`,
            });
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
      this.ngZone.run(() => {
        toast.dismiss('tx-toast');
        
        // Tratamento de erros comuns
        if (error.code === 'ACTION_REJECTED') {
          toast.error('Transação cancelada na carteira.');
        } else if (error.message && error.message.includes('Documento ja registrado')) {
          toast.warning('Atenção: Este documento já possui registro na rede!');
        } else {
          toast.error('Ocorreu um erro de comunicação com a rede blockchain.');
        }
      });
    } finally {
      this.ngZone.run(() => {
        this.isProcessing = false;
        this.cdr.detectChanges();
      });
    }
  }
}