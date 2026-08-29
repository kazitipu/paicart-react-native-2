const babel = require('@babel/core');
const fs = require('fs'), path = require('path');
const roots = process.argv.slice(2);
let files = [], bad = 0;
const walk = (d) => fs.readdirSync(d, {withFileTypes:true}).forEach(e => {
  const f = path.join(d, e.name);
  if (e.isDirectory()) walk(f);
  else if (/\.(js|jsx)$/.test(e.name)) files.push(f);
});
roots.forEach(r => fs.statSync(r).isDirectory() ? walk(r) : files.push(r));
files.sort().forEach(f => {
  try {
    babel.transformFileSync(f, { cwd: process.cwd(), babelrc: true, configFile: './babel.config.js' });
    console.log('ok    ' + f);
  } catch (e) {
    bad++;
    console.log('ERROR ' + f + '\n      ' + String(e.message).split('\n')[0]);
  }
});
console.log(`\n${files.length} files, ${bad} error(s)`);
process.exit(bad ? 1 : 0);
