import { Fluid } from './fluid.js';
import { applyTranslations, setLocale, t } from './i18n.js';

const $ = (id) => document.getElementById(id);
const config = JSON.parse($('app-config').textContent);
const palettes = {
  aurora: {colors:[[.09,.8,1.4],[.28,.4,1.35],[1.5,.42,.16],[1.2,.78,.4]]},
  ember: {colors:[[1.6,.3,.08],[1.4,.65,.12],[.8,.12,.08],[1.3,.9,.3]]},
  ocean: {colors:[[.04,.45,1.4],[.04,1.1,1.2],[.15,.5,.95],[.4,1.4,1.2]]},
  bloom: {colors:[[.75,.18,1.15],[1.4,.3,.7],[.35,.18,.9],[1.2,.6,.7]]},
  mono: {colors:[[.5,.7,.9],[.9,1.1,1.3],[.4,.55,.75],[1.2,1.3,1.4]]},
};
let currentPreset=config.presets[0], palette='aurora';
const settings={...currentPreset};
let fluid, paused=false, contextLost=false, time=0, lastTime=0, frameCount=0, fpsTime=0, fps=0;
let queue=[], captureRequested=false, lastInteraction=0, resizePending=false, frameId=0;
let seedPending=true, currentErrorKey='';
const pointers=new Map();
const canvas=$('fluid-canvas');
const simulation=$('simulation');
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
if(reducedMotion){$('autopilot').checked=false;paused=true;}

function toastKey(key){$('toast').textContent=t(key);$('toast').classList.add('visible');clearTimeout(toastKey.timer);toastKey.timer=setTimeout(()=>$('toast').classList.remove('visible'),2800);}
function updateRange(id){const el=$(id),n=Number(el.value);settings[id]=n;$(id+'-value').textContent=id==='swirl'?n:n.toFixed(2);el.style.setProperty('--fill',((n-Number(el.min))/(Number(el.max)-Number(el.min))*100)+'%');}
for(const id of ['swirl','diffusion','persistence','radius']){$(id).addEventListener('input',()=>updateRange(id));updateRange(id);}
function paletteName(name){return t('palette.'+name);}
function presetName(id){return t('preset.'+id+'.name');}
function setPalette(name){
  palette=name;$('palette-name').textContent=paletteName(name);
  document.querySelectorAll('[data-palette]').forEach(button=>{
    const active=button.dataset.palette===name;
    button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));
    button.setAttribute('aria-label',t('palette.button',{name:paletteName(button.dataset.palette)}));
  });
}
document.querySelectorAll('[data-palette]').forEach(button=>button.addEventListener('click',()=>setPalette(button.dataset.palette)));
function applySettings(preset){Object.assign(settings,preset);for(const id of ['swirl','diffusion','persistence','radius']){$(id).value=settings[id];updateRange(id);}setPalette(preset.palette);}
function color(index,scale=1){const colors=palettes[palette].colors;return colors[((index%colors.length)+colors.length)%colors.length].map(c=>c*scale);}
function refreshPresetCopy(){
  document.querySelectorAll('[data-preset]').forEach(button=>{
    const id=button.dataset.preset;
    button.querySelector('[data-preset-name]').textContent=presetName(id);
    button.querySelector('[data-preset-description]').textContent=t('preset.'+id+'.description');
  });
  $('canvas-preset').textContent=String(config.presets.indexOf(currentPreset)+1).padStart(2,'0')+' / '+presetName(currentPreset.id);
}
function refreshActions(){
  const pauseKey=paused?'action.resume':'action.pause',titleKey=paused?'action.resumeTitle':'action.pauseTitle';
  $('pause-button').setAttribute('aria-label',t(pauseKey));$('pause-button').title=t(titleKey);
  $('reset-button').setAttribute('aria-label',t('action.reset'));$('reset-button').title=t('action.resetTitle');
  $('capture-button').setAttribute('aria-label',t('action.save'));$('capture-button').title=t('action.save');
  $('fullscreen-button').setAttribute('aria-label',t(document.fullscreenElement?'action.exitFullscreen':'action.fullscreen'));$('fullscreen-button').title=t('action.fullscreen');
}
function refreshThemeButton(){
  const dark=document.documentElement.dataset.theme==='dark';
  const key=dark?'theme.light':'theme.dark',button=$('theme-button');
  button.dataset.i18nAria=key;button.setAttribute('aria-label',t(key));button.title=t(key);
}
function refreshLanguage(){
  applyTranslations();refreshPresetCopy();setPalette(palette);updatePaused();refreshActions();refreshThemeButton();
  if(currentErrorKey)$('error-message').textContent=t(currentErrorKey);
}
document.querySelectorAll('[data-language]').forEach(button=>button.addEventListener('click',()=>setLocale(button.dataset.language)));
document.addEventListener('fluidly:languagechange',refreshLanguage);
$('theme-button').addEventListener('click',()=>{
  const next=document.documentElement.dataset.theme==='dark'?'light':'dark';
  document.documentElement.dataset.theme=next;
  document.querySelector('meta[name="theme-color"]').content=next==='dark'?'#151914':'#f6f5f0';
  try{localStorage.setItem('fluidly-theme',next)}catch{}
  refreshThemeButton();
});

