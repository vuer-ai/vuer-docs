import { readFile } from 'node:fs/promises'
import { parse } from 'yaml'
import type { Plugin } from 'vite'

/** Load only YAML metadata, without importing or compiling the MDX body. */
export function mdxFrontmatterLoader(): Plugin {
  const prefix = '\0dockit-frontmatter:'
  return {
    name: 'dockit-frontmatter',
    enforce: 'pre',
    async resolveId(id, importer) {
      if (!id.endsWith('.mdx?frontmatter')) return null
      const resolved = await this.resolve(id.slice(0, -'?frontmatter'.length), importer, { skipSelf: true })
      return resolved ? prefix + resolved.id : null
    },
    async load(id) {
      if (!id.startsWith(prefix)) return null
      const file = id.slice(prefix.length)
      this.addWatchFile(file)
      const source = await readFile(file, 'utf8')
      const match = source.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n(?:---|\.\.\.)(?:\r?\n|$)/)
      const metadata = match ? parse(match[1]) ?? {} : {}
      if (typeof metadata !== 'object' || Array.isArray(metadata)) {
        throw new Error(`Expected a YAML frontmatter mapping in ${file}`)
      }
      return `export default ${JSON.stringify(metadata)};`
    },
  }
}
