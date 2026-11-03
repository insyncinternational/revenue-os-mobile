/**
 * Pure: the page the original email is shown in. Inbound email is attacker-controlled, so the viewer never trusts
 * it: this Content-Security-Policy (first in <head>, and a later one in the email can only tighten it) allows no
 * script, no forms, no frames, no fetches, and images only inline unless the user taps "Show images" (remote
 * images are mostly open-tracking pixels — same default as the web inbox). The web view also runs with
 * JavaScript off and opens links outside the app.
 */
export type EmailTheme = { text: string; link: string; background: string; dark: boolean };

/** A colour safe to place in CSS (no way to end the declaration or the style block). */
function cssColor(v: string, fallback: string): string {
  return /^#[0-9a-f]{3,8}$/i.test(v) || /^rgba?\([\d\s.,%]+\)$/i.test(v) ? v : fallback;
}

export function emailDocument(html: string, theme: EmailTheme, opts: { remoteImages: boolean }): string {
  const img = opts.remoteImages ? "data: https: http:" : "data:";
  const csp = `default-src 'none'; img-src ${img}; style-src 'unsafe-inline'; font-src data:; form-action 'none'; frame-src 'none'; base-uri 'none'`;
  const css = [
    `:root{color-scheme:${theme.dark ? "dark" : "light"};}`,
    `html,body{margin:0;padding:0;background:${cssColor(theme.background, "transparent")};}`,
    `body{padding:16px;color:${cssColor(theme.text, "inherit")};font:16px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;word-break:break-word;overflow-wrap:anywhere;}`,
    `a{color:${cssColor(theme.link, "inherit")};}`,
    "img{max-width:100%;height:auto;}",
    "table{max-width:100%;}",
    // A blocked image takes no room instead of an empty box.
    "img:not([src^='data:'])" + (opts.remoteImages ? "{}" : "{display:none;}"),
  ].join("");
  return `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="${csp}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body>${html}</body></html>`;
}

/** Pure: does the email load anything from the web (so "Show images" is worth offering)? */
export function hasRemoteImages(html: string): boolean {
  return /<img[^>]+src\s*=\s*["']?\s*(?:https?:)?\/\//i.test(html) || /url\(\s*['"]?\s*(?:https?:)?\/\//i.test(html);
}

/** Pure: only web, mail and phone links leave the viewer (never javascript:, data:, file: …). */
export function openableLink(url: string): boolean {
  return /^(https?:|mailto:|tel:)/i.test(url.trim());
}
