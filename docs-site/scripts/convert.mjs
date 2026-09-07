/** Preserve authored Sphinx/MyST sources and build a version-specific Dockit site. */
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import MarkdownIt from 'markdown-it'
const root=path.resolve(import.meta.dirname,'../..'), site=path.join(root,'docs-site'), source=fs.existsSync(path.join(root,'docs'))?path.join(root,'docs'):root, out=path.join(site,'pages'), pub=path.join(site,'public')
const md=new MarkdownIt({html:true,linkify:true})
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()&&!['.git','_build','node_modules','__pycache__'].includes(e.name)?walk(path.join(d,e.name)):e.isFile()?[path.join(d,e.name)]:[])
const files=source===root?[path.join(root,'README.md'),...(fs.existsSync(path.join(root,'figures'))?walk(path.join(root,'figures')):[])]:walk(source), pages=files.filter(f=>/\.(md|rst)$/.test(f)&&!path.basename(f).startsWith('.')&&!f.includes('/assets/')&&!f.includes('/_static/'))
const manifest=JSON.parse(fs.readFileSync(path.join(pub,'versions.json'),'utf8'))
fs.rmSync(path.join(pub,'source'),{recursive:true,force:true})
const releaseBranch=(process.env.BRANCH||'').match(/^docs\/v?(\d[^/]*)$/)
const sourceVersion=fs.existsSync(path.join(root,'pyproject.toml'))?fs.readFileSync(path.join(root,'pyproject.toml'),'utf8').match(/^version\s*=\s*["']([^"']+)/m)?.[1]:null
const version=releaseBranch?.[1] || sourceVersion || manifest.current
fs.rmSync(out,{recursive:true,force:true}); fs.mkdirSync(out,{recursive:true})
function url(rel){return '/'+rel.replace(/\.(md|rst)$/,'').replace(/(^|\/)index$/,'').replace(/\/$/,'')}
function resolveLink(href,rel){
 if(href.startsWith('https://docs.vuer.ai/en/latest/')) href='/'+href.split('/en/latest/')[1].replace(/\.html(?=$|#)/,'')
 if(href==='ngrok.io')return 'https://ngrok.com'
 if(/^(?:[a-z]+:|\/\/|#)/i.test(href)) return href
 const [p,hash]=href.split('#'); if(!p)return href
 if(p.startsWith('/'))return p.replace(/\.html$/,'')+(hash?'#'+hash:'')
 let target=path.posix.normalize(path.posix.join(path.posix.dirname(rel),p))
 const fixes={'gaussian_splatting/openai_sora.md':'examples/openai_sora.md','gaussian_splatting/09_gaussian_splats.md':'components/splat.md','gaussian_splatting/10_gaussian_splats_vr.md':'components/splat.md','examples/23_spark.md':'components/spark_splats.md','tutorials/robotics.md':'tutorials/teleoperation.md','guides/animation/':'guides/session_apis.md','guides/events/':'guides/session_apis.md','guides/vr/':'examples/vr_xr/hand_tracking.md','../components/primitives':'components/category_primitives.md','guides/first_3d_scene/03_materials_and_textures':'guides/first_3d_scene/02_materials_and_textures.md','examples/background/background_image.md':'examples/background_environment.md'}
 if(!fs.existsSync(path.join(source,target))&&fixes[target]&&fs.existsSync(path.join(source,fixes[target])))target=fixes[target]
 if(!fs.existsSync(path.join(source,target))&&fs.existsSync(path.join(source,target.replace(/\.md$/,'.rst'))))target=target.replace(/\.md$/,'.rst')
 if(!fs.existsSync(path.join(source,target))){const found=files.filter(f=>path.basename(f)===path.basename(target));if(found.length===1)target=path.relative(source,found[0])}
 return (/\.(md|rst)$/.test(target)||p.endsWith('.html')?url(target.replace(/\.html$/,'.md')):'/source/'+target)+(hash?'#'+hash:'')
}
function apiUrl(name){
 const packagePath=['src/vuer','vuer','tassa','nerf_vuer'].find(p=>fs.existsSync(path.join(root,p,'__init__.py'))) || 'vuer';
 const moduleName=path.basename(packagePath), parts=(name===moduleName?'':name.startsWith(moduleName+'.')?name.slice(moduleName.length+1):name).split('.').filter(Boolean), base=path.join(root,packagePath);
 for(let n=parts.length;n>=0;n--){const module=parts.slice(0,n).join('/');if(fs.existsSync(path.join(base,module+'.py'))||fs.existsSync(path.join(base,module,'__init__.py'))){return '/python-api'+(module?'/'+module:'')+(n<parts.length?'#'+parts.slice(n).join('-').toLowerCase():'')}}
 return '/python-api'
}
function rst(body){
 const mods=[...body.matchAll(/\.\. auto(?:module|class|function)::\s*(\S+)/g)].map(m=>m[1])
 if(mods.length)return mods.map(m=>`[${m} API reference](${apiUrl(m)})`).join('\n\n')
 if(body.includes('.. raw:: html'))return body.split('.. raw:: html')[1].replace(/^ {3}/gm,'')
 if(body.includes('.. toctree::')) return body.split(/\.\. toctree::/).slice(1).flatMap(s=>s.split('\n').map(l=>l.trim()).filter(l=>l&&!l.startsWith(':')).map(l=>{const m=l.match(/^(.*?)\s*<(.+)>$/);const dest=m?m[2]:l; return `- [${m?m[1]:dest.replace(/\.(md|rst)$/,'').split('/').pop().replaceAll('_',' ')}](${/\.(md|rst)$/.test(dest)||dest.includes('://')?dest:dest+'.md'})`})).join('\n')
 return '```rst\n'+body.trim()+'\n```'
}
let redirects=[];let count=0
for(const f of pages){
 const rel=source===root?'index.md':path.relative(source,f).split(path.sep).join('/'); let text=fs.readFileSync(f,'utf8').replaceAll('{VERSION}',version)
 if(f.endsWith('.rst')){
 text=text.replace(/^([=~*#-])\1+\n([^\n]+)\n\1+$/gm,'# $2').replace(/^([^\n]+)\n([=~-])\2{2,}$/gm,(_,title,mark)=>(mark==='='?'# ':'## ')+title)
 text=text.replace(/(^\.\. (?:toctree|auto\w+)::[^\n]*\n(?:[ \t]+[^\n]*\n|\n)*)/gm,block=>rst(block))
 text=text.replace(/\.\. code-block::\s*(\w*)\n((?:[ \t]+[^\n]*\n|\n)*)/g,(_,lang,body)=>'```'+lang+'\n'+body.replace(/^ {3}/gm,'').trim()+'\n```')
 text=text.replace(/\.\. image::\s*(\S+)/g,'![]($1)').replace(/`([^`]+)\s+<([^>]+)>`_/g,'[$1]($2)')
 }
 text=text.replace(/```\{([^}]+)\}([^\n]*)\n([\s\S]*?)\n```/g,(_,directive,title,body)=>{
  if(directive==='eval-rst')return rst(body)
  if(directive==='toctree')return rst('.. toctree::\n'+body)
  if(['admonition','note','warning','tip','important','attention'].includes(directive))return '\n> **'+(title.trim()||directive)+'**\n>\n'+body.replace(/^:[^\n]*\n/gm,'').split('\n').map(l=>'> '+l).join('\n')+'\n'
  if(directive==='code-block')return '```'+title.trim()+'\n'+body+'\n```'
  return '```text\n'+body+'\n```'
 })
 text=text.replace(/<!--([\s\S]*?)-->/g,'').replace(/^\[\/\/\]:.*$/gm,'')
 const title=(rel==='index.md'?'Vuer':text.match(/^#\s+(.+)$/m)?.[1]||path.basename(rel,'.md').replaceAll('_',' ')).replace(/<[^>]*>/g,' ').replaceAll('`','').trim()
 if(source===root){const release=(process.env.BRANCH||'').replace(/^docs\//,'');const versions=JSON.parse(fs.readFileSync(path.join(site,'source-versions.json'),'utf8'));const commit=versions[release];const sourceUrl=commit?'https://github.com/vuer-ai/vuer/commit/'+commit:'https://github.com/vuer-ai/vuer-docs/tree/'+(process.env.BRANCH||'main');text='> **Historical source snapshot**\n> Dedicated documentation did not exist in this release. The original repository README appears below. The [package API](/python-api) is generated from this snapshot’s code. [View the original source commit]('+sourceUrl+').\n\n'+text}
 const section=rel==='index.md'||rel==='quick_start.md'?'Getting Started':({'guides':'Guides','tutorials':'Tutorials','components':'Components','examples':'Examples','api':'Python API','rtc':'Python API'}[rel.split('/')[0]]||'Reference')
 let html=md.render(text).replace(/\b(href|src)="([^"]+)"/g,(_,attr,h)=>`${attr}="${resolveLink(h,rel)}"`)
 html=html.replace(/<h([1-6])>(.*?)<\/h\1>/g,(_,level,content)=>`<h${level} id="${content.replace(/<[^>]+>/g,'').toLowerCase().replace(/[^\w\s-]/g,'').trim().replace(/\s+/g,'-')}">${content}</h${level}>`)
 const dest=path.join(out,rel.replace(/\.(md|rst)$/,''));fs.mkdirSync(dest,{recursive:true})
 fs.writeFileSync(path.join(dest,'content.html'),html)
 fs.writeFileSync(path.join(dest,'content.txt'),text)
 fs.writeFileSync(path.join(dest,'+Page.mdx'),`---\ntitle: ${JSON.stringify(title)}\nsection: ${JSON.stringify(section)}\norder: ${rel==='index.md'?0:rel==='quick_start.md'?1:++count+10}\ndescription: ${JSON.stringify(title+' — Vuer documentation')}\n---\n\nimport html from './content.html?raw'\n\n<div className="legacy-doc" dangerouslySetInnerHTML={{ __html: html }} />\n`)
 const route=url(rel)||'/';redirects.push(`/en/latest/${rel.replace(/\.(md|rst)$/,'.html')} ${route} 301`,`/en/stable/${rel.replace(/\.(md|rst)$/,'.html')} ${route} 301`)
 fs.mkdirSync(path.dirname(path.join(pub,'markdown',rel)),{recursive:true});fs.writeFileSync(path.join(pub,'markdown',rel),text)
}
// Keep every source asset at its original relative location under /source/.
for(const f of files.filter(f=>!f.endsWith('.md')&&!f.includes('/_templates/'))){const dest=path.join(pub,'source',path.relative(source,f));fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(f,dest)}
fs.writeFileSync(path.join(pub,'_redirects'),redirects.join('\n')+'\n/en/latest/ / 301\n/en/stable/ / 301\n/en/* https://vuer-py.readthedocs.io/en/:splat 200\n')
fs.writeFileSync(path.join(pub,'llms.txt'),'# Vuer\n\n> Event-driven visualization for physical AI, robotics, VR and AR.\n\n'+pages.map(f=>{const r=path.relative(source,f);return `- [${r}](https://docs.vuer.ai/markdown/${r})`}).join('\n')+'\n')
const py=['src/vuer','vuer','tassa','nerf_vuer'].find(p=>fs.existsSync(path.join(root,p,'__init__.py')))
if(py)
execFileSync(process.env.PYTHON||'python3',['-m','autodoc_py',path.join(root,py),'--output',path.join(out,'python-api'),'--module',path.basename(py),'--url-prefix','/python-api','--section','Python API','--source-url',`https://github.com/vuer-ai/vuer-docs/blob/${process.env.BRANCH||'main'}/${py}`],{stdio:'inherit'})
for(const f of walk(out).filter(f=>f.endsWith('+Page.mdx'))){const rel=path.relative(out,path.dirname(f));const markdown=fs.existsSync(path.join(path.dirname(f),'content.txt'))?fs.readFileSync(path.join(path.dirname(f),'content.txt'),'utf8'):fs.readFileSync(f,'utf8');const dest=path.join(pub,(rel==='index'?'index':rel)+'.md');fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,markdown)}
console.log(`Converted ${pages.length} authored pages, preserved source assets, and generated Python API.`)
