import { createElectronParser } from './dist/index.js';

const parser = createElectronParser({
  cwd: 'C:/Users/ErnestW11/DEVPROJECTS/Yggdrasil',
  config: {},
});

const result = parser.parseFile('C:/Users/ErnestW11/DEVPROJECTS/Yggdrasil/src/main/main.ts');
console.log('Found', result.length, 'IPC channels');
result.forEach((ch, i) => {
  console.log(`  ${i+1}. ${ch.method} ${ch.path}`);
  if (ch.summary) console.log(`     ${ch.summary}`);
});
