import DOMPurify from "isomorphic-dompurify";

/**
 * Sanitize instructor-authored lesson HTML before it is handed to
 * dangerouslySetInnerHTML.
 *
 * This replaces two separate hand-rolled regex sanitizers (one in the LMS
 * lesson page, one in the CE learn page) that had drifted apart and were both
 * denylist-based. Denylists lose: entity-encoded schemes (`jav&#97;script:`),
 * unquoted attributes, and `<iframe>`/`<object>`/`<form>` embeds all slipped
 * through, and one of them rewrote every `data:` occurrence in the body text.
 *
 * DOMPurify parses the markup and keeps only what the allowlist below permits.
 */
const ALLOWED_TAGS = [
  "a", "abbr", "b", "blockquote", "br", "caption", "code", "col", "colgroup",
  "dd", "div", "dl", "dt", "em", "figcaption", "figure", "h1", "h2", "h3", "h4",
  "h5", "h6", "hr", "i", "img", "li", "mark", "ol", "p", "pre", "s", "small",
  "span", "strong", "sub", "sup", "table", "tbody", "td", "tfoot", "th",
  "thead", "tr", "u", "ul",
];

const ALLOWED_ATTR = [
  "href", "target", "rel", "title", "alt", "src", "width", "height",
  "colspan", "rowspan", "class", "id", "start", "type",
];

export function sanitizeHTML(html: string): string {
  if (!html) return "";

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // Images may be inlined as data URIs; nothing else may use a data: URL.
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:|#|\/|data:image\/(?:png|jpeg|gif|webp|avif);base64,)/i,
    // Keep the text of anything dropped rather than silently deleting content.
    KEEP_CONTENT: true,
  });
}
