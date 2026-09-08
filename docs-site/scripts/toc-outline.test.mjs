import test from 'node:test';
import assert from 'node:assert/strict';
import { outlineHeadings, visibleOutline } from './toc-outline.mjs';
const h = (id, level) => ({ id, level });
test('standalone H3 headings and skipped levels remain navigable', () => {
 const result = outlineHeadings([h('intro',3),h('detail',5),h('next',3),h('section',2),h('deep',4),h('deeper',6)]);
 assert.deepEqual(result.map(x=>[x.id,x.depth,x.ancestors]), [
 ['intro',0,[]],['detail',1,['intro']],['next',0,[]],['section',0,[]],['deep',1,['section']],['deeper',2,['section','deep']]]);
 assert.equal(visibleOutline(result,new Set()).length,6);
 assert.deepEqual(visibleOutline(result,new Set(['deep'])).map(x=>x.id),['intro','detail','next','section','deep']);
 assert.deepEqual(visibleOutline(result,new Set(['section'])).map(x=>x.id),['intro','detail','next','section']);
});
test('anchor spans and headings with the same id produce one entry', () => {
 assert.deepEqual(outlineHeadings([h('a',2),h('a',2),h('b',3)]).map(x=>[x.id,x.depth]),[['a',0],['b',1]]);
});
