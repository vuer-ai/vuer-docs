/** Build native MDX sources and the version-specific Python API. */
import fs from 'node:fs'
import {applyNavigation} from '../navigation/structure.mjs'
import path from 'node:path'
import {execFileSync} from 'node:child_process'
const site=path.resolve(import.meta.dirname,'..'),root=path.dirname(site),content=path.join(site,'content'),out=path.join(site,'pages'),pub=path.join(site,'public')
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()&&!['.git','_build','node_modules','__pycache__','_templates'].includes(e.name)?walk(path.join(d,e.name)):e.isFile()?[path.join(d,e.name)]:[])
const write=(file,text)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,text)}
const route=rel=>'/'+rel.replace(/\.mdx$/,'').replace(/(^|\/)index$/,'').replace(/\/$/,'')
const manifest=JSON.parse(fs.readFileSync(path.join(pub,'versions.json'),'utf8'))
fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true})
fs.rmSync(path.join(pub,'markdown'),{recursive:true,force:true})
const sources=walk(content).filter(f=>f.endsWith('.mdx')),redirects=['/components/index /components 301','/examples/index /examples 301'],links=[]
for(const file of sources){
 const rel=path.relative(content,file).split(path.sep).join('/'),mdx=applyNavigation(fs.readFileSync(file,'utf8'),rel)
 if(/dangerouslySetInnerHTML|content\.html\?raw/.test(mdx))throw new Error(`Raw HTML wrapper is not allowed: ${rel}`)
 write(path.join(out,rel.replace(/\.mdx$/,''),'+Page.mdx'),mdx)
 write(path.join(pub,'markdown',rel.replace(/\.mdx$/,'.md')),mdx)
 const url=route(rel)||'/'
 for(const alias of ['latest','stable'])redirects.push(`/en/${alias}/${rel.replace(/\.mdx$/,'.html')} ${url} 301`)
 links.push(`- [${rel}](https://docs.vuer.ai${url})`)
}
const source=path.join(root,'docs')
fs.rmSync(path.join(pub,'source'),{recursive:true,force:true})
for(const file of walk(source).filter(f=>! /\.(md|rst)$/.test(f))){const dest=path.join(pub,'source',path.relative(source,file));fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(file,dest)}
for(const release of manifest.versions){const tag=release.branch?.replace(/^docs\//,'');if(tag&&!['latest','stable'].includes(tag))redirects.push(`/en/${tag}/* ${release.url}/en/latest/:splat 302`)}
write(path.join(pub,'_redirects'),redirects.join('\n')+'\n/en/latest/ / 301\n/en/stable/ / 301\n/en/* https://vuer-py.readthedocs.io/en/:splat 302\n')
write(path.join(pub,'llms.txt'),'# Vuer\n\n> Event-driven visualization for physical AI, robotics, VR and AR.\n\n'+links.join('\n')+'\n')
const py=['src/vuer','vuer','tassa','nerf_vuer'].find(p=>fs.existsSync(path.join(root,p,'__init__.py')))
if(py)execFileSync(process.env.PYTHON||'python3',['-m','autodoc_py',path.join(root,py),'--output',path.join(out,'python-api'),'--module',path.basename(py),'--url-prefix','/python-api','--section','Python API','--source-url',`https://github.com/vuer-ai/vuer-docs/blob/${process.env.BRANCH||'main'}/${py}`],{stdio:'inherit'})
for(const file of walk(out).filter(f=>f.endsWith('+Page.mdx'))){const rel=path.relative(out,path.dirname(file));if(rel.startsWith('python-api'))write(file,applyNavigation(fs.readFileSync(file,'utf8'),rel));write(path.join(pub,rel+'.md'),fs.readFileSync(file,'utf8'));if(rel.endsWith('/index'))write(path.join(pub,rel.slice(0,-6)+'.md'),fs.readFileSync(file,'utf8'))}
console.log(`Prepared ${sources.length} native MDX pages and generated Python API.`)
