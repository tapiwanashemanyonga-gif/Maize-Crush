# Maize Crush — 3D Harvest World Architecture

## Decision

Replace the current SVG/CSS Harvest Trail map with a real-time 3D world rendered by **Babylon.js**. Create and maintain custom environment assets in **Blender**, exporting optimized binary glTF (.glb) files. The same locally packaged scene and runtime must serve the GitHub Pages game and the Android WebView build.

This replaces the map presentation layer, not the puzzle engine, progression save data, or level rules.

## Visual target

A premium, readable, colourful 3D Zimbabwean countryside viewed from a cinematic elevated follow camera:

- A continuous, visibly modelled road with asphalt, shoulders, road markings, curves, elevation changes, bridges and junctions.
- Recognisable 3D buildings: carefully designed farmhouses and rural homes, farm sheds, grain silos, market buildings and roadside structures. Avoid generic flat village icons or hut-like placeholders.
- Terrain with real depth: rolling hills, granite kopjes, fields, river valleys, trees, crops and distant mountain silhouettes.
- Real 3D lighting, material response, contact shading, shadows and atmospheric depth, tuned for mobile hardware.
- Level numbers mounted on physical roadside gates, signposts or milestone structures. No oversized floating yellow level cards.
- Completed, current and locked states communicated through the world itself: completed gates have harvest decorations, the current gate is highlighted, locked gates are visible farther along the road.
- A restrained HUD overlay for region name, current level, stars, close/back and play action. The world remains the main visual.

## Progression and camera behaviour

- The road is one continuous world route, not four-stop pages.
- The current unlocked level is the camera focus when the map opens.
- Completing a level unlocks the next gate and triggers a smooth camera drive/pan along the road to that next gate.
- Reopening the map restores the camera to the current unlocked level.
- Users can drag/swipe to look along the route and tap an unlocked gate to play it.
- Locked gates remain visible but cannot start a level.
- Camera travel must never auto-complete or auto-start a level. It only reveals the next destination.
- Progress continues to use the existing local save data and level IDs.

## Technical implementation

### Runtime
- Babylon.js scene and camera, with WebGL2 as the dependable baseline for Android WebView. WebGPU may be an optional enhancement only after capability checks; it must not be required.
- Bundle the engine locally with the game. Do not rely on a live CDN for core rendering, models, textures or gameplay.
- Use asset loading, mesh instancing, frustum culling, level-of-detail and hardware scaling to protect frame rate and memory on low-cost phones/tablets.
- Provide a graceful 2D fallback only if WebGL cannot be initialized; never silently show the old card map as the normal experience.

### Asset pipeline
- Blender source files retained alongside exported .glb assets.
- Use optimized materials, shared meshes, texture atlases where useful, compressed textures/geometry where the target runtime supports them.
- Keep an asset register with source, license, author and modification notes. Prefer original models and assets with clear reuse rights.
- Start with one high-quality region kit: road segment, road gate, farmhouse, shed, trees, rocks, crop fields, fence, bridge and river.

### Shared web and Android runtime
- Keep the web game and android/app/src/main/assets runtime/assets in sync through a reproducible build/copy step.
- Package all essential 3D runtime and first-region assets locally so the map works offline after installation and first launch.
- Keep the existing puzzle board and game mechanics unchanged during the first 3D-map milestone.

## Delivery phases

1. **Engine proof** — Babylon.js canvas opens in the existing map flow, renders a real 3D road, terrain, camera and one 3D level gate on phone/tablet dimensions.
2. **First region art pass** — add farmhouse/buildings, fields, trees, kopje, river and road furniture as actual 3D models/materials; create Blender source and GLB exports.
3. **Progression integration** — place real level gates along the road; wire completed/current/locked state to existing progression; camera automatically travels to the next unlocked gate after a win.
4. **Responsive and performance pass** — full-screen world without page/dialog scrolling; camera framing adapts to phone portrait, tablet portrait and landscape; tune quality dynamically for low-end Android.
5. **Release verification** — gameplay regression tests, 3D scene load tests, local/offline asset checks, Android build and browser screenshot QA. No merge until checks pass and screenshots show the actual 3D world.

## Acceptance criteria

- The normal roadmap is a genuine 3D rendered scene, not CSS transforms, SVG roads, emoji or illustrated cards.
- A road is continuously visible and physically connects the level gates.
- Buildings, terrain, trees, fields and road structures have 3D geometry and lighting.
- Level numbers are part of roadside world objects, not large UI cards.
- On level completion, the camera smoothly reveals the next unlocked gate without automatically starting it.
- Map fits the viewport without vertical scrolling on phones and tablets.
- Same visual scene runs in browser and Android WebView, with essential assets available offline.
- Puzzle gameplay and saved progress remain compatible.
