import nodemailer from 'nodemailer';
import { storage } from './storage';
import type { Order, OrderItem, User } from '@shared/schema';
import { BANK_TRANSFER_INFO } from '@shared/bankInfo';
import { DEFAULT_FREE_SHIPPING_THRESHOLD } from '@shared/shipping';
import {
  refreshEmailBranding,
  emailSiteUrl,
  welcomeEmailTemplate,
  orderConfirmationTemplate,
  preparingNotificationTemplate,
  shippingNotificationTemplate,
  bankTransferPendingTemplate,
  adminOrderNotificationTemplate,
  passwordResetTemplate,
  reviewRequestTemplate,
  abandonedCartTemplate,
  adminReviewNotificationTemplate,
  guestReviewApprovedTemplate,
  guestReviewRejectedTemplate,
  quoteEmailTemplate,
  testEmailTemplate,
  contactFormTemplate,
  type OrderItemForEmail,
  type AbandonedCartItem,
  type QuoteEmailData,
  type AdminReviewNotificationPayload,
} from './emailTemplates';

export type { AdminReviewNotificationPayload };

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
}

interface EmailResult {
  success: boolean;
  error?: string;
}

// Havale banka bilgileri site_settings'ten okunur, boşsa koddaki varsayılan kullanılır.
async function getBankInfoForEmail() {
  try {
    const { getBankTransferConfig } = await import('./bankTransfer');
    const cfg = await getBankTransferConfig();
    return {
      bankName: cfg.bankName,
      accountHolder: cfg.accountHolder,
      iban: cfg.iban,
      discountPercent: Math.round(cfg.discountRate * 100),
    };
  } catch {
    return { ...BANK_TRANSFER_INFO, discountPercent: 10 };
  }
}

async function getSmtpConfig(): Promise<SmtpConfig | null> {
  const settings = await storage.getSiteSettings();
  if (!settings.smtp_host || !settings.smtp_user || !settings.smtp_pass) {
    console.log('[Email] SMTP settings not configured');
    return null;
  }
  return {
    host: settings.smtp_host,
    port: parseInt(settings.smtp_port || '587'),
    secure: settings.smtp_secure === 'true',
    user: settings.smtp_user,
    pass: settings.smtp_pass,
  };
}

async function createTransporter() {
  await refreshEmailBranding(); // şablonlar üretilmeden önce marka bilgisini güncelle
  const config = await getSmtpConfig();
  if (!config) return null;
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
  });
}

interface MailSpec {
  /** Gönderen görünen ad */
  fromName: string;
  to: (settings: Record<string, string>) => string | undefined;
  subject: string;
  html: () => string | Promise<string>;
  replyTo?: string;
  attachments?: Array<{ filename: string; content: Buffer; contentType: string }>;
  log: string;
  missingRecipientError?: string;
}

async function deliver(spec: MailSpec): Promise<EmailResult> {
  try {
    const transporter = await createTransporter();
    if (!transporter) return { success: false, error: 'SMTP yapılandırması eksik' };

    const settings = (await storage.getSiteSettings()) as Record<string, string>;
    const fromEmail = settings.smtp_user || 'no-reply@sepetzen.com';
    const to = spec.to(settings);
    if (!to) return { success: false, error: spec.missingRecipientError ?? 'Alıcı adresi yok' };

    await transporter.sendMail({
      from: `"${spec.fromName}" <${fromEmail}>`,
      to,
      replyTo: spec.replyTo,
      subject: spec.subject,
      html: await spec.html(),
      attachments: spec.attachments,
    });
    console.log(`[Email] ${spec.log} sent to ${to}`);
    return { success: true };
  } catch (error: any) {
    console.error(`[Email] Failed to send ${spec.log}:`, error);
    return { success: false, error: error.message };
  }
}

async function withProductImages(items: OrderItem[]): Promise<OrderItemForEmail[]> {
  return Promise.all(
    items.map(async (item) => {
      if (!item.productId) return item;
      try {
        const product = await storage.getProduct(item.productId);
        const firstImage = product?.images?.find((u) => !/\.(mp4|webm|mov)(\?|$)/i.test(u)) ?? null;
        return { ...item, productImage: firstImage };
      } catch {
        return item;
      }
    }),
  );
}

const ADMIN_MISSING = 'Admin e-posta adresi ayarlanmamış';

export function sendWelcomeEmail(user: User) {
  const userName = user.firstName || 'Değerli Müşterimiz';
  return deliver({
    fromName: 'Sepetzen',
    to: () => user.email,
    subject: "Sepetzen'e Hoş Geldiniz",
    html: () => welcomeEmailTemplate(userName),
    log: 'welcome email',
  });
}

export function sendOrderConfirmationEmail(order: Order, items: OrderItem[]) {
  return deliver({
    fromName: 'Sepetzen',
    to: () => order.customerEmail,
    subject: `Siparişiniz Alındı #${order.orderNumber}`,
    html: async () => orderConfirmationTemplate(order, await withProductImages(items)),
    log: 'order confirmation',
  });
}

export function sendPreparingNotificationEmail(order: Order) {
  return deliver({
    fromName: 'Sepetzen',
    to: () => order.customerEmail,
    subject: `Siparişiniz Hazırlanıyor #${order.orderNumber}`,
    html: () => preparingNotificationTemplate(order),
    log: 'preparing notification',
  });
}

