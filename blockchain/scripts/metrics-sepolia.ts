import { ethers } from "hardhat";
import { randomBytes } from "crypto";
import * as fs from "fs";

const CONTRACT_ADDRESS = "0xBb2b84a593c4DAD8eE81f769655A0e8cfaE093fd";
const RUNS = 10;

type Linha = {
  rodada: number;
  operacao: "register" | "verify" | "revoke";
  gas: number | null;
  gasPriceGwei: number | null;
  tempoS: number;
  tx: string | null;
  bloco: number | null;
};

// Gera dados com tamanhos realistas (Hash de 64 caracteres e CID típico do IPFS)
const hashRealista = () => "0x" + randomBytes(32).toString("hex");               
const uriRealista = () => "ipfs://Qm" + randomBytes(22).toString("hex");  

function resumo(v: number[]) {
  const n = v.length;
  const media = v.reduce((a, b) => a + b, 0) / n;
  const dp = n > 1 ? Math.sqrt(v.reduce((a, b) => a + (b - media) ** 2, 0) / (n - 1)) : 0;
  return { n, media, min: Math.min(...v), max: Math.max(...v), dp };
}

async function main() {
  if (!ethers.isAddress(CONTRACT_ADDRESS)) {
    throw new Error("Endereço do contrato inválido. Verifique a variável CONTRACT_ADDRESS.");
  }

  const [signer] = await ethers.getSigners();
  const contract = await ethers.getContractAt("DocumentVerifier", CONTRACT_ADDRESS, signer);
  const rede = await ethers.provider.getNetwork();

  console.log(`\nRede: ${rede.name} | Contrato: ${CONTRACT_ADDRESS} | Carteira: ${signer.address}`);

  // Aquecimento: a primeira escrita num contrato/carteira novos custa mais.
  console.log("\nAquecimento (fora das estatísticas)...");
  await (await contract.registerDocument(hashRealista(), uriRealista())).wait();
  console.log("Aquecimento concluído!");

  const linhas: Linha[] = [];

  for (let i = 1; i <= RUNS; i++) {
    console.log(`\n=== RODADA ${i} DE ${RUNS} ===`);
    const hash = hashRealista();
    const uri = uriRealista();

    try {
      // 1. Registro (escrita)
      let t0 = Date.now();
      const txReg = await contract.registerDocument(hash, uri);
      const recReg = await txReg.wait();
      if (!recReg) throw new Error("registerDocument sem recibo");
      const tReg = (Date.now() - t0) / 1000;
      
      linhas.push({
        rodada: i, operacao: "register", gas: Number(recReg.gasUsed),
        gasPriceGwei: Number(ethers.formatUnits(recReg.gasPrice, "gwei")),
        tempoS: tReg, tx: txReg.hash, bloco: recReg.blockNumber,
      });
      console.log(`  \x1b[32m✔\x1b[0m register: ${tReg.toFixed(2)} s | gas ${recReg.gasUsed}`);

      // 2. Consulta (leitura)
      t0 = Date.now();
      await contract.verifyDocument(hash);
      const tVer = (Date.now() - t0) / 1000;
      
      linhas.push({ rodada: i, operacao: "verify", gas: null, gasPriceGwei: null, tempoS: tVer, tx: null, bloco: null });
      console.log(`  \x1b[32m✔\x1b[0m verify:   ${tVer.toFixed(2)} s`);

      // 3. Revogação (escrita)
      const tokenId = await contract.hashToTokenId(hash);
      t0 = Date.now();
      const txRev = await contract.revokeDocument(tokenId);
      const recRev = await txRev.wait();
      if (!recRev) throw new Error("revokeDocument sem recibo");
      const tRev = (Date.now() - t0) / 1000;
      
      linhas.push({
        rodada: i, operacao: "revoke", gas: Number(recRev.gasUsed),
        gasPriceGwei: Number(ethers.formatUnits(recRev.gasPrice, "gwei")),
        tempoS: tRev, tx: txRev.hash, bloco: recRev.blockNumber,
      });
      console.log(`  \x1b[32m✔\x1b[0m revoke:   ${tRev.toFixed(2)} s | gas ${recRev.gasUsed}`);
    } catch (erro) {
      console.error(`  \x1b[31m✖ Falha na rodada ${i}:\x1b[0m`, erro);
    }
  }

  if (linhas.length === 0) throw new Error("Nenhuma rodada foi concluída.");

  const tabela = (["register", "verify", "revoke"] as const).map((op) => {
    const ls = linhas.filter((l) => l.operacao === op);
    const t = resumo(ls.map((l) => l.tempoS));
    const g = op === "verify" ? null : resumo(ls.map((l) => l.gas as number));
    return {
      Operacao: op,
      Amostras: t.n,
      "Gas Médio": g ? Math.round(g.media) : "0 (view)",
      "Gas Min/Max": g ? `${g.min} / ${g.max}` : "-",
      "Tempo Médio (s)": t.media.toFixed(2),
      "Min (s)": t.min.toFixed(2),
      "Max (s)": t.max.toFixed(2),
      "Desvio Padrão (s)": t.dp.toFixed(2),
    };
  });

  console.log("\n=== RESUMO (MÉTRICAS SEPOLIA) ===");
  console.table(tabela);

  const meta = {
    rede: rede.name, chainId: Number(rede.chainId), contrato: CONTRACT_ADDRESS,
    carteira: signer.address, data: new Date().toISOString(), rodadas: RUNS,
  };
  
  fs.writeFileSync("metrics-sepolia-results.json", JSON.stringify({ meta, resumo: tabela, linhas }, null, 2));

  const csv = [
    "rodada,operacao,gas,gas_price_gwei,tempo_s,tx,bloco",
    ...linhas.map((l) =>
      [l.rodada, l.operacao, l.gas ?? "", l.gasPriceGwei ?? "", l.tempoS.toFixed(2), l.tx ?? "", l.bloco ?? ""].join(",")
    ),
  ].join("\n");
  
  fs.writeFileSync("metrics-sepolia-results.csv", csv);
  console.log("\nArquivos 'metrics-sepolia-results.json' e 'metrics-sepolia-results.csv' gerados com sucesso!");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});