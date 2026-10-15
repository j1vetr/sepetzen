/**
 * Sepetzen e-posta şablonları.
 *
 * Tasarım mağaza vitrini ile aynı dilde: koyu monokrom zemin, beyaz yazı, ince çizgiler,
 * geniş harf aralıklı küçük başlıklar ve düz beyaz düğmeler.
 * Outlook, Gmail ve Apple Mail uyumu için tablo tabanlı ve satır içi stillidir.
 */

import type { Order, OrderItem } from '@shared/schema';
import type { BillingAddress } from '@shared/billing';
import { BANK_TRANSFER_INFO } from '@shared/bankInfo';
import { formatTRDateTime } from '@shared/dateFormat';
import { storage } from './storage';
import { getAdminPath } from './adminPath';

// ─── Marka ve iletişim bilgileri ────────────────────────────────────────────

const BRAND = {
  bg: '#050505',
  card: '#0F0F0F',
  panel: '#161616',
  line: '#262626',
  lineSoft: '#1D1D1D',
  ink: '#FFFFFF',
  body: '#B8B8B8',
  muted: '#7A7A7A',
};

const FONT = `Helvetica,Arial,sans-serif`;
const MONO = `'Courier New',Courier,monospace`;

let SITE = {
  name: 'Sepetzen',
  url: 'https://sepetzen.com',
  email: '',
  phoneDisplay: '',
  phoneTel: '',
  addressLine1: '',
  addressLine2: '',
  logoUrl: '',
  logoWidth: 190,
  adminPath: 'toov-admin',
};

const trUpper = (s: string) => s.toLocaleUpperCase('tr-TR');

