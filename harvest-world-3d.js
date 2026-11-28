(function(root){
"use strict";
const LEVEL_GAP=18;
let engine=null,scene=null,camera=null,shadowGenerator=null,renderPixelRatio=1,gateMeshes=[],settlementAnchors=[],terrainAnchor=null,tractor=null,tractorWheels=[],activeLevel=1,pageStart=1,resizeBound=false,visibilityBound=false,assetsReady=false,farmsteadLoaded=false,terrainLoaded=false,settlementLoaded=false,farmsteadMeshCount=0,terrainMeshCount=0,settlementMeshCount=0,loadStatus="Preparing Harvest Trail…",onLoadProgress=null;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function setLoadStatus(message){loadStatus=message;if(typeof onLoadProgress==="function")onLoadProgress(message);}
const roadX=z=>9.5*Math.sin((z+8)*.043)+2.2*Math.sin(z*.095);
const terrainHeight=(x,z)=>1.1*Math.sin(z*.035+x*.018)+.65*Math.cos(x*.055-z*.021)+.22*Math.sin(x*.19+z*.11)*Math.cos(z*.16)-.5;
function mat(name,color,roughness){
 const m=new BABYLON.StandardMaterial(name,scene);m.diffuseColor=BABYLON.Color3.FromHexString(color);m.specularColor=new BABYLON.Color3(.12,.12,.12);m.roughness=roughness||.9;return m;
}
function castShadow(mesh){mesh.receiveShadows=true;if(shadowGenerator)shadowGenerator.addShadowCaster(mesh,true);return mesh;}
function box(name,pos,size,material,rotationY,rotationZ){
 const m=BABYLON.MeshBuilder.CreateBox(name,{width:size[0],height:size[1],depth:size[2]},scene);m.position.copyFrom(pos);m.material=material;if(rotationY)m.rotation.y=rotationY;if(rotationZ)m.rotation.z=rotationZ;return castShadow(m);
}
function createGate(level,point){
 const wood=mat("gate-wood-"+level,"#80512f"),gold=mat("gate-gold-"+level,"#f6c653"),stone=mat("gate-stone-"+level,"#d9d0b6");
 const group=new BABYLON.TransformNode("level-gate-"+level,scene);group.position.copyFrom(point);group.metadata={level};
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
function createTractor(position){
 const group=new BABYLON.TransformNode("harvest-progress-tractor",scene);
 const green=mat("tractor-enamel","#3e8b42",.38),darkGreen=mat("tractor-shadow","#245c32",.55),rubber=mat("tractor-tyres","#202522",.96),hub=mat("tractor-wheel-hubs","#c7c9b8",.48),glass=mat("tractor-cab-glass","#9bd9df",.28),metal=mat("tractor-metal","#aab5a5",.5),lamp=mat("tractor-headlights","#fff0a8",.25);
 glass.alpha=.72;
 const chassis=box("tractor-chassis",new BABYLON.Vector3(0,.62,0),[1.28,.34,2.15],darkGreen);chassis.parent=group;
 const bonnet=box("tractor-bonnet",new BABYLON.Vector3(0,1.02,.62),[1.12,.72,1.02],green);bonnet.parent=group;
 const nose=box("tractor-front-grille",new BABYLON.Vector3(0,.94,1.15),[.78,.42,.08],metal);nose.parent=group;
 const cabBase=box("tractor-cab-base",new BABYLON.Vector3(0,1.46,-.38),[1.05,.12,.98],darkGreen);cabBase.parent=group;
 const cabRoof=box("tractor-cab-roof",new BABYLON.Vector3(0,2.43,-.38),[1.34,.16,1.25],green);cabRoof.parent=group;
 const rearGlass=box("tractor-cab-rear-glass",new BABYLON.Vector3(0,1.94,-.91),[.94,.78,.055],glass);rearGlass.parent=group;
 const frontGlass=box("tractor-cab-front-glass",new BABYLON.Vector3(0,1.94,.16),[.94,.78,.055],glass);frontGlass.parent=group;
 const sideGlassA=box("tractor-cab-side-left",new BABYLON.Vector3(-.53,1.94,-.38),[.055,.78,.96],glass);sideGlassA.parent=group;
 const sideGlassB=box("tractor-cab-side-right",new BABYLON.Vector3(.53,1.94,-.38),[.055,.78,.96],glass);sideGlassB.parent=group;
 const exhaust=box("tractor-exhaust",new BABYLON.Vector3(-.39,1.63,.82),[.09,.62,.09],metal);exhaust.parent=group;
 const lightA=box("tractor-headlight-left",new BABYLON.Vector3(-.39,1.18,1.205),[.2,.18,.06],lamp);lightA.parent=group;
 const lightB=box("tractor-headlight-right",new BABYLON.Vector3(.39,1.18,1.205),[.2,.18,.06],lamp);lightB.parent=group;
 const seat=box("tractor-seat",new BABYLON.Vector3(0,1.38,-.52),[.42,.14,.38],darkGreen);seat.parent=group;
 tractorWheels=[];
 for(const side of [-1,1]){
  for(const axle of [-1,1]){
   const rear=axle<0,diameter=rear?1.02:.66;
   const wheel=BABYLON.MeshBuilder.CreateCylinder("tractor-wheel",{diameter,height:.28,tessellation:16},scene);
   wheel.rotation.z=Math.PI/2;wheel.position.set(side*(rear?.78:.7),diameter/2,axle<0?-.78:.72);wheel.material=rubber;wheel.parent=group;castShadow(wheel);
   const wheelHub=BABYLON.MeshBuilder.CreateCylinder("tractor-wheel-hub",{diameter:diameter*.43,height:.3,tessellation:12},scene);
   wheelHub.rotation.z=Math.PI/2;wheelHub.position.copyFrom(wheel.position);wheelHub.material=hub;wheelHub.parent=group;
   tractorWheels.push(wheel);
  }
 }
 group.position.copyFrom(position);tractor=group;return group;
}
function moveTractor(position,animate){
 if(!tractor)return;
 scene.stopAnimation(tractor);tractorWheels.forEach(wheel=>scene.stopAnimation(wheel));
 if(!animate){tractor.position.copyFrom(position);return;}
 const start=tractor.position.clone();
 BABYLON.Animation.CreateAndStartAnimation("tractor-road-journey",tractor,"position",30,42,start,position,BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
 tractorWheels.forEach((wheel,index)=>{
  const spin=wheel.rotation.x;
  BABYLON.Animation.CreateAndStartAnimation("tractor-wheel-roll-"+index,wheel,"rotation.x",30,42,spin,spin-Math.PI*2,BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
 });
}
function buildWorld(startLevel){
 assetsReady=false;farmsteadLoaded=false;terrainLoaded=false;settlementLoaded=false;farmsteadMeshCount=0;terrainMeshCount=0;settlementMeshCount=0;settlementAnchors=[];terrainAnchor=null;
 pageStart=Math.floor((Math.max(1,Number(startLevel)||1)-1)/4)*4+1;
 scene=new BABYLON.Scene(engine);scene.clearColor=new BABYLON.Color4(.48,.76,.91,1);scene.shadowsEnabled=true;scene.fogMode=BABYLON.Scene.FOGMODE_EXP2;scene.fogColor=new BABYLON.Color3(.48,.76,.91);scene.fogDensity=.0011;
 const hemi=new BABYLON.HemisphericLight("sky-light",new BABYLON.Vector3(0,1,0),scene);hemi.intensity=.68;hemi.groundColor=new BABYLON.Color3(.30,.24,.16);
 const sun=new BABYLON.DirectionalLight("sunlight",new BABYLON.Vector3(-.55,-1,.35),scene);sun.position=new BABYLON.Vector3(30,55,-20);sun.intensity=1.18;sun.shadowMinZ=1;sun.shadowMaxZ=180;
 shadowGenerator=new BABYLON.ShadowGenerator(1024,sun);shadowGenerator.useBlurExponentialShadowMap=true;shadowGenerator.blurKernel=18;shadowGenerator.setDarkness(.30);shadowGenerator.bias=.0005;shadowGenerator.normalBias=.025;shadowGenerator.transparencyShadow=true;
 // Load the authored Blender landscape and farmstead as local GLB assets.
 // Procedural roadside placeholders are deliberately no longer the primary scenery.
 const loadAuthoredAsset=(filename,anchorName,position,scale,rotationY=0)=>{
  return BABYLON.SceneLoader.ImportMeshAsync("","./assets/",filename,scene).then(result=>{
   const anchor=new BABYLON.TransformNode(anchorName,scene);
   anchor.position.copyFrom(position);anchor.scaling.setAll(scale);anchor.rotation.y=rotationY;
   const geometryMeshes=result.meshes.filter(mesh=>mesh.name!=="__root__"&&typeof mesh.getTotalVertices==="function"&&mesh.getTotalVertices()>0);
   geometryMeshes.forEach(mesh=>{mesh.parent=anchor;mesh.receiveShadows=true;if(!anchorName.includes("zimbabwe-terrain"))shadowGenerator.addShadowCaster(mesh,true)});
   const geometryCount=geometryMeshes.length;
   if(anchorName.includes("zimbabwe-terrain")){terrainMeshCount=geometryCount;terrainAnchor=anchor;}
   else if(anchorName.includes("zimbabwe-farmstead"))farmsteadMeshCount=geometryCount;
   else if(anchorName.includes("rural-settlement")){settlementMeshCount+=geometryCount;settlementAnchors.push({anchor,meshes:geometryMeshes});}
   return true;
  }).catch(error=>{console.warn("Authored world asset unavailable:",filename,error);return false});
 };
 // Load the road-bearing terrain first so the journey becomes visible before optional homestead detail.
 // The settlement yards are 22m wide. Keeping their anchors 20m from the road centreline
 // leaves their nearest yard edge 9m away: beyond the 6.15m shoulder and 8.15m drainage ditch.
 setLoadStatus("Loading road and terrain…");
 const terrainPromise=loadAuthoredAsset("harvest-world-terrain.glb","blender-authored-zimbabwe-terrain",new BABYLON.Vector3(0,0,0),1).then(ok=>{
  terrainLoaded=ok;
  setLoadStatus(ok?"Road and terrain ready · loading homesteads…":"Terrain unavailable · loading homesteads…");
  return ok;
 });
 const optionalAssetsPromise=terrainPromise.then(()=>{
  const farmsteadZ=14,farmsteadX=roadX(farmsteadZ)+17.5;
  const farmsteadPromise=loadAuthoredAsset("harvest-world-farmstead.glb","blender-authored-zimbabwe-farmstead",new BABYLON.Vector3(farmsteadX,terrainHeight(farmsteadX,farmsteadZ),farmsteadZ),.72).then(ok=>{farmsteadLoaded=ok;return ok});
  const settlementEastZ=38,settlementEastX=roadX(settlementEastZ)+20;
  const settlementWestZ=74,settlementWestX=roadX(settlementWestZ)-20;
  const settlementEast=loadAuthoredAsset("harvest-world-settlement.glb","blender-authored-rural-settlement-east",new BABYLON.Vector3(settlementEastX,terrainHeight(settlementEastX,settlementEastZ),settlementEastZ),.72);
  const settlementWest=loadAuthoredAsset("harvest-world-settlement.glb","blender-authored-rural-settlement-west",new BABYLON.Vector3(settlementWestX,terrainHeight(settlementWestX,settlementWestZ),settlementWestZ),.72,Math.PI);
  const settlementPromise=Promise.all([settlementEast,settlementWest]).then(results=>{settlementLoaded=results.every(Boolean);return settlementLoaded});
  return Promise.all([farmsteadPromise,settlementPromise]);
 });
 optionalAssetsPromise.then(()=>{assetsReady=true;setLoadStatus("Harvest Trail ready");});
 // Place physical level gates directly beside the winding Blender road.
 const gatePoints=[2,36,73,112].map(z=>new BABYLON.Vector3(roadX(z)+4.8,terrainHeight(roadX(z)+4.8,z)+.28,z));
 gatePoints.forEach((p,i)=>createGate(pageStart+i,p));
 const firstRoadZ=gatePoints[0].z-4.8,firstRoadX=roadX(firstRoadZ);
 createTractor(new BABYLON.Vector3(firstRoadX,terrainHeight(firstRoadX,firstRoadZ)+.27,firstRoadZ));
 scene.onPointerObservable.add(info=>{if(info.type!==BABYLON.PointerEventTypes.POINTERTAP)return;const pick=scene.pick(scene.pointerX,scene.pointerY);if(!pick||!pick.hit||!pick.pickedMesh)return;let node=pick.pickedMesh;while(node&&!node.metadata?.level)node=node.parent;if(node&&node.metadata.level<=activeLevel&&typeof root.HarvestWorld3D.onSelectLevel==="function")root.HarvestWorld3D.onSelectLevel(node.metadata.level)});
 camera=new BABYLON.ArcRotateCamera("harvest-follow-camera",Math.PI*1.5,1.42,42,new BABYLON.Vector3(0,0,16),scene);camera.lowerRadiusLimit=25;camera.upperRadiusLimit=65;camera.lowerBetaLimit=.65;camera.upperBetaLimit=1.52;camera.panningSensibility=75;camera.wheelPrecision=45;camera.attachControl(engine.getRenderingCanvas(),true);
 scene.onBeforeRenderObservable.add(()=>{const t=performance.now()*.00025;sun.direction=new BABYLON.Vector3(-.55,-1,.35+Math.sin(t)*.04)});
}
function focusLevel(level,animate){
 activeLevel=clamp(Number(level)||pageStart,pageStart,pageStart+gateMeshes.length-1);
 const gate=gateMeshes[activeLevel-pageStart];if(!gate||!camera)return;
 // Centre the camera on the asphalt lane, not the roadside gate; this keeps the tractor in-frame on narrow phones.
 const target=gate.group.position.add(new BABYLON.Vector3(-4.8,0,0));
 const tractorZ=gate.group.position.z-4.8,tractorX=roadX(tractorZ);
 const tractorTarget=new BABYLON.Vector3(tractorX,terrainHeight(tractorX,tractorZ)+.27,tractorZ);
 moveTractor(tractorTarget,animate);
 if(animate){
  scene.stopAnimation(camera);
  const startTarget=camera.target.clone(),startPosition=camera.position.clone();
  const delta=target.subtract(startTarget),endPosition=startPosition.add(delta);
  camera.overrideCloneAlphaBetaRadius=true;
  let finishedAnimations=0;
  const finish=()=>{
   finishedAnimations++;
   if(finishedAnimations===2&&camera){camera.setPosition(endPosition);camera.overrideCloneAlphaBetaRadius=null;}
  };
  BABYLON.Animation.CreateAndStartAnimation("road-camera-drive-target",camera,"target",30,42,startTarget,target,BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT,undefined,finish);
  BABYLON.Animation.CreateAndStartAnimation("road-camera-drive-position",camera,"position",30,42,startPosition,endPosition,BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT,undefined,finish);
 }else{
  const offset=camera.position.subtract(camera.target);
  camera.overrideCloneAlphaBetaRadius=null;
  camera.setTarget(target,false,false,true);
  camera.setPosition(target.add(offset));
 }
 gateMeshes.forEach(item=>{item.group.scaling.setAll(item.level===activeLevel?1.12:1);item.sign.material.emissiveColor=item.level===activeLevel?new BABYLON.Color3(.5,.34,.08):new BABYLON.Color3(.08,.08,.08)});
}
function start(canvasId,level){
 const canvas=document.getElementById(canvasId);if(!canvas||!root.BABYLON)return false;
 if(engine){if(scene&&camera)scene.stopAnimation(camera);engine.dispose();engine=null;scene=null;camera=null;gateMeshes=[]}
 try{engine=new BABYLON.Engine(canvas,true,{preserveDrawingBuffer:false,stencil:true,antialias:true,powerPreference:"high-performance"});const mobile=window.matchMedia("(max-width: 700px)").matches;const pixelRatio=Math.max(1,window.devicePixelRatio||1);renderPixelRatio=Math.min(pixelRatio,mobile?1.25:1.5);engine.setHardwareScalingLevel(1/renderPixelRatio);buildWorld(level||1);focusLevel(level||pageStart,false);const renderFrame=()=>{if(scene)scene.render()};engine.runRenderLoop(renderFrame);if(!resizeBound){window.addEventListener("resize",()=>engine&&engine.resize());resizeBound=true}if(!visibilityBound){document.addEventListener("visibilitychange",()=>{if(!engine)return;if(document.hidden)engine.stopRenderLoop();else engine.runRenderLoop(renderFrame)});visibilityBound=true}return true}catch(error){console.error("3D Harvest World failed:",error);return false}
}
function getKopjeScreenBounds(){
 if(!engine||!scene||!camera||!terrainAnchor)return[];
 camera.computeWorldMatrix(true);
 const width=engine.getRenderWidth(),height=engine.getRenderHeight();
 const viewport=camera.viewport.toGlobal(width,height),transform=scene.getTransformMatrix();
 const depthOffsets=[0,4,8,13];
 const xSamples=[-40,-30,-20,-10,0,10,20,30,40];
 return[122,134].map((ridgeStart,ridgeIndex)=>{
  const projected=[];
  let visibleCrestSamples=0,visibleCrestSamplesBelowHeader=0;
  for(const x of xSamples){
   const broadPeak=6.2+1.4*Math.sin(x*.13+ridgeIndex*.8)+.8*Math.cos(x*.27-ridgeIndex);
   const irregularity=.55*Math.sin(x*.31+ridgeIndex*1.7)+.25*Math.cos(x*.18-ridgeIndex);
   for(let section=0;section<depthOffsets.length;section++){
    const z=ridgeStart+depthOffsets[section],ground=terrainHeight(x,z);
    const y=section===0?ground+.15:section===1?ground+broadPeak*.40+irregularity*.20:section===2?ground+broadPeak+irregularity:ground+.7+irregularity*.10;
    projected.push(BABYLON.Vector3.Project(new BABYLON.Vector3(x,y,z),BABYLON.Matrix.Identity(),transform,viewport));
   }
   // Test an exact authored crest vertex against the nearest rendered hit. A
   // projected bounding rectangle alone can count mountains hidden by terrain.
   const crestZ=ridgeStart+8,crestY=terrainHeight(x,crestZ)+broadPeak+irregularity;
   const crestPoint=new BABYLON.Vector3(x,crestY,crestZ);
   const screenPoint=BABYLON.Vector3.Project(crestPoint,BABYLON.Matrix.Identity(),transform,viewport);
   if(screenPoint.x<0||screenPoint.x>width||screenPoint.y<0||screenPoint.y>height||screenPoint.z<0||screenPoint.z>1)continue;
   const pick=scene.pick(screenPoint.x,screenPoint.y);
   const pickedPoint=pick&&pick.pickedPoint;
   const pickedMesh=pick&&pick.pickedMesh;
   const expectedDistance=BABYLON.Vector3.Distance(camera.position,crestPoint);
   const hitDistance=pickedPoint?BABYLON.Vector3.Distance(camera.position,pickedPoint):Infinity;
   const actuallyVisible=!!(pick&&pick.hit&&pickedMesh&&pickedMesh.parent===terrainAnchor&&Math.abs(hitDistance-expectedDistance)<1.5);
   if(actuallyVisible){
    visibleCrestSamples++;
    if(screenPoint.y>=76)visibleCrestSamplesBelowHeader++;
   }
  }
  const left=Math.min(...projected.map(point=>point.x)),right=Math.max(...projected.map(point=>point.x));
  const top=Math.min(...projected.map(point=>point.y)),bottom=Math.max(...projected.map(point=>point.y));
  const depthMin=Math.min(...projected.map(point=>point.z)),depthMax=Math.max(...projected.map(point=>point.z));
  const visibleWidth=Math.max(0,Math.min(right,width)-Math.max(left,0));
  const visibleHeight=Math.max(0,Math.min(bottom,height)-Math.max(top,0));
  const areaRatio=visibleWidth*visibleHeight/(width*height);
  return{ridgeStart,left,top,right,bottom,depthMin,depthMax,areaRatio,visible:visibleCrestSamplesBelowHeader>=3,visibleCrestSamples,visibleCrestSamplesBelowHeader};
 });
}
function getSettlementScreenBounds(){
 if(!engine||!scene||!camera)return[];
 camera.computeWorldMatrix(true);
 const width=engine.getRenderWidth(),height=engine.getRenderHeight();
 const viewport=camera.viewport.toGlobal(width,height),transform=scene.getTransformMatrix();
 return settlementAnchors.map(({meshes},index)=>{
  let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity,depthMin=Infinity,depthMax=-Infinity;
  for(const mesh of meshes){
   mesh.computeWorldMatrix(true);
   const bounds=mesh.getBoundingInfo().boundingBox,min=bounds.minimumWorld,max=bounds.maximumWorld;
   for(let x=0;x<2;x++)for(let y=0;y<2;y++)for(let z=0;z<2;z++){
    const point=new BABYLON.Vector3(x?max.x:min.x,y?max.y:min.y,z?max.z:min.z);
    const projected=BABYLON.Vector3.Project(point,BABYLON.Matrix.Identity(),transform,viewport);
    left=Math.min(left,projected.x);right=Math.max(right,projected.x);
    top=Math.min(top,projected.y);bottom=Math.max(bottom,projected.y);
    depthMin=Math.min(depthMin,projected.z);depthMax=Math.max(depthMax,projected.z);
   }
  }
  const visibleWidth=Math.max(0,Math.min(right,width)-Math.max(left,0));
  const visibleHeight=Math.max(0,Math.min(bottom,height)-Math.max(top,0));
  return{index,left,top,right,bottom,depthMin,depthMax,visible:depthMax>=0&&depthMin<=1&&visibleWidth>=24&&visibleHeight>=24};
 });
}
root.HarvestWorld3D={start,focusLevel,get tractorPosition(){return tractor?tractor.position.asArray():null},get tractorVisible(){return!!tractor&&!tractor.isDisposed()},get ready(){return!!scene},get assetsReady(){return assetsReady},get loadingStatus(){return loadStatus},set onLoadProgress(callback){onLoadProgress=typeof callback==="function"?callback:null;if(onLoadProgress)onLoadProgress(loadStatus)},get activeLevel(){return activeLevel},get cameraPosition(){return camera?camera.position.asArray():null},get cameraTarget(){return camera?camera.target.asArray():null},get gatePositions(){return gateMeshes.map(item=>item.group.position.asArray())},get settlementPositions(){return settlementAnchors.map(item=>item.anchor.position.asArray())},get settlementScreenBounds(){return getSettlementScreenBounds()},get kopjeScreenBounds(){return getKopjeScreenBounds()},get fogDensity(){return scene?scene.fogDensity:0},get farmsteadLoaded(){return farmsteadLoaded},get terrainLoaded(){return terrainLoaded},get settlementLoaded(){return settlementLoaded},get settlementMeshCount(){return settlementMeshCount},get terrainMeshCount(){return terrainMeshCount},get farmsteadMeshCount(){return farmsteadMeshCount},get gateCount(){return gateMeshes.length},get shadowsEnabled(){return!!shadowGenerator&&scene&&scene.shadowsEnabled},get renderPixelRatio(){return renderPixelRatio},dispose(){if(scene&&camera)scene.stopAnimation(camera);if(camera)camera.overrideCloneAlphaBetaRadius=null;if(shadowGenerator){shadowGenerator.dispose();shadowGenerator=null}farmsteadMeshCount=0;terrainMeshCount=0;settlementMeshCount=0;settlementAnchors=[];terrainAnchor=null;tractor=null;tractorWheels=[];camera=null;if(engine){engine.stopRenderLoop();engine.dispose();engine=null;scene=null;gateMeshes=[]}}};
})(window);
