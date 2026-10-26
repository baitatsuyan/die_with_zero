"use client";

import { useEffect, useState } from "react";
import { sanitizeDigits } from "@/lib/numberText";

type Props = {
  id: string;
  value: number;
  onChange: (value: number) => void;
  className?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

/**
 * 数値を入れる欄。入力中は空欄にでき（すぐに0にはしない）、先頭の0や全角数字も整える。
 * 空欄のまま離れたときは、直前の値に戻す。
 */
export function NumberInput({ id, value, onChange, className, ...aria }: Props) {
  const [draft, setDraft] = useState(String(value));

  // 外から値が変わったとき（候補ボタン・前回の回答の復元など）は表示を合わせる
  useEffect(() => {
    setDraft((current) => (current !== "" && Number(current) === value ? current : String(value)));
  }, [value]);

  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={draft}
      onChange={(e) => {
        const next = sanitizeDigits(e.target.value);
        setDraft(next);
        if (next !== "") onChange(Number(next));
      }}
      onBlur={() => {
        if (draft === "") setDraft(String(value));
      }}
      className={className}
      {...aria}
    />
  );
}
