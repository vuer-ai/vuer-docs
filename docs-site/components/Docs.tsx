import React, {Children, isValidElement, useId, useState, useRef, useEffect, type HTMLAttributes, type IframeHTMLAttributes, type ImgHTMLAttributes, type VideoHTMLAttributes, type ReactNode} from 'react'

export function SceneEmbed({title='Interactive Vuer scene',loading='lazy',className='',style,...props}:IframeHTMLAttributes<HTMLIFrameElement>){
 return <iframe {...props} title={title} loading={loading} className={`doc-scene ${className}`} style={style} />
}
export function DocImage({alt='',loading='lazy',...props}:ImgHTMLAttributes<HTMLImageElement>){return <img {...props} alt={alt} loading={loading} className={`doc-image ${props.className||''}`} />}
export function DocVideo(props:VideoHTMLAttributes<HTMLVideoElement>){return <video controls {...props} className={`doc-video ${props.className||''}`} />}
export function Callout({children,...props}:HTMLAttributes<HTMLElement>){return <aside {...props} className={`doc-callout ${props.className||''}`}>{children}</aside>}
export function ButtonOption({children}: {label:string;id?:string;children:ReactNode}){return <>{children}</>}
export function ButtonGroup({label='Options',children}: {label?:string;children:ReactNode}){
 const tabs=Children.toArray(children).filter(isValidElement<{label:string;id?:string;children:ReactNode}>)
 const [active,setActive]=useState(0),id=useId(),root=useRef<HTMLDivElement>(null)
 useEffect(()=>{
  const revealHash=()=>{
   let hash:string
   try {hash=decodeURIComponent(window.location.hash.slice(1))} catch {return}
   const target=hash?document.getElementById(hash):null
   if(!target||!root.current?.contains(target))return
   const panels=[...root.current.querySelectorAll('[data-button-panel]')]
   const index=panels.findIndex(panel=>panel.contains(target))
   if(index>=0)setActive(index)
  }
  revealHash();window.addEventListener('hashchange',revealHash)
  return ()=>window.removeEventListener('hashchange',revealHash)
 },[])

 return <div ref={root} className="doc-button-options">
  <div role="group" aria-label={label} className="doc-button-group">
   {tabs.map((tab,index)=><button key={index} type="button" id={`${id}-tab-${index}`} aria-pressed={index===active} aria-controls={tab.props.id||`${id}-panel-${index}`} tabIndex={index===active?0:-1} onClick={()=>setActive(index)} onKeyDown={event=>{
    let next=index
    if(event.key==='ArrowRight')next=(index+1)%tabs.length
    else if(event.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length
    else if(event.key==='Home')next=0
    else if(event.key==='End')next=tabs.length-1
    else return
    event.preventDefault();setActive(next)
    const buttons=event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('button');buttons?.[next]?.focus()
   }}>{tab.props.label}</button>)}
  </div>
  {tabs.map((tab,index)=><section key={index} data-button-panel role="region" id={tab.props.id||`${id}-panel-${index}`} aria-labelledby={`${id}-tab-${index}`} tabIndex={0} hidden={index!==active}>{tab.props.children}</section>)}
 </div>
}

export function DocHero(){return <h1 className="doc-hero"><code>vuer</code><span>An Event-Driven, Declarative Visualization Framework for Physical AI</span></h1>}

// Compatibility for existing MDX consumers; inline choices share the button group.
export { ButtonGroup as Tabs, ButtonOption as Tab }