function seed(){
  for(let arm=0;arm<2;arm++)for(let i=0;i<26;i++){
    const a=i/25*Math.PI*1.65+arm*Math.PI,r=.1+i/25*.21;
    fluid.splat(.5+Math.cos(a)*r/fluid.aspect,.52+Math.sin(a)*r,-Math.sin(a)*125,Math.cos(a)*125,color(arm===0?(i<14?0:1):(i<15?2:3),.72),.32);
  }
}
function burst(){if(!fluid||contextLost)return;for(let i=0;i<9;i++){const a=Math.random()*Math.PI*2,r=.12+Math.random()*.2;queue.push({x:.5+Math.cos(a)*r/fluid.aspect,y:.5+Math.sin(a)*r,dx:-Math.sin(a)*180,dy:Math.cos(a)*180,color:color(i,1.5),radius:.18+Math.random()*.22});}toastKey('toast.burst');}
function reset(){if(!fluid||contextLost)return;queue=[];pointers.clear();fluid.clear();seedPending=true;time=0;toastKey('toast.reset');}
function updatePaused(){simulation.classList.toggle('paused',paused);$('run-status').textContent=t(paused?'simulation.paused':'simulation.live');$('pause-button').querySelector('use').setAttribute('href',paused?'#i-play':'#i-pause');refreshActions();}
function togglePause(){paused=!paused;updatePaused();}
$('pause-button').addEventListener('click',togglePause);
$('reset-button').addEventListener('click',reset);
$('burst-button').addEventListener('click',burst);
$('defaults-button').addEventListener('click',()=>{applySettings(currentPreset);toastKey('toast.defaults');});
document.querySelectorAll('[data-preset]').forEach(button=>button.addEventListener('click',()=>{
  currentPreset=config.presets.find(p=>p.id===button.dataset.preset);applySettings(currentPreset);
  document.querySelectorAll('[data-preset]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));});
  refreshPresetCopy();reset();
}));
$('quality').addEventListener('change',()=>{if(!fluid||contextLost)return;try{fluid.setQuality($('quality').value);seedPending=true;toastKey('toast.quality');}catch(error){showError(error);}});
function point(event){const rect=canvas.getBoundingClientRect();return {x:Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width)),y:Math.max(0,Math.min(1,1-(event.clientY-rect.top)/rect.height))};}
canvas.addEventListener('pointerdown',event=>{
  if(event.button!==0)return;
  canvas.setPointerCapture(event.pointerId);const p=point(event);p.color=Math.floor(Math.random()*4);
  pointers.set(event.pointerId,p);queue.push({...p,dx:0,dy:15,color:color(p.color,1.2)});
  $('canvas-instruction').classList.add('dismissed');lastInteraction=performance.now();
});
canvas.addEventListener('pointermove',event=>{
  const prev=pointers.get(event.pointerId);if(!prev)return;
  const p=point(event),dx=p.x-prev.x,dy=p.y-prev.y;if(Math.abs(dx)+Math.abs(dy)<.0001)return;
  const length=Math.hypot(dx*(fluid?.aspect||1),dy),steps=Math.min(8,Math.max(1,Math.ceil(length/.012)));
  for(let i=1;i<=steps;i++)queue.push({x:prev.x+dx*i/steps,y:prev.y+dy*i/steps,dx:Math.max(-500,Math.min(500,dx*settings.force*350)),dy:Math.max(-500,Math.min(500,dy*settings.force*350)),color:color(prev.color,.6)});
  pointers.set(event.pointerId,{...p,color:prev.color});lastInteraction=performance.now();if(queue.length>80)queue=queue.slice(-80);
});
for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,event=>pointers.delete(event.pointerId));
window.addEventListener('blur',()=>pointers.clear());
async function fullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else await simulation.requestFullscreen();}catch{toastKey('toast.fullscreenError');}}
$('fullscreen-button').addEventListener('click',fullscreen);
document.addEventListener('fullscreenchange',()=>{refreshActions();resizePending=true;});
$('capture-button').addEventListener('click',()=>{if(!fluid||contextLost)return;captureRequested=true;});
function capture(){canvas.toBlob(blob=>{if(!blob){toastKey('toast.captureError');return;}const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='fluidly-'+currentPreset.id+'-'+Date.now()+'.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);toastKey('toast.captured');},'image/png');}
const dialog=$('info-dialog');
for(const id of ['about-button','help-button'])$(id).addEventListener('click',()=>dialog.showModal());
dialog.querySelector('.dialog-close').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
document.addEventListener('keydown',event=>{
  if(event.repeat||event.ctrlKey||event.metaKey||event.altKey||dialog.open||/INPUT|SELECT|TEXTAREA|BUTTON/.test(event.target.tagName))return;
  switch(event.key.toLowerCase()){case ' ':event.preventDefault();togglePause();break;case 'b':burst();break;case 'r':reset();break;case 'f':fullscreen();break;case '?':dialog.showModal();break;}
});
new ResizeObserver(()=>{resizePending=true;}).observe(simulation);
document.addEventListener('visibilitychange',()=>{lastTime=0;fpsTime=0;frameCount=0;pointers.clear();if(document.hidden){cancelAnimationFrame(frameId);frameId=0;}else if(!contextLost&&fluid){frameId=requestAnimationFrame(frame);}});
canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();contextLost=true;cancelAnimationFrame(frameId);showError(new Error('context'),'error.context');});
canvas.addEventListener('webglcontextrestored',()=>{contextLost=false;init();});
function errorKeyFor(error){const message=String(error?.message||'');if(message.includes('floating-point'))return 'error.float';if(message.includes('simulation buffer'))return 'error.buffer';if(message.includes('WebGL 2'))return 'error.webgl';return '';}
function showError(error,key=errorKeyFor(error)){console.error(error);currentErrorKey=key;$('error-message').textContent=key?t(key):error.message;$('canvas-error').hidden=false;$('run-status').textContent=t('simulation.unavailable');$('fps').textContent='—';}
function autoFlow(dt){
  const scale=dt*60;
  for(let i=0;i<2;i++){const a=time*.42+i*Math.PI,r=.23+Math.sin(time*.35)*.045;fluid.splat(.5+Math.cos(a)*r/fluid.aspect,.52+Math.sin(a)*r,(-Math.sin(a)*52+Math.cos(time*1.3+i)*22)*scale,(Math.cos(a)*52+Math.sin(time+i)*22)*scale,color(i===0?0:2,.18*scale),settings.radius*.6);}
}
function frame(now){
  if(contextLost||document.hidden)return;
  try{
    const dt=lastTime?Math.min((now-lastTime)/1000,1/30):1/60;lastTime=now;let dirty=false;
    if(resizePending){resizePending=false;if(fluid.resize())seedPending=true;dirty=true;}
    if(seedPending){seedPending=false;seed();dirty=true;}
    for(const splat of queue.splice(0,40)){fluid.splat(splat.x,splat.y,splat.dx,splat.dy,splat.color,splat.radius);dirty=true;}
    if(!paused){time+=dt;if($('autopilot').checked&&now-lastInteraction>1400)autoFlow(dt);fluid.step(dt);dirty=true;}
    if(dirty||captureRequested)fluid.render();if(captureRequested){captureRequested=false;capture();}
    frameCount++;if(!fpsTime)fpsTime=now;if(now-fpsTime>=650){fps=Math.round(frameCount*1000/(now-fpsTime));$('fps').textContent=paused?'—':fps;frameCount=0;fpsTime=now;}
    frameId=requestAnimationFrame(frame);
  }catch(error){showError(error);}
}
function init(){try{fluid=new Fluid(canvas,settings);fluid.setQuality($('quality').value);$('canvas-error').hidden=true;currentErrorKey='';seedPending=true;lastTime=0;updatePaused();frameId=requestAnimationFrame(frame);}catch(error){showError(error);}}
refreshLanguage();
document.querySelector('meta[name="theme-color"]').content=document.documentElement.dataset.theme==='dark'?'#151914':'#f6f5f0';
init();