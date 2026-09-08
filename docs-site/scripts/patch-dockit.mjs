// Dockit 0.2.14 assumes version subdomains; Netlify uses docs-vX--site.
// Preserve the explicit build version while still loading the shared manifest.
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'
const filename=fileURLToPath(new URL('../node_modules/@dreamlake/dockit/dist/components/VersionBadge.js',import.meta.url))
const before='} else if (manifest?.current) {'
const after='} else if (manifest?.current && !version) {'
export function patch(source){
 if(source.includes(after))return source
 assert.equal(source.split(before).length-1,1,'Dockit version patch expected exactly one known fallback; inspect new framework before upgrading')
 return source.replace(before,after)
}
assert.equal(patch(before),after)
assert.equal(patch(after),after)
assert.throws(()=>patch('unexpected framework source'))
const source=fs.readFileSync(filename,'utf8'), changed=patch(source)
if(source!==changed)fs.writeFileSync(filename,changed)
console.log('Dockit branch-version compatibility check passed')
// Avoid nesting a dropdown button and its version links inside the home anchor.
const topbar=fileURLToPath(new URL('../node_modules/@dreamlake/dockit/dist/components/Topbar.js',import.meta.url))
let bar=fs.readFileSync(topbar,'utf8')
const oldBrand='"a",\n          {\n            ref: brandRef,\n            href: "/",'
const newBrand='"div",\n          {\n            ref: brandRef,'
const oldName='jsxs("span", { children: [\n                siteConfig.brand,'
const newName='jsxs("a", { href: "/", children: [\n                siteConfig.brand,'
for(const [before,after] of [[oldBrand,newBrand],[oldName,newName]]){
 if(!bar.includes(after)){assert.equal(bar.split(before).length-1,1,'Dockit brand structure changed; inspect before patching');bar=bar.replace(before,after)}
}
fs.writeFileSync(topbar,bar)
// Authored latest pages are flat MDX files; API pages are generated from Python.
const tocFile=fileURLToPath(new URL('../node_modules/@dreamlake/dockit/dist/components/TOC.js',import.meta.url))
let toc=fs.readFileSync(tocFile,'utf8')
const oldEdit='return `${siteConfig.docsRepoUrl}/edit/${siteConfig.docsBranch}/${pagesPath}/${slug}/+Page.mdx`;'
const newEdit='if (pagesPath === "docs-site/content") {\n      if (currentPath === "/python-api" || currentPath.startsWith("/python-api/")) return null;\n      return `${siteConfig.docsRepoUrl}/edit/${siteConfig.docsBranch}/${pagesPath}/${slug}.mdx`;\n    }\n    '+oldEdit
if(!toc.includes(newEdit)){
 assert.equal(toc.split(oldEdit).length-1,1,'Dockit edit-link structure changed; inspect before patching')
 toc=toc.replace(oldEdit,newEdit);fs.writeFileSync(tocFile,toc)
}

