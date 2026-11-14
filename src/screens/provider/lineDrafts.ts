import type { ShopWorkItem } from "../../api/dispatch";

export type LineDraft = {
  name: string;
  qty: string;
  unitPrice: string;
};

export function emptyLine(): LineDraft {
  return { name: "", qty: "1", unitPrice: "" };
}

export function draftsFromItems(
  items: ShopWorkItem[] | null | undefined,
): LineDraft[] {
  if (!items || items.length === 0) return [emptyLine()];
  return items.map((item) => ({
    name: item.name,
    qty: String(item.qty),
    unitPrice: String(item.unitPrice),
  }));
}

export function draftsTotal(drafts: LineDraft[]): number {
  return draftsToItems(drafts).reduce((sum, item) =>
    sum + item.qty * item.unitPrice, 0);
}

export function draftsToItems(drafts: LineDraft[]): ShopWorkItem[] {
  return drafts.flatMap((draft) => {
    const name = draft.name.trim();
    const qty = Number(draft.qty);
    const unitPrice = Number(draft.unitPrice);
    if (name === "" || !Number.isFinite(qty) || qty <= 0 ||
      !Number.isFinite(unitPrice) || unitPrice < 0) {
      return [];
    }
    return [{
      name,
      qty: Math.round(qty),
      unitPrice: Math.round(unitPrice),
    }];
  });
}
