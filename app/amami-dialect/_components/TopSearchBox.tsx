"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AMAMI_DIALECT_PATH } from "@/app/lib/amamiDialect";
import { DialectSearchBox } from "@/app/amami-dialect/_components/DialectSearchBox";

export function TopSearchBox() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  return (
    <DialectSearchBox
      value={query}
      onChange={setQuery}
      onSubmit={(value) => {
        const trimmed = value.trim();
        const qs = trimmed ? `?q=${encodeURIComponent(trimmed)}` : "";
        router.push(`${AMAMI_DIALECT_PATH}/search${qs}`);
      }}
      id="dialect-top-search-input"
      label="標準語・方言・島名から検索"
      placeholder="例：喜界島 おはよう／父／いぬ"
    />
  );
}
