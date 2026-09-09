import { type Express, type Request } from "express";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";
import { applyBrandSeo, getBrandSeo } from "./brandSeo";
import { getHeadInjection, injectIntoHead } from "./headInjection";

const viteLogger = createLogger();

function getRequestOrigin(req: Request): string {
  const forwardedProtocol = req.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProtocol === "http" || forwardedProtocol === "https"
    ? forwardedProtocol
    : req.protocol;
  return `${protocol}://${req.get("host") || "sepetzen.com"}`;
}

export async function setupVite(server: Server, app: Express) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server, path: "/vite-hmr" },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);

  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const [brandSeo, headInjection] = await Promise.all([
        getBrandSeo(url),
        getHeadInjection(),
      ]);
      if (brandSeo) {
        template = applyBrandSeo(template, brandSeo, getRequestOrigin(req));
      } else if (/^\/marka\/[^/?#]+/.test(url)) {
        res.status(404);
      }
      let page = await vite.transformIndexHtml(url, template);
      page = injectIntoHead(page, headInjection);
      res.set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}
