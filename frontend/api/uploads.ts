export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método não permitido' }), { 
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const formData = await req.formData();

    const file = formData.get('file');
    const fileName = formData.get('fileName');
    const fileHash = formData.get('fileHash');
    const registeredDate = formData.get('registeredDate');

    if (!file) {
      throw new Error('Arquivo principal não encontrado na requisição.');
    }

    // --- UPLOAD DO ARQUIVO FÍSICO (PDF) ---
    const fileFormData = new FormData();
    fileFormData.append('file', file);

    const pinFileResponse = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env['PINATA_JWT']}`
      },
      body: fileFormData
    });

    const fileData = await pinFileResponse.json();

    if (!pinFileResponse.ok) {
      throw new Error(fileData.error?.details || 'Erro ao fixar o arquivo no Pinata.');
    }
    const documentIpfsUri = `ipfs://${fileData.IpfsHash}`;

    const metadataPayload = {
      pinataContent: {
        name: fileName || 'Documento Desconhecido',
        hash: fileHash || '',
        date: registeredDate || new Date().toISOString(),
        documentUrl: documentIpfsUri
      },
      pinataMetadata: {
        name: `${fileName}-metadata.json`
      }
    };

    const pinJsonResponse = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env['PINATA_JWT']}`
      },
      body: JSON.stringify(metadataPayload)
    });

    const jsonData = await pinJsonResponse.json();

    if (!pinJsonResponse.ok) {
      throw new Error(jsonData.error?.details || 'Erro ao fixar o JSON de metadados no Pinata.');
    }

    return new Response(JSON.stringify({ 
      success: true, 
      tokenURI: `ipfs://${jsonData.IpfsHash}` 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Erro na Edge Function:', error);
    return new Response(JSON.stringify({ error: error.message || 'Falha no upload' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}