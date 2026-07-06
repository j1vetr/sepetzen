import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage, db } from "./storage";
import { z } from "zod";
import bcrypt from "bcrypt";
import crypto from "crypto";
import multer from "multer";
import path from "path";
import fs from "fs";
import PDFDocument from "pdfkit";
import sharp from "sharp";
import { cache, CACHE_KEYS, CACHE_TTL } from "./cache";
import { eq, desc, sql } from "drizzle-orm";
import { insertAdminUserSchema, insertCategorySchema, insertProductSchema, insertProductVariantSchema, insertCartItemSchema, insertOrderSchema, insertOrderItemSchema, insertUserSchema, couponRedemptions, orders, coupons, products, stockAdjustments, productCategories, productVariants } from "@shared/schema";
import { optimizeImage, optimizeImageBuffer, optimizeUploadedFiles } from "./imageOptimizer";
import { 
  sendWelcomeEmail, 
  sendOrderConfirmationEmail, 
  sendPreparingNotificationEmail,
  sendShippingNotificationEmail, 
  sendAdminOrderNotificationEmail,
  sendPasswordResetEmail,
  sendReviewRequestEmail,
  sendTestEmail,
  sendAbandonedCartEmail,
  sendBankTransferPendingEmail,
  sendAdminReviewNotificationEmail,
  sendGuestReviewApprovedEmail,
  sendGuestReviewRejectedEmail,
  type AdminReviewNotificationPayload,
} from "./emailService";
import { verifyTurnstile, getClientIp } from "./captcha";
import {
  sendOrderReceivedToCustomer,
  sendOrderReceivedToAdmin,
  sendOrderPreparingToCustomer,
  sendOrderShippedToCustomer,
  sendOrderDeliveredToCustomer,
  sendOrderCancelledToCustomer,
  sendOrderCancelledToAdmin,
  sendBankTransferPendingToCustomer,
  sendBankTransferPendingToAdmin,
  sendTestWhatsApp,
  sendReviewPendingToAdmin,
} from "./whatsappService";
import { BANK_TRANSFER_DISCOUNT_RATE } from "./bankTransfer";
import {
  createCheckoutFormInitialize,
  retrieveCheckoutForm,
  isIyzicoConfigured,
  testIyzicoConnection,
  type IyzicoBasketItem,
} from "./iyzico";
import {
  buildGroupingPlan,
  AUTO_GROUP_DISPLAY_ORDER_BASE,
  AUTO_GROUP_DISPLAY_ORDER_MAX,
} from "./menu-grouping";
import { menuItems as menuItemsTable } from "@shared/schema";
import { and, gte, lte } from "drizzle-orm";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  validateAndRotateRefreshToken,
  revokeRefreshToken,
  setAuthCookies,
  clearAuthCookies,
  getOrCreateCartToken,
  type JwtPayload
} from "./jwt";

async function getAuthPayload(req: Request, res: Response): Promise<JwtPayload | null> {
  const accessToken = req.cookies?.access_token;
  
  if (accessToken) {
    const payload = verifyAccessToken(accessToken);
    if (payload) {
      return payload;
    }
  }
  
  const refreshToken = req.cookies?.refresh_token;
  if (refreshToken) {
    // Use rotation to revoke old token and issue new one
    const result = await validateAndRotateRefreshToken(
      refreshToken,
      req.headers['user-agent'],
      req.ip
    );
    if (result) {
      const newAccessToken = generateAccessToken(result.payload);
      const isProduction = process.env.NODE_ENV === 'production';
      // Set both new access token and rotated refresh token
      setAuthCookies(res, newAccessToken, result.newRefreshToken, isProduction);
      return result.payload;
    }
  }
  
  return null;
}

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), "client/public/uploads");

// Ensure upload directories exist
const ensureDir = (dir: string) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};
ensureDir(path.join(uploadDir, "products"));
ensureDir(path.join(uploadDir, "categories"));
ensureDir(path.join(uploadDir, "hero"));

const VALID_UPLOAD_TYPES = ['products', 'categories', 'hero', 'branding'];

const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const type = req.params.type || "products";
    if (!VALID_UPLOAD_TYPES.includes(type)) {
      return cb(new Error("Invalid upload type"), "");
    }
    const dest = path.join(uploadDir, type);
    ensureDir(dest);
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage: multerStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