/** Admin ayarlarını okuyup marka bilgisini günceller. Her gönderimden önce çağrılır. */
export async function refreshEmailBranding(): Promise<void> {
  const s = await storage.getSiteSettings();
  const url = (s.email_site_url || s.site_url || 'https://sepetzen.com').trim().replace(/\/+$/, '');
  const phoneDisplay = s.email_phone_display || s.site_phone || s.contact_phone || '';
  const phoneTel = s.email_phone_tel || phoneDisplay.replace(/[^\d+]/g, '');
  const rawLogo = (s.email_logo_url || '').trim();
  const logoUrl = rawLogo
    ? (/^https?:\/\//i.test(rawLogo) ? rawLogo : `${url}${rawLogo.startsWith('/') ? '' : '/'}${rawLogo}`)
    : `${url}/uploads/branding/sepetzen-logo-white.png`;
  const width = parseInt(s.email_logo_width || '', 10);

  SITE = {
    name: s.email_brand_name || s.site_name || 'Sepetzen',
    url,
    email: s.email_contact_email || s.contact_email || '',
    phoneDisplay,
    phoneTel,
    addressLine1: s.email_address_line1 || s.site_address || '',
    addressLine2: s.email_address_line2 || '',
    logoUrl,
    logoWidth: Number.isFinite(width) && width > 0 && width <= 400 ? width : 190,
    adminPath: await getAdminPath(),
  };
}

export function emailSiteUrl(): string {
  return SITE.url;
}

// ─── Yardımcılar ────────────────────────────────────────────────────────────

export function escapeHtml(s: string | number | undefined | null): string {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const tl = (v: string | number) => `${escapeHtml(v)}&nbsp;₺`;

function label(text: string): string {
  return `<div style="font-family:${FONT};font-size:10px;line-height:1.4;letter-spacing:2px;color:${BRAND.muted};font-weight:600;">${escapeHtml(trUpper(text))}</div>`;
}

function layout(content: string, opts: { preheader?: string; title?: string; unsubscribeEmail?: string } = {}): string {
  const contactLines = [
    SITE.phoneDisplay
      ? `<a href="tel:${escapeHtml(SITE.phoneTel)}" style="color:${BRAND.body};text-decoration:none;">${escapeHtml(SITE.phoneDisplay)}</a>`
      : '',
    SITE.email
      ? `<a href="mailto:${escapeHtml(SITE.email)}" style="color:${BRAND.body};text-decoration:none;">${escapeHtml(SITE.email)}</a>`
      : '',
  ].filter(Boolean).join(`&nbsp;&nbsp;·&nbsp;&nbsp;`);
  const address = [SITE.addressLine1, SITE.addressLine2].filter(Boolean).map(escapeHtml).join(', ');
  const unsub = opts.unsubscribeEmail
    ? `<div style="padding-top:14px;font-size:11px;line-height:1.7;color:${BRAND.muted};">
         Bu e-postayı ${escapeHtml(opts.unsubscribeEmail)} adresine gönderdik.
         <a href="mailto:${escapeHtml(SITE.email)}?subject=${encodeURIComponent('Abonelik İptali')}&body=${encodeURIComponent(`Lütfen ${opts.unsubscribeEmail} adresini pazarlama e-posta listesinden çıkarın.`)}" style="color:${BRAND.body};text-decoration:underline;">Abonelikten çık</a>
       </div>`
    : '';

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="tr">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${escapeHtml(opts.title ?? SITE.name)}</title>
<style type="text/css">
  body, table, td, a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
  table, td { mso-table-lspace:0pt; mso-table-rspace:0pt; }
  img { -ms-interpolation-mode:bicubic; border:0; outline:none; text-decoration:none; }
  body { margin:0 !important; padding:0 !important; width:100% !important; background-color:${BRAND.bg}; }
  @media screen and (max-width: 620px) {
    .container { width:100% !important; max-width:100% !important; }
    .px-mobile { padding-left:22px !important; padding-right:22px !important; }
    .stack-col { display:block !important; width:100% !important; padding-bottom:14px !important; text-align:left !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.bg};font-family:${FONT};color:${BRAND.body};">
<div style="display:none;font-size:1px;color:${BRAND.bg};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${escapeHtml(opts.preheader ?? '')}</div>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:${BRAND.bg};">
  <tr>
    <td align="center" style="padding:32px 12px 40px 12px;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="container" style="max-width:600px;width:100%;background-color:${BRAND.card};border:1px solid ${BRAND.line};">
        <tr>
          <td align="center" style="padding:34px 30px 26px 30px;border-bottom:1px solid ${BRAND.line};">
            <a href="${escapeHtml(SITE.url)}" style="text-decoration:none;">
              <img src="${escapeHtml(SITE.logoUrl)}" alt="${escapeHtml(SITE.name)}" width="${SITE.logoWidth}" style="display:block;width:${SITE.logoWidth}px;height:auto;max-width:${SITE.logoWidth}px;border:0;margin:0 auto;font-family:${FONT};font-size:20px;font-weight:700;letter-spacing:6px;color:#ffffff;" />
            </a>
          </td>
        </tr>
        <tr>
          <td class="px-mobile" style="padding:40px 44px 36px 44px;font-family:${FONT};color:${BRAND.body};">
            ${content}
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:26px 30px 30px 30px;border-top:1px solid ${BRAND.line};background-color:${BRAND.bg};font-family:${FONT};">
            <div style="font-size:12px;line-height:1.8;color:${BRAND.muted};">${contactLines}</div>
            ${address ? `<div style="padding-top:6px;font-size:11px;line-height:1.7;color:${BRAND.muted};">${address}</div>` : ''}
            <div style="padding-top:14px;font-size:10px;letter-spacing:2.5px;color:${BRAND.muted};">${escapeHtml(trUpper(SITE.name))}</div>
            ${unsub}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

const H1 = (text: string) =>
  `<h1 style="margin:0 0 14px 0;font-family:${FONT};color:${BRAND.ink};font-size:28px;font-weight:700;line-height:1.2;letter-spacing:-0.5px;">${text}</h1>`;
const Lede = (text: string) =>
  `<p style="margin:0 0 26px 0;font-family:${FONT};color:${BRAND.body};font-size:15px;line-height:1.75;">${text}</p>`;
const P = (text: string, color?: string) =>
  `<p style="margin:0 0 14px 0;font-family:${FONT};color:${color ?? BRAND.body};font-size:14px;line-height:1.75;">${text}</p>`;
const Note = (text: string) =>
  `<p style="margin:26px 0 0 0;padding-top:20px;border-top:1px solid ${BRAND.line};font-family:${FONT};color:${BRAND.muted};font-size:12px;line-height:1.7;text-align:center;">${text}</p>`;
const link = (href: string, text: string) =>
  `<a href="${escapeHtml(href)}" style="color:${BRAND.ink};text-decoration:underline;">${text}</a>`;

function button(href: string, text: string): string {
  return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:30px auto;">
  <tr>
    <td align="center" bgcolor="#FFFFFF" style="background-color:#FFFFFF;">
      <a href="${escapeHtml(href)}" style="background-color:#FFFFFF;color:#000000;display:inline-block;font-family:${FONT};font-size:12px;font-weight:700;line-height:50px;text-align:center;text-decoration:none;width:270px;letter-spacing:2px;-webkit-text-size-adjust:none;">${escapeHtml(trUpper(text))}</a>
    </td>
  </tr>
</table>`;
}

function panel(inner: string, opts: { padding?: string } = {}): string {
  return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:${BRAND.panel};border:1px solid ${BRAND.line};margin:18px 0;">
  <tr>
    <td style="padding:${opts.padding ?? '20px 24px'};font-family:${FONT};color:${BRAND.body};font-size:14px;line-height:1.7;">
      ${inner}
    </td>
  </tr>
</table>`;
}

function highlight(caption: string, value: string, sub?: string): string {
  return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#000000;border:1px solid ${BRAND.line};margin:22px 0;">
  <tr>
    <td align="center" style="padding:28px 24px;font-family:${FONT};">
      ${label(caption)}
      <div style="font-size:26px;line-height:1.3;color:${BRAND.ink};font-weight:700;margin-top:12px;letter-spacing:1px;font-family:${MONO};">${value}</div>
      ${sub ? `<div style="font-size:11px;letter-spacing:2px;color:${BRAND.muted};margin-top:8px;">${escapeHtml(trUpper(sub))}</div>` : ''}
    </td>
  </tr>
</table>`;
}

function sectionTitle(text: string): string {
  return `<div style="margin:34px 0 4px 0;padding-bottom:10px;border-bottom:1px solid ${BRAND.line};font-family:${FONT};font-size:10px;font-weight:700;letter-spacing:2.5px;color:${BRAND.ink};">${escapeHtml(trUpper(text))}</div>`;
}

function divider(): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"><tr><td style="border-top:1px solid ${BRAND.line};font-size:0;line-height:0;height:1px;">&nbsp;</td></tr></table>`;
}

/** İki sütunlu bilgi satırı (etiket üstte, değer altta). */
function metaRow(cells: Array<{ caption: string; value: string; mono?: boolean; align?: 'left' | 'right' }>): string {
  const width = Math.floor(100 / cells.length);
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"><tr>${cells
    .map(
      (c) => `<td class="stack-col" valign="top" align="${c.align ?? 'left'}" style="width:${width}%;">
        ${label(c.caption)}
        <div style="font-family:${c.mono ? MONO : FONT};font-size:${c.mono ? 17 : 14}px;color:${BRAND.ink};font-weight:700;margin-top:6px;">${c.value}</div>
      </td>`,
    )
    .join('')}</tr></table>`;
}

function kvRows(rows: Array<{ k: string; v: string; mono?: boolean }>): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">${rows
    .map(
      (r) => `<tr>
        <td valign="top" style="padding:8px 0;width:36%;font-family:${FONT};font-size:10px;letter-spacing:1.8px;color:${BRAND.muted};font-weight:600;">${escapeHtml(trUpper(r.k))}</td>
        <td valign="top" style="padding:8px 0;font-family:${r.mono ? MONO : FONT};font-size:14px;color:${BRAND.ink};font-weight:600;word-break:break-all;">${r.v}</td>
      </tr>`,
    )
    .join('')}</table>`;
}

function bulletList(items: string[]): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">${items
    .map(
      (i) => `<tr>
        <td valign="top" width="18" style="padding:7px 0;font-family:${FONT};color:${BRAND.muted};font-size:14px;">&ndash;</td>
        <td style="padding:7px 0;font-family:${FONT};font-size:14px;color:${BRAND.body};line-height:1.6;">${i}</td>
      </tr>`,
    )
    .join('')}</table>`;
}

function stars(rating: number): string {
  return '★'.repeat(rating) + '☆'.repeat(Math.max(0, 5 - rating));
}

// ─── Sipariş bileşenleri ────────────────────────────────────────────────────

export type OrderItemForEmail = OrderItem & { productImage?: string | null };

function personalizationRow(item: OrderItem): string {
  if (!item.personalizationText) return '';
  const fee = item.personalizationFee && parseFloat(item.personalizationFee) > 0 ? ` (+${escapeHtml(item.personalizationFee)} ₺)` : '';
  return `<div style="font-family:${FONT};color:${BRAND.muted};font-size:12px;line-height:1.5;margin-top:3px;">Kişiselleştirme: &ldquo;${escapeHtml(item.personalizationText)}&rdquo;${fee}</div>`;
}

function itemRows(items: OrderItemForEmail[]): string {
  return items
    .map((item) => {
      const thumb = item.productImage
        ? `<td width="68" valign="top" style="padding:16px 14px 16px 0;border-bottom:1px solid ${BRAND.line};">
            <img src="${escapeHtml(item.productImage)}" alt="${escapeHtml(item.productName)}" width="68" height="68" style="display:block;width:68px;height:68px;border:1px solid ${BRAND.line};object-fit:cover;" />
          </td>`
        : '';
      return `<tr>
        ${thumb}
        <td valign="top" style="padding:16px 0;border-bottom:1px solid ${BRAND.line};">
          <div style="font-family:${FONT};color:${BRAND.ink};font-size:14px;font-weight:600;line-height:1.4;">${escapeHtml(item.productName)}</div>
          ${item.variantDetails ? `<div style="font-family:${FONT};color:${BRAND.muted};font-size:12px;line-height:1.5;margin-top:3px;">${escapeHtml(item.variantDetails)}</div>` : ''}
          ${personalizationRow(item)}
          <div style="font-family:${FONT};color:${BRAND.muted};font-size:12px;line-height:1.5;margin-top:3px;">Adet: ${escapeHtml(item.quantity)}</div>
        </td>
        <td align="right" valign="top" style="padding:16px 0;border-bottom:1px solid ${BRAND.line};font-family:${FONT};color:${BRAND.ink};font-size:14px;font-weight:700;white-space:nowrap;">${tl(item.subtotal)}</td>
      </tr>`;
    })
    .join('');
}

function shippingLabel(order: Order): string {
  if (order.shippingPayment === 'receiver') return 'Alıcı Ödemeli';
  return parseFloat(order.shippingCost) === 0 ? 'Ücretsiz' : tl(order.shippingCost);
}

function totalsTable(order: Order, totalCaption: string, discountCaption = 'İndirim'): string {
  const row = (k: string, v: string, strong = false) => `<tr>
    <td style="padding:8px 0;font-family:${FONT};color:${BRAND.body};font-size:13px;">${k}</td>
    <td align="right" style="padding:8px 0;font-family:${FONT};color:${BRAND.ink};font-size:13px;font-weight:${strong ? 700 : 600};white-space:nowrap;">${v}</td>
  </tr>`;
  const hasDiscount = order.discountAmount && parseFloat(order.discountAmount) > 0;
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top:12px;">
    ${row('Ara Toplam', tl(order.subtotal))}
    ${row('Kargo', shippingLabel(order))}
    ${hasDiscount ? row(discountCaption, `&minus;${tl(order.discountAmount as string)}`) : ''}
    <tr>
      <td style="padding:16px 0 0 0;border-top:1px solid ${BRAND.ink};font-family:${FONT};color:${BRAND.ink};font-size:12px;font-weight:700;letter-spacing:2px;">${escapeHtml(trUpper(totalCaption))}</td>
      <td align="right" style="padding:16px 0 0 0;border-top:1px solid ${BRAND.ink};font-family:${FONT};color:${BRAND.ink};font-size:20px;font-weight:700;white-space:nowrap;">${tl(order.total)}</td>
    </tr>
  </table>`;
}

type ShippingAddr = { address: string; city: string; district: string; postalCode: string };

function billingBlock(billing: BillingAddress | null | undefined, shipping: ShippingAddr): string {
  if (!billing) return '';
  const same = billing.address === shipping.address && billing.city === shipping.city && billing.district === shipping.district;
  const line = (t: string) => `<div style="font-size:13px;color:${BRAND.body};line-height:1.6;">${t}</div>`;
  let lines = '';
  if (billing.invoiceType === 'corporate') {
    if (billing.companyName) lines += line(`Firma: <strong style="color:${BRAND.ink};">${escapeHtml(billing.companyName)}</strong>`);
    if (billing.taxOffice) lines += line(`Vergi Dairesi: ${escapeHtml(billing.taxOffice)}`);
    if (billing.taxNumber) lines += line(`VKN: ${escapeHtml(billing.taxNumber)}`);
  } else if (billing.tcknNumber) {
    lines += line(`TCKN: ${escapeHtml(billing.tcknNumber)}`);
  }
  lines += same
    ? `<div style="font-size:13px;color:${BRAND.muted};line-height:1.6;">Teslimat adresi ile aynı</div>`
    : line(escapeHtml(billing.address)) + line(`${escapeHtml(billing.district)}, ${escapeHtml(billing.city)} ${escapeHtml(billing.postalCode)}`);
  const type = billing.invoiceType === 'corporate' ? 'Kurumsal' : 'Bireysel';
  return `<div style="margin-bottom:6px;">${label(`Fatura Bilgileri (${type})`)}</div>${lines}`;
}

// ─── Müşteri şablonları ─────────────────────────────────────────────────────

export function welcomeEmailTemplate(userName: string): string {
  const name = escapeHtml(userName);
  return layout(
    `
    ${H1(`Hoş geldiniz, ${name}.`)}
    ${Lede('Hesabınız hazır. Kamp, outdoor ve bahçe ürünlerini inceleyebilir, siparişlerinizi ve favorilerinizi hesabınızdan takip edebilirsiniz.')}
    ${panel(`
      <div style="margin-bottom:8px;">${label('Hesabınızla')}</div>
      ${bulletList([
        'Siparişlerinizi ve kargo durumunu görüntüleyin',
        'Adreslerinizi kaydedip ödemeyi hızlandırın',
        'Favori ürünlerinizi listeleyin',
      ])}
    `)}
    ${button(SITE.url, 'Alışverişe Başla')}
    ${SITE.email ? Note(`Sorularınız için ${link(`mailto:${SITE.email}`, escapeHtml(SITE.email))} adresine yazabilirsiniz.`) : ''}
  `,
    { preheader: `Hoş geldiniz ${userName}, hesabınız hazır.`, title: 'Hoş geldiniz' },
  );
}

export function orderConfirmationTemplate(order: Order, items: OrderItemForEmail[]): string {
  const shipping = order.shippingAddress as ShippingAddr;
  const billing = billingBlock(order.billingAddress as BillingAddress | null | undefined, shipping);
  const trackingUrl = `${SITE.url}/siparis-takip?no=${encodeURIComponent(order.orderNumber)}`;
  const receiverNote = order.shippingPayment === 'receiver'
    ? P('Kargo ücretini teslimat sırasında kargo firmasına ödeyeceksiniz.', BRAND.body)
    : '';

  return layout(
    `
    ${H1('Siparişiniz alındı.')}
    ${Lede(`Teşekkürler ${escapeHtml(order.customerName)}, siparişiniz oluşturuldu. Hazırlanmaya başlandığında size yeniden yazacağız.`)}
    ${panel(metaRow([
      { caption: 'Sipariş No', value: `#${escapeHtml(order.orderNumber)}`, mono: true },
      { caption: 'Tarih', value: formatTRDateTime(order.createdAt), align: 'right' },
    ]))}
    ${receiverNote}
    ${button(trackingUrl, 'Siparişimi Takip Et')}
    ${sectionTitle('Sipariş İçeriği')}
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">${itemRows(items)}</table>
    ${totalsTable(order, 'Toplam')}
    ${sectionTitle('Teslimat Adresi')}
    ${panel(`
      <div style="font-size:14px;color:${BRAND.ink};font-weight:600;margin-bottom:6px;">${escapeHtml(order.customerName)}</div>
      <div style="font-size:13px;line-height:1.6;">${escapeHtml(shipping.address)}</div>
      <div style="font-size:13px;line-height:1.6;">${escapeHtml(shipping.district)}, ${escapeHtml(shipping.city)} ${escapeHtml(shipping.postalCode)}</div>
      <div style="font-size:13px;margin-top:8px;">${escapeHtml(order.customerPhone)}</div>
      ${billing ? `<div style="margin:14px 0;">${divider()}</div>${billing}` : ''}
    `)}
  `,
    { preheader: `Sipariş #${order.orderNumber} alındı, toplam ${order.total} ₺`, title: `Sipariş #${order.orderNumber}` },
  );
}

