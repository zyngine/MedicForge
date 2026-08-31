import { describe, it, expect } from "vitest";
import { sanitizeHTML } from "../sanitize-html";

describe("sanitizeHTML", () => {
  it("keeps ordinary lesson markup", () => {
    const html = "<h2>Airway</h2><p>Use a <strong>BVM</strong>.</p><ul><li>Step one</li></ul>";
    expect(sanitizeHTML(html)).toBe(html);
  });

  it("keeps links and images with their attributes", () => {
    const out = sanitizeHTML('<a href="https://example.com" title="ref">ref</a>');
    expect(out).toContain('href="https://example.com"');
    const img = sanitizeHTML('<img src="https://cdn.example.com/a.png" alt="a" width="20">');
    expect(img).toContain('src="https://cdn.example.com/a.png"');
    expect(img).toContain('alt="a"');
  });

  it("strips script tags", () => {
    expect(sanitizeHTML("<p>hi</p><script>alert(1)</script>")).not.toContain("alert");
  });

  it("strips event handler attributes, quoted or not", () => {
    expect(sanitizeHTML('<img src=x onerror="alert(1)">')).not.toContain("onerror");
    expect(sanitizeHTML("<img src=x onerror=alert(1)>")).not.toContain("onerror");
    expect(sanitizeHTML('<div onmouseover="alert(1)">x</div>')).not.toContain("onmouseover");
  });

  it("strips javascript: URLs, including entity-encoded ones", () => {
    // The previous regex sanitizer matched the literal string "javascript:" and
    // so let the entity-encoded form through.
    expect(sanitizeHTML('<a href="javascript:alert(1)">x</a>')).not.toContain("javascript:");
    expect(sanitizeHTML('<a href="jav&#97;script:alert(1)">x</a>')).not.toContain("script:");
    expect(sanitizeHTML("<iframe src=javascript:alert(1)></iframe>")).not.toContain("javascript:");
  });

  it("drops embedded frames, objects and forms", () => {
    const out = sanitizeHTML(
      '<iframe src="https://evil.test"></iframe><object data="x"></object><form action="https://evil.test"><input name="password"></form>'
    );
    expect(out).not.toContain("<iframe");
    expect(out).not.toContain("<object");
    expect(out).not.toContain("<form");
    expect(out).not.toContain("<input");
  });

  it("allows inline base64 images but no other data: URL", () => {
    const png = '<img src="data:image/png;base64,iVBORw0KGgo=">';
    expect(sanitizeHTML(png)).toContain("data:image/png;base64");
    expect(sanitizeHTML('<a href="data:text/html;base64,PHNjcmlwdD4=">x</a>')).not.toContain(
      "data:text/html"
    );
  });

  it("leaves the word 'data:' in body text alone", () => {
    // The LMS sanitizer used to rewrite every occurrence to "data-blocked:".
    expect(sanitizeHTML("<p>Record the data: pulse, BP, resp.</p>")).toContain("data: pulse");
  });

  it("returns an empty string for empty input", () => {
    expect(sanitizeHTML("")).toBe("");
  });
});
