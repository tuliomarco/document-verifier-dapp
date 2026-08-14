// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

/**
 * @title DocumentVerifier
 * @dev Contrato para registro e verificacao de documentos na blockchain usando o padrao ERC-721.
 */
contract DocumentVerifier is ERC721URIStorage {
    // Mapeia o Token ID ao timestamp de revogacao (0 indica que esta ativo)
    mapping(uint256 => uint256) public revokedAt;

    // Emitido no registro de um novo documento
    event DocumentRegistered(uint256 indexed tokenId, string hash, address indexed owner);

    // Emitido quando a validade de um documento e revogada
    event DocumentRevoked(uint256 indexed tokenId, uint256 timestamp);
    
    // Contador interno para gerenciar os IDs unicos dos tokens
    uint256 private _nextTokenId;

    // Controle de estado para evitar duplicidade de registro para o mesmo hash
    mapping(string => bool) public isHashRegistered;
    
    // Retorna o Token ID associado a um hash especifico
    mapping(string => uint256) public hashToTokenId;

    // Mapeia o endereco de uma carteira para a lista de documentos registrados por ela
    mapping(address => uint256[]) private _userDocuments;

    constructor() ERC721("DocumentVerifierNFT", "DOCV") {}

    /**
     * @dev Registra um novo documento de forma unica na rede.
     * @param _hash Hash criptografico do documento (ex: SHA-256).
     * @param _ipfsURI URI do IPFS contendo os metadados JSON do documento.
     */
    function registerDocument(string memory _hash, string memory _ipfsURI) external returns (uint256) {
        require(!isHashRegistered[_hash], "Erro: Documento ja registrado!");

        uint256 tokenId = _nextTokenId++;
        
        isHashRegistered[_hash] = true;
        hashToTokenId[_hash] = tokenId;
        _userDocuments[msg.sender].push(tokenId);

        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, _ipfsURI);

        emit DocumentRegistered(tokenId, _hash, msg.sender);

        return tokenId;
    }

    /**
     * @dev Consulta a autenticidade e o status atual de um documento pelo seu hash.
     */
    function verifyDocument(string memory _hash) external view returns (bool, address, string memory, uint256) {
        if (!isHashRegistered[_hash]) {
            return (false, address(0), "", 0);
        }

        uint256 tokenId = hashToTokenId[_hash];
        
        address docOwner = ownerOf(tokenId);
        string memory uri = tokenURI(tokenId);
        uint256 revokeTime = revokedAt[tokenId]; 

        return (true, docOwner, uri, revokeTime);
    }

    /**
     * @dev Invalida um documento. Apenas o proprietario atual do token pode realizar esta acao.
     */
    function revokeDocument(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, "Acesso negado: apenas o dono pode revogar");
        require(revokedAt[tokenId] == 0, "Documento ja esta revogado");

        revokedAt[tokenId] = block.timestamp;
        
        emit DocumentRevoked(tokenId, block.timestamp);
    }

    /**
     * @dev Retorna todos os IDs de documentos vinculados a um usuario.
     */
    function getUserDocuments(address _user) external view returns (uint256[] memory) {
        return _userDocuments[_user];
    }

    /**
     * @dev Retorna os documentos de um usuario de forma paginada para otimizacao de leitura.
     * Retorna os arrays de IDs e de timestamps de revogacao sincronizados.
     */
    function getUserDocumentsPaginated(address user, uint256 offset, uint256 limit) 
        external 
        view 
        returns (uint256[] memory tokenIds, uint256[] memory revokeTimes) 
    {
        uint256[] memory userDocs = _userDocuments[user];
        uint256 totalDocs = userDocs.length;
        
        if (offset >= totalDocs) {
            return (new uint256[](0), new uint256[](0));
        }
        
        uint256 end = offset + limit;
        if (end > totalDocs) {
            end = totalDocs;
        }
        
        uint256 size = end - offset;
        
        tokenIds = new uint256[](size);
        revokeTimes = new uint256[](size);
        
        for (uint256 i = 0; i < size; i++) {
            uint256 tokenId = userDocs[offset + i];
            
            tokenIds[i] = tokenId;
            revokeTimes[i] = revokedAt[tokenId];
        }
        
        return (tokenIds, revokeTimes);
    }
}