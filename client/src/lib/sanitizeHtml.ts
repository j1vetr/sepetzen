/**
 * Admin'den gelen HTML içerikleri farklı editörlerden gelebilir; burada
 * görsel kontrolü tasarım sistemine bırakıp içeriği (başlık, paragraf,
 * liste, vurgu) koruyarak güvenli hale getiriyoruz.
 */
export function sanitizeAdminHtml(rawHtml: string): string {
  const html = rawHtml || '';
  if (!html || typeof window === 'undefined') return html;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script, style, iframe, object, embed, form').forEach((node) => node.remove());
  doc.querySelectorAll<HTMLElement>('*').forEach((node) => {
    node.removeAttribute('style');
    node.removeAttribute('color');
    node.removeAttribute('bgcolor');
    node.removeAttribute('class');
    node.removeAttribute('id');
    Array.from(node.attributes).forEach((attribute) => {
      if (attribute.name.toLowerCase().startsWith('on')) node.removeAttribute(attribute.name);
    });
  });
  const isSafeUrl = (value: string) => {
    const url = value.trim().toLowerCase().replace(/[\s\u0000-\u001f]+/g, '');
    if (url.startsWith('javascript:') || url.startsWith('data:') || url.startsWith('vbscript:')) return false;
    return true;
  };
  doc.querySelectorAll('a').forEach((anchor) => {
    const href = anchor.getAttribute('href');
    if (href && !isSafeUrl(href)) anchor.removeAttribute('href');
    anchor.setAttribute('target', '_blank');
    anchor.setAttribute('rel', 'noreferrer');
  });
  doc.querySelectorAll('img, source, video, audio').forEach((media) => {
    const src = media.getAttribute('src');
    if (src && !isSafeUrl(src)) media.remove();
    media.removeAttribute('srcset');
  });
  return doc.body.innerHTML;
}
