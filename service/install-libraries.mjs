import {spawnSync} from 'node:child_process';
import {LIBRARIES} from './libraries.mjs';
const cli=process.env.ARDUINO_CLI||'arduino-cli';
const config=process.env.ARDUINO_CONFIG_FILE?['--config-file',process.env.ARDUINO_CONFIG_FILE]:[];
function run(args){const result=spawnSync(cli,[...args,...config],{stdio:'inherit',shell:false});if(result.error)throw result.error;if(result.status!==0)process.exit(result.status||1);}
run(['lib','update-index']);
// Dependencies are included explicitly and pinned in this manifest.
for(const library of LIBRARIES.filter(item=>!item.builtin))run(['lib','install','--no-deps',`${library.name}@${library.version}`]);
console.log('CRAB classroom libraries installed.');
