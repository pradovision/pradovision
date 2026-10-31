'use strict';
const menu = document.querySelector('.menu-toggle');
const mobile = document.querySelector('.mobile-nav');
if(menu && mobile){
  function setMenu(open){menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Fechar menu':'Abrir menu');mobile.hidden=!open;document.body.classList.toggle('menu-open',open);}
  menu.addEventListener('click',()=>setMenu(menu.getAttribute('aria-expanded')!=='true'));
  mobile.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>setMenu(false)));
  document.addEventListener('keydown',e=>{if(e.key==='Escape')setMenu(false);});
}
document.getElementById('year').textContent=new Date().getFullYear();
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
if('IntersectionObserver' in window && !reducedMotion){
 const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target);}}),{threshold:.08,rootMargin:'0px 0px -30px 0px'});
 document.querySelectorAll('.reveal').forEach(node=>observer.observe(node));
}else document.querySelectorAll('.reveal').forEach(node=>node.classList.add('visible'));
const progress=document.querySelector('.reading-progress');
let scrollQueued=false;
addEventListener('scroll',()=>{if(scrollQueued)return;scrollQueued=true;requestAnimationFrame(()=>{const end=document.documentElement.scrollHeight-innerHeight;progress.style.width=(end>0?scrollY/end*100:0)+'%';scrollQueued=false;});},{passive:true});
const tile=document.getElementById('art-tile');const art=document.querySelector('.hero-art');
if(art && tile && !reducedMotion && matchMedia('(pointer:fine)').matches){
 art.addEventListener('pointermove',event=>{const box=art.getBoundingClientRect(),x=(event.clientX-box.left)/box.width-.5,y=(event.clientY-box.top)/box.height-.5;tile.style.setProperty('--rot-y',(x*10)+'deg');tile.style.setProperty('--rot-x',(-y*8)+'deg');});
 art.addEventListener('pointerleave',()=>{tile.style.setProperty('--rot-y','0deg');tile.style.setProperty('--rot-x','0deg');});
}
