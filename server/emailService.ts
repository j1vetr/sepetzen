import nodemailer from 'nodemailer';
import { storage } from './storage';
import type { Order, OrderItem, User } from '@shared/schema';
import { BANK_TRANSFER_INFO } from '@shared/bankInfo';
import { formatTRDateTime } from '@shared/dateFormat';

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
  const config = await getSmtpConfig();
  if (!config) return null;
  
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL TEMPLATE SYSTEM
// Outlook + Gmail + Apple Mail uyumlu, table-based, inline-style.
// Marka: Sepetzen — koyu yeşil (#2D5A27) vurgu, açık krem zemin.
// ─────────────────────────────────────────────────────────────────────────────

const BRAND = {
  primary: '#2D5A27',
  primaryDeep: '#1f3e1c',
  ink: '#0f1a0e',
  body: '#374737',
  muted: '#5a7a57',
  border: '#c8ddc5',
  borderSoft: '#dceeda',
  card: '#f0f7ef',
  bg: '#e8f2e7',
};

const CONTACT = {
  phoneDisplay: '0536 630 11 38',
  phoneTel: '+905366301138',
  email: 'sepetzen@gmail.com',
  addressLine1: 'Karaçalı Mah. Nergiz Sk. No.8/A',
  addressLine2: 'Dalaman / Muğla',
  site: 'sepetzen.com',
  siteUrl: 'https://sepetzen.com',
  whatsapp: 'https://wa.me/905366301138',
  instagram: 'https://www.instagram.com/sepetzen',
};

