import { z } from "zod";

export const LIVE_STREAM_KEY = "live_stream";

export const liveStreamSchema = z.object({
  isActive: z.boolean().default(false),
  title: z.string().max(120).default("Canlı Yayın"),
  description: z.string().max(300).default(""),
  streamUrl: z.string().max(500).default(""),
  productIds: z.array(z.string()).max(300).default([]),
  // Listedeki ürünlerden sitede gerçekten yayında olanlar. Listede olup burada olmayan ürün taslaktır.
  // Alan yoksa (eski kayıtlar) listedeki tüm ürünler yayında sayılır.
  liveProductIds: z.array(z.string()).max(300).optional(),
  startedAt: z.string().nullable().default(null),
});

export type LiveStream = z.infer<typeof liveStreamSchema>;

export const DEFAULT_LIVE_STREAM: LiveStream = {
  isActive: false,
  title: "Canlı Yayın",
  description: "",
  streamUrl: "",
  productIds: [],
  liveProductIds: [],
  startedAt: null,
};

export function resolveLiveStream(raw: unknown): LiveStream {
  const parsed = liveStreamSchema.safeParse(raw ?? {});
  if (!parsed.success) return DEFAULT_LIVE_STREAM;
  const d = parsed.data;
  const live = d.liveProductIds === undefined
    ? d.productIds
    : d.liveProductIds.filter((id) => d.productIds.includes(id));
  return { ...d, liveProductIds: live };
}
