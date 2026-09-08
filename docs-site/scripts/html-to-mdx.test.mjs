import test from 'node:test'
import assert from 'node:assert/strict'
import {compile} from '@mdx-js/mdx'
import remarkGfm from 'remark-gfm'
import {htmlToMdx} from './html-to-mdx.mjs'

test('HTML converts to compilable MDX with literal code, JSX props and retained anchors',async()=>{
 const mdx=htmlToMdx('<h2 id="legacy-anchor">Hello {world}</h2><p>A &amp; B: <code>x &lt; y</code></p><pre><code class="language-python">data = {"x": "&lt;tag&gt;"}\n</code></pre><iframe src="https://vuer.ai/?a=1&amp;b=2" title="Robot scene" height="350px"></iframe><img src="/source/a.png" alt="A robot" style="max-width: 50%; margin-left: 2px"><details><summary>More</summary><p>Body</p></details>')
 assert.match(mdx,/## Hello \\\{world\}/)
 assert.match(mdx,/id="legacy-anchor"/)
 assert.match(mdx,/```python\ndata = \{"x": "<tag>"\}/)
 assert.match(mdx,/<SceneEmbed src="https:\/\/vuer.ai\/\?a=1&b=2" title="Robot scene"/)
 assert.match(mdx,/"maxWidth":"50%","marginLeft":"2px"/)
 assert.match(mdx,/<details>/)
 assert.doesNotMatch(mdx,/dangerouslySetInnerHTML|\?raw/)
 await compile(mdx,{remarkPlugins:[remarkGfm]})
})
test('tables, callouts, lists and ordered-list starts survive as MDX',async()=>{
 const mdx=htmlToMdx('<blockquote><p><strong>Note</strong></p><p>Keep this.</p></blockquote><ol start="5"><li>Fifth</li></ol><table><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td>one</td><td>two</td></tr></tbody></table>')
 assert.match(mdx,/<Callout>/);assert.match(mdx,/5\. Fifth/);assert.match(mdx,/\| one \| two \|/)
 await compile(mdx,{remarkPlugins:[remarkGfm]})
})