// Helper function to generate quote PDF as buffer for email attachment
async function generateQuotePdfBuffer(quote: any, dealer: any, items: any[]): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      
      // Register Inter fonts for Turkish character support
      const fontPath = path.join(process.cwd(), 'public', 'fonts');
      const regularFontPath = path.join(fontPath, 'inter-regular.ttf');
      const boldFontPath = path.join(fontPath, 'inter-bold.ttf');
      
      if (fs.existsSync(regularFontPath) && fs.existsSync(boldFontPath)) {
        doc.registerFont('Inter', regularFontPath);
        doc.registerFont('Inter-Bold', boldFontPath);
      }
      
      const fontRegular = fs.existsSync(regularFontPath) ? 'Inter' : 'Helvetica';
      const fontBold = fs.existsSync(boldFontPath) ? 'Inter-Bold' : 'Helvetica-Bold';
      
      // Header logo - convert SVG to PNG using sharp
      const svgLogoPath = path.join(process.cwd(), 'client', 'public', 'uploads', 'branding', 'polen-logo.svg');
      const pngLogoPath = path.join(process.cwd(), 'client', 'public', 'uploads', 'branding', 'polen-icon.png');
      
      let logoAdded = false;
      if (fs.existsSync(svgLogoPath)) {
        try {
          const pngBuffer = await sharp(svgLogoPath).resize(120).png().toBuffer();
          doc.image(pngBuffer, 50, 35, { width: 80 });
          logoAdded = true;
        } catch (e) {
          console.log('[PDF] SVG to PNG conversion failed:', e);
        }
      }
      
      if (!logoAdded && fs.existsSync(pngLogoPath)) {
        doc.image(pngLogoPath, 50, 40, { width: 60 });
        logoAdded = true;
      }
      
      if (!logoAdded) {
        doc.fontSize(28).font(fontBold).fillColor('#000000').text('Polen Stone', 50, 50);
      }
      
      // Quote title
      doc.fontSize(24).font(fontBold).fillColor('#000000').text('TEKLİF', 350, 50, { align: 'right' });
      doc.fontSize(12).font(fontRegular).fillColor('#666666').text(quote.quoteNumber, 350, 80, { align: 'right' });
      
      doc.moveDown(2);
      
      // Dealer info box
      const yStart = 120;
      doc.rect(50, yStart, 250, 100).fillAndStroke('#f5f5f5', '#e0e0e0');
      doc.fontSize(10).font(fontBold).fillColor('#333333').text('BAYİ BİLGİLERİ', 60, yStart + 10);
      doc.fontSize(11).font(fontRegular).fillColor('#000000').text(dealer?.name || 'Bilinmeyen', 60, yStart + 30);
      if (dealer?.contactPerson) {
        doc.fontSize(9).fillColor('#666666').text(dealer.contactPerson, 60, yStart + 45);
      }
      if (dealer?.email) {
        doc.fontSize(9).text(dealer.email, 60, yStart + 60);
      }
      if (dealer?.phone) {
        doc.fontSize(9).text(dealer.phone, 60, yStart + 75);
      }
      
      // Quote details box
      doc.rect(310, yStart, 235, 100).fillAndStroke('#f5f5f5', '#e0e0e0');
      doc.fontSize(10).font(fontBold).fillColor('#333333').text('TEKLİF DETAYLARI', 320, yStart + 10);
      doc.fontSize(9).font(fontRegular).fillColor('#666666');
      doc.text('Oluşturulma:', 320, yStart + 30);
      doc.fillColor('#000000').text(new Date(quote.createdAt).toLocaleDateString('tr-TR'), 420, yStart + 30);
      doc.fillColor('#666666').text('Geçerlilik:', 320, yStart + 45);
      doc.fillColor('#000000').text(quote.validUntil ? new Date(quote.validUntil).toLocaleDateString('tr-TR') : '-', 420, yStart + 45);
      doc.fillColor('#666666').text('Ödeme:', 320, yStart + 60);
      const paymentLabels: Record<string, string> = { cash: 'Peşin Ödeme', credit_card: 'Kredi Kartı', eft: 'Havale / EFT', net15: '15 Gün Vadeli', net30: '30 Gün Vadeli', net45: '45 Gün Vadeli', net60: '60 Gün Vadeli', net90: '90 Gün Vadeli', installment_3: '3 Taksit', installment_6: '6 Taksit', installment_9: '9 Taksit', installment_12: '12 Taksit' };
      const paymentLabel = paymentLabels[quote.paymentTerms || ''] || '-';
      doc.fillColor('#000000').text(paymentLabel, 420, yStart + 60);
      doc.fillColor('#666666').text('KDV:', 320, yStart + 75);
      doc.fillColor('#000000').text(quote.includesVat ? 'Dahil' : 'Hariç', 420, yStart + 75);
      
      // Products table
      const tableTop = yStart + 130;
      doc.fontSize(12).font(fontBold).fillColor('#000000').text('ÜRÜNLER', 50, tableTop);
      
      // Table header
      const headerY = tableTop + 25;
      doc.rect(50, headerY, 495, 22).fillAndStroke('#333333', '#333333');
      doc.fontSize(7).font(fontBold).fillColor('#ffffff');
      doc.text('Ürün', 55, headerY + 7, { width: 220 });
      doc.text('Beden', 275, headerY + 7, { width: 40, align: 'center' });
      doc.text('Adet', 315, headerY + 7, { width: 30, align: 'center' });
      doc.text('Birim Fiyat', 345, headerY + 7, { width: 55, align: 'right' });
      doc.text('İsk.', 400, headerY + 7, { width: 30, align: 'center' });
      doc.text('Toplam', 430, headerY + 7, { width: 110, align: 'right' });
      
      // Table rows - compact layout
      let currentY = headerY + 22;
      const rowHeight = 22;
      
      for (let itemIdx = 0; itemIdx < items.length; itemIdx++) {
        const item = items[itemIdx];
        if (currentY > 740) {
          doc.addPage();
          currentY = 50;
        }
        
        const bgColor = itemIdx % 2 === 0 ? '#ffffff' : '#f8f8f8';
        doc.rect(50, currentY, 495, rowHeight).fillAndStroke(bgColor, '#e0e0e0');
        
        doc.fontSize(7).font(fontRegular).fillColor('#000000');
        const skuPrefix = item.productSku ? `[${item.productSku}] ` : '';
        doc.text(`${skuPrefix}${item.productName}`, 55, currentY + 7, { width: 220, lineBreak: false, ellipsis: true });
        
        doc.fontSize(7).fillColor('#333333');
        doc.text(item.variantDetails || '-', 275, currentY + 7, { width: 40, align: 'center' });
        
        doc.fillColor('#000000');
        doc.text(item.quantity.toString(), 315, currentY + 7, { width: 30, align: 'center' });
        doc.text(`${parseFloat(item.unitPrice).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`, 345, currentY + 7, { width: 55, align: 'right' });
        
        if (parseFloat(item.discountPercent) > 0) {
          doc.fillColor('#22c55e').text(`%${item.discountPercent}`, 400, currentY + 7, { width: 30, align: 'center' });
        } else {
          doc.fillColor('#999999').text('-', 400, currentY + 7, { width: 30, align: 'center' });
        }
        
        doc.font(fontBold).fillColor('#000000');
        doc.text(`${parseFloat(item.lineTotal).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`, 430, currentY + 7, { width: 110, align: 'right' });
        
        currentY += rowHeight;
      }
      
      // Totals section
      currentY += 10;
      doc.rect(350, currentY, 195, 80).fillAndStroke('#f5f5f5', '#e0e0e0');
      
      doc.fontSize(10).font(fontRegular).fillColor('#666666');
      doc.text('Ara Toplam:', 360, currentY + 15);
      doc.fillColor('#000000').text(`${parseFloat(quote.subtotal).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL`, 460, currentY + 15, { width: 75, align: 'right' });
      
      if (parseFloat(quote.discountTotal) > 0) {
        doc.fillColor('#22c55e').text('İskonto:', 360, currentY + 35);
        doc.text(`-${parseFloat(quote.discountTotal).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL`, 460, currentY + 35, { width: 75, align: 'right' });
      }
      
      doc.fontSize(12).font(fontBold).fillColor('#000000');
      doc.text('GENEL TOPLAM:', 360, currentY + 55);
      doc.text(`${parseFloat(quote.grandTotal).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL`, 460, currentY + 55, { width: 75, align: 'right' });
      
      // Notes
      if (quote.notes) {
        currentY += 100;
        if (currentY > 700) {
          doc.addPage();
          currentY = 50;
        }
        doc.fontSize(10).font(fontBold).fillColor('#333333').text('NOTLAR', 50, currentY);
        doc.fontSize(9).font(fontRegular).fillColor('#666666').text(quote.notes, 50, currentY + 15, { width: 495 });
      }
      
      // Footer
      doc.fontSize(8).font(fontRegular).fillColor('#999999');
      doc.text('Polen Stone Doğal Taş & Mermer | www.polenstone.com | info@polenstone.com', 50, 780, { align: 'center', width: 495 });
      
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Meta (Facebook/Instagram) Commerce + Google Merchant ürün akışı
  // Commerce Manager → Katalog → Veri Kaynakları → Programlanmış Akış URL'i olarak kullanılır
  app.get("/feed/meta-catalog.xml", async (_req, res) => {
    try {
      const { buildMetaCatalogXml } = await import("./feeds");
      const xml = await buildMetaCatalogXml();
      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.send(xml);
    } catch (error) {
      console.error("[meta-catalog] feed üretimi başarısız:", error);
      res.status(500).send("Feed üretilemedi");
    }
  });

  // Dynamic sitemap.xml — categories + products + static pages
  app.get(["/sitemap.xml", "/sitemap_index.xml"], async (_req, res) => {
    try {
      const baseUrl = "https://polenstone.com";
      const today = new Date().toISOString().split("T")[0];

      const staticPages: Array<{ loc: string; priority: string; changefreq: string }> = [
        { loc: "/", priority: "1.0", changefreq: "daily" },
        { loc: "/magaza", priority: "0.9", changefreq: "daily" },
        { loc: "/hakkimizda", priority: "0.6", changefreq: "monthly" },
        { loc: "/teslimat-kosullari", priority: "0.4", changefreq: "yearly" },
        { loc: "/mesafeli-satis-sozlesmesi", priority: "0.4", changefreq: "yearly" },
        { loc: "/iptal-ve-iade", priority: "0.4", changefreq: "yearly" },
        { loc: "/kvkk", priority: "0.4", changefreq: "yearly" },
      ];

      const [categories, products] = await Promise.all([
        storage.getCategories().catch(() => []),
        storage.getAllProducts().catch(() => []),
      ]);

      const escapeXml = (str: string) =>
        str
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&apos;");

      const urls: string[] = [];

      for (const page of staticPages) {
        urls.push(
          `  <url>\n    <loc>${baseUrl}${page.loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${page.changefreq}</changefreq>\n    <priority>${page.priority}</priority>\n  </url>`
        );
      }

      for (const cat of categories) {
        if (!cat?.slug) continue;
        urls.push(
          `  <url>\n    <loc>${baseUrl}/kategori/${escapeXml(cat.slug)}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`
        );
      }

      for (const product of products) {
        if (!product?.slug) continue;
        const lastmod = (product as any).updatedAt
          ? new Date((product as any).updatedAt).toISOString().split("T")[0]
          : today;
        urls.push(
          `  <url>\n    <loc>${baseUrl}/urun/${escapeXml(product.slug)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>`
        );
      }

      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;

      res.set("Content-Type", "application/xml; charset=utf-8");
      res.set("Cache-Control", "public, max-age=3600");
      res.send(xml);
    } catch (error) {
      console.error("[sitemap] generation failed:", error);
      res.status(500).type("text/plain").send("Sitemap generation failed");
    }
  });

  // Social Media Crawler Detection - serves pre-rendered OG tags for bots
  const crawlerPatterns = [
    'facebookexternalhit',
    'Facebot',
    'WhatsApp',
    'Twitterbot',
    'LinkedInBot',
    'Slackbot',
    'TelegramBot',
    'Pinterest',
    'Discordbot',
    'Googlebot',
    'bingbot'
  ];

  const isCrawler = (userAgent: string | undefined): boolean => {
    if (!userAgent) return false;
    return crawlerPatterns.some(pattern => 
      userAgent.toLowerCase().includes(pattern.toLowerCase())
    );
  };

  const escapeHtml = (str: string): string => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const normalizeImageUrl = (baseUrl: string, imageUrl: string): string => {
    if (!imageUrl) return `${baseUrl}/logo.png`;
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) return imageUrl;
    return `${baseUrl}${imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl}`;
  };

  // Product page crawler middleware
  app.get('/urun/:slug', async (req, res, next) => {
    const userAgent = req.get('user-agent');
    
    if (!isCrawler(userAgent)) {
      return next();
    }

    try {
      const product = await storage.getProductBySlug(req.params.slug);
      if (!product) {
        return next();
      }

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const pageUrl = `${baseUrl}/urun/${product.slug}`;
      const mainImage = product.images && product.images.length > 0 
        ? normalizeImageUrl(baseUrl, product.images[0])
        : `${baseUrl}/logo.png`;
      const price = parseFloat(product.basePrice || '0');
      const description = product.description 
        ? escapeHtml(product.description.substring(0, 200))
        : `${escapeHtml(product.name)} - Polen Stone premium doğal taş ve mermer`;

      const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(product.name)} | Polen Stone</title>
  <meta name="description" content="${description}">
  
  <!-- Open Graph -->
  <meta property="og:type" content="product">
  <meta property="og:title" content="${escapeHtml(product.name)}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${mainImage}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:url" content="${pageUrl}">
  <meta property="og:site_name" content="Polen Stone">
  <meta property="og:locale" content="tr_TR">
  <meta property="product:price:amount" content="${price}">
  <meta property="product:price:currency" content="TRY">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(product.name)}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${mainImage}">
  
  <link rel="canonical" href="${pageUrl}">
</head>
<body>
  <h1>${escapeHtml(product.name)}</h1>
  <p>${description}</p>
  <p>Fiyat: ${price.toLocaleString('tr-TR')} TL</p>
  <img src="${mainImage}" alt="${escapeHtml(product.name)}">
  <a href="${pageUrl}">Ürünü Görüntüle</a>
</body>
</html>`;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    } catch (error) {
      console.error('Crawler middleware error:', error);
      next();
    }
  });

  // Category page crawler middleware
  app.get('/kategori/:slug', async (req, res, next) => {
    const userAgent = req.get('user-agent');
    
    if (!isCrawler(userAgent)) {
      return next();
    }

    try {
      const category = await storage.getCategoryBySlug(req.params.slug);
      if (!category) {
        return next();
      }

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const pageUrl = `${baseUrl}/kategori/${category.slug}`;
      const mainImage = category.image 
        ? normalizeImageUrl(baseUrl, category.image)
        : `${baseUrl}/logo.png`;
      const description = `${escapeHtml(category.name)} koleksiyonu - Polen Stone premium doğal taş ve mermer`;

      const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(category.name)} | Polen Stone</title>
  <meta name="description" content="${description}">
  
  <!-- Open Graph -->
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escapeHtml(category.name)} | Polen Stone">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${mainImage}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:url" content="${pageUrl}">
  <meta property="og:site_name" content="Polen Stone">
  <meta property="og:locale" content="tr_TR">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(category.name)} | Polen Stone">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${mainImage}">
  
  <link rel="canonical" href="${pageUrl}">
</head>
<body>
  <h1>${escapeHtml(category.name)}</h1>
  <p>${description}</p>
  <img src="${mainImage}" alt="${escapeHtml(category.name)}">
  <a href="${pageUrl}">Koleksiyonu Görüntüle</a>
</body>
</html>`;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    } catch (error) {
      console.error('Crawler middleware error:', error);
      next();
    }
  });

  // ── Pages API ────────────────────────────────────────────────────────────
  // Public: GET /api/pages, GET /api/pages/:slug
  // Admin:  POST/PUT/DELETE /api/admin/pages/:id

  app.get("/api/pages", async (_req, res) => {
    try {
      const allPages = await storage.getPages();
      res.json(allPages.filter(p => p.isPublished));
    } catch (err) {
      console.error("[pages] list error:", err);
      res.status(500).json({ error: "Sayfalar yüklenemedi" });
    }
  });

  app.get("/api/pages/:slug", async (req, res) => {
    try {
      const page = await storage.getPageBySlug(req.params.slug);
      if (!page || !page.isPublished) return res.status(404).json({ error: "Sayfa bulunamadı" });
      res.json(page);
    } catch (err) {
      console.error("[pages] get error:", err);
      res.status(500).json({ error: "Sayfa yüklenemedi" });
    }
  });

  // Admin Authentication with JWT
  app.post("/api/admin/login", async (req: Request, res) => {
    try {
      const { username, password } = req.body;
      const user = await storage.getAdminUserByUsername(username);
      
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const payload = { adminUserId: user.id, email: user.username, type: 'admin' as const };
      const accessToken = generateAccessToken(payload);
      const refreshToken = await generateRefreshToken(
        payload,
        req.headers['user-agent'],
        req.ip
      );

      const isProduction = process.env.NODE_ENV === 'production';
      setAuthCookies(res, accessToken, refreshToken, isProduction);

      res.json({ success: true, user: { id: user.id, username: user.username } });
    } catch (error) {
      console.error('Admin login error:', error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/admin/logout", async (req: Request, res) => {
    try {
      const refreshToken = req.cookies?.refresh_token;
      if (refreshToken) {
        await revokeRefreshToken(refreshToken);
      }
      clearAuthCookies(res);
      res.json({ success: true });
    } catch (error) {
      clearAuthCookies(res);
      res.json({ success: true });
    }
  });

  app.get("/api/admin/me", async (req: Request, res) => {
    const payload = await getAuthPayload(req, res);
    if (!payload || payload.type !== 'admin' || !payload.adminUserId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const user = await storage.getAdminUser(payload.adminUserId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ id: user.id, username: user.username });
  });

  app.patch("/api/admin/account", async (req: Request, res) => {
    try {
      const payload = await getAuthPayload(req, res);
      if (!payload || payload.type !== 'admin' || !payload.adminUserId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getAdminUser(payload.adminUserId);
      if (!user) {
        return res.status(404).json({ error: "Yönetici bulunamadı" });
      }

      const { currentPassword, newUsername, newPassword } = req.body || {};

      if (typeof currentPassword !== 'string' || currentPassword.length === 0) {
        return res.status(400).json({ error: "Mevcut şifre gerekli" });
      }

      const passwordOk = await bcrypt.compare(currentPassword, user.password);
      if (!passwordOk) {
        return res.status(401).json({ error: "Mevcut şifre hatalı" });
      }

      const update: Partial<{ username: string; password: string }> = {};

      if (typeof newUsername === 'string' && newUsername.trim().length > 0 && newUsername.trim() !== user.username) {
        const trimmed = newUsername.trim();
        if (trimmed.length < 3) {
          return res.status(400).json({ error: "Kullanıcı adı en az 3 karakter olmalı" });
        }
        if (!/^[a-zA-Z0-9_.-]+$/.test(trimmed)) {
          return res.status(400).json({ error: "Kullanıcı adı yalnızca harf, rakam, '.', '_' ve '-' içerebilir" });
        }
        const existing = await storage.getAdminUserByUsername(trimmed);
        if (existing && existing.id !== user.id) {
          return res.status(409).json({ error: "Bu kullanıcı adı zaten kullanılıyor" });
        }
        update.username = trimmed;
      }

      if (typeof newPassword === 'string' && newPassword.length > 0) {
        if (newPassword.length < 8) {
          return res.status(400).json({ error: "Yeni şifre en az 8 karakter olmalı" });
        }
        update.password = await bcrypt.hash(newPassword, 10);
      }

      if (!update.username && !update.password) {
        return res.status(400).json({ error: "Değiştirilecek bir bilgi girin" });
      }

      const updated = await storage.updateAdminUser(user.id, update);
      if (!updated) {
        return res.status(500).json({ error: "Güncelleme başarısız" });
      }

      console.log(`[AdminAccount] ${user.username} updated -> username:${update.username ? 'changed' : '-'} password:${update.password ? 'changed' : '-'}`);

      res.json({
        success: true,
        user: { id: updated.id, username: updated.username },
        usernameChanged: Boolean(update.username),
        passwordChanged: Boolean(update.password),
      });
    } catch (error) {
      console.error('[AdminAccount] update error:', error);
      res.status(500).json({ error: "Hesap güncellenemedi" });
    }
  });

  // Middleware for admin routes
  const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
    const payload = await getAuthPayload(req, res);
    if (!payload || payload.type !== 'admin' || !payload.adminUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    (req as any).adminId = payload.adminUserId;
    next();
  };

  // Typed accessor — `requireAdmin` middleware'inden sonra çağrılırsa
  // her zaman string döner. `(req as any).adminId` cast'lerini kapsüller.
  const getAdminId = (req: Request): string => {
    const id = (req as Request & { adminId?: unknown }).adminId;
    if (typeof id !== 'string' || !id) {
      throw new Error('Admin context missing — requireAdmin middleware did not run.');
    }
    return id;
  };

  // Allowed upload types for security
  const ALLOWED_UPLOAD_TYPES = ['products', 'categories', 'hero', 'branding'];

  // File Upload Route with type validation and image optimization
  app.post("/api/admin/upload/:type", requireAdmin, (req, res, next) => {
    upload.array("images", 20)(req, res, (err) => {
      if (err) {
        console.error('[Upload] Multer error:', err.message);
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: "Dosya boyutu 10MB'ı geçemez" });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({ error: "En fazla 20 dosya yüklenebilir" });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({ error: "Geçersiz dosya alanı" });
        }
        return res.status(400).json({ error: err.message || "Yükleme hatası" });
      }
      next();
    });
  }, async (req, res) => {
    try {
      const type = req.params.type;
      
      if (!ALLOWED_UPLOAD_TYPES.includes(type)) {
        return res.status(400).json({ error: "Invalid upload type" });
      }
      
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
      }
      
      // Optimize uploaded images
      const urls = await optimizeUploadedFiles(files);
      console.log(`[Upload] Optimized ${urls.length} images for ${type}`);
      res.json({ urls });
    } catch (error) {
      console.error('[Upload] Error:', error);
      res.status(500).json({ error: "Upload failed" });
    }
  });

  // Delete uploaded file with path validation
  app.delete("/api/admin/upload", requireAdmin, (req, res) => {
    try {
      const { path: filePath } = req.body;
      
      if (!filePath || typeof filePath !== 'string') {
        return res.status(400).json({ error: "Invalid file path" });
      }
      
      if (!filePath.startsWith("/uploads/")) {
        return res.status(400).json({ error: "Invalid file path" });
      }
      
      if (filePath.includes('..') || filePath.includes('//')) {
        return res.status(400).json({ error: "Invalid file path" });
      }
      
      const pathParts = filePath.split('/').filter(Boolean);
      if (pathParts.length < 3 || pathParts[0] !== 'uploads' || !ALLOWED_UPLOAD_TYPES.includes(pathParts[1])) {
        return res.status(400).json({ error: "Invalid file path" });
      }
      
      const fullPath = path.join(process.cwd(), "client/public", filePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Delete failed" });
    }
  });

  // Admin Stats
  app.get("/api/admin/stats", requireAdmin, async (req, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Admin Users Management
  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const { search } = req.query;
      const users = await storage.getUsers(search as string);
      res.json(users.map(u => ({ ...u, password: undefined })));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.get("/api/admin/users/:id", requireAdmin, async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ ...user, password: undefined });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  app.delete("/api/admin/users/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteUser(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  // Admin Products (all products including inactive)
  app.get("/api/admin/products", requireAdmin, async (req, res) => {
    try {
      const products = await storage.getAllProducts();
      // Add categoryIds to each product for multi-category support
      const productsWithCategoryIds = await Promise.all(
        products.map(async (product) => {
          const categoryIds = await storage.getProductCategoryIds(product.id);
          return { ...product, categoryIds };
        })
      );
      res.json(productsWithCategoryIds);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  // User Authentication
  app.post("/api/auth/register", async (req: Request, res) => {
    try {
      const { email, password, firstName, lastName, phone, address, city, district, postalCode } = req.body;
      
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "Bu e-posta adresi zaten kayıtlı" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        address,
        city,
        district,
        postalCode,
      });

      // Set JWT cookies for the new user
      const payload = { userId: user.id, email: user.email, type: 'user' as const };
      const accessToken = generateAccessToken(payload);
      const refreshToken = await generateRefreshToken(
        payload,
        req.headers['user-agent'],
        req.ip
      );
      const isProduction = process.env.NODE_ENV === 'production';
      setAuthCookies(res, accessToken, refreshToken, isProduction);
      
      // If address info is provided, create a saved address
      if (address && city && district && firstName && lastName && phone) {
        await storage.createUserAddress({
          userId: user.id,
          title: 'Ev Adresi',
          firstName,
          lastName,
          phone,
          address,
          city,
          district,
          postalCode: postalCode || undefined,
          isDefault: true,
        });
      }
      
      // Send welcome email (don't wait)
      sendWelcomeEmail(user).catch(err => console.error('[Email] Welcome email failed:', err));
      
      res.status(201).json({ 
        success: true, 
        user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName } 
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: "Kayıt işlemi başarısız" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res) => {
    try {
      const { email, password } = req.body;
      const user = await storage.getUserByEmail(email);
      
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: "E-posta veya şifre hatalı" });
      }

      const payload = { userId: user.id, email: user.email, type: 'user' as const };
      const accessToken = generateAccessToken(payload);
      const refreshToken = await generateRefreshToken(
        payload,
        req.headers['user-agent'],
        req.ip
      );

      const isProduction = process.env.NODE_ENV === 'production';
      setAuthCookies(res, accessToken, refreshToken, isProduction);

      res.json({ 
        success: true, 
        user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName } 
      });
    } catch (error) {
      console.error('User login error:', error);
      res.status(500).json({ error: "Giriş işlemi başarısız" });
    }
  });

  app.post("/api/auth/logout", async (req: Request, res) => {
    try {
      const refreshToken = req.cookies?.refresh_token;
      if (refreshToken) {
        await revokeRefreshToken(refreshToken);
      }
      clearAuthCookies(res);
      res.json({ success: true });
    } catch (error) {
      clearAuthCookies(res);
      res.json({ success: true });
    }
  });

  app.get("/api/auth/me", async (req: Request, res) => {
    const payload = await getAuthPayload(req, res);
    if (!payload || payload.type !== 'user' || !payload.userId) {
      return res.status(401).json({ error: "Giriş yapılmamış" });
    }

    const user = await storage.getUser(payload.userId);
    if (!user) {
      return res.status(404).json({ error: "Kullanıcı bulunamadı" });
    }

    res.json({ id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, phone: user.phone, address: user.address, city: user.city, district: user.district, postalCode: user.postalCode, country: user.country, whatsappOptIn: user.whatsappOptIn, createdAt: user.createdAt });
  });

  app.patch("/api/auth/profile", async (req: Request, res) => {
    const payload = await getAuthPayload(req, res);
    if (!payload || payload.type !== 'user' || !payload.userId) {
      return res.status(401).json({ error: "Giriş yapılmamış" });
    }

    try {
      const { firstName, lastName, phone, whatsappOptIn } = req.body;
      const updates: { firstName?: string; lastName?: string; phone?: string; whatsappOptIn?: boolean } = {};
      if (firstName !== undefined) updates.firstName = firstName;
      if (lastName !== undefined) updates.lastName = lastName;
      if (phone !== undefined) updates.phone = phone;
      if (typeof whatsappOptIn === 'boolean') updates.whatsappOptIn = whatsappOptIn;

      const updated = await storage.updateUser(payload.userId, updates);
      if (!updated) {
        return res.status(404).json({ error: "Kullanıcı bulunamadı" });
      }
      res.json({ id: updated.id, email: updated.email, firstName: updated.firstName, lastName: updated.lastName, phone: updated.phone, whatsappOptIn: updated.whatsappOptIn });
    } catch (error) {
      res.status(500).json({ error: "Profil güncellenemedi" });
    }
  });

  // User Addresses API
  app.get("/api/auth/addresses", async (req: Request, res) => {
    const payload = await getAuthPayload(req, res);
    if (!payload || payload.type !== 'user' || !payload.userId) {
      return res.status(401).json({ error: "Giriş yapılmamış" });
    }

    try {
      const addresses = await storage.getUserAddresses(payload.userId);
      res.json(addresses);
    } catch (error) {
      res.status(500).json({ error: "Adresler yüklenemedi" });
    }
  });

  app.post("/api/auth/addresses", async (req: Request, res) => {
    const payload = await getAuthPayload(req, res);
    if (!payload || payload.type !== 'user' || !payload.userId) {
      return res.status(401).json({ error: "Giriş yapılmamış" });
    }

    try {
      const { title, firstName, lastName, phone, address, city, district, postalCode, isDefault } = req.body;
      
      // Check if this is the first address - if so, make it default
      const existingAddresses = await storage.getUserAddresses(payload.userId);
      const shouldBeDefault = existingAddresses.length === 0 ? true : !!isDefault;
      
      const newAddress = await storage.createUserAddress({
        userId: payload.userId,
        title: title || 'Adresim',
        firstName,
        lastName,
        phone,
        address,
        city,
        district,
        postalCode,
        isDefault: shouldBeDefault,
      });
      res.status(201).json(newAddress);
    } catch (error) {
      res.status(500).json({ error: "Adres eklenemedi" });
    }
  });

  app.patch("/api/auth/addresses/:id", async (req: Request, res) => {
    const payload = await getAuthPayload(req, res);
    if (!payload || payload.type !== 'user' || !payload.userId) {
      return res.status(401).json({ error: "Giriş yapılmamış" });
    }

    try {
      const existingAddress = await storage.getUserAddress(req.params.id);
      if (!existingAddress || existingAddress.userId !== payload.userId) {
        return res.status(404).json({ error: "Adres bulunamadı" });
      }

      const { title, firstName, lastName, phone, address, city, district, postalCode, isDefault } = req.body;
      const updated = await storage.updateUserAddress(req.params.id, {
        title,
        firstName,
        lastName,
        phone,
        address,
        city,
        district,
        postalCode,
        isDefault,
      });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Adres güncellenemedi" });
    }
  });

  app.delete("/api/auth/addresses/:id", async (req: Request, res) => {
    const payload = await getAuthPayload(req, res);
    if (!payload || payload.type !== 'user' || !payload.userId) {
      return res.status(401).json({ error: "Giriş yapılmamış" });
    }

    try {
      const existingAddress = await storage.getUserAddress(req.params.id);
      if (!existingAddress || existingAddress.userId !== payload.userId) {
        return res.status(404).json({ error: "Adres bulunamadı" });
      }

      await storage.deleteUserAddress(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Adres silinemedi" });
    }
  });

  app.patch("/api/auth/addresses/:id/default", async (req: Request, res) => {
    const payload = await getAuthPayload(req, res);
    if (!payload || payload.type !== 'user' || !payload.userId) {
      return res.status(401).json({ error: "Giriş yapılmamış" });
    }

    try {
      const existingAddress = await storage.getUserAddress(req.params.id);
      if (!existingAddress || existingAddress.userId !== payload.userId) {
        return res.status(404).json({ error: "Adres bulunamadı" });
      }

      await storage.setDefaultAddress(payload.userId, req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Varsayılan adres ayarlanamadı" });
    }
  });

  app.get("/api/orders/my", async (req: Request, res) => {
    const payload = await getAuthPayload(req, res);
    if (!payload || payload.type !== 'user' || !payload.userId) {
      return res.status(401).json({ error: "Giriş yapılmamış" });
    }

    try {
      const user = await storage.getUser(payload.userId);
      if (!user) {
        return res.status(404).json({ error: "Kullanıcı bulunamadı" });
      }
      const orders = await storage.getOrdersByEmail(user.email);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ error: "Siparişler yüklenemedi" });
    }
  });

  app.get("/api/orders/my/:id", async (req: Request, res) => {
    const payload = await getAuthPayload(req, res);
    if (!payload || payload.type !== 'user' || !payload.userId) {
      return res.status(401).json({ error: "Giriş yapılmamış" });
    }

    try {
      const order = await storage.getOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ error: "Sipariş bulunamadı" });
      }
      const user = await storage.getUser(payload.userId);
      if (!user || order.customerEmail !== user.email) {
        return res.status(403).json({ error: "Bu siparişe erişim yetkiniz yok" });
      }
      const items = await storage.getOrderItems(order.id);
      res.json({ ...order, items });
    } catch (error) {
      res.status(500).json({ error: "Sipariş yüklenemedi" });
    }
  });

  // Public Order Tracking API
  app.get("/api/orders/track", async (req: Request, res) => {
    try {
      const { orderNumber, email } = req.query;
      
      if (!orderNumber || typeof orderNumber !== 'string') {
        return res.status(400).json({ error: "Sipariş numarası gerekli" });
      }

      const order = await storage.getOrderByNumber(orderNumber);
      if (!order) {
        return res.status(404).json({ error: "Sipariş bulunamadı" });
      }

      // If email provided, verify it matches (optional security)
      if (email && typeof email === 'string' && order.customerEmail.toLowerCase() !== email.toLowerCase()) {
        return res.status(404).json({ error: "Sipariş bulunamadı" });
      }

      const items = await storage.getOrderItems(order.id);
      
      // Return limited info for public tracking
      res.json({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        customerName: order.customerName,
        createdAt: order.createdAt,
        processingAt: order.processingAt,
        shippedAt: order.shippedAt,
        deliveredAt: order.deliveredAt,
        cancelledAt: order.cancelledAt,
        total: order.total,
        shippingCost: order.shippingCost,
        trackingNumber: order.trackingNumber,
        trackingUrl: order.trackingUrl,
        shippingCarrier: order.shippingCarrier,
        shippingAddress: order.shippingAddress,
        items: items.map(item => ({
          id: item.id,
          productName: item.productName,
          variantDetails: item.variantDetails,
          quantity: item.quantity,
          subtotal: item.subtotal,
        })),
      });
    } catch (error) {
      console.error('[Order Track] Error:', error);
      res.status(500).json({ error: "Sipariş bilgisi alınamadı" });
    }
  });

  // Categories API
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  app.get("/api/categories/:slug", async (req, res) => {
    try {
      const category = await storage.getCategoryBySlug(req.params.slug);
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }
      res.json(category);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch category" });
    }
  });

  app.post("/api/admin/categories", requireAdmin, async (req, res) => {
    try {
      const validated = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(validated);
      res.status(201).json(category);
    } catch (error) {
      res.status(400).json({ error: "Invalid category data" });
    }
  });

  app.patch("/api/admin/categories/:id", requireAdmin, async (req, res) => {
    try {
      const category = await storage.updateCategory(req.params.id, req.body);
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }
      res.json(category);
    } catch (error) {
      res.status(400).json({ error: "Failed to update category" });
    }
  });

  app.delete("/api/admin/categories/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteCategory(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete category" });
    }
  });

  // Products API
  app.get("/api/products", async (req, res) => {
    try {
      const { categoryId, isFeatured, isNew, search, minPrice, maxPrice, sort } = req.query;
      const products = await storage.getProducts({
        categoryId: categoryId as string,
        isFeatured: isFeatured !== undefined ? isFeatured === 'true' : undefined,
        isNew: isNew !== undefined ? isNew === 'true' : undefined,
        search: search as string,
        minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
        sort: sort as 'price_asc' | 'price_desc' | 'newest' | 'popular' | undefined,
      });
      res.json(products);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  app.get("/api/products/:slug", async (req, res) => {
    try {
      const product = await storage.getProductBySlug(req.params.slug);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      const variants = await storage.getProductVariants(product.id);
      const categoryIds = await storage.getProductCategoryIds(product.id);
      res.json({ ...product, variants, categoryIds });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch product" });
    }
  });

  app.post("/api/admin/products", requireAdmin, async (req, res) => {
    try {
      const { categoryIds, initialStock, ...productData } = req.body;
      const validated = insertProductSchema.parse(productData);
      const product = await storage.createProduct(validated);
      
      // Set product categories (multi-category support)
      if (categoryIds && Array.isArray(categoryIds) && categoryIds.length > 0) {
        await storage.setProductCategories(product.id, categoryIds);
      } else if (product.categoryId) {
        // Fallback: also add the main categoryId to product_categories for consistency
        await storage.setProductCategories(product.id, [product.categoryId]);
      }
      
      // Auto-create variants — bedensiz mantık (Polen Stone: ev ürünleri)
      const sizes = product.availableSizes || [];
      const colors = product.availableColors || [];
      const baseSku = product.sku || '';
      const stockValue = initialStock ? parseInt(initialStock, 10) : 0;

      if (sizes.length > 0 && colors.length > 0) {
        // Eski mantık: hem beden hem renk varsa kombinasyon
        for (const size of sizes) {
          for (const color of colors as Array<{name: string, hex: string}>) {
            const variantSku = baseSku ? `${baseSku}-${size}` : null;
            await storage.createProductVariant({
              productId: product.id,
              size,
              color: color.name,
              sku: variantSku,
              stock: stockValue,
              price: product.basePrice,
            });
          }
        }
      } else if (sizes.length > 0) {
        for (const size of sizes) {
          const variantSku = baseSku ? `${baseSku}-${size}` : null;
          await storage.createProductVariant({
            productId: product.id,
            size,
            color: null,
            sku: variantSku,
            stock: stockValue,
            price: product.basePrice,
          });
        }
      } else if (colors.length > 0) {
        // Bedensiz, sadece renk(ler): her renk için bir varyant
        for (const color of colors as Array<{name: string, hex: string}>) {
          await storage.createProductVariant({
            productId: product.id,
            size: null,
            color: color.name,
            sku: baseSku || null,
            stock: stockValue,
            price: product.basePrice,
          });
        }
      } else {
        // Bedensiz ve renksiz: tek default varyant (stok yönetimine gözüksün diye)
        await storage.createProductVariant({
          productId: product.id,
          size: null,
          color: null,
          sku: baseSku || null,
          stock: stockValue,
          price: product.basePrice,
        });
      }

      // Return product with categoryIds
      const productCategoryIds = await storage.getProductCategoryIds(product.id);
      res.status(201).json({ ...product, categoryIds: productCategoryIds });
    } catch (error) {
      console.error('Product creation error:', error);
      res.status(400).json({ error: "Invalid product data" });
    }
  });

  app.patch("/api/admin/products/:id", requireAdmin, async (req, res) => {
    try {
      const { categoryIds, ...productData } = req.body;
      console.log('Updating product:', req.params.id, 'with data:', JSON.stringify(productData, null, 2));
      const product = await storage.updateProduct(req.params.id, productData);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      
      // Auto-create missing variants
      const sizes = product.availableSizes || [];
      const colors = product.availableColors || [];
      const baseSku = product.sku || '';
      const existingVariants = await storage.getProductVariants(product.id);

      if (sizes.length > 0 && colors.length > 0) {
        for (const size of sizes) {
          for (const color of colors as Array<{name: string, hex: string}>) {
            const exists = existingVariants.some(v => v.size === size && v.color === color.name);
            if (!exists) {
              const variantSku = baseSku ? `${baseSku}-${size}` : null;
              await storage.createProductVariant({
                productId: product.id,
                size,
                color: color.name,
                sku: variantSku,
                stock: 0,
                price: product.basePrice,
              });
            }
          }
        }
      } else if (sizes.length > 0) {
        for (const size of sizes) {
          const exists = existingVariants.some(v => v.size === size && !v.color);
          if (!exists) {
            const variantSku = baseSku ? `${baseSku}-${size}` : null;
            await storage.createProductVariant({
              productId: product.id,
              size,
              color: null,
              sku: variantSku,
              stock: 0,
              price: product.basePrice,
            });
          }
        }
      } else if (colors.length > 0) {
        for (const color of colors as Array<{name: string, hex: string}>) {
          const exists = existingVariants.some(v => !v.size && v.color === color.name);
          if (!exists) {
            await storage.createProductVariant({
              productId: product.id,
              size: null,
              color: color.name,
              sku: baseSku || null,
              stock: 0,
              price: product.basePrice,
            });
          }
        }
      } else if (existingVariants.length === 0) {
        // Hiç varyant yoksa default tek varyant oluştur (stok yönetimi için)
        await storage.createProductVariant({
          productId: product.id,
          size: null,
          color: null,
          sku: baseSku || null,
          stock: 0,
          price: product.basePrice,
        });
      }

      // Update product categories (multi-category support)
      if (categoryIds && Array.isArray(categoryIds)) {
        await storage.setProductCategories(product.id, categoryIds);
      }
      
      console.log('Updated product result:', JSON.stringify(product, null, 2));
      
      // Return product with categoryIds
      const productCategoryIds = await storage.getProductCategoryIds(product.id);
      res.json({ ...product, categoryIds: productCategoryIds });
    } catch (error) {
      console.error('Product update error:', error);
      res.status(400).json({ error: "Failed to update product" });
    }
  });

  app.delete("/api/admin/products/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteProduct(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error('[Products] Delete product error:', error.message || error);
      res.status(500).json({ error: "Failed to delete product" });
    }
  });

  // Bulk price update by category
  app.post("/api/admin/products/bulk-price", requireAdmin, async (req, res) => {
    try {
      const { categoryId, productIds, action, value, autoBadge, badgeText } = req.body;
      
      if (!action || value === undefined || value === null) {
        return res.status(400).json({ error: "action and value are required" });
      }

      const numericValue = parseFloat(String(value));
      if (isNaN(numericValue) || numericValue < 0) {
        return res.status(400).json({ error: "Geçersiz değer" });
      }

      const allProducts = await storage.getProducts();

      let targetProducts;
      if (productIds && Array.isArray(productIds) && productIds.length > 0) {
        // Specific product IDs selected
        const idSet = new Set(productIds);
        targetProducts = allProducts.filter(p => idSet.has(p.id));
      } else if (categoryId) {
        // Category filter
        targetProducts = allProducts.filter(p => p.categoryId === categoryId);
      } else {
        // All products
        targetProducts = allProducts;
      }
      
      if (targetProducts.length === 0) {
        return res.status(400).json({ error: "Ürün bulunamadı" });
      }
      
      let updated = 0;
      
      for (const product of targetProducts) {
        const currentPrice = parseFloat(product.basePrice);
        if (isNaN(currentPrice)) continue;

        let newPrice: number;
        
        switch (action) {
          case 'set':
            newPrice = numericValue;
            break;
          case 'increase':
            newPrice = currentPrice + numericValue;
            break;
          case 'decrease':
            newPrice = Math.max(0, currentPrice - numericValue);
            break;
          case 'percent_increase':
            newPrice = currentPrice * (1 + numericValue / 100);
            break;
          case 'percent_decrease':
            newPrice = currentPrice * (1 - numericValue / 100);
            break;
          default:
            continue;
        }
        
        // Round to 2 decimal places
        newPrice = Math.round(newPrice * 100) / 100;
        
        const updateData: any = { basePrice: String(newPrice) };
        if (autoBadge && badgeText) {
          updateData.discountBadge = badgeText;
        }
        await storage.updateProduct(product.id, updateData);
        updated++;
      }
      
      res.json({ success: true, updated });
    } catch (error) {
      console.error('Bulk price update error:', error);
      res.status(500).json({ error: "Toplu fiyat güncellemesi başarısız" });
    }
  });

  app.post("/api/admin/products/bulk-badge", requireAdmin, async (req, res) => {
    try {
      const { productIds, badge } = req.body;
      
      if (!productIds || !Array.isArray(productIds)) {
        return res.status(400).json({ error: "productIds array is required" });
      }
      
      let updated = 0;
      for (const id of productIds) {
        await storage.updateProduct(id, { discountBadge: badge || null });
        updated++;
      }
      
      res.json({ success: true, updated });
    } catch (error) {
      console.error('Bulk badge update error:', error);
      res.status(500).json({ error: "Toplu etiket güncellemesi başarısız" });
    }
  });

  // Delete all products (for WooCommerce re-import)
  app.delete("/api/admin/products-all", requireAdmin, async (req, res) => {
    try {
      const result = await storage.deleteAllProducts();
      
      // Delete image files
      for (const imagePath of result.imagePaths) {
        try {
          const fullPath = path.join(process.cwd(), 'client/public', imagePath);
          if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
          }
        } catch (fileError) {
          console.error(`Failed to delete image: ${imagePath}`, fileError);
        }
      }
      
      res.json({ 
        success: true, 
        deletedProducts: result.deletedProducts,
        deletedVariants: result.deletedVariants,
        deletedImages: result.imagePaths.length
      });
    } catch (error: any) {
      console.error('Delete all products error:', error);
      res.status(500).json({ error: error.message || "Failed to delete products" });
    }
  });

  // Product Variants API
  app.get("/api/products/:productId/variants", async (req, res) => {
    try {
      const variants = await storage.getProductVariants(req.params.productId);
      res.json(variants);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch variants" });
    }
  });

  app.post("/api/admin/products/:productId/variants", requireAdmin, async (req, res) => {
    try {
      const validated = insertProductVariantSchema.parse({
        ...req.body,
        productId: req.params.productId,
      });
      const variant = await storage.createProductVariant(validated);
      res.status(201).json(variant);
    } catch (error) {
      res.status(400).json({ error: "Invalid variant data" });
    }
  });

  app.patch("/api/admin/variants/:id", requireAdmin, async (req, res) => {
    try {
      const variant = await storage.updateProductVariant(req.params.id, req.body);
      if (!variant) {
        return res.status(404).json({ error: "Variant not found" });
      }
      res.json(variant);
    } catch (error) {
      res.status(400).json({ error: "Failed to update variant" });
    }
  });

  app.delete("/api/admin/variants/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteProductVariant(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete variant" });
    }
  });

  // Cart API
  app.get("/api/cart", async (req: Request, res) => {
    try {
      const cartToken = getOrCreateCartToken(req, res);
      const items = await storage.getCartItems(cartToken);
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch cart" });
    }
  });

  app.post("/api/cart", async (req: Request, res) => {
    try {
      const cartToken = getOrCreateCartToken(req, res);
      const { productId, variantId: rawVariantId, quantity } = req.body;

      const product = await storage.getProduct(productId);
      if (!product) {
        return res.status(400).json({ error: "Geçersiz ürün" });
      }

      // Polen Stone artık varyantsız (her ürün tek başına). Eğer client variant
      // göndermediyse ürünün ilk aktif & stoklu varyantını otomatik seçeriz —
      // böylece "Lütfen beden seçimi yapın" hatası alınmaz ve stok yine
      // varyant bazlı olarak doğru düşer.
      let variantId: string | null = rawVariantId ?? null;
      let resolvedVariant = variantId ? await storage.getProductVariant(variantId) : null;

      if (variantId && !resolvedVariant) {
        return res.status(400).json({ error: "Geçersiz varyant seçimi" });
      }
      if (resolvedVariant && resolvedVariant.productId !== productId) {
        return res.status(400).json({ error: "Geçersiz varyant" });
      }

      if (!resolvedVariant) {
        const variants = await storage.getProductVariants(productId);
        const candidate = variants.find(v => v.isActive && (v.stock ?? 0) > 0)
          ?? variants.find(v => (v.stock ?? 0) > 0);
        if (candidate) {
          resolvedVariant = candidate;
          variantId = candidate.id;
        }
      }

      // Stok kontrolü: hem variant hem toplam ürün bazlı.
      if (resolvedVariant && (resolvedVariant.stock ?? 0) <= 0) {
        return res.status(400).json({ error: "Ürün stokta yok" });
      }
      if (!resolvedVariant) {
        // Hiç variant yoksa ürün public'te de gösterilmemeli; güvenlik için engelle.
        return res.status(400).json({ error: "Ürün stokta yok" });
      }

      const validated = insertCartItemSchema.parse({
        productId,
        variantId,
        quantity: quantity || 1,
        sessionId: cartToken,
      });
      const item = await storage.addToCart(validated);
      res.status(201).json(item);
    } catch (error) {
      console.error('Add to cart error:', error);
      res.status(400).json({ error: "Sepete eklenemedi" });
    }
  });

  app.patch("/api/cart/:id", async (req, res) => {
    try {
      const { quantity } = req.body;
      const item = await storage.updateCartItem(req.params.id, quantity);
      if (!item) {
        return res.status(404).json({ error: "Cart item not found" });
      }
      res.json(item);
    } catch (error) {
      res.status(400).json({ error: "Failed to update cart item" });
    }
  });

  app.delete("/api/cart/:id", async (req, res) => {
    try {
      await storage.removeFromCart(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to remove from cart" });
    }
  });

  app.delete("/api/cart", async (req: Request, res) => {
    try {
      const cartToken = getOrCreateCartToken(req, res);
      await storage.clearCart(cartToken);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to clear cart" });
    }
  });

  // Favorites API
  app.get("/api/favorites", async (req: Request, res) => {
    try {
      const payload = await getAuthPayload(req, res);
      const userId = payload?.type === 'user' ? payload.userId : null;
      if (!userId) {
        return res.status(401).json({ error: "Please login to view favorites" });
      }
      const favoriteProducts = await storage.getFavoriteProducts(userId);
      res.json(favoriteProducts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch favorites" });
    }
  });

  app.get("/api/favorites/ids", async (req: Request, res) => {
    try {
      const payload = await getAuthPayload(req, res);
      const userId = payload?.type === 'user' ? payload.userId : null;
      if (!userId) {
        return res.json([]);
      }
      const ids = await storage.getUserFavoriteProductIds(userId);
      res.json(ids);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch favorite ids" });
    }
  });

  app.get("/api/favorites/:productId/check", async (req: Request, res) => {
    try {
      const payload = await getAuthPayload(req, res);
      const userId = payload?.type === 'user' ? payload.userId : null;
      if (!userId) {
        return res.json({ isFavorite: false });
      }
      const isFavorite = await storage.isFavorite(userId, req.params.productId);
      res.json({ isFavorite });
    } catch (error) {
      res.status(500).json({ error: "Failed to check favorite status" });
    }
  });

  app.post("/api/favorites/:productId", async (req: Request, res) => {
    try {
      const payload = await getAuthPayload(req, res);
      const userId = payload?.type === 'user' ? payload.userId : null;
      if (!userId) {
        return res.status(401).json({ error: "Please login to add favorites" });
      }
      const favorite = await storage.addFavorite({ userId, productId: req.params.productId });
      res.status(201).json(favorite);
    } catch (error) {
      res.status(500).json({ error: "Failed to add favorite" });
    }
  });

  app.delete("/api/favorites/:productId", async (req: Request, res) => {
    try {
      const payload = await getAuthPayload(req, res);
      const userId = payload?.type === 'user' ? payload.userId : null;
      if (!userId) {
        return res.status(401).json({ error: "Please login to remove favorites" });
      }
      await storage.removeFavorite(userId, req.params.productId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to remove favorite" });
    }
  });

  // Reviews API
  app.get("/api/config/captcha", async (_req, res) => {
    try {
      const fromDb = (await storage.getSiteSetting('turnstile_site_key')) || '';
      const siteKey = fromDb.trim() || process.env.TURNSTILE_SITE_KEY || '';
      res.json({ provider: 'turnstile', siteKey });
    } catch (err) {
      console.error('[Captcha] config lookup failed:', err);
      res.json({ provider: 'turnstile', siteKey: process.env.TURNSTILE_SITE_KEY || '' });
    }
  });

  app.get("/api/products/:productId/reviews", async (req, res) => {
    try {
      const reviews = await storage.getProductReviews(req.params.productId);
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reviews" });
    }
  });

  app.get("/api/products/:productId/rating", async (req, res) => {
    try {
      const rating = await storage.getProductAverageRating(req.params.productId);
      res.json(rating);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch rating" });
    }
  });

  app.post("/api/products/:productId/reviews", async (req: Request, res) => {
    try {
      const payload = await getAuthPayload(req, res);
      const userId = payload?.type === 'user' ? payload.userId : null;

      const { rating, title, content, guestName, guestEmail, captchaToken } = req.body || {};

      if (typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 5) {
        return res.status(400).json({ error: "Lütfen 1 ile 5 arasında bir puan seçin." });
      }

      const cleanTitle = typeof title === 'string' ? title.trim().slice(0, 200) : '';
      const cleanContent = typeof content === 'string' ? content.trim().slice(0, 4000) : '';

      // Ürün gerçekten var mı?
      const product = await storage.getProduct(req.params.productId);
      if (!product) {
        return res.status(404).json({ error: "Ürün bulunamadı." });
      }

      if (userId) {
        // Üye yorumu — captcha bypass, çift yorum kontrolü
        const existingReview = await storage.getUserReview(userId, req.params.productId);
        if (existingReview) {
          return res.status(400).json({ error: "Bu ürün için zaten bir değerlendirme yazdınız." });
        }

        const review = await storage.createReview({
          productId: req.params.productId,
          userId,
          guestName: null,
          guestEmail: null,
          rating,
          title: cleanTitle || null,
          content: cleanContent || null,
        });

        // Bildirim — admin'e yeni yorum bekliyor
        const user = await storage.getUser(userId);
        const author = user
          ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
          : 'Üye';
        notifyAdminNewReview({
          productName: product.name,
          productSlug: product.slug,
          authorName: author,
          authorEmail: user?.email || null,
          rating,
          title: cleanTitle || null,
          content: cleanContent || null,
          isGuest: false,
        }).catch(err => console.error('[Reviews] notify admin failed:', err));

        return res.status(201).json({
          ...review,
          message: "Yorumunuz alındı, onay sonrası ürün sayfasında görünecektir.",
        });
      }

      // Misafir yorumu — captcha + form alan zorunluluğu
      const trimmedName = typeof guestName === 'string' ? guestName.trim().slice(0, 100) : '';
      const trimmedEmail = typeof guestEmail === 'string' ? guestEmail.trim().toLowerCase().slice(0, 200) : '';

      if (!trimmedName || trimmedName.length < 2) {
        return res.status(400).json({ error: "Lütfen adınızı yazın." });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        return res.status(400).json({ error: "Lütfen geçerli bir e-posta adresi girin." });
      }

      const captcha = await verifyTurnstile(captchaToken, getClientIp(req));
      if (!captcha.success) {
        return res.status(400).json({
          error: captcha.error || "Captcha doğrulaması başarısız. Lütfen tekrar deneyin.",
        });
      }

      // 24 saat içinde aynı e-postadan aynı ürüne tekrar
      const recent = await storage.getRecentGuestReview(
        trimmedEmail,
        req.params.productId,
        24 * 60 * 60 * 1000,
      );
      if (recent) {
        return res.status(400).json({
          error: "Bu ürün için son 24 saat içinde zaten bir değerlendirme gönderdiniz. Onay sürecini bekleyin.",
        });
      }

      const review = await storage.createReview({
        productId: req.params.productId,
        userId: null,
        guestName: trimmedName,
        guestEmail: trimmedEmail,
        rating,
        title: cleanTitle || null,
        content: cleanContent || null,
      });

      // Bildirim — admin'e yeni misafir yorumu bekliyor
      notifyAdminNewReview({
        productName: product.name,
        productSlug: product.slug,
        authorName: trimmedName,
        authorEmail: trimmedEmail,
        rating,
        title: cleanTitle || null,
        content: cleanContent || null,
        isGuest: true,
      }).catch(err => console.error('[Reviews] notify admin failed:', err));

      return res.status(201).json({
        ...review,
        message: "Yorumunuz alındı, onay sonrası ürün sayfasında görünecektir.",
      });
    } catch (error) {
      console.error('[Reviews] create error:', error);
      res.status(500).json({ error: "Yorum gönderilemedi. Lütfen tekrar deneyin." });
    }
  });

  // ─── Admin Reviews ──────────────────────────────────────────────────────
  app.get("/api/admin/reviews", requireAdmin, async (req, res) => {
    try {
      const status = (req.query.status as string) || 'pending';
      const filter = ['pending', 'approved', 'rejected', 'all'].includes(status)
        ? (status as 'pending' | 'approved' | 'rejected' | 'all')
        : 'pending';
      const reviews = await storage.getAdminReviews(filter);
      res.json(reviews);
    } catch (error) {
      console.error('[Admin Reviews] list error:', error);
      res.status(500).json({ error: "Yorumlar getirilemedi" });
    }
  });

  app.get("/api/admin/reviews/pending-count", requireAdmin, async (_req, res) => {
    try {
      const count = await storage.getPendingReviewsCount();
      res.json({ count });
    } catch (error) {
      console.error('[Admin Reviews] pending count error:', error);
      res.json({ count: 0 });
    }
  });

  app.post("/api/admin/reviews/:id/approve", requireAdmin, async (req, res) => {
    try {
      const adminId = getAdminId(req);
      const review = await storage.getReviewById(req.params.id);
      if (!review) return res.status(404).json({ error: "Yorum bulunamadı" });

      const updated = await storage.approveReview(req.params.id, adminId);

      // Misafir e-postası varsa bilgilendir
      if (review.guestEmail) {
        try {
          const product = await storage.getProduct(review.productId);
          if (product) {
            sendGuestReviewApprovedEmail({
              to: review.guestEmail,
              guestName: review.guestName || 'Değerli müşterimiz',
              productName: product.name,
              productSlug: product.slug,
              rating: review.rating,
            }).catch(err => console.error('[Reviews] approval email failed:', err));
          }
        } catch (err) {
          console.error('[Reviews] product lookup for approval email failed:', err);
        }
      }

      res.json(updated);
    } catch (error) {
      console.error('[Admin Reviews] approve error:', error);
      res.status(500).json({ error: "Yorum onaylanamadı" });
    }
  });

  app.post("/api/admin/reviews/:id/reject", requireAdmin, async (req, res) => {
    try {
      const adminId = getAdminId(req);
      const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim().slice(0, 500) : '';
      if (!reason) {
        return res.status(400).json({ error: "Lütfen reddetme nedenini belirtin." });
      }
      const review = await storage.getReviewById(req.params.id);
      if (!review) return res.status(404).json({ error: "Yorum bulunamadı" });

      const updated = await storage.rejectReview(req.params.id, reason, adminId);

      if (review.guestEmail && review.guestName) {
        const product = await storage.getProduct(review.productId);
        if (product) {
          sendGuestReviewRejectedEmail({
            to: review.guestEmail,
            guestName: review.guestName,
            productName: product.name,
            reason,
          }).catch(err => console.error('[Admin Reviews] guest reject email failed:', err));
        }
      }

      res.json(updated);
    } catch (error) {
      console.error('[Admin Reviews] reject error:', error);
      res.status(500).json({ error: "Yorum reddedilemedi" });
    }
  });

  app.delete("/api/admin/reviews/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteReview(req.params.id);
      res.json({ ok: true });
    } catch (error) {
      console.error('[Admin Reviews] delete error:', error);
      res.status(500).json({ error: "Yorum silinemedi" });
    }
  });

  app.get("/api/products/:productId/my-review", async (req: Request, res) => {
    try {
      const payload = await getAuthPayload(req, res);
      const userId = payload?.type === 'user' ? payload.userId : null;
      if (!userId) {
        return res.json(null);
      }
      const review = await storage.getUserReview(userId, req.params.productId);
      res.json(review || null);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch review" });
    }
  });

  // iyzico Payment API
  app.post("/api/payment/create", async (req: Request, res) => {
    try {
      const cartToken = getOrCreateCartToken(req, res);
      const payload = await getAuthPayload(req, res);
      const userId = payload?.type === 'user' ? payload.userId ?? null : null;
      const cartItems = await storage.getCartItems(cartToken);
      
      if (cartItems.length === 0) {
        return res.status(400).json({ error: "Sepet boş" });
      }

      const { customerName, customerEmail, customerPhone, address, city, district, postalCode, country, couponCode, createAccount, accountPassword } = req.body;
      const selectedCountry = country || 'Türkiye';

      // Validate required fields
      if (!customerName || !customerEmail || !customerPhone || !address || !city || !district) {
        return res.status(400).json({ error: "Lütfen tüm alanları doldurun" });
      }

      // Validate password if creating account
      let accountPasswordHash = null;
      if (createAccount && accountPassword) {
        if (accountPassword.length < 6) {
          return res.status(400).json({ error: "Şifre en az 6 karakter olmalı" });
        }
        // Check if email already exists
        const existingUser = await storage.getUserByEmail(customerEmail);
        if (existingUser) {
          return res.status(400).json({ error: "Bu e-posta adresi zaten kayıtlı. Giriş yaparak devam edebilirsiniz." });
        }
        accountPasswordHash = await bcrypt.hash(accountPassword, 10);
      }

      // Calculate actual subtotal from cart items (server-side verification)
      let serverSubtotal = 0;
      const cartItemsForStorage: Array<{
        productId: string;
        variantId: string | null;
        quantity: number;
        productName: string;
        variantDetails: string | null;
        price: string;
      }> = [];

      const iyzicoBasketItems: IyzicoBasketItem[] = [];

      for (const cartItem of cartItems) {
        const variant = cartItem.variantId 
          ? await storage.getProductVariant(cartItem.variantId)
          : null;
        
        // If variant exists, get the product from variant's productId to ensure consistency
        const actualProductId = variant?.productId || cartItem.productId;
        const product = await storage.getProduct(actualProductId);
        
        if (product) {
          const itemPrice = parseFloat(product.basePrice);
          serverSubtotal += itemPrice * cartItem.quantity;
          
          cartItemsForStorage.push({
            productId: product.id,
            variantId: variant?.id || null,
            quantity: cartItem.quantity,
            productName: product.name,
            variantDetails: variant ? `${variant.size || ''} ${variant.color || ''}`.trim() : null,
            price: product.basePrice,
          });

          // iyzico basket: one row per unit so sum(basketItems.price) === price
          for (let qi = 0; qi < cartItem.quantity; qi++) {
            iyzicoBasketItems.push({
              id: `${product.id}-${variant?.id || 'base'}-${qi}`,
              name: product.name.substring(0, 250),
              category1: 'Doğal Taş',
              category2: 'Mermer',
              itemType: 'PHYSICAL',
              price: itemPrice.toFixed(2),
            });
          }
        }
      }

      // Handle coupon validation
      let validatedCoupon = null;
      let discountAmount = 0;
      let couponFreeShipping = false;
      
      if (couponCode) {
        const couponResult = await storage.validateCoupon(couponCode, serverSubtotal, userId || undefined);
        if (couponResult.valid && couponResult.coupon) {
          validatedCoupon = couponResult.coupon;
          couponFreeShipping = validatedCoupon.freeShipping || false;
          if (validatedCoupon.discountType === 'percentage') {
            discountAmount = (serverSubtotal * parseFloat(validatedCoupon.discountValue)) / 100;
          } else {
            discountAmount = parseFloat(validatedCoupon.discountValue);
          }
          if (validatedCoupon.maxDiscountAmount) {
            discountAmount = Math.min(discountAmount, parseFloat(validatedCoupon.maxDiscountAmount));
          }
          discountAmount = Math.min(discountAmount, serverSubtotal);
        }
      }

      // Calculate shipping and total
      const FREE_SHIPPING_THRESHOLD = 2500;
      const DOMESTIC_SHIPPING_COST = 200;
      const INTERNATIONAL_SHIPPING_COST = 2500;
      const IRAQ_SHIPPING_COST = 5700;
      
      const isDomestic = selectedCountry === 'Türkiye';
      const isIraq = selectedCountry === 'Irak';
      let shippingCost = isDomestic 
        ? (serverSubtotal >= FREE_SHIPPING_THRESHOLD ? 0 : DOMESTIC_SHIPPING_COST)
        : isIraq ? IRAQ_SHIPPING_COST : INTERNATIONAL_SHIPPING_COST;
      
      if (couponFreeShipping) {
        shippingCost = 0;
      }

      if (validatedCoupon?.appliesToShipping && shippingCost > 0) {
        const totalWithShipping = serverSubtotal + shippingCost;
        if (validatedCoupon.discountType === 'percentage') {
          discountAmount = (totalWithShipping * parseFloat(validatedCoupon.discountValue)) / 100;
        } else {
          discountAmount = parseFloat(validatedCoupon.discountValue);
        }
        if (validatedCoupon.maxDiscountAmount) {
          discountAmount = Math.min(discountAmount, parseFloat(validatedCoupon.maxDiscountAmount));
        }
        discountAmount = Math.min(discountAmount, totalWithShipping);
      }

      const serverTotal = Math.max(0, serverSubtotal - discountAmount + shippingCost);

      // Generate unique merchant order ID
      const merchantOid = `PLN${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

      // Get user IP
      const userIp = req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || 
                     req.socket.remoteAddress || 
                     '127.0.0.1';

      // Get base URL for callback - use production domain in prod
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? (process.env.PUBLIC_BASE_URL || 'https://polenstone.com')
        : `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host || 'localhost:5000'}`;

      // Add shipping as a basket line so sum(basketItems.price) === priceTry
      if (shippingCost > 0) {
        iyzicoBasketItems.push({
          id: `shipping-${merchantOid}`,
          name: 'Kargo',
          category1: 'Kargo',
          itemType: 'VIRTUAL',
          price: shippingCost.toFixed(2),
        });
      }

      // iyzico requires sum(basketItems.price) === price (pre-discount).
      // paidPrice is the actual amount charged. discount is implicit in (price - paidPrice).
      const priceTry = (serverSubtotal + shippingCost).toFixed(2);
      const paidPriceTry = serverTotal.toFixed(2);

      // Split customer name -> name/surname for iyzico
      const nameParts = customerName.trim().split(/\s+/);
      const firstName = nameParts[0] || customerName;
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : firstName;

      // Phone normalization: only auto-prefix +90 for Türkiye orders.
      // International phones are kept as-is (or just +-prefixed) so iyzico can validate them.
      let gsmNumber = customerPhone.trim();
      if (!gsmNumber.startsWith('+')) {
        if (selectedCountry === 'Türkiye') {
          gsmNumber = `+90${gsmNumber.replace(/^0/, '')}`;
        } else {
          gsmNumber = `+${gsmNumber.replace(/^0+/, '')}`;
        }
      }

      // Create pending payment record
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1); // Expires in 1 hour

      await storage.createPendingPayment({
        merchantOid,
        sessionId: cartToken,
        customerName,
        customerEmail,
        customerPhone,
        shippingAddress: { address, city, district, postalCode: postalCode || '', country: selectedCountry },
        cartItems: cartItemsForStorage,
        subtotal: serverSubtotal.toFixed(2),
        shippingCost: shippingCost.toFixed(2),
        discountAmount: discountAmount.toFixed(2),
        couponCode: validatedCoupon?.code || null,
        total: serverTotal.toFixed(2),
        status: 'pending',
        paymentToken: null,
        iyzicoPaymentId: null,
        createAccount: createAccount || false,
        accountPasswordHash: accountPasswordHash,
        clientIp: userIp,
        clientUserAgent: req.headers['user-agent'] || '',
        expiresAt,
      });

      if (!(await isIyzicoConfigured())) {
        await storage.deletePendingPayment(merchantOid);
        console.error('[iyzico] API anahtarları yapılandırılmamış. Admin Paneli → Ayarlar → iyzico bölümünden ekleyin.');
        return res.status(500).json({
          error: 'Ödeme sistemi henüz yapılandırılmadı. Lütfen daha sonra tekrar deneyin.',
        });
      }

      // Initialize iyzico Checkout Form
      const iyzicoResp = await createCheckoutFormInitialize({
        conversationId: merchantOid,
        price: priceTry,
        paidPrice: paidPriceTry,
        currency: 'TRY',
        basketId: merchantOid,
        callbackUrl: `${baseUrl}/api/payment/iyzico/callback`,
        enabledInstallments: [1],
        buyer: {
          id: cartToken.substring(0, 64),
          name: firstName,
          surname: lastName,
          gsmNumber,
          email: customerEmail,
          identityNumber: '11111111111',
          registrationAddress: `${address}, ${district}, ${city}`,
          city: city,
          country: selectedCountry,
          ip: userIp,
          zipCode: postalCode || undefined,
        },
        shippingAddress: {
          contactName: customerName,
          city: city,
          country: selectedCountry,
          address: `${address}, ${district}`,
          zipCode: postalCode || undefined,
        },
        billingAddress: {
          contactName: customerName,
          city: city,
          country: selectedCountry,
          address: `${address}, ${district}`,
          zipCode: postalCode || undefined,
        },
        basketItems: iyzicoBasketItems,
      });

      if (iyzicoResp.status === 'success' && iyzicoResp.token) {
        await storage.updatePendingPaymentToken(merchantOid, iyzicoResp.token);
        await storage.updatePendingPaymentStatus(merchantOid, 'token_received');

        res.json({
          success: true,
          token: iyzicoResp.token,
          merchantOid,
          checkoutFormContent: iyzicoResp.checkoutFormContent,
          paymentPageUrl: iyzicoResp.paymentPageUrl,
        });
      } else {
        await storage.deletePendingPayment(merchantOid);
        console.error('[iyzico] Checkout form init failed:', iyzicoResp.errorCode, iyzicoResp.errorMessage);
        res.status(400).json({
          error: iyzicoResp.errorMessage || 'Ödeme sistemi bağlantısı kurulamadı. Lütfen daha sonra tekrar deneyin.',
        });
      }
    } catch (error) {
      console.error('[iyzico] Payment creation error:', error);
      res.status(500).json({ error: "Ödeme işlemi başlatılamadı" });
    }
  });

  // ── Havale (Bank Transfer) Ödeme ──────────────────────────────────────
  // Müşteri havale (EFT) seçtiğinde sepet doğrulanır, %10 indirim uygulanır,
  // sipariş 'pending' / 'awaiting_transfer' olarak oluşturulur. Stok düşmez,
  // iyzico'ya gidilmez. Admin onayında stok düşer, kupon redeem edilir,
  // standart sipariş onay e-posta + WhatsApp tetiklenir.
  app.post("/api/payment/bank-transfer", async (req: Request, res) => {
    try {
      const cartToken = getOrCreateCartToken(req, res);
      const payload = await getAuthPayload(req, res);
      const userId = payload?.type === 'user' ? payload.userId ?? null : null;
      const cartItems = await storage.getCartItems(cartToken);

      if (cartItems.length === 0) {
        return res.status(400).json({ error: "Sepet boş" });
      }

      const { customerName, customerEmail, customerPhone, address, city, district, postalCode, country, couponCode, createAccount, accountPassword } = req.body;
      const selectedCountry = country || 'Türkiye';

      if (!customerName || !customerEmail || !customerPhone || !address || !city || !district) {
        return res.status(400).json({ error: "Lütfen tüm alanları doldurun" });
      }

      let accountPasswordHash: string | null = null;
      if (createAccount && accountPassword) {
        if (accountPassword.length < 6) {
          return res.status(400).json({ error: "Şifre en az 6 karakter olmalı" });
        }
        const existingUser = await storage.getUserByEmail(customerEmail);
        if (existingUser) {
          return res.status(400).json({ error: "Bu e-posta adresi zaten kayıtlı. Giriş yaparak devam edebilirsiniz." });
        }
        accountPasswordHash = await bcrypt.hash(accountPassword, 10);
      }

      // Server-side cart validation
      let serverSubtotal = 0;
      const cartItemsForOrder: Array<{
        productId: string;
        variantId: string | null;
        quantity: number;
        productName: string;
        variantDetails: string | null;
        price: string;
      }> = [];

      for (const cartItem of cartItems) {
        const variant = cartItem.variantId
          ? await storage.getProductVariant(cartItem.variantId)
          : null;
        const actualProductId = variant?.productId || cartItem.productId;
        const product = await storage.getProduct(actualProductId);
        if (product) {
          const itemPrice = parseFloat(product.basePrice);
          serverSubtotal += itemPrice * cartItem.quantity;
          cartItemsForOrder.push({
            productId: product.id,
            variantId: variant?.id || null,
            quantity: cartItem.quantity,
            productName: product.name,
            variantDetails: variant ? `${variant.size || ''} ${variant.color || ''}`.trim() : null,
            price: product.basePrice,
          });
        }
      }

      // Coupon validation
      let validatedCoupon = null;
      let couponDiscount = 0;
      let couponFreeShipping = false;
      if (couponCode) {
        const couponResult = await storage.validateCoupon(couponCode, serverSubtotal, userId || undefined);
        if (couponResult.valid && couponResult.coupon) {
          validatedCoupon = couponResult.coupon;
          couponFreeShipping = validatedCoupon.freeShipping || false;
          if (validatedCoupon.discountType === 'percentage') {
            couponDiscount = (serverSubtotal * parseFloat(validatedCoupon.discountValue)) / 100;
          } else {
            couponDiscount = parseFloat(validatedCoupon.discountValue);
          }
          if (validatedCoupon.maxDiscountAmount) {
            couponDiscount = Math.min(couponDiscount, parseFloat(validatedCoupon.maxDiscountAmount));
          }
          couponDiscount = Math.min(couponDiscount, serverSubtotal);
        }
      }

      // Shipping
      const FREE_SHIPPING_THRESHOLD = 2500;
      const DOMESTIC_SHIPPING_COST = 200;
      const INTERNATIONAL_SHIPPING_COST = 2500;
      const IRAQ_SHIPPING_COST = 5700;
      const isDomestic = selectedCountry === 'Türkiye';
      const isIraq = selectedCountry === 'Irak';
      let shippingCost = isDomestic
        ? (serverSubtotal >= FREE_SHIPPING_THRESHOLD ? 0 : DOMESTIC_SHIPPING_COST)
        : isIraq ? IRAQ_SHIPPING_COST : INTERNATIONAL_SHIPPING_COST;
      if (couponFreeShipping) shippingCost = 0;

      // Bank transfer 10% discount applies to (subtotal - couponDiscount + shippingCost)
      const baseAfterCoupon = Math.max(0, serverSubtotal - couponDiscount) + shippingCost;
      const bankTransferDiscount = Math.round(baseAfterCoupon * BANK_TRANSFER_DISCOUNT_RATE * 100) / 100;
      const totalDiscount = couponDiscount + bankTransferDiscount;
      const serverTotal = Math.max(0, serverSubtotal - totalDiscount + shippingCost);

      const orderNumber = `PLN${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

      // Optional account creation
      if (createAccount && accountPasswordHash) {
        try {
          const nameParts = customerName.trim().split(/\s+/);
          await storage.createUser({
            email: customerEmail,
            password: accountPasswordHash,
            firstName: nameParts[0] || customerName,
            lastName: nameParts.length > 1 ? nameParts.slice(1).join(' ') : '',
            phone: customerPhone,
          });
        } catch (err) {
          console.error('[bank-transfer] Account auto-create failed:', err);
        }
      }

      const order = await storage.createOrder({
        orderNumber,
        customerName,
        customerEmail,
        customerPhone,
        shippingAddress: { address, city, district, postalCode: postalCode || '', country: selectedCountry },
        subtotal: serverSubtotal.toFixed(2),
        shippingCost: shippingCost.toFixed(2),
        discountAmount: totalDiscount.toFixed(2),
        couponCode: validatedCoupon?.code || null,
        total: serverTotal.toFixed(2),
        status: 'pending',
        paymentMethod: 'bank_transfer',
        paymentStatus: 'awaiting_transfer',
      });

      // Create order items but DO NOT reduce stock yet — admin must confirm transfer first.
      for (const item of cartItemsForOrder) {
        await storage.createOrderItem({
          orderId: order.id,
          productId: item.productId,
          variantId: item.variantId,
          productName: item.productName,
          variantDetails: item.variantDetails,
          price: item.price,
          quantity: item.quantity,
          subtotal: (parseFloat(item.price) * item.quantity).toFixed(2),
        });
      }

      // Clear cart so user doesn't accidentally re-checkout
      await storage.clearCart(cartToken);

      // Notifications (best-effort)
      const orderItems = await storage.getOrderItems(order.id);
      sendBankTransferPendingEmail(order, orderItems).catch(err => console.error('[Email] Bank transfer pending email failed:', err));
      sendAdminOrderNotificationEmail(order, orderItems).catch(err => console.error('[Email] Admin notification (bank transfer) failed:', err));
      sendBankTransferPendingToCustomer(order).catch(err => console.error('[WhatsApp] Bank transfer pending (customer) failed:', err));
      sendBankTransferPendingToAdmin(order).catch(err => console.error('[WhatsApp] Bank transfer pending (admin) failed:', err));

      res.json({
        success: true,
        orderNumber: order.orderNumber,
        orderId: order.id,
        total: order.total,
        bankTransferDiscount: bankTransferDiscount.toFixed(2),
      });
    } catch (error) {
      console.error('[bank-transfer] Order creation error:', error);
      res.status(500).json({ error: "Sipariş oluşturulamadı" });
    }
  });

  // iyzico Callback - browser POSTs here after Checkout Form completes.
  // The legacy /api/payment/callback path is kept as an alias for older webhooks.
  const iyzicoCallbackHandler = async (req: Request, res: Response) => {
    const baseUrl = process.env.NODE_ENV === 'production'
      ? (process.env.PUBLIC_BASE_URL || 'https://polenstone.com')
      : `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host || 'localhost:5000'}`;

    const sendRedirect = (path: string) => res.redirect(303, `${baseUrl}${path}`);

    // Track whether we hold the 'processing' claim so the catch block can
    // release it back to 'failed' on any unexpected error (no permanent locks).
    let claimedMerchantOid: string | null = null;
    let terminalized = false;

    try {
      const token = (req.body?.token as string) || '';
      console.log('[iyzico Callback] Received token:', token ? token.substring(0, 12) + '…' : '(none)');

      if (!token) {
        console.error('[iyzico Callback] Missing token in callback body');
        return sendRedirect('/odeme-basarisiz');
      }

      // Verify with iyzico
      const result = await retrieveCheckoutForm(token);
      const merchantOid = result.basketId || result.conversationId || '';
      console.log('[iyzico Callback] Retrieve result:', {
        status: result.status,
        paymentStatus: result.paymentStatus,
        merchantOid,
        paymentId: result.paymentId,
      });

      if (!merchantOid) {
        console.error('[iyzico Callback] No merchantOid in iyzico response');
        return sendRedirect('/odeme-basarisiz');
      }

      // Atomically claim this payment for processing. Only one concurrent caller wins.
      const pendingPayment = await storage.claimPendingPaymentForProcessing(merchantOid);
      if (pendingPayment) claimedMerchantOid = merchantOid;
      if (!pendingPayment) {
        // Either not found, already processed, or another worker is processing it.
        const existing = await storage.getPendingPaymentByMerchantOid(merchantOid);
        if (!existing) {
          console.error('[iyzico Callback] Pending payment not found:', merchantOid);
          return sendRedirect(`/odeme-basarisiz?oid=${merchantOid}`);
        }
        if (existing.status === 'completed') {
          return sendRedirect(`/odeme-basarili?oid=${merchantOid}`);
        }
        if (existing.status === 'failed') {
          return sendRedirect(`/odeme-basarisiz?oid=${merchantOid}`);
        }
        // 'processing' — another callback is in flight; SPA polling will pick up the final state.
        console.log('[iyzico Callback] Already processing, redirecting to status page:', merchantOid);
        return sendRedirect(`/odeme-basarili?oid=${merchantOid}`);
      }

      // Verify token belongs to this pending payment
      if (pendingPayment.paymentToken && pendingPayment.paymentToken !== token) {
        console.error('[iyzico Callback] Token mismatch for', merchantOid);
        await storage.updatePendingPaymentStatus(merchantOid, 'failed');
        terminalized = true;
        return sendRedirect(`/odeme-basarisiz?oid=${merchantOid}`);
      }

      const isPaid = result.status === 'success' && result.paymentStatus === 'SUCCESS';

      if (isPaid) {
        // Verify amount matches the pending total (within 1 kuruş)
        const expected = parseFloat(pendingPayment.total);
        const paid = result.paidPrice ?? 0;
        if (Math.abs(expected - paid) > 0.01) {
          console.error('[iyzico Callback] Amount mismatch', { expected, paid, merchantOid });
          await storage.updatePendingPaymentStatus(merchantOid, 'failed');
          terminalized = true;
          return sendRedirect(`/odeme-basarisiz?oid=${merchantOid}`);
        }

        if (result.paymentId) {
          await storage.setPendingPaymentIyzicoId(merchantOid, result.paymentId);
        }

        // Payment successful - create the actual order
        const orderNumber = merchantOid;

        // Create order
        const order = await storage.createOrder({
          orderNumber,
          customerName: pendingPayment.customerName,
          customerEmail: pendingPayment.customerEmail,
          customerPhone: pendingPayment.customerPhone,
          shippingAddress: pendingPayment.shippingAddress,
          subtotal: pendingPayment.subtotal,
          shippingCost: pendingPayment.shippingCost,
          discountAmount: pendingPayment.discountAmount || '0',
          couponCode: pendingPayment.couponCode,
          total: pendingPayment.total,
          status: 'confirmed',
          paymentMethod: 'iyzico',
          paymentStatus: 'paid',
        });

        // Create order items and reduce stock
        for (const item of pendingPayment.cartItems) {
          await storage.createOrderItem({
            orderId: order.id,
            productId: item.productId,
            variantId: item.variantId,
            productName: item.productName,
            variantDetails: item.variantDetails,
            price: item.price,
            quantity: item.quantity,
            subtotal: (parseFloat(item.price) * item.quantity).toFixed(2),
          });

          // Reduce stock for the variant
          if (item.variantId) {
            const variant = await storage.getProductVariant(item.variantId);
            if (variant) {
              const newStock = Math.max(0, variant.stock - item.quantity);
              await storage.updateProductVariant(item.variantId, { stock: newStock });
              
              await storage.createStockAdjustment({
                variantId: item.variantId,
                previousStock: variant.stock,
                newStock: newStock,
                adjustmentType: 'sale',
                reason: `Sipariş: ${orderNumber}`,
              });
            }
          }
        }

        // Handle coupon redemption
        if (pendingPayment.couponCode) {
          const coupon = await storage.getCouponByCode(pendingPayment.couponCode);
          if (coupon) {
            await storage.redeemCoupon(coupon.id, order.id, null, parseFloat(pendingPayment.discountAmount || '0'));
            
            // Update influencer commission if applicable
            if (coupon.isInfluencerCode) {
              let commission = 0;
              const orderTotal = parseFloat(pendingPayment.total);
              
              switch (coupon.commissionType) {
                case 'percentage':
                  commission = (orderTotal * parseFloat(coupon.commissionValue || '0')) / 100;
                  break;
                case 'per_use':
                  commission = parseFloat(coupon.commissionValue || '0');
                  break;
              }
              
              if (commission > 0) {
                const currentCommission = parseFloat(coupon.totalCommissionEarned || '0');
                await storage.updateCoupon(coupon.id, {
                  totalCommissionEarned: (currentCommission + commission).toFixed(2),
                });
              }
            }
          }
        }

        // Clear cart
        await storage.clearCart(pendingPayment.sessionId);

        // Update pending payment status
        await storage.updatePendingPaymentStatus(merchantOid, 'completed');
        terminalized = true;

        // Send confirmation emails
        const orderItems = await storage.getOrderItems(order.id);
        sendOrderConfirmationEmail(order, orderItems).catch(err => console.error('[Email] Order confirmation failed:', err));
        sendAdminOrderNotificationEmail(order, orderItems).catch(err => console.error('[Email] Admin notification failed:', err));

        // Send WhatsApp notifications (best-effort, never blocks order flow)
        sendOrderReceivedToCustomer(order).catch(err => console.error('[WhatsApp] Order received (customer) failed:', err));
        sendOrderReceivedToAdmin(order).catch(err => console.error('[WhatsApp] Order received (admin) failed:', err));

        // Fetch variant SKUs for invoice
        const variantSkus = new Map<string, string>();
        for (const item of orderItems) {
          if (item.variantId) {
            const variant = await storage.getProductVariant(item.variantId);
            if (variant?.sku) {
              variantSkus.set(item.variantId, variant.sku);
            }
          }
        }

        // Create user account if requested during checkout
        if (pendingPayment.createAccount && pendingPayment.accountPasswordHash) {
          try {
            // Check if user doesn't already exist
            const existingUser = await storage.getUserByEmail(pendingPayment.customerEmail);
            if (!existingUser) {
              // Parse name to firstName and lastName
              const nameParts = pendingPayment.customerName.trim().split(' ');
              const firstName = nameParts[0] || '';
              const lastName = nameParts.slice(1).join(' ') || '';
              
              const shippingAddr = pendingPayment.shippingAddress as {
                address: string;
                city: string;
                district: string;
                postalCode: string;
              };

              // Create the user
              const newUser = await storage.createUser({
                email: pendingPayment.customerEmail,
                password: pendingPayment.accountPasswordHash, // Already hashed
                firstName,
                lastName,
                phone: pendingPayment.customerPhone,
                address: shippingAddr.address,
                city: shippingAddr.city,
                district: shippingAddr.district,
                postalCode: shippingAddr.postalCode || null,
              });

              // Create saved address
              await storage.createUserAddress({
                userId: newUser.id,
                title: 'Teslimat Adresi',
                firstName,
                lastName,
                phone: pendingPayment.customerPhone,
                address: shippingAddr.address,
                city: shippingAddr.city,
                district: shippingAddr.district,
                postalCode: shippingAddr.postalCode || null,
                isDefault: true,
              });

              // Send welcome email
              sendWelcomeEmail(newUser).catch(err => console.error('[Email] Welcome email failed:', err));

              console.log('[iyzico Callback] User account created:', newUser.email);
            }
          } catch (userError) {
            console.error('[iyzico Callback] Failed to create user account:', userError);
            // Don't fail the order, just log the error
          }
        }

        console.log('[iyzico Callback] Order created successfully:', orderNumber);
        return sendRedirect(`/odeme-basarili?oid=${merchantOid}`);
      } else {
        // Payment failed
        await storage.updatePendingPaymentStatus(merchantOid, 'failed');
        terminalized = true;
        const reason = result.errorMessage || result.paymentStatus || 'Ödeme tamamlanamadı';
        console.log('[iyzico Callback] Payment failed:', merchantOid, reason);
        return sendRedirect(`/odeme-basarisiz?oid=${merchantOid}&reason=${encodeURIComponent(reason)}`);
      }
    } catch (error) {
      console.error('[iyzico Callback] Error:', error);
      // CRITICAL: if we claimed the row but didn't reach a terminal state,
      // release the claim back to 'failed' so the row never gets stuck in 'processing'.
      //
      // NOTE on reconciliation trade-off: a charge that succeeded on iyzico's side
      // but threw downstream (e.g. order creation crash) will be marked 'failed'
      // here. The customer is shown /odeme-basarisiz and we always log the
      // merchantOid + iyzico paymentId (when known) so admins can manually
      // reconcile via iyzico's dashboard. A dedicated `needs_reconciliation`
      // status is tracked as a future hardening follow-up.
      if (claimedMerchantOid && !terminalized) {
        try {
          await storage.updatePendingPaymentStatus(claimedMerchantOid, 'failed');
          console.error('[iyzico Callback] Released stranded claim → failed:', claimedMerchantOid);
        } catch (releaseErr) {
          console.error('[iyzico Callback] Failed to release stranded claim:', releaseErr);
        }
      }
      return sendRedirect(claimedMerchantOid ? `/odeme-basarisiz?oid=${claimedMerchantOid}` : '/odeme-basarisiz');
    }
  };

  // Primary iyzico callback path (used in createCheckoutFormInitialize.callbackUrl)
  app.post("/api/payment/iyzico/callback", iyzicoCallbackHandler);
  // Backwards-compatible alias for any legacy webhook configuration
  app.post("/api/payment/callback", iyzicoCallbackHandler);

  // ── Maintenance mode admin controls ────────────────────────────────────
  app.get("/api/admin/maintenance", requireAdmin, async (_req, res) => {
    try {
      const { getMaintenanceMode } = await import("./maintenance");
      const enabled = await getMaintenanceMode();
      res.json({ enabled });
    } catch (error) {
      console.error("[maintenance get] error:", error);
      res.status(500).json({ error: "Bakım modu durumu alınamadı" });
    }
  });

  app.post("/api/admin/maintenance", requireAdmin, async (req, res) => {
    try {
      const enabled = Boolean(req.body?.enabled);
      const { setMaintenanceMode } = await import("./maintenance");
      await setMaintenanceMode(enabled);
      console.log("[maintenance] mode switched →", enabled ? "ON" : "OFF");
      res.json({ success: true, enabled });
    } catch (error) {
      console.error("[maintenance set] error:", error);
      res.status(500).json({ error: "Bakım modu değiştirilemedi" });
    }
  });

  // ── iyzico admin controls (production-only, DB-backed credentials) ─────
  // Mask helper: leaks only first 4 / last 4 characters of long secrets so
  // the admin can verify the saved key without exposing the raw value.
  const maskSecret = (raw: string): string => {
    if (!raw) return '';
    if (raw.length <= 8) return '••••••••';
    return `${raw.slice(0, 4)}••••${raw.slice(-4)}`;
  };

  app.get("/api/admin/iyzico/config", requireAdmin, async (_req, res) => {
    try {
      const apiKey = (await storage.getSiteSetting('iyzico_api_key')) || '';
      const secretKey = (await storage.getSiteSetting('iyzico_secret_key')) || '';
      const baseUrl = process.env.PUBLIC_BASE_URL || 'https://polenstone.com';
      res.json({
        configured: Boolean(apiKey && secretKey),
        apiKeyMasked: maskSecret(apiKey),
        secretKeyMasked: maskSecret(secretKey),
        hasApiKey: Boolean(apiKey),
        hasSecretKey: Boolean(secretKey),
        callbackUrl: `${baseUrl}/api/payment/iyzico/callback`,
        baseUrl,
        mode: 'live' as const,
      });
    } catch (error) {
      console.error('[iyzico config] error:', error);
      res.status(500).json({ error: 'iyzico ayarları alınamadı' });
    }
  });

  app.post("/api/admin/iyzico/test", requireAdmin, async (_req, res) => {
    try {
      const result = await testIyzicoConnection();
      console.log('[iyzico] connection test:', {
        ok: result.ok,
        status: result.status,
        errorCode: result.errorCode,
        errorMessage: result.errorMessage,
        apiKeyLength: result.apiKeyLength,
        secretKeyLength: result.secretKeyLength,
      });
      res.json(result);
    } catch (error) {
      console.error('[iyzico test] error:', error);
      res.status(500).json({ error: 'Test çağrısı başarısız' });
    }
  });

  app.post("/api/admin/iyzico/credentials", requireAdmin, async (req, res) => {
    try {
      const apiKey = typeof req.body?.apiKey === 'string' ? req.body.apiKey.trim() : '';
      const secretKey = typeof req.body?.secretKey === 'string' ? req.body.secretKey.trim() : '';
      if (!apiKey || !secretKey) {
        return res.status(400).json({ error: 'API anahtarı ve gizli anahtar zorunludur.' });
      }
      await storage.setSiteSetting('iyzico_api_key', apiKey);
      await storage.setSiteSetting('iyzico_secret_key', secretKey);
      console.log('[iyzico] credentials updated via admin panel');
      res.json({ success: true });
    } catch (error) {
      console.error('[iyzico credentials] error:', error);
      res.status(500).json({ error: 'iyzico anahtarları kaydedilemedi' });
    }
  });

  // Check payment status
  app.get("/api/payment/status/:merchantOid", async (req: Request, res) => {
    try {
      const merchantOid = req.params.merchantOid;
      const pendingPayment = await storage.getPendingPaymentByMerchantOid(merchantOid);

      // No pendingPayment row → it might be a bank transfer order (havale flow
      // doesn't create pendingPayment records). Look up by order number.
      if (!pendingPayment) {
        const order = await storage.getOrderByNumber(merchantOid);
        if (!order) {
          return res.status(404).json({ error: "Ödeme bulunamadı" });
        }
        if (order.paymentMethod === 'bank_transfer') {
          const orderItems = await storage.getOrderItems(order.id);
          return res.json({
            status: order.paymentStatus === 'awaiting_transfer' ? 'awaiting_transfer' : 'completed',
            paymentMethod: 'bank_transfer',
            paymentStatus: order.paymentStatus,
            orderStatus: order.status,
            orderNumber: order.orderNumber,
            orderId: order.id,
            total: order.total,
            items: orderItems.map(item => ({
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              price: item.price,
            })),
          });
        }
        return res.status(404).json({ error: "Ödeme bulunamadı" });
      }

      // If completed, get the order
      if (pendingPayment.status === 'completed') {
        const order = await storage.getOrderByNumber(pendingPayment.merchantOid);
        const orderItems = order ? await storage.getOrderItems(order.id) : [];
        return res.json({
          status: 'completed',
          orderNumber: order?.orderNumber,
          orderId: order?.id,
          total: order?.total,
          items: orderItems.map(item => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            price: item.price,
          })),
        });
      }

      res.json({ status: pendingPayment.status });
    } catch (error) {
      res.status(500).json({ error: "Ödeme durumu alınamadı" });
    }
  });

  // Orders API
  app.get("/api/admin/orders", requireAdmin, async (req, res) => {
    try {
      const orders = await storage.getOrders();
      res.json(orders);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  app.get("/api/admin/orders/:id", requireAdmin, async (req, res) => {
    try {
      const order = await storage.getOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      const items = await storage.getOrderItems(order.id);
      
      // Enrich items with SKU, product image and active product slug
      // (productSlug, ürün adına tıklanabilir link için kullanılır)
      const itemsWithDetails = await Promise.all(
        items.map(async (item) => {
          let sku = null;
          let productImage = null;
          let productSlug: string | null = null;

          if (item.variantId) {
            const variant = await storage.getProductVariant(item.variantId);
            sku = variant?.sku || null;
            if (variant?.productId) {
              const product = await storage.getProduct(variant.productId);
              productImage = product?.images?.[0] || null;
              productSlug = product?.slug || null;
              if (!sku) sku = product?.sku || null;
            }
          }
          if (item.productId && (!productImage || !productSlug)) {
            const product = await storage.getProduct(item.productId);
            if (!productImage) productImage = product?.images?.[0] || null;
            if (!productSlug) productSlug = product?.slug || null;
            if (!sku) sku = product?.sku || null;
          }
          return { ...item, sku, productImage, productSlug };
        })
      );
      
      res.json({ ...order, items: itemsWithDetails });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch order" });
    }
  });

  app.post("/api/orders", async (req: Request, res) => {
    try {
      const cartToken = getOrCreateCartToken(req, res);
      const payload = await getAuthPayload(req, res);
      const userId = payload?.type === 'user' ? payload.userId ?? null : null;
      const cartItems = await storage.getCartItems(cartToken);
      
      if (cartItems.length === 0) {
        return res.status(400).json({ error: "Cart is empty" });
      }

      // Generate order number
      const orderNumber = `HNK${Date.now()}`;
      
      // Calculate actual subtotal from cart items (server-side verification)
      let serverSubtotal = 0;
      for (const cartItem of cartItems) {
        const variant = cartItem.variantId 
          ? await storage.getProductVariant(cartItem.variantId)
          : null;
        // Use variant's productId if available to ensure consistency
        const actualProductId = variant?.productId || cartItem.productId;
        const product = await storage.getProduct(actualProductId);
        if (product) {
          const itemPrice = parseFloat(product.basePrice);
          serverSubtotal += itemPrice * cartItem.quantity;
        }
      }
      
      // Handle coupon validation and redemption - recalculate discount on server
      let validatedCoupon = null;
      let discountAmount = 0;
      
      if (req.body.couponCode) {
        const couponResult = await storage.validateCoupon(
          req.body.couponCode,
          serverSubtotal,
          userId || undefined
        );
        
        if (couponResult.valid && couponResult.coupon) {
          validatedCoupon = couponResult.coupon;
          
          // Recalculate discount on server to prevent tampering
          if (validatedCoupon.discountType === 'percentage') {
            discountAmount = (serverSubtotal * parseFloat(validatedCoupon.discountValue)) / 100;
          } else {
            discountAmount = parseFloat(validatedCoupon.discountValue);
          }
          // Clamp discount to subtotal
          discountAmount = Math.min(discountAmount, serverSubtotal);
        }
      }
      
      // Calculate shipping and total on server
      const FREE_SHIPPING_THRESHOLD = 2500;
      const DOMESTIC_SHIPPING_COST = 200;
      const INTERNATIONAL_SHIPPING_COST = 2500;
      const IRAQ_SHIPPING_COST = 5700;
      
      const orderCountry = req.body.shippingAddress?.country || 'Türkiye';
      const isDomestic = orderCountry === 'Türkiye';
      const isIraq = orderCountry === 'Irak';
      const shippingCost = isDomestic 
        ? (serverSubtotal >= FREE_SHIPPING_THRESHOLD ? 0 : DOMESTIC_SHIPPING_COST)
        : isIraq ? IRAQ_SHIPPING_COST : INTERNATIONAL_SHIPPING_COST;
      const serverTotal = Math.max(0, serverSubtotal - discountAmount + shippingCost);
      
      const validated = insertOrderSchema.parse({
        ...req.body,
        orderNumber,
        subtotal: serverSubtotal.toFixed(2),
        shippingCost: shippingCost.toFixed(2),
        couponCode: validatedCoupon?.code || null,
        discountAmount: discountAmount.toFixed(2),
        total: serverTotal.toFixed(2),
      });

      const order = await storage.createOrder(validated);
      
      // Record coupon redemption and update influencer commission
      if (validatedCoupon) {
        await storage.redeemCoupon(validatedCoupon.id, order.id, userId, discountAmount);
        
        // If it's an influencer code, update their commission
        if (validatedCoupon.isInfluencerCode) {
          let commission = 0;
          
          switch (validatedCoupon.commissionType) {
            case 'percentage':
              // Commission based on order total (after discount and shipping)
              commission = (serverTotal * parseFloat(validatedCoupon.commissionValue || '0')) / 100;
              break;
            case 'per_use':
              commission = parseFloat(validatedCoupon.commissionValue || '0');
              break;
            case 'fixed_total':
              // Fixed total is a one-time payment, tracked separately
              break;
          }
          
          if (commission > 0) {
            const currentCommission = parseFloat(validatedCoupon.totalCommissionEarned || '0');
            await storage.updateCoupon(validatedCoupon.id, {
              totalCommissionEarned: (currentCommission + commission).toFixed(2),
            });
          }
        }
      }

      // Create order items and reduce stock
      for (const cartItem of cartItems) {
        const variant = cartItem.variantId 
          ? await storage.getProductVariant(cartItem.variantId)
          : null;
        // Use variant's productId if available to ensure consistency
        const actualProductId = variant?.productId || cartItem.productId;
        const product = await storage.getProduct(actualProductId);

        if (product) {
          await storage.createOrderItem({
            orderId: order.id,
            productId: product.id,
            variantId: variant?.id,
            productName: product.name,
            variantDetails: variant ? `${variant.size || ''} ${variant.color || ''}`.trim() : null,
            price: product.basePrice,
            quantity: cartItem.quantity,
            subtotal: ((parseFloat(product.basePrice) * cartItem.quantity).toFixed(2)),
          });

          // Reduce stock for the variant
          if (variant && variant.id) {
            const newStock = Math.max(0, variant.stock - cartItem.quantity);
            await storage.updateProductVariant(variant.id, { stock: newStock });
            
            // Log stock adjustment
            await storage.createStockAdjustment({
              variantId: variant.id,
              previousStock: variant.stock,
              newStock: newStock,
              adjustmentType: 'sale',
              reason: `Sipariş: ${orderNumber}`,
            });
          }
        }
      }

      // Clear cart
      await storage.clearCart(cartToken);
      
      // Get order items for email
      const orderItems = await storage.getOrderItems(order.id);
      
      // Send order confirmation emails (don't wait)
      sendOrderConfirmationEmail(order, orderItems).catch(err => console.error('[Email] Order confirmation failed:', err));
      sendAdminOrderNotificationEmail(order, orderItems).catch(err => console.error('[Email] Admin notification failed:', err));

      // Send WhatsApp notifications (best-effort, never blocks order flow)
      sendOrderReceivedToCustomer(order).catch(err => console.error('[WhatsApp] Order received (customer) failed:', err));
      sendOrderReceivedToAdmin(order).catch(err => console.error('[WhatsApp] Order received (admin) failed:', err));

      res.status(201).json(order);
    } catch (error) {
      console.error('Order creation error:', error);
      res.status(400).json({ error: "Failed to create order" });
    }
  });

  app.patch("/api/admin/orders/:id/status", requireAdmin, async (req, res) => {
    try {
      const { status, trackingNumber } = req.body;
      
      // If shipped status, update tracking info as well
      let updateData: any = { status };
      if (status === 'shipped' && trackingNumber) {
        const arasTrackingUrl = `https://kargotakip.araskargo.com.tr/mainpage.aspx?code=${trackingNumber}`;
        updateData = {
          ...updateData,
          trackingNumber,
          shippingCarrier: 'Aras Kargo',
          trackingUrl: arasTrackingUrl,
        };
      }

      // Stamp the timestamp for this status transition (only set if not already set)
      const now = new Date();
      const existingOrder = await storage.getOrder(req.params.id);
      if (existingOrder) {
        if (status === 'processing' && !existingOrder.processingAt) {
          updateData.processingAt = now;
        } else if (status === 'shipped' && !existingOrder.shippedAt) {
          updateData.shippedAt = now;
        } else if ((status === 'delivered' || status === 'completed') && !existingOrder.deliveredAt) {
          updateData.deliveredAt = now;
        } else if ((status === 'cancelled' || status === 'refunded') && !existingOrder.cancelledAt) {
          updateData.cancelledAt = now;
        }
      }

      const order = await storage.updateOrder(req.params.id, updateData);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      
      // Send status change emails
      if (status === 'processing') {
        sendPreparingNotificationEmail(order).catch(err => 
          console.error('[Email] Preparing notification failed:', err)
        );
      } else if (status === 'shipped') {
        sendShippingNotificationEmail(order).catch(err => 
          console.error('[Email] Shipping notification failed:', err)
        );
      }

      // Send WhatsApp status notifications (best-effort)
      if (status === 'processing') {
        sendOrderPreparingToCustomer(order).catch(err =>
          console.error('[WhatsApp] Preparing notification failed:', err)
        );
      } else if (status === 'shipped') {
        sendOrderShippedToCustomer(order).catch(err =>
          console.error('[WhatsApp] Shipping notification failed:', err)
        );
      } else if (status === 'delivered') {
        sendOrderDeliveredToCustomer(order).catch(err =>
          console.error('[WhatsApp] Delivered notification failed:', err)
        );
      } else if (status === 'cancelled' || status === 'refunded') {
        sendOrderCancelledToCustomer(order).catch(err =>
          console.error('[WhatsApp] Cancelled notification (customer) failed:', err)
        );
        sendOrderCancelledToAdmin(order).catch(err =>
          console.error('[WhatsApp] Cancelled notification (admin) failed:', err)
        );
      }

      res.json(order);
    } catch (error) {
      console.error('Order status update error:', error);
      res.status(400).json({ error: "Failed to update order status" });
    }
  });

  // Initialize first admin user if none exists
  app.post("/api/admin/init", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      // Check if any admin exists
      const existingAdmin = await storage.getAdminUserByUsername(username);
      if (existingAdmin) {
        return res.status(400).json({ error: "Admin user already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const admin = await storage.createAdminUser({
        username,
        password: hashedPassword,
      });

      res.status(201).json({ id: admin.id, username: admin.username });
    } catch (error) {
      res.status(500).json({ error: "Failed to create admin user" });
    }
  });

  // WooCommerce Integration API
  app.get("/api/admin/woocommerce/settings", requireAdmin, async (req, res) => {
    try {
      const settings = await storage.getWoocommerceSettings();
      if (settings) {
        // Mask the secret for security
        res.json({
          ...settings,
          consumerSecret: settings.consumerSecret ? '••••••••' : '',
        });
      } else {
        res.json(null);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch WooCommerce settings" });
    }
  });

  app.post("/api/admin/woocommerce/settings", requireAdmin, async (req, res) => {
    try {
      const { siteUrl, consumerKey, consumerSecret, isActive } = req.body;
      const settings = await storage.saveWoocommerceSettings({
        siteUrl,
        consumerKey,
        consumerSecret,
        isActive: isActive ?? true,
      });
      res.json({
        ...settings,
        consumerSecret: '••••••••',
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to save WooCommerce settings" });
    }
  });

  app.delete("/api/admin/woocommerce/settings", requireAdmin, async (req, res) => {
    try {
      await storage.deleteWoocommerceSettings();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete WooCommerce settings" });
    }
  });

  app.post("/api/admin/woocommerce/test", requireAdmin, async (req, res) => {
    try {
      const { siteUrl, consumerKey, consumerSecret } = req.body;
      
      // Test connection to WooCommerce API
      const url = new URL('/wp-json/wc/v3/products', siteUrl);
      url.searchParams.set('per_page', '1');
      
      const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Basic ${auth}`,
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        return res.status(400).json({ 
          success: false, 
          error: `WooCommerce API hatası: ${response.status}`,
          details: errorText
        });
      }
      
      const products = await response.json();
      
      // Get total product count from headers
      const totalProducts = response.headers.get('X-WP-Total') || '0';
      const totalCategories = await fetch(new URL('/wp-json/wc/v3/products/categories?per_page=1', siteUrl).toString(), {
        headers: { 'Authorization': `Basic ${auth}` },
      }).then(r => r.headers.get('X-WP-Total') || '0').catch(() => '0');
      
      res.json({ 
        success: true, 
        productCount: parseInt(totalProducts),
        categoryCount: parseInt(totalCategories),
        message: 'Bağlantı başarılı!'
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        error: error.message || 'Bağlantı hatası'
      });
    }
  });

  app.get("/api/admin/woocommerce/logs", requireAdmin, async (req, res) => {
    try {
      const logs = await storage.getWoocommerceSyncLogs();
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sync logs" });
    }
  });

  app.post("/api/admin/woocommerce/import", requireAdmin, async (req, res) => {
    try {
      const settings = await storage.getWoocommerceSettings();
      if (!settings) {
        return res.status(400).json({ error: "WooCommerce ayarları bulunamadı" });
      }

      // Create sync log
      const syncLog = await storage.createWoocommerceSyncLog('running');

      // Start import in background
      (async () => {
        let productsImported = 0;
        let categoriesImported = 0;
        let imagesDownloaded = 0;
        const errors: string[] = [];

        try {
          const auth = Buffer.from(`${settings.consumerKey}:${settings.consumerSecret}`).toString('base64');
          
          // Import categories first
          const categoriesUrl = new URL('/wp-json/wc/v3/products/categories', settings.siteUrl);
          categoriesUrl.searchParams.set('per_page', '100');
          
          const catResponse = await fetch(categoriesUrl.toString(), {
            headers: { 'Authorization': `Basic ${auth}` },
          });
          
          if (catResponse.ok) {
            const wooCategories = await catResponse.json();
            for (const wooCat of wooCategories) {
              try {
                const existingCat = await storage.getCategoryBySlugOrCreate(wooCat.slug);
                if (!existingCat) {
                  // Download and optimize category image if exists
                  let categoryImage = '';
                  if (wooCat.image?.src) {
                    try {
                      const imgRes = await fetch(wooCat.image.src);
                      if (imgRes.ok) {
                        const imgBuffer = await imgRes.arrayBuffer();
                        const fileName = `${wooCat.slug}-${Date.now()}`;
                        const tempFilePath = path.join(process.cwd(), 'client/public/uploads/categories', `${fileName}.tmp`);
                        const optimizedPath = await optimizeImageBuffer(
                          Buffer.from(imgBuffer),
                          tempFilePath
                        );
                        const relativePath = optimizedPath.replace(process.cwd() + '/client/public', '');
                        categoryImage = relativePath;
                        imagesDownloaded++;
                      }
                    } catch (imgError) {
                      errors.push(`Kategori resmi indirilemedi: ${wooCat.name}`);
                    }
                  }
                  
                  await storage.createCategory({
                    name: wooCat.name,
                    slug: wooCat.slug,
                    image: categoryImage,
                    displayOrder: wooCat.menu_order || 0,
                  });
                  categoriesImported++;
                }
              } catch (catError: any) {
                errors.push(`Kategori aktarılamadı: ${wooCat.name} - ${catError.message}`);
              }
            }
          }

          // Import products
          let page = 1;
          let hasMore = true;
          
          while (hasMore) {
            const productsUrl = new URL('/wp-json/wc/v3/products', settings.siteUrl);
            productsUrl.searchParams.set('per_page', '20');
            productsUrl.searchParams.set('page', page.toString());
            productsUrl.searchParams.set('status', 'publish');
            
            const prodResponse = await fetch(productsUrl.toString(), {
              headers: { 'Authorization': `Basic ${auth}` },
            });
            
            if (!prodResponse.ok) {
              errors.push(`Ürünler alınamadı (sayfa ${page})`);
              break;
            }
            
            const wooProducts = await prodResponse.json();
            
            if (wooProducts.length === 0) {
              hasMore = false;
              break;
            }
            
            for (const wooProd of wooProducts) {
              try {
                const existingProd = await storage.getProductBySlug(wooProd.slug);
                if (!existingProd) {
                  // Download and optimize product images
                  const productImages: string[] = [];
                  for (const img of (wooProd.images || [])) {
                    try {
                      const imgRes = await fetch(img.src);
                      if (imgRes.ok) {
                        const imgBuffer = await imgRes.arrayBuffer();
                        const fileName = `${wooProd.slug}-${Date.now()}-${productImages.length + 1}`;
                        const tempFilePath = path.join(process.cwd(), 'client/public/uploads/products', `${fileName}.tmp`);
                        const optimizedPath = await optimizeImageBuffer(
                          Buffer.from(imgBuffer),
                          tempFilePath
                        );
                        const relativePath = optimizedPath.replace(process.cwd() + '/client/public', '');
                        productImages.push(relativePath);
                        imagesDownloaded++;
                      }
                    } catch (imgError) {
                      errors.push(`Ürün resmi indirilemedi: ${wooProd.name}`);
                    }
                  }
                  
                  // Get category ID
                  let categoryId = null;
                  if (wooProd.categories && wooProd.categories.length > 0) {
                    const cat = await storage.getCategoryBySlugOrCreate(wooProd.categories[0].slug);
                    categoryId = cat?.id || null;
                  }
                  
                  // Extract sizes and colors from attributes
                  const availableSizes: string[] = [];
                  const availableColors: { name: string; hex: string }[] = [];
                  
                  for (const attr of (wooProd.attributes || [])) {
                    if (attr.name.toLowerCase().includes('beden') || attr.name.toLowerCase().includes('size')) {
                      availableSizes.push(...(attr.options || []));
                    }
                    if (attr.name.toLowerCase().includes('renk') || attr.name.toLowerCase().includes('color')) {
                      for (const colorName of (attr.options || [])) {
                        availableColors.push({ name: colorName, hex: '#000000' });
                      }
                    }
                  }
                  
                  const newProduct = await storage.createProduct({
                    name: wooProd.name,
                    slug: wooProd.slug,
                    description: wooProd.description?.replace(/<[^>]*>/g, '') || '',
                    sku: wooProd.sku || null,
                    categoryId,
                    basePrice: wooProd.price || wooProd.regular_price || '0',
                    images: productImages,
                    availableSizes,
                    availableColors,
                    isActive: wooProd.status === 'publish',
                    isFeatured: wooProd.featured || false,
                    isNew: false,
                  });
                  productsImported++;
                  
                  // Fetch and create variations for variable products
                  if (wooProd.type === 'variable' && newProduct) {
                    try {
                      const variationsUrl = new URL(`/wp-json/wc/v3/products/${wooProd.id}/variations`, settings.siteUrl);
                      variationsUrl.searchParams.set('per_page', '100');
                      
                      const varResponse = await fetch(variationsUrl.toString(), {
                        headers: { 'Authorization': `Basic ${auth}` },
                      });
                      
                      if (varResponse.ok) {
                        const wooVariations = await varResponse.json();
                        for (const wooVar of wooVariations) {
                          let size = '';
                          let color = '';
                          let colorHex = '#000000';
                          
                          for (const attr of (wooVar.attributes || [])) {
                            if (attr.name.toLowerCase().includes('beden') || attr.name.toLowerCase().includes('size')) {
                              size = attr.option || '';
                            }
                            if (attr.name.toLowerCase().includes('renk') || attr.name.toLowerCase().includes('color')) {
                              color = attr.option || '';
                            }
                          }
                          
                          await storage.createProductVariant({
                            productId: newProduct.id,
                            sku: wooVar.sku || null,
                            size: size || null,
                            color: color || null,
                            colorHex: colorHex,
                            price: wooVar.price || wooProd.price || '0',
                            stock: wooVar.stock_quantity || 0,
                            isActive: wooVar.status === 'publish',
                          });
                        }
                      }
                    } catch (varError: any) {
                      errors.push(`Varyasyonlar alınamadı: ${wooProd.name}`);
                    }
                  } else if (newProduct) {
                    // Simple product - create a single variant
                    if (availableSizes.length > 0 && availableColors.length > 0) {
                      for (const size of availableSizes) {
                        for (const colorObj of availableColors) {
                          await storage.createProductVariant({
                            productId: newProduct.id,
                            sku: wooProd.sku ? `${wooProd.sku}-${size}-${colorObj.name}` : null,
                            size,
                            color: colorObj.name,
                            colorHex: colorObj.hex,
                            price: wooProd.price || '0',
                            stock: wooProd.stock_quantity || 0,
                            isActive: true,
                          });
                        }
                      }
                    } else if (availableSizes.length > 0) {
                      for (const size of availableSizes) {
                        await storage.createProductVariant({
                          productId: newProduct.id,
                          sku: wooProd.sku ? `${wooProd.sku}-${size}` : null,
                          size,
                          color: null,
                          colorHex: null,
                          price: wooProd.price || '0',
                          stock: wooProd.stock_quantity || 0,
                          isActive: true,
                        });
                      }
                    } else if (availableColors.length > 0) {
                      for (const colorObj of availableColors) {
                        await storage.createProductVariant({
                          productId: newProduct.id,
                          sku: wooProd.sku ? `${wooProd.sku}-${colorObj.name}` : null,
                          size: null,
                          color: colorObj.name,
                          colorHex: colorObj.hex,
                          price: wooProd.price || '0',
                          stock: wooProd.stock_quantity || 0,
                          isActive: true,
                        });
                      }
                    } else {
                      // No size or color - create single variant
                      await storage.createProductVariant({
                        productId: newProduct.id,
                        sku: wooProd.sku || null,
                        size: null,
                        color: null,
                        colorHex: null,
                        price: wooProd.price || '0',
                        stock: wooProd.stock_quantity || 0,
                        isActive: true,
                      });
                    }
                  }
                }
              } catch (prodError: any) {
                errors.push(`Ürün aktarılamadı: ${wooProd.name} - ${prodError.message}`);
              }
            }
            
            page++;
            // Safety limit
            if (page > 50) break;
          }

          await storage.updateWoocommerceLastSync();
          await storage.updateWoocommerceSyncLog(syncLog.id, {
            status: 'completed',
            productsImported,
            categoriesImported,
            imagesDownloaded,
            errors,
            completedAt: new Date(),
          });
        } catch (syncError: any) {
          await storage.updateWoocommerceSyncLog(syncLog.id, {
            status: 'failed',
            productsImported,
            categoriesImported,
            imagesDownloaded,
            errors: [...errors, syncError.message],
            completedAt: new Date(),
          });
        }
      })();

      res.json({ success: true, logId: syncLog.id, message: 'İçe aktarma başlatıldı' });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "İçe aktarma başlatılamadı" });
    }
  });

  // Analytics Routes
  app.get("/api/admin/analytics/sales", requireAdmin, async (req, res) => {
    try {
      const period = (req.query.period as 'day' | 'week' | 'month' | 'year') || 'month';
      const data = await storage.getSalesAnalytics(period);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sales analytics" });
    }
  });

  app.get("/api/admin/analytics/best-sellers", requireAdmin, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const data = await storage.getBestSellingProducts(limit);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch best sellers" });
    }
  });

  app.get("/api/admin/analytics/comparison", requireAdmin, async (req, res) => {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      const data = await storage.getPeriodComparison(thirtyDaysAgo, now, sixtyDaysAgo, thirtyDaysAgo);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch comparison data" });
    }
  });

  app.get("/api/admin/analytics/kpi", requireAdmin, async (req, res) => {
    try {
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

      const [thisMonth, lastMonth] = await Promise.all([
        storage.getRevenueByPeriod(thisMonthStart, now),
        storage.getRevenueByPeriod(lastMonthStart, lastMonthEnd),
      ]);

      const cancelledThisMonth = await db.execute(sql`
        SELECT COUNT(*) as count, COALESCE(SUM(CAST(total AS DECIMAL)), 0) as total
        FROM orders WHERE created_at >= ${thisMonthStart} AND status = 'cancelled'
      `);
      const cancelledRow = (cancelledThisMonth.rows || [])[0] as any;
      const cancelledCount = Number(cancelledRow?.count || 0);
      const cancelRate = thisMonth.orderCount > 0 ? (cancelledCount / thisMonth.orderCount) * 100 : 0;

      const newCustomersResult = await db.execute(sql`
        SELECT COUNT(DISTINCT customer_email) as count FROM orders
        WHERE created_at >= ${thisMonthStart}
        AND customer_email NOT IN (
          SELECT customer_email FROM orders WHERE created_at < ${thisMonthStart}
        )
      `);
      const newCustomers = Number(((newCustomersResult.rows || [])[0] as any)?.count || 0);

      const revenueChange = lastMonth.total > 0 ? ((thisMonth.total - lastMonth.total) / lastMonth.total) * 100 : 0;
      const ordersChange = lastMonth.orderCount > 0 ? ((thisMonth.orderCount - lastMonth.orderCount) / lastMonth.orderCount) * 100 : 0;
      const avgChange = lastMonth.averageOrderValue > 0 ? ((thisMonth.averageOrderValue - lastMonth.averageOrderValue) / lastMonth.averageOrderValue) * 100 : 0;

      res.json({
        thisMonth: {
          revenue: thisMonth.total,
          orders: thisMonth.orderCount,
          avgOrder: thisMonth.averageOrderValue,
          cancelRate,
          newCustomers,
        },
        lastMonth: {
          revenue: lastMonth.total,
          orders: lastMonth.orderCount,
          avgOrder: lastMonth.averageOrderValue,
        },
        changes: { revenue: revenueChange, orders: ordersChange, avgOrder: avgChange },
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch KPI data" });
    }
  });

  app.get("/api/admin/analytics/status-breakdown", requireAdmin, async (req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT status, COUNT(*) as count, COALESCE(SUM(CAST(total AS DECIMAL)), 0) as revenue
        FROM orders GROUP BY status ORDER BY count DESC
      `);
      res.json((result.rows || []).map((r: any) => ({
        status: r.status,
        count: Number(r.count),
        revenue: Number(r.revenue),
      })));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch status breakdown" });
    }
  });

  app.get("/api/admin/analytics/country-breakdown", requireAdmin, async (req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT 
          shipping_address->>'country' as country,
          COUNT(*) as count,
          COALESCE(SUM(CAST(total AS DECIMAL)), 0) as revenue
        FROM orders
        WHERE status != 'cancelled'
        GROUP BY shipping_address->>'country'
        ORDER BY revenue DESC
        LIMIT 10
      `);
      res.json((result.rows || []).map((r: any) => ({
        country: r.country || 'Bilinmiyor',
        count: Number(r.count),
        revenue: Number(r.revenue),
      })));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch country breakdown" });
    }
  });

  // Coupon Routes
  app.get("/api/admin/coupons", requireAdmin, async (req, res) => {
    try {
      const coupons = await storage.getCoupons();
      res.json(coupons);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch coupons" });
    }
  });

  app.get("/api/admin/coupons/:id", requireAdmin, async (req, res) => {
    try {
      const coupon = await storage.getCoupon(req.params.id);
      if (!coupon) return res.status(404).json({ error: "Coupon not found" });
      res.json(coupon);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch coupon" });
    }
  });

  app.post("/api/admin/coupons", requireAdmin, async (req, res) => {
    try {
      const data = { ...req.body };
      if (data.startsAt) data.startsAt = new Date(data.startsAt);
      else data.startsAt = null;
      if (data.expiresAt) data.expiresAt = new Date(data.expiresAt);
      else data.expiresAt = null;
      const coupon = await storage.createCoupon(data);
      res.status(201).json(coupon);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to create coupon" });
    }
  });

  app.put("/api/admin/coupons/:id", requireAdmin, async (req, res) => {
    try {
      const data = { ...req.body };
      if (data.startsAt) data.startsAt = new Date(data.startsAt);
      else if (data.startsAt === '' || data.startsAt === null) data.startsAt = null;
      if (data.expiresAt) data.expiresAt = new Date(data.expiresAt);
      else if (data.expiresAt === '' || data.expiresAt === null) data.expiresAt = null;
      const coupon = await storage.updateCoupon(req.params.id, data);
      if (!coupon) return res.status(404).json({ error: "Coupon not found" });
      res.json(coupon);
    } catch (error) {
      res.status(500).json({ error: "Failed to update coupon" });
    }
  });

  app.delete("/api/admin/coupons/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteCoupon(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete coupon" });
    }
  });

  app.get("/api/admin/coupons/by-code/:code", requireAdmin, async (req, res) => {
    try {
      const coupon = await storage.getCouponByCode(req.params.code);
      if (!coupon) return res.status(404).json({ error: "Coupon not found" });
      res.json(coupon);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch coupon" });
    }
  });

  // Public coupon validation
  app.post("/api/coupons/validate", async (req: Request, res) => {
    try {
      const { code, orderTotal } = req.body;
      const payload = await getAuthPayload(req, res);
      const userId = payload?.type === 'user' ? payload.userId ?? null : null;
      const result = await storage.validateCoupon(code, orderTotal, userId || undefined);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to validate coupon" });
    }
  });

  // Stock Management Routes
  app.get("/api/admin/inventory", requireAdmin, async (req, res) => {
    try {
      const variants = await storage.getAllVariantsWithProducts();
      res.json(variants);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch inventory" });
    }
  });

  app.get("/api/admin/inventory/low-stock", requireAdmin, async (req, res) => {
    try {
      const threshold = parseInt(req.query.threshold as string) || 5;
      const variants = await storage.getLowStockVariants(threshold);
      res.json(variants);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch low stock items" });
    }
  });

  app.post("/api/admin/inventory/bulk-update", requireAdmin, async (req, res) => {
    try {
      const { updates } = req.body;
      await storage.bulkUpdateStock(updates.map((u: any) => ({
        ...u,
        authorId: (req as any).adminId,
      })));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to bulk update stock" });
    }
  });

  app.get("/api/admin/inventory/adjustments", requireAdmin, async (req, res) => {
    try {
      const variantId = req.query.variantId as string | undefined;
      const adjustments = await storage.getStockAdjustments(variantId);
      res.json(adjustments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stock adjustments" });
    }
  });

  // Data consistency check
  app.get("/api/admin/inventory/data-check", requireAdmin, async (req, res) => {
    try {
      const products = await storage.getProducts();
      const allVariants = await storage.getAllVariantsWithProducts();
      const orders = await storage.getOrders();
      
      const issues = {
        productsWithoutVariants: [] as { id: string; name: string; sku: string | null; availableSizes: string[] }[],
        productsWithMissingVariants: [] as { id: string; name: string; definedSizes: string[]; existingVariantSizes: string[] }[],
        ordersWithoutVariants: [] as { id: string; orderNumber: string; itemsWithoutVariant: { productName: string; variantDetails: string | null }[] }[],
      };

      // Check for products without any variants
      for (const product of products) {
        const productVariants = allVariants.filter(v => v.productId === product.id);
        
        if (productVariants.length === 0 && product.availableSizes && product.availableSizes.length > 0) {
          issues.productsWithoutVariants.push({
            id: product.id,
            name: product.name,
            sku: product.sku,
            availableSizes: product.availableSizes as string[],
          });
        } else if (product.availableSizes && product.availableSizes.length > 0) {
          // Check if all sizes have variants
          const existingSizes = productVariants.map(v => v.size).filter(Boolean);
          const definedSizes = product.availableSizes as string[];
          const missingSizes = definedSizes.filter(s => !existingSizes.includes(s));
          
          if (missingSizes.length > 0) {
            issues.productsWithMissingVariants.push({
              id: product.id,
              name: product.name,
              definedSizes: definedSizes,
              existingVariantSizes: existingSizes as string[],
            });
          }
        }
      }

      // Check for orders with items that have no variant
      for (const order of orders) {
        const orderItems = await storage.getOrderItems(order.id);
        const itemsWithoutVariant = orderItems.filter(item => !item.variantId);
        
        if (itemsWithoutVariant.length > 0) {
          issues.ordersWithoutVariants.push({
            id: order.id,
            orderNumber: order.orderNumber,
            itemsWithoutVariant: itemsWithoutVariant.map(item => ({
              productName: item.productName,
              variantDetails: item.variantDetails,
            })),
          });
        }
      }

      res.json({
        summary: {
          productsWithoutVariants: issues.productsWithoutVariants.length,
          productsWithMissingVariants: issues.productsWithMissingVariants.length,
          ordersWithoutVariants: issues.ordersWithoutVariants.length,
        },
        issues,
      });
    } catch (error) {
      console.error('Data check error:', error);
      res.status(500).json({ error: "Failed to check data consistency" });
    }
  });

  // Sync variants for a single product
  app.post("/api/admin/products/:id/sync-variants", requireAdmin, async (req, res) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ error: "Ürün bulunamadı" });
      }

      const productVariants = await storage.getProductVariants(product.id);
      const definedSizes = (product.availableSizes as string[]) || [];
      const colors = (product.availableColors as Array<{name: string, hex: string}>) || [];
      const baseSku = product.sku || '';

      let createdCount = 0;
      let deletedCount = 0;

      // If no sizes defined, delete all variants
      if (definedSizes.length === 0) {
        for (const variant of productVariants) {
          await storage.deleteProductVariant(variant.id);
          deletedCount++;
        }
      } else {
        // Delete variants with sizes not in defined sizes
        for (const variant of productVariants) {
          if (variant.size && !definedSizes.includes(variant.size)) {
            await storage.deleteProductVariant(variant.id);
            deletedCount++;
          }
        }

        // Create missing variants for defined sizes
        for (const size of definedSizes) {
          if (colors.length > 0) {
            for (const color of colors) {
              const exists = productVariants.some(v => v.size === size && v.color === color.name);
              if (!exists) {
                const variantSku = baseSku ? `${baseSku}-${size}` : null;
                await storage.createProductVariant({
                  productId: product.id,
                  size: size,
                  color: color.name,
                  sku: variantSku,
                  stock: 0,
                  price: product.basePrice,
                });
                createdCount++;
              }
            }
          } else {
            const exists = productVariants.some(v => v.size === size);
            if (!exists) {
              const variantSku = baseSku ? `${baseSku}-${size}` : null;
              await storage.createProductVariant({
                productId: product.id,
                size: size,
                color: null,
                sku: variantSku,
                stock: 0,
                price: product.basePrice,
              });
              createdCount++;
            }
          }
        }
      }

      let message = '';
      if (createdCount > 0 && deletedCount > 0) {
        message = `${createdCount} varyant oluşturuldu, ${deletedCount} varyant silindi`;
      } else if (createdCount > 0) {
        message = `${createdCount} varyant oluşturuldu`;
      } else if (deletedCount > 0) {
        message = `${deletedCount} varyant silindi`;
      } else {
        message = 'Varyantlar zaten senkronize';
      }

      res.json({ success: true, createdCount, deletedCount, message });
    } catch (error) {
      console.error('Sync variants error:', error);
      res.status(500).json({ error: "Varyant senkronizasyonu başarısız" });
    }
  });

  // Fix missing variants - syncs variants with product's defined sizes
  app.post("/api/admin/inventory/fix-variants", requireAdmin, async (req, res) => {
    try {
      const products = await storage.getProducts();
      const allVariants = await storage.getAllVariantsWithProducts();
      
      let createdCount = 0;
      let deletedCount = 0;
      const createdVariants: { productName: string; size: string; sku: string | null }[] = [];
      const deletedVariants: { productName: string; size: string | null }[] = [];

      for (const product of products) {
        const productVariants = allVariants.filter(v => v.productId === product.id);
        const definedSizes = (product.availableSizes as string[]) || [];
        const colors = (product.availableColors as Array<{name: string, hex: string}>) || [];
        const baseSku = product.sku || '';

        // If no sizes defined, delete all variants for this product
        if (definedSizes.length === 0) {
          for (const variant of productVariants) {
            await storage.deleteProductVariant(variant.id);
            deletedCount++;
            deletedVariants.push({ productName: product.name, size: variant.size });
          }
          continue;
        }

        // Delete variants with sizes not in defined sizes
        for (const variant of productVariants) {
          if (variant.size && !definedSizes.includes(variant.size)) {
            await storage.deleteProductVariant(variant.id);
            deletedCount++;
            deletedVariants.push({ productName: product.name, size: variant.size });
          }
        }

        // Create missing variants for defined sizes
        for (const size of definedSizes) {
          if (colors.length > 0) {
            for (const color of colors) {
              const exists = productVariants.some(v => v.size === size && v.color === color.name);
              if (!exists) {
                const variantSku = baseSku ? `${baseSku}-${size}` : null;
                await storage.createProductVariant({
                  productId: product.id,
                  size: size,
                  color: color.name,
                  sku: variantSku,
                  stock: 0,
                  price: product.basePrice,
                });
                createdCount++;
                createdVariants.push({ productName: product.name, size, sku: variantSku });
              }
            }
          } else {
            const exists = productVariants.some(v => v.size === size);
            if (!exists) {
              const variantSku = baseSku ? `${baseSku}-${size}` : null;
              await storage.createProductVariant({
                productId: product.id,
                size: size,
                color: null,
                sku: variantSku,
                stock: 0,
                price: product.basePrice,
              });
              createdCount++;
              createdVariants.push({ productName: product.name, size, sku: variantSku });
            }
          }
        }
      }

      let message = '';
      if (createdCount > 0 && deletedCount > 0) {
        message = `${createdCount} varyant oluşturuldu, ${deletedCount} varyant silindi`;
      } else if (createdCount > 0) {
        message = `${createdCount} eksik varyant oluşturuldu`;
      } else if (deletedCount > 0) {
        message = `${deletedCount} fazla varyant silindi`;
      } else {
        message = 'Tüm varyantlar senkronize, değişiklik yok';
      }

      res.json({
        success: true,
        createdCount,
        deletedCount,
        createdVariants,
        deletedVariants,
        message,
      });
    } catch (error) {
      console.error('Fix variants error:', error);
      res.status(500).json({ error: "Failed to fix missing variants" });
    }
  });

  // Order Management Routes (enhanced)
  app.get("/api/admin/orders/:id/notes", requireAdmin, async (req, res) => {
    try {
      const notes = await storage.getOrderNotes(req.params.id);
      res.json(notes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch order notes" });
    }
  });

  app.post("/api/admin/orders/:id/notes", requireAdmin, async (req, res) => {
    try {
      const note = await storage.createOrderNote({
        orderId: req.params.id,
        authorId: (req as any).adminId,
        content: req.body.content,
        isPrivate: req.body.isInternal !== false,
      });
      res.status(201).json(note);
    } catch (error) {
      res.status(500).json({ error: "Failed to create order note" });
    }
  });

  // Aras Kargo: Create shipment via SetOrder API
  app.post("/api/admin/orders/:id/aras-kargo/create", requireAdmin, async (req, res) => {
    try {
      const { createShipment } = await import('./arasKargoService.js');
      const order = await storage.getOrder(req.params.id);
      if (!order) return res.status(404).json({ error: "Sipariş bulunamadı" });

      // Çift gönderme koruması: notlarda zaten "Aras Kargo API'ye kayıt gönderildi" varsa tekrar gönderme
      const existingNotes = await storage.getOrderNotes(req.params.id);
      const alreadySent = existingNotes.some(n => n.content.includes("Aras Kargo API'ye kayıt gönderildi"));
      if (alreadySent && !req.query.force) {
        return res.json({
          success: false,
          alreadySent: true,
          error: 'Bu sipariş daha önce Aras Kargo sistemine gönderildi. Tekrar göndermek için force=1 parametresi ekleyin.',
        });
      }

      const addr = order.shippingAddress as any;
      const addressLine = [addr?.address, addr?.district, addr?.city].filter(Boolean).join(', ');
      const isWorldwide = addr?.country && addr.country.toLowerCase() !== 'türkiye' && addr.country.toLowerCase() !== 'turkey' && addr.country !== 'TR';

      const result = await createShipment({
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerPhone: order.customerPhone || '',
        address: addressLine || addr?.address || '',
        city: addr?.city || '',
        district: addr?.district || addr?.city || '',
        isWorldwide: !!isWorldwide,
      });

      if (result.success) {
        await storage.createOrderNote({
          orderId: req.params.id,
          content: `Aras Kargo API'ye kayıt gönderildi. Entegrasyon kodu: ${result.integrationCode}. Şube irsaliye oluşturduktan sonra takip numarası "Durumu Sorgula" ile çekilebilir.`,
          authorId: 'system',
        });
      }

      res.json(result);
    } catch (error: any) {
      console.error('[ArasKargo] Create shipment error:', error);
      res.status(500).json({ success: false, error: error.message || 'Kargo oluşturulamadı' });
    }
  });

  // Aras Kargo: Print label (A4 HTML page)
  app.get("/api/admin/orders/:id/aras-kargo/label", requireAdmin, async (req, res) => {
    try {
      const { getLabelData } = await import('./arasKargoService.js');
      const order = await storage.getOrder(req.params.id);
      if (!order) return res.status(404).send('<h1>Sipariş bulunamadı</h1>');

      const label = await getLabelData(order.orderNumber);

      const addr = order.shippingAddress as any;
      const addressLine = [addr?.address, addr?.district, addr?.city].filter(Boolean).join(', ');

      const model = label.barcodeModels?.[0];
      const receiverName = model?.ReceiverAccountName || order.customerName;
      const receiverAddr = [model?.ReceiverAddress, model?.ReceiverAddress2, model?.ReceiverAddress3].filter(Boolean).join(', ') || addressLine;
      const receiverCity = [model?.ReceiverTown, model?.ReceiverCity].filter(Boolean).join(' / ') || (addr?.city || '');
      const receiverPhone = model?.ReceiverPhone || order.customerPhone || '';
      const senderName = model?.SenderAccountName || 'POLEN STONE';
      const senderAddr = [model?.SenderAddress, model?.SenderAddress2].filter(Boolean).join(', ') || 'Polen Stone Doğal Taş & Mermer';
      const barcodeNumber = model?.BarcodeNumber || order.orderNumber;
      const trackingNumber = label.trackingNumber || order.trackingNumber || '-';
      const deliveryUnit = model?.DeliveryUnitName || '';
      const invoiceNo = model?.InvoiceNumber || order.orderNumber;

      // Build barcode image HTML
      let labelImageHtml = '';
      if (label.images && label.images.length > 0) {
        labelImageHtml = label.images.map(b64 =>
          `<img src="data:image/png;base64,${b64}" class="label-img" alt="Kargo Etiketi" />`
        ).join('\n');
      }

      // Inline SVG Code-128-like barcode fallback (visual representation using bars)
      const barcodeDisplayNum = barcodeNumber.replace(/[^A-Z0-9]/gi, '');

      const html = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Aras Kargo Etiketi — ${order.orderNumber}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Arial', sans-serif;
    background: #f5f5f5;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px;
    min-height: 100vh;
  }
  .no-print {
    margin-bottom: 16px;
    display: flex;
    gap: 10px;
  }
  .btn {
    padding: 10px 28px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    font-weight: bold;
    letter-spacing: .5px;
  }
  .btn-print { background: #111; color: #fff; }
  .btn-close  { background: #e5e7eb; color: #111; }
  .page {
    width: 210mm;
    min-height: 297mm;
    background: #fff;
    padding: 12mm;
    box-shadow: 0 2px 16px rgba(0,0,0,.12);
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  /* ── Header ─────────────────────────────────────── */
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 3px solid #111;
    padding-bottom: 8px;
    margin-bottom: 10px;
  }
  .header-brand { font-size: 22px; font-weight: 900; letter-spacing: 2px; color: #111; }
  .header-brand span { color: #e07b39; }
  .header-sub { font-size: 11px; color: #666; text-align: right; }

  /* ── Main label image from API ───────────────────── */
  .label-img-wrapper {
    border: 1.5px solid #ccc;
    border-radius: 6px;
    overflow: hidden;
    margin-bottom: 10px;
    text-align: center;
    background: #fafafa;
    padding: 8px;
  }
  .label-img { max-width: 100%; height: auto; display: block; margin: 0 auto; }

  /* ── Info grid ───────────────────────────────────── */
  .info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 10px;
  }
  .info-box {
    border: 1.5px solid #ddd;
    border-radius: 6px;
    padding: 8px 10px;
  }
  .info-box.highlight { border-color: #111; border-width: 2px; }
  .info-label {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: #888;
    margin-bottom: 4px;
  }
  .info-value {
    font-size: 13px;
    font-weight: 700;
    color: #111;
    line-height: 1.4;
  }
  .info-value.small { font-size: 11px; font-weight: 400; }

  /* ── Barcode section ─────────────────────────────── */
  .barcode-section {
    border: 2px solid #111;
    border-radius: 8px;
    padding: 12px 14px;
    margin-bottom: 10px;
    text-align: center;
    background: #fff;
  }
  .barcode-section .bc-label {
    font-size: 9px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: #666;
    margin-bottom: 6px;
  }
  .barcode-bars {
    display: flex;
    justify-content: center;
    align-items: flex-end;
    gap: 1px;
    height: 52px;
    margin: 0 auto 6px;
    max-width: 340px;
  }
  .barcode-bars .bar {
    background: #111;
    width: 2px;
    border-radius: 1px;
  }
  .barcode-number {
    font-family: 'Courier New', monospace;
    font-size: 15px;
    font-weight: 700;
    letter-spacing: 3px;
    color: #111;
  }
  .tracking-number {
    font-size: 11px;
    color: #555;
    margin-top: 4px;
    letter-spacing: 1px;
  }

  /* ── Divider ─────────────────────────────────────── */
  .divider {
    border: none;
    border-top: 1px dashed #ccc;
    margin: 8px 0;
  }

  /* ── Footer ──────────────────────────────────────── */
  .footer {
    margin-top: auto;
    border-top: 1.5px solid #eee;
    padding-top: 8px;
    display: flex;
    justify-content: space-between;
    font-size: 9px;
    color: #999;
  }

  /* ── Print ───────────────────────────────────────── */
  @media print {
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { background: white; padding: 0; }
    .no-print { display: none !important; }
    .page {
      box-shadow: none;
      margin: 0;
      padding: 10mm;
      width: 210mm;
      min-height: 297mm;
    }
    @page {
      size: A4 portrait;
      margin: 0;
    }
  }
</style>
</head>
<body>

<div class="no-print">
  <button class="btn btn-print" onclick="window.print()">🖨 Yazdır (A4)</button>
  <button class="btn btn-close" onclick="window.close()">✕ Kapat</button>
</div>

<div class="page">

  <!-- Header -->
  <div class="header">
    <div class="header-brand">POLEN <span>STONE</span></div>
    <div class="header-sub">
      Doğal Taş &amp; Mermer<br>
      polenstone.com · info@polenstone.com
    </div>
  </div>

  ${labelImageHtml ? `
  <!-- Label image from Aras API -->
  <div class="label-img-wrapper">
    ${labelImageHtml}
  </div>` : ''}

  <!-- Barcode Section -->
  <div class="barcode-section">
    <div class="bc-label">Kargo Barkodu</div>
    <div class="barcode-bars" id="barcodeCanvas">
      <!-- generated by JS -->
    </div>
    <div class="barcode-number">${barcodeDisplayNum}</div>
    ${trackingNumber !== '-' ? `<div class="tracking-number">Takip No: ${trackingNumber}</div>` : ''}
  </div>

  <!-- Info Grid -->
  <div class="info-grid">
    <div class="info-box highlight">
      <div class="info-label">📦 Alıcı</div>
      <div class="info-value">${receiverName}</div>
      <div class="info-value small">${receiverAddr}</div>
      <div class="info-value small">${receiverCity}</div>
      ${receiverPhone ? `<div class="info-value small">📞 ${receiverPhone}</div>` : ''}
    </div>
    <div class="info-box">
      <div class="info-label">🏭 Gönderici</div>
      <div class="info-value">${senderName}</div>
      <div class="info-value small">${senderAddr}</div>
    </div>
    <div class="info-box">
      <div class="info-label">📋 Sipariş No</div>
      <div class="info-value">${order.orderNumber}</div>
      <div class="info-value small">${new Date().toLocaleDateString('tr-TR')}</div>
    </div>
    <div class="info-box">
      <div class="info-label">🏢 Dağıtım Şubesi</div>
      <div class="info-value">${deliveryUnit || '—'}</div>
      ${invoiceNo ? `<div class="info-value small">Fatura: ${invoiceNo}</div>` : ''}
    </div>
  </div>

  <hr class="divider" />

  <!-- Footer -->
  <div class="footer">
    <span>Aras Kargo — araskargoservisi.com.tr</span>
    <span>Oluşturulma: ${new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}</span>
  </div>

</div>

<script>
// Generate pseudo-barcode bars from barcode string
(function() {
  var code = ${JSON.stringify(barcodeDisplayNum)};
  var container = document.getElementById('barcodeCanvas');
  if (!container || !code) return;
  // Simple visual bar pattern based on char codes
  var bars = '';
  for (var i = 0; i < code.length; i++) {
    var c = code.charCodeAt(i);
    // narrow/wide pattern
    var heights = [
      (c % 5 + 3) * 6,
      (c % 3 + 2) * 6,
      (c % 7 + 2) * 6,
      ((c >> 2) % 4 + 3) * 6,
    ];
    heights.forEach(function(h, j) {
      bars += '<div class="bar" style="height:' + h + 'px;width:' + (j % 2 === 0 ? '2' : '1') + 'px"></div>';
      bars += '<div style="width:1px;height:1px"></div>'; // gap
    });
  }
  // Add guard bars
  var guard = '<div class="bar" style="height:52px;width:2px"></div><div style="width:2px"></div>';
  container.innerHTML = guard + bars + guard;
})();

// Auto-print after short delay
window.addEventListener('load', function() {
  setTimeout(function() { window.print(); }, 600);
});
</script>
</body>
</html>`;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.send(html);
    } catch (error: any) {
      console.error('[ArasKargo] Label error:', error);
      res.status(500).send(`<h2>Etiket oluşturulamadı</h2><p>${error.message}</p>`);
    }
  });

  // Aras Kargo: Query shipment status
  app.get("/api/admin/orders/:id/aras-kargo/status", requireAdmin, async (req, res) => {
    try {
      const { queryShipmentByIntegrationCode } = await import('./arasKargoService.js');
      const order = await storage.getOrder(req.params.id);
      if (!order) return res.status(404).json({ error: "Sipariş bulunamadı" });

      const result = await queryShipmentByIntegrationCode(order.orderNumber);

      // If tracking number found and order doesn't have one yet, save it + trigger notifications
      let savedToOrder = false;
      if (result.success && result.found && result.trackingNumber && !order.trackingNumber) {
        savedToOrder = true;
        const trackingUrl = `https://kargotakip.araskargo.com.tr/mainpage.aspx?code=${result.trackingNumber}`;
        await storage.updateOrderTracking(req.params.id, {
          trackingNumber: result.trackingNumber,
          trackingUrl,
          shippingCarrier: 'Aras Kargo',
        });
        let updatedOrder = order;
        if (order.status !== 'shipped' && order.status !== 'delivered') {
          updatedOrder = (await storage.updateOrder(req.params.id, { status: 'shipped', shippedAt: new Date() })) || order;
        }
        await storage.createOrderNote({
          orderId: req.params.id,
          content: `Aras Kargo takip numarası otomatik alındı: ${result.trackingNumber}`,
          authorId: 'system',
        });
        // Send WhatsApp + email shipping notification (same as manual tracking update)
        const orderForNotif = { ...updatedOrder, trackingNumber: result.trackingNumber, trackingUrl, shippingCarrier: 'Aras Kargo' };
        sendOrderShippedToCustomer(orderForNotif as any).catch(err =>
          console.error('[ArasKargo] WhatsApp shipping notification failed:', err)
        );
        sendShippingNotificationEmail(orderForNotif as any).catch(err =>
          console.error('[ArasKargo] Email shipping notification failed:', err)
        );
      }

      res.json({ ...result, savedToOrder });
    } catch (error: any) {
      console.error('[ArasKargo] Query status error:', error);
      res.status(500).json({ success: false, error: error.message || 'Durum sorgulanamadı' });
    }
  });

  app.put("/api/admin/orders/:id/tracking", requireAdmin, async (req, res) => {
    try {
      const { trackingNumber, trackingUrl, shippingCarrier } = req.body;
      const order = await storage.updateOrderTracking(req.params.id, {
        trackingNumber,
        trackingUrl,
        shippingCarrier,
      });
      if (!order) return res.status(404).json({ error: "Order not found" });

      if (trackingNumber && (order.status === 'shipped' || order.status === 'delivered')) {
        sendOrderShippedToCustomer(order).catch(err =>
          console.error('[WhatsApp] Shipping notification (tracking update) failed:', err)
        );
        sendShippingNotificationEmail(order).catch(err =>
          console.error('[Email] Shipping notification (tracking update) failed:', err)
        );
      }

      res.json(order);
    } catch (error) {
      res.status(500).json({ error: "Failed to update tracking" });
    }
  });

  app.put("/api/admin/orders/:id", requireAdmin, async (req, res) => {
    try {
      const order = await storage.updateOrder(req.params.id, req.body);
      if (!order) return res.status(404).json({ error: "Order not found" });
      res.json(order);
    } catch (error) {
      res.status(500).json({ error: "Failed to update order" });
    }
  });

  // Order cancellation with stock restoration
  app.post("/api/admin/orders/:id/cancel", requireAdmin, async (req, res) => {
    try {
      const order = await storage.getOrder(req.params.id);
      if (!order) return res.status(404).json({ error: "Order not found" });

      // Get order items to restore stock
      const orderItems = await storage.getOrderItems(order.id);
      
      // Restore stock for each variant
      for (const item of orderItems) {
        if (item.variantId) {
          const variant = await storage.getProductVariant(item.variantId);
          if (variant) {
            const newStock = variant.stock + item.quantity;
            await storage.updateProductVariant(variant.id, { stock: newStock });
            await storage.createStockAdjustment({
              variantId: variant.id,
              previousStock: variant.stock,
              newStock: newStock,
              adjustmentType: 'return',
              reason: `Sipariş iptali: ${order.orderNumber}`,
            });
          }
        }
      }

      // Update order status to cancelled
      const updatedOrder = await storage.updateOrder(req.params.id, { 
        status: 'cancelled',
        paymentStatus: 'refunded',
        cancelledAt: order.cancelledAt || new Date(),
      });

      // Add cancellation note
      await storage.createOrderNote({
        orderId: req.params.id,
        authorType: 'admin',
        noteType: 'status_change',
        content: `Sipariş iptal edildi. Sebep: ${req.body.reason || 'Belirtilmedi'}`,
        isPrivate: false,
      });

      // If Aras Kargo was used for this order, try to cancel the shipment too
      // Derive the barcodeNumber the same way createShipment does
      const { getArasCredentials, cancelShipment: arasCancel } = await import('./arasKargoService.js');
      const arasCreds = await getArasCredentials();
      if (arasCreds.enabled && arasCreds.username) {
        const existingNotes = await storage.getOrderNotes(req.params.id);
        const wasSentToAras = existingNotes.some(n => n.content.includes("Aras Kargo API'ye kayıt gönderildi"));
        if (wasSentToAras) {
          const barcodeNumber = order.orderNumber.replace(/[^A-Za-z0-9]/g, '').slice(0, 32);
          arasCancel(barcodeNumber, req.body.reason || 'Siparis iptali').then(result => {
            const noteContent = result.success
              ? `Aras Kargo'da kargo iptali yapıldı. (OperationCode: ${result.operationCode || '-'})`
              : `Aras Kargo iptal denenedi ancak başarısız: ${result.error}`;
            storage.createOrderNote({ orderId: req.params.id, content: noteContent, authorId: 'system' }).catch(() => {});
          }).catch(err => console.error('[ArasKargo] Auto-cancel failed:', err));
        }
      }

      res.json(updatedOrder);
    } catch (error) {
      console.error('Order cancellation error:', error);
      res.status(500).json({ error: "Failed to cancel order" });
    }
  });

  // Aras Kargo: Get registered sender addresses (for settings)
  app.get("/api/admin/aras-kargo/addresses", requireAdmin, async (req, res) => {
    try {
      const { getAddressList } = await import('./arasKargoService.js');
      const result = await getAddressList();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Aras Kargo: GetCargoInfo — real delivery status via DataSet
  app.get("/api/admin/orders/:id/aras-kargo/cargo-info", requireAdmin, async (req, res) => {
    try {
      const { getCargoStatus } = await import('./arasKargoService.js');
      const order = await storage.getOrder(req.params.id);
      if (!order) return res.status(404).json({ error: "Sipariş bulunamadı" });
      const result = await getCargoStatus(order.orderNumber);
      // Auto-mark delivered if Aras says so and order is still in 'shipped'
      if (result.success && result.found && result.status) {
        const teslimKelimesi = ['teslim', 'delivered', 'deliver'].some(k => result.status!.toLowerCase().includes(k));
        if (teslimKelimesi && order.status === 'shipped') {
          await storage.updateOrder(req.params.id, { status: 'delivered', deliveredAt: new Date() });
          await storage.createOrderNote({
            orderId: req.params.id,
            content: `Aras Kargo durumu: "${result.status}" — sipariş teslim edildi olarak işaretlendi.`,
            authorId: 'system',
          });
        }
      }
      res.json(result);
    } catch (error: any) {
      console.error('[ArasKargo] GetCargoInfo error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ── Bank Transfer (Havale) Onaylama ────────────────────────────────────
  // Admin havale ödemesini onaylar: paymentStatus -> paid, status -> confirmed,
  // stok düşer, kupon redeem edilir, müşteriye sipariş onay e-posta + WhatsApp
  // bildirimi gönderilir.
  app.post("/api/admin/orders/:id/confirm-bank-transfer", requireAdmin, async (req, res) => {
    try {
      const order = await storage.getOrder(req.params.id);
      if (!order) return res.status(404).json({ error: "Sipariş bulunamadı" });

      if (order.paymentMethod !== 'bank_transfer') {
        return res.status(400).json({ error: "Bu sipariş havale ödeme değil" });
      }
      if (order.paymentStatus !== 'awaiting_transfer') {
        return res.status(400).json({ error: "Sipariş zaten işlem görmüş" });
      }

      const orderItems = await storage.getOrderItems(order.id);

      // Reduce stock now (was deferred at order creation time)
      for (const item of orderItems) {
        if (item.variantId) {
          const variant = await storage.getProductVariant(item.variantId);
          if (variant) {
            const newStock = Math.max(0, variant.stock - item.quantity);
            await storage.updateProductVariant(item.variantId, { stock: newStock });
            await storage.createStockAdjustment({
              variantId: item.variantId,
              previousStock: variant.stock,
              newStock,
              adjustmentType: 'sale',
              reason: `Havale onayı: ${order.orderNumber}`,
            });
          }
        }
      }

      // Coupon redemption
      if (order.couponCode) {
        try {
          const coupon = await storage.getCouponByCode(order.couponCode);
          if (coupon) {
            await storage.redeemCoupon(coupon.id, order.id, null, parseFloat(order.discountAmount || '0'));
            if (coupon.isInfluencerCode) {
              let commission = 0;
              const orderTotal = parseFloat(order.total);
              switch (coupon.commissionType) {
                case 'percentage':
                  commission = (orderTotal * parseFloat(coupon.commissionValue || '0')) / 100;
                  break;
                case 'per_use':
                  commission = parseFloat(coupon.commissionValue || '0');
                  break;
              }
              if (commission > 0) {
                const currentCommission = parseFloat(coupon.totalCommissionEarned || '0');
                await storage.updateCoupon(coupon.id, {
                  totalCommissionEarned: (currentCommission + commission).toFixed(2),
                });
              }
            }
          }
        } catch (err) {
          console.error('[bank-transfer confirm] Coupon redeem failed:', err);
        }
      }

      const updatedOrder = await storage.updateOrder(req.params.id, {
        status: 'confirmed',
        paymentStatus: 'paid',
      });

      await storage.createOrderNote({
        orderId: req.params.id,
        authorType: 'admin',
        noteType: 'status_change',
        content: 'Havale ödemesi onaylandı.',
        isPrivate: false,
      });

      // Standard order received notifications now that payment is confirmed
      if (updatedOrder) {
        sendOrderConfirmationEmail(updatedOrder, orderItems).catch(err =>
          console.error('[Email] Order confirmation (bank transfer confirmed) failed:', err)
        );
        sendOrderReceivedToCustomer(updatedOrder).catch(err =>
          console.error('[WhatsApp] Order received (bank transfer confirmed) failed:', err)
        );
      }

      res.json(updatedOrder);
    } catch (error) {
      console.error('[bank-transfer confirm] error:', error);
      res.status(500).json({ error: "Havale onaylanamadı" });
    }
  });

  // ── Bank Transfer (Havale) Reddetme ────────────────────────────────────
  // Admin havale ödemesini reddeder: sipariş iptal edilir (stok düşmemişti,
  // restore gerekmiyor), müşteriye iptal bildirimi gönderilir.
  app.post("/api/admin/orders/:id/reject-bank-transfer", requireAdmin, async (req, res) => {
    try {
      const order = await storage.getOrder(req.params.id);
      if (!order) return res.status(404).json({ error: "Sipariş bulunamadı" });

      if (order.paymentMethod !== 'bank_transfer') {
        return res.status(400).json({ error: "Bu sipariş havale ödeme değil" });
      }
      if (order.paymentStatus !== 'awaiting_transfer') {
        return res.status(400).json({ error: "Sipariş zaten işlem görmüş" });
      }

      const updatedOrder = await storage.updateOrder(req.params.id, {
        status: 'cancelled',
        paymentStatus: 'failed',
        cancelledAt: order.cancelledAt || new Date(),
      });

      const reason = (req.body?.reason as string) || 'Havale ödemesi alınamadı';
      await storage.createOrderNote({
        orderId: req.params.id,
        authorType: 'admin',
        noteType: 'status_change',
        content: `Havale reddedildi. Sebep: ${reason}`,
        isPrivate: false,
      });

      if (updatedOrder) {
        sendOrderCancelledToCustomer(updatedOrder).catch(err =>
          console.error('[WhatsApp] Cancelled (bank transfer rejected) failed:', err)
        );
      }

      res.json(updatedOrder);
    } catch (error) {
      console.error('[bank-transfer reject] error:', error);
      res.status(500).json({ error: "Havale reddedilemedi" });
    }
  });

  // User order stats for detail modal
  app.get("/api/admin/users/:id/stats", requireAdmin, async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) return res.status(404).json({ error: "User not found" });
      
      const stats = await storage.getUserOrderStats(user.email);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user stats" });
    }
  });

  // Influencer coupons routes
  app.get("/api/admin/influencer-coupons", requireAdmin, async (req, res) => {
    try {
      const coupons = await storage.getInfluencerCoupons();
      res.json(coupons);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch influencer coupons" });
    }
  });

  app.post("/api/admin/influencer-coupons/:id/pay", requireAdmin, async (req, res) => {
    try {
      const coupon = await storage.markInfluencerPaid(req.params.id);
      if (!coupon) return res.status(404).json({ error: "Coupon not found" });
      res.json(coupon);
    } catch (error) {
      res.status(500).json({ error: "Failed to mark as paid" });
    }
  });

  // Bulk add influencers
  app.post("/api/admin/influencer-coupons/bulk", requireAdmin, async (req, res) => {
    try {
      const { influencers } = req.body;
      if (!Array.isArray(influencers) || influencers.length === 0) {
        return res.status(400).json({ error: "No influencers provided" });
      }

      const results = [];
      for (const inf of influencers) {
        try {
          const coupon = await storage.createCoupon({
            code: inf.code.toUpperCase(),
            description: `${inf.name || inf.code} - Influencer Kodu`,
            discountType: 'percentage',
            discountValue: String(inf.customerDiscount || 10),
            isActive: true,
            isInfluencerCode: true,
            influencerName: inf.name || inf.code,
            influencerInstagram: inf.instagram || null,
            commissionType: 'percentage',
            commissionValue: String(inf.commissionPercent || 5),
          });
          results.push({ code: inf.code, success: true, id: coupon.id });
        } catch (err: any) {
          results.push({ code: inf.code, success: false, error: err.message });
        }
      }

      res.json({ results, success: results.filter(r => r.success).length, failed: results.filter(r => !r.success).length });
    } catch (error) {
      console.error('Bulk influencer add error:', error);
      res.status(500).json({ error: "Failed to add influencers" });
    }
  });

  // Influencer analytics - monthly usage
  app.get("/api/admin/influencer-analytics", requireAdmin, async (req, res) => {
    try {
      const { startDate, endDate, couponId } = req.query;
      
      // Get all influencer coupons with their redemptions
      const influencerCoupons = await storage.getInfluencerCoupons();
      
      // Get redemption details with order info
      const redemptionsQuery = await db.select({
        redemption: couponRedemptions,
        order: orders,
        coupon: coupons,
      })
      .from(couponRedemptions)
      .leftJoin(orders, eq(couponRedemptions.orderId, orders.id))
      .leftJoin(coupons, eq(couponRedemptions.couponId, coupons.id))
      .where(eq(coupons.isInfluencerCode, true))
      .orderBy(desc(couponRedemptions.createdAt));

      // Filter by date if provided
      let filteredRedemptions = redemptionsQuery;
      if (startDate) {
        const start = new Date(startDate as string);
        filteredRedemptions = filteredRedemptions.filter(r => new Date(r.redemption.createdAt) >= start);
      }
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        filteredRedemptions = filteredRedemptions.filter(r => new Date(r.redemption.createdAt) <= end);
      }
      if (couponId) {
        filteredRedemptions = filteredRedemptions.filter(r => r.coupon?.id === couponId);
      }

      // Group by month
      const monthlyData: Record<string, { month: string; count: number; revenue: number; commission: number }> = {};
      
      for (const r of filteredRedemptions) {
        const date = new Date(r.redemption.createdAt);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { month: monthKey, count: 0, revenue: 0, commission: 0 };
        }
        
        monthlyData[monthKey].count += 1;
        monthlyData[monthKey].revenue += parseFloat(r.order?.total || '0');
        
        // Calculate commission
        const coupon = r.coupon;
        if (coupon && coupon.commissionType === 'percentage') {
          monthlyData[monthKey].commission += (parseFloat(r.order?.total || '0') * parseFloat(coupon.commissionValue || '0')) / 100;
        } else if (coupon && coupon.commissionType === 'per_use') {
          monthlyData[monthKey].commission += parseFloat(coupon.commissionValue || '0');
        }
      }

      // Convert to array and sort
      const monthlyArray = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));

      res.json({
        influencers: influencerCoupons,
        monthlyData: monthlyArray,
        redemptions: filteredRedemptions.map(r => ({
          id: r.redemption.id,
          couponId: r.redemption.couponId,
          couponCode: r.coupon?.code,
          influencerName: r.coupon?.influencerName,
          orderId: r.order?.id,
          orderNumber: r.order?.orderNumber,
          orderTotal: r.order?.total,
          discountAmount: r.redemption.discountAmount,
          createdAt: r.redemption.createdAt,
        })),
        totals: {
          totalRedemptions: filteredRedemptions.length,
          totalRevenue: filteredRedemptions.reduce((sum, r) => sum + parseFloat(r.order?.total || '0'), 0),
          totalCommission: Object.values(monthlyData).reduce((sum, m) => sum + m.commission, 0),
        },
      });
    } catch (error) {
      console.error('Influencer analytics error:', error);
      res.status(500).json({ error: "Failed to fetch influencer analytics" });
    }
  });

  // Influencer detail endpoint
  app.get("/api/admin/influencer/:couponId/detail", requireAdmin, async (req, res) => {
    try {
      const { couponId } = req.params;

      // Get the influencer coupon
      const [coupon] = await db.select().from(coupons).where(eq(coupons.id, couponId));
      if (!coupon || !coupon.isInfluencerCode) {
        return res.status(404).json({ error: "Influencer not found" });
      }

      // Get all redemptions for this influencer
      const redemptionsData = await db.select({
        redemption: couponRedemptions,
        order: orders,
      })
      .from(couponRedemptions)
      .leftJoin(orders, eq(couponRedemptions.orderId, orders.id))
      .where(eq(couponRedemptions.couponId, couponId))
      .orderBy(desc(couponRedemptions.createdAt));

      // Group by month
      const monthlyMap: Record<string, { month: string; label: string; count: number; revenue: number; commission: number }> = {};
      let totalRevenue = 0;
      let totalCommissionAllTime = 0;

      for (const r of redemptionsData) {
        const date = new Date(r.redemption.createdAt);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const label = date.toLocaleDateString('tr-TR', { year: 'numeric', month: 'long' });

        if (!monthlyMap[monthKey]) {
          monthlyMap[monthKey] = { month: monthKey, label, count: 0, revenue: 0, commission: 0 };
        }

        const orderTotal = parseFloat(r.order?.total || '0');
        monthlyMap[monthKey].count += 1;
        monthlyMap[monthKey].revenue += orderTotal;
        totalRevenue += orderTotal;

        let commission = 0;
        if (coupon.commissionType === 'percentage') {
          commission = orderTotal * (parseFloat(coupon.commissionValue || '0') / 100);
        } else if (coupon.commissionType === 'per_use') {
          commission = parseFloat(coupon.commissionValue || '0');
        }
        monthlyMap[monthKey].commission += commission;
        totalCommissionAllTime += commission;
      }

      const monthlyData = Object.values(monthlyMap).sort((a, b) => b.month.localeCompare(a.month));

      // Get payment history
      const paymentHistory = await storage.getInfluencerPayments(couponId);

      // Format redemptions
      const redemptions = redemptionsData.map(r => ({
        id: r.redemption.id,
        orderId: r.order?.id,
        orderNumber: r.order?.orderNumber,
        orderTotal: r.order?.total,
        discountAmount: r.redemption.discountAmount,
        createdAt: r.redemption.createdAt,
        orderStatus: r.order?.status,
      }));

      res.json({
        influencer: coupon,
        monthlyData,
        redemptions,
        paymentHistory,
        totals: {
          totalOrders: redemptionsData.length,
          totalRevenue,
          totalCommissionAllTime,
          pendingCommission: parseFloat(coupon.totalCommissionEarned || '0'),
        },
      });
    } catch (error) {
      console.error('Influencer detail error:', error);
      res.status(500).json({ error: "Failed to fetch influencer detail" });
    }
  });

  // Admin credentials update route
  app.post("/api/admin/update-credentials", requireAdmin, async (req, res) => {
    try {
      const { newUsername, newPassword } = req.body;
      
      if (!newUsername || !newPassword) {
        return res.status(400).json({ error: "Username and password required" });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      // Get current admin and update
      const admin = await storage.getAdminUser((req as any).adminId);
      if (!admin) return res.status(404).json({ error: "Admin not found" });

      await storage.updateAdminUser(admin.id, {
        username: newUsername,
        password: hashedPassword,
      });

      res.json({ success: true, message: "Credentials updated" });
    } catch (error) {
      console.error('Credentials update error:', error);
      res.status(500).json({ error: "Failed to update credentials" });
    }
  });

  // Campaign Routes
  app.get("/api/admin/campaigns", requireAdmin, async (req, res) => {
    try {
      const campaigns = await storage.getCampaigns();
      res.json(campaigns);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch campaigns" });
    }
  });

  app.get("/api/admin/campaigns/:id", requireAdmin, async (req, res) => {
    try {
      const campaign = await storage.getCampaign(req.params.id);
      if (!campaign) return res.status(404).json({ error: "Campaign not found" });
      res.json(campaign);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch campaign" });
    }
  });

  app.post("/api/admin/campaigns", requireAdmin, async (req, res) => {
    try {
      const campaign = await storage.createCampaign(req.body);
      res.status(201).json(campaign);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to create campaign" });
    }
  });

  app.put("/api/admin/campaigns/:id", requireAdmin, async (req, res) => {
    try {
      const campaign = await storage.updateCampaign(req.params.id, req.body);
      if (!campaign) return res.status(404).json({ error: "Campaign not found" });
      res.json(campaign);
    } catch (error) {
      res.status(500).json({ error: "Failed to update campaign" });
    }
  });

  app.delete("/api/admin/campaigns/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteCampaign(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete campaign" });
    }
  });

  app.get("/api/admin/campaigns/:id/emails", requireAdmin, async (req, res) => {
    try {
      const emails = await storage.getEmailJobsByCampaign(req.params.id);
      res.json(emails);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch campaign emails" });
    }
  });

  app.get("/api/admin/email-recipients", requireAdmin, async (req, res) => {
    try {
      const segment = (req.query.segment as 'all' | 'active' | 'new') || 'all';
      const recipients = await storage.getEmailsForBulkSend(segment);
      res.json(recipients);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch email recipients" });
    }
  });

  // Site Settings Routes
  app.get("/api/admin/settings", requireAdmin, async (req, res) => {
    try {
      const settings = await storage.getSiteSettings();
      // Mask sensitive credentials
      if (settings.smtp_pass) {
        settings.smtp_pass = '••••••••';
      }
      if (settings.wpileti_api_key) {
        settings.wpileti_api_key = '••••••••';
      }
      if (settings.turnstile_secret_key) {
        settings.turnstile_secret_key = '••••••••';
      }
      if (settings.aras_kargo_password) {
        settings.aras_kargo_password = '••••••••';
      }
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.post("/api/admin/settings", requireAdmin, async (req, res) => {
    try {
      const settings = req.body;
      // Don't update masked credentials
      if (settings.smtp_pass === '••••••••') {
        delete settings.smtp_pass;
      }
      if (settings.wpileti_api_key === '••••••••') {
        delete settings.wpileti_api_key;
      }
      if (settings.turnstile_secret_key === '••••••••') {
        delete settings.turnstile_secret_key;
      }
      if (settings.aras_kargo_password === '••••••••') {
        delete settings.aras_kargo_password;
      }
      await storage.setSiteSettings(settings);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to save settings" });
    }
  });

  app.post("/api/admin/settings/test-email", requireAdmin, async (req, res) => {
    try {
      const { email } = req.body;
      const result = await sendTestEmail(email);
      if (result.success) {
        res.json({ success: true, message: "Test e-postası gönderildi" });
      } else {
        res.status(400).json({ success: false, error: result.error });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Test e-postası gönderilemedi" });
    }
  });

  app.post("/api/admin/whatsapp/test", requireAdmin, async (req, res) => {
    try {
      const { phone, message } = req.body || {};
      if (!phone || typeof phone !== 'string') {
        return res.status(400).json({ success: false, error: "Telefon numarası gerekli" });
      }
      const result = await sendTestWhatsApp(phone, typeof message === 'string' ? message : undefined);
      if (result.success) {
        res.json({ success: true, message: "Test WhatsApp mesajı gönderildi" });
      } else {
        res.status(400).json({ success: false, error: result.error || "Test mesajı gönderilemedi" });
      }
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || "Test mesajı gönderilemedi" });
    }
  });

  // Abandoned Cart Reminder - Get users with cart items
  app.get("/api/admin/abandoned-carts", requireAdmin, async (req, res) => {
    try {
      const users = await storage.getUsersWithCartItems();
      res.json(users);
    } catch (error) {
      console.error('[Admin] Abandoned carts error:', error);
      res.status(500).json({ error: "Sepet bilgileri alınamadı" });
    }
  });

  // Send cart reminder email to a specific user
  app.post("/api/admin/abandoned-carts/:userId/remind", requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "Kullanıcı bulunamadı" });
      }

      const cartItems = await storage.getCartItems(userId);
      if (cartItems.length === 0) {
        return res.status(400).json({ error: "Kullanıcının sepetinde ürün yok" });
      }

      // Get product details for cart items
      const cartItemsWithDetails = await Promise.all(
        cartItems.map(async (item) => {
          const variant = item.variantId ? await storage.getProductVariant(item.variantId) : null;
          // Use variant's productId if available to ensure consistency
          const actualProductId = variant?.productId || item.productId;
          const product = await storage.getProduct(actualProductId);
          return {
            productName: product?.name || 'Ürün',
            variantDetails: variant ? `${variant.size || ''} ${variant.color || ''}`.trim() : '',
            price: product?.basePrice || '0',
            quantity: item.quantity,
          };
        })
      );

      const cartTotal = cartItemsWithDetails.reduce(
        (sum, item) => sum + parseFloat(item.price) * item.quantity,
        0
      );

      const result = await sendAbandonedCartEmail(
        user.email,
        user.firstName || 'Değerli Müşterimiz',
        cartItemsWithDetails,
        cartTotal
      );

      if (result.success) {
        res.json({ success: true, message: "Sepet hatırlatma e-postası gönderildi" });
      } else {
        res.status(400).json({ success: false, error: result.error });
      }
    } catch (error: any) {
      console.error('[Admin] Cart reminder error:', error);
      res.status(500).json({ error: error.message || "E-posta gönderilemedi" });
    }
  });

  // Send cart reminder to all users with items in cart
  app.post("/api/admin/abandoned-carts/remind-all", requireAdmin, async (req, res) => {
    try {
      const users = await storage.getUsersWithCartItems();
      
      if (users.length === 0) {
        return res.json({ success: true, sent: 0, message: "Sepetinde ürün olan kullanıcı yok" });
      }

      let sent = 0;
      let failed = 0;

      for (const user of users) {
        try {
          const cartItems = await storage.getCartItems(user.id);
          
          const cartItemsWithDetails = await Promise.all(
            cartItems.map(async (item) => {
              const variant = item.variantId ? await storage.getProductVariant(item.variantId) : null;
              // Use variant's productId if available to ensure consistency
              const actualProductId = variant?.productId || item.productId;
              const product = await storage.getProduct(actualProductId);
              return {
                productName: product?.name || 'Ürün',
                variantDetails: variant ? `${variant.size || ''} ${variant.color || ''}`.trim() : '',
                price: product?.basePrice || '0',
                quantity: item.quantity,
              };
            })
          );

          const cartTotal = cartItemsWithDetails.reduce(
            (sum, item) => sum + parseFloat(item.price) * item.quantity,
            0
          );

          const result = await sendAbandonedCartEmail(
            user.email,
            user.firstName || 'Değerli Müşterimiz',
            cartItemsWithDetails,
            cartTotal
          );

          if (result.success) {
            sent++;
          } else {
            failed++;
          }
        } catch (err) {
          console.error(`[Admin] Failed to send cart reminder to ${user.email}:`, err);
          failed++;
        }
      }

      res.json({ 
        success: true, 
        sent, 
        failed, 
        message: `${sent} kullanıcıya e-posta gönderildi${failed > 0 ? `, ${failed} başarısız` : ''}` 
      });
    } catch (error: any) {
      console.error('[Admin] Bulk cart reminder error:', error);
      res.status(500).json({ error: error.message || "E-postalar gönderilemedi" });
    }
  });

  // Password Reset Routes
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        // Don't reveal if email exists
        return res.json({ success: true, message: "Eğer bu e-posta kayıtlıysa, şifre sıfırlama bağlantısı gönderildi." });
      }
      
      // Generate secure token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      
      await storage.createPasswordResetToken(user.id, token, expiresAt);
      await sendPasswordResetEmail(user, token);
      
      res.json({ success: true, message: "Şifre sıfırlama bağlantısı e-posta adresinize gönderildi." });
    } catch (error) {
      console.error('[Auth] Forgot password error:', error);
      res.status(500).json({ error: "Şifre sıfırlama işlemi başarısız" });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        return res.status(400).json({ error: "Token ve yeni şifre gerekli" });
      }
      
      if (newPassword.length < 6) {
        return res.status(400).json({ error: "Şifre en az 6 karakter olmalı" });
      }
      
      const resetToken = await storage.getPasswordResetToken(token);
      
      if (!resetToken) {
        return res.status(400).json({ error: "Geçersiz veya süresi dolmuş bağlantı" });
      }
      
      if (resetToken.usedAt) {
        return res.status(400).json({ error: "Bu bağlantı zaten kullanılmış" });
      }
      
      if (new Date() > resetToken.expiresAt) {
        return res.status(400).json({ error: "Bağlantının süresi dolmuş" });
      }
      
      // Update password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await storage.updateUser(resetToken.userId, { password: hashedPassword });
      
      // Mark token as used
      await storage.markPasswordResetTokenUsed(token);
      
      res.json({ success: true, message: "Şifreniz başarıyla güncellendi" });
    } catch (error) {
      console.error('[Auth] Reset password error:', error);
      res.status(500).json({ error: "Şifre sıfırlama işlemi başarısız" });
    }
  });

  app.get("/api/auth/verify-reset-token/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const resetToken = await storage.getPasswordResetToken(token);
      
      if (!resetToken || resetToken.usedAt || new Date() > resetToken.expiresAt) {
        return res.json({ valid: false });
      }
      
      const user = await storage.getUser(resetToken.userId);
      res.json({ valid: true, email: user?.email || '' });
    } catch (error) {
      res.json({ valid: false });
    }
  });

  // Send shipping notification email when status changes to shipped
  app.post("/api/admin/orders/:id/send-shipping-email", requireAdmin, async (req, res) => {
    try {
      const order = await storage.getOrder(req.params.id);
      if (!order) return res.status(404).json({ error: "Sipariş bulunamadı" });
      
      const result = await sendShippingNotificationEmail(order);
      if (result.success) {
        res.json({ success: true, message: "Kargo bildirimi gönderildi" });
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (error) {
      res.status(500).json({ error: "E-posta gönderilemedi" });
    }
  });

  // Send review request email
  app.post("/api/admin/orders/:id/send-review-request", requireAdmin, async (req, res) => {
    try {
      const order = await storage.getOrder(req.params.id);
      if (!order) return res.status(404).json({ error: "Sipariş bulunamadı" });
      
      const items = await storage.getOrderItems(order.id);
      const productNames = items.map(item => item.productName);
      
      const result = await sendReviewRequestEmail(
        order.customerEmail,
        order.customerName,
        order.orderNumber,
        productNames
      );
      
      if (result.success) {
        res.json({ success: true, message: "Değerlendirme talebi gönderildi" });
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (error) {
      res.status(500).json({ error: "E-posta gönderilemedi" });
    }
  });

  // Sitemap XML
  app.get("/sitemap.xml", async (req, res) => {
    try {
      const baseUrl = req.protocol + '://' + req.get('host');
      const products = await storage.getProducts();
      const categories = await storage.getCategories();
      
      const escapeXml = (str: string) => {
        return str
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&apos;');
      };
      
      const normalizeUrl = (url: string) => {
        if (!url) return '';
        if (url.startsWith('http://') || url.startsWith('https://')) {
          return url;
        }
        return baseUrl + (url.startsWith('/') ? url : '/' + url);
      };
      
      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
      xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n';
      
      const staticPages = [
        { loc: '/', priority: '1.0', changefreq: 'daily' },
        { loc: '/giris', priority: '0.5', changefreq: 'monthly' },
        { loc: '/kayit', priority: '0.5', changefreq: 'monthly' },
        { loc: '/sepet', priority: '0.6', changefreq: 'weekly' },
      ];
      
      for (const page of staticPages) {
        xml += '  <url>\n';
        xml += `    <loc>${escapeXml(baseUrl + page.loc)}</loc>\n`;
        xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
        xml += `    <priority>${page.priority}</priority>\n`;
        xml += '  </url>\n';
      }
      
      for (const category of categories) {
        xml += '  <url>\n';
        xml += `    <loc>${escapeXml(baseUrl + '/kategori/' + category.slug)}</loc>\n`;
        xml += '    <changefreq>weekly</changefreq>\n';
        xml += '    <priority>0.8</priority>\n';
        xml += '  </url>\n';
      }
      
      for (const product of products) {
        xml += '  <url>\n';
        xml += `    <loc>${escapeXml(baseUrl + '/urun/' + product.slug)}</loc>\n`;
        xml += '    <changefreq>weekly</changefreq>\n';
        xml += '    <priority>0.9</priority>\n';
        if (product.images && product.images.length > 0) {
          const imageUrl = normalizeUrl(product.images[0]);
          xml += '    <image:image>\n';
          xml += `      <image:loc>${escapeXml(imageUrl)}</image:loc>\n`;
          xml += `      <image:title>${escapeXml(product.name)}</image:title>\n`;
          xml += '    </image:image>\n';
        }
        xml += '  </url>\n';
      }
      
      xml += '</urlset>';
      
      res.set('Content-Type', 'application/xml');
      res.send(xml);
    } catch (error) {
      console.error('Sitemap error:', error);
      res.status(500).send('Error generating sitemap');
    }
  });

  // Robots.txt
  app.get("/robots.txt", (req, res) => {
    const host = req.get('host') || '';
    const isProd = host.includes('polenstone.com');
    const baseUrl = isProd
      ? 'https://polenstone.com'
      : `${req.protocol}://${host}`;
    const robotsTxt = `User-agent: *
Allow: /

Disallow: /sepet
Disallow: /odeme
Disallow: /odeme-basarili
Disallow: /odeme-basarisiz
Disallow: /siparis-takip
Disallow: /hesabim
Disallow: /hesabim/
Disallow: /giris
Disallow: /kayit
Disallow: /sifremi-unuttum
Disallow: /sifre-sifirla
Disallow: /toov-admin
Disallow: /toov-admin/
Disallow: /api/
Disallow: /uploads/temp/

Sitemap: ${baseUrl}/sitemap.xml
`;
    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(robotsTxt);
  });

  // Cache invalidation endpoint for admin
  app.post("/api/admin/cache/clear", requireAdmin, (req, res) => {
    cache.clear();
    res.json({ success: true, message: "Cache cleared" });
  });

  app.get("/api/admin/cache/stats", requireAdmin, (req, res) => {
    res.json(cache.getStats());
  });

  // Database Management Endpoints - for clearing specific tables
  app.get("/api/admin/database/stats", requireAdmin, async (req, res) => {
    try {
      const [ordersCount, cartItemsCount, pendingPaymentsCount, reviewsCount, couponUsageCount, productsCount] = await Promise.all([
        storage.getOrdersCount(),
        storage.getCartItemsCount(),
        storage.getPendingPaymentsCount(),
        storage.getReviewsCount(),
        storage.getCouponUsageCount(),
        storage.getProductsCount(),
      ]);
      
      res.json({
        orders: ordersCount,
        cartItems: cartItemsCount,
        pendingPayments: pendingPaymentsCount,
        reviews: reviewsCount,
        couponUsage: couponUsageCount,
        products: productsCount,
      });
    } catch (error) {
      console.error('[Database] Stats error:', error);
      res.status(500).json({ error: "Veritabanı istatistikleri alınamadı" });
    }
  });

  app.post("/api/admin/database/clear/:table", requireAdmin, async (req: Request, res) => {
    try {
      const { table } = req.params;
      const { confirmCode } = req.body;
      
      // Ürünler için ekstra güvenli onay kodu — yanlışlıkla katalog silinmesin
      const requiredCode = table === 'products' ? 'TUM_URUNLERI_SIL' : 'SIFIRLA';
      if (confirmCode !== requiredCode) {
        return res.status(400).json({ error: `Onay kodu hatalı. '${requiredCode}' yazmalısınız.` });
      }
      
      // List of safe-to-clear tables (NOT users, categories)
      const allowedTables = ['orders', 'order_items', 'cart_items', 'pending_payments', 'reviews', 'review_requests', 'coupon_usage', 'stock_adjustments', 'products'];
      
      if (!allowedTables.includes(table)) {
        return res.status(403).json({ error: "Bu tablo silinemez" });
      }
      
      let deletedCount = 0;
      
      switch (table) {
        case 'orders':
          // First delete order items, then orders
          await storage.clearOrderItems();
          deletedCount = await storage.clearOrders();
          break;
        case 'order_items':
          deletedCount = await storage.clearOrderItems();
          break;
        case 'cart_items':
          deletedCount = await storage.clearAllCartItems();
          break;
        case 'pending_payments':
          deletedCount = await storage.clearPendingPayments();
          break;
        case 'reviews':
          deletedCount = await storage.clearReviews();
          break;
        case 'review_requests':
          deletedCount = await storage.clearReviewRequests();
          break;
        case 'coupon_usage':
          deletedCount = await storage.clearCouponUsage();
          // Also reset coupon usage counts
          await storage.resetCouponUsageCounts();
          break;
        case 'stock_adjustments':
          deletedCount = await storage.clearStockAdjustments();
          break;
        case 'products': {
          // Tüm ürünleri ve bağlı kayıtları sil; order_items.product_id NULL olur (sipariş geçmişi korunur).
          const result = await storage.deleteAllProducts();
          deletedCount = result.deletedProducts;
          // Ürün fotoğraflarını dosya sisteminden de temizle
          let removedFiles = 0;
          for (const imgPath of result.imagePaths) {
            if (typeof imgPath !== 'string' || !imgPath.startsWith('/uploads/')) continue;
            try {
              const absolute = path.join(process.cwd(), 'client/public', imgPath);
              await fs.promises.unlink(absolute);
              removedFiles += 1;
            } catch (e: any) {
              if (e?.code !== 'ENOENT') {
                console.warn(`[Database] Could not remove image ${imgPath}:`, e?.message || e);
              }
            }
          }
          console.log(`[Database] Products cleared: ${result.deletedProducts} products, ${result.deletedVariants} variants, ${removedFiles}/${result.imagePaths.length} images removed from disk.`);
          break;
        }
        default:
          return res.status(400).json({ error: "Geçersiz tablo adı" });
      }
      
      console.log(`[Database] Table ${table} cleared by admin. ${deletedCount} records deleted.`);
      res.json({ success: true, table, deletedCount });
    } catch (error) {
      console.error('[Database] Clear error:', error);
      res.status(500).json({ error: "Tablo temizlenemedi" });
    }
  });

  // Clear all sales data (orders, order_items, pending_payments, coupon_usage)
  app.post("/api/admin/database/clear-all-sales", requireAdmin, async (req: Request, res) => {
    try {
      const { confirmCode } = req.body;
      
      if (confirmCode !== 'TUM_SATISLARI_SIL') {
        return res.status(400).json({ error: "Onay kodu hatalı. 'TUM_SATISLARI_SIL' yazmalısınız." });
      }
      
      // Clear in order of dependencies
      await storage.clearOrderItems();
      await storage.clearOrders();
      await storage.clearPendingPayments();
      await storage.clearCouponUsage();
      await storage.resetCouponUsageCounts();
      await storage.clearAllCartItems();
      
      console.log('[Database] All sales data cleared by admin');
      res.json({ success: true, message: "Tüm satış verileri silindi" });
    } catch (error) {
      console.error('[Database] Clear all sales error:', error);
      res.status(500).json({ error: "Satış verileri silinemedi" });
    }
  });

  // ============= DEALER (BAYİ) MANAGEMENT =============

  // Get all dealers
  app.get("/api/admin/dealers", requireAdmin, async (req, res) => {
    try {
      const dealerList = await storage.getDealers();
      res.json(dealerList);
    } catch (error) {
      console.error('[Dealers] Get all error:', error);
      res.status(500).json({ error: "Bayiler alınamadı" });
    }
  });

  // Get single dealer
  app.get("/api/admin/dealers/:id", requireAdmin, async (req, res) => {
    try {
      const dealer = await storage.getDealer(req.params.id);
      if (!dealer) {
        return res.status(404).json({ error: "Bayi bulunamadı" });
      }
      res.json(dealer);
    } catch (error) {
      console.error('[Dealers] Get one error:', error);
      res.status(500).json({ error: "Bayi alınamadı" });
    }
  });

  // Create dealer
  app.post("/api/admin/dealers", requireAdmin, async (req, res) => {
    try {
      const { name, email, phone, contactPerson, address, notes, status } = req.body;
      
      if (!name || !email || !phone || !contactPerson) {
        return res.status(400).json({ error: "İsim, e-posta, telefon ve yetkili kişi zorunludur" });
      }
      
      const newDealer = await storage.createDealer({
        name,
        email,
        phone,
        contactPerson,
        address: address || null,
        notes: notes || null,
        status: status || 'active'
      });
      
      res.status(201).json(newDealer);
    } catch (error) {
      console.error('[Dealers] Create error:', error);
      res.status(500).json({ error: "Bayi oluşturulamadı" });
    }
  });

  // Update dealer
  app.put("/api/admin/dealers/:id", requireAdmin, async (req, res) => {
    try {
      const updated = await storage.updateDealer(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Bayi bulunamadı" });
      }
      res.json(updated);
    } catch (error) {
      console.error('[Dealers] Update error:', error);
      res.status(500).json({ error: "Bayi güncellenemedi" });
    }
  });

  // Delete dealer
  app.delete("/api/admin/dealers/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteDealer(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('[Dealers] Delete error:', error);
      res.status(500).json({ error: "Bayi silinemedi" });
    }
  });

  // ============= QUOTE (TEKLİF) MANAGEMENT =============

  // Get all quotes (optionally by dealer)
  app.get("/api/admin/quotes", requireAdmin, async (req, res) => {
    try {
      const dealerId = req.query.dealerId as string | undefined;
      const quoteList = await storage.getQuotes(dealerId);
      
      // Enrich with dealer info
      const enriched = await Promise.all(quoteList.map(async (quote) => {
        const dealer = await storage.getDealer(quote.dealerId);
        const items = await storage.getQuoteItems(quote.id);
        return { ...quote, dealer, itemCount: items.length };
      }));
      
      res.json(enriched);
    } catch (error) {
      console.error('[Quotes] Get all error:', error);
      res.status(500).json({ error: "Teklifler alınamadı" });
    }
  });

  // Get single quote with items
  app.get("/api/admin/quotes/:id", requireAdmin, async (req, res) => {
    try {
      const quote = await storage.getQuote(req.params.id);
      if (!quote) {
        return res.status(404).json({ error: "Teklif bulunamadı" });
      }
      
      const dealer = await storage.getDealer(quote.dealerId);
      const items = await storage.getQuoteItems(quote.id);
      
      res.json({ ...quote, dealer, items });
    } catch (error) {
      console.error('[Quotes] Get one error:', error);
      res.status(500).json({ error: "Teklif alınamadı" });
    }
  });

  // Generate PDF for quote
  app.get("/api/admin/quotes/:id/pdf", requireAdmin, async (req, res) => {
    try {
      const quote = await storage.getQuote(req.params.id);
      if (!quote) {
        return res.status(404).json({ error: "Teklif bulunamadı" });
      }
      
      const dealer = await storage.getDealer(quote.dealerId);
      const items = await storage.getQuoteItems(quote.id);
      
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      
      // Register Inter fonts for Turkish character support
      const fontPath = path.join(process.cwd(), 'public', 'fonts');
      const regularFontPath = path.join(fontPath, 'inter-regular.ttf');
      const boldFontPath = path.join(fontPath, 'inter-bold.ttf');
      
      if (fs.existsSync(regularFontPath) && fs.existsSync(boldFontPath)) {
        doc.registerFont('Inter', regularFontPath);
        doc.registerFont('Inter-Bold', boldFontPath);
      }
      
      const fontRegular = fs.existsSync(regularFontPath) ? 'Inter' : 'Helvetica';
      const fontBold = fs.existsSync(boldFontPath) ? 'Inter-Bold' : 'Helvetica-Bold';
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Teklif-${quote.quoteNumber}.pdf"`);
      
      doc.pipe(res);
      
      // Header logo - convert SVG to PNG using sharp
      const svgLogoPath = path.join(process.cwd(), 'client', 'public', 'uploads', 'branding', 'polen-logo.svg');
      const pngLogoPath = path.join(process.cwd(), 'client', 'public', 'uploads', 'branding', 'polen-icon.png');
      
      let logoAdded = false;
      if (fs.existsSync(svgLogoPath)) {
        try {
          const pngBuffer = await sharp(svgLogoPath).resize(120).png().toBuffer();
          doc.image(pngBuffer, 50, 35, { width: 80 });
          logoAdded = true;
        } catch (e) {
          console.log('[PDF] SVG to PNG conversion failed:', e);
        }
      }
      
      if (!logoAdded && fs.existsSync(pngLogoPath)) {
        doc.image(pngLogoPath, 50, 40, { width: 60 });
        logoAdded = true;
      }
      
      if (!logoAdded) {
        doc.fontSize(28).font(fontBold).fillColor('#000000').text('Polen Stone', 50, 50);
      }
      
      // Quote title
      doc.fontSize(24).font(fontBold).fillColor('#000000').text('TEKLİF', 350, 50, { align: 'right' });
      doc.fontSize(12).font(fontRegular).fillColor('#666666').text(quote.quoteNumber, 350, 80, { align: 'right' });
      
      doc.moveDown(2);
      
      // Dealer info box
      const yStart = 120;
      doc.rect(50, yStart, 250, 100).fillAndStroke('#f5f5f5', '#e0e0e0');
      doc.fontSize(10).font(fontBold).fillColor('#333333').text('BAYİ BİLGİLERİ', 60, yStart + 10);
      doc.fontSize(11).font(fontRegular).fillColor('#000000').text(dealer?.name || 'Bilinmeyen', 60, yStart + 30);
      if (dealer?.contactPerson) {
        doc.fontSize(9).fillColor('#666666').text(dealer.contactPerson, 60, yStart + 45);
      }
      if (dealer?.email) {
        doc.fontSize(9).text(dealer.email, 60, yStart + 60);
      }
      if (dealer?.phone) {
        doc.fontSize(9).text(dealer.phone, 60, yStart + 75);
      }
      
      // Quote details box
      doc.rect(310, yStart, 235, 100).fillAndStroke('#f5f5f5', '#e0e0e0');
      doc.fontSize(10).font(fontBold).fillColor('#333333').text('TEKLİF DETAYLARI', 320, yStart + 10);
      doc.fontSize(9).font(fontRegular).fillColor('#666666');
      doc.text('Oluşturulma:', 320, yStart + 30);
      doc.fillColor('#000000').text(new Date(quote.createdAt).toLocaleDateString('tr-TR'), 420, yStart + 30);
      doc.fillColor('#666666').text('Geçerlilik:', 320, yStart + 45);
      doc.fillColor('#000000').text(quote.validUntil ? new Date(quote.validUntil).toLocaleDateString('tr-TR') : '-', 420, yStart + 45);
      doc.fillColor('#666666').text('Ödeme:', 320, yStart + 60);
      const paymentLabels: Record<string, string> = { cash: 'Peşin Ödeme', credit_card: 'Kredi Kartı', eft: 'Havale / EFT', net15: '15 Gün Vadeli', net30: '30 Gün Vadeli', net45: '45 Gün Vadeli', net60: '60 Gün Vadeli', net90: '90 Gün Vadeli', installment_3: '3 Taksit', installment_6: '6 Taksit', installment_9: '9 Taksit', installment_12: '12 Taksit' };
      const paymentLabel = paymentLabels[quote.paymentTerms || ''] || '-';
      doc.fillColor('#000000').text(paymentLabel, 420, yStart + 60);
      doc.fillColor('#666666').text('KDV:', 320, yStart + 75);
      doc.fillColor('#000000').text(quote.includesVat ? 'Dahil' : 'Hariç', 420, yStart + 75);
      
      // Products table
      const tableTop = yStart + 130;
      doc.fontSize(12).font(fontBold).fillColor('#000000').text('ÜRÜNLER', 50, tableTop);
      
      // Table header
      const headerY = tableTop + 25;
      doc.rect(50, headerY, 495, 22).fillAndStroke('#333333', '#333333');
      doc.fontSize(7).font(fontBold).fillColor('#ffffff');
      doc.text('Ürün', 60, headerY + 7);
      doc.text('Beden', 290, headerY + 7, { width: 40, align: 'center' });
      doc.text('Adet', 330, headerY + 7, { width: 30, align: 'center' });
      doc.text('Birim Fiyat', 360, headerY + 7, { width: 55, align: 'right' });
      doc.text('İsk.', 415, headerY + 7, { width: 30, align: 'center' });
      doc.text('Toplam', 445, headerY + 7, { width: 95, align: 'right' });
      
      // Table rows
      let currentY = headerY + 22;
      const rowHeight = 50;
      
      for (let itemIdx = 0; itemIdx < items.length; itemIdx++) {
        const item = items[itemIdx];
        if (currentY > 710) {
          doc.addPage();
          currentY = 50;
        }
        
        const bgColor = itemIdx % 2 === 0 ? '#ffffff' : '#fafafa';
        doc.rect(50, currentY, 495, rowHeight).fillAndStroke(bgColor, '#e0e0e0');
        
        if (item.productImage) {
          try {
            let imageUrl = item.productImage;
            if (imageUrl.startsWith('/uploads/')) {
              imageUrl = `https://polenstone.com${imageUrl}`;
            }
            
            if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
              const imageResponse = await fetch(imageUrl);
              if (imageResponse.ok) {
                const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
                doc.image(imageBuffer, 55, currentY + 5, { width: 38, height: 38 });
              }
            }
          } catch (e) {
            // skip image
          }
        }
        
        doc.fontSize(7).font(fontRegular).fillColor('#000000');
        doc.text(item.productName, 98, currentY + 6, { width: 190, lineBreak: true, height: 20 });
        
        if (item.productSku) {
          doc.fontSize(6).fillColor('#888888').text(`SKU: ${item.productSku}`, 98, currentY + 30, { width: 190 });
        }
        
        doc.fontSize(7).fillColor('#333333');
        doc.text(item.variantDetails || '-', 290, currentY + 18, { width: 40, align: 'center' });
        
        doc.fillColor('#000000');
        doc.text(item.quantity.toString(), 330, currentY + 18, { width: 30, align: 'center' });
        doc.text(`${parseFloat(item.unitPrice).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`, 360, currentY + 18, { width: 55, align: 'right' });
        
        if (parseFloat(item.discountPercent) > 0) {
          doc.fillColor('#22c55e').text(`%${item.discountPercent}`, 415, currentY + 18, { width: 30, align: 'center' });
        } else {
          doc.fillColor('#999999').text('-', 415, currentY + 18, { width: 30, align: 'center' });
        }
        
        doc.font(fontBold).fillColor('#000000');
        doc.text(`${parseFloat(item.lineTotal).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`, 445, currentY + 18, { width: 95, align: 'right' });
        
        currentY += rowHeight;
      }
      
      // Totals section
      currentY += 10;
      doc.rect(350, currentY, 195, 80).fillAndStroke('#f5f5f5', '#e0e0e0');
      
      doc.fontSize(10).font(fontRegular).fillColor('#666666');
      doc.text('Ara Toplam:', 360, currentY + 15);
      doc.fillColor('#000000').text(`${parseFloat(quote.subtotal).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL`, 460, currentY + 15, { width: 75, align: 'right' });
      
      if (parseFloat(quote.discountTotal) > 0) {
        doc.fillColor('#22c55e').text('İskonto:', 360, currentY + 35);
        doc.text(`-${parseFloat(quote.discountTotal).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL`, 460, currentY + 35, { width: 75, align: 'right' });
      }
      
      doc.fontSize(12).font(fontBold).fillColor('#000000');
      doc.text('GENEL TOPLAM:', 360, currentY + 55);
      doc.text(`${parseFloat(quote.grandTotal).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL`, 460, currentY + 55, { width: 75, align: 'right' });
      
      // Notes
      if (quote.notes) {
        currentY += 100;
        if (currentY > 700) {
          doc.addPage();
          currentY = 50;
        }
        doc.fontSize(10).font(fontBold).fillColor('#333333').text('NOTLAR', 50, currentY);
        doc.fontSize(9).font(fontRegular).fillColor('#666666').text(quote.notes, 50, currentY + 15, { width: 495 });
      }
      
      // Footer
      doc.fontSize(8).font(fontRegular).fillColor('#999999');
      doc.text('Polen Stone Doğal Taş & Mermer | www.polenstone.com | info@polenstone.com', 50, 780, { align: 'center', width: 495 });
      
      doc.end();
    } catch (error) {
      console.error('[Quotes] PDF generation error:', error);
      res.status(500).json({ error: "PDF oluşturulamadı" });
    }
  });

  // Create quote
  app.post("/api/admin/quotes", requireAdmin, async (req, res) => {
    try {
      const { dealerId, validUntil, paymentTerms, notes, includesVat, items } = req.body;
      
      if (!dealerId) {
        return res.status(400).json({ error: "Bayi seçimi zorunludur" });
      }
      
      // Generate quote number
      const quoteNumber = await storage.getNextQuoteNumber();
      
      // Calculate totals from items
      let subtotal = 0;
      let discountTotal = 0;
      
      if (items && items.length > 0) {
        for (const item of items) {
          const lineSubtotal = parseFloat(item.unitPrice) * item.quantity;
          const discountAmount = lineSubtotal * (parseFloat(item.discountPercent || 0) / 100);
          subtotal += lineSubtotal;
          discountTotal += discountAmount;
        }
      }
      
      const grandTotal = subtotal - discountTotal;
      
      const newQuote = await storage.createQuote({
        quoteNumber,
        dealerId,
        status: 'draft',
        validUntil: validUntil ? new Date(validUntil) : null,
        paymentTerms: paymentTerms || null,
        notes: notes || null,
        subtotal: subtotal.toFixed(2),
        discountTotal: discountTotal.toFixed(2),
        grandTotal: grandTotal.toFixed(2),
        includesVat: includesVat !== false
      });
      
      // Create quote items
      if (items && items.length > 0) {
        for (const item of items) {
          const lineSubtotal = parseFloat(item.unitPrice) * item.quantity;
          const discountAmount = lineSubtotal * (parseFloat(item.discountPercent || 0) / 100);
          const lineTotal = lineSubtotal - discountAmount;
          
          await storage.createQuoteItem({
            quoteId: newQuote.id,
            productId: item.productId,
            variantId: item.variantId || null,
            productName: item.productName,
            productSku: item.productSku || null,
            productImage: item.productImage || null,
            variantDetails: item.variantDetails || null,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountPercent: (item.discountPercent || 0).toString(),
            lineTotal: lineTotal.toFixed(2)
          });
        }
      }
      
      res.status(201).json(newQuote);
    } catch (error) {
      console.error('[Quotes] Create error:', error);
      res.status(500).json({ error: "Teklif oluşturulamadı" });
    }
  });

  // Update quote
  app.put("/api/admin/quotes/:id", requireAdmin, async (req, res) => {
    try {
      const { items, ...quoteData } = req.body;
      
      // If items provided, recalculate totals and update items
      if (items) {
        // Delete existing items
        await storage.deleteQuoteItems(req.params.id);
        
        let subtotal = 0;
        let discountTotal = 0;
        
        for (const item of items) {
          const lineSubtotal = parseFloat(item.unitPrice) * item.quantity;
          const discountAmount = lineSubtotal * (parseFloat(item.discountPercent || 0) / 100);
          const lineTotal = lineSubtotal - discountAmount;
          
          subtotal += lineSubtotal;
          discountTotal += discountAmount;
          
          await storage.createQuoteItem({
            quoteId: req.params.id,
            productId: item.productId,
            variantId: item.variantId || null,
            productName: item.productName,
            productSku: item.productSku || null,
            productImage: item.productImage || null,
            variantDetails: item.variantDetails || null,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountPercent: (item.discountPercent || 0).toString(),
            lineTotal: lineTotal.toFixed(2)
          });
        }
        
        quoteData.subtotal = subtotal.toFixed(2);
        quoteData.discountTotal = discountTotal.toFixed(2);
        quoteData.grandTotal = (subtotal - discountTotal).toFixed(2);
      }
      
      const updated = await storage.updateQuote(req.params.id, quoteData);
      if (!updated) {
        return res.status(404).json({ error: "Teklif bulunamadı" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error('[Quotes] Update error:', error);
      res.status(500).json({ error: "Teklif güncellenemedi" });
    }
  });

  // Update quote status
  app.put("/api/admin/quotes/:id/status", requireAdmin, async (req, res) => {
    try {
      const { status } = req.body;
      const validStatuses = ['draft', 'sent', 'accepted', 'rejected', 'expired'];
      
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: "Geçersiz durum" });
      }
      
      const updateData: any = { status };
      
      if (status === 'sent') {
        updateData.sentAt = new Date();
      } else if (status === 'accepted') {
        updateData.acceptedAt = new Date();
      } else if (status === 'rejected') {
        updateData.rejectedAt = new Date();
      }
      
      const updated = await storage.updateQuote(req.params.id, updateData);
      if (!updated) {
        return res.status(404).json({ error: "Teklif bulunamadı" });
      }
      
      if (status === 'accepted') {
        try {
          const quoteItems = await storage.getQuoteItems(req.params.id);
          for (const item of quoteItems) {
            if (item.variantId) {
              const variant = await storage.getProductVariant(item.variantId);
              if (variant) {
                const newStock = Math.max(0, variant.stock - item.quantity);
                await storage.updateProductVariant(item.variantId, { stock: newStock } as any);
                await db.insert(stockAdjustments).values({
                  variantId: item.variantId,
                  previousStock: variant.stock,
                  newStock,
                  adjustmentType: 'sale',
                  reason: `B2B Teklif kabul: ${updated.quoteNumber}`,
                });
              }
            }
          }
          console.log(`[Quotes] Stock reduced for accepted quote ${updated.quoteNumber}`);
        } catch (stockErr) {
          console.error('[Quotes] Stock reduction error:', stockErr);
        }
      }
      
      // Send email with PDF when status is 'sent'
      if (status === 'sent') {
        try {
          const quote = await storage.getQuote(req.params.id);
          const dealer = await storage.getDealer(quote!.dealerId);
          const items = await storage.getQuoteItems(quote!.id);
          
          if (dealer?.email) {
            // Generate PDF buffer
            const pdfBuffer = await generateQuotePdfBuffer(quote!, dealer, items);
            
            // Send email with PDF
            const { sendQuoteEmail } = await import('./emailService');
            await sendQuoteEmail(dealer.email, {
              quoteNumber: quote!.quoteNumber,
              dealerName: dealer.name,
              contactPerson: dealer.contactPerson,
              validUntil: quote!.validUntil,
              grandTotal: quote!.grandTotal,
              itemCount: items.length
            }, pdfBuffer);
            
            console.log(`[Quotes] Email sent to ${dealer.email} for quote ${quote!.quoteNumber}`);
          } else {
            console.log(`[Quotes] No email for dealer, skipping email send`);
          }
        } catch (emailError) {
          console.error('[Quotes] Failed to send quote email:', emailError);
          // Don't fail the request, just log the error
        }
      }
      
      res.json(updated);
    } catch (error) {
      console.error('[Quotes] Status update error:', error);
      res.status(500).json({ error: "Teklif durumu güncellenemedi" });
    }
  });

  // Delete quote
  app.delete("/api/admin/quotes/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteQuote(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('[Quotes] Delete error:', error);
      res.status(500).json({ error: "Teklif silinemedi" });
    }
  });

  // Get next quote number (for preview)
  app.get("/api/admin/quotes/next-number", requireAdmin, async (req, res) => {
    try {
      const nextNumber = await storage.getNextQuoteNumber();
      res.json({ quoteNumber: nextNumber });
    } catch (error) {
      console.error('[Quotes] Next number error:', error);
      res.status(500).json({ error: "Teklif numarası alınamadı" });
    }
  });

  // ============= SIZE CHARTS (BEDEN TABLOLARI) =============
  
  // Public: Get size chart by category ID
  app.get("/api/size-charts/category/:categoryId", async (req, res) => {
    try {
      const chart = await storage.getSizeChartByCategory(req.params.categoryId);
      res.json(chart || null);
    } catch (error) {
      console.error('[SizeCharts] Get by category error:', error);
      res.status(500).json({ error: "Beden tablosu alınamadı" });
    }
  });
  
  // Admin: Get all size charts
  app.get("/api/admin/size-charts", requireAdmin, async (req, res) => {
    try {
      const charts = await storage.getSizeCharts();
      // Enrich with category info
      const enriched = await Promise.all(charts.map(async (chart) => {
        const category = await storage.getCategory(chart.categoryId);
        return { ...chart, category };
      }));
      res.json(enriched);
    } catch (error) {
      console.error('[SizeCharts] Get all error:', error);
      res.status(500).json({ error: "Beden tabloları alınamadı" });
    }
  });
  
  // Admin: Get single size chart
  app.get("/api/admin/size-charts/:id", requireAdmin, async (req, res) => {
    try {
      const chart = await storage.getSizeChart(req.params.id);
      if (!chart) {
        return res.status(404).json({ error: "Beden tablosu bulunamadı" });
      }
      const category = await storage.getCategory(chart.categoryId);
      res.json({ ...chart, category });
    } catch (error) {
      console.error('[SizeCharts] Get one error:', error);
      res.status(500).json({ error: "Beden tablosu alınamadı" });
    }
  });
  
  // Admin: Create size chart
  app.post("/api/admin/size-charts", requireAdmin, async (req, res) => {
    try {
      const { categoryId, columns, rows } = req.body;
      
      if (!categoryId) {
        return res.status(400).json({ error: "Kategori seçimi zorunludur" });
      }
      
      // Check if category already has a size chart
      const existing = await storage.getSizeChartByCategory(categoryId);
      if (existing) {
        return res.status(400).json({ error: "Bu kategori için zaten bir beden tablosu var" });
      }
      
      const chart = await storage.createSizeChart({
        categoryId,
        columns: columns || ["Beden", "Göğüs (cm)", "Boy (cm)"],
        rows: rows || []
      });
      
      res.status(201).json(chart);
    } catch (error) {
      console.error('[SizeCharts] Create error:', error);
      res.status(500).json({ error: "Beden tablosu oluşturulamadı" });
    }
  });
  
  // Admin: Update size chart
  app.put("/api/admin/size-charts/:id", requireAdmin, async (req, res) => {
    try {
      const { columns, rows } = req.body;
      const updated = await storage.updateSizeChart(req.params.id, { columns, rows });
      if (!updated) {
        return res.status(404).json({ error: "Beden tablosu bulunamadı" });
      }
      res.json(updated);
    } catch (error) {
      console.error('[SizeCharts] Update error:', error);
      res.status(500).json({ error: "Beden tablosu güncellenemedi" });
    }
  });
  
  // Admin: Delete size chart
  app.delete("/api/admin/size-charts/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteSizeChart(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('[SizeCharts] Delete error:', error);
      res.status(500).json({ error: "Beden tablosu silinemedi" });
    }
  });

  // ==================== MENU ITEMS ====================
  // Public endpoint for active menu items
  app.get("/api/menu", async (req, res) => {
    try {
      const items = await storage.getActiveMenuItems();
      const categories = await storage.getCategories();
      
      // Build nested structure with category details
      const menuItemsWithDetails = items.map(item => {
        let categoryDetails = null;
        if (item.type === 'category' && item.categoryId) {
          const category = categories.find(c => c.id === item.categoryId);
          if (category) {
            categoryDetails = {
              id: category.id,
              name: category.name,
              slug: category.slug,
            };
          }
        }
        return {
          ...item,
          category: categoryDetails,
        };
      });

      // Build tree structure (parent items with children)
      const rootItems = menuItemsWithDetails.filter(item => !item.parentId);
      const result = rootItems.map(item => ({
        ...item,
        children: menuItemsWithDetails.filter(child => child.parentId === item.id),
      }));

      res.json(result);
    } catch (error) {
      console.error('[Menu] Get menu error:', error);
      res.status(500).json({ error: "Menü alınamadı" });
    }
  });

  // Admin: Get all menu items
  app.get("/api/admin/menu-items", requireAdmin, async (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    try {
      const items = await storage.getMenuItems();
      console.log('[Menu] Admin fetched menu items:', items.length, 'items');
      const categories = await storage.getCategories();
      
      const menuItemsWithDetails = items.map(item => {
        let categoryDetails = null;
        if (item.type === 'category' && item.categoryId) {
          const category = categories.find(c => c.id === item.categoryId);
          if (category) {
            categoryDetails = {
              id: category.id,
              name: category.name,
              slug: category.slug,
            };
          }
        }
        return {
          ...item,
          category: categoryDetails,
        };
      });

      res.json(menuItemsWithDetails);
    } catch (error) {
      console.error('[Menu] Get all menu items error:', error);
      res.status(500).json({ error: "Menü öğeleri alınamadı" });
    }
  });

  // Admin: Create menu item
  app.post("/api/admin/menu-items", requireAdmin, async (req, res) => {
    try {
      const { title, type, categoryId, url, parentId, displayOrder, isActive, openInNewTab } = req.body;
      
      if (!title || !type) {
        return res.status(400).json({ error: "Başlık ve tür zorunludur" });
      }

      if (type === 'category' && !categoryId) {
        return res.status(400).json({ error: "Kategori seçmeniz gerekiyor" });
      }

      if (type === 'link' && !url) {
        return res.status(400).json({ error: "URL girmeniz gerekiyor" });
      }

      const menuItem = await storage.createMenuItem({
        title,
        type,
        categoryId: categoryId || null,
        url: url || null,
        parentId: parentId || null,
        displayOrder: displayOrder || 0,
        isActive: isActive !== false,
        openInNewTab: openInNewTab || false,
      });

      res.json(menuItem);
    } catch (error) {
      console.error('[Menu] Create menu item error:', error);
      res.status(500).json({ error: "Menü öğesi oluşturulamadı" });
    }
  });

  // Admin: Update menu item
  app.put("/api/admin/menu-items/:id", requireAdmin, async (req, res) => {
    try {
      const { title, type, categoryId, url, parentId, displayOrder, isActive, openInNewTab } = req.body;
      
      const menuItem = await storage.updateMenuItem(req.params.id, {
        title,
        type,
        categoryId: categoryId || null,
        url: url || null,
        parentId: parentId || null,
        displayOrder,
        isActive,
        openInNewTab,
      });

      if (!menuItem) {
        return res.status(404).json({ error: "Menü öğesi bulunamadı" });
      }

      res.json(menuItem);
    } catch (error) {
      console.error('[Menu] Update menu item error:', error);
      res.status(500).json({ error: "Menü öğesi güncellenemedi" });
    }
  });

  // Admin: Delete menu item
  app.delete("/api/admin/menu-items/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteMenuItem(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('[Menu] Delete menu item error:', error);
      res.status(500).json({ error: "Menü öğesi silinemedi" });
    }
  });

  // Admin: Reorder menu items
  app.post("/api/admin/menu-items/reorder", requireAdmin, async (req, res) => {
    try {
      const { items } = req.body;
      
      if (!Array.isArray(items)) {
        return res.status(400).json({ error: "Geçersiz sıralama verisi" });
      }

      await storage.reorderMenuItems(items);
      res.json({ success: true });
    } catch (error) {
      console.error('[Menu] Reorder menu items error:', error);
      res.status(500).json({ error: "Menü sıralaması güncellenemedi" });
    }
  });

  // Admin: Önizleme — kategorileri kurallara göre nasıl gruplayacağını göster (yazma yok)
  app.get("/api/admin/menu-items/grouping-preview", requireAdmin, async (_req, res) => {
    try {
      const categories = await storage.getCategories();
      const plan = buildGroupingPlan(categories);
      res.json(plan);
    } catch (error) {
      console.error('[Menu] Grouping preview error:', error);
      res.status(500).json({ error: "Önizleme oluşturulamadı" });
    }
  });

  // Admin: Kategorileri otomatik gruplandır → menu_items üret
  // Sadece displayOrder >= AUTO_GROUP_DISPLAY_ORDER_BASE olan kayıtları siler.
  // Kullanıcının manuel eklediği menüler korunur.
  app.post("/api/admin/menu-items/regenerate-from-categories", requireAdmin, async (req, res) => {
    try {
      const wipeAll = req.body?.wipeAll === true;
      const categories = await storage.getCategories();
      const plan = buildGroupingPlan(categories);

      // 1) Eski kayıtları sil
      //    wipeAll=true  → tüm menu_items tablosunu sıfırla (manuel öğeler dahil)
      //    wipeAll=false → sadece auto-generated displayOrder aralığını sil
      if (wipeAll) {
        await db.delete(menuItemsTable);
      } else {
        await db
          .delete(menuItemsTable)
          .where(
            and(
              gte(menuItemsTable.displayOrder, AUTO_GROUP_DISPLAY_ORDER_BASE),
              lte(menuItemsTable.displayOrder, AUTO_GROUP_DISPLAY_ORDER_MAX),
            ),
          );
      }

      // 2) Her ana grup için submenu kaydı + altına category çocukları
      let createdParents = 0;
      let createdChildren = 0;
      let parentOrder = AUTO_GROUP_DISPLAY_ORDER_BASE; // 1000, 1001, ...
      let childOrder = AUTO_GROUP_DISPLAY_ORDER_BASE + 100; // 1100+

      for (const group of plan.groups) {
        const parent = await storage.createMenuItem({
          title: group.title,
          type: "submenu",
          categoryId: null,
          url: null,
          parentId: null,
          displayOrder: parentOrder++,
          isActive: true,
          openInNewTab: false,
        });
        createdParents++;

        for (const cat of group.categories) {
          await storage.createMenuItem({
            title: cat.name,
            type: "category",
            categoryId: cat.id,
            url: null,
            parentId: parent.id,
            displayOrder: childOrder++,
            isActive: true,
            openInNewTab: false,
          });
          createdChildren++;
        }
      }

      res.json({
        success: true,
        createdParents,
        createdChildren,
        totalCategories: plan.totalCategories,
        unmatchedCount: plan.unmatchedCount,
        groups: plan.groups.map((g) => ({
          title: g.title,
          count: g.categories.length,
        })),
      });
    } catch (error) {
      console.error('[Menu] Regenerate from categories error:', error);
      res.status(500).json({ error: "Otomatik gruplandırma yapılamadı" });
    }
  });


  // Meta Pixel + CAPI tracking removed. Stub endpoints kept as no-ops so any cached/old client deploys do not get 404s.
  const noopTrackHandler = (_req: Request, res: Response) => res.json({ success: true });
  app.post("/api/track/view-content", noopTrackHandler);
  app.post("/api/track/add-to-cart", noopTrackHandler);
  app.post("/api/track/initiate-checkout", noopTrackHandler);
  app.post("/api/track/purchase", noopTrackHandler);
  app.post("/api/track/add-payment-info", noopTrackHandler);
  app.get("/feeds/google-merchant.xml", async (_req: Request, res: Response) => {
    try {
      const allProducts = await storage.getAllProducts();
      const allCategories = await storage.getCategories();
      const categoryMap = new Map(allCategories.map(c => [c.id, c.name]));

      const baseUrl = "https://polenstone.com";
      const items: string[] = [];

      for (const product of allProducts) {
        if (!product.isActive) continue;

        const variants = await storage.getProductVariants(product.id);
        const categoryName = product.categoryId ? categoryMap.get(product.categoryId) || "" : "";
        const productUrl = `${baseUrl}/urun/${product.slug}`;
        const imageUrl = product.images && product.images.length > 0
          ? (product.images[0].startsWith("http") ? product.images[0] : `${baseUrl}${product.images[0]}`)
          : "";

        const additionalImages = (product.images || []).slice(1, 10).map(img => {
          const url = img.startsWith("http") ? img : `${baseUrl}${img}`;
          return `      <g:additional_image_link>${escapeXml(url)}</g:additional_image_link>`;
        }).join("\n");

        const description = product.description
          ? product.description.replace(/<[^>]*>/g, '').substring(0, 5000)
          : product.name;

        if (variants.length > 0) {
          for (const variant of variants) {
            if (!variant.isActive) continue;

            const variantPrice = variant.price || product.basePrice;
            const availability = variant.stock > 0 ? "in_stock" : "out_of_stock";
            const sizeLabel = variant.size || "";
            const colorLabel = variant.color || "";
            const variantTitle = [product.name, colorLabel, sizeLabel].filter(Boolean).join(" - ");
            const variantSku = variant.sku || `${product.id}-${variant.id}`;

            let sizeAttr = "";
            if (sizeLabel) {
              sizeAttr = `      <g:size>${escapeXml(sizeLabel)}</g:size>`;
            }
            let colorAttr = "";
            if (colorLabel) {
              colorAttr = `      <g:color>${escapeXml(colorLabel)}</g:color>`;
            }

            items.push(`    <item>
      <g:id>${escapeXml(variantSku)}</g:id>
      <g:item_group_id>${escapeXml(product.id)}</g:item_group_id>
      <g:title>${escapeXml(variantTitle)}</g:title>
      <g:description>${escapeXml(description)}</g:description>
      <g:link>${escapeXml(productUrl)}</g:link>
      <g:image_link>${escapeXml(imageUrl)}</g:image_link>
${additionalImages}
      <g:price>${Number(variantPrice).toFixed(2)} TRY</g:price>
      <g:availability>${availability}</g:availability>
      <g:brand>POLEN STONE</g:brand>
      <g:condition>new</g:condition>
      <g:google_product_category>Giyim ve Aksesuar > Giyim</g:google_product_category>
      <g:product_type>${escapeXml(categoryName)}</g:product_type>
${sizeAttr}
${colorAttr}
      <g:gender>unisex</g:gender>
      <g:age_group>adult</g:age_group>
      <g:shipping>
        <g:country>TR</g:country>
        <g:price>200.00 TRY</g:price>
      </g:shipping>
    </item>`);
          }
        } else {
          const availability = "in_stock";
          items.push(`    <item>
      <g:id>${escapeXml(product.id)}</g:id>
      <g:title>${escapeXml(product.name)}</g:title>
      <g:description>${escapeXml(description)}</g:description>
      <g:link>${escapeXml(productUrl)}</g:link>
      <g:image_link>${escapeXml(imageUrl)}</g:image_link>
${additionalImages}
      <g:price>${Number(product.basePrice).toFixed(2)} TRY</g:price>
      <g:availability>${availability}</g:availability>
      <g:brand>POLEN STONE</g:brand>
      <g:condition>new</g:condition>
      <g:google_product_category>Giyim ve Aksesuar > Giyim</g:google_product_category>
      <g:product_type>${escapeXml(categoryName)}</g:product_type>
      <g:gender>unisex</g:gender>
      <g:age_group>adult</g:age_group>
      <g:shipping>
        <g:country>TR</g:country>
        <g:price>200.00 TRY</g:price>
      </g:shipping>
    </item>`);
        }
      }

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Polen Stone — Doğal Taş &amp; Mermer</title>
    <link>${baseUrl}</link>
    <description>Polen Stone — Premium doğal taş ve mermer markası</description>
${items.join("\n")}
  </channel>
</rss>`;

      res.set("Content-Type", "application/xml; charset=utf-8");
      res.send(xml);
    } catch (error) {
      console.error("[Google Merchant Feed] Error:", error);
      res.status(500).send("Feed generation error");
    }
  });

  // ==========================================================================
  // Marketplaces (Trendyol / N11 / Hepsiburada ...) — admin-only
  // ==========================================================================
  app.post("/api/admin/wholesale/pdf", requireAdmin, async (req, res) => {
    try {
      const { discountRate = 0, productIds, categoryId, categoryDiscounts, productDiscounts } = req.body;
      const generalRate = Math.max(0, Math.min(99, Number(discountRate) || 0));

      const catDiscountMap = new Map<string, number>();
      if (categoryDiscounts && typeof categoryDiscounts === 'object') {
        for (const [catId, r] of Object.entries(categoryDiscounts)) {
          const rv = Math.max(0, Math.min(99, Number(r) || 0));
          if (rv > 0) catDiscountMap.set(catId, rv);
        }
      }

      const prodDiscountMap = new Map<string, number>();
      if (productDiscounts && typeof productDiscounts === 'object') {
        for (const [pid, r] of Object.entries(productDiscounts)) {
          const rv = Math.max(0, Math.min(99, Number(r) || 0));
          if (rv > 0) prodDiscountMap.set(pid, rv);
        }
      }

      const hasAnyDiscount = generalRate > 0 || catDiscountMap.size > 0 || prodDiscountMap.size > 0;

      const allVariants = await db.select().from(productVariants);
      const stockByProduct = new Map<string, number>();
      const variantCountByProduct = new Map<string, number>();
      for (const v of allVariants) {
        stockByProduct.set(v.productId, (stockByProduct.get(v.productId) || 0) + (v.stock || 0));
        variantCountByProduct.set(v.productId, (variantCountByProduct.get(v.productId) || 0) + 1);
      }

      let filteredProducts = await storage.getAllProducts();
      filteredProducts = filteredProducts.filter((p) => {
        if (!p.isActive) return false;
        const variantCount = variantCountByProduct.get(p.id) || 0;
        if (variantCount === 0) return true;
        return (stockByProduct.get(p.id) || 0) > 0;
      });

      if (productIds && Array.isArray(productIds) && productIds.length > 0) {
        const idSet = new Set(productIds as string[]);
        filteredProducts = filteredProducts.filter((p) => idSet.has(p.id));
      } else if (categoryId) {
        const catProductIds = await db
          .selectDistinct({ productId: productCategories.productId })
          .from(productCategories)
          .where(eq(productCategories.categoryId, categoryId));
        const catIdSet = new Set(catProductIds.map((r) => r.productId));
        filteredProducts = filteredProducts.filter(
          (p) => p.categoryId === categoryId || catIdSet.has(p.id),
        );
      }

      const allCategories = await storage.getCategories();
      const catMap = new Map(allCategories.map((c) => [c.id, c.name]));

      const allProductCats = await db.select().from(productCategories);
      const productCategoryMap = new Map<string, string[]>();
      for (const pc of allProductCats) {
        const arr = productCategoryMap.get(pc.productId) || [];
        arr.push(pc.categoryId);
        productCategoryMap.set(pc.productId, arr);
      }

      const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });

      const fontPath = path.join(process.cwd(), 'public', 'fonts');
      const regularFontPath = path.join(fontPath, 'inter-regular.ttf');
      const boldFontPath = path.join(fontPath, 'inter-bold.ttf');
      if (fs.existsSync(regularFontPath) && fs.existsSync(boldFontPath)) {
        doc.registerFont('Inter', regularFontPath);
        doc.registerFont('Inter-Bold', boldFontPath);
      }
      const fontR = fs.existsSync(regularFontPath) ? 'Inter' : 'Helvetica';
      const fontB = fs.existsSync(boldFontPath) ? 'Inter-Bold' : 'Helvetica-Bold';

      const getEffectiveRate = (productId: string, pCatId: string | null): number => {
        const pRate = prodDiscountMap.get(productId);
        if (pRate !== undefined && pRate > 0) return pRate;

        const catIds: string[] = [];
        if (pCatId) catIds.push(pCatId);
        const extraCats = productCategoryMap.get(productId) || [];
        for (const cid of extraCats) {
          if (!catIds.includes(cid)) catIds.push(cid);
        }
        for (const cid of catIds) {
          const cRate = catDiscountMap.get(cid);
          if (cRate !== undefined && cRate > 0) return cRate;
        }

        return generalRate;
      };

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Toptan-Fiyat-Listesi-${new Date().toISOString().slice(0, 10)}.pdf"`);
      doc.pipe(res);

      const pageW = 595.28;
      const marginL = 40;
      const marginR = 40;
      const usableW = pageW - marginL - marginR;
      const brandColor = '#fdb51d';
      const darkColor = '#1a1a1a';

      const brandingDir = path.join(process.cwd(), 'client', 'public', 'uploads', 'branding');
      const logoFiles = ['polen-logo.png', 'polen-logo.svg', 'polen-icon.png', 'hank-logo.svg', 'hank-icon.png'];

      let logoAdded = false;
      const logoTopY = 30;
      const logoHeight = 60;
      for (const logoFile of logoFiles) {
        if (logoAdded) break;
        const logoPath = path.join(brandingDir, logoFile);
        if (!fs.existsSync(logoPath)) continue;
        try {
          if (logoFile.endsWith('.svg')) {
            const pngBuf = await sharp(logoPath).resize(140).png().toBuffer();
            doc.image(pngBuf, marginL, logoTopY, { height: logoHeight });
          } else {
            doc.image(logoPath, marginL, logoTopY, { height: logoHeight });
          }
          logoAdded = true;
        } catch (logoErr) {
          console.warn(`[Wholesale PDF] Logo embed failed (${logoFile}):`, logoErr);
        }
      }
      if (!logoAdded) {
        doc.fontSize(22).font(fontB).fillColor(darkColor).text('Polen Stone', marginL, logoTopY + 15);
      }

      const dateStr = new Date().toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });

      const rightColX = 300;
      const rightColW = pageW - marginR - rightColX;
      doc.fontSize(18).font(fontB).fillColor(darkColor).text('TOPTAN FİYAT LİSTESİ', rightColX, logoTopY, { width: rightColW, align: 'right' });
      doc.fontSize(9).font(fontR).fillColor('#666666');
      doc.text(dateStr, rightColX, logoTopY + 25, { width: rightColW, align: 'right' });
      let infoY = logoTopY + 38;
      if (generalRate > 0) {
        doc.text(`Genel İndirim: %${generalRate}`, rightColX, infoY, { width: rightColW, align: 'right' });
        infoY += 13;
      }
      if (catDiscountMap.size > 0) {
        doc.text(`${catDiscountMap.size} kategori özel indirimli`, rightColX, infoY, { width: rightColW, align: 'right' });
        infoY += 13;
      }
      if (prodDiscountMap.size > 0) {
        doc.text(`${prodDiscountMap.size} ürün özel indirimli`, rightColX, infoY, { width: rightColW, align: 'right' });
        infoY += 13;
      }
      doc.text(`${filteredProducts.length} ürün`, rightColX, infoY, { width: rightColW, align: 'right' });
      infoY += 13;
      if (categoryId) {
        const catName = catMap.get(categoryId) || '';
        if (catName) {
          doc.text(catName, rightColX, infoY, { width: rightColW, align: 'right' });
        }
      }

      const separatorY = logoTopY + logoHeight + 8;
      doc.rect(marginL, separatorY, usableW, 2).fill(brandColor);

      const colImg = marginL;
      const colImgW = 42;
      const colName = colImg + colImgW + 4;
      const colNameW = hasAnyDiscount ? 210 : 260;
      const colCat = colName + colNameW + 4;
      const colCatW = 60;
      const colPrice = colCat + colCatW + 4;
      const colPriceW = hasAnyDiscount ? 65 : 90;
      const colDisc = colPrice + colPriceW + 4;
      const colDiscW = 70;
      const colBadge = colDisc + colDiscW + 4;
      const colBadgeW = 28;
      const headerY = separatorY + 10;

      const drawTableHeader = (y: number) => {
        doc.rect(marginL, y, usableW, 20).fill(darkColor);
        doc.fontSize(7).font(fontB).fillColor('#ffffff');
        doc.text('', colImg + 2, y + 6, { width: colImgW, align: 'center' });
        doc.text('Ürün Adı', colName, y + 6, { width: colNameW });
        doc.text('Kategori', colCat, y + 6, { width: colCatW });
        doc.text('Liste Fiyatı', colPrice, y + 6, { width: colPriceW, align: 'right' });
        if (hasAnyDiscount) {
          doc.text('İndirimli Fiyat', colDisc, y + 6, { width: colDiscW, align: 'right' });
          doc.text('İnd.', colBadge, y + 6, { width: colBadgeW, align: 'center' });
        }
        return y + 20;
      };

      const allowedHosts = ['polenstone.com', 'cdn.polenstone.com', 'img.trendyol.com', 'cdn.dsmcdn.com'];
      const isAllowedHost = (url: string): boolean => {
        try {
          const u = new URL(url);
          return ['http:', 'https:'].includes(u.protocol) &&
            allowedHosts.some(h => u.hostname === h || u.hostname.endsWith('.' + h));
        } catch (_e) { return false; }
      };

      const fetchImage = async (src: string): Promise<Buffer | null> => {
        try {
          let imageUrl = src;
          if (imageUrl.startsWith('/uploads/')) {
            imageUrl = `https://polenstone.com${imageUrl}`;
          }
          if (!isAllowedHost(imageUrl)) return null;
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);
          const imgRes = await fetch(imageUrl, { signal: controller.signal });
          clearTimeout(timeout);
          if (!imgRes.ok) return null;
          const imgBuf = Buffer.from(await imgRes.arrayBuffer());
          return sharp(imgBuf).resize(80, 80, { fit: 'cover' }).jpeg({ quality: 70 }).toBuffer();
        } catch (_fetchErr) {
          return null;
        }
      };

      const BATCH_SIZE = 5;
      const imageCache = new Map<string, Buffer | null>();
      for (let b = 0; b < filteredProducts.length; b += BATCH_SIZE) {
        const batch = filteredProducts.slice(b, b + BATCH_SIZE);
        const results = await Promise.allSettled(
          batch.map((p) => {
            const src = p.images?.[0];
            if (!src) return Promise.resolve(null);
            return fetchImage(src);
          }),
        );
        batch.forEach((p, idx) => {
          const result = results[idx];
          imageCache.set(p.id, result.status === 'fulfilled' ? result.value : null);
        });
      }

      let currentY = drawTableHeader(headerY);
      const rowH = 50;
      const pageBottom = 790;

      for (let i = 0; i < filteredProducts.length; i++) {
        if (currentY + rowH > pageBottom) {
          doc.addPage();
          currentY = drawTableHeader(40);
        }

        const p = filteredProducts[i];
        const bgColor = i % 2 === 0 ? '#ffffff' : '#f8f8f8';
        doc.rect(marginL, currentY, usableW, rowH).fill(bgColor);
        doc.rect(marginL, currentY, usableW, rowH).stroke('#e5e5e5');

        const cachedImg = imageCache.get(p.id);
        if (cachedImg) {
          try {
            doc.image(cachedImg, colImg + 2, currentY + 4, { width: 38, height: 42 });
          } catch (imgErr) {
            console.warn(`[Wholesale PDF] Image embed failed for product ${p.id}:`, imgErr instanceof Error ? imgErr.message : imgErr);
          }
        }

        doc.fontSize(8).font(fontB).fillColor(darkColor);
        doc.text(p.name, colName, currentY + 8, { width: colNameW, lineBreak: true, height: 22 });
        if (p.sku) {
          doc.fontSize(6).font(fontR).fillColor('#888888');
          doc.text(`SKU: ${p.sku}`, colName, currentY + 32, { width: colNameW });
        }

        const productCatIds = productCategoryMap.get(p.id) || [];
        const allCatIds = p.categoryId ? [p.categoryId, ...productCatIds.filter(id => id !== p.categoryId)] : productCatIds;
        const catNames = allCatIds.map((id) => catMap.get(id)).filter(Boolean).join(', ');
        doc.fontSize(7).font(fontR).fillColor('#666666');
        doc.text(catNames || '—', colCat, currentY + 15, { width: colCatW, lineBreak: true, height: 20 });

        const basePrice = parseFloat(p.basePrice);
        const effectiveRate = getEffectiveRate(p.id, p.categoryId);
        const discountedPrice = effectiveRate > 0 ? basePrice * (1 - effectiveRate / 100) : basePrice;

        if (hasAnyDiscount && effectiveRate > 0) {
          doc.fontSize(7).font(fontR).fillColor('#999999');
          const listPriceText = `${basePrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`;
          doc.text(listPriceText, colPrice, currentY + 15, { width: colPriceW, align: 'right' });
          const textWidth = doc.widthOfString(listPriceText);
          const strikeX = colPrice + colPriceW - textWidth;
          const strikeY = currentY + 15 + 4;
          doc.save().moveTo(strikeX, strikeY).lineTo(strikeX + textWidth, strikeY).lineWidth(0.5).stroke('#999999').restore();

          doc.fontSize(8).font(fontB).fillColor('#16a34a');
          doc.text(
            `${discountedPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`,
            colDisc,
            currentY + 15,
            { width: colDiscW, align: 'right' },
          );

          doc.fontSize(7).font(fontB).fillColor(brandColor);
          doc.text(`%${effectiveRate}`, colBadge, currentY + 15, { width: colBadgeW, align: 'center' });
        } else if (hasAnyDiscount && effectiveRate === 0) {
          doc.fontSize(8).font(fontB).fillColor(darkColor);
          doc.text(
            `${basePrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`,
            colPrice,
            currentY + 15,
            { width: colPriceW, align: 'right' },
          );
          doc.fontSize(8).font(fontR).fillColor('#999999');
          doc.text('—', colDisc, currentY + 15, { width: colDiscW, align: 'right' });
        } else {
          doc.fontSize(8).font(fontB).fillColor(darkColor);
          doc.text(
            `${basePrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`,
            colPrice,
            currentY + 15,
            { width: colPriceW, align: 'right' },
          );
        }

        currentY += rowH;
      }

      const range = doc.bufferedPageRange();
      for (let pi = range.start; pi < range.start + range.count; pi++) {
        doc.switchToPage(pi);
        doc.rect(marginL, pageBottom - 2, usableW, 0.5).fill('#e5e5e5');
        doc.fontSize(7).font(fontR).fillColor('#999999');
        doc.text('polenstone.com', marginL, pageBottom + 4);
        doc.text(
          `Sayfa ${pi + 1} / ${range.count}`,
          marginL,
          pageBottom + 4,
          { width: usableW, align: 'center' },
        );
        doc.text(dateStr, marginL, pageBottom + 4, { width: usableW, align: 'right' });
      }

      doc.end();
    } catch (error) {
      console.error('[Wholesale PDF] Error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'PDF oluşturma hatası' });
      }
    }
  });

  const { registerMarketplaceRoutes } = await import("./marketplaces/routes");
  registerMarketplaceRoutes(app, requireAdmin);

  return httpServer;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function notifyAdminNewReview(payload: AdminReviewNotificationPayload): Promise<void> {
  try {
    await Promise.allSettled([
      sendAdminReviewNotificationEmail(payload),
      sendReviewPendingToAdmin({
        productName: payload.productName,
        authorName: payload.authorName,
        authorEmail: payload.authorEmail,
        rating: payload.rating,
        title: payload.title,
        content: payload.content,
        isGuest: payload.isGuest,
      }),
    ]);
  } catch (error) {
    console.error('[Reviews] notifyAdminNewReview unexpected:', error);
  }
}
