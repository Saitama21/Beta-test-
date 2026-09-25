import fs from 'node:fs';
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('styles.css','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const app=fs.readFileSync('app.js','utf8');
const assert=(c,m)=>{if(!c){console.error('UI/OFFLINE TEST FAILED:',m);process.exit(1)}};

assert(!html.includes('saveBtn'),'approved concept must not contain a save button');
assert(!html.includes('screen-materials'),'materials screen must stay removed');
assert((html.match(/class="dock-item/g)||[]).length===2,'dock must have exactly two items');

assert(/\.dock\{[^}]*position:fixed/i.test(css),'dock must be fixed');
assert(/\.dock\{[^}]*left:50%/i.test(css),'dock left must be 50%');
assert(/\.dock\{[^}]*transform:translateX\(-50%\)/i.test(css),'dock must use translateX(-50%)');
assert(/\.dock\{[^}]*bottom:2px/i.test(css),'dock bottom must be 2px');
assert(/\.dock\{[^}]*width:87%/i.test(css),'dock width must be 87%');
assert(/\.dock\{[^}]*height:68px/i.test(css),'dock height must be 68px');
assert(!/\.dock\{[^}]*safe-area/i.test(css),'dock must not depend on safe area');
assert(/\.app-shell\{[^}]*min-height:100dvh/i.test(css),'app shell must use min-height:100dvh');
assert(css.includes('var(--safe-bottom)'),'safe area must reserve content only');

assert(/\.result-value strong\{[^}]*font-size:58px/i.test(css),'result typography must match the approved reference');
assert(/\.bar-details summary\{[^}]*height:42px/i.test(css),'bar summary must be compact');
assert(css.includes('--blue:#42b8ff'),'Liquid Steel v2.7.1 must expose the blue reflection token');
assert(css.includes('--accent:#ff821d'),'Liquid Steel v2.7.1 must expose the amber token');
assert(css.includes('radial-gradient(ellipse at 73% 2%'),'reference-style background reflections must be present');
assert(css.includes('linear-gradient(155deg,var(--card-b),var(--card-a)'),'cards must use the darker graphite base');
assert(!css.includes('!important'),'clean rebuild must not use override patches');

assert(html.includes('data-theme="dark"'),'Liquid Steel Pro must boot in dark mode');
assert(html.includes('material-select'),'material field must render as selector-style input');
assert(html.includes('id="themeIcon"'),'theme toggle must expose a dedicated light/dark icon');
assert(!html.includes('⚙'),'theme toggle must not render a settings gear');
assert(app.includes("'☀︎':'☾'"),'theme toggle must switch between sun and moon icons');
assert(app.includes("cutcalc.theme.v5"),'Liquid Steel theme storage must use the v5 key');
assert(app.includes("purchaseHint').hidden=true"),'valid result must hide the extra result hint line');
assert(app.includes("scrollRestoration='manual'"),'Safari scroll restoration must be disabled');

assert(!/https?:\/\//i.test(html+css+app),'runtime UI must not depend on remote resources');
assert(app.includes('saveSnapshot'),'history must persist valid calculations without a save button');
assert(sw.includes("const VERSION='2.7.1'"),'offline cache must be versioned');
assert(sw.includes("'./assets/result-rod.webp'"),'result WebP must be precached');
assert(sw.includes('cache.addAll(APP_SHELL)'),'offline shell must cache atomically');
assert(!sw.includes('networkFirst'),'offline shell must not be network-first');
assert(/\.result-art\{[\s\S]*?background:none;[\s\S]*?border:0;[\s\S]*?border-radius:0;[\s\S]*?box-shadow:none;/i.test(css),'result WebP must render directly without a white tile');

console.log('UI and offline contract OK');

assert(css.includes('linear-gradient(128deg,#39bdff'),'reference result card must use dual blue/amber rim lighting');
assert(css.includes('max-width:235px'),'reference rod artwork must be prominent in the result card');
assert(html.includes('Пруток из нержавеющей стали'),'result rod must be the reference artwork');
