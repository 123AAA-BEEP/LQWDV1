# Hero image audit — 2026-06-24

Every distinct published project hero image was downloaded and visually
classified (rendering / interior / logo / floor plan / map). Of 141 classified,
**69 distinct images were unusable as a hero** (→ 74 published projects, since
some share one rehosted image). Those were unpublished (reverted to `draft`,
public page deactivated) by migration `0031_unpublish_floorplan_logo_heroes.sql`
— reversible. Tag in `import_notes`: `[hero audit 2026-06-24: ...]`.

## Why
LIQWD image rule: a floor plan is a last resort, never the single hero
(rendering > exterior > interior > logo > floor plan). Re-publish each once a
real rendering replaces the hero (admin Projects → Publish, or bulkPublish).

## Breakdown
- **floorplan**: 51
- **logo**: 12
- **map**: 4
- **other**: 2

## Flagged projects (need a real rendering)

| slug | kind | reason |
|---|---|---|
| amber-woods | floorplan | Unit floor plan sheet, multiple levels labeled |
| auden-grand-towns | floorplan | Multi-panel floor plan sheet titled London |
| aurora-trails | floorplan | Floor plan sheet with small rendering inset |
| bayview-heights | floorplan | Floor plan sheet The Anne with elevation thumbnails |
| birchley-park | floorplan | Jr 1-bedroom unit floor plan layout. |
| brooklin-trails | floorplan | Sage multi-panel townhome floor plan sheet |
| brooklin-vue | floorplan | Multi-panel unit floor plan sheet |
| classic-drive | floorplan | Multi-panel floor plan sheet with room layouts |
| eagles-view | floorplan | Townhome floor plan sheet, The Maui |
| eleven-altamont | floorplan | Multi-panel unit floor plan sheet for The Soho |
| garden-square | floorplan | Multi-panel floor plan sheet 'Wyndfield' |
| georgina-view | floorplan | Floor plan sheet with small elevation thumbnails |
| high-point | floorplan | Multi-panel elevation and floor plan sheet |
| homeward-hills | floorplan | Multi-elevation floor plan sheet, line drawings |
| ivy-rouge | floorplan | Multi-level floor plan line-drawing sheet |
| leaside-common | floorplan | Penthouse unit floor plan line drawing. |
| lifestyles-of-south-east-oakville | floorplan | Multi-panel floor plan layout sheet |
| manors-on-mayfield | floorplan | Floor-plan sheet dominates, tiny building inset |
| mapleside-meadows | floorplan | Multi-panel floor plan sheet with elevation collections |
| meadowvale-brooks | floorplan | Multi-panel single-family floor plan sheet |
| mila | floorplan | Multi-panel Ashwood floor plan sheet |
| oakbrook | floorplan | Townhome floor plan sheet, Aspen collection |
| osprey-mills | floorplan | Basement and ground floor plan drawing. |
| parkside-heights | floorplan | Multi-panel floor plan sheet The Edwin |
| plaza-on-yonge | floorplan | Suite 1-A condo unit floor plan |
| rise-at-stride | floorplan | Condo unit layout floor plan. |
| rosedale-village | floorplan | Multi-panel floor plan sheet for Sabrina model |
| seaton | floorplan | Semi-detached floor plan sheet, multiple panels |
| seaton-whitevale | floorplan | Floor plan sheet for The Belmont home |
| seaton-winding-woods | floorplan | Multi-panel townhome floor plan sheet |
| sincerely-acorn | floorplan | Multi-panel townhome floor plan sheet |
| sixty-five-broadway | floorplan | Unit floor plan with key plans |
| south-cornell | floorplan | Floor plan sheet Grand RL-2, Countrywide |
| southcal | floorplan | Multi-panel unit floor plan sheet 'The Dune' |
| springwater | floorplan | Spec sheet with elevations and floor plans. |
| summer-valley | floorplan | Multi-panel floor plan sheet, not a hero |
| taywood-estates | floorplan | Elevation photo plus floor plan panel sheet. |
| terrace-park-towns | floorplan | Multi-panel Oakwood floor plan sheet |
| textbook-towns | floorplan | Unit A floor plan with ground/second floor layouts |
| townsquare | floorplan | Floor plan sheet with garage and bedroom layouts |
| trafalgar-highlands | floorplan | Floor plan sheet The Daisy with elevation thumbnails |
| unity | floorplan | Floor plan sheet Garden Collection Model G-INT |
| upper-caledon-east | floorplan | Multi-level floor plan sheet for Evans model. |
| upper-mayfield-estates | floorplan | The Ruby 1 multi-level floor plan sheet |
| victory-green | floorplan | Multi-panel townhome floor plan sheet, The Howe |
| west-brooklin | floorplan | Multi-panel Myles floor plan sheet |
| westfield | floorplan | Multi-panel floor plan sheet, The Andover. |
| whitby-meadows | floorplan | Multi-panel floor plan sheet, Honey model |
| whitehorn-woods-2 | floorplan | Multi-panel townhome floor plan collection sheet |
| woodend-place | floorplan | Multi-panel BOYD townhome floor plans |
| yt-on-fourth | floorplan | Multi-panel floor plan sheet, The Dallaire |
| 1414-bayview | logo | Text-only wordmark, no building shown |
| camilla-king | logo | Just a wordmark logo, no building shown |
| curio-condos | logo | White CURIO wordmark on navy, no building. |
| fields-of-harmony | logo | Stylized wordmark on black, no building shown |
| forest-hill-private-residences | logo | Gold wordmark logo on navy, no building shown |
| hawthorne-east-village-3 | logo | Wordmark with tree icon, no building |
| millcroft-towns | logo | Logo emblem with wordmark, no building |
| panorama | logo | Royalpark Panorama Milton wordmark, no building. |
| tanglewood | logo | Gold wordmark logo, no building shown |
| unionville-station | logo | Logo wordmark with clock, no building |
| uptown-meadowvale | logo | Just a wordmark logo, no building |
| yardley-towns | logo | Wordmark logo on black, no building |
| brooklin-towns | map | Location context map with presentation centre. |
| harmony-crossing | map | Location context map with 2.5km radius |
| heartwood-village | map | Aerial location map with street labels |
| huntingdale-towns | map | Location context map with amenities |
| queens-lane | other | Marketing brochure sheet, heavy text and collection panels |
| westshore | other | Brochure spread with text panels and page numbers. |
