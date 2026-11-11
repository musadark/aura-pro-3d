import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { createProduct } from "./aura-model";
import { createAtmosphere } from "./aura-effects";

export interface SceneController {
  setMotion(enabled: boolean): void;
  setFinish(value: "graphite" | "pearl"): void;
  setAngle(radians: number): void;
  dispose(): void;
}
type Callbacks = { onChapter: (index: number) => void; onReady: () => void; onError: () => void };
const clamp = (v: number, a=0, b=1) => Math.max(a,Math.min(b,v));
const smooth = (a: number,b: number,v: number) => { const t=clamp((v-a)/(b-a)); return t*t*(3-2*t); };
const mix = THREE.MathUtils.lerp;

function noise(x: number,y: number) {
  const hash = (a: number,b: number) => { const s=Math.sin(a*127.1+b*311.7)*43758.5453;return s-Math.floor(s); };
  const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;
  const u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);
  return mix(mix(hash(ix,iy),hash(ix+1,iy),u),mix(hash(ix,iy+1),hash(ix+1,iy+1),u),v);
}
function fbm(x: number,y: number) {
  let value=0,amp=.5;
  for(let i=0;i<5;i++){value+=amp*noise(x,y);x=x*2.13+17;y=y*2.13+9;amp*=.5;}
  return value;
}

