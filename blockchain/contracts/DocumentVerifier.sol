// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// Importamos a mágica do OpenZeppelin para não ter que codificar o NFT do zero
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

// Agora nosso contrato É um NFT (ele herda tudo do ERC721)
contract DocumentVerifier is ERC721URIStorage {
    
    // Um contador para dar um ID único (1, 2, 3...) para cada NFT criado
    uint256 private _nextTokenId;

    // Mantemos a sua lógica genial de bloquear duplicados: Mapeamos se o hash já existe
    mapping(string => bool) public isHashRegistered;
    
    // Mapeamos o hash para o ID do NFT para facilitar a busca depois
    mapping(string => uint256) public hashToTokenId;

    // Damos um nome para a nossa "coleção" de NFTs
    constructor() ERC721("DocumentVerifierNFT", "DOCV") {}

    // Agora recebemos o Hash e o Link do IPFS
    function registerDocument(string memory _hash, string memory _ipfsURI) public returns (uint256) {
        // A mesma proteção que você já tinha:
        require(!isHashRegistered[_hash], "Erro: Documento ja registrado!");

        // Pega o ID atual (ex: 0) e depois soma +1 para o próximo
        uint256 tokenId = _nextTokenId++;
        
        // --- AQUI ACONTECE A MÁGICA DO NFT ---
        
        // 1. Cria o NFT e entrega na carteira de quem chamou a função (msg.sender)
        _safeMint(msg.sender, tokenId);
        
        // 2. Gruda o link do IPFS dentro do NFT (onde está o PDF e os dados)
        _setTokenURI(tokenId, _ipfsURI);

        // -------------------------------------

        // Marca que esse hash já foi usado para ninguém copiar
        isHashRegistered[_hash] = true;
        hashToTokenId[_hash] = tokenId;

        return tokenId;
    }

    // A sua função de verificação ficou ainda melhor!
    function verifyDocument(string memory _hash) public view returns (bool, address, string memory) {
        if (!isHashRegistered[_hash]) {
            return (false, address(0), "");
        }

        // Se existe, pegamos qual é o ID do NFT dele
        uint256 tokenId = hashToTokenId[_hash];
        
        // O OpenZeppelin já nos dá funções prontas para saber quem é o dono e o link!
        address owner = ownerOf(tokenId);
        string memory uri = tokenURI(tokenId);

        return (true, owner, uri);
    }
}