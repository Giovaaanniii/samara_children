import CryptoJS from "crypto-js";

/**
 * Клиентское шифрование удобно для скрытия данных в канале/логах,
 * но не заменяет TLS и не подходит как единственная защита.
 */
const ENV_SECRET = import.meta.env.VITE_CRYPTO_SECRET_KEY?.trim();

function resolveSecret(secret?: string): string {
  const value = secret?.trim() || ENV_SECRET;
  if (!value) {
    throw new Error("Encryption secret is missing. Set VITE_CRYPTO_SECRET_KEY in root .env");
  }
  return value;
}

export function encryptText(plainText: string, secret?: string): string {
  const key = resolveSecret(secret);
  return CryptoJS.AES.encrypt(plainText, key).toString();
}

export function decryptText(cipherText: string, secret?: string): string {
  const key = resolveSecret(secret);
  const bytes = CryptoJS.AES.decrypt(cipherText, key);
  const plain = bytes.toString(CryptoJS.enc.Utf8);
  if (!plain) {
    throw new Error("Unable to decrypt payload. Check secret/key and input value.");
  }
  return plain;
}

export function encryptJson<T>(value: T, secret?: string): string {
  return encryptText(JSON.stringify(value), secret);
}

export function decryptJson<T>(cipherText: string, secret?: string): T {
  const plain = decryptText(cipherText, secret);
  return JSON.parse(plain) as T;
}