export function createAuraScene(canvas: HTMLCanvasElement, root: HTMLElement, callbacks: Callbacks): SceneController {
  const renderer = new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:"high-performance"});
  renderer.setClearColor(0x000000,0);
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.05;
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(38,1,.1,60);
  camera.position.set(0,.5,8.5); camera.lookAt(0,0,0);
  const room = new RoomEnvironment();
  const pmrem=new THREE.PMREMGenerator(renderer);
  const environment=pmrem.fromScene(room,.045);
  scene.environment=environment.texture; scene.environmentIntensity=1;
  room.dispose(); pmrem.dispose();
  const ambient=new THREE.HemisphereLight(0xb9e1e8,0x071115,.3); scene.add(ambient);
  const key=new THREE.DirectionalLight(0xd6faff,2.5);key.position.set(-3,5,4);scene.add(key);
  const rim=new THREE.DirectionalLight(0x76bed8,3);rim.position.set(4,3,-4);scene.add(rim);
  const fill=new THREE.DirectionalLight(0xf8fbeb,.6);fill.position.set(1,-1,5);scene.add(fill);
  const product=createProduct(); scene.add(product.pair,product.chargingCase);
  const atmosphere = createAtmosphere(scene, [product.left, product.right]);
  const panels = Array.from(root.querySelectorAll<HTMLElement>(".copy-panel"));

  // Texture and terrain are generated locally; no model/image downloads at runtime.
  const textureCanvas=document.createElement("canvas");textureCanvas.width=textureCanvas.height=256;
  const ctx=textureCanvas.getContext("2d")!;
  const pixels=ctx.createImageData(256,256);
  for(let y=0;y<256;y++) for(let x=0;x<256;x++){
    const i=(y*256+x)*4;const value=fbm(x*.10,y*.10)*150+noise(x*.9,y*.9)*65;
    pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=value;pixels.data[i+3]=255;
  }
  ctx.putImageData(pixels,0,0);
  const texture=new THREE.CanvasTexture(textureCanvas);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(5,5);
  const stone=new THREE.MeshStandardMaterial({color:0x070b0e,roughness:.93,metalness:.05,envMapIntensity:.07,bumpMap:texture,bumpScale:.27});
  const terrain=new THREE.Group();scene.add(terrain);
  const groundGeometry=new THREE.PlaneGeometry(17,14,64,48);groundGeometry.rotateX(-Math.PI/2);
  const positions=groundGeometry.attributes.position;
  for(let i=0;i<positions.count;i++){
    const x=positions.getX(i),z=positions.getZ(i);
    const ridge=Math.abs(Math.sin(x*.6+z*.4))*.35;
    positions.setY(i,fbm(x*.85+10,z*.8+20)*1.4+ridge);
  }
  groundGeometry.computeVertexNormals();
  const ground=new THREE.Mesh(groundGeometry,stone);ground.position.set(0,-3,-3);terrain.add(ground);
  const rocks: THREE.Mesh[]=[];
  [[-5.7,-2.4,-2,2.8],[5.2,-2.3,-2,2.7],[5.7,4.5,-5,3]].forEach((data,index)=>{
    const geometry=new THREE.SphereGeometry(1,48,32);const p=geometry.attributes.position;
    for(let i=0;i<p.count;i++){
      const x=p.getX(i),y=p.getY(i),z=p.getZ(i);const scale=.75+fbm(x*4+index*8,z*5+y*2)*.65;
      p.setXYZ(i,x*scale,y*scale*.7,z*scale);
    }
    geometry.computeVertexNormals();const rock=new THREE.Mesh(geometry,stone);
    rock.position.set(data[0],data[1],data[2]);rock.scale.setScalar(data[3]);terrain.add(rock);rocks.push(rock);
  });
  const podium=new THREE.Group();scene.add(podium);
  const podiumMat=new THREE.MeshStandardMaterial({color:0x1b2322,metalness:.2,roughness:.6,envMapIntensity:.3});
  const plinth=new THREE.Mesh(new THREE.CylinderGeometry(1.7,1.72,.6,80),podiumMat);plinth.position.y=-1.17;podium.add(plinth);
  const lip=new THREE.Mesh(new THREE.TorusGeometry(1.69,.018,8,80),new THREE.MeshStandardMaterial({color:0x81918c,metalness:.8,roughness:.32}));lip.rotation.x=Math.PI/2;lip.position.y=-.87;podium.add(lip);
  const floor=new THREE.Mesh(new THREE.CircleGeometry(12,64),new THREE.MeshBasicMaterial({color:0x080d0e}));floor.rotation.x=-Math.PI/2;floor.position.y=-1.48;podium.add(floor);

  let mobile=false,motion=!matchMedia("(prefers-reduced-motion: reduce)").matches;
  let angle=0,target=0,current=0,chapter=-1,raf=0,lastTime=0,elapsed=0,dirty=true,disposed=false,contextLost=false,visible=!document.hidden;
  const pointer=new THREE.Vector2();
  const pointerTarget=new THREE.Vector2();
  let sampleCount=0,sampleTime=0;
  let basePixelRatio=1,qualityScale=1,slowWindows=0,warmupFrames=45,lastUIProgress=-1;
  let viewportWidth=1,viewportHeight=1;
  function readScroll(){const box=root.getBoundingClientRect();target=clamp(-box.top/Math.max(1,box.height-innerHeight),0,1)*3;dirty=true;schedule();}
  function resize(){
    const box=canvas.getBoundingClientRect();mobile=box.width<=680;
    viewportWidth=box.width;viewportHeight=box.height;
    camera.aspect=box.width/Math.max(1,box.height);camera.position.z=mobile?10:8.5;
    camera.fov=mobile?42:38;camera.updateProjectionMatrix();
    // Limit only the 3D drawing buffer; HTML text stays at native resolution.
    const pixelBudget=mobile?900000:1500000;
    basePixelRatio=Math.min(devicePixelRatio,mobile?1.2:1.25,Math.sqrt(pixelBudget/Math.max(1,box.width*box.height)));
    renderer.setPixelRatio(basePixelRatio*qualityScale);renderer.setSize(box.width,box.height,false);
    warmupFrames=45;sampleCount=0;sampleTime=0;lastUIProgress=-1;
    readScroll();
  }
  function move(event: PointerEvent){if(event.pointerType!=="mouse")return;pointerTarget.set((event.clientX/innerWidth-.5)*2,(event.clientY/innerHeight-.5)*2);dirty=true;schedule();}
  function visibility(){visible=!document.hidden;if(!visible){cancelAnimationFrame(raf);raf=0;}else{lastTime=0;dirty=true;schedule();}}
  function lost(event: Event){event.preventDefault();contextLost=true;cancelAnimationFrame(raf);raf=0;callbacks.onError();}
  function restored(){contextLost=false;dirty=true;callbacks.onReady();schedule();}
  // Each row is a scene pose; scroll interpolates between the four rows.
  const desktop=[
    {x:1.55,y:.12,s:1.6,ry:-.4,rz:-.15,gap:.74,ly:.4,ry2:-.22},
    {x:-.65,y:.25,s:1.8,ry:.5,rz:.14,gap:.95,ly:.28,ry2:-.3},
    {x:0,y:.5,s:1.42,ry:Math.PI*2-.2,rz:0,gap:.85,ly:.03,ry2:.03},
    {x:1.65,y:-.1,s:.69,ry:Math.PI*2+.25,rz:0,gap:.59,ly:.58,ry2:.58},
  ];
  const phone=[
    {x:-.08,y:1.4,s:1.2,ry:-.4,rz:-.14,gap:.65,ly:.3,ry2:-.13},
    {x:-.1,y:1.3,s:1.25,ry:.5,rz:.12,gap:.81,ly:.2,ry2:-.15},
    {x:0,y:1.45,s:1.05,ry:Math.PI*2-.2,rz:0,gap:.75,ly:.02,ry2:.02},
    {x:0,y:1.25,s:.55,ry:Math.PI*2+.25,rz:0,gap:.59,ly:.58,ry2:.58},
  ];
  function render(now: number){
    raf=0;if(disposed||!visible||contextLost)return;
    const frameMs=lastTime?now-lastTime:16.67;
    const dt=Math.min(frameMs/1000,.08);lastTime=now;
    if(warmupFrames>0)warmupFrames--;
    else if(motion && frameMs<200) { sampleCount++;sampleTime+=frameMs; }
    if(motion)elapsed+=dt;
    current=motion?mix(current,target,1-Math.exp(-dt*5.5)):Math.round(target);
    pointer.lerp(pointerTarget,1-Math.exp(-dt*6));
    if(Math.abs(current-target)<.0005)current=target;
    const active=Math.round(current);
    if(active!==chapter){chapter=active;callbacks.onChapter(chapter);}
    const p=motion?current:chapter;
    const a=Math.min(2,Math.floor(p)),t=smooth(0,1,p-a),poses=mobile?phone:desktop;
    const get=(key:keyof typeof desktop[0])=>mix(poses[a][key],poses[a+1][key],t);
    const bob=motion?Math.sin(elapsed*.75)*.035:0;
    const narrow = !mobile && viewportWidth < 1000;
    // A continuous dolly/orbit follows scroll, including between text chapters.
    const travel = motion ? Math.sin(p * Math.PI) : 0;
    camera.position.set(mobile ? 0 : travel * .42, .5 + (mobile ? .08 : .24) * travel,
      (mobile ? 10 : narrow ? 10.4 : 8.5) - travel * (mobile ? .15 : .65));
    camera.lookAt(0, 0, 0);
    product.pair.position.set(get("x") * (narrow ? .85 : 1),get("y")+bob,0);
    product.pair.scale.setScalar(get("s"));
    product.pair.rotation.set(.08+(motion?pointer.y*.025:0),get("ry")+angle+(motion?pointer.x*.045:0),get("rz"));
    const dock=smooth(2.35,3,p);
    product.left.position.set(-get("gap"),get("ly"),travel*.25);
    product.right.position.set(get("gap"),get("ry2"),.1-travel*.25);
    product.left.rotation.set(-.18,mix(-.35,-.2,dock),mix(-.3,0,dock));
    product.right.rotation.set(.10,mix(2.6,2.85,dock),mix(.38,0,dock));
    const white=smooth(1.35,1.75,p)*(1-smooth(2.2,2.6,p));
    atmosphere.update(p, elapsed, mobile, white);
    if(Math.abs(p-lastUIProgress)>.00005){
    lastUIProgress=p;
    root.style.setProperty("--light",white.toFixed(4));root.style.setProperty("--progress",(current/3).toFixed(4));
    root.style.setProperty("--origin-title",String(.07*(1-smooth(.25,.9,p))));
    root.style.setProperty("--pro-title",String(.14*white));
    root.style.setProperty("--final-title",String(.8*smooth(2.5,3,p)));
    root.style.setProperty("--finale",String(smooth(2.3,3,p)));
    panels.forEach((panel,index) => {
      const distance=p-index;
      const opacity=1-smooth(.24,.55,Math.abs(distance));
      panel.style.opacity=String(opacity);
      panel.style.visibility=opacity>.005?"visible":"hidden";
      panel.style.transform=`translateY(${motion?clamp(-distance*65,-35,35):0}px)`;
    });
    }
    scene.environmentIntensity=mix(1,1.35,white);key.intensity=mix(2.5,2,white);
    rim.color.set(white>.6?0xffffff:0x76bed8);
    terrain.visible=p<1.8;terrain.position.y=-smooth(1.15,1.8,p)*4;terrain.rotation.y=p*.13;
    const reveal=smooth(2.25,2.9,p);
    product.chargingCase.visible=reveal>.001;podium.visible=reveal>.001;
    const caseScale=mobile?.83:1.1;
    product.chargingCase.scale.setScalar(caseScale*Math.max(.001,reveal));
    product.chargingCase.position.set(get("x"),mobile?.65:-.50,0);
    product.chargingCase.rotation.set(.12,.25+angle,0);
    product.hinge.rotation.x=-mix(.1,1.85,reveal);
    podium.position.set(get("x"),mobile?.5:-.1,0);podium.scale.setScalar(mobile?.8:1.1);
    podium.position.y-=(1-reveal)*2;
    renderer.render(scene,camera);dirty=false;
    if(sampleCount>=90){
      const average=sampleTime/sampleCount;
      root.dataset.renderStats=JSON.stringify({frameMs:Math.round(average*10)/10,pixelRatio:renderer.getPixelRatio(),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles});
      slowWindows=average>24?slowWindows+1:0;
      if(slowWindows>=2 && basePixelRatio*qualityScale>.72){
        qualityScale=Math.max(.7/basePixelRatio,qualityScale*.85);
        renderer.setPixelRatio(basePixelRatio*qualityScale);
        renderer.setSize(viewportWidth,viewportHeight,false);
        slowWindows=0;warmupFrames=45;
      }
      sampleCount=0;sampleTime=0;
    }
    if(motion)schedule();
  }
  function schedule(){if(!raf&&!disposed&&visible&&!contextLost)raf=requestAnimationFrame(render);}
  addEventListener("scroll",readScroll,{passive:true});addEventListener("resize",resize);addEventListener("pointermove",move,{passive:true});document.addEventListener("visibilitychange",visibility);
  canvas.addEventListener("webglcontextlost",lost);canvas.addEventListener("webglcontextrestored",restored);
  resize();cancelAnimationFrame(raf);raf=0;current=target;render(performance.now());callbacks.onReady();
  return {
    setMotion(enabled){motion=enabled;lastTime=0;lastUIProgress=-1;sampleCount=0;sampleTime=0;dirty=true;schedule();},
    setFinish(value){product.materials.shell.color.set(value==="pearl"?0xbac4bb:0x090f13);product.materials.shell.metalness=value==="pearl"?.2:.35;dirty=true;schedule();},
    setAngle(value){angle=value;dirty=true;schedule();},
    dispose(){
      disposed=true;cancelAnimationFrame(raf);removeEventListener("scroll",readScroll);removeEventListener("resize",resize);removeEventListener("pointermove",move);document.removeEventListener("visibilitychange",visibility);canvas.removeEventListener("webglcontextlost",lost);canvas.removeEventListener("webglcontextrestored",restored);
      atmosphere.dispose();
      const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();
      scene.traverse(item=>{if(item instanceof THREE.Mesh){if(item instanceof THREE.InstancedMesh)item.dispose();geometries.add(item.geometry);(Array.isArray(item.material)?item.material:[item.material]).forEach(m=>materials.add(m));}});
      geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());texture.dispose();environment.dispose();renderer.dispose();
    },
  };
}
