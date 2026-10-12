import { test } from 'node:test';
import assert from 'node:assert/strict';
import { articleBodyHtml } from '../apps/web/src/article-content.ts';
test('public article fallback preserves every paragraph and heading',()=>{
  const html=articleBodyHtml(['An introduction.','## Where GG fits','Creators choose whether to enable tips.','Participation is free.']);
  for(const text of ['An introduction.','Where GG fits','Creators choose whether to enable tips.','Participation is free.'])assert.ok(html.includes(text));
  assert.equal((html.match(/<p>/g)||[]).length,3);assert.equal((html.match(/<h2>/g)||[]).length,1);
});
test('external article blocks cannot inject markup or execute scripts',()=>{
  const html=articleBodyHtml(['<img src=x onerror="alert(1)">','## <script>alert(2)</script>', 'A & B']);
  assert.ok(!html.includes('<img'));assert.ok(!html.includes('<script'));assert.ok(html.includes('&lt;img'));assert.ok(html.includes('&lt;script'));assert.ok(html.includes('A &amp; B'));
});
