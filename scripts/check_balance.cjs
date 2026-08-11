const fs = require('fs');
const path = 'src/components/AdminPortal.tsx';
const s = fs.readFileSync(path, 'utf8');
const match = (re) => (s.match(re) || []).length;
const counts = {
  divOpen: match(/<div[\s>]/g),
  divClose: match(/<\/div>/g),
  parenOpen: match(/\(/g),
  parenClose: match(/\)/g),
  braceOpen: match(/\{/g),
  braceClose: match(/\}/g),
  angleOpen: match(/</g),
  angleClose: match(/>/g),
};
console.log(counts);

// find line with specific problematic sequence
const lines = s.split(/\r?\n/);
lines.forEach((l, i) => {
  if (l.includes(")}") || l.trim().endsWith(")") ) {
    // show lines around
    if (l.includes(")}") || l.includes(") : (") || l.trim().endsWith(")}"))
      console.log(i+1, l);
  }
});

// print nearby around 660-680
console.log('\n--- context 660-680 ---');
for (let i=659;i<681;i++){
  if (lines[i]) console.log(i+1, lines[i]);
}
