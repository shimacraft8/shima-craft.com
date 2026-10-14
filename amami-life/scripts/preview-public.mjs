import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve,extname,sep } from "node:path";
import worker from "../worker/index.mjs";
const base=resolve(import.meta.dirname,"../dist/public");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".svg":"image/svg+xml"};
const env={
  ASSETS:{async fetch(request){
    const path=resolve(base,"."+new URL(request.url).pathname);
    if(!path.startsWith(base+sep)) return new Response("Forbidden",{status:403});
    try{return new Response(await readFile(path),{headers:{"Content-Type":mime[extname(path)] ?? "application/octet-stream"}});}catch{return new Response("Not found",{status:404});}
  }},
  SHIMA_ORIGIN:{async fetch(request){
    const url=new URL(request.url);url.protocol="https:";url.hostname="shima-craft.com";url.port="";
    const headers=new Headers(request.headers);headers.delete("host");
    return fetch(new Request(url,{method:request.method,headers}));
  }},
};
createServer(async(req,res)=>{
  try{
    const request=new Request("http://127.0.0.1:4914"+req.url,{method:req.method,headers:req.headers});
    const response=await worker.fetch(request,env);
    const headers=new Headers(response.headers);
    headers.delete("content-encoding"); headers.delete("content-length");
    res.writeHead(response.status,Object.fromEntries(headers));
    res.end(req.method==="HEAD" ? undefined : Buffer.from(await response.arrayBuffer()));
  }catch{res.writeHead(500);res.end("Preview request failed");}
}).listen(4914,"127.0.0.1",()=>console.log("SHIMA CRAFT public-build preview: http://127.0.0.1:4914/"));
