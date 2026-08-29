/* Verifies the route registry, the linking config and the screen registry all
   agree — every route has a screen file, every linked screen is declared by a
   navigator, and no path is registered twice. Runs in plain Node, no emulator.

   This exists because the first cut of linking.js registered redirect aliases
   as screen names that no navigator declared; the bundle still built and the
   failure would only have appeared when someone opened a deep link. */
const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');

function load(file, deps = {}) {
  const { code } = babel.transformFileSync(file, { configFile: './babel.config.js' });
  const m = { exports: {} };
  new Function('module', 'exports', 'require', code)(m, m.exports, (r) => deps[r] || require(r));
  return m.exports;
}

const routes = load('src/navigation/routes.js');
const linking = load('src/navigation/linking.js', {
  './routes': routes,
  '@react-navigation/native': { getStateFromPath: (p) => p },
}).default;

const { ROUTES, REDIRECTS } = routes;
const problems = [];

/* 1. Every route resolves to a screen file. */
const screenFiles = new Set();
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
  const f = path.join(d, e.name);
  if (e.isDirectory()) walk(f);
  else if (e.name.endsWith('.jsx')) screenFiles.add(e.name.replace(/\.jsx$/, ''));
});
walk('src/screens');
Object.keys(ROUTES).forEach((name) => {
  if (!screenFiles.has(name)) problems.push(`route "${name}" has no screen file`);
});

/* 2. Every screen registered for linking exists as a route. */
const cfg = linking.config.screens;
const linked = [
  ...Object.keys(cfg).filter((k) => k !== 'Tabs'),
  ...Object.values(cfg.Tabs.screens).flatMap((v) => Object.keys(v.screens)),
];
linked.forEach((name) => {
  if (!ROUTES[name]) problems.push(`linking config names "${name}", which is not a route`);
});
if (linked.length !== Object.keys(ROUTES).length) {
  problems.push(`linking covers ${linked.length} screens but there are ${Object.keys(ROUTES).length} routes`);
}

/* 3. No duplicate paths — two screens on one URL silently shadow each other. */
const byPath = {};
Object.entries(ROUTES).forEach(([name, c]) => {
  (byPath[c.path] = byPath[c.path] || []).push(name);
});
Object.entries(byPath).forEach(([p, names]) => {
  if (names.length > 1) problems.push(`path "${p}" is claimed by ${names.join(', ')}`);
});

/* 4. Redirects must point at a real path. */
const allPaths = new Set(Object.values(ROUTES).map((c) => `/${c.path}`));
Object.entries(REDIRECTS).forEach(([from, to]) => {
  if (!allPaths.has(to)) problems.push(`redirect ${from} -> ${to} has no destination route`);
});

/* 5. The two legacy misspellings are load-bearing; links in the wild use them. */
const LEGACY = ['pages/terms-and-coditions', 'pages/tax-and-Shipping'];
LEGACY.forEach((p) => {
  if (!Object.values(ROUTES).some((c) => c.path === p)) {
    problems.push(`legacy web path "${p}" is no longer served — old links will 404`);
  }
});

const stubs = Object.keys(ROUTES).filter((name) => {
  const hit = ['storefront', 'cart', 'dashboard', 'services', 'static', 'auth']
    .map((a) => path.join('src/screens', a, `${name}.jsx`))
    .find((f) => fs.existsSync(f));
  return hit && fs.readFileSync(hit, 'utf8').includes('ScreenStub');
});

console.log(`routes: ${Object.keys(ROUTES).length}  linked: ${linked.length}  redirects: ${Object.keys(REDIRECTS).length}`);
console.log(`ported: ${Object.keys(ROUTES).length - stubs.length}/${Object.keys(ROUTES).length}   still stubs: ${stubs.length}`);
if (problems.length) {
  console.log('\nPROBLEMS:');
  problems.forEach((p) => console.log('  - ' + p));
  process.exit(1);
}
console.log('\nall route checks passed');