export function preparingNotificationTemplate(order: Order): string {
  const trackingUrl = `${SITE.url}/siparis-takip?no=${encodeURIComponent(order.orderNumber)}`;
  return layout(
    `
    ${H1('Siparişiniz hazırlanıyor.')}
    ${Lede('Siparişiniz şu anda hazırlanıyor. Kargoya verildiğinde takip numaranızı paylaşacağız.')}
    ${panel(metaRow([
      { caption: 'Sipariş No', value: `#${escapeHtml(order.orderNumber)}`, mono: true },
      { caption: 'Toplam', value: tl(order.total), align: 'right' },
    ]))}
    ${highlight('Tahmini kargo süresi', '1 - 2 iş günü')}
    ${button(trackingUrl, 'Siparişimi Takip Et')}
    ${Note('Siparişiniz kargoya verildiğinde tekrar bilgi vereceğiz.')}
  `,
    { preheader: `#${order.orderNumber} hazırlanıyor, 1 - 2 iş günü içinde kargoda`, title: 'Sipariş Hazırlanıyor' },
  );
}

export function shippingNotificationTemplate(order: Order): string {
  const carrier = order.shippingCarrier || 'Kargo';
  const fallback = order.trackingNumber && /aras/i.test(carrier)
    ? `https://kargotakip.araskargo.com.tr/mainpage.aspx?code=${encodeURIComponent(order.trackingNumber)}`
    : `${SITE.url}/siparis-takip?no=${encodeURIComponent(order.orderNumber)}`;
  const trackingUrl = order.trackingUrl || fallback;
  const receiverNote = order.shippingPayment === 'receiver'
    ? P('Bu gönderi alıcı ödemelidir. Kargo ücretini teslimat sırasında kargo firmasına ödeyeceksiniz.')
    : '';

  return layout(
    `
    ${H1('Kargoya verildi.')}
    ${Lede('Siparişiniz paketlendi ve kargo firmasına teslim edildi. Takip numarasıyla her aşamayı izleyebilirsiniz.')}
    ${highlight('Kargo takip numarası', escapeHtml(order.trackingNumber || 'Henüz belirlenmedi'), carrier)}
    ${receiverNote}
    ${button(trackingUrl, 'Kargomu Takip Et')}
    ${panel(metaRow([
      { caption: 'Sipariş No', value: `#${escapeHtml(order.orderNumber)}`, mono: true },
      { caption: 'Toplam', value: tl(order.total), align: 'right' },
    ]))}
    ${SITE.phoneDisplay ? Note(`Kargo süresince sorularınız için ${link(`tel:${SITE.phoneTel}`, escapeHtml(SITE.phoneDisplay))}`) : ''}
  `,
    { preheader: `#${order.orderNumber} kargoda, takip: ${order.trackingNumber || 'yakında'}`, title: 'Kargoya Verildi' },
  );
}

