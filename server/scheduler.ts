/**
 * Pazaryeri senkron zamanlayıcısı.
 *
 *   - Saat başı (* 1 * * *) → her aktif pazaryeri için DELTA (fiyat + stok)
 *   - Her gün 03:00 → her aktif pazaryeri için FULL
 *
 * NODE_ENV=test ise zamanlayıcı başlatılmaz (CI'de istenmeyen ağ trafiği olmasın).
 * Geliştirme ortamında kısa interval'la test etmek için MARKETPLACE_DEV_CRON=1
 * ayarlandığında her 2 dakikada bir delta tetiklenir.
 */

import * as cron from "node-cron";
import { storage } from "./storage";
import { runSync } from "./marketplaces/sync/engine";
import { processPushQueue } from "./marketplaces/push/engine";

type ScheduledHandle = ReturnType<typeof cron.schedule>;
let scheduledTasks: ScheduledHandle[] = [];
let started = false;

async function tick(mode: "delta" | "full"): Promise<void> {
  try {
    const marketplaces = await storage.getMarketplaces();
    const active = marketplaces.filter((m) => m.isActive);
    if (active.length === 0) return;
    for (const mp of active) {
      try {
        console.log(`[scheduler] starting ${mode} sync for ${mp.name} (${mp.type})`);
        const run = await runSync(mp.id, mode, "cron");
        console.log(
          `[scheduler] ${mp.name} ${mode} → ${run.status} ` +
            `(added=${run.stats?.productsAdded ?? 0} updated=${run.stats?.productsUpdated ?? 0})`,
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        // "Bu pazaryeri için zaten çalışan bir senkron var" — sessizce geç
        if (/zaten çalışan/.test(msg)) {
          console.log(`[scheduler] skip ${mp.name} ${mode}: ${msg}`);
        } else {
          console.error(`[scheduler] ${mp.name} ${mode} failed:`, msg);
        }
      }
    }
  } catch (err) {
    console.error("[scheduler] tick error:", err);
  }
}

export function startScheduler(): void {
  if (started) return;
  if (process.env.NODE_ENV === "test") {
    console.log("[scheduler] NODE_ENV=test, scheduler disabled");
    return;
  }
  started = true;

  // Saat başı delta — minute 5'te (DB üzerindeki diğer cron'larla çakışmasın)
  scheduledTasks.push(
    cron.schedule("5 * * * *", () => {
      void tick("delta");
    }),
  );

  // Gece 03:00 full
  scheduledTasks.push(
    cron.schedule("0 3 * * *", () => {
      void tick("full");
    }),
  );

  // Push kuyruğu (site → pazaryeri) — her dakika işle. Kuyruk boşsa no-op,
  // ucuz. Trendyol stok/fiyat endpoint'i rate limitsiz.
  scheduledTasks.push(
    cron.schedule("* * * * *", () => {
      processPushQueue().catch((err) =>
        console.error("[scheduler] push queue error:", err instanceof Error ? err.message : err),
      );
    }),
  );

  // Geliştirme/test kolaylığı — her 2 dakikada bir delta
  if (process.env.MARKETPLACE_DEV_CRON === "1") {
    scheduledTasks.push(
      cron.schedule("*/2 * * * *", () => {
        void tick("delta");
      }),
    );
    console.log("[scheduler] MARKETPLACE_DEV_CRON=1 → 2-dakikada bir delta tetiklenecek");
  }

  console.log("[scheduler] marketplace cron jobs registered (delta hourly, full @ 03:00)");
}

export function stopScheduler(): void {
  for (const t of scheduledTasks) {
    try {
      t.stop();
    } catch {
      /* noop */
    }
  }
  scheduledTasks = [];
  started = false;
}
