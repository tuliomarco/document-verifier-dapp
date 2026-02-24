import { Injectable } from '@angular/core';
import Web3 from 'web3';
import DocumentVerifier from '../artifacts/DocumentVerifier.json';

declare let window: any; 

@Injectable({
  providedIn: 'root'
})
export class Web3Service {
  private web3: any;
  private contract: any;
  private account: string = '';

  private contractAddress = '0x5FbDB2315678afecb367f032d93F642f64180aa3';

  constructor() {
    if(window.ethereum) {
      this.web3 = new Web3(window.ethereum);
    } else {
      console.error('MetaMask não encontrado! Por favor, instale a extensão.');
    }
  }

  async connectWallet(): Promise<string> {
    if(!this.web3) {
      console.warn('Web3 não iniciado. MetaMask está instalado?');
      return '';
    }

    try {
      const accounts = await window.ethereum.request({method: 'eth_requestAccounts'});

      this.account = accounts[0];
      console.log('Carteira conectada: ', this.account);
      return this.account;
    } catch (error) {
      console.error('O usuário cancelou a conexão ou deu erro: ', error);
      return '';
    }
  }

  getContract() {
    if(!this.contract) {
      this.contract = new this.web3.eth.Contract(DocumentVerifier.abi, this.contractAddress);
    }
    return this.contract;
  }

  async getContractBalance(): Promise<string> {
    if (!this.web3) return '0';

    try {
      const balanceWei = await this.web3.eth.getBalance(this.contractAddress);
      
      const balanceEth = this.web3.utils.fromWei(balanceWei, 'ether');
      
      return balanceEth;
    } catch (error) {
      console.error('Erro verificando saldo:', error);
      return '0';
    }
  }
}