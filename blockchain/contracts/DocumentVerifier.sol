// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "hardhat/console.sol";

contract DocumentVerifier {
    struct Document {
        string docHash;
        uint256 timestamp;
        address issuer;
        bool isRegistered;
    }

    mapping(string => Document) public documents;
    
    function registerDocument(string memory _hash) public {
        require(!documents[_hash].isRegistered, "Erro: Documento ja registrado!");

        documents[_hash] = Document({
            docHash: _hash,
            timestamp: block.timestamp,
            issuer: msg.sender,
            isRegistered: true
        });

        console.log("Documento registrado! Hash: ", _hash);
    }

    function verifyDocument(string memory _hash) public view returns (bool, uint256, address) {
        Document memory doc = documents[_hash];
        return (doc.isRegistered, doc.timestamp, doc.issuer);
    }
}