export interface BankInfoForEmail {
  bankName: string;
  accountHolder: string;
  iban: string;
  discountPercent: number;
}

export function bankTransferPendingTemplate(
  order: Order,
  items: OrderItemForEmail[],
  bank: BankInfoForEmail = { ...BANK_TRANSFER_INFO, discountPercent: 10 },
): string {
  const trackingUrl = `${SITE.url}/siparis-takip?no=${encodeURIComponent(order.orderNumber)}`;
  const discountCaption = order.couponCode ? `İndirim (${escapeHtml(order.couponCode)})` : 'İndirim (Havale)';
  return layout(
    `
    ${H1('Havalenizi bekliyoruz.')}
    ${Lede(`Teşekkürler ${escapeHtml(order.customerName)}, siparişiniz oluşturuldu. Ödemenizi aşağıdaki ${escapeHtml(bank.bankName)} hesabına gönderdiğinizde sipariş hazırlığa alınacak.`)}
    ${panel(metaRow([
      { caption: 'Sipariş No', value: `#${escapeHtml(order.orderNumber)}`, mono: true },
      { caption: 'Tarih', value: formatTRDateTime(order.createdAt), align: 'right' },
    ]))}
    ${highlight(`Havale indirimi uygulandı (%${bank.discountPercent})`, tl(order.total), 'Ödenecek tutar')}
    ${sectionTitle('Banka Bilgileri')}
    ${panel(kvRows([
      { k: 'Banka', v: escapeHtml(bank.bankName) },
      { k: 'Hesap Sahibi', v: escapeHtml(bank.accountHolder) },
      { k: 'IBAN', v: escapeHtml(bank.iban), mono: true },
      { k: 'Tutar', v: tl(order.total) },
      { k: 'Açıklama', v: `#${escapeHtml(order.orderNumber)}`, mono: true },
    ]))}
    ${P('Havaleniz hesabımıza ulaştıktan sonra siparişiniz onaylanır ve hazırlanmaya başlar. Onay verildiğinde e-posta ve WhatsApp ile bilgilendirileceksiniz.')}
    ${button(trackingUrl, 'Siparişimi Takip Et')}
    ${sectionTitle('Sipariş İçeriği')}
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">${itemRows(items)}</table>
    ${totalsTable(order, 'Ödenecek Toplam', discountCaption)}
    ${SITE.phoneDisplay ? Note(`Sorularınız için ${link(`tel:${SITE.phoneTel}`, escapeHtml(SITE.phoneDisplay))}`) : ''}
  `,
    { preheader: `#${order.orderNumber} havale onayı bekleniyor (${order.total} ₺)`, title: 'Havalenizi Bekliyoruz' },
  );
}

