import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { toast } from 'ngx-sonner';

declare global {
  interface Window {
    ethereum: any;
  }
}

@Injectable({
  providedIn: 'root'
})
export class WalletService {
  private userAddressSubject = new BehaviorSubject<string | null>(null);
  public userAddress$ = this.userAddressSubject.asObservable();

  constructor() {
    this.checkInitialConnection();
    this.setupAccountsListener();
  }

  private async checkInitialConnection() {
    if (typeof window.ethereum !== 'undefined' && localStorage.getItem('userDisconnected') !== 'true') {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          this.userAddressSubject.next(accounts[0]);
        }
      } catch (error) {
        console.error('Erro ao verificar conexão existente:', error);
      }
    }
  }

  private setupAccountsListener() {
    if (typeof window.ethereum !== 'undefined') {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          this.userAddressSubject.next(null);
          toast.warning('Carteira desconectada pelo usuário.');
        } else {
          this.userAddressSubject.next(accounts[0]);
          toast.info('Conta da MetaMask alterada.');
        }
      });
    }
  }

  async connectWallet() {
    const currentAddress = this.userAddressSubject.value;
    
    if (currentAddress) {
      navigator.clipboard.writeText(currentAddress);
      toast.info('Endereço copiado para a área de transferência!');
      return;
    }

    if (typeof window.ethereum === 'undefined') {
      toast.error('MetaMask não detectada! Por favor, instale a extensão.');
      return;
    }

    try {
      toast.loading('Conectando à MetaMask...', { id: 'wallet-connect', duration: 30000 });
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      localStorage.removeItem('userDisconnected');
      this.userAddressSubject.next(accounts[0]);
      
      toast.dismiss('wallet-connect');
      toast.success('Carteira conectada com sucesso!');
    } catch (error: any) {
      toast.dismiss('wallet-connect');
      if (error.code === -32002) {
        toast.info('Já existe uma requisição pendente. Abra a extensão da MetaMask.');
      } else {
        toast.error('Conexão cancelada pelo usuário.');
      }
    }
  }

  disconnectWallet() {
    this.userAddressSubject.next(null);
    localStorage.setItem('userDisconnected', 'true');
    toast.info('Sessão encerrada na interface. Para desconectar totalmente, acesse sua carteira.');
  }
}