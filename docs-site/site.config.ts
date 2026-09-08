import { sectionOrder, tabs } from './navigation/structure.mjs'
import { initDocs, type PageFrontmatter } from '@dreamlake/dockit'
// Passing full MDX module namespaces retains every page body in the startup bundle.
const pageMetadata = import.meta.glob<PageFrontmatter>('./pages/**/+Page.mdx', {
  eager: true, query: '?frontmatter', import: 'default',
})
// Production search uses Pagefind; dev retains a full-text fallback.
const rawPages = import.meta.env.DEV
  ? import.meta.glob<string>('./pages/**/+Page.mdx', { eager: true, query: '?raw', import: 'default' })
  : undefined
initDocs({site:{brand:'Vuer',subtitle:'docs',repoUrl:'https://github.com/vuer-ai/vuer',docsRepoUrl:'https://github.com/vuer-ai/vuer-docs',docsBranch:__DOCS_BRANCH__,docsPagesPath:'docs-site/content',breadcrumbRoot:'Vuer',url:'https://docs.vuer.ai',skill:'vuer',summary:'An event-driven, declarative visualization framework for physical AI, robotics, VR and AR.',versionChips:[{label:'Python',version:__DOCS_VERSION__,dropdown:true}],gitHash:__GIT_HASH__,themeToggle:'segmented'},pageMetadata,rawPages,sectionOrder,tabs})