export function passwordResetTemplate(userName: string, resetLink: string): string {
  return layout(
    `
    ${H1('Şifre sıfırlama.')}
    ${P(`Merhaba ${escapeHtml(userName)},`)}
    ${Lede('Hesabınız için bir şifre sıfırlama talebi aldık. Aşağıdaki düğmeyle yeni şifrenizi belirleyebilirsiniz.')}
    ${button(resetLink, 'Şifremi Sıfırla')}
    ${panel(`<span style="color:${BRAND.ink};font-weight:600;">Güvenliğiniz için</span> bu bağlantı <strong style="color:${BRAND.ink};">1 saat</strong> içinde geçerliliğini yitirir.`)}
    ${P('Bu talebi siz yapmadıysanız bu e-postayı yok sayabilirsiniz. Hesabınız güvende.', BRAND.muted)}
    <p style="margin:22px 0 0 0;font-family:${FONT};color:${BRAND.muted};font-size:11px;line-height:1.6;word-break:break-all;">
      Düğme çalışmıyorsa bu bağlantıyı tarayıcınıza kopyalayın:<br>
      <a href="${escapeHtml(resetLink)}" style="color:${BRAND.body};text-decoration:underline;">${escapeHtml(resetLink)}</a>
    </p>
  `,
    { preheader: 'Şifrenizi sıfırlamak için bağlantı içeride.', title: 'Şifre Sıfırlama' },
  );
}

