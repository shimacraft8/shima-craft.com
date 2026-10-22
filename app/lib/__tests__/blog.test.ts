import { describe, it, expect } from "vitest";
import { enhanceBlogBodyHtml } from "../blog";
describe("CMS display boundary", () => {
 it("keeps headings, image alt and scrollable tables", () => {
  const result=enhanceBlogBodyHtml('<h2>島の記録</h2><img src="https://images.microcms-assets.io/test.jpg" alt="海"><table><tr><td>時刻</td></tr></table>');
  expect(result).toContain("<h2>島の記録</h2>"); expect(result).toContain('alt="海"'); expect(result).toContain('loading="lazy"'); expect(result).toContain('class="blog-table-scroll"');
 });
 it("removes execution elements, event attributes and unsafe URLs", () => {
  const result=enhanceBlogBodyHtml('<script>window.bad=1</script><iframe src="https://example.test"></iframe><img src="x" onerror="bad()"><a href="javascript:bad()" onclick="bad()">link</a><svg onload="bad()"></svg>');
  for(const bad of ["<script","<iframe","onerror","onclick","javascript:","<svg"]) expect(result).not.toContain(bad);
  expect(result).toContain('rel="noopener noreferrer"');
 });
});