export function sendShippingNotificationEmail(order: Order) {
  return deliver({
    fromName: 'Sepetzen',
    to: () => order.customerEmail,
    subject: `Siparişiniz Kargoya Verildi #${order.orderNumber}`,
    html: () => shippingNotificationTemplate(order),
    log: 'shipping notification',
  });
}

export function sendAdminOrderNotificationEmail(order: Order, items: OrderItem[]) {
  const prefix = order.paymentMethod === 'bank_transfer' ? '[HAVALE, Onay Bekliyor] ' : '';
  return deliver({
    fromName: 'Sepetzen Sistem',
    to: (s) => s.admin_email,
    missingRecipientError: ADMIN_MISSING,
    subject: `${prefix}Yeni Sipariş #${order.orderNumber} (${order.total} ₺)`,
    html: () => adminOrderNotificationTemplate(order, items),
    log: 'admin order notification',
  });
}

export function sendAdminReviewNotificationEmail(payload: AdminReviewNotificationPayload) {
  return deliver({
    fromName: 'Sepetzen Sistem',
    to: (s) => s.admin_email,
    missingRecipientError: ADMIN_MISSING,
    subject: `Yeni yorum onay bekliyor: ${payload.productName}`,
    html: () => adminReviewNotificationTemplate(payload),
    log: 'review notification',
  });
}

export interface GuestReviewApprovedPayload {
  to: string;
  guestName: string;
  productName: string;
  productSlug: string;
  rating: number;
}

export function sendGuestReviewApprovedEmail(payload: GuestReviewApprovedPayload) {
  return deliver({
    fromName: 'Sepetzen',
    to: () => payload.to,
    subject: `Yorumunuz yayında: ${payload.productName}`,
    html: () => guestReviewApprovedTemplate(payload),
    log: 'guest review approved email',
  });
}

export interface GuestReviewRejectedPayload {
  to: string;
  guestName: string;
  productName: string;
  reason: string;
}

export function sendGuestReviewRejectedEmail(payload: GuestReviewRejectedPayload) {
  return deliver({
    fromName: 'Sepetzen',
    to: () => payload.to,
    subject: `Yorumunuz onaylanmadı: ${payload.productName}`,
    html: () => guestReviewRejectedTemplate(payload),
    log: 'guest review rejected email',
  });
}

export function sendBankTransferPendingEmail(order: Order, items: OrderItem[]) {
  return deliver({
    fromName: 'Sepetzen',
    to: () => order.customerEmail,
    subject: `Havalenizi Bekliyoruz #${order.orderNumber}`,
    html: async () => bankTransferPendingTemplate(order, await withProductImages(items), await getBankInfoForEmail()),
    log: 'bank transfer pending email',
  });
}

export function sendPasswordResetEmail(user: User, resetToken: string) {
  const userName = user.firstName || 'Değerli Müşterimiz';
  return deliver({
    fromName: 'Sepetzen',
    to: () => user.email,
    subject: 'Şifre Sıfırlama Talebi',
    html: () => passwordResetTemplate(userName, `${emailSiteUrl()}/sifre-sifirla?token=${resetToken}`),
    log: 'password reset email',
  });
}

export function sendReviewRequestEmail(userEmail: string, userName: string, orderNumber: string, products: string[]) {
  return deliver({
    fromName: 'Sepetzen',
    to: () => userEmail,
    subject: 'Deneyiminizi Paylaşın',
    html: () => reviewRequestTemplate(userName, orderNumber, products, userEmail),
    log: 'review request',
  });
}

export function sendTestEmail(toEmail: string) {
  return deliver({
    fromName: 'Sepetzen',
    to: () => toEmail,
    subject: 'Sepetzen Test E-postası',
    html: () => testEmailTemplate(),
    log: 'test email',
  });
}

export function sendAbandonedCartEmail(
  userEmail: string,
  userName: string,
  cartItems: AbandonedCartItem[],
  cartTotal: number,
) {
  return deliver({
    fromName: 'Sepetzen',
    to: () => userEmail,
    subject: 'Sepetiniz Sizi Bekliyor',
    html: async () => {
      const s = await storage.getSiteSettings();
      const raw = parseFloat(String(s.free_shipping_threshold ?? ''));
      const threshold = Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_FREE_SHIPPING_THRESHOLD;
      return abandonedCartTemplate(userName, cartItems, cartTotal, threshold, userEmail);
    },
    log: 'abandoned cart reminder',
  });
}

export function sendQuoteEmail(dealerEmail: string, quoteData: QuoteEmailData, pdfBuffer: Buffer) {
  return deliver({
    fromName: 'Sepetzen B2B',
    to: () => dealerEmail,
    subject: `Sepetzen Teklif ${quoteData.quoteNumber}`,
    html: () => quoteEmailTemplate(quoteData),
    attachments: [{ filename: `Teklif-${quoteData.quoteNumber}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }],
    log: 'quote',
  });
}

export function sendContactEmail(params: { name: string; email: string; subject: string; message: string }) {
  return deliver({
    fromName: 'Sepetzen İletişim',
    to: (s) => s.contact_email || s.smtp_user,
    replyTo: `"${params.name.replace(/"/g, '')}" <${params.email}>`,
    subject: `İletişim Formu: ${params.subject}`,
    html: () => contactFormTemplate(params),
    log: 'contact form email',
  });
}
