export default function Board({board}:{board:string}){
 const isUno=board==='uno';
 if(!isUno) return <svg viewBox="0 0 290 196" className="board-art" role="img" aria-label={`${board==='nano'?'Nano ATmega328P':'Mega ATmega2560'} processor diagram`}><g transform="translate(74 35)"><rect x="0" y="0" width="142" height="126" rx="7" fill="#20363a" stroke="#648178"/>{Array.from({length:10},(_,i)=><g key={i}><path d={`M-10 ${14+i*11}H0M142 ${14+i*11}H152`} stroke="#80958c" strokeWidth="5"/></g>)}<circle cx="13" cy="13" r="3" fill="#8da094"/><text x="71" y="62" textAnchor="middle" fill="#d7e1d5" fontFamily="monospace" fontSize="14">{board==='nano'?'ATmega328P':'ATmega2560'}</text><text x="71" y="83" textAnchor="middle" fill="#94ac9c" fontFamily="monospace" fontSize="8">16 MHz · AVR</text></g></svg>;

 return <svg viewBox="0 0 290 196" className="board-art" role="img" aria-label={`${isUno?'Arduino Uno':board==='nano'?'Arduino Nano':'Arduino Mega'} illustrative board. Not a circuit simulator.`}>
 <defs><filter id="shadow" x="-25%" y="-25%" width="150%" height="160%"><feDropShadow dx="0" dy="7" stdDeviation="6" floodOpacity=".18"/></filter><linearGradient id="board" x2="1" y2="1"><stop stopColor="#253c40"/><stop offset="1" stopColor="#14292d"/></linearGradient></defs>
 <g transform="translate(32 22) rotate(-7 112 77)" filter="url(#shadow)">
 <path d="M8 0H215L226 11V144L215 155H8L0 147V8Z" fill="url(#board)" stroke="#446064"/>
 {[ [10,10],[214,14],[10,143],[214,143] ].map(([x,y],i)=><g key={i}><circle cx={x} cy={y} r="5" fill="#acb6ab"/><circle cx={x} cy={y} r="2.7" fill="#17292c"/></g>)}
 <path d="M25 45H76V79H91M40 109H67V127H191M88 29V52H184V64M199 103H185V135M113 46V36H204" fill="none" stroke="#64817b" strokeWidth="1" opacity=".45"/>
 <rect x="-9" y="27" width="45" height="39" rx="2" fill="#afb7b7" stroke="#dce0dc"/><path d="M-6 31H29V60H-6" fill="#667476"/><rect x="-7" y="35" width="8" height="22" fill="#17272b"/>
 <rect x="-4" y="111" width="37" height="26" rx="2" fill="#181d20"/><rect x="-6" y="115" width="12" height="18" rx="4" fill="#40474a"/>
 <rect x="68" y="9" width="139" height="14" rx="1" fill="#101819"/>
 {Array.from({length:14},(_,i)=><rect key={i} x={73+i*9.5} y="13" width="4" height="5" fill="#879991"/>)}
 <rect x="62" y="134" width="145" height="13" rx="1" fill="#101819"/>
 {Array.from({length:14},(_,i)=><rect key={i} x={67+i*10} y="138" width="4" height="5" fill="#879991"/>)}
 <rect x="91" y="90" width="102" height="25" rx="1" fill="#10171a"/>
 {Array.from({length:12},(_,i)=><g key={i}><rect x={95+i*8.2} y="84" width="3" height="6" fill="#a9b4ab"/><rect x={95+i*8.2} y="115" width="3" height="6" fill="#a9b4ab"/></g>)}
 <rect x="50" y="49" width="27" height="25" rx="1" fill="#10171a"/><rect x="38" y="88" width="20" height="9" rx="4" fill="#c3c9c0"/><circle cx="45" cy="118" r="7" fill="#899d98"/><circle cx="63" cy="118" r="7" fill="#899d98"/>
 <rect x="39" y="9" width="17" height="16" fill="#d1d8d1"/><circle cx="47" cy="17" r="5" fill="#982b2f"/>
 <text x="98" y="65" fill="#dee6dc" fontSize="17" fontFamily="Arial" fontWeight="bold" letterSpacing="2">{isUno?'UNO':board==='nano'?'NANO':'MEGA'}</text>
 <text x="98" y="78" fill="#a2b8ad" fontSize="5.5" fontFamily="monospace" letterSpacing="1.5">{isUno?'ARDUINO COMPATIBLE':'ARDUINO'}</text>
 <text x="71" y="32" fill="#c1ccc1" fontSize="5" fontFamily="monospace">DIGITAL (PWM ~)</text><text x="155" y="130" fill="#c1ccc1" fontSize="5" fontFamily="monospace">ANALOG IN</text>
 <rect x="196" y="47" width="4" height="7" fill="#b7ce78"/><circle cx="198" cy="50" r="6" fill="#c9e69b" opacity=".14"/>
 </g></svg>;
}
