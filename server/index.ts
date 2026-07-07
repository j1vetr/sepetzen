import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);

app.set('trust proxy', 1);
app.use(compression());
app.use(cookieParser());

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Eager olarak pazaryeri şifreleme anahtarını doğrula. Production'da
  // MARKETPLACE_ENCRYPTION_KEY yoksa burada throw eder ve sunucu açılmaz.
  try {
    const { assertEncryptionKeyConfigured } = await import("./marketplaces/crypto");
    assertEncryptionKeyConfigured();
  } catch (err) {
    console.error("[index] FATAL — marketplace encryption key check failed:", err);
    throw err;
  }

  const { maintenanceMiddleware } = await import("./maintenance");
  app.use(maintenanceMiddleware());

  await registerRoutes(httpServer, app);

  // WhatsApp şablonları: önceki varsayılanları yeni şablonlara yükselt
  // (admin tarafından özelleştirilenler korunur)
  try {
    const { upgradeOldDefaultTemplates } = await import("./whatsappService");
    await upgradeOldDefaultTemplates();
  } catch (err) {
    console.error("[index] WhatsApp default-template upgrade failed:", err);
  }

  // Pazaryeri senkron zamanlayıcısı (Trendyol delta saatlik / full 03:00)
  try {
    const { startScheduler } = await import("./scheduler");
    startScheduler();
  } catch (err) {
    console.error("[index] failed to start marketplace scheduler:", err);
  }

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
