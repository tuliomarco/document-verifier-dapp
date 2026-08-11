// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract DocumentVerifier is ERC721URIStorage {
    // Mapeamento que liga o ID do Documento (Token ID) ao momento de sua revogação.
    // Se o valor for 0, o documento está ativo e autêntico.
    mapping(uint256 => uint256) public revokedAt;

    // Evento para ficar registrado no log da blockchain
    event DocumentRevoked(uint256 indexed tokenId, uint256 timestamp);
    
    // Contador para gerenciar os IDs únicos dos tokens
    uint256 private _nextTokenId;

    // Controle para evitar múltiplos registros do mesmo documento
    mapping(string => bool) public isHashRegistered;
    
    // Associação do hash do documento ao seu respectivo Token ID
    mapping(string => uint256) public hashToTokenId;

    // Relacionamento entre a carteira e os Token IDs emitidos por ela
    mapping(address => uint256[]) private _userDocuments;

    // Inicializa a coleção de NFTs
    constructor() ERC721("DocumentVerifierNFT", "DOCV") {}

    // Registra um novo documento na blockchain
    function registerDocument(string memory _hash, string memory _ipfsURI) public returns (uint256) {
        require(!isHashRegistered[_hash], "Erro: Documento ja registrado!");

        uint256 tokenId = _nextTokenId++;
        
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, _ipfsURI);

        isHashRegistered[_hash] = true;
        hashToTokenId[_hash] = tokenId;
        _userDocuments[msg.sender].push(tokenId);

        return tokenId;
    }

    // Verifica a autenticidade e recupera os dados de um documento (incluindo revogação)
    function verifyDocument(string memory _hash) public view returns (bool, address, string memory, uint256) {
        if (!isHashRegistered[_hash]) {
            // Retorna false, endereço vazio, string vazia e timestamp 0
            return (false, address(0), "", 0);
        }

        uint256 tokenId = hashToTokenId[_hash];
        
        address docOwner = ownerOf(tokenId);
        string memory uri = tokenURI(tokenId);
        uint256 revokeTime = revokedAt[tokenId]; // Pega o status de revogação

        return (true, docOwner, uri, revokeTime);
    }

    /**
     * @dev Revoga a autenticidade de um documento registrado.
     * Apenas o dono daquele token (documento) pode revogá-lo.
     */
    function revokeDocument(uint256 tokenId) external {
        // Verifica se quem está chamando a função é realmente o dono do documento
        require(ownerOf(tokenId) == msg.sender, "Nao autorizado: apenas o dono pode revogar");
        
        // Verifica se já não foi revogado antes
        require(revokedAt[tokenId] == 0, "Documento ja esta revogado");

        // block.timestamp pega a hora exata do bloco atual na rede
        revokedAt[tokenId] = block.timestamp;
        
        emit DocumentRevoked(tokenId, block.timestamp);
    }

    // Retorna todos os documentos registrados por um endereço
    function getUserDocuments(address _user) public view returns (uint256[] memory) {
        return _userDocuments[_user];
    }

    /**
     * @dev Retorna os documentos de um usuario de forma paginada.
     * Retorna dois arrays: os IDs dos documentos e os timestamps de revogacao.
     */
    function getUserDocumentsPaginated(address user, uint256 offset, uint256 limit) 
        external 
        view 
        returns (uint256[] memory tokenIds, uint256[] memory revokeTimes) 
    {
        // Pega o array completo de documentos daquele usuario
        uint256[] memory userDocs = _userDocuments[user];
        uint256 totalDocs = userDocs.length;
        
        // Se o offset pedido ja for maior que o total que a carteira tem, retorna arrays vazios
        if (offset >= totalDocs) {
            return (new uint256[](0), new uint256[](0));
        }
        
        // Calcula onde terminar a busca
        uint256 end = offset + limit;
        if (end > totalDocs) {
            end = totalDocs;
        }
        
        uint256 size = end - offset;
        
        // Instancia os arrays que vao ser retornados para o Front-end
        tokenIds = new uint256[](size);
        revokeTimes = new uint256[](size);
        
        for (uint256 i = 0; i < size; i++) {
            // Busca o Token ID direto do seu mapeamento, sem precisar do Enumerable!
            uint256 tokenId = userDocs[offset + i];
            
            tokenIds[i] = tokenId;
            revokeTimes[i] = revokedAt[tokenId];
        }
        
        return (tokenIds, revokeTimes);
    }
}