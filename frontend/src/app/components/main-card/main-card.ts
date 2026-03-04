import { Component, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DropzoneComponent } from '../dropzone/dropzone'; // Importando seu dropzone novo!
import { toast } from 'ngx-sonner';

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

  constructor(private cdr: ChangeDetectorRef) {}

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

    this.isProcessing = true;
    
    try {
      // Simula o delay da rede
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const hash = await this.generateHash(this.file);
      const timestamp = new Date().toISOString();

      this.result = { hash, timestamp };
      
      if (this.activeTab === 'register') {
        toast.success('Documento registrado com sucesso na blockchain!', {
          description: `Hash: ${hash.slice(0, 10)}...`,
        });
      } else {
        toast.success('Documento verificado com sucesso!', {
           description: 'O documento é autêntico e não foi alterado.',
        });
      }
    } catch (error) {
      console.error(error);
      toast.error('Ocorreu um erro ao processar o documento.');
    } finally {
      this.isProcessing = false;
      this.cdr.detectChanges();
    }
  }
}