import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { HeroComponent } from '../hero/hero';
import { MainCardComponent } from '../main-card/main-card';
import { FeaturesComponent } from '../features/features';
import { WalletService } from '../../services/wallet.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, HeroComponent, MainCardComponent, FeaturesComponent],
  templateUrl: './home.html',
})
export class HomeComponent implements OnInit, OnDestroy {
  userAddress: string | null = null;
  isInitializing = true;
  private subUser!: Subscription;
  private subInit!: Subscription;

  constructor(private walletService: WalletService) {}

  ngOnInit() {
    this.subUser = this.walletService.userAddress$.subscribe(address => {
      this.userAddress = address;
    });

    this.subInit = this.walletService.isInitializing$.subscribe(status => {
      this.isInitializing = status;
    });
  }

  ngOnDestroy() {
    if (this.subUser) this.subUser.unsubscribe();
    if (this.subInit) this.subInit.unsubscribe();
  }

  connect() {
    this.walletService.connectWallet();
  }
}