export function reviewRequestTemplate(userName: string, orderNumber: string, products: string[], userEmail?: string): string {
  return layout(
    `
    ${H1('Deneyiminizi paylaşır mısınız?')}
    ${P(`Merhaba ${escapeHtml(userName)},`)}
    ${Lede(`#${escapeHtml(orderNumber)} numaralı siparişiniz teslim edildi. Ürünleri değerlendirirseniz hem bize yön verir hem de diğer müşterilere yardımcı olursunuz.`)}
    ${panel(`
      <div style="margin-bottom:8px;">${label('Siparişinizdeki ürünler')}</div>
      ${bulletList(products.map((p) => escapeHtml(p)))}
    `)}
    ${button(`${SITE.url}/profilim`, 'Değerlendirme Yap')}
    ${Note('Geri bildiriminiz için teşekkür ederiz.')}
  `,
    { preheader: `#${orderNumber} teslim edildi, deneyiminizi paylaşır mısınız?`, title: 'Değerlendirme', unsubscribeEmail: userEmail },
  );
}

export interface AbandonedCartItem {
  productName: string;
  variantDetails?: string;
  price: string;
  quantity: number;
  imageUrl?: string;
  personalizationText?: string;
}

export function abandonedCartTemplate(
  userName: string,
  cartItems: AbandonedCartItem[],
  cartTotal: number,
  freeShippingThreshold: number,
  userEmail?: string,
): string {
  const rows = cartItems
    .map(
      (item) => `<tr>
      <td valign="top" style="padding:14px 0;border-bottom:1px solid ${BRAND.line};">
        <div style="font-family:${FONT};color:${BRAND.ink};font-size:14px;font-weight:600;">${escapeHtml(item.productName)}</div>
        ${item.personalizationText ? `<div style="font-family:${FONT};color:${BRAND.muted};font-size:12px;margin-top:3px;">Kişiselleştirme: &ldquo;${escapeHtml(item.personalizationText)}&rdquo;</div>` : ''}
        <div style="font-family:${FONT};color:${BRAND.muted};font-size:12px;margin-top:3px;">${escapeHtml(item.variantDetails || '')}${item.variantDetails ? ' · ' : ''}Adet: ${escapeHtml(item.quantity)}</div>
      </td>
      <td align="right" valign="top" style="padding:14px 0;border-bottom:1px solid ${BRAND.line};font-family:${FONT};color:${BRAND.ink};font-size:14px;font-weight:700;white-space:nowrap;">${tl(item.price)}</td>
    </tr>`,
    )
    .join('');
  const remaining = Math.max(0, freeShippingThreshold - cartTotal);
  const formatted = cartTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 });

  return layout(
    `
    ${H1('Sepetiniz sizi bekliyor.')}
    ${P(`Merhaba ${escapeHtml(userName)},`)}
    ${Lede('Sepetinize eklediğiniz ürünleri henüz tamamlamadınız. Stoklar sınırlı olabilir.')}
    ${panel(`
      <div style="margin-bottom:4px;">${label('Sepetinizdeki ürünler')}</div>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">${rows}</table>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top:14px;">
        <tr>
          <td style="padding-top:14px;border-top:1px solid ${BRAND.ink};font-family:${FONT};color:${BRAND.ink};font-size:12px;font-weight:700;letter-spacing:2px;">${escapeHtml(trUpper('Toplam'))}</td>
          <td align="right" style="padding-top:14px;border-top:1px solid ${BRAND.ink};font-family:${FONT};color:${BRAND.ink};font-size:20px;font-weight:700;white-space:nowrap;">${formatted}&nbsp;₺</td>
        </tr>
      </table>
    `)}
    ${button(`${SITE.url}/sepet`, 'Sepetime Dön')}
    ${panel(
      remaining > 0
        ? `<div style="text-align:center;color:${BRAND.ink};font-size:14px;"><strong>${remaining.toLocaleString('tr-TR')}&nbsp;₺</strong> daha ekleyin, kargo ücretsiz olsun.</div>`
        : `<div style="text-align:center;color:${BRAND.ink};font-size:14px;">Ücretsiz kargo kazandınız.</div>`,
    )}
    ${Note('Sorularınız için bize yazın, yardımcı olalım.')}
  `,
    { preheader: `Sepetinizde ${cartItems.length} ürün bekliyor, toplam ${formatted} ₺`, title: 'Sepetiniz', unsubscribeEmail: userEmail },
  );
}

