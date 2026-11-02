import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const root=resolve('site');
createServer(async(req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const file=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(root+sep))throw Error();const body=await readFile(file);res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json'})[extname(file)]||'application/octet-stream');res.end(body);}catch{res.writeHead(404);res.end('찾을 수 없습니다.');}}).listen(8000,'127.0.0.1',()=>console.log('http://localhost:8000'));
