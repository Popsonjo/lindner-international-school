const fs = require('fs');
const s = fs.readFileSync('src/components/AdminPortal.tsx','utf8');
const lines = s.split(/\r?\n/);
const opens=[];
for(let i=0;i<lines.length;i++){
  const line = lines[i];
  // find all <div occurrences that are not closing
  let idx = 0;
  while(true){
    const open = line.indexOf('<div', idx);
    const close = line.indexOf('</div>', idx);
    if(open===-1 && close===-1) break;
    if(open!==-1 && (close===-1 || open<close)){
      opens.push({type:'open',line:i+1,text:line.substring(open, open+50)});
      idx = open+4;
    } else {
      opens.push({type:'close',line:i+1,text:line.substring(close, close+6)});
      idx = close+6;
    }
  }
}

const stack=[];
for(const token of opens){
  if(token.type==='open') stack.push(token);
  else {
    if(stack.length===0){
      console.log('Unmatched close at', token.line);
    } else stack.pop();
  }
}

if(stack.length) {
  console.log('Unclosed <div> openings:');
  stack.forEach(t=>console.log(t.line,t.text));
} else console.log('All <div> tags matched');

// print last 40 lines with numbers
console.log('\n--- last 40 lines ---');
for(let i=Math.max(0,lines.length-40); i<lines.length;i++){
  console.log(i+1, lines[i]);
}
