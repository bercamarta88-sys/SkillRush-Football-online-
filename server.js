// SkillRush online sunucu: npm i ws && node server.js  (HTTPS/WSS için Render/Fly/Railway gibi bir host kullan)
const http=require('http'),fs=require('fs'),c=require('crypto'),{WebSocketServer}=require('ws');
const F=process.env.DB||'db.json',PORT=process.env.PORT||8080,OR=process.env.ORIGIN||'*';
let db={u:{},t:{}};try{db=JSON.parse(fs.readFileSync(F))}catch(e){}
const save=()=>fs.writeFile(F+'.tmp',JSON.stringify(db),()=>fs.rename(F+'.tmp',F,()=>{}));
const H=s=>c.createHash('sha256').update(s).digest('hex'),rl={};
const lim=ip=>{const n=Date.now(),a=(rl[ip]||[]).filter(t=>n-t<6e4);a.push(n);rl[ip]=a;return a.length>20};
const who=t=>db.t[H(t||'')];
const srv=http.createServer((q,r)=>{r.setHeader('Access-Control-Allow-Origin',OR);r.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization');r.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
const J=(o,s)=>{r.statusCode=s||200;r.setHeader('Content-Type','application/json');r.end(JSON.stringify(o))};
if(q.method=='OPTIONS')return J({});let b='';q.on('data',d=>{b+=d;if(b.length>3e5)q.destroy()});q.on('end',()=>{let d={};try{d=JSON.parse(b||'{}')}catch(e){}
const ip=q.socket.remoteAddress,tk=(q.headers.authorization||'').slice(7);
if(q.url=='/api/register'||q.url=='/api/login'){if(lim(ip))return J({e:'Çok deneme, biraz bekle'},429);const n=String(d.n||''),p=String(d.p||'');
if(!/^\w{3,16}$/.test(n)||p.length<8||p.length>100)return J({e:'Ad 3-16 harf/rakam, şifre en az 8 karakter'},400);const k=n.toLowerCase();let u=db.u[k];
if(q.url=='/api/register'){if(u)return J({e:'Bu ad alınmış'},409);const s=c.randomBytes(16).toString('hex');u=db.u[k]={n,s,h:c.scryptSync(p,s,32).toString('hex'),fr:[],sv:''}}
else if(!u||!c.timingSafeEqual(Buffer.from(u.h,'hex'),c.scryptSync(p,u.s,32)))return J({e:'Ad veya şifre yanlış'},401);
const t=c.randomBytes(32).toString('hex');db.t[H(t)]=k;save();return J({t,n:u.n})}
const k=who(tk);if(!k)return J({e:'Giriş gerekli'},401);
if(q.url=='/api/save'){if(q.method=='GET')return J({d:db.u[k].sv});if(typeof d.d!='string'||d.d.length>2e5)return J({e:'Geçersiz'},400);db.u[k].sv=d.d;save();return J({ok:1})}
J({e:'yok'},404)})});
let qu=null;
const wss=new WebSocketServer({server:srv}),on={},rooms={};
const to=(k,o)=>{const w=on[k];w&&w.readyState==1&&w.send(JSON.stringify(o))};
const fl=k=>to(k,{k:'fr',l:db.u[k].fr.map(f=>({n:db.u[f].n,on:!!on[f]}))});
wss.on('connection',(w,q)=>{const k=who(new URL(q.url,'http://x').searchParams.get('token'));if(!k)return w.close();on[k]=w;w.room=null;let cnt=0,t0=Date.now();fl(k);
w.on('message',m=>{if(++cnt>40*((Date.now()-t0)/1000+1))return;let d;try{d=JSON.parse(m)}catch(e){return}const R=rooms[w.room];
if(d.k=='fa'){const f=String(d.n||'').toLowerCase();if(f!=k&&db.u[f]&&!db.u[k].fr.includes(f)){db.u[k].fr.push(f);db.u[f].fr.push(k);save();fl(k);fl(f)}}
else if(d.k=='q'){if(w.room)return;if(qu&&qu!=k&&on[qu]&&!on[qu].room){const h=qu;qu=null;const code=c.randomBytes(2).toString('hex').toUpperCase();rooms[code]={h,g:k};on[h].room=w.room=code;to(h,{k:'go',r:'h'});to(k,{k:'go',r:'g'})}else qu=k}else if(d.k=='qc'){if(qu==k)qu=null}
else if(d.k=='mk'){const code=c.randomBytes(2).toString('hex').toUpperCase();rooms[code]={h:k,g:null};w.room=code;w.send(JSON.stringify({k:'room',code}))}
else if(d.k=='iv'&&w.room&&db.u[k].fr.includes(String(d.n).toLowerCase()))to(String(d.n).toLowerCase(),{k:'inv',from:db.u[k].n,code:w.room});
else if(d.k=='jn'){const r=rooms[String(d.code).toUpperCase()];if(!r||r.g||r.h==k)return w.send(JSON.stringify({k:'err',e:'Oda yok/dolu'}));r.g=k;w.room=String(d.code).toUpperCase();to(r.h,{k:'go',r:'h'});to(k,{k:'go',r:'g'})}
else if(d.k=='in'&&R&&R.h)to(R.h,{k:'in',d:d.d});else if(d.k=='st'&&R&&R.g)to(R.g,{k:'st',d:d.d})});
w.on('close',()=>{if(qu==k)qu=null;delete on[k];const R=rooms[w.room];if(R){to(R.h==k?R.g:R.h,{k:'bye'});delete rooms[w.room]}})});
srv.listen(PORT);
