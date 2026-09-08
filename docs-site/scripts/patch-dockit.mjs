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
