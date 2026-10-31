'use strict';
(() => {
  const $ = (selector) => document.querySelector(selector);
  const menu = $('.menu-toggle');
  const mobileNav = $('#mobile-navigation');
  if (menu && mobileNav) {
    const setMenu = open => { menu.setAttribute('aria-expanded',String(open)); menu.setAttribute('aria-label',open?'Fechar menu':'Abrir menu'); mobileNav.hidden=!open; document.body.classList.toggle('menu-open',open); };
    menu.addEventListener('click',()=>setMenu(menu.getAttribute('aria-expanded')!=='true'));
    mobileNav.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>setMenu(false)));
    document.addEventListener('keydown',event=>{if(event.key==='Escape')setMenu(false);});
  }
  const year = $('#current-year'); if (year) year.textContent = new Date().getFullYear();
  const prefersLessMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!prefersLessMotion && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('has-motion');
    const observer = new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target);}}}, {rootMargin:'0px 0px -35px 0px',threshold:.05});
    document.querySelectorAll('.inview').forEach(item => observer.observe(item));
  }
  const progress = $('#scroll-progress');
  if (progress) {
    let scheduled = false;
    window.addEventListener('scroll',()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{const max=document.documentElement.scrollHeight-innerHeight;progress.style.width=`${max>0?Math.min(100,scrollY/max*100):0}%`;scheduled=false;});},{passive:true});
  }
  const showcase = $('#hero-showcase'), glass = $('#showcase-glass');
  if (showcase && glass && !prefersLessMotion && matchMedia('(hover:hover) and (pointer:fine)').matches) {
    showcase.addEventListener('pointermove',event => { const r=showcase.getBoundingClientRect(); const x=(event.clientX-r.left)/r.width-.5;const y=(event.clientY-r.top)/r.height-.5;glass.style.transform=`rotate(${-6+x*2}deg) rotateY(${x*10-10}deg) rotateX(${-y*7}deg)`;});
    showcase.addEventListener('pointerleave',()=>{glass.style.transform='rotate(-6deg) rotateY(-10deg)';});
  }
  const faqSearch = $('#faq-search'), faqEmpty = $('#faq-empty');
  if (faqSearch) faqSearch.addEventListener('input',()=>{
    const query=faqSearch.value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
    let visible=0;
    document.querySelectorAll('#faq-list details').forEach(item=>{
      const content=item.textContent.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
      item.hidden=!content.includes(query); if(!item.hidden)visible++;
    });
    if (faqEmpty) faqEmpty.hidden=visible!==0;
  });
  document.querySelectorAll('[data-service]').forEach(link=>link.addEventListener('click',()=>{
    const select=$('#contact-type');if(select)select.value=link.dataset.service;
  }));
  const contactForm = $('#contact-form');
  if(contactForm) contactForm.addEventListener('submit',event=>{
    event.preventDefault();if(!contactForm.reportValidity())return;
    const fields=new FormData(contactForm), name=String(fields.get('name')||'').trim(), service=String(fields.get('service')||'').trim(), message=String(fields.get('message')||'').trim();
    const services={site:'Site ou landing page',sistema:'Sistema personalizado',automacao:'Automação ou integração',suporte:'Suporte e evolução',outro:'Ainda estou descobrindo'};
    const text=`Olá, Prado Vision! Meu nome é ${name}.\n\nTenho interesse em: ${services[service]||'Solução digital'}.\n\nMinha ideia: ${message}\n\nGostaria de conversar sobre uma proposta.`;
    const whatsapp=`https://wa.me/5545999614886?text=${encodeURIComponent(text)}`;
    const opened=window.open(whatsapp,'_blank','noopener,noreferrer');
    if(!opened)window.location.assign(whatsapp);
  });
  // A marca oficial está no repositório original. Esta função remove apenas a área preta
  // do PNG para sua aplicação em fundo claro, sem trocar seu monograma por uma logo inventada.
  const targets=[...document.querySelectorAll('img[data-official-logo]')];
  if (targets.length) {
    const source=new Image();source.decoding='async';source.src='/marca-original';
    source.onload=()=>{
      try {
        const canvas=document.createElement('canvas');canvas.width=source.naturalWidth;canvas.height=source.naturalHeight;
        const context=canvas.getContext('2d',{willReadFrequently:true});if(!context)return;
        context.drawImage(source,0,0);const image=context.getImageData(0,0,canvas.width,canvas.height);const data=image.data;
        let minX=canvas.width,minY=canvas.height,maxX=0,maxY=0,points=0;
        for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
          const i=(y*canvas.width+x)*4; const r=data[i],g=data[i+1],b=data[i+2];
          const amount=Math.max(r,g,b);let alpha=Math.min(255,Math.max(0,(amount-25)*5));
          if(r<g*0.90 || g<b*0.90) alpha=0;
          data[i+3]=Math.min(data[i+3],alpha);
          if(alpha>150){points++;if(x<minX)minX=x;if(y<minY)minY=y;if(x>maxX)maxX=x;if(y>maxY)maxY=y;}
        }
        if(points<120 || maxX<=minX || maxY<=minY)return;
        context.putImageData(image,0,0);
        const padding=Math.ceil(Math.max(maxX-minX,maxY-minY)*.028);
        const x=Math.max(0,minX-padding),y=Math.max(0,minY-padding),w=Math.min(canvas.width-x,maxX-minX+padding*2),h=Math.min(canvas.height-y,maxY-minY+padding*2);
        const crop=document.createElement('canvas');crop.width=w;crop.height=h;
        crop.getContext('2d').drawImage(canvas,x,y,w,h,0,0,w,h);
        const output=crop.toDataURL('image/png');
        const icon=document.querySelector('link[rel="icon"]');if(icon){icon.href=output;icon.type='image/png';}
        for(const target of targets){target.src=output;target.closest('.brand-symbol,.showcase-glass-inner')?.classList.add('has-logo');}
      }catch{/* Preserve accessible fallback if canvas is unavailable. */}
    };
  }
})();
