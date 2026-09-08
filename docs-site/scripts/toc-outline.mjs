// Build hierarchy from the actual heading sequence, including skipped levels.
export function outlineHeadings(headings) {
  const stack = [], seen = new Set(), result = [];
  for (const heading of headings) {
    if (!heading.id || seen.has(heading.id)) continue;
    seen.add(heading.id);
    while (stack.length && stack.at(-1).level >= heading.level) stack.pop();
    result.push({ ...heading, depth: stack.length, ancestors: stack.map(h => h.id) });
    stack.push(heading);
  }
  return result;
}
export function visibleOutline(headings, collapsed) {
  return headings.filter(h => !h.ancestors.some(id => collapsed.has(id)));
}
