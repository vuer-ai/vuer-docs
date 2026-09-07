import { defineConfig } from 'vite'
import { dockit } from '@dreamlake/dockit/vite'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
const manifest = JSON.parse(readFileSync(new URL('./public/versions.json', import.meta.url),'utf8'))
const branch = process.env.BRANCH || execSync('git rev-parse --abbrev-ref HEAD').toString().trim()
export default defineConfig({plugins:[...dockit()],define:{__DOCS_VERSION__:JSON.stringify(branch.startsWith('docs/')?branch.slice(5).replace(/^v/,''):manifest.current),__DOCS_BRANCH__:JSON.stringify(branch),__GIT_HASH__:JSON.stringify(execSync('git rev-parse --short HEAD').toString().trim())},server:{port:3035}})
