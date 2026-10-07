import http from 'node:http';
// Isolated fixture only. Never used by server.mjs or by production deployment.
export async function mockSupabase(){
 let row;const calls=[];
 const server=http.createServer(async(req,res)=>{
  let text='';for await(const c of req)text+=c;const b=text?JSON.parse(text):null;const url=new URL(req.url,'http://mock');calls.push({method:req.method,path:url.pathname});
  const send=(status,x)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(x))};
  if(url.pathname==='/auth/v1/token')return b?.password==='test-password'?send(200,{access_token:b.email==='teacher@example.test'?'test-token':'other-token',expires_in:3600,user:{id:b.email==='teacher@example.test'?'teacher-id':'other-id'}}):send(400,{error:'invalid_grant'});
  if(url.pathname==='/auth/v1/user')return req.headers.authorization==='Bearer test-token'?send(200,{id:'teacher-id'}):send(401,{error:'unauthorized'});
  if(url.pathname==='/auth/v1/logout')return send(200,{});
  if(url.pathname!=='/rest/v1/playday_state'||req.headers.apikey!=='test-secret')return send(403,{});
  if(req.method==='POST'){row??=b;return send(201,null)}
  if(req.method==='GET')return send(200,row?[row]:[]);
  if(req.method==='PATCH'){if(row.version!==Number(url.searchParams.get('version').slice(3)))return send(200,[]);row={...row,...b};return send(200,[row])}
  send(404,{});
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));return {url:'http://127.0.0.1:'+server.address().port,server,calls,get row(){return row}};
}
