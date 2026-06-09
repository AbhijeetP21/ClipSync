// Collapse a flat, ordered list of items into render groups: items that share a
// group_id render as one batch; everything else renders on its own. Order is
// preserved by first appearance.

export interface Groupable {
  id: string
  group_id?: string | null
}

export type RenderGroup<T extends Groupable> =
  | { kind: 'single'; key: string; item: T }
  | { kind: 'batch'; key: string; items: T[] }

export function groupItems<T extends Groupable>(items: T[]): RenderGroup<T>[] {
  const result: RenderGroup<T>[] = []
  const batches = new Map<string, T[]>()

  for (const item of items) {
    if (item.group_id) {
      const existing = batches.get(item.group_id)
      if (existing) {
        existing.push(item)
      } else {
        const arr = [item]
        batches.set(item.group_id, arr)
        result.push({ kind: 'batch', key: item.group_id, items: arr })
      }
    } else {
      result.push({ kind: 'single', key: item.id, item })
    }
  }

  // A "batch" of one is just a single item; render it normally.
  return result.map((g) =>
    g.kind === 'batch' && g.items.length === 1
      ? { kind: 'single', key: g.items[0].id, item: g.items[0] }
      : g
  )
}
