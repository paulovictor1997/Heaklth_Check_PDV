// Gera a chave de API de uma loja e grava o hash dela no banco.
//
// Uso:
//   npm run api-key -- 001            gera a chave da loja 001
//   npm run api-key -- 001 --force    gera uma chave nova, substituindo a atual
//
// A chave aparece UMA ÚNICA VEZ na tela. Ela não fica guardada em lugar nenhum
// (o banco só tem o hash), então copie e configure nas PDVs da loja.
// Perdeu a chave? Gere outra com --force; a anterior para de funcionar na hora.
import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";
import { generateApiKey, hashApiKey } from "../src/lib/apiKey.js";

const args = process.argv.slice(2);
const storeCode = args.find((arg) => !arg.startsWith("--"));
const force = args.includes("--force");

async function main() {
  if (!storeCode) {
    console.error("Informe o código da loja. Ex.: npm run api-key -- 001");
    process.exitCode = 1;
    return;
  }

  const store = await prisma.loja.findUnique({ where: { codigo: storeCode } });

  if (!store) {
    console.error(`Loja ${storeCode} não encontrada.`);
    process.exitCode = 1;
    return;
  }

  // Evita trocar sem querer a chave de uma loja que já está enviando dados.
  if (store.chaveApiHash && !force) {
    console.error(
      `A loja ${store.codigo} (${store.nome}) já tem uma chave.\n` +
        "Para substituir, rode de novo com --force. As PDVs dessa loja vão parar de enviar " +
        "até receberem a chave nova."
    );
    process.exitCode = 1;
    return;
  }

  const key = generateApiKey();

  await prisma.loja.update({
    where: { id: store.id },
    data: { chaveApiHash: hashApiKey(key) },
  });

  if (!store.ativa) {
    console.warn(`Atenção: a loja ${store.codigo} está inativa; a chave só vai funcionar quando ela for reativada.\n`);
  }

  console.log(`Chave de API da loja ${store.codigo} (${store.nome}):\n`);
  console.log(`  ${key}\n`);
  console.log("Guarde agora: ela não será exibida de novo.");
}

try {
  await main();
} catch (error) {
  console.error("Erro ao gerar a chave:", error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
