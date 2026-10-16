import { z } from "zod";

export const LIVE_STREAM_KEY = "live_stream";

export const liveStreamSchema = z.object({
  isActive: z.boolean().default(false),
  title: z.string().max(120).default("Canlı Yayın"),
  description: z.string().max(300).default(""),
  streamUrl: z.string().max(500).default(""),
  productIds: z.array(z.string()).max(300).default([]),
  startedAt: z.string().nullable().default(null),
});

export type LiveStream = z.infer<typeof liveStreamSchema>;

export const DEFAULT_LIVE_STREAM: LiveStream = {
  isActive: false,
  title: "Canlı Yayın",
  description: "",
  streamUrl: "",
  productIds: [],
  startedAt: null,
};

export function resolveLiveStream(raw: unknown): LiveStream {
  const parsed = liveStreamSchema.safeParse(raw ?? {});
  return parsed.success ? parsed.data : DEFAULT_LIVE_STREAM;
}
