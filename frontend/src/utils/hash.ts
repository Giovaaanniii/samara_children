import CryptoJS from "crypto-js";

/** Пример: контрольная сумма для клиентских операций (не для паролей на сервере). */
export function sha256Hex(value: string): string {
  return CryptoJS.SHA256(value).toString(CryptoJS.enc.Hex);
}
