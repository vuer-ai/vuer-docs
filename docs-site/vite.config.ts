import { mdxFrontmatterLoader } from './scripts/mdx-frontmatter-loader'
import { defineConfig, type Plugin } from 'vite'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { dockit } from '@dreamlake/dockit/vite'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
const manifest = JSON.parse(readFileSync(new URL('./public/versions.json', import.meta.url),'utf8'))
const branch = process.env.BRANCH || execSync('git rev-parse --abbrev-ref HEAD').toString().trim()
// Keep bookmarks created by the previous sidebar working in local previews.
const catalogAliases = (): Plugin => {
  const middleware = (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = new URL(req.url || '/', 'http://localhost');
    if (/^\/(components|examples)\/index\/?$/.test(url.pathname)) {
      res.statusCode = 301;
      res.setHeader('Location', url.pathname.replace(/\/index\/?$/, '') + url.search);
      res.end();
    } else next();
  };
  return { name: 'vuer-catalog-aliases', configureServer(server) { server.middlewares.use(middleware); }, configurePreviewServer(server) { server.middlewares.use(middleware); } };
};
export default defineConfig({resolve:{alias:{'@docs':fileURLToPath(new URL('.',import.meta.url))}},plugins:[mdxFrontmatterLoader(),catalogAliases(),...dockit()],define:{__DOCS_VERSION__:JSON.stringify(branch.startsWith('docs/')?branch.slice(5).replace(/^v/,''):manifest.current),__DOCS_BRANCH__:JSON.stringify(branch),__GIT_HASH__:JSON.stringify(execSync('git rev-parse --short HEAD').toString().trim())},server:{port:3035}})
