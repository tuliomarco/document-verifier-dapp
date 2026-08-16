import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';
import { NgxSonnerToaster, toast } from 'ngx-sonner';
import { NavbarComponent } from './components/navbar/navbar';
import { FooterComponent } from './components/footer/footer';
import { WalletService } from './services/wallet.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule, 
    NgxSonnerToaster,
    NavbarComponent,
    FooterComponent
  ],
  templateUrl: './app.html',
  host: {
    class: 'min-h-screen flex flex-col bg-[#F8FAFC]',
  },
})
export class AppComponent implements OnInit {
  isGlobalLoading = false;

  constructor(
    private router: Router,
    private walletService: WalletService,
    private cdr: ChangeDetectorRef 
  ) {}

  ngOnInit() {
    // 1. MÁSCARA DO PRIMEIRO CARREGAMENTO (Evita o piscar da tela inicial)
    this.walletService.isInitializing$.subscribe(isInit => {
      if (isInit) {
        this.isGlobalLoading = true;
        this.cdr.detectChanges();
      } else {
        setTimeout(() => { 
          this.isGlobalLoading = false; 
          this.cdr.detectChanges();
        }, 800);
      }
    });

    // 2. ESCUTA AS TRANSIÇÕES DE PÁGINA
    this.router.events.subscribe((event: any) => {
      // O Angular considera a entrada no site como o evento de ID 1. Ignoramos para não bugar a máscara acima.
      if (event.id === 1) return; 

      if (event instanceof NavigationStart) {
        toast.dismiss();
        this.isGlobalLoading = true;
        this.cdr.detectChanges(); 
      }
      
      if (event instanceof NavigationEnd || event instanceof NavigationCancel || event instanceof NavigationError) {
        setTimeout(() => { 
          this.isGlobalLoading = false; 
          this.cdr.detectChanges(); 
        }, 600);
      }
    });

    // 3. ESCUTA A CARTEIRA CONECTANDO/DESCONECTANDO
    this.walletService.isProcessing$.subscribe(status => {
      if (status) {
        this.isGlobalLoading = true;
        this.cdr.detectChanges();
      } else {
        setTimeout(() => { 
          this.isGlobalLoading = false; 
          this.cdr.detectChanges();
        }, 600);
      }
    });
  }
}