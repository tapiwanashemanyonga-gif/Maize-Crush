(function(root){
"use strict";
const LEVEL_GAP=18;
let engine=null,scene=null,camera=null,gateMeshes=[],activeLevel=1,resizeBound=false;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function mat(name,color,roughness){
 const m=new BABYLON.StandardMaterial(name,scene);m.diffuseColor=BABYLON.Color3.FromHexString(color);m.specularColor=new BABYLON.Color3(.12,.12,.12);m.roughness=roughness||.9;return m;
}
function box(name,pos,size,material,rotationY){
 const m=BABYLON.MeshBuilder.CreateBox(name,{width:size[0],height:size[1],depth:size[2]},scene);m.position.copyFrom(pos);m.material=material;if(rotationY)m.rotation.y=rotationY;return m;
}
function buildHouse(x,z,scale){
 const wall=mat("home-wall-"+x,"#e8d6ae"),roof=mat("home-roof-"+x,"#a84f35"),dark=mat("home-dark-"+x,"#563b2b"),glass=mat("home-glass-"+x,"#6bb7c8");
 box("farmhouse-walls",new BABYLON.Vector3(x,1.5,z),[4*scale,3*scale,3.5*scale],wall);
 const left=box("farmhouse-roof-left",new BABYLON.Vector3(x-1.05*scale,3.25*scale,z),[2.5*scale,.22*scale,4.1*scale],roof,-.48);
 const right=box("farmhouse-roof-right",new BABYLON.Vector3(x+1.05*scale,3.25*scale,z),[2.5*scale,.22*scale,4.1*scale],roof,.48);
 box("farmhouse-door",new BABYLON.Vector3(x,0.85*scale,z-1.78*scale),[.8*scale,1.7*scale,.08*scale],dark);
 for(const dx of [-1.25,1.25])box("farmhouse-window",new BABYLON.Vector3(x+dx*scale,1.85*scale,z-1.79*scale),[.7*scale,.65*scale,.08*scale],glass);
 box("farmhouse-chimney",new BABYLON.Vector3(x+1.15*scale,4*scale,z+.55*scale),[.42*scale,1.2*scale,.42*scale],dark);
}
function createGate(level,point){
 const wood=mat("gate-wood-"+level,"#80512f"),gold=mat("gate-gold-"+level,"#f6c653"),stone=mat("gate-stone-"+level,"#d9d0b6");
 const group=new BABYLON.TransformNode("level-gate-"+level,scene);group.position.copyFrom(point);
 const postA=box("gate-post",new BABYLON.Vector3(-1.25,1.25,0),[.34,2.5,.34],wood);postA.parent=group;
 const postB=box("gate-post",new BABYLON.Vector3(1.25,1.25,0),[.34,2.5,.34],wood);postB.parent=group;
 const beam=box("gate-beam",new BABYLON.Vector3(0,2.45,0),[2.9,.38,.42],gold);beam.parent=group;
 const sign=box("gate-sign",new BABYLON.Vector3(0,2.45,-.27),[1.6,.85,.12],stone);sign.parent=group;
 const texture=new BABYLON.DynamicTexture("gate-number-"+level,{width:256,height:128},scene,false);texture.hasAlpha=true;texture.drawText(String(level),null,94,"bold 76px Arial","#273522","transparent",true);
 const signMat=new BABYLON.StandardMaterial("gate-sign-mat-"+level,scene);signMat.diffuseTexture=texture;signMat.emissiveColor=new BABYLON.Color3(.8,.8,.8);sign.material=signMat;
 const base=box("gate-base",new BABYLON.Vector3(0,.16,0),[3.5,.32,1.25],wood);base.parent=group;
 gateMeshes.push({level,group,sign,posts:[postA,postB,beam,base]});
 return group;
}
function buildWorld(){
 scene=new BABYLON.Scene(engine);scene.clearColor=new BABYLON.Color4(.48,.76,.91,1);scene.fogMode=BABYLON.Scene.FOGMODE_EXP2;scene.fogColor=new BABYLON.Color3(.48,.76,.91);scene.fogDensity=.006;
 const hemi=new BABYLON.HemisphericLight("sky-light",new BABYLON.Vector3(0,1,0),scene);hemi.intensity=.82;
 const sun=new BABYLON.DirectionalLight("sunlight",new BABYLON.Vector3(-.55,-1,.35),scene);sun.position=new BABYLON.Vector3(30,55,-20);sun.intensity=1.05;
 const grass=mat("savanna-grass","#79b85b"),hill=mat("kopje-rock","#8b8273"),road=mat("asphalt","#424b50"),line=mat("road-marking","#f8e9bd"),soil=mat("red-earth","#a76d42"),field=mat("maize-field","#d4b04b"),leaf=mat("tree-leaf","#347b43"),trunk=mat("tree-trunk","#725038");
 const ground=BABYLON.MeshBuilder.CreateGround("Zimbabwe-countryside",{width:180,height:230,subdivisions:32},scene);ground.position.z=70;ground.material=grass;
 for(let i=0;i<13;i++){const h=BABYLON.MeshBuilder.CreateSphere("rolling-hill",{diameter:1,segments:12},scene);const s=12+(i%4)*4;h.scaling=new BABYLON.Vector3(s*.9,s*.36,s*1.5);h.position.set((i%2?1:-1)*(32+(i%4)*9),-1,12+i*15);h.material=i%3===0?hill:grass}
 const route=[new BABYLON.Vector3(0,.06,-5),new BABYLON.Vector3(3,.06,12),new BABYLON.Vector3(-4,.06,30),new BABYLON.Vector3(-13,.06,48),new BABYLON.Vector3(-8,.06,66),new BABYLON.Vector3(8,.06,84),new BABYLON.Vector3(13,.06,102),new BABYLON.Vector3(2,.06,120),new BABYLON.Vector3(-8,.06,140)];
 const ribbon=(name,width,height,material)=>{const paths=route.map((p,i)=>{const before=route[Math.max(0,i-1)],after=route[Math.min(route.length-1,i+1)],dx=after.x-before.x,dz=after.z-before.z,len=Math.hypot(dx,dz)||1,nx=-dz/len,nz=dx/len;return[new BABYLON.Vector3(p.x+nx*width/2,height,p.z+nz*width/2),new BABYLON.Vector3(p.x-nx*width/2,height,p.z-nz*width/2)]});const mesh=BABYLON.MeshBuilder.CreateRibbon(name,{pathArray:paths,sideOrientation:BABYLON.Mesh.DOUBLESIDE},scene);mesh.material=material;return mesh};
 ribbon("road-shoulder",10,.025,soil);ribbon("continuous-asphalt-road",8.2,.055,road);
 const dashMat=line;for(let i=0;i<route.length-1;i++){const a=route[i],b=route[i+1],segments=6;for(let j=0;j<segments;j+=2){const t0=j/segments,t1=Math.min(1,(j+1)/segments),p0=BABYLON.Vector3.Lerp(a,b,t0),p1=BABYLON.Vector3.Lerp(a,b,t1);const dash=BABYLON.MeshBuilder.CreateBox("road-center-dash",{width:.16,height:.035,depth:BABYLON.Vector3.Distance(p0,p1)*.7},scene);dash.position.set((p0.x+p1.x)/2,.09,(p0.z+p1.z)/2);dash.rotation.y=Math.atan2(p1.x-p0.x,p1.z-p0.z);dash.material=dashMat}}
 for(let i=0;i<16;i++){
  const z=4+i*8,x=(i%2?1:-1)*(10+(i%3)*2);
  const trunkMesh=BABYLON.MeshBuilder.CreateCylinder("msasa-trunk",{height:3.2,diameter:.55},scene);trunkMesh.position.set(x,1.5,z);trunkMesh.material=trunk;
  const crown=BABYLON.MeshBuilder.CreateSphere("msasa-canopy",{diameter:4.2,segments:8},scene);crown.position.set(x,4,z);crown.scaling.y=.8;crown.material=leaf;
 }
 for(let i=0;i<8;i++){const z=12+i*16;const patch=BABYLON.MeshBuilder.CreateGround("cultivated-field",{width:12,height:10},scene);patch.position.set(i%2?23:-23,.025,z);patch.material=i%2?field:soil}
 buildHouse(-19,18,1.05);buildHouse(21,53,.85);buildHouse(-22,93,.95);
 const riverMat=mat("river-water","#43a9c3",.25);
 const riverPath=[new BABYLON.Vector3(34,.04,4),new BABYLON.Vector3(39,.04,25),new BABYLON.Vector3(34,.04,45),new BABYLON.Vector3(40,.04,67),new BABYLON.Vector3(36,.04,92),new BABYLON.Vector3(43,.04,125)];
 const river=BABYLON.MeshBuilder.CreateTube("river-valley",{path:riverPath,radius:2.6,tessellation:12},scene);river.material=riverMat;
 const gatePoints=[new BABYLON.Vector3(0,0,2),new BABYLON.Vector3(-7,0,36),new BABYLON.Vector3(8,0,73),new BABYLON.Vector3(5,0,112)];
 gatePoints.forEach((p,i)=>createGate(i+1,p));
 camera=new BABYLON.ArcRotateCamera("harvest-follow-camera",Math.PI*1.5,1.05,39,new BABYLON.Vector3(0,0,16),scene);camera.lowerRadiusLimit=25;camera.upperRadiusLimit=65;camera.lowerBetaLimit=.65;camera.upperBetaLimit=1.28;camera.panningSensibility=75;camera.wheelPrecision=45;camera.attachControl(engine.getRenderingCanvas(),true);
 scene.onBeforeRenderObservable.add(()=>{const t=performance.now()*.00025;sun.direction=new BABYLON.Vector3(-.55,-1,.35+Math.sin(t)*.04)});
}
function focusLevel(level,animate){
 activeLevel=clamp(Number(level)||1,1,gateMeshes.length);
 const gate=gateMeshes[activeLevel-1];if(!gate||!camera)return;
 const target=gate.group.position.add(new BABYLON.Vector3(0,0,0));
 if(animate){BABYLON.Animation.CreateAndStartAnimation("road-camera-drive",camera,"target",30,42,camera.target.clone(),target, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);}
 else camera.setTarget(target);
 gateMeshes.forEach(item=>{item.group.scaling.setAll(item.level===activeLevel?1.12:1);item.sign.material.emissiveColor=item.level===activeLevel?new BABYLON.Color3(.5,.34,.08):new BABYLON.Color3(.08,.08,.08)});
}
function start(canvasId,level){
 const canvas=document.getElementById(canvasId);if(!canvas||!root.BABYLON)return false;
 if(engine){engine.dispose();engine=null;scene=null;gateMeshes=[]}
 try{engine=new BABYLON.Engine(canvas,true,{preserveDrawingBuffer:false,stencil:true,antialias:true,powerPreference:"high-performance"});buildWorld();focusLevel(level||1,false);engine.runRenderLoop(()=>{if(scene)scene.render()});if(!resizeBound){window.addEventListener("resize",()=>engine&&engine.resize());resizeBound=true}return true}catch(error){console.error("3D Harvest World failed:",error);return false}
}
root.HarvestWorld3D={start,focusLevel,get ready(){return!!scene},dispose(){if(engine){engine.stopRenderLoop();engine.dispose();engine=null;scene=null;gateMeshes=[]}}};
})(window);