function escapeHtml(s: string | number | undefined | null): string {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function emailButton(href: string, label: string, opts?: { variant?: 'primary' | 'ghost' }): string {
  const variant = opts?.variant ?? 'primary';
  const bg = variant === 'primary' ? BRAND.primary : '#ffffff';
  const color = variant === 'primary' ? BRAND.ink : BRAND.ink;
  const stroke = variant === 'primary' ? 'f' : 't';
  const strokeColor = variant === 'primary' ? BRAND.primary : BRAND.border;
  const bgFallback = variant === 'primary' ? BRAND.primary : '#ffffff';
  return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:24px auto;">
  <tr>
    <td align="center" bgcolor="${bgFallback}" style="border-radius:4px;mso-padding-alt:0;background-color:${bgFallback};">
      <!--[if mso]>
      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${href}" style="height:48px;v-text-anchor:middle;width:280px;" arcsize="8%" stroke="${stroke}" strokecolor="${strokeColor}" fillcolor="${bg}">
        <w:anchorlock/>
        <center style="color:${color};font-family:Helvetica,Arial,sans-serif;font-size:13px;font-weight:bold;letter-spacing:1.2px;text-transform:uppercase;">${label}</center>
      </v:roundrect>
      <![endif]-->
      <a href="${href}" style="background-color:${bg};border:1px solid ${variant === 'primary' ? BRAND.primary : BRAND.border};border-radius:4px;color:${color};display:inline-block;font-family:Helvetica,Arial,sans-serif;font-size:13px;font-weight:bold;line-height:46px;text-align:center;text-decoration:none;width:280px;-webkit-text-size-adjust:none;letter-spacing:1.2px;text-transform:uppercase;mso-hide:all;">${label}</a>
    </td>
  </tr>
</table>`;
}

function infoCard(innerHtml: string, opts?: { padding?: string }): string {
  const padding = opts?.padding ?? '20px 22px';
  return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:${BRAND.card};border:1px solid ${BRAND.borderSoft};border-collapse:separate;border-radius:6px;margin:16px 0;">
  <tr>
    <td style="padding:${padding};font-family:Helvetica,Arial,sans-serif;color:${BRAND.body};font-size:14px;line-height:1.65;">
      ${innerHtml}
    </td>
  </tr>
</table>`;
}

function sectionTitle(text: string): string {
  return `<p style="margin:28px 0 10px 0;font-family:Helvetica,Arial,sans-serif;color:${BRAND.muted};font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">${text}</p>`;
}

const LOGO_URL = `${CONTACT.siteUrl}/email-logo.png`;

function brandHeader(): string {
  // Görsel destekleyen istemcilerde logo, blok eden istemcilerde alt-text + kalın
  // wordmark fallback gösterilir. Logo image yüklenmezse altındaki text wordmark
  // her zaman görünür kalır (defansif: text wordmark logo ile birlikte yer alır).
  return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#ffffff;">
  <tr>
    <td align="center" style="padding:32px 30px 22px 30px;border-bottom:1px solid ${BRAND.borderSoft};">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td align="center" style="line-height:0;font-size:0;">
            <a href="${CONTACT.siteUrl}" style="text-decoration:none;color:${BRAND.ink};">
              <img src="${LOGO_URL}" alt="SEPETZEN" width="120" height="48" style="display:block;width:120px;height:auto;max-width:120px;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;" />
            </a>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding-top:14px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:${BRAND.ink};font-size:20px;font-weight:800;letter-spacing:5px;line-height:1;">
            <a href="${CONTACT.siteUrl}" style="color:${BRAND.ink};text-decoration:none;">SEPETZEN</a>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding-top:6px;font-family:Helvetica,Arial,sans-serif;color:${BRAND.muted};font-size:10px;font-weight:600;letter-spacing:3px;text-transform:uppercase;">
            Kamp, Outdoor & Bıçak
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="height:3px;background-color:${BRAND.primary};line-height:3px;font-size:0;">&nbsp;</td>
  </tr>
</table>`;
}

function brandFooter(opts?: { unsubscribeEmail?: string }): string {
  const unsubEmail = opts?.unsubscribeEmail;
  const unsubBlock = unsubEmail ? `
        <tr>
          <td align="center" style="padding-top:14px;font-size:11px;line-height:1.7;color:rgba(255,255,255,0.55);">
            Bu e-postayı pazarlama izniniz nedeniyle <strong style="color:rgba(255,255,255,0.75);">${escapeHtml(unsubEmail)}</strong> adresine gönderdik.<br>
            <a href="mailto:${CONTACT.email}?subject=${encodeURIComponent('Abonelik İptali')}&body=${encodeURIComponent(`Lütfen ${unsubEmail} adresini pazarlama e-posta listesinden çıkarın.`)}" style="color:${BRAND.primary};text-decoration:underline;font-weight:600;">Abonelikten çık</a>
          </td>
        </tr>` : '';
  return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:${BRAND.ink};">
  <tr>
    <td style="padding:32px 30px 22px 30px;font-family:Helvetica,Arial,sans-serif;color:#ffffff;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td align="center" style="font-size:14px;font-weight:700;letter-spacing:3px;color:#ffffff;padding-bottom:4px;">
            SEPETZEN
          </td>
        </tr>
        <tr>
          <td align="center" style="font-size:10px;color:rgba(255,255,255,0.45);letter-spacing:2px;text-transform:uppercase;padding-bottom:18px;">
            ${CONTACT.site}
          </td>
        </tr>
        <tr>
          <td align="center" style="padding-bottom:6px;font-size:13px;color:rgba(255,255,255,0.85);">
            <a href="tel:${CONTACT.phoneTel}" style="color:${BRAND.primary};text-decoration:none;font-weight:600;">${CONTACT.phoneDisplay}</a>
            <span style="color:rgba(255,255,255,0.25);padding:0 8px;">|</span>
            <a href="mailto:${CONTACT.email}" style="color:${BRAND.primary};text-decoration:none;font-weight:600;">${CONTACT.email}</a>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:6px 0 18px 0;font-size:12px;line-height:1.6;color:rgba(255,255,255,0.6);">
            ${CONTACT.addressLine1}<br>${CONTACT.addressLine2}
          </td>
        </tr>
        <tr>
          <td align="center" style="padding-top:18px;border-top:1px solid rgba(255,255,255,0.08);">
            <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.4);line-height:1.6;">
              © ${new Date().getFullYear()} Sepetzen. Tüm hakları saklıdır.<br>
              Bu e-postayı, hesabınızla ilgili bir işlem nedeniyle aldınız.
            </p>
          </td>
        </tr>${unsubBlock}
      </table>
    </td>
  </tr>
</table>`;
}

function wrapTemplate(content: string, opts?: { preheader?: string; title?: string; unsubscribeEmail?: string }): string {
  const preheader = opts?.preheader ?? '';
  const title = opts?.title ?? 'Sepetzen';
  const unsubscribeEmail = opts?.unsubscribeEmail;
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="tr">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>${escapeHtml(title)}</title>
<!--[if mso]>
<xml>
  <o:OfficeDocumentSettings>
    <o:PixelsPerInch>96</o:PixelsPerInch>
    <o:AllowPNG/>
  </o:OfficeDocumentSettings>
</xml>
<![endif]-->
<style type="text/css">
  body, table, td, a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
  table, td { mso-table-lspace:0pt; mso-table-rspace:0pt; }
  img { -ms-interpolation-mode:bicubic; border:0; outline:none; text-decoration:none; }
  body { margin:0 !important; padding:0 !important; width:100% !important; background-color:${BRAND.bg}; }
  a { color:${BRAND.primary}; }
  @media screen and (max-width: 620px) {
    .container { width:100% !important; max-width:100% !important; }
    .px-mobile { padding-left:20px !important; padding-right:20px !important; }
    .stack-col { display:block !important; width:100% !important; padding-bottom:12px !important; text-align:left !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.bg};font-family:Helvetica,Arial,sans-serif;color:${BRAND.body};">
<div style="display:none;font-size:1px;color:${BRAND.bg};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${escapeHtml(preheader)}</div>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:${BRAND.bg};">
  <tr>
    <td align="center" style="padding:24px 12px;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="container" style="max-width:600px;width:100%;background-color:#ffffff;border:1px solid ${BRAND.borderSoft};">
        <tr><td>${brandHeader()}</td></tr>
        <tr>
          <td class="px-mobile" style="padding:36px 36px 28px 36px;font-family:Helvetica,Arial,sans-serif;color:${BRAND.body};">
            ${content}
          </td>
        </tr>
        <tr><td>${brandFooter({ unsubscribeEmail })}</td></tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

// Inline yardımcılar — şablonlar için
const H1 = (text: string) =>
  `<h1 style="margin:0 0 10px 0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:${BRAND.ink};font-size:24px;font-weight:700;line-height:1.25;letter-spacing:-0.2px;">${text}</h1>`;
const Lede = (text: string) =>
  `<p style="margin:0 0 22px 0;font-family:Helvetica,Arial,sans-serif;color:${BRAND.body};font-size:15px;line-height:1.65;">${text}</p>`;
const P = (text: string, color?: string) =>
  `<p style="margin:0 0 14px 0;font-family:Helvetica,Arial,sans-serif;color:${color ?? BRAND.body};font-size:14px;line-height:1.65;">${text}</p>`;
const Small = (text: string) =>
  `<p style="margin:18px 0 0 0;font-family:Helvetica,Arial,sans-serif;color:${BRAND.muted};font-size:12px;line-height:1.6;text-align:center;">${text}</p>`;
const HR = () =>
  `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"><tr><td style="border-top:1px solid ${BRAND.borderSoft};font-size:0;line-height:0;height:1px;">&nbsp;</td></tr></table>`;

// ─── Şablonlar ──────────────────────────────────────────────────────────────

function welcomeEmailTemplate(userName: string): string {
  const safeName = escapeHtml(userName);
  return wrapTemplate(`
    ${H1(`Hoş geldiniz, ${safeName}.`)}
    ${Lede('Sepetzen ailesine katıldığınız için çok mutluyuz. Atölyemizde el işçiliğiyle şekillenen mermer parçalar artık sizin için bir tık uzakta.')}

    ${infoCard(`
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td style="padding-bottom:14px;font-size:14px;color:${BRAND.ink};font-weight:700;letter-spacing:0.4px;">Sizi neler bekliyor</td>
        </tr>
        <tr>
          <td style="padding-bottom:10px;">
            <span style="display:inline-block;width:6px;height:6px;background:${BRAND.primary};border-radius:50%;margin-right:10px;vertical-align:middle;"></span>
            <strong style="color:${BRAND.ink};">El işçiliği</strong> <span style="color:${BRAND.body};">- her parça atölyemizde özenle şekillenir</span>
          </td>
        </tr>
        <tr>
          <td style="padding-bottom:10px;">
            <span style="display:inline-block;width:6px;height:6px;background:${BRAND.primary};border-radius:50%;margin-right:10px;vertical-align:middle;"></span>
            <strong style="color:${BRAND.ink};">Güvenli kargo</strong> <span style="color:${BRAND.body};">- Aras Kargo ile hızlı, kırılmaz paketleme</span>
          </td>
        </tr>
        <tr>
          <td>
            <span style="display:inline-block;width:6px;height:6px;background:${BRAND.primary};border-radius:50%;margin-right:10px;vertical-align:middle;"></span>
            <strong style="color:${BRAND.ink};">Üyeye özel</strong> <span style="color:${BRAND.body};">- kampanyalardan ilk siz haberdar olun</span>
          </td>
        </tr>
      </table>
    `)}

    ${emailButton(CONTACT.siteUrl, 'Koleksiyona Göz At')}

    ${Small(`Sorularınız için <a href="mailto:${CONTACT.email}" style="color:${BRAND.primaryDeep};text-decoration:none;">${CONTACT.email}</a> adresinden bize ulaşabilirsiniz.`)}
  `, { preheader: `Hoş geldiniz ${safeName} - Sepetzen ailesindesiniz.`, title: 'Hoş geldiniz' });
}

type OrderItemForEmail = OrderItem & { productImage?: string | null };

function orderConfirmationTemplate(order: Order, items: OrderItemForEmail[], siteUrl: string = CONTACT.siteUrl): string {
  const itemRows = items.map(item => {
    const img = item.productImage;
    const thumbCell = img
      ? `<td width="64" style="padding:14px 12px 14px 0;border-bottom:1px solid ${BRAND.borderSoft};vertical-align:top;">
          <img src="${escapeHtml(img)}" alt="${escapeHtml(item.productName)}" width="64" height="64" style="display:block;width:64px;height:64px;border:1px solid ${BRAND.borderSoft};object-fit:cover;-ms-interpolation-mode:bicubic;" />
        </td>`
      : '';
    return `
    <tr>
      ${thumbCell}
      <td style="padding:14px 0;border-bottom:1px solid ${BRAND.borderSoft};vertical-align:top;">
        <div style="font-family:Helvetica,Arial,sans-serif;color:${BRAND.ink};font-size:14px;font-weight:600;line-height:1.4;">${escapeHtml(item.productName)}</div>
        ${item.variantDetails ? `<div style="font-family:Helvetica,Arial,sans-serif;color:${BRAND.muted};font-size:12px;line-height:1.5;margin-top:3px;">${escapeHtml(item.variantDetails)}</div>` : ''}
        <div style="font-family:Helvetica,Arial,sans-serif;color:${BRAND.muted};font-size:12px;line-height:1.5;margin-top:3px;">Adet: ${escapeHtml(item.quantity)}</div>
      </td>
      <td align="right" style="padding:14px 0;border-bottom:1px solid ${BRAND.borderSoft};vertical-align:top;font-family:Helvetica,Arial,sans-serif;color:${BRAND.ink};font-size:14px;font-weight:700;white-space:nowrap;">${escapeHtml(item.subtotal)}&nbsp;₺</td>
    </tr>`;
  }).join('');

  const shippingAddress = order.shippingAddress as { address: string; city: string; district: string; postalCode: string; country?: string };
  const trackingUrl = `${siteUrl}/siparis-takip?no=${encodeURIComponent(order.orderNumber)}`;
  const orderDate = formatTRDateTime(order.createdAt);

  return wrapTemplate(`
    ${H1('Siparişiniz alındı.')}
    ${Lede(`Teşekkürler ${escapeHtml(order.customerName)} - siparişiniz başarıyla oluşturuldu. Hazırlanmaya başlandığında size yine yazacağız.`)}

    ${infoCard(`
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td class="stack-col" style="vertical-align:top;width:50%;">
            <div style="font-size:11px;color:${BRAND.muted};letter-spacing:1.5px;text-transform:uppercase;font-weight:600;">Sipariş No</div>
            <div style="font-size:18px;color:${BRAND.ink};font-weight:700;margin-top:4px;font-family:'Courier New',monospace;letter-spacing:0.5px;">#${escapeHtml(order.orderNumber)}</div>
          </td>
          <td class="stack-col" align="right" style="vertical-align:top;width:50%;">
            <div style="font-size:11px;color:${BRAND.muted};letter-spacing:1.5px;text-transform:uppercase;font-weight:600;">Tarih</div>
            <div style="font-size:14px;color:${BRAND.ink};font-weight:600;margin-top:4px;">${orderDate}</div>
          </td>
        </tr>
      </table>
    `)}

    ${emailButton(trackingUrl, 'Siparişimi Takip Et')}

    ${sectionTitle('Sipariş İçeriği')}
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-top:1px solid ${BRAND.borderSoft};margin-top:6px;">
      ${itemRows}
    </table>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top:10px;">
      <tr>
        <td style="padding:8px 0;font-family:Helvetica,Arial,sans-serif;color:${BRAND.body};font-size:13px;">Ara Toplam</td>
        <td align="right" style="padding:8px 0;font-family:Helvetica,Arial,sans-serif;color:${BRAND.ink};font-size:13px;font-weight:600;white-space:nowrap;">${escapeHtml(order.subtotal)}&nbsp;₺</td>
      </tr>
      <tr>
        <td style="padding:8px 0;font-family:Helvetica,Arial,sans-serif;color:${BRAND.body};font-size:13px;">Kargo</td>
        <td align="right" style="padding:8px 0;font-family:Helvetica,Arial,sans-serif;color:${BRAND.ink};font-size:13px;font-weight:600;white-space:nowrap;">${parseFloat(order.shippingCost) === 0 ? 'Ücretsiz' : escapeHtml(order.shippingCost) + '&nbsp;₺'}</td>
      </tr>
      ${order.discountAmount && parseFloat(order.discountAmount) > 0 ? `
      <tr>
        <td style="padding:8px 0;font-family:Helvetica,Arial,sans-serif;color:${BRAND.body};font-size:13px;">İndirim</td>
        <td align="right" style="padding:8px 0;font-family:Helvetica,Arial,sans-serif;color:${BRAND.primaryDeep};font-size:13px;font-weight:700;white-space:nowrap;">−${escapeHtml(order.discountAmount)}&nbsp;₺</td>
      </tr>` : ''}
      <tr>
        <td style="padding:14px 0 0 0;border-top:2px solid ${BRAND.ink};font-family:Helvetica,Arial,sans-serif;color:${BRAND.ink};font-size:15px;font-weight:700;letter-spacing:0.5px;">Toplam</td>
        <td align="right" style="padding:14px 0 0 0;border-top:2px solid ${BRAND.ink};font-family:Helvetica,Arial,sans-serif;color:${BRAND.ink};font-size:18px;font-weight:800;white-space:nowrap;">${escapeHtml(order.total)}&nbsp;₺</td>
      </tr>
    </table>

    ${sectionTitle('Teslimat Adresi')}
    ${infoCard(`
      <div style="font-size:14px;color:${BRAND.ink};font-weight:600;margin-bottom:6px;">${escapeHtml(order.customerName)}</div>
      <div style="font-size:13px;color:${BRAND.body};line-height:1.6;">${escapeHtml(shippingAddress.address)}</div>
      <div style="font-size:13px;color:${BRAND.body};line-height:1.6;">${escapeHtml(shippingAddress.district)}, ${escapeHtml(shippingAddress.city)} ${escapeHtml(shippingAddress.postalCode)}</div>
      <div style="font-size:13px;color:${BRAND.body};margin-top:8px;">${escapeHtml(order.customerPhone)}</div>
    `)}

    ${Small(`Sorularınız için <a href="mailto:${CONTACT.email}" style="color:${BRAND.primaryDeep};text-decoration:none;font-weight:600;">${CONTACT.email}</a> veya <a href="tel:${CONTACT.phoneTel}" style="color:${BRAND.primaryDeep};text-decoration:none;font-weight:600;">${CONTACT.phoneDisplay}</a>`)}
  `, { preheader: `Sipariş #${order.orderNumber} alındı - toplam ${order.total} ₺`, title: `Sipariş #${order.orderNumber}` });
}

function preparingNotificationTemplate(order: Order): string {
  return wrapTemplate(`
    ${H1('Siparişiniz hazırlanıyor.')}
    ${Lede('Güzel haber - siparişiniz şu anda atölyemizde özenle hazırlanıyor. Kargoya verildiğinde takip numaranızı paylaşacağız.')}

    ${infoCard(`
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td class="stack-col" style="vertical-align:top;width:50%;">
            <div style="font-size:11px;color:${BRAND.muted};letter-spacing:1.5px;text-transform:uppercase;font-weight:600;">Sipariş No</div>
            <div style="font-size:18px;color:${BRAND.ink};font-weight:700;margin-top:4px;font-family:'Courier New',monospace;">#${escapeHtml(order.orderNumber)}</div>
          </td>
          <td class="stack-col" align="right" style="vertical-align:top;width:50%;">
            <div style="font-size:11px;color:${BRAND.muted};letter-spacing:1.5px;text-transform:uppercase;font-weight:600;">Toplam</div>
            <div style="font-size:18px;color:${BRAND.ink};font-weight:700;margin-top:4px;">${escapeHtml(order.total)}&nbsp;₺</div>
          </td>
        </tr>
      </table>
    `)}

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:${BRAND.ink};margin:18px 0;">
      <tr>
        <td align="center" style="padding:26px 24px;">
          <div style="font-size:11px;color:${BRAND.primary};letter-spacing:2px;text-transform:uppercase;font-weight:700;">Tahmini Kargo Süresi</div>
          <div style="font-size:28px;color:#ffffff;font-weight:800;margin-top:8px;letter-spacing:0.5px;">1–2 iş günü</div>
        </td>
      </tr>
    </table>

    ${Small('Siparişiniz kargoya verildiğinde tekrar bilgi vereceğiz.')}
  `, { preheader: `#${order.orderNumber} hazırlanıyor - 1–2 iş günü içinde kargoda`, title: 'Sipariş Hazırlanıyor' });
}

function shippingNotificationTemplate(order: Order): string {
  const arasTrackingUrl = order.trackingNumber
    ? `https://kargotakip.araskargo.com.tr/mainpage.aspx?code=${encodeURIComponent(order.trackingNumber)}`
    : null;
  const trackingUrl = order.trackingUrl || arasTrackingUrl;
  const carrier = order.shippingCarrier || 'Aras Kargo';
  const orderDate = formatTRDateTime(order.createdAt);

  return wrapTemplate(`
    ${H1('Kargoya verildi.')}
    ${Lede('Siparişiniz paketlendi ve kargoya teslim edildi. Aşağıdaki takip numarası ile her aşamayı izleyebilirsiniz.')}

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:${BRAND.ink};margin:18px 0;">
      <tr>
        <td align="center" style="padding:30px 24px;">
          <div style="font-size:11px;color:${BRAND.primary};letter-spacing:2px;text-transform:uppercase;font-weight:700;">Kargo Takip Numarası</div>
          <div style="font-size:24px;color:#ffffff;font-weight:800;margin:12px 0 6px 0;letter-spacing:2px;font-family:'Courier New',monospace;">${escapeHtml(order.trackingNumber || 'Henüz belirlenmedi')}</div>
          <div style="font-size:13px;color:rgba(255,255,255,0.6);font-weight:500;">${escapeHtml(carrier)}</div>
        </td>
      </tr>
    </table>

    ${trackingUrl ? emailButton(trackingUrl, 'Kargomu Takip Et') : ''}

    ${infoCard(`
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td class="stack-col" style="vertical-align:top;width:50%;">
            <div style="font-size:11px;color:${BRAND.muted};letter-spacing:1.5px;text-transform:uppercase;font-weight:600;">Sipariş No</div>
            <div style="font-size:16px;color:${BRAND.ink};font-weight:700;margin-top:4px;font-family:'Courier New',monospace;">#${escapeHtml(order.orderNumber)}</div>
          </td>
          <td class="stack-col" align="right" style="vertical-align:top;width:50%;">
            <div style="font-size:11px;color:${BRAND.muted};letter-spacing:1.5px;text-transform:uppercase;font-weight:600;">Toplam</div>
            <div style="font-size:16px;color:${BRAND.ink};font-weight:700;margin-top:4px;">${escapeHtml(order.total)}&nbsp;₺</div>
          </td>
        </tr>
        <tr>
          <td colspan="2" style="padding-top:14px;vertical-align:top;">
            <div style="font-size:11px;color:${BRAND.muted};letter-spacing:1.5px;text-transform:uppercase;font-weight:600;">Sipariş Tarihi &amp; Saati</div>
            <div style="font-size:14px;color:${BRAND.ink};font-weight:600;margin-top:4px;">${orderDate}</div>
          </td>
        </tr>
      </table>
    `)}

    ${Small(`Kargo süresince sorularınız için <a href="tel:${CONTACT.phoneTel}" style="color:${BRAND.primaryDeep};text-decoration:none;font-weight:600;">${CONTACT.phoneDisplay}</a>`)}
  `, { preheader: `#${order.orderNumber} kargoda - takip: ${order.trackingNumber || 'yakında'}`, title: 'Kargoya Verildi' });
}

function bankTransferPendingTemplate(order: Order, items: OrderItemForEmail[], siteUrl: string = CONTACT.siteUrl): string {
  const itemRows = items.map(item => {
    const img = item.productImage;
    const thumbCell = img
      ? `<td width="64" style="padding:14px 12px 14px 0;border-bottom:1px solid ${BRAND.borderSoft};vertical-align:top;">
          <img src="${escapeHtml(img)}" alt="${escapeHtml(item.productName)}" width="64" height="64" style="display:block;width:64px;height:64px;border:1px solid ${BRAND.borderSoft};object-fit:cover;-ms-interpolation-mode:bicubic;" />
        </td>`
      : '';
    return `
    <tr>
      ${thumbCell}
      <td style="padding:14px 0;border-bottom:1px solid ${BRAND.borderSoft};vertical-align:top;">
        <div style="font-family:Helvetica,Arial,sans-serif;color:${BRAND.ink};font-size:14px;font-weight:600;line-height:1.4;">${escapeHtml(item.productName)}</div>
        ${item.variantDetails ? `<div style="font-family:Helvetica,Arial,sans-serif;color:${BRAND.muted};font-size:12px;line-height:1.5;margin-top:3px;">${escapeHtml(item.variantDetails)}</div>` : ''}
        <div style="font-family:Helvetica,Arial,sans-serif;color:${BRAND.muted};font-size:12px;line-height:1.5;margin-top:3px;">Adet: ${escapeHtml(item.quantity)}</div>
      </td>
      <td align="right" style="padding:14px 0;border-bottom:1px solid ${BRAND.borderSoft};vertical-align:top;font-family:Helvetica,Arial,sans-serif;color:${BRAND.ink};font-size:14px;font-weight:700;white-space:nowrap;">${escapeHtml(item.subtotal)}&nbsp;₺</td>
    </tr>`;
  }).join('');

  const trackingUrl = `${siteUrl}/siparis-takip?no=${encodeURIComponent(order.orderNumber)}`;
  const orderDate = formatTRDateTime(order.createdAt);

  return wrapTemplate(`
    ${H1('Havalenizi bekliyoruz.')}
    ${Lede(`Teşekkürler ${escapeHtml(order.customerName)} - siparişiniz oluşturuldu. Aşağıdaki ${BANK_TRANSFER_INFO.bankName} hesabımıza ödemenizi gönderdiğinizde sipariş hazırlığa alınacak.`)}

    ${infoCard(`
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td class="stack-col" style="vertical-align:top;width:50%;">
            <div style="font-size:11px;color:${BRAND.muted};letter-spacing:1.5px;text-transform:uppercase;font-weight:600;">Sipariş No</div>
            <div style="font-size:18px;color:${BRAND.ink};font-weight:700;margin-top:4px;font-family:'Courier New',monospace;letter-spacing:0.5px;">#${escapeHtml(order.orderNumber)}</div>
          </td>
          <td class="stack-col" align="right" style="vertical-align:top;width:50%;">
            <div style="font-size:11px;color:${BRAND.muted};letter-spacing:1.5px;text-transform:uppercase;font-weight:600;">Tarih</div>
            <div style="font-size:14px;color:${BRAND.ink};font-weight:600;margin-top:4px;">${orderDate}</div>
          </td>
        </tr>
      </table>
    `)}

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:${BRAND.primary};margin:18px 0;">
      <tr>
        <td align="center" style="padding:18px 24px;font-family:Helvetica,Arial,sans-serif;color:${BRAND.ink};font-size:14px;font-weight:600;line-height:1.5;">
          🏦 <strong>Havale ile %10 indirim uygulandı.</strong><br/>
          <span style="font-size:13px;font-weight:500;">Ödenecek tutar: <strong>${escapeHtml(order.total)}&nbsp;₺</strong></span>
        </td>
      </tr>
    </table>

    ${sectionTitle('Banka Bilgileri')}
    ${infoCard(`
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td style="padding:6px 0;font-size:12px;color:${BRAND.muted};letter-spacing:1.2px;text-transform:uppercase;font-weight:600;width:38%;">Banka</td>
          <td style="padding:6px 0;font-size:14px;color:${BRAND.ink};font-weight:700;">${BANK_TRANSFER_INFO.bankName}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:12px;color:${BRAND.muted};letter-spacing:1.2px;text-transform:uppercase;font-weight:600;">Ad Soyad</td>
          <td style="padding:6px 0;font-size:14px;color:${BRAND.ink};font-weight:700;">${BANK_TRANSFER_INFO.accountHolder}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:12px;color:${BRAND.muted};letter-spacing:1.2px;text-transform:uppercase;font-weight:600;">IBAN</td>
          <td style="padding:6px 0;font-size:14px;color:${BRAND.ink};font-weight:700;font-family:'Courier New',monospace;letter-spacing:0.5px;">${BANK_TRANSFER_INFO.iban}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:12px;color:${BRAND.muted};letter-spacing:1.2px;text-transform:uppercase;font-weight:600;">Tutar</td>
          <td style="padding:6px 0;font-size:15px;color:${BRAND.primaryDeep};font-weight:800;">${escapeHtml(order.total)}&nbsp;₺</td>
        </tr>
      </table>
    `)}

    ${P('Havaleniz hesabımıza ulaştıktan sonra siparişiniz onaylanır ve hazırlanmaya başlar. Onay verildiğinde size ayrıca e-posta ve WhatsApp ile bilgilendirme gönderilecektir.')}

    ${emailButton(trackingUrl, 'Siparişimi Takip Et')}

    ${sectionTitle('Sipariş İçeriği')}
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-top:1px solid ${BRAND.borderSoft};margin-top:6px;">
      ${itemRows}
    </table>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top:10px;">
      <tr>
        <td style="padding:8px 0;font-family:Helvetica,Arial,sans-serif;color:${BRAND.body};font-size:13px;">Ara Toplam</td>
        <td align="right" style="padding:8px 0;font-family:Helvetica,Arial,sans-serif;color:${BRAND.ink};font-size:13px;font-weight:600;white-space:nowrap;">${escapeHtml(order.subtotal)}&nbsp;₺</td>
      </tr>
      <tr>
        <td style="padding:8px 0;font-family:Helvetica,Arial,sans-serif;color:${BRAND.body};font-size:13px;">Kargo</td>
        <td align="right" style="padding:8px 0;font-family:Helvetica,Arial,sans-serif;color:${BRAND.ink};font-size:13px;font-weight:600;white-space:nowrap;">${parseFloat(order.shippingCost) === 0 ? 'Ücretsiz' : escapeHtml(order.shippingCost) + '&nbsp;₺'}</td>
      </tr>
      ${order.discountAmount && parseFloat(order.discountAmount) > 0 ? `
      <tr>
        <td style="padding:8px 0;font-family:Helvetica,Arial,sans-serif;color:${BRAND.body};font-size:13px;">İndirim ${order.couponCode ? `(${escapeHtml(order.couponCode)})` : '(Havale)'}</td>
        <td align="right" style="padding:8px 0;font-family:Helvetica,Arial,sans-serif;color:${BRAND.primaryDeep};font-size:13px;font-weight:700;white-space:nowrap;">−${escapeHtml(order.discountAmount)}&nbsp;₺</td>
      </tr>` : ''}
      <tr>
        <td style="padding:14px 0 0 0;border-top:2px solid ${BRAND.ink};font-family:Helvetica,Arial,sans-serif;color:${BRAND.ink};font-size:15px;font-weight:700;letter-spacing:0.5px;">Ödenecek Toplam</td>
        <td align="right" style="padding:14px 0 0 0;border-top:2px solid ${BRAND.ink};font-family:Helvetica,Arial,sans-serif;color:${BRAND.ink};font-size:18px;font-weight:800;white-space:nowrap;">${escapeHtml(order.total)}&nbsp;₺</td>
      </tr>
    </table>

    ${Small(`Sorularınız için <a href="tel:${CONTACT.phoneTel}" style="color:${BRAND.primaryDeep};text-decoration:none;font-weight:600;">${CONTACT.phoneDisplay}</a>`)}
  `, { preheader: `#${order.orderNumber} - Havale onayı bekleniyor (${order.total} ₺)`, title: 'Havalenizi Bekliyoruz' });
}

function adminOrderNotificationTemplate(order: Order, items: OrderItem[]): string {
  const itemRows = items.map(item => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid ${BRAND.borderSoft};color:${BRAND.ink};font-size:13px;">${escapeHtml(item.productName)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid ${BRAND.borderSoft};color:${BRAND.body};font-size:12px;">${escapeHtml(item.variantDetails || '-')}</td>
      <td align="center" style="padding:10px 12px;border-bottom:1px solid ${BRAND.borderSoft};color:${BRAND.body};font-size:13px;">${escapeHtml(item.quantity)}</td>
      <td align="right" style="padding:10px 12px;border-bottom:1px solid ${BRAND.borderSoft};color:${BRAND.ink};font-size:13px;font-weight:700;white-space:nowrap;">${escapeHtml(item.subtotal)}&nbsp;₺</td>
    </tr>
  `).join('');

  const shippingAddress = order.shippingAddress as { address: string; city: string; district: string; postalCode: string; country?: string };
  const dateStr = formatTRDateTime(order.createdAt);

  return wrapTemplate(`
    ${H1('Yeni sipariş alındı.')}
    ${Lede('Aşağıda siparişin detayları yer alıyor. Hazırlığa hemen başlayabilirsiniz.')}

    ${infoCard(`
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td class="stack-col" style="vertical-align:top;width:33%;padding-right:8px;">
            <div style="font-size:11px;color:${BRAND.muted};letter-spacing:1.5px;text-transform:uppercase;font-weight:600;">Sipariş No</div>
            <div style="font-size:15px;color:${BRAND.ink};font-weight:700;margin-top:4px;font-family:'Courier New',monospace;">#${escapeHtml(order.orderNumber)}</div>
          </td>
          <td class="stack-col" style="vertical-align:top;width:33%;padding-right:8px;">
            <div style="font-size:11px;color:${BRAND.muted};letter-spacing:1.5px;text-transform:uppercase;font-weight:600;">Tarih</div>
            <div style="font-size:13px;color:${BRAND.ink};font-weight:600;margin-top:4px;">${dateStr}</div>
          </td>
          <td class="stack-col" align="right" style="vertical-align:top;width:33%;">
            <div style="font-size:11px;color:${BRAND.muted};letter-spacing:1.5px;text-transform:uppercase;font-weight:600;">Toplam</div>
            <div style="font-size:18px;color:${BRAND.primaryDeep};font-weight:800;margin-top:4px;">${escapeHtml(order.total)}&nbsp;₺</div>
          </td>
        </tr>
      </table>
    `)}

    ${sectionTitle('Müşteri')}
    ${infoCard(`
      <div style="font-size:14px;color:${BRAND.ink};font-weight:700;margin-bottom:6px;">${escapeHtml(order.customerName)}</div>
      <div style="font-size:13px;color:${BRAND.body};line-height:1.6;"><a href="mailto:${escapeHtml(order.customerEmail)}" style="color:${BRAND.primaryDeep};text-decoration:none;">${escapeHtml(order.customerEmail)}</a></div>
      <div style="font-size:13px;color:${BRAND.body};line-height:1.6;"><a href="tel:${escapeHtml(order.customerPhone)}" style="color:${BRAND.primaryDeep};text-decoration:none;">${escapeHtml(order.customerPhone)}</a></div>
      ${HR()}
      <div style="font-size:11px;color:${BRAND.muted};letter-spacing:1.5px;text-transform:uppercase;font-weight:600;margin:8px 0 4px 0;">Teslimat Adresi</div>
      <div style="font-size:13px;color:${BRAND.body};line-height:1.6;">${escapeHtml(shippingAddress.address)}</div>
      <div style="font-size:13px;color:${BRAND.body};line-height:1.6;">${escapeHtml(shippingAddress.district)}, ${escapeHtml(shippingAddress.city)} ${escapeHtml(shippingAddress.postalCode)}</div>
    `)}

    ${sectionTitle('Ürünler')}
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:${BRAND.card};border:1px solid ${BRAND.borderSoft};border-collapse:collapse;margin-top:6px;">
      <thead>
        <tr style="background-color:${BRAND.ink};">
          <th align="left" style="padding:11px 12px;color:${BRAND.primary};font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">Ürün</th>
          <th align="left" style="padding:11px 12px;color:${BRAND.primary};font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">Varyant</th>
          <th align="center" style="padding:11px 12px;color:${BRAND.primary};font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">Adet</th>
          <th align="right" style="padding:11px 12px;color:${BRAND.primary};font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">Tutar</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>

    ${emailButton(`${CONTACT.siteUrl}/toov-admin`, 'Siparişi Yönet')}
  `, { preheader: `Yeni sipariş #${order.orderNumber} - ${order.total} ₺`, title: `Yeni Sipariş #${order.orderNumber}` });
}

function passwordResetTemplate(userName: string, resetLink: string): string {
  return wrapTemplate(`
    ${H1('Şifre sıfırlama talebi.')}
    ${P(`Merhaba ${escapeHtml(userName)},`)}
    ${Lede('Hesabınız için bir şifre sıfırlama talebi aldık. Aşağıdaki butona tıklayarak yeni şifrenizi belirleyebilirsiniz.')}

    ${emailButton(resetLink, 'Şifremi Sıfırla')}

    ${infoCard(`
      <div style="font-size:13px;color:${BRAND.body};line-height:1.6;">
        <strong style="color:${BRAND.ink};">Not:</strong> Güvenliğiniz için bu bağlantı <strong style="color:${BRAND.ink};">1 saat</strong> içinde geçerliliğini yitirir.
      </div>
    `)}

    ${P('Bu talebi siz yapmadıysanız bu e-postayı yok sayabilirsiniz - hesabınız güvende.', BRAND.muted)}

    <p style="margin:20px 0 0 0;font-family:Helvetica,Arial,sans-serif;color:${BRAND.muted};font-size:11px;line-height:1.6;word-break:break-all;">
      Buton çalışmıyorsa aşağıdaki bağlantıyı tarayıcınıza kopyalayın:<br>
      <a href="${resetLink}" style="color:${BRAND.primaryDeep};text-decoration:none;">${escapeHtml(resetLink)}</a>
    </p>
  `, { preheader: 'Şifrenizi sıfırlamak için bağlantı içeride.', title: 'Şifre Sıfırlama' });
}

function reviewRequestTemplate(userName: string, orderNumber: string, products: string[], userEmail?: string): string {
  const productsList = products.map(p => `
    <tr>
      <td style="padding:8px 0;font-family:Helvetica,Arial,sans-serif;color:${BRAND.body};font-size:13px;line-height:1.6;">
        <span style="display:inline-block;width:5px;height:5px;background:${BRAND.primary};border-radius:50%;margin-right:10px;vertical-align:middle;"></span>
        ${escapeHtml(p)}
      </td>
    </tr>
  `).join('');

  return wrapTemplate(`
    ${H1('Deneyiminizi paylaşır mısınız?')}
    ${P(`Merhaba ${escapeHtml(userName)},`)}
    ${Lede(`#${escapeHtml(orderNumber)} numaralı siparişiniz teslim edildi. Birkaç dakikanızı ayırıp ürünleri değerlendirirseniz hem bize yön verir hem de yeni müşterilere yardımcı olursunuz.`)}

    ${infoCard(`
      <div style="font-size:11px;color:${BRAND.muted};letter-spacing:1.5px;text-transform:uppercase;font-weight:600;margin-bottom:10px;">Siparişinizdeki ürünler</div>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">${productsList}</table>
    `)}

    ${emailButton(`${CONTACT.siteUrl}/profilim`, 'Değerlendirme Yap')}

    ${Small('Geri bildiriminiz bizim için çok değerli - teşekkürler.')}
  `, { preheader: `#${orderNumber} teslim edildi - deneyiminizi paylaşır mısınız?`, title: 'Değerlendirme', unsubscribeEmail: userEmail });
}

interface CartItem {
  productName: string;
  variantDetails?: string;
  price: string;
  quantity: number;
  imageUrl?: string;
}

function abandonedCartTemplate(userName: string, cartItems: CartItem[], cartTotal: number, siteUrl: string = CONTACT.siteUrl, userEmail?: string): string {
  const itemRows = cartItems.map(item => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid ${BRAND.borderSoft};vertical-align:top;">
        <div style="font-family:Helvetica,Arial,sans-serif;color:${BRAND.ink};font-size:14px;font-weight:600;">${escapeHtml(item.productName)}</div>
        <div style="font-family:Helvetica,Arial,sans-serif;color:${BRAND.muted};font-size:12px;margin-top:3px;">${escapeHtml(item.variantDetails || '')}${item.variantDetails ? ' · ' : ''}Adet: ${escapeHtml(item.quantity)}</div>
      </td>
      <td align="right" style="padding:12px 0;border-bottom:1px solid ${BRAND.borderSoft};vertical-align:top;font-family:Helvetica,Arial,sans-serif;color:${BRAND.ink};font-size:14px;font-weight:700;white-space:nowrap;">${escapeHtml(item.price)}&nbsp;₺</td>
    </tr>
  `).join('');

  const remaining = Math.max(0, 2500 - cartTotal);

  return wrapTemplate(`
    ${H1('Sepetiniz sizi bekliyor.')}
    ${P(`Merhaba ${escapeHtml(userName)},`)}
    ${Lede('Beğendiğiniz ürünleri sepete eklediniz ama henüz tamamlamadınız. Stoklar sınırlı - favorilerinizi kaçırmayın.')}

    ${infoCard(`
      <div style="font-size:11px;color:${BRAND.muted};letter-spacing:1.5px;text-transform:uppercase;font-weight:600;margin-bottom:6px;">Sepetinizdeki ürünler</div>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">${itemRows}</table>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top:14px;">
        <tr>
          <td style="padding-top:10px;border-top:2px solid ${BRAND.ink};font-family:Helvetica,Arial,sans-serif;color:${BRAND.ink};font-size:14px;font-weight:700;">Toplam</td>
          <td align="right" style="padding-top:10px;border-top:2px solid ${BRAND.ink};font-family:Helvetica,Arial,sans-serif;color:${BRAND.ink};font-size:18px;font-weight:800;white-space:nowrap;">${cartTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}&nbsp;₺</td>
        </tr>
      </table>
    `)}

    ${emailButton(`${siteUrl}/sepet`, 'Sepetime Dön')}

    ${remaining > 0 ? `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:${BRAND.primary};margin:18px 0;">
      <tr>
        <td align="center" style="padding:18px 24px;font-family:Helvetica,Arial,sans-serif;color:${BRAND.ink};font-size:14px;font-weight:600;">
          <strong>${remaining.toLocaleString('tr-TR')} ₺</strong> daha ekleyin, kargo bizden!
        </td>
      </tr>
    </table>` : `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:${BRAND.primary};margin:18px 0;">
      <tr>
        <td align="center" style="padding:18px 24px;font-family:Helvetica,Arial,sans-serif;color:${BRAND.ink};font-size:14px;font-weight:600;">
          Tebrikler - kargoya hak kazandınız!
        </td>
      </tr>
    </table>`}

    ${Small('Sorularınız için bize yazın, yardımcı olalım.')}
  `, { preheader: `Sepetinizde ${cartItems.length} ürün bekliyor - toplam ${cartTotal.toLocaleString('tr-TR')} ₺`, title: 'Sepetiniz', unsubscribeEmail: userEmail });
}

// Email sending functions
export async function sendWelcomeEmail(user: User): Promise<EmailResult> {
  try {
    const transporter = await createTransporter();
    if (!transporter) {
      return { success: false, error: 'SMTP yapılandırması eksik' };
    }
    
    const settings = await storage.getSiteSettings();
    const fromEmail = settings.smtp_user || 'no-reply@sepetzen.com';
    
    const userName = user.firstName || 'Değerli Müşterimiz';
    
    await transporter.sendMail({
      from: `"Sepetzen" <${fromEmail}>`,
      to: user.email,
      subject: 'Sepetzen\'a Hoş Geldiniz!',
      html: welcomeEmailTemplate(userName),
    });
    
    console.log(`[Email] Welcome email sent to ${user.email}`);
    return { success: true };
  } catch (error: any) {
    console.error('[Email] Failed to send welcome email:', error);
    return { success: false, error: error.message };
  }
}

export async function sendOrderConfirmationEmail(order: Order, items: OrderItem[]): Promise<EmailResult> {
  try {
    const transporter = await createTransporter();
    if (!transporter) {
      return { success: false, error: 'SMTP yapılandırması eksik' };
    }
    
    const settings = await storage.getSiteSettings();
    const fromEmail = settings.smtp_user || 'no-reply@sepetzen.com';

    // Ürün görsellerini products tablosundan zenginleştir (thumbnail için)
    const enrichedItems: OrderItemForEmail[] = await Promise.all(
      items.map(async (item) => {
        if (!item.productId) return item;
        try {
          const product = await storage.getProduct(item.productId);
          const firstImage = product?.images && product.images.length > 0 ? product.images[0] : null;
          return { ...item, productImage: firstImage };
        } catch {
          return item;
        }
      })
    );

    await transporter.sendMail({
      from: `"Sepetzen" <${fromEmail}>`,
      to: order.customerEmail,
      subject: `Siparişiniz Alındı - #${order.orderNumber}`,
      html: orderConfirmationTemplate(order, enrichedItems),
    });
    
    console.log(`[Email] Order confirmation sent to ${order.customerEmail}`);
    return { success: true };
  } catch (error: any) {
    console.error('[Email] Failed to send order confirmation:', error);
    return { success: false, error: error.message };
  }
}

export async function sendPreparingNotificationEmail(order: Order): Promise<EmailResult> {
  try {
    const transporter = await createTransporter();
    if (!transporter) {
      return { success: false, error: 'SMTP yapılandırması eksik' };
    }
    
    const settings = await storage.getSiteSettings();
    const fromEmail = settings.smtp_user || 'no-reply@sepetzen.com';
    
    await transporter.sendMail({
      from: `"Sepetzen" <${fromEmail}>`,
      to: order.customerEmail,
      subject: `Siparişiniz Hazırlanıyor - #${order.orderNumber}`,
      html: preparingNotificationTemplate(order),
    });
    
    console.log(`[Email] Preparing notification sent to ${order.customerEmail}`);
    return { success: true };
  } catch (error: any) {
    console.error('[Email] Failed to send preparing notification:', error);
    return { success: false, error: error.message };
  }
}

export async function sendShippingNotificationEmail(order: Order): Promise<EmailResult> {
  try {
    const transporter = await createTransporter();
    if (!transporter) {
      return { success: false, error: 'SMTP yapılandırması eksik' };
    }
    
    const settings = await storage.getSiteSettings();
    const fromEmail = settings.smtp_user || 'no-reply@sepetzen.com';
    
    await transporter.sendMail({
      from: `"Sepetzen" <${fromEmail}>`,
      to: order.customerEmail,
      subject: `Siparişiniz Kargoya Verildi - #${order.orderNumber}`,
      html: shippingNotificationTemplate(order),
    });
    
    console.log(`[Email] Shipping notification sent to ${order.customerEmail}`);
    return { success: true };
  } catch (error: any) {
    console.error('[Email] Failed to send shipping notification:', error);
    return { success: false, error: error.message };
  }
}

export async function sendAdminOrderNotificationEmail(order: Order, items: OrderItem[]): Promise<EmailResult> {
  try {
    const transporter = await createTransporter();
    if (!transporter) {
      return { success: false, error: 'SMTP yapılandırması eksik' };
    }
    
    const settings = await storage.getSiteSettings();
    const fromEmail = settings.smtp_user || 'no-reply@sepetzen.com';
    const adminEmail = settings.admin_email;
    
    if (!adminEmail) {
      console.log('[Email] Admin email not configured');
      return { success: false, error: 'Admin e-posta adresi ayarlanmamış' };
    }

    const isBankTransfer = order.paymentMethod === 'bank_transfer';
    const subjectPrefix = isBankTransfer ? '[HAVALE - Onay Bekliyor] ' : '';
    const bankTransferAlert = isBankTransfer
      ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#fff3cd;border:2px solid #fdb51d;margin:0 0 18px 0;">
          <tr>
            <td style="padding:14px 18px;font-family:Helvetica,Arial,sans-serif;color:#1a1612;font-size:14px;font-weight:700;">
              ⚠️ ÖDEME YÖNTEMİ: HAVALE - Onay Bekliyor<br/>
              <span style="font-size:12px;font-weight:500;color:#52483a;">Hesap hareketlerini kontrol edip admin panelinden onaylayın.</span>
            </td>
          </tr>
        </table>`
      : '';

    let html = adminOrderNotificationTemplate(order, items);
    if (bankTransferAlert) {
      html = html.replace('${content}', '');
      html = html.replace(
        /(<td class="px-mobile"[^>]*>)\s*/,
        `$1${bankTransferAlert}`
      );
    }

    await transporter.sendMail({
      from: `"Sepetzen Sistem" <${fromEmail}>`,
      to: adminEmail,
      subject: `${subjectPrefix}Yeni Sipariş - #${order.orderNumber} - ${order.total}₺`,
      html,
    });
    
    console.log(`[Email] Admin notification sent to ${adminEmail}${isBankTransfer ? ' (BANK_TRANSFER)' : ''}`);
    return { success: true };
  } catch (error: any) {
    console.error('[Email] Failed to send admin notification:', error);
    return { success: false, error: error.message };
  }
}

// ─── Yorum bildirimleri ────────────────────────────────────────────────────

export interface AdminReviewNotificationPayload {
  productName: string;
  productSlug: string;
  authorName: string;
  authorEmail: string | null;
  rating: number;
  title: string | null;
  content: string | null;
  isGuest: boolean;
}

export async function sendAdminReviewNotificationEmail(
  payload: AdminReviewNotificationPayload,
): Promise<EmailResult> {
  try {
    const transporter = await createTransporter();
    if (!transporter) return { success: false, error: 'SMTP yapılandırması eksik' };

    const settings = await storage.getSiteSettings();
    const fromEmail = settings.smtp_user || 'no-reply@sepetzen.com';
    const adminEmail = settings.admin_email;
    if (!adminEmail) return { success: false, error: 'Admin e-posta adresi ayarlanmamış' };

    const stars = '★'.repeat(payload.rating) + '☆'.repeat(5 - payload.rating);
    const guestBadge = payload.isGuest
      ? `<span style="display:inline-block;background:${BRAND.primary};color:${BRAND.ink};font-size:10px;font-weight:700;padding:3px 8px;border-radius:3px;letter-spacing:1px;text-transform:uppercase;">Misafir</span>`
      : `<span style="display:inline-block;background:${BRAND.borderSoft};color:${BRAND.body};font-size:10px;font-weight:700;padding:3px 8px;border-radius:3px;letter-spacing:1px;text-transform:uppercase;">Üye</span>`;

    const adminUrl = `${CONTACT.siteUrl}/toov-admin?tab=reviews`;

    const html = wrapTemplate(`
      ${H1('Yeni yorum onay bekliyor.')}
      ${Lede(`<strong>${escapeHtml(payload.productName)}</strong> için yeni bir değerlendirme geldi. Yayınlanmadan önce admin panelinden onaylamanız gerekiyor.`)}

      ${infoCard(`
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td style="padding-bottom:10px;">${guestBadge}</td>
          </tr>
          <tr>
            <td style="padding-bottom:6px;font-size:13px;color:${BRAND.muted};">Yazan</td>
          </tr>
          <tr>
            <td style="padding-bottom:14px;font-size:15px;color:${BRAND.ink};font-weight:700;">
              ${escapeHtml(payload.authorName)}${payload.authorEmail ? `<br><span style="font-size:12px;font-weight:400;color:${BRAND.muted};">${escapeHtml(payload.authorEmail)}</span>` : ''}
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:6px;font-size:13px;color:${BRAND.muted};">Puan</td>
          </tr>
          <tr>
            <td style="padding-bottom:14px;font-size:18px;color:${BRAND.primary};letter-spacing:2px;">${stars} <span style="color:${BRAND.muted};font-size:13px;">(${payload.rating}/5)</span></td>
          </tr>
          ${payload.title ? `
          <tr>
            <td style="padding-bottom:6px;font-size:13px;color:${BRAND.muted};">Başlık</td>
          </tr>
          <tr>
            <td style="padding-bottom:14px;font-size:14px;color:${BRAND.ink};font-weight:600;">${escapeHtml(payload.title)}</td>
          </tr>` : ''}
          ${payload.content ? `
          <tr>
            <td style="padding-bottom:6px;font-size:13px;color:${BRAND.muted};">Yorum</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:${BRAND.body};line-height:1.6;font-style:italic;">"${escapeHtml(payload.content)}"</td>
          </tr>` : ''}
        </table>
      `)}

      ${emailButton(adminUrl, 'Admin Panelinde İncele')}
    `, {
      preheader: `Yeni yorum: ${payload.authorName} - ${payload.productName}`,
      title: 'Yeni yorum onay bekliyor',
    });

    await transporter.sendMail({
      from: `"Sepetzen Sistem" <${fromEmail}>`,
      to: adminEmail,
      subject: `Yeni yorum onay bekliyor - ${payload.productName}`,
      html,
    });

    console.log(`[Email] Review notification sent to ${adminEmail}`);
    return { success: true };
  } catch (error: any) {
    console.error('[Email] Failed to send review notification:', error);
    return { success: false, error: error.message };
  }
}

export interface GuestReviewApprovedPayload {
  to: string;
  guestName: string;
  productName: string;
  productSlug: string;
  rating: number;
}

export async function sendGuestReviewApprovedEmail(
  payload: GuestReviewApprovedPayload,
): Promise<EmailResult> {
  try {
    const transporter = await createTransporter();
    if (!transporter) return { success: false, error: 'SMTP yapılandırması eksik' };

    const settings = await storage.getSiteSettings();
    const fromEmail = settings.smtp_user || 'no-reply@sepetzen.com';

    const stars = '★'.repeat(payload.rating) + '☆'.repeat(5 - payload.rating);
    const productUrl = `${CONTACT.siteUrl}/urun/${payload.productSlug}`;

    const html = wrapTemplate(`
      ${H1('Yorumunuz yayında.')}
      ${Lede(`Merhaba ${escapeHtml(payload.guestName)}, <strong>${escapeHtml(payload.productName)}</strong> ürünü için yazdığınız değerlendirme onaylandı ve şimdi ürün sayfasında yayında. Düşünceleriniz için teşekkür ederiz.`)}

      ${infoCard(`
        <div style="text-align:center;font-size:24px;color:${BRAND.primary};letter-spacing:3px;padding:8px 0;">${stars}</div>
      `)}

      ${emailButton(productUrl, 'Ürün Sayfasını Gör')}

      ${Small('Sepetzen - kamp, outdoor ve bağ bahçe ürünlerinin güvenilir adresi.')}
    `, {
      preheader: `Yorumunuz yayında - ${payload.productName}`,
      title: 'Yorumunuz yayında',
    });

    await transporter.sendMail({
      from: `"Sepetzen" <${fromEmail}>`,
      to: payload.to,
      subject: `Yorumunuz yayında - ${payload.productName}`,
      html,
    });

    console.log(`[Email] Guest review approved email sent to ${payload.to}`);
    return { success: true };
  } catch (error: any) {
    console.error('[Email] Failed to send guest review approved:', error);
    return { success: false, error: error.message };
  }
}

export interface GuestReviewRejectedPayload {
  to: string;
  guestName: string;
  productName: string;
  reason: string;
}

export async function sendGuestReviewRejectedEmail(
  payload: GuestReviewRejectedPayload,
): Promise<EmailResult> {
  try {
    const transporter = await createTransporter();
    if (!transporter) return { success: false, error: 'SMTP yapılandırması eksik' };

    const settings = await storage.getSiteSettings();
    const fromEmail = settings.smtp_user || 'no-reply@sepetzen.com';

    const html = wrapTemplate(`
      ${H1('Yorumunuz onaylanmadı.')}
      ${Lede(`Merhaba ${escapeHtml(payload.guestName)}, <strong>${escapeHtml(payload.productName)}</strong> ürünü için gönderdiğiniz değerlendirme aşağıdaki gerekçeyle yayınlanmadı. Yeni bir yorum göndermekten çekinmeyin.`)}

      ${infoCard(`
        <p style="margin:0 0 6px 0;font-size:12px;font-weight:700;color:#7c2d12;text-transform:uppercase;letter-spacing:0.05em;">Gerekçe</p>
        <p style="margin:0;font-size:14px;color:#1f2937;line-height:1.5;">${escapeHtml(payload.reason)}</p>
      `)}

      ${Small('Sepetzen - kamp, outdoor ve bağ bahçe ürünlerinin güvenilir adresi.')}
    `, {
      preheader: `Yorumunuz onaylanmadı - ${payload.productName}`,
      title: 'Yorumunuz onaylanmadı',
    });

    await transporter.sendMail({
      from: `"Sepetzen" <${fromEmail}>`,
      to: payload.to,
      subject: `Yorumunuz onaylanmadı - ${payload.productName}`,
      html,
    });

    console.log(`[Email] Guest review rejected email sent to ${payload.to}`);
    return { success: true };
  } catch (error: any) {
    console.error('[Email] Failed to send guest review rejected:', error);
    return { success: false, error: error.message };
  }
}

export async function sendBankTransferPendingEmail(order: Order, items: OrderItem[]): Promise<EmailResult> {
  try {
    const transporter = await createTransporter();
    if (!transporter) {
      return { success: false, error: 'SMTP yapılandırması eksik' };
    }

    const settings = await storage.getSiteSettings();
    const fromEmail = settings.smtp_user || 'no-reply@sepetzen.com';

    const enrichedItems: OrderItemForEmail[] = await Promise.all(
      items.map(async (item) => {
        if (!item.productId) return item;
        try {
          const product = await storage.getProduct(item.productId);
          const firstImage = product?.images && product.images.length > 0 ? product.images[0] : null;
          return { ...item, productImage: firstImage };
        } catch {
          return item;
        }
      })
    );

    await transporter.sendMail({
      from: `"Sepetzen" <${fromEmail}>`,
      to: order.customerEmail,
      subject: `Havalenizi Bekliyoruz - #${order.orderNumber}`,
      html: bankTransferPendingTemplate(order, enrichedItems),
    });

    console.log(`[Email] Bank transfer pending email sent to ${order.customerEmail}`);
    return { success: true };
  } catch (error: any) {
    console.error('[Email] Failed to send bank transfer pending email:', error);
    return { success: false, error: error.message };
  }
}

export async function sendPasswordResetEmail(user: User, resetToken: string): Promise<EmailResult> {
  try {
    const transporter = await createTransporter();
    if (!transporter) {
      return { success: false, error: 'SMTP yapılandırması eksik' };
    }
    
    const settings = await storage.getSiteSettings();
    const fromEmail = settings.smtp_user || 'no-reply@sepetzen.com';
    const siteUrl = settings.site_url || 'https://sepetzen.com';
    
    const resetLink = `${siteUrl}/sifre-sifirla?token=${resetToken}`;
    const userName = user.firstName || 'Değerli Müşterimiz';
    
    await transporter.sendMail({
      from: `"Sepetzen" <${fromEmail}>`,
      to: user.email,
      subject: 'Şifre Sıfırlama Talebi',
      html: passwordResetTemplate(userName, resetLink),
    });
    
    console.log(`[Email] Password reset email sent to ${user.email}`);
    return { success: true };
  } catch (error: any) {
    console.error('[Email] Failed to send password reset email:', error);
    return { success: false, error: error.message };
  }
}

export async function sendReviewRequestEmail(
  userEmail: string,
  userName: string,
  orderNumber: string,
  products: string[]
): Promise<EmailResult> {
  try {
    const transporter = await createTransporter();
    if (!transporter) {
      return { success: false, error: 'SMTP yapılandırması eksik' };
    }
    
    const settings = await storage.getSiteSettings();
    const fromEmail = settings.smtp_user || 'no-reply@sepetzen.com';
    
    await transporter.sendMail({
      from: `"Sepetzen" <${fromEmail}>`,
      to: userEmail,
      subject: 'Deneyiminizi Paylaşın',
      html: reviewRequestTemplate(userName, orderNumber, products, userEmail),
    });
    
    console.log(`[Email] Review request sent to ${userEmail}`);
    return { success: true };
  } catch (error: any) {
    console.error('[Email] Failed to send review request:', error);
    return { success: false, error: error.message };
  }
}

export async function sendTestEmail(toEmail: string): Promise<EmailResult> {
  try {
    const transporter = await createTransporter();
    if (!transporter) {
      return { success: false, error: 'SMTP yapılandırması eksik' };
    }
    
    const settings = await storage.getSiteSettings();
    const fromEmail = settings.smtp_user || 'no-reply@sepetzen.com';
    
    await transporter.sendMail({
      from: `"Sepetzen" <${fromEmail}>`,
      to: toEmail,
      subject: 'Sepetzen - Test E-postası',
      html: wrapTemplate(`
        ${H1('Test e-postası.')}
        ${Lede('Bu bir test e-postasıdır. SMTP ayarlarınız başarıyla yapılandırıldı.')}
        ${infoCard(`
          <div style="font-family:Helvetica,Arial,sans-serif;color:${BRAND.ink};font-size:14px;font-weight:600;">
            <span style="display:inline-block;width:8px;height:8px;background:${BRAND.primary};border-radius:50%;margin-right:10px;vertical-align:middle;"></span>
            E-posta sistemi çalışıyor.
          </div>
        `)}
      `, { preheader: 'SMTP test e-postası - sistem çalışıyor', title: 'Test E-postası' }),
    });
    
    console.log(`[Email] Test email sent to ${toEmail}`);
    return { success: true };
  } catch (error: any) {
    console.error('[Email] Failed to send test email:', error);
    return { success: false, error: error.message };
  }
}

export async function sendAbandonedCartEmail(
  userEmail: string,
  userName: string,
  cartItems: CartItem[],
  cartTotal: number
): Promise<EmailResult> {
  try {
    const transporter = await createTransporter();
    if (!transporter) {
      return { success: false, error: 'SMTP yapılandırması eksik' };
    }
    
    const settings = await storage.getSiteSettings();
    const fromEmail = settings.smtp_user || 'no-reply@sepetzen.com';
    const siteUrl = settings.site_url || 'https://sepetzen.com';
    
    await transporter.sendMail({
      from: `"Sepetzen" <${fromEmail}>`,
      to: userEmail,
      subject: 'Sepetiniz Sizi Bekliyor! 🛒',
      html: abandonedCartTemplate(userName, cartItems, cartTotal, siteUrl, userEmail),
    });
    
    console.log(`[Email] Abandoned cart reminder sent to ${userEmail}`);
    return { success: true };
  } catch (error: any) {
    console.error('[Email] Failed to send abandoned cart email:', error);
    return { success: false, error: error.message };
  }
}

// Quote Email Template
interface QuoteEmailData {
  quoteNumber: string;
  dealerName: string;
  contactPerson: string | null;
  validUntil: Date | null;
  grandTotal: string;
  itemCount: number;
}

function quoteEmailTemplate(data: QuoteEmailData): string {
  const validUntilText = data.validUntil
    ? new Date(data.validUntil).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Belirtilmemiş';
  const grandTotalFormatted = parseFloat(data.grandTotal).toLocaleString('tr-TR', { minimumFractionDigits: 2 });
  const recipient = escapeHtml(data.contactPerson || data.dealerName);

  return wrapTemplate(`
    ${H1('Teklifiniz hazır.')}
    ${P(`Sayın ${recipient},`)}
    ${Lede('Size özel hazırladığımız teklifi e-postanın ekinde PDF olarak bulabilirsiniz. Aşağıda özet bilgileri yer alıyor.')}

    ${infoCard(`
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td class="stack-col" style="vertical-align:top;width:50%;padding-bottom:14px;">
            <div style="font-size:11px;color:${BRAND.muted};letter-spacing:1.5px;text-transform:uppercase;font-weight:600;">Teklif No</div>
            <div style="font-size:16px;color:${BRAND.ink};font-weight:700;margin-top:4px;font-family:'Courier New',monospace;">${escapeHtml(data.quoteNumber)}</div>
          </td>
          <td class="stack-col" align="right" style="vertical-align:top;width:50%;padding-bottom:14px;">
            <div style="font-size:11px;color:${BRAND.muted};letter-spacing:1.5px;text-transform:uppercase;font-weight:600;">Geçerlilik</div>
            <div style="font-size:14px;color:${BRAND.ink};font-weight:600;margin-top:4px;">${escapeHtml(validUntilText)}</div>
          </td>
        </tr>
        <tr>
          <td colspan="2" style="border-top:1px solid ${BRAND.borderSoft};padding-top:14px;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
              <tr>
                <td style="font-size:11px;color:${BRAND.muted};letter-spacing:1.5px;text-transform:uppercase;font-weight:600;">Ürün Adedi</td>
                <td align="right" style="font-size:14px;color:${BRAND.ink};font-weight:700;">${escapeHtml(data.itemCount)} ürün</td>
              </tr>
              <tr>
                <td style="padding-top:10px;font-size:13px;color:${BRAND.body};font-weight:600;">Toplam Tutar</td>
                <td align="right" style="padding-top:10px;font-size:20px;color:${BRAND.primaryDeep};font-weight:800;">${grandTotalFormatted}&nbsp;TL</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `)}

    ${P('Teklif hakkında sorunuz varsa veya değişiklik talep etmek isterseniz lütfen bizimle iletişime geçin.')}

    ${emailButton(CONTACT.siteUrl, 'Web Sitemizi Ziyaret Edin')}

    ${Small('Bizi tercih ettiğiniz için teşekkür ederiz - Sepetzen Ekibi')}
  `, { preheader: `Teklif ${data.quoteNumber} hazır - toplam ${grandTotalFormatted} TL`, title: `Teklif ${data.quoteNumber}` });
}

export async function sendQuoteEmail(
  dealerEmail: string,
  quoteData: QuoteEmailData,
  pdfBuffer: Buffer
): Promise<EmailResult> {
  try {
    const transporter = await createTransporter();
    if (!transporter) {
      return { success: false, error: 'SMTP yapılandırması eksik' };
    }
    
    const settings = await storage.getSiteSettings();
    const fromEmail = settings.smtp_user || 'no-reply@sepetzen.com';
    
    await transporter.sendMail({
      from: `"Sepetzen B2B" <${fromEmail}>`,
      to: dealerEmail,
      subject: `Sepetzen Teklif - ${quoteData.quoteNumber}`,
      html: quoteEmailTemplate(quoteData),
      attachments: [
        {
          filename: `Teklif-${quoteData.quoteNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    });
    
    console.log(`[Email] Quote sent to ${dealerEmail}`);
    return { success: true };
  } catch (error: any) {
    console.error('[Email] Failed to send quote email:', error);
    return { success: false, error: error.message };
  }
}
