const { test }=require('node:test');
const assert=require('node:assert/strict');
const {server,promiseHash,verifyHash}=require('../server');
let root;
test.before(async()=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));root=`http://127.0.0.1:${server.address().port}`;});
test.after(async()=>await new Promise(resolve=>server.close(resolve)));
test('server public routes and security headers',async()=>{const res=await fetch(root+'/');assert.equal(res.status,200);const text=await res.text();assert.match(text,/Prado Vision/);assert.match(res.headers.get('content-security-policy'),/frame-ancestors 'none'/);assert.equal(res.headers.get('x-frame-options'),'DENY');});
test('portal disabled unless DB configured',async()=>{const status=await (await fetch(root+'/api/status')).json();assert.equal(status.portal,'setup_required');const res=await fetch(root+'/api/projects');assert.equal(res.status,503);});
test('unknown static paths cannot read private env/config files',async()=>{for(const path of ['/server.js','/.env','/package.json','/assets/../server.js','/foo.js']){const res=await fetch(root+path);assert.equal(res.status,404,path);}});
test('api rejects wrong origin for mutations',async()=>{const res=await fetch(root+'/api/auth/login',{method:'POST',headers:{'content-type':'application/json',origin:'https://evil.invalid'},body:'{}'});assert.equal(res.status,403);});
test('password hashes use randomized salt and verify securely',async()=>{const first=await promiseHash('minha-senha-com-mais-de-16-caracteres'),second=await promiseHash('minha-senha-com-mais-de-16-caracteres');assert.notEqual(first,second);assert.equal(await verifyHash('minha-senha-com-mais-de-16-caracteres',first),true);assert.equal(await verifyHash('senha-errada',first),false);});

test('new institutional page contains detailed services, FAQ and contact',async()=>{const res=await fetch(root+'/');const html=await res.text();for(const id of ['solucoes','projetos','processo','duvidas','contato'])assert.ok(html.includes('id="'+id+'"'));assert.match(html,/Quanto custa criar um site ou sistema/);assert.equal((html.match(/<details>/g)||[]).length,14);});
test('new public stylesheet and privacy page',async()=>{const [css,privacy]=await Promise.all([fetch(root+'/site-v3.css'),fetch(root+'/privacidade')]);assert.equal(css.status,200);assert.match(css.headers.get('content-type'),/text\/css/);assert.equal(privacy.status,200);assert.match(await privacy.text(),/Política de privacidade/);});
test('portal remains unavailable without configured PostgreSQL',async()=>{const res=await fetch(root+'/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:'{"email":"x@x.com","password":"foo"}'});assert.equal(res.status,503);});
