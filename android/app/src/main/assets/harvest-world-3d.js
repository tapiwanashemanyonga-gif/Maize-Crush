(function(root){
"use strict";
const LEVEL_GAP=18;
let engine=null,scene=null,camera=null,gateMeshes=[],activeLevel=1,pageStart=1,resizeBound=false,assetsReady=false,farmsteadLoaded=false,terrainLoaded=false,settlementLoaded=false,farmsteadMeshCount=0,terrainMeshCount=0,settlementMeshCount=0;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function mat(name,color,roughness){
 const m=new BABYLON.StandardMaterial(name,scene);m.diffuseColor=BABYLON.Color3.FromHexString(color);m.specularColor=new BABYLON.Color3(.12,.12,.12);m.roughness=roughness||.9;return m;
}
function box(name,pos,size,material,rotationY,rotationZ){
 const m=BABYLON.MeshBuilder.CreateBox(name,{width:size[0],height:size[1],depth:size[2]},scene);m.position.copyFrom(pos);m.material=material;if(rotationY)m.rotation.y=rotationY;if(rotationZ)m.rotation.z=rotationZ;return m;
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
function buildWorld(startLevel){
 assetsReady=false;farmsteadLoaded=false;terrainLoaded=false;settlementLoaded=false;farmsteadMeshCount=0;terrainMeshCount=0;settlementMeshCount=0;
 pageStart=Math.floor((Math.max(1,Number(startLevel)||1)-1)/4)*4+1;
 scene=new BABYLON.Scene(engine);scene.clearColor=new BABYLON.Color4(.48,.76,.91,1);scene.fogMode=BABYLON.Scene.FOGMODE_EXP2;scene.fogColor=new BABYLON.Color3(.48,.76,.91);scene.fogDensity=.006;
 const hemi=new BABYLON.HemisphericLight("sky-light",new BABYLON.Vector3(0,1,0),scene);hemi.intensity=.82;
 const sun=new BABYLON.DirectionalLight("sunlight",new BABYLON.Vector3(-.55,-1,.35),scene);sun.position=new BABYLON.Vector3(30,55,-20);sun.intensity=1.05;
 // Load the authored Blender landscape and farmstead as local GLB assets.
 // Procedural roadside placeholders are deliberately no longer the primary scenery.
 const loadAuthoredAsset=(filename,anchorName,position,scale)=>{
  return BABYLON.SceneLoader.ImportMeshAsync("","./assets/",filename,scene).then(result=>{
   const anchor=new BABYLON.TransformNode(anchorName,scene);
   anchor.position.copyFrom(position);anchor.scaling.setAll(scale);
   result.meshes.forEach(mesh=>{if(mesh.name!=="__root__")mesh.parent=anchor});
   const geometryCount=result.meshes.filter(mesh=>mesh.name!=="__root__"&&typeof mesh.getTotalVertices==="function"&&mesh.getTotalVertices()>0).length;
   if(anchorName.includes("zimbabwe-terrain"))terrainMeshCount=geometryCount;
   else if(anchorName.includes("zimbabwe-farmstead"))farmsteadMeshCount=geometryCount;
   else if(anchorName.includes("rural-settlement"))settlementMeshCount+=geometryCount;
   return true;
  }).catch(error=>{console.warn("Authored world asset unavailable:",filename,error);return false});
 };
 // Place authored settlement instances on the same sculpted terrain as the road.
 const terrainHeight=(x,z)=>1.1*Math.sin(z*.035+x*.018)+.65*Math.cos(x*.055-z*.021)+.22*Math.sin(x*.19+z*.11)*Math.cos(z*.16)-.5;
 const terrainPromise=loadAuthoredAsset("harvest-world-terrain.glb","blender-authored-zimbabwe-terrain",new BABYLON.Vector3(0,0,0),1).then(ok=>{terrainLoaded=ok;return ok});
 const farmsteadPromise=loadAuthoredAsset("harvest-world-farmstead.glb","blender-authored-zimbabwe-farmstead",new BABYLON.Vector3(-19,.02,18),.82).then(ok=>{farmsteadLoaded=ok;return ok});
 const settlementEast=loadAuthoredAsset("harvest-world-settlement.glb","blender-authored-rural-settlement-east",new BABYLON.Vector3(25,terrainHeight(25,74),74),.82);
 const settlementWest=loadAuthoredAsset("harvest-world-settlement.glb","blender-authored-rural-settlement-west",new BABYLON.Vector3(-31,terrainHeight(-31,92),92),.72);
 const settlementPromise=Promise.all([settlementEast,settlementWest]).then(results=>{settlementLoaded=results.every(Boolean);return settlementLoaded});
 Promise.all([terrainPromise,farmsteadPromise,settlementPromise]).then(()=>{assetsReady=true});
 // Place physical level gates directly beside the winding Blender road.
 const roadX=z=>9.5*Math.sin((z+8)*.043)+2.2*Math.sin(z*.095);
 const gatePoints=[2,36,73,112].map(z=>new BABYLON.Vector3(roadX(z)+4.8,terrainHeight(roadX(z)+4.8,z)+.28,z));
 gatePoints.forEach((p,i)=>createGate(pageStart+i,p));
 scene.onPointerObservable.add(info=>{if(info.type!==BABYLON.PointerEventTypes.POINTERTAP)return;const pick=scene.pick(scene.pointerX,scene.pointerY);if(!pick||!pick.hit||!pick.pickedMesh)return;let node=pick.pickedMesh;while(node&&!node.metadata?.level)node=node.parent;if(node&&node.metadata.level<=activeLevel&&typeof root.HarvestWorld3D.onSelectLevel==="function")root.HarvestWorld3D.onSelectLevel(node.metadata.level)});
 camera=new BABYLON.ArcRotateCamera("harvest-follow-camera",Math.PI*1.5,1.05,39,new BABYLON.Vector3(0,0,16),scene);camera.lowerRadiusLimit=25;camera.upperRadiusLimit=65;camera.lowerBetaLimit=.65;camera.upperBetaLimit=1.28;camera.panningSensibility=75;camera.wheelPrecision=45;camera.attachControl(engine.getRenderingCanvas(),true);
 scene.onBeforeRenderObservable.add(()=>{const t=performance.now()*.00025;sun.direction=new BABYLON.Vector3(-.55,-1,.35+Math.sin(t)*.04)});
}
function focusLevel(level,animate){
 activeLevel=clamp(Number(level)||pageStart,pageStart,pageStart+gateMeshes.length-1);
 const gate=gateMeshes[activeLevel-pageStart];if(!gate||!camera)return;
 const target=gate.group.position.add(new BABYLON.Vector3(0,0,0));
 if(animate){BABYLON.Animation.CreateAndStartAnimation("road-camera-drive",camera,"target",30,42,camera.target.clone(),target, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);}
 else camera.setTarget(target);
 gateMeshes.forEach(item=>{item.group.scaling.setAll(item.level===activeLevel?1.12:1);item.sign.material.emissiveColor=item.level===activeLevel?new BABYLON.Color3(.5,.34,.08):new BABYLON.Color3(.08,.08,.08)});
}
function start(canvasId,level){
 const canvas=document.getElementById(canvasId);if(!canvas||!root.BABYLON)return false;
 if(engine){engine.dispose();engine=null;scene=null;gateMeshes=[]}
 try{engine=new BABYLON.Engine(canvas,true,{preserveDrawingBuffer:false,stencil:true,antialias:true,powerPreference:"high-performance"});buildWorld(level||1);focusLevel(level||pageStart,false);engine.runRenderLoop(()=>{if(scene)scene.render()});if(!resizeBound){window.addEventListener("resize",()=>engine&&engine.resize());resizeBound=true}return true}catch(error){console.error("3D Harvest World failed:",error);return false}
}
root.HarvestWorld3D={start,focusLevel,get ready(){return!!scene},get assetsReady(){return assetsReady},get farmsteadLoaded(){return farmsteadLoaded},get terrainLoaded(){return terrainLoaded},get settlementLoaded(){return settlementLoaded},get settlementMeshCount(){return settlementMeshCount},get terrainMeshCount(){return terrainMeshCount},get farmsteadMeshCount(){return farmsteadMeshCount},get gateCount(){return gateMeshes.length},dispose(){farmsteadMeshCount=0;terrainMeshCount=0;settlementMeshCount=0;if(engine){engine.stopRenderLoop();engine.dispose();engine=null;scene=null;gateMeshes=[]}}};
})(window);
