type Env = { COMPILER_URL?:string; COMPILER_TOKEN?:string };
export async function compilerApi(request:Request,env:Env,clientIp?:string):Promise<Response>{
 const path=new URL(request.url).pathname.replace(/^\/api/,'');
 const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
 if(!['/status','/compile','/submit'].includes(path))return json({error:'Not found.'},404);
 if(!env.COMPILER_URL||!env.COMPILER_TOKEN){return path==='/status'?json({compiler:false,email:false,message:'Connect the CRAB compiler service to enable verification.'}):json({error:'Compiler service is not connected. Your sketch is saved locally; connect the compiler to verify it.'},503);}
 if(path==='/status'?request.method!=='GET':request.method!=='POST')return json({error:'Method not allowed.'},405);
 if(request.method==='POST'){
  const origin=request.headers.get('Origin');if(origin&&origin!==new URL(request.url).origin)return json({error:'Use the CRAB workspace to submit this request.'},403);
 }
 try{
  const content=request.method==='POST'?await request.text():undefined;
  if(content&&content.length>100000)return json({error:'Sketch request is too large.'},413);
  const result=await fetch(env.COMPILER_URL.replace(/\/$/,'')+path,{method:request.method,headers:{'Content-Type':'application/json',Authorization:'Bearer '+env.COMPILER_TOKEN,'x-crab-client':clientIp||request.headers.get('cf-connecting-ip')||'local'},body:content,signal:AbortSignal.timeout(50000)});
  return new Response(result.body,{status:result.status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
 }catch{return path==='/status'?json({compiler:false,email:false,message:'Compiler service is offline.'}):json({error:'The compiler service could not be reached. Try again shortly. Your code is saved in this browser.'},503);}
}
