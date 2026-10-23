"use client";

import { useState } from "react";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";

type KnowledgeBaseRow = { id: string; name: string; createdAt: Date };

const DUMMY_KBS: KnowledgeBaseRow[] = [
  { id: "1", name: "Refund Policy Docs", createdAt: new Date() },
  { id: "2", name: "Product FAQ", createdAt: new Date() },
  { id: "3", name: "Shipping Guide", createdAt: new Date() },
  { id: "4", name: "Billing Help", createdAt: new Date() },
];

export default function ComboboxDemoPage() {
  const [selected, setSelected] = useState<KnowledgeBaseRow[]>([]);

  return (
    <div className="max-w-md mx-auto mt-20 p-4">
      <h1 className="mb-4 text-lg font-semibold">Combobox Debug</h1>

      <p className="mb-2 text-sm text-muted-foreground">
        Selected: {selected.map((s) => s.name).join(", ") || "none"}
      </p>

      <Combobox
        items={DUMMY_KBS}
        multiple
        value={selected}
        onValueChange={(values: KnowledgeBaseRow[]) => {
          console.log("onValueChange fired:", values);
          setSelected(values);
        }}
        isItemEqualToValue={(item: KnowledgeBaseRow, value: KnowledgeBaseRow) =>
          item.id === value.id
        }
      >
        <ComboboxInput placeholder="Select knowledge bases..." />
        <ComboboxContent>
          <ComboboxEmpty>No items found.</ComboboxEmpty>
          <ComboboxList>
            {(item: KnowledgeBaseRow) => (
              <ComboboxItem key={item.id} value={item}>
                {item.name}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  );
}
