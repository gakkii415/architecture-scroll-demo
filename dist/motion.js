(() => {
  'use strict';
  const byId = id => document.getElementById(id);
  const journey = byId('journey');
  const doorway = byId('doorway');
  const portal = byId('portal');
  const courtyard = byId('courtyard');
  const between = byId('between');
  const intro = byId('intro');
  const destination = byId('destination');
  const atmosphere = byId('atmosphere');
  const progress = byId('progress');
  const chapter = byId('chapter');
  const hint = byId('hint');
  const replay = byId('replay');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = x => Math.max(0, Math.min(1, x));
  const segment = (p, a, b) => clamp((p-a)/(b-a));
  const smooth = x => x*x*(3-2*x);
  let current = 0, target = 0, frame = 0, previousTime = 0, lastChapter = -1;
  let travel = 1;
  function render(p) {
    const near = segment(p, 0, .56);
    const middle = segment(p, .16, .90);
    const far = segment(p, .1, 1);
    // The planes accelerate at different rates, as if a camera were approaching them.
    // Occlusion is physical: doorway > type > portal > final type > courtyard.
    if (!reduced.matches) {
      const nearScale = 1 / Math.max(.12, 1 - near * .88);
      const middleScale = 1 / Math.max(.19, 1 - middle * .81);
      doorway.style.transform = `translate3d(${-near*9}%,${near*5}%,0) scale(${nearScale})`;
      portal.style.transform = `translate3d(${middle*5}%,${-middle*2}%,0) scale(${middleScale})`;
      courtyard.style.transform = `translate3d(${(1-far)*1.8}%,${-far*1.2}%,0) scale(${1.04+far*.22})`;
      between.style.transform = `translate(-50%,-50%) translate3d(${-p*35}%,${p*60}%,0) scale(${1+p*1.8})`;
      intro.style.transform = `translate3d(0,${-p*110}px,0)`;
      destination.style.transform = `translate3d(0,${(1-smooth(segment(p,.65,1)))*22}px,0)`;
    } else {
      doorway.style.transform = 'none'; portal.style.transform = 'none';
      courtyard.style.transform = 'scale(1.04)';
      between.style.transform = 'translate(-50%,-50%)';
      intro.style.transform = 'none'; destination.style.transform = 'none';
    }
    doorway.style.opacity = 1-smooth(segment(p,.36,.56));
    portal.style.opacity = 1-smooth(segment(p,.7,.92));
    between.style.opacity = 1-smooth(segment(p,.22,.49));
    intro.style.opacity = 1-smooth(segment(p,0,.17));
    destination.style.opacity = smooth(segment(p,.77,.97));
    atmosphere.style.opacity = .44*(1-smooth(segment(p,.12,.88)));
    progress.style.transform = `scaleX(${p})`;
    progress.parentElement.setAttribute('aria-valuenow', String(Math.round(p*100)));
    const index = p < .34 ? 0 : p < .78 ? 1 : 2;
    if(index !== lastChapter) {
      chapter.textContent = ['01 / THRESHOLD','02 / PASSAGE','03 / STILLNESS'][index];
      hint.textContent = ['スクロールで奥へ ↓','光のほうへ ↓','中庭に、到着。'][index];
      lastChapter = index;
    }
    replay.hidden = p < .97;
  }
  function tick(time) {
    const dt = previousTime ? Math.min(time-previousTime,64) : 16.7;
    previousTime = time;
    current += (target-current) * (reduced.matches ? 1 : 1-Math.exp(-dt/65));
    if(Math.abs(target-current)<.00015) current=target;
    render(current);
    if(current!==target) frame=requestAnimationFrame(tick);
    else {frame=0;previousTime=0;}
  }
  function update() {
    target=clamp(-journey.getBoundingClientRect().top/travel);
    if(!frame) frame=requestAnimationFrame(tick);
  }
  function measure() {
    travel=Math.max(1,journey.offsetHeight-journey.querySelector('.stage').offsetHeight);
    update();
  }
  replay.addEventListener('click',()=>window.scrollTo({top:0,behavior:reduced.matches?'instant':'smooth'}));
  window.addEventListener('scroll',update,{passive:true});
  window.addEventListener('resize',measure,{passive:true});
  window.addEventListener('pageshow',measure);
  reduced.addEventListener('change',()=>{render(current);update();});
  for(const image of document.images) {
    const failed=()=>{byId('error').hidden=false;};
    image.addEventListener('error',failed);
    if(image.complete&&!image.naturalWidth) failed();
  }
  measure(); render(0);
})();
