// ブラウザの localStorage への保存（この端末だけに残る）。
// プライベートブラウズなどで使えない環境でも画面が動くよう、失敗は無視する。

export const STORAGE_KEYS = {
  quickInput: "quick-diagnosis-input", // かんたん診断の回答
  property: "property-estimate", // 不動産の時価推定の入力と結果
} as const;

export function loadJSON<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function saveJSON(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 保存できない環境では何もしない
  }
}
