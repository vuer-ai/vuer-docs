import { unified } from 'unified'
import rehypeParse from 'rehype-parse'
import rehypeRemark from 'rehype-remark'
import remarkStringify from 'remark-stringify'
import remarkMdx from 'remark-mdx'
import remarkGfm from 'remark-gfm'
import { defaultHandlers } from 'hast-util-to-mdast'
import styleToJs from 'style-to-js'
import GithubSlugger from 'github-slugger'

const componentNames={iframe:'SceneEmbed',img:'DocImage',video:'DocVideo',blockquote:'Callout'}
const inline=new Set(['span','code','a','i','b','em','strong','br','img'])
function attribute(name,value){
 if(value===false||value==null)return null
 if(name==='style')value=styleToJs(value,{reactCompat:true})
 if(Array.isArray(value))value=value.join(' ')
 return {type:'mdxJsxAttribute',name,value:value===true?null:typeof value==='string'?value:{type:'mdxJsxAttributeValueExpression',value:JSON.stringify(value)}}
}
export function htmlToMdx(html){
 const used=new Set(),slugger=new GithubSlugger()
 const text=n=>n.type==='text'?n.value:(n.children||[]).map(text).join('')
 const jsx=(state,node)=>{
  const name=componentNames[node.tagName]||node.tagName
  if(componentNames[node.tagName])used.add(name)
  return {type:inline.has(node.tagName)?'mdxJsxTextElement':'mdxJsxFlowElement',name,attributes:Object.entries(node.properties||{}).map(([k,v])=>attribute(k,v)).filter(Boolean),children:state.all(node)}
 }
 const handlers={}
 for(const tag of ['iframe','img','video','source','blockquote','details','summary','div','span','link','aside'])handlers[tag]=jsx
 for(const tag of ['p','code','a'])handlers[tag]=(s,n)=>Object.keys(n.properties||{}).some(k=>!['href','title','className'].includes(k))?jsx(s,n):defaultHandlers[tag](s,n)
 for(let i=1;i<=6;i++)handlers['h'+i]=(s,n)=>{
  const id=slugger.slug(text(n))
  if(n.properties.style||n.properties.className)return jsx(s,n)
  const heading=defaultHandlers[n.tagName](s,n)
  return n.properties.id&&n.properties.id!==id?[{type:'mdxJsxFlowElement',name:'a',attributes:[attribute('id',n.properties.id)],children:[]},heading]:heading
 }
 const processor=unified().use(rehypeParse,{fragment:true}).use(rehypeRemark,{handlers}).use(remarkGfm).use(remarkMdx).use(remarkStringify,{fences:true,bullet:'-',emphasis:'*'})
 const body=String(processor.processSync(html))
 return (used.size?`import { ${[...used].sort().join(', ')} } from '@docs/components/Docs'\n\n`:'')+body
}
