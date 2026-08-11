import { Injectable } from '@angular/core';
import { BrowserProvider, Contract, JsonRpcProvider } from 'ethers';
import DocumentVerifierArtifact from '../artifacts/DocumentVerifier.json';
import { environment } from '../../environments/environment.development';

declare global {
  interface Window {
    ethereum: any;
  }
}

@Injectable({
  providedIn: 'root'
})
export class BlockchainService {
  private contractAddress = environment.contractAddress;
  private abi = DocumentVerifierArtifact.abi;

  private async getContract(requiresSigner = false, isPublic = false): Promise<Contract> {
    if (isPublic) {
      const publicProvider = new JsonRpcProvider(environment.rpcUrl);
      return new Contract(this.contractAddress, this.abi, publicProvider);
    }
    
    const provider = new BrowserProvider(window.ethereum);
    if (requiresSigner) {
      const signer = await provider.getSigner();
      return new Contract(this.contractAddress, this.abi, signer);
    }
    return new Contract(this.contractAddress, this.abi, provider);
  }

  async getPaginatedDocuments(walletAddress: string, offset: number, limit: number) {
    const contract = await this.getContract();
    return await contract['getUserDocumentsPaginated'](walletAddress, offset, limit);
  }

  async revokeDocument(tokenId: string) {
    const contract = await this.getContract(true);
    return await contract['revokeDocument'](tokenId);
  }

  async getTokenURI(tokenId: string) {
    const contract = await this.getContract();
    return await contract['tokenURI'](tokenId);
  }

  async getUserDocumentCount(walletAddress: string): Promise<number> {
    const contract = await this.getContract();
    const balance = await contract['balanceOf'](walletAddress);
    return Number(balance);
  }

  async registerDocument(hash: string, ipfsUri: string) {
    const contract = await this.getContract(true);
    return await contract['registerDocument'](hash, ipfsUri);
  }

  async verifyDocument(hash: string) {
    const contract = await this.getContract(false, true);
    return await contract['verifyDocument'](hash);
  }
}