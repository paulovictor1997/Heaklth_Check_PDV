// Funções da chave de API das lojas (uma chave por loja).
//
// A chave em texto puro só existe em dois lugares: na tela, no momento em que é gerada,
// e no script das PDVs. No banco fica apenas o hash SHA-256 — se o banco vazar,
// ninguém consegue enviar dados se passando por uma loja.
//
// SHA-256 simples é suficiente aqui porque a chave é aleatória e longa (32 bytes).
// Algoritmos lentos como bcrypt existem para senhas criadas por pessoas, que são fáceis
// de adivinhar; uma chave aleatória desse tamanho não dá para descobrir por tentativa.
import { createHash, randomBytes } from "node:crypto";

// Prefixo para reconhecer a chave de cara (em um log ou arquivo de configuração, por exemplo)
const KEY_PREFIX = "hcpdv_";

// Ex.: "hcpdv_Q3x9...". 32 bytes aleatórios em base64url (só letras, números, "-" e "_").
export function generateApiKey() {
  return KEY_PREFIX + randomBytes(32).toString("base64url");
}

// Hash em hexadecimal: sempre 64 caracteres, o tamanho da coluna chave_api_hash.
export function hashApiKey(key) {
  return createHash("sha256").update(key).digest("hex");
}
