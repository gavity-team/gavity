/** 随机码字符集：去除易混淆的 I/L/O/U，共 32 个字符（整除 256，无取模偏差）。 */
const CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** 生成指定长度的随机码（用于入会码、用户 ID 等）。 */
export function generateCode(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
}
