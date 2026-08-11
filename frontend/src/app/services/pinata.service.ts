import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PinataService {
  
  async uploadToIPFS(arquivo: File, fileName?: string, fileHash?: string, registeredDate?: string): Promise<string | null> {
    const formData = new FormData();
    formData.append('file', arquivo);
    
    if (fileName) formData.append('fileName', fileName);
    if (fileHash) formData.append('fileHash', fileHash);
    if (registeredDate) formData.append('registeredDate', registeredDate);

    try {
      const resposta = await fetch('/api/uploads', {
        method: 'POST',
        body: formData
      });

      if (!resposta.ok) {
        throw new Error(`Erro na API Local: ${resposta.statusText}`);
      }

      const dados = await resposta.json();
      return dados.tokenURI;

    } catch (erro) {
      console.error('Falha na comunicação com o backend:', erro);
      return null;
    }
  }

  async deleteFromIPFS(cid: string): Promise<boolean> {
    try {
      const resposta = await fetch(`/api/delete?cid=${cid}`, {
        method: 'DELETE'
      });

      if (!resposta.ok) {
        throw new Error(`Erro ao deletar via backend: ${resposta.statusText}`);
      }

      console.log(`Arquivo órfão (CID: ${cid}) deletado com sucesso.`);
      return true;

    } catch (erro) {
      console.error('Falha ao tentar limpar o arquivo no backend:', erro);
      return false;
    }
  }
}