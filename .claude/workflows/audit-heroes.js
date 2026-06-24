export const meta = {
  name: 'audit-hero-images',
  description: 'Visually classify every published project hero image; flag floor plans / logos / non-renderings so they can be fixed or unpublished',
  phases: [
    { title: 'List', detail: 'fetch distinct published hero URLs from Supabase' },
    { title: 'Classify', detail: 'download + visually classify each hero image' },
  ],
}

const PROJECT_ID = 'mzdqlhopxfknwqxxuonn'

phase('List')
const LIST_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['items'],
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['slug', 'url'],
        properties: { slug: { type: 'string' }, url: { type: 'string' } },
      },
    },
  },
}

const listed = await agent(
  `Load the Supabase MCP query tool first: call ToolSearch with query "select:mcp__Supabase__execute_sql". Then call mcp__Supabase__execute_sql with project_id "${PROJECT_ID}" and this exact SQL:
select distinct on (hero_image_url) slug, hero_image_url as url from projects where record_status='published' and public_page_enabled=true and hero_image_url like '%/project-media/%' order by hero_image_url, slug;
Return EVERY row as {items:[{slug,url}, ...]} (expect ~125 rows). Do not truncate or summarize.`,
  { schema: LIST_SCHEMA, phase: 'List', label: 'fetch-hero-list' },
)

const items = (listed && listed.items) ? listed.items : []
log(`Got ${items.length} distinct hero images to classify`)
if (items.length === 0) return { count: 0, verdicts: [], note: 'list stage returned no items' }

function chunk(a, n) { const o = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o }
const batches = chunk(items, 8)

const VERDICTS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['verdicts'],
  properties: {
    verdicts: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['slug', 'kind', 'usable_hero', 'reason'],
        properties: {
          slug: { type: 'string' },
          kind: {
            type: 'string',
            enum: ['exterior_rendering', 'interior', 'aerial_render', 'logo', 'floorplan', 'map', 'other', 'error'],
          },
          usable_hero: { type: 'boolean' },
          reason: { type: 'string' },
        },
      },
    },
  },
}

phase('Classify')
const results = await parallel(batches.map((batch, bi) => () =>
  agent(
    `You audit real-estate marketing HERO images. For EACH item, download the image and LOOK at it with the Read tool, then classify.

For each item:
1. Bash: curl -sS --max-time 30 -o "/tmp/h_${bi}_<idx>.<ext>" "<url>"  — <idx> is the item number, <ext> is the file extension at the end of the url (jpg, png, or webp). Use a unique filename per item.
2. Read that file path to actually view the image.
3. Set "kind" to one of:
   - exterior_rendering = architectural rendering or photo of a building/home exterior or streetscape
   - aerial_render = 3D aerial render of a whole community (still a real rendering — usable)
   - interior = interior room/kitchen/lobby/amenity rendering or photo
   - logo = just a logo/wordmark/mostly text, no building shown
   - floorplan = a floor plan, unit layout, site plan, or blueprint line-drawing
   - map = a location/context map
   - other = none of the above
   - error = download failed or file unreadable
4. Set "usable_hero": true ONLY for exterior_rendering / aerial_render / interior that look good as a page hero. false for logo, floorplan, map, other, blank, or error.
Be strict: a multi-panel floor-plan sheet counts as floorplan and usable_hero=false EVEN IF it is wide/landscape.

Items (idx. slug -> url):
${batch.map((it, idx) => `${idx}. ${it.slug} -> ${it.url}`).join('\n')}

Return {verdicts:[{slug,kind,usable_hero,reason}]} covering ALL ${batch.length} items. reason <= 12 words.`,
    { schema: VERDICTS_SCHEMA, phase: 'Classify', label: `batch ${bi + 1}/${batches.length}` },
  ).then((r) => (r && r.verdicts) ? r.verdicts : []),
))

const all = results.flat().filter(Boolean)
const bad = all.filter((v) => v && v.usable_hero === false)
return {
  total_classified: all.length,
  flagged_count: bad.length,
  flagged: bad,
  all: all,
}
