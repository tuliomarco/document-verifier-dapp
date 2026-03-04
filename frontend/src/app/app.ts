import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxSonnerToaster, toast } from 'ngx-sonner';
import { NavbarComponent } from './components/navbar/navbar';
import { HeroComponent } from './components/hero/hero';
import { FeaturesComponent } from './components/features/features';
import { FooterComponent } from './components/footer/footer';
import { MainCardComponent } from './components/main-card/main-card';

declare global {
  interface Window {
    ethereum: any;
  }
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, NgxSonnerToaster, NavbarComponent, HeroComponent, FeaturesComponent, FooterComponent, MainCardComponent],
  templateUrl: './app.html',
  host: {
    'class': 'min-h-screen flex flex-col bg-[#F8FAFC]'
  }
})
export class AppComponent implements OnInit {
  userAddress: string | null = null; 

  constructor(private cdr: ChangeDetectorRef) {}

  // O Espião: Roda uma vez quando o site abre
  async ngOnInit() {
    if (typeof window.ethereum !== 'undefined') {
      
      // 1. A Checagem Silenciosa ao recarregar a página (Refresh)
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          // Já estava conectado! Restaura o estado automaticamente sem pop-up.
          this.userAddress = accounts[0];
          this.cdr.detectChanges();
          toast.success('Carteira conectada com sucesso!', { id: 'wallet-connect', duration: 4000 });
        }
      } catch (error) {
        console.error("Erro ao verificar conexão existente:", error);
      }

      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          if (this.userAddress !== null) {
            this.userAddress = null;
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
        console.error("Erro de conexão:", error);
        if (error.code === -32002) {
          toast.warning('Já existe um pedido aberto.', { id: 'wallet-connect', duration: 8000 });
        } else {
          toast.error('Conexão rejeitada.', { id: 'wallet-connect', duration: 4000 });
        }
      }
    } else {
      toast.error("MetaMask não detectada! Por favor, instale a extensão.");
    }
  }
}