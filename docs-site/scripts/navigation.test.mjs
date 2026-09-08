import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {navigationFor,tabs,applyNavigation} from '../navigation/structure.mjs';
import {initTabs,tabForUrl} from '../node_modules/@dreamlake/dockit/dist/lib/tabs.js';
import {initNavigation,getAdjacentPages} from '../node_modules/@dreamlake/dockit/dist/lib/navigation.js';
initTabs(tabs);
test('legacy URLs select the intended tab without moving pages',()=>{
 for(const [url,id] of [['/','learn'],['/guides/cli','learn'],['/tutorials/camera/README','learn'],['/components/index','components'],['/examples/vr_xr/body_tracking','examples'],['/python-api/rtc','python-api'],['/api/base','python-api'],['/rtc/scene_store','python-api'],['/RELEASE_NOTES','releases'],['/CHANGE_LOG','releases'],['/versions?x=1','releases']]) assert.equal(tabForUrl(url),id,url);
});
test('every authored page is explicitly classified',()=>{
 const root=new URL('../content/',import.meta.url);
 const files=fs.readdirSync(root,{recursive:true}).filter(x=>x.endsWith('.mdx'));
 for(const file of files) assert.doesNotThrow(()=>navigationFor(file),file);
});
test('legacy duplicate API and implementation-only modules stay accessible but out of navigation',()=>{
 assert.equal(navigationFor('api/base').hidden,true);
 assert.equal(navigationFor('python-api/workspace/test_workspace').hidden,true);
 assert.equal(navigationFor('python-api/workspace/workspace').section,'Sessions & Workspace');
 assert.equal(navigationFor('python-api/rtc/scene_store').section,'RTC');
 assert.equal(navigationFor('python-api/client').section,'Core');
 assert.match(applyNavigation('---\ntitle: "Example"\n---\n# Content','api/base'),/hidden: true/);
});
test('previous and next stay inside the active tab',()=>{
 initNavigation({'./pages/index/+Page.mdx':{frontmatter:{title:'Home',order:1}},'./pages/components/index/+Page.mdx':{frontmatter:{title:'Catalog',order:2}},'./pages/quick_start/+Page.mdx':{frontmatter:{title:'Start',order:3}}});
 assert.equal(getAdjacentPages('/').next.path,'/quick_start');
 assert.equal(getAdjacentPages('/components').next,null);
 assert.equal(getAdjacentPages('/components').prev,null);
});
test('catalog categories match sidebar groups and every card has a source page',()=>{
 for(const kind of ['components','examples']){
  const source=fs.readFileSync(new URL(`../content/${kind}/index.mdx`,import.meta.url),'utf8');
  const entries=JSON.parse(source.match(/entries=\{(\[[\s\S]*?\])\} \/>/)[1]);
  for(const entry of entries){
   const slug=entry.href.slice(1);
   assert.equal(navigationFor(slug).section,entry.category,slug);
   assert.ok(fs.existsSync(new URL('../content/'+slug+'.mdx',import.meta.url)),slug);
  }
 }
});
test('directory catalog URLs keep their navigation metadata',()=>{
 initNavigation({'./pages/components/index/+Page.mdx':{frontmatter:{title:'Catalog'}}});
 assert.equal(getAdjacentPages('/components/').current.title,'Catalog');
});
