# CutCalc CNC v2

Compact offline-first PWA for workshop bar-stock calculations.

## v2 redesign

- two screens only: Calculation and History;
- universal material and diameter input with no diameter presets;
- direct meter calculation requires only part length and quantity;
- kerf and facing allowances are optional process losses;
- advanced bar-length mode is collapsed under “Расчёт по пруткам”;
- local history works without accounts or backend;
- all interface graphics are local WebP assets;
- full app shell is precached for offline use;
- no CDN, remote fonts, APIs, or runtime network dependencies.

## Offline

Open the deployed app once while online so the service worker can atomically cache the full app shell. After that, navigation and all bundled assets are served cache-first.
