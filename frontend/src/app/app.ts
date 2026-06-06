import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxSonnerToaster, toast } from 'ngx-sonner';
import { NavbarComponent } from './components/navbar/navbar';
import { HeroComponent } from './components/hero/hero';
import { FeaturesComponent } from './components/features/features';
import { FooterComponent } from './components/footer/footer';
import { MainCardComponent } from './components/main-card/main-card';
import { DocumentsComponent } from './components/documents/documents';

declare global {
  interface Window {
    ethereum: any;
  }
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    NgxSonnerToaster,
    NavbarComponent,
    HeroComponent,
    FeaturesComponent,
    FooterComponent,
    MainCardComponent,
    DocumentsComponent,
  ],
  templateUrl: './app.html',
  host: {
    class: 'min-h-screen flex flex-col bg-[#F8FAFC]',
  },
})
export class AppComponent implements OnInit {
  userAddress: string | null = null;

  // Tudo renomeado e amarrado certinho!
  currentView: 'home' | 'documents' = 'home';

  constructor(private cdr: ChangeDetectorRef) {}

  async ngOnInit() {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          this.userAddress = accounts[0];
          this.cdr.detectChanges();
          toast.success('Carteira conectada com sucesso!', {
            id: 'wallet-connect',
            duration: 4000,
          });
        }
      } catch (error) {
        console.error('Erro ao verificar conexão existente:', error);
      }

      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          if (this.userAddress !== null) {
            this.userAddress = null;
            this.currentView = 'home'; // Volta pra home se desconectar
            toast.warning('Carteira desconectada pelo usuário.');
          }
        } else {
          const newAddress = accounts[0];
          if (this.userAddress !== null && this.userAddress !== newAddress) {
            this.userAddress = newAddress;
            toast.info('Conta da MetaMask alterada.');
          } else if (this.userAddress === null) {
            this.userAddress = newAddress;
          }
        }
        this.cdr.detectChanges();
      });
    }
  }

  async connect() {
    if (this.userAddress) {
      navigator.clipboard.writeText(this.userAddress);
      toast.info('Endereço copiado para a área de transferência!');
      return;
    }

    if (typeof window.ethereum !== 'undefined') {
      try {
        toast.loading('Conectando à MetaMask...', { id: 'wallet-connect', duration: 1000 });

        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        this.userAddress = accounts[0];

        this.cdr.detectChanges();

        toast.success('Carteira conectada com sucesso!', { id: 'wallet-connect', duration: 4000 });
      } catch (error: any) {
        console.error('Erro de conexão:', error);
        if (error.code === -32002) {
          toast.warning('Aguardando conexão. Já existe um pedido aberto.', {
            id: 'wallet-connect',
            duration: 8000,
          });
        } else {
          toast.error('Conexão rejeitada.', { id: 'wallet-connect', duration: 4000 });
        }
      }
    } else {
      toast.error('MetaMask não detectada! Por favor, instale a extensão.');
    }
  }

  goToDocuments() {
    if (this.userAddress) {
      this.currentView = 'documents';
    } else {
      toast.warning('Conecte sua carteira primeiro para ver seus documentos.');
    }
  }

  goToHome() {
    this.currentView = 'home';
  }
}