export function guestReviewApprovedTemplate(p: { guestName: string; productName: string; productSlug: string; rating: number }): string {
  return layout(
    `
    ${H1('Yorumunuz yayında.')}
    ${Lede(`Merhaba ${escapeHtml(p.guestName)}, <strong style="color:${BRAND.ink};">${escapeHtml(p.productName)}</strong> için yazdığınız değerlendirme onaylandı ve ürün sayfasında yayında. Teşekkür ederiz.`)}
    ${panel(`<div style="text-align:center;font-size:24px;color:${BRAND.ink};letter-spacing:4px;padding:6px 0;">${stars(p.rating)}</div>`)}
    ${button(`${SITE.url}/urun/${p.productSlug}`, 'Ürün Sayfasını Gör')}
  `,
    { preheader: `Yorumunuz yayında: ${p.productName}`, title: 'Yorumunuz yayında' },
  );
}

export function guestReviewRejectedTemplate(p: { guestName: string; productName: string; reason: string }): string {
  return layout(
    `
    ${H1('Yorumunuz onaylanmadı.')}
    ${Lede(`Merhaba ${escapeHtml(p.guestName)}, <strong style="color:${BRAND.ink};">${escapeHtml(p.productName)}</strong> için gönderdiğiniz değerlendirme aşağıdaki gerekçeyle yayınlanmadı. Dilerseniz yeni bir yorum gönderebilirsiniz.`)}
    ${panel(`
      <div style="margin-bottom:8px;">${label('Gerekçe')}</div>
      <div style="font-size:14px;color:${BRAND.ink};line-height:1.6;">${escapeHtml(p.reason)}</div>
    `)}
  `,
    { preheader: `Yorumunuz onaylanmadı: ${p.productName}`, title: 'Yorumunuz onaylanmadı' },
  );
}

export interface QuoteEmailData {
  quoteNumber: string;
  dealerName: string;
  contactPerson: string | null;
  validUntil: Date | null;
  grandTotal: string;
  itemCount: number;
}

export function quoteEmailTemplate(data: QuoteEmailData): string {
  const validUntil = data.validUntil
    ? new Date(data.validUntil).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Belirtilmemiş';
  const total = parseFloat(data.grandTotal).toLocaleString('tr-TR', { minimumFractionDigits: 2 });
  return layout(
    `
    ${H1('Teklifiniz hazır.')}
    ${P(`Sayın ${escapeHtml(data.contactPerson || data.dealerName)},`)}
    ${Lede('Size özel hazırladığımız teklifi bu e-postanın ekinde PDF olarak bulabilirsiniz. Özet bilgiler aşağıdadır.')}
    ${panel(`
      ${metaRow([
        { caption: 'Teklif No', value: escapeHtml(data.quoteNumber), mono: true },
        { caption: 'Geçerlilik', value: escapeHtml(validUntil), align: 'right' },
      ])}
      <div style="margin:16px 0;">${divider()}</div>
      ${metaRow([
        { caption: 'Ürün adedi', value: `${escapeHtml(data.itemCount)} ürün` },
        { caption: 'Toplam tutar', value: `${total}&nbsp;₺`, align: 'right' },
      ])}
    `)}
    ${P('Teklif hakkında sorunuz varsa veya değişiklik isterseniz bizimle iletişime geçebilirsiniz.')}
    ${button(SITE.url, 'Web Sitemizi Ziyaret Edin')}
    ${Note(`${escapeHtml(SITE.name)} Ekibi`)}
  `,
    { preheader: `Teklif ${data.quoteNumber} hazır, toplam ${total} ₺`, title: `Teklif ${data.quoteNumber}` },
  );
}

export function testEmailTemplate(): string {
  return layout(
    `
    ${H1('Test e-postası.')}
    ${Lede('Bu bir test e-postasıdır. SMTP ayarlarınız doğru çalışıyor.')}
    ${panel(`<span style="color:${BRAND.ink};font-weight:600;">E-posta sistemi çalışıyor.</span>`)}
  `,
    { preheader: 'SMTP test e-postası', title: 'Test E-postası' },
  );
}

// ─── Yönetici şablonları ────────────────────────────────────────────────────

