import { Component, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { Web3Service } from './services/web3.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class AppComponent {
  title = 'VerificaChain';
  userAddress: string = '';
  contractBalance: string = '';

  // Injetamos o NgZone
  constructor(private web3Service: Web3Service, private ngZone: NgZone) {}

  async connect() {
    console.log('🔌 Conectando...'); 
    const address = await this.web3Service.connectWallet();
    
    // NgZone garante que a tela atualize na mesma hora
    this.ngZone.run(() => {
      this.userAddress = address;
    });
  }

  async checkBalance() {
    console.log('💰 Verificando saldo...');
    const balance = await this.web3Service.getContractBalance();
    
    this.ngZone.run(() => {
      this.contractBalance = balance;
      
      if (this.contractBalance) {
         alert('Saldo atualizado: ' + this.contractBalance + ' ETH'); 
      }
    });
  }
}