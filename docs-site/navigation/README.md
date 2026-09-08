# Documentation navigation

`structure.mjs` owns sidebar labels, reading order, hidden duplicate entries, and the five top-level tabs. `prepare.mjs` applies this metadata to generated MDX; original content URLs and headings remain intact. Add new authored pages to this map: an unclassified page fails the build instead of silently appearing in the wrong tab.

The Components and Examples landing pages own their catalog cards. Keep card categories consistent with the navigation map (checked by `npm test`). The existing first-scene tutorial remains linked as a worked example from the canonical First Scene guide.

Dockit 0.2.14 supports a single URL prefix per tab. `patch-dockit.mjs` maps legacy `/api` and `/rtc` routes into Python API, and the existing release URLs into Releases. It also keeps previous/next navigation within the current tab. These compatibility patches are checked against the pinned package at install/build time.

Only current documentation uses this arrangement; preserved version branches and archived deployments retain their original content.
