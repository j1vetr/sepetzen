interface TreeNode {
  id: string;
  parentId?: string | null;
  displayOrder?: number | null;
}

const byOrder = (a: TreeNode, b: TreeNode) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0);

/**
 * Kategorileri sınırsız derinlikte, üst kategorinin hemen ardından alt kategorileri
 * gelecek şekilde düz bir listeye çevirir. `depth` ana kategori için 0'dır.
 * Üst kategorisi listede olmayan kayıtlar ana seviye gibi gösterilir.
 */
export function flattenCategoryTree<T extends TreeNode>(list: T[]): (T & { depth: number; isChild: boolean })[] {
  const ids = new Set(list.map((c) => c.id));
  const childrenOf = new Map<string, T[]>();
  const roots: T[] = [];
  for (const c of list) {
    if (c.parentId && ids.has(c.parentId)) {
      childrenOf.set(c.parentId, [...(childrenOf.get(c.parentId) ?? []), c]);
    } else {
      roots.push(c);
    }
  }
  const out: (T & { depth: number; isChild: boolean })[] = [];
  const seen = new Set<string>();
  const walk = (nodes: T[], depth: number) => {
    for (const n of [...nodes].sort(byOrder)) {
      if (seen.has(n.id)) continue;
      seen.add(n.id);
      out.push({ ...n, depth, isChild: depth > 0 });
      walk(childrenOf.get(n.id) ?? [], depth + 1);
    }
  };
  walk(roots, 0);
  return out;
}

/** Bir kategorinin kendisi dahil tüm alt kategorilerinin kimlikleri. */
export function getDescendantIds(list: TreeNode[], id: string): string[] {
  const result = [id];
  for (let i = 0; i < result.length; i++) {
    for (const c of list) {
      if (c.parentId === result[i] && !result.includes(c.id)) result.push(c.id);
    }
  }
  return result;
}

/** Kökten başlayarak kategorinin üstündeki tüm kategoriler (kendisi hariç). */
export function getAncestors<T extends TreeNode>(list: T[], id: string | undefined): T[] {
  const chain: T[] = [];
  const seen = new Set<string>();
  let current = list.find((c) => c.id === id);
  while (current?.parentId && !seen.has(current.parentId)) {
    seen.add(current.parentId);
    const parent = list.find((c) => c.id === current!.parentId);
    if (!parent) break;
    chain.unshift(parent);
    current = parent;
  }
  return chain;
}
