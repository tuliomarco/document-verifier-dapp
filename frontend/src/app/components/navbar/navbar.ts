import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './navbar.html'
})
export class NavbarComponent {
  // @Input() recebe a variável do componente pai (AppComponent)
  @Input() walletAddress: string | null = null;
  
  // @Output() avisa o componente pai que o botão foi clicado
  @Output() onConnect = new EventEmitter<void>();

  // Função para formatar o endereço (ex: 0x1234...abcd)
  formatAddress(address: string): string {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }
}