export function adminOrderNotificationTemplate(order: Order, items: OrderItem[]): string {
  const shipping = order.shippingAddress as ShippingAddr;
  const billing = billingBlock(order.billingAddress as BillingAddress | null | undefined, shipping);
  const isBankTransfer = order.paymentMethod === 'bank_transfer';
  const th = (t: string, align: 'left' | 'center' | 'right') =>
    `<th align="${align}" style="padding:11px 12px;color:${BRAND.muted};font-size:10px;font-weight:700;letter-spacing:1.8px;">${escapeHtml(trUpper(t))}</th>`;
  const rows = items
    .map(
      (item) => `<tr>
      <td style="padding:12px;border-top:1px solid ${BRAND.line};color:${BRAND.ink};font-size:13px;">${escapeHtml(item.productName)}${personalizationRow(item)}</td>
      <td style="padding:12px;border-top:1px solid ${BRAND.line};color:${BRAND.body};font-size:12px;">${escapeHtml(item.variantDetails || '-')}</td>
      <td align="center" style="padding:12px;border-top:1px solid ${BRAND.line};color:${BRAND.body};font-size:13px;">${escapeHtml(item.quantity)}</td>
      <td align="right" style="padding:12px;border-top:1px solid ${BRAND.line};color:${BRAND.ink};font-size:13px;font-weight:700;white-space:nowrap;">${tl(item.subtotal)}</td>
    </tr>`,
    )
    .join('');

  const alert = isBankTransfer
    ? panel(
        `<div style="color:${BRAND.ink};font-weight:700;font-size:14px;">Ödeme yöntemi: Havale, onay bekliyor</div>
         <div style="color:${BRAND.body};font-size:12px;margin-top:4px;">Hesap hareketlerini kontrol edip admin panelinden onaylayın.</div>`,
      )
    : '';
  const receiver = order.shippingPayment === 'receiver'
    ? panel(`<div style="color:${BRAND.ink};font-weight:700;font-size:14px;">Alıcı ödemeli gönderi</div>
             <div style="color:${BRAND.body};font-size:12px;margin-top:4px;">Kargo bedeli teslimatta alıcıdan tahsil edilecek.</div>`)
    : '';

  return layout(
    `
    ${H1('Yeni sipariş alındı.')}
    ${Lede('Sipariş detayları aşağıda. Hazırlığa hemen başlayabilirsiniz.')}
    ${alert}
    ${receiver}
    ${panel(metaRow([
      { caption: 'Sipariş No', value: `#${escapeHtml(order.orderNumber)}`, mono: true },
      { caption: 'Tarih', value: formatTRDateTime(order.createdAt) },
      { caption: 'Toplam', value: tl(order.total), align: 'right' },
    ]))}
    ${sectionTitle('Müşteri')}
    ${panel(`
      <div style="font-size:14px;color:${BRAND.ink};font-weight:700;margin-bottom:6px;">${escapeHtml(order.customerName)}</div>
      <div style="font-size:13px;"><a href="mailto:${escapeHtml(order.customerEmail)}" style="color:${BRAND.body};text-decoration:underline;">${escapeHtml(order.customerEmail)}</a></div>
      <div style="font-size:13px;"><a href="tel:${escapeHtml(order.customerPhone)}" style="color:${BRAND.body};text-decoration:underline;">${escapeHtml(order.customerPhone)}</a></div>
      <div style="margin:14px 0;">${divider()}</div>
      <div style="margin-bottom:6px;">${label('Teslimat adresi')}</div>
      <div style="font-size:13px;line-height:1.6;">${escapeHtml(shipping.address)}</div>
      <div style="font-size:13px;line-height:1.6;">${escapeHtml(shipping.district)}, ${escapeHtml(shipping.city)} ${escapeHtml(shipping.postalCode)}</div>
      ${billing ? `<div style="margin:14px 0;">${divider()}</div>${billing}` : ''}
    `)}
    ${sectionTitle('Ürünler')}
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:${BRAND.panel};border:1px solid ${BRAND.line};border-collapse:collapse;margin-top:12px;">
      <tr style="background-color:#000000;">${th('Ürün', 'left')}${th('Varyant', 'left')}${th('Adet', 'center')}${th('Tutar', 'right')}</tr>
      ${rows}
    </table>
    ${totalsTable(order, 'Toplam')}
    ${button(`${SITE.url}/${SITE.adminPath}`, 'Siparişi Yönet')}
  `,
    { preheader: `Yeni sipariş #${order.orderNumber}, ${order.total} ₺`, title: `Yeni Sipariş #${order.orderNumber}` },
  );
}

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

export function adminReviewNotificationTemplate(p: AdminReviewNotificationPayload): string {
  return layout(
    `
    ${H1('Yeni yorum onay bekliyor.')}
    ${Lede(`<strong style="color:${BRAND.ink};">${escapeHtml(p.productName)}</strong> için yeni bir değerlendirme geldi. Yayınlanmadan önce admin panelinden onaylamanız gerekiyor.`)}
    ${panel(`
      ${kvRows([
        { k: 'Yazan', v: `${escapeHtml(p.authorName)}${p.authorEmail ? `<div style="font-size:12px;font-weight:400;color:${BRAND.muted};">${escapeHtml(p.authorEmail)}</div>` : ''}` },
        { k: 'Hesap', v: p.isGuest ? 'Misafir' : 'Üye' },
        { k: 'Puan', v: `<span style="letter-spacing:2px;">${stars(p.rating)}</span> (${p.rating}/5)` },
        ...(p.title ? [{ k: 'Başlık', v: escapeHtml(p.title) }] : []),
      ])}
      ${p.content ? `<div style="margin:14px 0;">${divider()}</div><div style="font-size:13px;color:${BRAND.body};line-height:1.7;font-style:italic;">&ldquo;${escapeHtml(p.content)}&rdquo;</div>` : ''}
    `)}
    ${button(`${SITE.url}/${SITE.adminPath}?tab=reviews`, 'Admin Panelinde İncele')}
  `,
    { preheader: `Yeni yorum: ${p.authorName}, ${p.productName}`, title: 'Yeni yorum onay bekliyor' },
  );
}

export function contactFormTemplate(p: { name: string; email: string; subject: string; message: string }): string {
  return layout(
    `
    ${H1('Yeni iletişim mesajı.')}
    ${Lede('Web sitesindeki iletişim formundan yeni bir mesaj aldınız.')}
    ${panel(kvRows([
      { k: 'Ad Soyad', v: escapeHtml(p.name) },
      { k: 'E-posta', v: `<a href="mailto:${escapeHtml(p.email)}" style="color:${BRAND.ink};text-decoration:underline;">${escapeHtml(p.email)}</a>` },
      { k: 'Konu', v: escapeHtml(p.subject) },
    ]))}
    ${sectionTitle('Mesaj')}
    ${panel(`<div style="font-size:14px;color:${BRAND.body};line-height:1.75;white-space:pre-wrap;">${escapeHtml(p.message)}</div>`)}
    ${Note(`Bu e-postayı yanıtlayarak doğrudan ${escapeHtml(p.name)} ile iletişime geçebilirsiniz.`)}
  `,
    { preheader: `İletişim formu: ${p.subject}`, title: 'İletişim Formu' },
  );
}