// Complete the page outline without changing the site's main sidebar.
const outlineImport = 'import { outlineHeadings, visibleOutline } from "./toc-outline.mjs";';
const tocPatches = JSON.parse(fs.readFileSync(new URL('./toc-patches.json', import.meta.url), 'utf8'));
for (const [before, after] of tocPatches) {
  if (toc.includes(after)) continue;
  assert.equal(toc.split(before).length - 1, 1, 'Dockit TOC changed; inspect before upgrading: ' + before.slice(0, 80));
  toc = toc.replace(before, after);
}
if (!toc.includes(outlineImport)) toc = outlineImport + '\n' + toc;
fs.writeFileSync(tocFile, toc);
fs.copyFileSync(new URL('./toc-outline.mjs', import.meta.url), new URL('../node_modules/@dreamlake/dockit/dist/components/toc-outline.mjs', import.meta.url));
console.log('Dockit complete heading outline compatibility check passed');
// Preserve legacy route families while scoping them to the five navigation tabs.
const tabsFile=fileURLToPath(new URL('../node_modules/@dreamlake/dockit/dist/lib/tabs.js',import.meta.url));
let tabSource=fs.readFileSync(tabsFile,'utf8');
const oldSegment='const seg = firstSegment(url);';
const newSegment='const rawSegment = firstSegment(url);\n  const aliases = {api: "python-api", rtc: "python-api", release_notes: "releases", change_log: "releases", versions: "releases"};\n  const seg = aliases[rawSegment.toLowerCase()] || rawSegment;';
if(!tabSource.includes(newSegment)){
 assert.equal(tabSource.split(oldSegment).length-1,1,'Inspect Dockit route scoping before upgrading');
 tabSource=tabSource.replace(oldSegment,newSegment);fs.writeFileSync(tabsFile,tabSource);
}
// Previous / next follows the selected tab and its section ordering.
const navFile=fileURLToPath(new URL('../node_modules/@dreamlake/dockit/dist/lib/navigation.js',import.meta.url));
let nav=fs.readFileSync(navFile,'utf8');
const oldList='const list = opts.includeHidden || here?.hidden ? pages : pages.filter((p) => !p.hidden);';
const newList='const list = (opts.includeHidden || here?.hidden ? pages : pages.filter((p) => !p.hidden)).filter((p) => urlInTab(p.path, tabForUrl(norm)));';
if(!nav.includes(newList)){
 assert.equal(nav.split(oldList).length-1,1,'Inspect Dockit adjacency before upgrading');
 nav='import { tabForUrl, urlInTab } from "./tabs.js";\n'+nav.replace(oldList,newList);fs.writeFileSync(navFile,nav);
}
// Give the mobile tab strip its own row instead of clipping it behind the brand.
bar=fs.readFileSync(topbar,'utf8');
const oldTabsClass='className: "flex items-stretch",';
const newTabsClass='className: "doc-navigation-tabs flex items-stretch",';
if(!bar.includes(newTabsClass)){
 assert.equal(bar.split(oldTabsClass).length-1,1,'Inspect Dockit tab container before upgrading');
 fs.writeFileSync(topbar,bar.replace(oldTabsClass,newTabsClass));
}
// Both directory URLs and old explicit /index links address the same catalog.
nav=fs.readFileSync(navFile,'utf8');
const oldRoot='if (clean === "/") return "/";';
const newRoot='if (clean === "/") return "/";\n  if (["/components/index", "/components/index/", "/examples/index", "/examples/index/"].includes(clean)) return clean.split("/index")[0];';
const oldPath='const path = dir === "index" ? "/" : `/${dir}`;';
const newPath='const path = dir === "index" ? "/" : normalizePath(`/${dir}`);';
for(const [before,after] of [[oldRoot,newRoot],[oldPath,newPath]]){
 if(!nav.includes(after)){assert.equal(nav.split(before).length-1,1,'Inspect Dockit catalog URL normalization before upgrading');nav=nav.replace(before,after);}
}
fs.writeFileSync(navFile,nav);
toc=fs.readFileSync(tocFile,'utf8');
const oldSlug='const slug = currentPath === "/" ? "index" : currentPath.replace(/^\\//, "");';
const newSlug='const slug = currentPath === "/" ? "index" : ["/components", "/examples"].includes(currentPath) ? currentPath.slice(1) + "/index" : currentPath.replace(/^\\//, "");';
if(!toc.includes(newSlug)){assert.equal(toc.split(oldSlug).length-1,1,'Inspect Dockit catalog edit links before upgrading');fs.writeFileSync(tocFile,toc.replace(oldSlug,newSlug));}
// Netlify pretty URLs lowercase filenames; resolve their authored metadata too.
nav=fs.readFileSync(navFile,'utf8');
const oldNormalize='return clean.replace(/\\/+$/, "") || "/";';
const newNormalize='const normalized = clean.replace(/\\/+$/, "") || "/";\n  return pages.find((page) => page.path.toLowerCase() === normalized.toLowerCase())?.path || normalized;';
if(!nav.includes(newNormalize)){assert.equal(nav.split(oldNormalize).length-1,1,'Inspect Dockit case normalization before upgrading');fs.writeFileSync(navFile,nav.replace(oldNormalize,newNormalize));}
// Top-level tabs must work while hydration/client-router startup is in progress.
const stripFile=fileURLToPath(new URL('../node_modules/@dreamlake/dockit/dist/components/TabStrip.js',import.meta.url));
let strip=fs.readFileSync(stripFile,'utf8');
const oldTabHref='href: external ? tab.href : tab.landing,';
const newTabHref='href: external ? tab.href : tab.landing,\n                  "data-vike": "false",';
if(!strip.includes(newTabHref)){assert.equal(strip.split(oldTabHref).length-1,1,'Inspect Dockit top-level links before upgrading');fs.writeFileSync(stripFile,strip.replace(oldTabHref,newTabHref));}

// Backport the closed-search preview guard while Dockit's upstream fix is reviewed.
const paletteFile=fileURLToPath(new URL('../node_modules/@dreamlake/dockit/dist/components/SearchPalette.js',import.meta.url));
let palette=fs.readFileSync(paletteFile,'utf8');
for(const [before,after] of [
 ['if (!activePath || isSingleCol ||', 'if (!open || !activePath || isSingleCol ||'],
 ['}, [active, activePath, isSingleCol]);', '}, [open, active, activePath, isSingleCol]);'],
]) {
 if(!palette.includes(after)) {
  assert.equal(palette.split(before).length-1,1,'Inspect Dockit search preview before upgrading');
  palette=palette.replace(before,after);
 }
}
fs.writeFileSync(paletteFile,palette);
