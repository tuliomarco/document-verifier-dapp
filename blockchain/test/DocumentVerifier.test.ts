import { expect } from "chai";
import { ethers } from "hardhat";
import { DocumentVerifier } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("DocumentVerifier", function () {
  let contract: DocumentVerifier;
  let owner: HardhatEthersSigner;
  let other: HardhatEthersSigner;
  let third: HardhatEthersSigner;

  beforeEach(async function () {
    [owner, other, third] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("DocumentVerifier");
    contract = await Factory.deploy();
    await contract.waitForDeployment();
  });

  describe("registerDocument", function () {
    it("registra um documento e atribui a posse ao remetente da transação", async function () {
      await (await contract.connect(owner).registerDocument("hash1", "ipfs://cid1")).wait();
      expect(await contract.ownerOf(0)).to.equal(owner.address);
    });

    it("emite DocumentRegistered com o tokenId, o hash e o proprietário corretos", async function () {
      await expect(contract.connect(owner).registerDocument("hash1", "ipfs://cid1"))
        .to.emit(contract, "DocumentRegistered")
        .withArgs(0, "hash1", owner.address);
    });

    it("marca isHashRegistered como true após o registro", async function () {
      await (await contract.connect(owner).registerDocument("hash1", "ipfs://cid1")).wait();
      expect(await contract.isHashRegistered("hash1")).to.equal(true);
    });

    it("associa corretamente hashToTokenId ao tokenId gerado", async function () {
      await (await contract.connect(owner).registerDocument("hash1", "ipfs://cid1")).wait();
      expect(await contract.hashToTokenId("hash1")).to.equal(0);
    });

    it("grava a tokenURI exatamente como fornecida", async function () {
      await (await contract.connect(owner).registerDocument("hash1", "ipfs://cid1")).wait();
      expect(await contract.tokenURI(0)).to.equal("ipfs://cid1");
    });

    it("reverte ao tentar registrar um hash já existente", async function () {
      await (await contract.connect(owner).registerDocument("hash1", "ipfs://cid1")).wait();
      await expect(
        contract.connect(other).registerDocument("hash1", "ipfs://cid2")
      ).to.be.revertedWith("Erro: Documento ja registrado!");
    });

    it("permite que usuários diferentes registrem documentos diferentes de forma independente", async function () {
      await (await contract.connect(owner).registerDocument("hash-owner", "ipfs://cid-owner")).wait();
      await (await contract.connect(other).registerDocument("hash-other", "ipfs://cid-other")).wait();

      expect(await contract.ownerOf(0)).to.equal(owner.address);
      expect(await contract.ownerOf(1)).to.equal(other.address);
    });

    it("incrementa o tokenId sequencialmente a cada novo registro", async function () {
      await (await contract.connect(owner).registerDocument("hash1", "ipfs://cid1")).wait();
      await (await contract.connect(owner).registerDocument("hash2", "ipfs://cid2")).wait();
      expect(await contract.hashToTokenId("hash1")).to.equal(0);
      expect(await contract.hashToTokenId("hash2")).to.equal(1);
    });
  });

  describe("verifyDocument", function () {
    it("retorna valores vazios para um hash nunca registrado", async function () {
      const [exists, docOwner, uri, revokeTime] = await contract.verifyDocument("inexistente");
      expect(exists).to.equal(false);
      expect(docOwner).to.equal(ethers.ZeroAddress);
      expect(uri).to.equal("");
      expect(revokeTime).to.equal(0);
    });

    it("retorna os dados corretos para um documento registrado e ativo", async function () {
      await (await contract.connect(owner).registerDocument("hash1", "ipfs://cid1")).wait();
      const [exists, docOwner, uri, revokeTime] = await contract.verifyDocument("hash1");
      expect(exists).to.equal(true);
      expect(docOwner).to.equal(owner.address);
      expect(uri).to.equal("ipfs://cid1");
      expect(revokeTime).to.equal(0);
    });

    it("retorna revokeTime maior que zero após a revogação", async function () {
      await (await contract.connect(owner).registerDocument("hash1", "ipfs://cid1")).wait();
      await (await contract.connect(owner).revokeDocument(0)).wait();
      const [, , , revokeTime] = await contract.verifyDocument("hash1");
      expect(revokeTime).to.be.greaterThan(0);
    });

    it("pode ser chamada por qualquer conta, não apenas pelo proprietário do documento", async function () {
      await (await contract.connect(owner).registerDocument("hash1", "ipfs://cid1")).wait();
      const [exists] = await contract.connect(third).verifyDocument("hash1");
      expect(exists).to.equal(true);
    });

    it("preserva a tokenURI e o proprietário após a revogação do documento", async function () {
      await (await contract.connect(owner).registerDocument("hash1", "ipfs://cid1")).wait();
      await (await contract.connect(owner).revokeDocument(0)).wait();
      
      const [exists, docOwner, uri, revokeTime] = await contract.verifyDocument("hash1");
      
      expect(exists).to.equal(true);
      expect(docOwner).to.equal(owner.address);
      expect(uri).to.equal("ipfs://cid1");
      expect(revokeTime).to.be.greaterThan(0);
    });
  });

  describe("revokeDocument", function () {
    it("permite que o proprietário revogue seu próprio documento", async function () {
      await (await contract.connect(owner).registerDocument("hash1", "ipfs://cid1")).wait();
      await (await contract.connect(owner).revokeDocument(0)).wait();
      expect(await contract.revokedAt(0)).to.be.greaterThan(0);
    });

    it("emite DocumentRevoked com o tokenId e o timestamp do bloco", async function () {
      await (await contract.connect(owner).registerDocument("hash1", "ipfs://cid1")).wait();
      await expect(contract.connect(owner).revokeDocument(0))
        .to.emit(contract, "DocumentRevoked")
        .withArgs(0, anyUint());
    });

    it("grava em revokedAt o timestamp exato do bloco da revogação", async function () {
      await (await contract.connect(owner).registerDocument("hash1", "ipfs://cid1")).wait();
      const receipt = await (await contract.connect(owner).revokeDocument(0)).wait();
      const bloco = await ethers.provider.getBlock(receipt!.blockNumber);
      expect(await contract.revokedAt(0)).to.equal(bloco!.timestamp);
    });

    it("reverte se alguém que não é o proprietário tentar revogar", async function () {
      await (await contract.connect(owner).registerDocument("hash1", "ipfs://cid1")).wait();
      await expect(
        contract.connect(other).revokeDocument(0)
      ).to.be.revertedWith("Acesso negado: apenas o dono pode revogar");
    });

    it("reverte ao tentar revogar um documento já revogado", async function () {
      await (await contract.connect(owner).registerDocument("hash1", "ipfs://cid1")).wait();
      await (await contract.connect(owner).revokeDocument(0)).wait();
      await expect(
        contract.connect(owner).revokeDocument(0)
      ).to.be.revertedWith("Documento ja esta revogado");
    });

    it("reverte ao tentar revogar um tokenId que nunca foi emitido", async function () {
      await expect(contract.connect(owner).revokeDocument(999))
        .to.be.revertedWithCustomError(contract, "ERC721NonexistentToken")
        .withArgs(999);
    });
  });

  describe("getUserDocuments e getUserDocumentsPaginated", function () {
    it("retorna um array vazio para um endereço sem documentos registrados", async function () {
      const docs = await contract.getUserDocuments(third.address);
      expect(docs.length).to.equal(0);
    });

    it("retorna todos os tokenIds de um usuário, na ordem de inserção", async function () {
      await (await contract.connect(owner).registerDocument("hash1", "ipfs://cid1")).wait();
      await (await contract.connect(owner).registerDocument("hash2", "ipfs://cid2")).wait();
      const docs = await contract.getUserDocuments(owner.address);
      expect(docs.map((d) => Number(d))).to.deep.equal([0, 1]);
    });

    it("retorna apenas o subconjunto solicitado dentro do intervalo", async function () {
      await (await contract.connect(owner).registerDocument("h1", "ipfs://1")).wait();
      await (await contract.connect(owner).registerDocument("h2", "ipfs://2")).wait();
      await (await contract.connect(owner).registerDocument("h3", "ipfs://3")).wait();

      const [tokenIds] = await contract.getUserDocumentsPaginated(owner.address, 1, 1);
      expect(tokenIds.map((t) => Number(t))).to.deep.equal([1]);
    });

    it("retorna arrays vazios quando o offset é maior ou igual ao total de documentos", async function () {
      await (await contract.connect(owner).registerDocument("h1", "ipfs://1")).wait();
      const [tokenIds, revokeTimes] = await contract.getUserDocumentsPaginated(owner.address, 5, 10);
      expect(tokenIds.length).to.equal(0);
      expect(revokeTimes.length).to.equal(0);
    });

    it("limita o retorno ao total disponível quando o limit excede os documentos restantes", async function () {
      await (await contract.connect(owner).registerDocument("h1", "ipfs://1")).wait();
      await (await contract.connect(owner).registerDocument("h2", "ipfs://2")).wait();
      await (await contract.connect(owner).registerDocument("h3", "ipfs://3")).wait();

      const [tokenIds] = await contract.getUserDocumentsPaginated(owner.address, 1, 10);
      expect(tokenIds.map((t) => Number(t))).to.deep.equal([1, 2]);
    });

    it("sincroniza revokeTimes com tokenIds por posição, refletindo quais estão revogados", async function () {
      await (await contract.connect(owner).registerDocument("h1", "ipfs://1")).wait();
      await (await contract.connect(owner).registerDocument("h2", "ipfs://2")).wait();
      await (await contract.connect(owner).revokeDocument(0)).wait();

      const [tokenIds, revokeTimes] = await contract.getUserDocumentsPaginated(owner.address, 0, 10);
      expect(Number(tokenIds[0])).to.equal(0);
      expect(revokeTimes[0]).to.be.greaterThan(0);
      expect(Number(tokenIds[1])).to.equal(1);
      expect(revokeTimes[1]).to.equal(0);
    });
  });
});

function anyUint() {
  return (value: bigint) => typeof value === "bigint" && value > 0n;
}