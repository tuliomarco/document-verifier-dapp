import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { WalletService } from '../../services/wallet.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.html'
})
export class NavbarComponent implements OnInit, OnDestroy {
  walletAddress: string | null = null;
  isConnecting: boolean = false;
  private sub!: Subscription;

  constructor(private walletService: WalletService) {}

  ngOnInit() {
    this.sub = this.walletService.userAddress$.subscribe(address => {
      this.walletAddress = address;
      this.isConnecting = false;
    });
  }

  ngOnDestroy() {
    if (this.sub) this.sub.unsubscribe();
  }

  connect() {
    this.isConnecting = true;
    this.walletService.connectWallet().finally(() => {
      this.isConnecting = false;
    });
  }

  disconnectWallet() {
    this.walletService.disconnectWallet();
  }

  formatAddress(address: string): string {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }
}