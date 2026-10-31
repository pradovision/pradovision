'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { promisify } = require('node:util');
const scrypt = promisify(crypto.scrypt);
let PgPool;
try { PgPool = require('pg').Pool; } catch { /* allow static-only local preview without installing pg */ }
const PORT = Number(process.env.PORT || 3000);
const PROD = process.env.NODE_ENV === 'production';
const base = path.join(__dirname, 'public');
const db = PgPool && process.env.DATABASE_URL ? new PgPool({ connectionString: process.env.DATABASE_URL, max: 5, idleTimeoutMillis: 20000, connectionTimeoutMillis: 6000, ssl: /\.railway\.internal|localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL) ? false : { rejectUnauthorized: true } }) : null;
let databaseReady = false;
const attempts = new Map();
const types = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.webp':'image/webp', '.ico':'image/x-icon', '.xml':'application/xml; charset=utf-8', '.txt':'text/plain; charset=utf-8' };
const validEmail = e => typeof e === 'string' && e.length < 200 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const clean = (str,max=160) => typeof str === 'string' ? str.trim().slice(0,max) : '';
const randomToken = () => crypto.randomBytes(32).toString('base64url');
const digest = s => crypto.createHash('sha256').update(s).digest('hex');
const promiseHash = async password => { const salt=crypto.randomBytes(16).toString('hex'); const key=await scrypt(password,salt,64);return `scrypt:${salt}:${key.toString('hex')}`; };
async function verifyHash(password, hash) {try { const [scheme,salt,hex]=hash.split(':'); if(scheme!=='scrypt')return false;const got=await scrypt(password,salt,64);return crypto.timingSafeEqual(got,Buffer.from(hex,'hex'));}catch{return false;} }
const send = (res, status, body, extra={}) => {res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...extra});res.end(JSON.stringify(body));};
const error = (res,status,message) => send(res,status,{error:message});
const query = async (sql,values=[]) => { if(!databaseReady) throw new Error('DB_UNAVAILABLE'); return db.query(sql,values);};
const accessIp = req => String(req.socket.remoteAddress||'unknown'); // not spoofable forwarded headers
function limiter(key,max=12,period=60000) {const now=Date.now(); const bucket=attempts.get(key); if(!bucket || bucket.until < now){attempts.set(key,{count:1,until:now+period});return true;}bucket.count++;return bucket.count<=max;}
setInterval(()=>{const now=Date.now();for(const [key,value] of attempts){if(value.until<now)attempts.delete(key);}},120000).unref();
function commonHeaders(res) {
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Cross-Origin-Opener-Policy','same-origin');
  res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('Content-Security-Policy',"default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; upgrade-insecure-requests");
  if(PROD) res.setHeader('Strict-Transport-Security','max-age=31536000');
}
async function body(req) {return new Promise((resolve,reject)=>{let text='';req.on('data',d=>{text+=d;if(text.length>16000){reject(new Error('TOO_LARGE'));req.destroy();}});req.on('end',()=>{try{resolve(JSON.parse(text||'{}'));}catch{reject(new Error('INVALID_JSON'));}});req.on('error',reject);});}
function corsGuard(req) { if(['GET','HEAD','OPTIONS'].includes(req.method)) return true; const origin=req.headers.origin; if (!origin) return true; try { return new URL(origin).host === req.headers.host; } catch {return false;} }
function cookie(req,name) {return (req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='))?.slice(name.length+1)||'';}
async function session(req) {if(!databaseReady)return null;const token=cookie(req,'pv_session');if(!/^[\w-]{35,100}$/.test(token))return null;const r=await query('SELECT s.id AS sid, s.csrf, u.id, u.name, u.email, u.role, u.must_change_password FROM sessions s JOIN users u ON s.user_id=u.id WHERE s.token_hash=$1 AND s.expires_at > NOW() AND u.active=true',[digest(token)]);return r.rows[0]||null;}
function securityCookie(token){return `pv_session=${token}; HttpOnly; ${PROD?'Secure; ':''}SameSite=Strict; Path=/api; Max-Age=28800`;}
function expiredCookie(){return `pv_session=; HttpOnly; ${PROD?'Secure; ':''}SameSite=Strict; Path=/api; Max-Age=0`;}
async function audit(userId,action,entityId=null){try {await query('INSERT INTO audit_log(actor_id,action,entity_id) VALUES ($1,$2,$3)',[userId,action,entityId]);} catch(e){console.error('audit failed',e.message);}}
async function initDb() {
 if(!db)return;
 try {
 await db.query(`CREATE TABLE IF NOT EXISTS users (id BIGSERIAL PRIMARY KEY, name VARCHAR(150) NOT NULL, email VARCHAR(200) NOT NULL UNIQUE, password_hash TEXT NOT NULL, role VARCHAR(12) NOT NULL CHECK (role IN ('admin','client')), active BOOLEAN NOT NULL DEFAULT true, must_change_password BOOLEAN NOT NULL DEFAULT false, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
 CREATE TABLE IF NOT EXISTS clients (id BIGSERIAL PRIMARY KEY, user_id BIGINT REFERENCES users(id), company VARCHAR(180), notes TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
 CREATE TABLE IF NOT EXISTS projects (id BIGSERIAL PRIMARY KEY, title VARCHAR(160) NOT NULL, description TEXT, client_id BIGINT REFERENCES clients(id), stage VARCHAR(20) NOT NULL DEFAULT 'planejamento' CHECK(stage IN ('planejamento','desenvolvimento','validacao','entregue','pausado')), progress INTEGER NOT NULL DEFAULT 0 CHECK(progress BETWEEN 0 AND 100), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
 CREATE TABLE IF NOT EXISTS tickets (id BIGSERIAL PRIMARY KEY, project_id BIGINT REFERENCES projects(id), client_id BIGINT REFERENCES clients(id), subject VARCHAR(160) NOT NULL, description TEXT NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'aberto' CHECK(status IN ('aberto','em_analise','resolvido')), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
 CREATE TABLE IF NOT EXISTS sessions (id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE, token_hash CHAR(64) NOT NULL UNIQUE, csrf CHAR(43) NOT NULL, expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
 CREATE TABLE IF NOT EXISTS audit_log (id BIGSERIAL PRIMARY KEY, actor_id BIGINT REFERENCES users(id), action VARCHAR(100) NOT NULL, entity_id BIGINT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
 CREATE INDEX IF NOT EXISTS idx_project_client ON projects(client_id);
 CREATE INDEX IF NOT EXISTS idx_ticket_client ON tickets(client_id);
 CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);`);
 databaseReady=true;
 if(validEmail(process.env.ADMIN_EMAIL) && typeof process.env.ADMIN_BOOTSTRAP_PASSWORD==='string' && process.env.ADMIN_BOOTSTRAP_PASSWORD.length>=16) {
   const exists=await query('SELECT COUNT(*)::int AS n FROM users WHERE role=$1',['admin']);
   if(exists.rows[0].n===0){const hash=await promiseHash(process.env.ADMIN_BOOTSTRAP_PASSWORD);await query('INSERT INTO users(name,email,password_hash,role) VALUES ($1,$2,$3,$4)',['Administrador Prado Vision',process.env.ADMIN_EMAIL.toLowerCase(),hash,'admin']);console.log('Initial administrator created: remove ADMIN_BOOTSTRAP_PASSWORD variable now.');}
 }
 console.log('Database ready');
 } catch(e){databaseReady=false;console.error('Database startup issue:',e.message);}
}
async function serveFile(req,res,requested) {
 const filePath=path.resolve(base,requested.replace(/^\/+/,''));
 if(!filePath.startsWith(base+path.sep) || filePath.split(path.sep).some(s=>s.startsWith('.')))return error(res,404,'Não encontrado');
 const extension=path.extname(filePath).toLowerCase(); if(!types[extension])return error(res,404,'Não encontrado');
 try {const stats=await fs.promises.stat(filePath);if(!stats.isFile())return error(res,404,'Não encontrado');res.writeHead(200,{'Content-Type':types[extension],'Cache-Control':extension==='.html'?'no-store':'public, max-age=300'});if(req.method==='HEAD')return res.end();fs.createReadStream(filePath).pipe(res);}catch{return error(res,404,'Não encontrado');}
}
async function api(req,res,url) {
 const method=req.method,p=url.pathname;
 if(!corsGuard(req))return error(res,403,'Origem não permitida');
 if(method==='GET'&&p==='/api/status')return send(res,200,{portal:databaseReady?'available':'setup_required'});
 if(!databaseReady)return error(res,503,'Portal em configuração. Nenhum acesso administrativo foi liberado.');
 if(method==='POST'&&p==='/api/auth/login') {
   if(!limiter('login:'+accessIp(req),8,15*60000))return error(res,429,'Muitas tentativas. Tente novamente mais tarde.');
   const b=await body(req);const email=clean(b.email,200).toLowerCase(),password=b.password;
   if(!validEmail(email)||typeof password!=='string'||password.length>500)return error(res,400,'Dados inválidos');
   const found=await query('SELECT id,name,email,password_hash,role,active FROM users WHERE email=$1',[email]);
   const user=found.rows[0];const valid=user?await verifyHash(password,user.password_hash):await verifyHash(password,'scrypt:9b1f89dba724bd897a6a537abc035bb1:'+('00'.repeat(64)));
   if(!user||!valid||!user.active)return error(res,401,'E-mail ou senha inválidos');
   const token=randomToken(),csrf=randomToken();await query('INSERT INTO sessions(user_id,token_hash,csrf,expires_at) VALUES ($1,$2,$3,NOW()+INTERVAL \'8 hours\')',[user.id,digest(token),csrf]);await audit(user.id,'login');
   return send(res,200,{ok:true},{'Set-Cookie':securityCookie(token)});
 }
 let user=await session(req);if(!user)return error(res,401,'Sessão expirada ou inexistente');
 if(method==='GET'&&p==='/api/auth/me')return send(res,200,{user:{id:user.id,name:user.name,email:user.email,role:user.role,must_change_password:user.must_change_password},csrf:user.csrf});
 if(!['GET','HEAD'].includes(method)&&req.headers['x-pv-csrf']!==user.csrf)return error(res,403,'Verificação de segurança inválida');
 if(method==='POST'&&p==='/api/auth/logout'){await query('DELETE FROM sessions WHERE id=$1',[user.sid]);return send(res,200,{ok:true},{'Set-Cookie':expiredCookie()});}
 if(method==='POST'&&p==='/api/auth/password') {
   const b=await body(req);if(typeof b.oldPassword!=='string'||typeof b.newPassword!=='string'||b.newPassword.length<16||b.newPassword.length>200)return error(res,400,'Nova senha precisa ter 16 a 200 caracteres');
   const r=await query('SELECT password_hash FROM users WHERE id=$1',[user.id]);if(!await verifyHash(b.oldPassword,r.rows[0].password_hash))return error(res,400,'Senha atual incorreta');
   const hash=await promiseHash(b.newPassword);await query('UPDATE users SET password_hash=$1,must_change_password=false WHERE id=$2',[hash,user.id]);await query('DELETE FROM sessions WHERE user_id=$1 AND id<>$2',[user.id,user.sid]);await audit(user.id,'password_changed');return send(res,200,{ok:true});
 }
 if(user.must_change_password)return error(res,403,'Altere a senha temporária para continuar');
 const admin=user.role==='admin';
 const myClient=async()=>{const r=await query('SELECT id FROM clients WHERE user_id=$1',[user.id]);return r.rows[0]?.id||-1;};
 if(method==='GET'&&p==='/api/dashboard'){
  if(admin){const [clients,projects,tickets,audits]=await Promise.all([query('SELECT COUNT(*)::int AS n FROM clients'),query('SELECT COUNT(*)::int AS n FROM projects'),query("SELECT COUNT(*)::int AS n FROM tickets WHERE status!='resolvido'"),query('SELECT a.action,a.created_at,u.name FROM audit_log a LEFT JOIN users u ON u.id=a.actor_id ORDER BY a.created_at DESC LIMIT 10')]);return send(res,200,{counts:{clients:clients.rows[0].n,projects:projects.rows[0].n,openTickets:tickets.rows[0].n},activity:audits.rows});}
  const client=await myClient();const [projects,tickets]=await Promise.all([query('SELECT COUNT(*)::int AS n FROM projects WHERE client_id=$1',[client]),query("SELECT COUNT(*)::int AS n FROM tickets WHERE client_id=$1 AND status!='resolvido'",[client])]);return send(res,200,{counts:{projects:projects.rows[0].n,openTickets:tickets.rows[0].n}});
 }
 if(method==='GET'&&p==='/api/clients'&&admin){const r=await query('SELECT c.id,c.company,c.created_at,u.name,u.email FROM clients c LEFT JOIN users u ON u.id=c.user_id ORDER BY c.created_at DESC LIMIT 150');return send(res,200,{items:r.rows});}
 if(method==='POST'&&p==='/api/clients'&&admin){const b=await body(req);const name=clean(b.name),email=clean(b.email,200).toLowerCase(),company=clean(b.company,180);if(name.length<2||!validEmail(email))return error(res,400,'Nome e e-mail válido são obrigatórios');const temp=randomToken();const hash=await promiseHash(temp);const conn=await db.connect();try{await conn.query('BEGIN');const u=await conn.query('INSERT INTO users(name,email,password_hash,role,must_change_password) VALUES ($1,$2,$3,$4,true) RETURNING id',[name,email,hash,'client']);const c=await conn.query('INSERT INTO clients(user_id,company) VALUES ($1,$2) RETURNING id',[u.rows[0].id,company]);await conn.query('COMMIT');await audit(user.id,'client_created',c.rows[0].id);return send(res,201,{id:c.rows[0].id,email,temporaryPassword:temp,note:'Copie agora: esta senha será exibida somente uma vez.'});}catch(e){await conn.query('ROLLBACK');if(e.code==='23505')return error(res,409,'E-mail já cadastrado');throw e;}finally{conn.release();}}
 if(method==='GET'&&p==='/api/projects'){const c=admin?null:await myClient();const r=admin?await query('SELECT p.id,p.title,p.description,p.stage,p.progress,p.client_id,p.created_at,c.company FROM projects p LEFT JOIN clients c ON c.id=p.client_id ORDER BY p.created_at DESC LIMIT 150'):await query('SELECT id,title,description,stage,progress,created_at FROM projects WHERE client_id=$1 ORDER BY created_at DESC LIMIT 150',[c]);return send(res,200,{items:r.rows});}
 if(method==='POST'&&p==='/api/projects'&&admin){const b=await body(req);const title=clean(b.title),description=clean(b.description,2000),stage=clean(b.stage,20)||'planejamento',progress=Number(b.progress)||0,clientId=Number(b.clientId);if(title.length<3||!['planejamento','desenvolvimento','validacao','entregue','pausado'].includes(stage)||!Number.isInteger(progress)||progress<0||progress>100||!Number.isSafeInteger(clientId)||clientId<1)return error(res,400,'Projeto inválido');const r=await query('INSERT INTO projects(title,description,stage,progress,client_id) VALUES ($1,$2,$3,$4,$5) RETURNING id',[title,description,stage,progress,clientId]);await audit(user.id,'project_created',r.rows[0].id);return send(res,201,{id:r.rows[0].id});}
 if(method==='PATCH'&&/^\/api\/projects\/\d+$/.test(p)&&admin){const id=Number(p.split('/').pop()),b=await body(req),stage=clean(b.stage,20),progress=Number(b.progress);if(!['planejamento','desenvolvimento','validacao','entregue','pausado'].includes(stage)||!Number.isInteger(progress)||progress<0||progress>100)return error(res,400,'Dados inválidos');const r=await query('UPDATE projects SET stage=$1,progress=$2,updated_at=NOW() WHERE id=$3 RETURNING id',[stage,progress,id]);if(!r.rowCount)return error(res,404,'Projeto não localizado');await audit(user.id,'project_updated',id);return send(res,200,{ok:true});}
 if(method==='GET'&&p==='/api/tickets'){const c=admin?null:await myClient();const r=admin?await query('SELECT t.id,t.subject,t.description,t.status,t.created_at,t.client_id,c.company FROM tickets t LEFT JOIN clients c ON c.id=t.client_id ORDER BY t.created_at DESC LIMIT 150'):await query('SELECT id,subject,description,status,created_at FROM tickets WHERE client_id=$1 ORDER BY created_at DESC LIMIT 150',[c]);return send(res,200,{items:r.rows});}
 if(method==='POST'&&p==='/api/tickets'){if(!limiter('ticket:'+user.id,20,3600000))return error(res,429,'Limite de solicitações atingido');const b=await body(req);const subject=clean(b.subject),description=clean(b.description,4000),clientId=admin?Number(b.clientId):await myClient();if(subject.length<4||description.length<8||!Number.isSafeInteger(clientId)||clientId<1)return error(res,400,'Preencha os campos da solicitação');const r=await query('INSERT INTO tickets(client_id,subject,description) VALUES ($1,$2,$3) RETURNING id',[clientId,subject,description]);await audit(user.id,'ticket_created',r.rows[0].id);return send(res,201,{id:r.rows[0].id});}
 if(method==='PATCH'&&/^\/api\/tickets\/\d+$/.test(p)&&admin){const id=Number(p.split('/').pop()),b=await body(req),status=clean(b.status,20);if(!['aberto','em_analise','resolvido'].includes(status))return error(res,400,'Status inválido');const r=await query('UPDATE tickets SET status=$1,updated_at=NOW() WHERE id=$2 RETURNING id',[status,id]);if(!r.rowCount)return error(res,404,'Chamado não localizado');await audit(user.id,'ticket_updated',id);return send(res,200,{ok:true});}
 return error(res,404,'Rota não encontrada');
}
const server=http.createServer(async(req,res)=>{commonHeaders(res);let url;try{url=new URL(req.url,'http://localhost');}catch{return error(res,400,'Requisição inválida');}try{
 if(url.pathname==='/health')return send(res,process.env.DATABASE_URL&&!databaseReady?503:200,{status:process.env.DATABASE_URL&&!databaseReady?'degraded':'ok',database:databaseReady?'ready':'not_configured'});
 if(url.pathname.startsWith('/api/'))return await api(req,res,url);
 if(!['GET','HEAD'].includes(req.method))return error(res,405,'Método não permitido');
 if(url.pathname==='/'||url.pathname==='/index.html')return serveFile(req,res,'index.html');
 if(url.pathname==='/painel'||url.pathname==='/painel/')return serveFile(req,res,'painel.html');
 if(url.pathname==='/privacidade')return serveFile(req,res,'privacidade.html');
 if(url.pathname==='/robots.txt')return serveFile(req,res,'robots.txt');
 if(url.pathname==='/sitemap.xml')return serveFile(req,res,'sitemap.xml');
 return serveFile(req,res,decodeURIComponent(url.pathname));
 }catch(e){console.error('Request failed:',e.code||e.message);return error(res,e.message==='TOO_LARGE'?413:500,'Não foi possível concluir a operação');}});
if(require.main===module){server.listen(PORT,'0.0.0.0',()=>console.log(`Prado Vision listening on ${PORT}`));initDb();}
module.exports={server,promiseHash,verifyHash};
