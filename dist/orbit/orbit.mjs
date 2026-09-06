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
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setClearColor(0x03060c,0);
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();fail('3Dの描画が停止しました。再読み込みすると再開できます。');});
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(48,1,.05,200);
  const sun=new THREE.Vector3(-4,3,7).normalize();
  const light=new THREE.DirectionalLight(0xfff1db,3);light.position.copy(sun).multiplyScalar(20);scene.add(light,new THREE.AmbientLight(0x91acd9,.28));
  const loader=new THREE.TextureLoader();let loaded=0;
  const tex=async(name,color=true)=>{const t=await loader.loadAsync('./assets/'+name+'.webp');if(color)t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());$('loading-detail').textContent=`素材 ${++loaded} / 4`;return t;};
  const [day,night,cloud,moonMap]=await Promise.all([tex('earth-day'),tex('earth-night'),tex('earth-clouds',false),tex('moon')]);
  if(stopped)return;
  const sphere=new THREE.SphereGeometry(EARTH_RADIUS,80,48);
  const earthMaterial=new THREE.ShaderMaterial({uniforms:{dayMap:{value:day},nightMap:{value:night},sunDirection:{value:sun}},vertexShader:`
    varying vec2 vUv; varying vec3 vWorldNormal; varying vec3 vWorldPosition;
    void main(){vUv=uv;vWorldNormal=normalize(mat3(modelMatrix)*normal);vec4 world=modelMatrix*vec4(position,1.);vWorldPosition=world.xyz;gl_Position=projectionMatrix*viewMatrix*world;}
  `,fragmentShader:`
    uniform sampler2D dayMap;uniform sampler2D nightMap;uniform vec3 sunDirection;
    varying vec2 vUv;varying vec3 vWorldNormal;varying vec3 vWorldPosition;
    void main(){vec3 n=normalize(vWorldNormal);float d=dot(n,sunDirection);float daylight=smoothstep(-.12,.28,d);
      vec3 day=texture2D(dayMap,vUv).rgb*(.14+max(d,0.)*1.6);
      vec3 night=texture2D(nightMap,vUv).rgb*1.4+texture2D(dayMap,vUv).rgb*.035;
      vec3 viewDirection=normalize(cameraPosition-vWorldPosition);float rim=pow(1.-max(dot(n,viewDirection),0.),3.4);
      vec3 color=mix(night,day,daylight)+vec3(.09,.32,.65)*rim*(.2+daylight*.6);
      gl_FragColor=vec4(color,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `});
  const earth=new THREE.Mesh(sphere,earthMaterial);earth.rotation.z=.14;scene.add(earth);
  const clouds=new THREE.Mesh(new THREE.SphereGeometry(2.025,64,40),new THREE.MeshPhongMaterial({color:0xffffff,alphaMap:cloud,transparent:true,opacity:.65,depthWrite:false,shininess:0}));clouds.rotation.z=.14;scene.add(clouds);
  const air=new THREE.Mesh(new THREE.SphereGeometry(2.075,64,40),new THREE.ShaderMaterial({side:THREE.BackSide,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{sunDirection:{value:sun}},vertexShader:`varying vec3 n;varying vec3 p;void main(){n=normalize(mat3(modelMatrix)*normal);vec4 w=modelMatrix*vec4(position,1.);p=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,fragmentShader:`uniform vec3 sunDirection;varying vec3 n;varying vec3 p;void main(){vec3 N=normalize(n);vec3 V=normalize(cameraPosition-p);float rim=pow(1.-abs(dot(N,V)),4.);float lit=.15+.85*max(dot(N,sunDirection),0.);gl_FragColor=vec4(.17,.49,1.,rim*.55*lit);}` }));scene.add(air);
  const moon=new THREE.Mesh(new THREE.SphereGeometry(MOON_RADIUS,64,40),new THREE.MeshStandardMaterial({map:moonMap,roughness:1,metalness:0}));moon.position.set(...MOON_POSITION);moon.rotation.set(.1,-1,.1);scene.add(moon);
  // Distant star field is a single GPU draw call; near/far parallax comes from real geometry.
  const positions=[],colors=[];let seed=38;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<1100;i++){const theta=random()*Math.PI*2,z=random()*2-1,r=65+random()*30,k=Math.sqrt(1-z*z);positions.push(r*k*Math.cos(theta),r*z,r*k*Math.sin(theta));const l=.25+random()*.5;colors.push(l*.86,l*.94,l);}
  const starsGeometry=new THREE.BufferGeometry();starsGeometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));starsGeometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));scene.add(new THREE.Points(starsGeometry,new THREE.PointsMaterial({size:.07,vertexColors:true,sizeAttenuation:true,transparent:true,opacity:.9,depthWrite:false})));
  const path=new THREE.CatmullRomCurve3(CAMERA_POINTS.map(p=>new THREE.Vector3(...p)),false,'centripetal');
  const target=new THREE.Vector3();const state={p:0};let currentPhase=-1,lastP=-1;
  const phases=[['01 — DEPARTURE','青の、その先へ。','スクロールして出発 ↓'],['02 — LUNAR FLYBY','月を、かすめる。','もう少し、奥へ ↓'],['03 — EARTH ORBIT','光と影の境界へ。','地球の向こうへ ↓'],['04 — THE OTHER SIDE','夜の地球に、出会う。','旅の終わり。上へ戻ると逆再生']];
  function draw(){
    if(stopped||document.hidden)return;
    const p=state.p;
    camera.position.copy(path.getPoint(reduced.matches?0:p));
    target.set(0,.08,0);camera.lookAt(target);
    earth.rotation.y=-.45+(reduced.matches?0:p*.22);clouds.rotation.y=earth.rotation.y+(reduced.matches?0:p*.10);moon.rotation.y=-1+(reduced.matches?0:p*.12);
    if(Math.abs(p-lastP)>.00001){
      const phase=phaseAt(p);if(phase!==currentPhase){$('eyebrow').textContent=phases[phase][0];$('title').textContent=phases[phase][1];$('hint').textContent=phases[phase][2];currentPhase=phase;}
      $('word').style.opacity=String(Math.max(0,1-p*4));$('word').style.transform=reduced.matches?'none':`translate3d(${-p*75}px,${-p*140}px,0)`;
      $('progress').style.transform=`scaleX(${p})`;$('progress').parentElement.setAttribute('aria-valuenow',String(Math.round(p*100)));$('replay').hidden=p<.98;lastP=p;
    }
    renderer.render(scene,camera);
  }
  function resize(){const rect=$('stage').getBoundingClientRect();renderer.setSize(rect.width,rect.height,false);camera.aspect=rect.width/rect.height;camera.fov=camera.aspect<.75?52:45;camera.updateProjectionMatrix();draw();}
  const {gsap,ScrollTrigger}=window;gsap.registerPlugin(ScrollTrigger);ScrollTrigger.config({ignoreMobileResize:true});
  animation=gsap.to(state,{p:1,ease:'none',onUpdate:draw,scrollTrigger:{trigger:'#journey',start:'top top',end:()=>`+=${$('journey').offsetHeight-$('stage').offsetHeight}`,scrub:reduced.matches?true:.55,invalidateOnRefresh:true}});
  window.addEventListener('resize',resize,{passive:true});window.addEventListener('pageshow',()=>{resize();ScrollTrigger.refresh();draw();});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){ScrollTrigger.refresh();draw();}});
  reduced.addEventListener('change',()=>{animation.scrollTrigger.scrubDuration(reduced.matches?0:.55);draw();});
  $('replay').addEventListener('click',()=>scrollTo({top:0,behavior:reduced.matches?'instant':'smooth'}));
  resize();ScrollTrigger.refresh();draw();clearTimeout(deadline);$('loading').classList.add('done');setTimeout(()=>{$('loading').hidden=true;},400);
}
start().catch(error=>{clearTimeout(deadline);console.error(error);fail(error.message==='WEBGL_UNAVAILABLE'?'このブラウザではWebGLを使えません。Safariなどで開くか、軽い2.5D版をお試しください。':'素材または3Dライブラリの読み込みに失敗しました。通信を確認して再読み込みしてください。');});
