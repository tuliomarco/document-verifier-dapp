import { Injectable, NgZone } from '@angular/core';
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

  public isProcessing$ = new BehaviorSubject<boolean>(false);
  public isInitializing$ = new BehaviorSubject<boolean>(true);

  private isConnecting = false;

  constructor(private ngZone: NgZone) {
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
    this.isInitializing$.next(false);
  }

  private setupAccountsListener() {
    if (typeof window.ethereum !== 'undefined') {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        this.ngZone.run(() => {
          const oldAddress = this.userAddressSubject.value;
          
          if (accounts.length === 0) {
            this.disconnectWallet(true);
          } else {
            const newAddress = accounts[0];
            this.userAddressSubject.next(newAddress);
            
            if (!this.isConnecting && oldAddress && oldAddress.toLowerCase() !== newAddress.toLowerCase()) {
              toast.info('Conta da MetaMask alterada.');
            }
          }
        });
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
      toast.error('MetaMask não detectada!');
      return;
    }

    try {
      this.isConnecting = true;
      toast.loading('Conectando à MetaMask...', { id: 'wallet-connect', duration: 30000 });
      
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            
      toast.dismiss();
      this.isProcessing$.next(true);
      
      localStorage.removeItem('userDisconnected');
      this.userAddressSubject.next(accounts[0]);
      
      this.isProcessing$.next(false);
      
      setTimeout(() => {
        toast.success('Carteira conectada com sucesso!');
      }, 600);

    } catch (error: any) {
      toast.dismiss('wallet-connect');
      if (error.code === -32002) {
        toast.info('Já existe uma requisição pendente. Abra a extensão da MetaMask.');
      } else {
        toast.error('Conexão cancelada pelo usuário.');
      }
    } finally {
      this.isConnecting = false;
    }
  }

  disconnectWallet(isFromExtension: boolean = false) {
    toast.dismiss();
    this.isProcessing$.next(true);
    
    localStorage.setItem('userDisconnected', 'true');
    this.userAddressSubject.next(null);
    this.isProcessing$.next(true);
    
    this.isProcessing$.next(false);

    setTimeout(() => {
      if (isFromExtension) {
        toast.warning('Carteira desconectada pela extensão.');
      } else {
        toast.info('Sessão encerrada na interface. Para desconectar totalmente, acesse sua carteira.');
      }
    }, 600);
  }
}