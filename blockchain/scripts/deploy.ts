import { ethers } from "hardhat";

async function main() {
  console.log("Deploying DocumentVerifier...");

  const DocumentVerifier = await ethers.getContractFactory("DocumentVerifier");
  const verifier = await DocumentVerifier.deploy();

  await verifier.waitForDeployment();

  console.log(`Contrato implantado no endereço: ${await verifier.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});