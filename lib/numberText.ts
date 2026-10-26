/**
 * 数字入力欄の文字列を整える。全角数字を半角にし、数字以外（カンマなど）を取り除き、
 * 先頭の余分な0を落とす（「05」→「5」）。空欄は空欄のまま返す。
 */
export function sanitizeDigits(raw: string): string {
  const digits = raw.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/\D/g, "");
  return digits.replace(/^0+(?=\d)/, "");
}
