# Vuer documentation with DreamLake Dockit

The latest site uses editable MDX in `docs-site/content/` and React components in `docs-site/components/Docs.tsx`. It contains 118 authored pages and generates 38 additional Python API pages from the pinned `dreamlake-ai/autodoc-py` dependency. The original `docs/` sources remain available as migration references and for their media assets.

```sh
cd docs-site
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
npm ci
npm test
PYTHON=.venv/bin/python npm run build
npm run preview
```

Edit `content/**/*.mdx` directly. `npm run build` copies these sources to disposable Vike pages, generates the Python API, prerenders HTML, and builds Pagefind search. HTML is a deployment output; authored pages no longer import HTML strings or use `dangerouslySetInnerHTML`. Code fences, tables, lists and headings are native MDX. Markdown downloads and `/llms.txt` are published alongside the site.

`SceneEmbed`, `DocImage`, `DocVideo`, `Callout` and `DocHero` are reusable React components. `ButtonGroup` and `ButtonOption` present compact, segmented choices, such as Python versus browser installation on the homepage and Getting Started page. Button groups support arrow keys, Home/End, ARIA relationships, and links to headings inside an inactive panel. Sequential instructions remain outside the group. The older `Tabs`/`Tab` names remain compatibility aliases.

```mdx
import { ButtonGroup, ButtonOption } from '@docs/components/Docs'

<ButtonGroup label="Environment">
<ButtonOption label="Python">

Python instructions here.

</ButtonOption>
<ButtonOption label="Browser">

Browser instructions here.

</ButtonOption>
</ButtonGroup>
```

## Legacy import

`scripts/import-legacy.mjs` is a one-time import tool, not part of normal builds. It handles the original MyST/RST sources and converts their rendered structure into native MDX with `scripts/html-to-mdx.mjs`. The importer refuses to overwrite existing content unless explicitly invoked with `--overwrite`; doing so replaces editorial MDX changes, including authored button groups. Preserve edits in Git before any deliberate re-import.

## Historical snapshots

This native MDX conversion applies to the latest `main` site. The 149 historical `docs/<tag>` branches and immutable rendered snapshots retain their original release sources and migration tooling. `archive/<tag>` preserves each unmodified upstream source commit. Rebuild a historical version from its recorded branch and dependencies; never copy current MDX content over an older release.

The production version selector reads `/versions.json`. Each historical entry records its source branch, docs commit, upstream commit and immutable deployment URL; each snapshot exposes `/build-provenance.json`. Reserve `snapshot-*` deployment branches for preservation and never publish newer builds under those names. Corrections need a new snapshot branch name, followed by an explicit catalog update. Netlify retains the latest successful deployment of each branch; replaced deployments can expire under its [retention rules](https://docs.netlify.com/deploy/manage-deploys/manage-deploys-overview/#automatic-deploy-deletion).

The [preservation release](https://github.com/vuer-ai/vuer-docs/releases/tag/docs-preservation-2026-09-07) contains the branch/deployment manifests, publisher scripts and checksums. The original rendered archive remains at https://vuer-docs-archive.netlify.app with https://vuer-py.readthedocs.io as the fallback. Its downloadable original-page capture is explicitly partial: 270 files across 73 versions.

Historical snapshots include a recorded hosting-only repair for extensionless source links. Existing assets retain precedence over its nonforced `/source/*` redirect. The latest MDX sources resolve these links directly.

## Hosting and rollback

Netlify site `vuer-docs` (`67b4e1fc-ebed-4f93-8c1a-8491bddc7bd5`) builds `main` at https://docs.vuer.ai. Current `/en/latest/*.html` links redirect to matching MDX routes. Historical `/en/<tag>/*` links go through their corresponding snapshot's own route map; unknown legacy paths redirect to the original Read the Docs host.

Production can roll back to a prior Netlify deployment. To roll back the domain instead, replace only the managed `docs.vuer.ai` DNS records with the previous `CNAME readthedocs.io` (TTL 3600). Leave other zone records unchanged. Keep the Read the Docs project and custom-domain entry 15530 intact; its Canonical setting was disabled to retain the independent default hostname.

The pinned Dockit compatibility patch preserves the selected branch version after manifest hydration and separates the version menu from the home link. Installation and builds verify the exact expected upstream structure before applying the patch.
