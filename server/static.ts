import express, { type Express, type Request } from "express";
import fs from "fs";
import path from "path";
import { applyBrandSeo, getBrandSeo } from "./brandSeo";

function getRequestOrigin(req: Request): string {
  const forwardedProtocol = req.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProtocol === "http" || forwardedProtocol === "https"
    ? forwardedProtocol
    : req.protocol;
  return `${protocol}://${req.get("host") || "sepetzen.com"}`;
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Serve uploads from client/public/uploads (for production uploaded files)
  const uploadsPath = path.resolve(process.cwd(), "client/public/uploads");
  if (fs.existsSync(uploadsPath)) {
    // Branding dosyaları (logo, ETBİS vb.) sık güncellenebilir - tarayıcı her seferinde
    // sunucuyla kontrol etsin; ETag eşleşirse 304 döner, bant genişliği boşa gitmez.
    const brandingPath = path.resolve(uploadsPath, "branding");
    if (fs.existsSync(brandingPath)) {
      app.use("/uploads/branding", express.static(brandingPath, {
        maxAge: 0,
        etag: true,
        lastModified: true,
        setHeaders: (res) => {
          res.setHeader('Cache-Control', 'no-cache, must-revalidate');
        },
      }));
    }

    app.use("/uploads", express.static(uploadsPath, {
      maxAge: '7d',
      immutable: false,
      etag: true,
    }));
  }

  // Serve static assets with aggressive caching
  app.use(express.static(distPath, {
    maxAge: '1y',
    immutable: true,
    etag: true,
    index: false,
    setHeaders: (res, filePath) => {
      // HTML files should not be cached
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
      // JS and CSS files with hash can be cached forever
      else if (filePath.match(/\.(js|css)$/) && filePath.includes('.')) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
      // Images and fonts
      else if (filePath.match(/\.(png|jpg|jpeg|gif|webp|svg|ico|woff|woff2|ttf|eot)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=604800');
      }
    }
  }));

  // fall through to index.html if the file doesn't exist
  app.use("*", async (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    const indexPath = path.resolve(distPath, "index.html");
    const brandSeo = await getBrandSeo(req.originalUrl);
    if (brandSeo) {
      const template = await fs.promises.readFile(indexPath, "utf-8");
      return res.send(applyBrandSeo(template, brandSeo, getRequestOrigin(req)));
    }
    if (/^\/marka\/[^/?#]+/.test(req.originalUrl)) {
      res.status(404);
    }
    return res.sendFile(indexPath);
  });
}
