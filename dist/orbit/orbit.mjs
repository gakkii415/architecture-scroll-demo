import {CAMERA_POINTS,EARTH_RADIUS,MOON_POSITION,MOON_RADIUS,phaseAt} from './path.mjs';

const $=id=>document.getElementById(id);
let renderer,animation,stopped=false;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
function fail(message){stopped=true;if(renderer)renderer.setAnimationLoop(null);if(animation)animation.kill();$('loading').hidden=true;$('failure').hidden=false;$('failure-message').textContent=message;}
$('reload').addEventListener('click',()=>location.reload());
const deadline=setTimeout(()=>fail('読み込みに時間がかかっています。通信を確認して、再読み込みしてください。'),45000);
function script(src){return new Promise((resolve,reject)=>{const el=document.createElement('script');el.src=src;el.onload=resolve;el.onerror=()=>reject(new Error('Library download failed'));document.head.append(el);});}

async function start(){
  const [THREE]=await Promise.all([import('./vendor/three.module.min.js'),script('./vendor/gsap.min.js').then(()=>script('./vendor/ScrollTrigger.min.js'))]);
  if(stopped)return;
  const canvas=$('space');
  try{renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance'});}catch{throw new Error('WEBGL_UNAVAILABLE');}
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setClearColor(0x01030a,0);
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.14;
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();fail('3Dの描画が停止しました。再読み込みすると再開できます。');});

  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(48,1,.05,200);
  const sun=new THREE.Vector3(-4,3,7).normalize();
  const light=new THREE.DirectionalLight(0xffe8c4,3.25);light.position.copy(sun).multiplyScalar(20);scene.add(light,new THREE.AmbientLight(0x7894c5,.2));
  const loader=new THREE.TextureLoader();let loaded=0;
  const tex=async(name,color=true)=>{const texture=await loader.loadAsync('./assets/'+name+'.webp');if(color)texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());$('loading-detail').textContent=`素材 ${++loaded} / 4`;return texture;};
  const [day,night,cloud,moonMap]=await Promise.all([tex('earth-day'),tex('earth-night'),tex('earth-clouds',false),tex('moon')]);
  if(stopped)return;

  const sphere=new THREE.SphereGeometry(EARTH_RADIUS,80,48);
  const earthMaterial=new THREE.ShaderMaterial({
    uniforms:{dayMap:{value:day},nightMap:{value:night},cloudMap:{value:cloud},sunDirection:{value:sun},cloudOffset:{value:0}},
    vertexShader:`varying vec2 vUv;varying vec3 vWorldNormal;varying vec3 vWorldPosition;void main(){vUv=uv;vWorldNormal=normalize(mat3(modelMatrix)*normal);vec4 world=modelMatrix*vec4(position,1.);vWorldPosition=world.xyz;gl_Position=projectionMatrix*viewMatrix*world;}`,
    fragmentShader:`
      uniform sampler2D dayMap;uniform sampler2D nightMap;uniform sampler2D cloudMap;uniform vec3 sunDirection;uniform float cloudOffset;
      varying vec2 vUv;varying vec3 vWorldNormal;varying vec3 vWorldPosition;
      void main(){
        vec3 n=normalize(vWorldNormal);vec3 viewDirection=normalize(cameraPosition-vWorldPosition);float diffuse=dot(n,sunDirection);float daylight=smoothstep(-.16,.24,diffuse);
        vec3 dayColor=texture2D(dayMap,vUv).rgb;vec3 nightColor=texture2D(nightMap,vUv).rgb;
        float cloudDensity=texture2D(cloudMap,fract(vUv+vec2(cloudOffset+.0025,0.))).r;float cloudShadow=1.-cloudDensity*.32*daylight;
        float ocean=smoothstep(.035,.22,dayColor.b-max(dayColor.r,dayColor.g)*.54);vec3 halfVector=normalize(sunDirection+viewDirection);float oceanGlint=pow(max(dot(n,halfVector),0.),90.)*ocean*daylight;
        vec3 daylightColor=dayColor*(.12+max(diffuse,0.)*1.72)*cloudShadow;float cityMask=smoothstep(.055,.55,max(nightColor.r,nightColor.g));vec3 cityGlow=nightColor*(1.35+cityMask*2.25);vec3 nightside=cityGlow+dayColor*.018;
        float rim=pow(1.-max(dot(n,viewDirection),0.),3.1);float sunward=.18+.82*smoothstep(-.1,.65,diffuse);vec3 color=mix(nightside,daylightColor,daylight);
        color+=vec3(1.,.67,.34)*oceanGlint*1.8;color+=vec3(.055,.27,.7)*rim*sunward*.75;gl_FragColor=vec4(color,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
  const earth=new THREE.Mesh(sphere,earthMaterial);earth.rotation.z=.14;scene.add(earth);
  const clouds=new THREE.Mesh(new THREE.SphereGeometry(2.027,64,40),new THREE.MeshPhongMaterial({color:0xffffff,alphaMap:cloud,bumpMap:cloud,bumpScale:.035,transparent:true,opacity:.68,depthWrite:false,shininess:14,specular:0xa9c6df}));clouds.rotation.z=.14;scene.add(clouds);
  const air=new THREE.Mesh(new THREE.SphereGeometry(2.11,64,40),new THREE.ShaderMaterial({side:THREE.BackSide,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{sunDirection:{value:sun}},vertexShader:`varying vec3 n;varying vec3 p;void main(){n=normalize(mat3(modelMatrix)*normal);vec4 w=modelMatrix*vec4(position,1.);p=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,fragmentShader:`uniform vec3 sunDirection;varying vec3 n;varying vec3 p;void main(){vec3 N=normalize(n);vec3 V=normalize(cameraPosition-p);float edge=pow(1.-abs(dot(N,V)),3.35);float lit=smoothstep(-.3,.75,dot(N,sunDirection));float forward=pow(max(dot(V,sunDirection),0.),8.);vec3 blue=mix(vec3(.035,.18,.62),vec3(.24,.66,1.),lit);float alpha=edge*(.12+lit*.68)+forward*edge*.2;gl_FragColor=vec4(blue,alpha*.72);}`}));scene.add(air);
  const moon=new THREE.Mesh(new THREE.SphereGeometry(MOON_RADIUS,64,40),new THREE.MeshStandardMaterial({map:moonMap,roughness:.94,metalness:0,bumpMap:moonMap,bumpScale:.018}));moon.position.set(...MOON_POSITION);moon.rotation.set(.1,-1,.1);scene.add(moon);

  function radialTexture(size,inner,middle,outer){const c=document.createElement('canvas');c.width=c.height=size;const context=c.getContext('2d');const gradient=context.createRadialGradient(size/2,size/2,0,size/2,size/2,size/2);gradient.addColorStop(0,inner);gradient.addColorStop(.18,middle);gradient.addColorStop(1,outer);context.fillStyle=gradient;context.fillRect(0,0,size,size);const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;return texture;}
  const sunCore=radialTexture(192,'rgba(255,255,245,1)','rgba(255,196,104,.65)','rgba(255,152,58,0)');
  const sunHalo=radialTexture(256,'rgba(255,233,190,.44)','rgba(255,144,63,.12)','rgba(255,100,32,0)');
  const sunPosition=sun.clone().multiplyScalar(55);
  const core=new THREE.Sprite(new THREE.SpriteMaterial({map:sunCore,color:0xffecd0,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,depthTest:true,toneMapped:false}));core.position.copy(sunPosition);core.scale.set(4.5,4.5,1);scene.add(core);
  const halo=new THREE.Sprite(new THREE.SpriteMaterial({map:sunHalo,color:0xffa563,transparent:true,opacity:.78,blending:THREE.AdditiveBlending,depthWrite:false,depthTest:true,toneMapped:false}));halo.position.copy(sunPosition);halo.scale.set(18,18,1);scene.add(halo);
  const nebulaTexture=radialTexture(256,'rgba(76,132,188,.42)','rgba(25,63,118,.14)','rgba(4,8,20,0)');
  [[-38,18,-54,34,0x729bc7],[46,-22,-63,42,0x7b5469]].forEach(([x,y,z,size,color])=>{const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:nebulaTexture,color,transparent:true,opacity:.32,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));sprite.position.set(x,y,z);sprite.scale.set(size,size,1);scene.add(sprite);});

  const positions=[],colors=[];let seed=38;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<1100;i++){const theta=random()*Math.PI*2,z=random()*2-1,r=65+random()*30,k=Math.sqrt(1-z*z);positions.push(r*k*Math.cos(theta),r*z,r*k*Math.sin(theta));const l=.25+random()*.5;colors.push(l*.86,l*.94,l);}
  const starsGeometry=new THREE.BufferGeometry();starsGeometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));starsGeometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));scene.add(new THREE.Points(starsGeometry,new THREE.PointsMaterial({size:.07,vertexColors:true,sizeAttenuation:true,transparent:true,opacity:.9,depthWrite:false})));
  const path=new THREE.CatmullRomCurve3(CAMERA_POINTS.map(p=>new THREE.Vector3(...p)),false,'centripetal');
  const dustPositions=[],dustColors=[];
  for(let i=0;i<260;i++){const point=path.getPoint(random());dustPositions.push(point.x+(random()-.5)*12,point.y+(random()-.5)*8,point.z+(random()-.5)*12);const warm=random()>.82;dustColors.push(warm?.72:.45,warm?.54:.65,warm?.42:.86);}
  const dustGeometry=new THREE.BufferGeometry();dustGeometry.setAttribute('position',new THREE.Float32BufferAttribute(dustPositions,3));dustGeometry.setAttribute('color',new THREE.Float32BufferAttribute(dustColors,3));scene.add(new THREE.Points(dustGeometry,new THREE.PointsMaterial({size:.026,vertexColors:true,sizeAttenuation:true,transparent:true,opacity:.34,blending:THREE.AdditiveBlending,depthWrite:false})));

  const postTarget=new THREE.WebGLRenderTarget(1,1,{depthBuffer:true,stencilBuffer:false});postTarget.texture.colorSpace=THREE.NoColorSpace;
  const postScene=new THREE.Scene();const postCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
  const postMaterial=new THREE.ShaderMaterial({depthWrite:false,depthTest:false,toneMapped:false,uniforms:{tDiffuse:{value:postTarget.texture},grainSeed:{value:0},motion:{value:0}},vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`,fragmentShader:`
    uniform sampler2D tDiffuse;uniform float grainSeed;uniform float motion;varying vec2 vUv;
    float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233))+grainSeed)*43758.5453);}
    void main(){vec2 center=vUv-.5;float radius=length(center);vec2 chroma=center*(.0011+.0015*radius);vec3 color=vec3(texture2D(tDiffuse,vUv+chroma).r,texture2D(tDiffuse,vUv).g,texture2D(tDiffuse,vUv-chroma).b);
      if(abs(motion)>.001){vec2 trail=normalize(center+vec2(.0001))*motion*.0038;color=mix(color,(texture2D(tDiffuse,vUv+trail).rgb+texture2D(tDiffuse,vUv-trail*.65).rgb)*.5,min(abs(motion)*.16,.34));}
      color+=max(color-.66,0.)*.22;color=mix(color,color*vec3(.93,1.015,1.06),.52);color*=1.-smoothstep(.28,.78,radius)*.48;float grain=(hash(gl_FragCoord.xy+grainSeed)-.5)*(.024+.014*smoothstep(.15,.75,radius));color+=grain;float alpha=texture2D(tDiffuse,vUv).a;gl_FragColor=vec4(color,alpha);
      #include <colorspace_fragment>
    }`});
  postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),postMaterial));

  const target=new THREE.Vector3();const state={p:0};let currentPhase=-1,lastP=-1,previousP=0;
  const phases=[['01 — DEPARTURE','青の、その先へ。','スクロールして出発 ↓'],['02 — LUNAR FLYBY','月を、かすめる。','もう少し、奥へ ↓'],['03 — EARTH ORBIT','光と影の境界へ。','地球の向こうへ ↓'],['04 — THE OTHER SIDE','夜の地球に、出会う。','旅の終わり。上へ戻ると逆再生']];
  function draw(){
    if(stopped||document.hidden)return;const p=state.p;camera.position.copy(path.getPoint(reduced.matches?0:p));target.set(0,.08,0);camera.lookAt(target);
    earth.rotation.y=-.45+(reduced.matches?0:p*.22);clouds.rotation.y=earth.rotation.y+(reduced.matches?0:p*.10);moon.rotation.y=-1+(reduced.matches?0:p*.12);earthMaterial.uniforms.cloudOffset.value=(clouds.rotation.y-earth.rotation.y)/(Math.PI*2);
    postMaterial.uniforms.motion.value=reduced.matches?0:Math.max(-2.5,Math.min(2.5,(p-previousP)*115));postMaterial.uniforms.grainSeed.value=Math.floor(p*1800)+17;previousP=p;
    if(Math.abs(p-lastP)>.00001){const phase=phaseAt(p);if(phase!==currentPhase){$('eyebrow').textContent=phases[phase][0];$('title').textContent=phases[phase][1];$('hint').textContent=phases[phase][2];currentPhase=phase;}$('word').style.opacity=String(Math.max(0,1-p*4));$('word').style.transform=reduced.matches?'none':`translate3d(${-p*75}px,${-p*140}px,0)`;$('progress').style.transform=`scaleX(${p})`;$('progress').parentElement.setAttribute('aria-valuenow',String(Math.round(p*100)));$('replay').hidden=p<.98;lastP=p;}
    renderer.setRenderTarget(postTarget);renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.render(postScene,postCamera);
  }
  function resize(){const rect=$('stage').getBoundingClientRect();renderer.setSize(rect.width,rect.height,false);const drawingSize=renderer.getDrawingBufferSize(new THREE.Vector2());postTarget.setSize(drawingSize.x,drawingSize.y);camera.aspect=rect.width/rect.height;camera.fov=camera.aspect<.75?52:45;camera.updateProjectionMatrix();draw();}
  const {gsap,ScrollTrigger}=window;gsap.registerPlugin(ScrollTrigger);ScrollTrigger.config({ignoreMobileResize:true});
  animation=gsap.to(state,{p:1,ease:'none',onUpdate:draw,scrollTrigger:{trigger:'#journey',start:'top top',end:()=>`+=${$('journey').offsetHeight-$('stage').offsetHeight}`,scrub:reduced.matches?true:.55,invalidateOnRefresh:true}});
  window.addEventListener('resize',resize,{passive:true});window.addEventListener('pageshow',()=>{resize();ScrollTrigger.refresh();draw();});document.addEventListener('visibilitychange',()=>{if(!document.hidden){ScrollTrigger.refresh();draw();}});reduced.addEventListener('change',()=>{animation.scrollTrigger.scrubDuration(reduced.matches?0:.55);draw();});$('replay').addEventListener('click',()=>scrollTo({top:0,behavior:reduced.matches?'instant':'smooth'}));
  resize();ScrollTrigger.refresh();draw();clearTimeout(deadline);$('loading').classList.add('done');setTimeout(()=>{$('loading').hidden=true;},400);
}
start().catch(error=>{clearTimeout(deadline);console.error(error);fail(error.message==='WEBGL_UNAVAILABLE'?'このブラウザではWebGLを使えません。Safariなどで開くか、軽い2.5D版をお試しください。':'素材または3Dライブラリの読み込みに失敗しました。通信を確認して再読み込みしてください。');});
