import React, { useEffect, useImperativeHandle, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import {
  STATUS_HEX,
  createBoothGroup,
  createContactShadowTexture,
  createExpoTrussAndCrowd,
  createHallFloorTexture,
  createKeynoteStageGroup,
  createSphereDomeGroup,
  createZoneSectionsGroup,
  getBoothWorldPosition,
  updateBoothGroupAppearance,
} from './expoModels';
import { createExpoCampusScenery } from './expoScenery';

function detectSoftwareGl(gl) {
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  const raw = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '') : '';
  return /swiftshader|llvmpipe|software/i.test(raw);
}

export const ExpoHallCanvas = React.forwardRef(
  (
    {
      booths,
      selectedBoothId,
      cameraMode,
      scrollProgress,
      nightMode,
      showFloorGrid,
      showTrussAndVisitors,
      statusFilter,
      onSelectBooth,
      onZoomChange,
    },
    ref,
  ) => {
    const containerRef = useRef(null);
    const canvasRef = useRef(null);
    const [contextLost, setContextLost] = useState(false);
    const [hoveredTooltip, setHoveredTooltip] = useState(null);

    // Live mutable refs for the RAF loop without re-initializing WebGL
    const stateRef = useRef({
      booths,
      selectedBoothId,
      cameraMode,
      scrollProgress,
      nightMode,
      showFloorGrid,
      showTrussAndVisitors,
      statusFilter,
    });
    stateRef.current = {
      booths,
      selectedBoothId,
      cameraMode,
      scrollProgress,
      nightMode,
      showFloorGrid,
      showTrussAndVisitors,
      statusFilter,
    };

    const onSelectBoothRef = useRef(onSelectBooth);
    onSelectBoothRef.current = onSelectBooth;
    const onZoomChangeRef = useRef(onZoomChange);
    onZoomChangeRef.current = onZoomChange;

    const cameraRef = useRef(null);
    const controlsRef = useRef(null);
    const rendererRef = useRef(null);
    const composerRef = useRef(null);
    const focusTargetRef = useRef({
      active: false,
      pos: new THREE.Vector3(0, 21.5, 32),
      lookAt: new THREE.Vector3(0, 1.8, 1.5),
    });

    const sceneCaptureRef = useRef({
      scene: null,
      camera: null,
    });

    useImperativeHandle(ref, () => ({
      zoomIn: () => {
        const cam = cameraRef.current;
        const ctrl = controlsRef.current;
        if (!cam || !ctrl) return;
        const activeTarget = focusTargetRef.current.active ? focusTargetRef.current.lookAt : ctrl.target;
        const activePos = focusTargetRef.current.active ? focusTargetRef.current.pos : cam.position;
        const dir = new THREE.Vector3().subVectors(activePos, activeTarget);
        const nextLen = Math.max(2.6, dir.length() * 0.72);
        dir.setLength(nextLen);
        focusTargetRef.current = {
          active: true,
          pos: activeTarget.clone().add(dir),
          lookAt: activeTarget.clone(),
        };
      },
      zoomOut: () => {
        const cam = cameraRef.current;
        const ctrl = controlsRef.current;
        if (!cam || !ctrl) return;
        const activeTarget = focusTargetRef.current.active ? focusTargetRef.current.lookAt : ctrl.target;
        const activePos = focusTargetRef.current.active ? focusTargetRef.current.pos : cam.position;
        const dir = new THREE.Vector3().subVectors(activePos, activeTarget);
        const nextLen = Math.min(96, dir.length() * 1.38);
        dir.setLength(nextLen);
        focusTargetRef.current = {
          active: true,
          pos: activeTarget.clone().add(dir),
          lookAt: activeTarget.clone(),
        };
      },
      resetView: () => {
        focusTargetRef.current = {
          active: true,
          pos: new THREE.Vector3(0, 21.5, 32),
          lookAt: new THREE.Vector3(0, 1.8, 1.5),
        };
      },
      focusBooth: (boothId) => {
        const booth = stateRef.current.booths.find((b) => b.id === boothId);
        if (!booth) return;
        const target = getBoothWorldPosition(booth);
        focusTargetRef.current = {
          active: true,
          pos: new THREE.Vector3(target.x + 3.8, 4.4, target.z + 5.4),
          lookAt: new THREE.Vector3(target.x, 1.1, target.z),
        };
      },
      focusStage: () => {
        focusTargetRef.current = {
          active: true,
          pos: new THREE.Vector3(0, 6.0, -3.2),
          lookAt: new THREE.Vector3(0, 2.4, -14.5),
        };
      },
      focusPlaza: () => {
        focusTargetRef.current = {
          active: true,
          pos: new THREE.Vector3(-11.5, 10.2, 35.5),
          lookAt: new THREE.Vector3(0, 1.6, 20),
        };
      },
      captureSnapshot: () => {
        const renderer = rendererRef.current;
        if (!renderer) return null;
        try {
          if (composerRef.current) {
            composerRef.current.render();
          } else if (sceneCaptureRef.current.scene && sceneCaptureRef.current.camera) {
            renderer.render(sceneCaptureRef.current.scene, sceneCaptureRef.current.camera);
          }
          return renderer.domElement.toDataURL('image/png');
        } catch {
          return null;
        }
      },
    }));

    useEffect(() => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      let renderer;
      try {
        renderer = new THREE.WebGLRenderer({
          canvas,
          antialias: true,
          powerPreference: 'high-performance',
          preserveDrawingBuffer: true,
        });
      } catch {
        setContextLost(true);
        return;
      }

      const gl = renderer.getContext();
      const isSoftGl = detectSoftwareGl(gl);
      const maxAniso = renderer.capabilities.getMaxAnisotropy();

      renderer.setPixelRatio(isSoftGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.shadowMap.enabled = !isSoftGl;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      rendererRef.current = renderer;

      const scene = new THREE.Scene();
      const nightBg = new THREE.Color(0x0b0b0e);
      const dayBg = new THREE.Color(0xe4e6ee);
      scene.background = stateRef.current.nightMode ? nightBg.clone() : dayBg.clone();
      const fog = new THREE.FogExp2(stateRef.current.nightMode ? 0x0b0b0e : 0xe4e6ee, 0.0085);
      scene.fog = fog;

      // Environment reflections
      const pmrem = new THREE.PMREMGenerator(renderer);
      const envScene = new RoomEnvironment();
      const envRT = pmrem.fromScene(envScene, 0.04);
      scene.environment = envRT.texture;
      scene.environmentIntensity = 0.62;
      envScene.dispose();

      const camera = new THREE.PerspectiveCamera(50, 1, 0.2, 260);
      camera.position.set(0, 21.5, 32);
      cameraRef.current = camera;
      sceneCaptureRef.current = { scene, camera };

      // Subtle luxury bloom pipeline (skipped on software WebGL for responsive frame pacing)
      let composer = null;
      let bloomPass = null;
      let outputPass = null;
      let composerRT = null;
      if (!isSoftGl) {
        const initW = Math.max(1, container.clientWidth || window.innerWidth);
        const initH = Math.max(1, container.clientHeight || window.innerHeight);
        const pr = renderer.getPixelRatio();
        composerRT = new THREE.WebGLRenderTarget(
          Math.max(1, Math.floor(initW * pr)),
          Math.max(1, Math.floor(initH * pr)),
          {
            type: THREE.HalfFloatType,
            samples: renderer.capabilities.isWebGL2 ? 4 : 0,
          },
        );
        composer = new EffectComposer(renderer, composerRT);
        composer.setPixelRatio(pr);
        composer.setSize(initW, initH);
        composer.addPass(new RenderPass(scene, camera));

        const initialNight = stateRef.current.nightMode;
        bloomPass = new UnrealBloomPass(
          new THREE.Vector2(initW, initH),
          initialNight ? 0.28 : 0.14,
          initialNight ? 0.45 : 0.3,
          initialNight ? 0.72 : 0.96,
        );
        composer.addPass(bloomPass);

        outputPass = new OutputPass();
        composer.addPass(outputPass);
        composerRef.current = composer;
      }

      const controls = new OrbitControls(camera, canvas);
      controls.enableDamping = !isSoftGl;
      controls.dampingFactor = 0.08;
      controls.enableZoom = true;
      controls.zoomToCursor = true;
      controls.zoomSpeed = 1.25;
      controls.panSpeed = 0.92;
      controls.rotateSpeed = 0.85;
      controls.screenSpacePanning = false;
      controls.maxPolarAngle = Math.PI * 0.478;
      controls.minPolarAngle = 0.14;
      controls.minDistance = 2.6;
      controls.maxDistance = 96;
      controls.target.set(0, 1.8, 1.5);
      controls.enabled = stateRef.current.cameraMode === 'explore';
      const handleControlStart = () => {
        focusTargetRef.current.active = false;
      };
      controls.addEventListener('start', handleControlStart);
      controlsRef.current = controls;

      // Lighting: warm champagne-gold studio key + obsidian ambient fill
      const hemi = new THREE.HemisphereLight(0xf6ead4, 0x0b0b0e, stateRef.current.nightMode ? 0.92 : 1.24);
      scene.add(hemi);

      const dirKey = new THREE.DirectionalLight(0xfff5e4, 1.55);
      dirKey.position.set(22, 34, 26);
      if (!isSoftGl) {
        dirKey.castShadow = true;
        dirKey.shadow.mapSize.set(2048, 2048);
        dirKey.shadow.bias = -0.0004;
        dirKey.shadow.normalBias = 0.02;
        dirKey.shadow.camera.near = 2;
        dirKey.shadow.camera.far = 110;
        dirKey.shadow.camera.left = -42;
        dirKey.shadow.camera.right = 42;
        dirKey.shadow.camera.top = 42;
        dirKey.shadow.camera.bottom = -42;
      }
      scene.add(dirKey);

      if (!isSoftGl) {
        RectAreaLightUniformsLib.init();
        const rectKeynote = new THREE.RectAreaLight(0xe8c987, 3.4, 12, 3.5);
        rectKeynote.position.set(0, 6.2, -11);
        rectKeynote.lookAt(0, 0.5, -14.5);
        scene.add(rectKeynote);
      }

      const pGoldWest = new THREE.PointLight(0xe8c987, 34, 62, 1.45);
      pGoldWest.position.set(-12, 9, 4);
      scene.add(pGoldWest);

      const pCoral = new THREE.PointLight(0xf97362, 16, 46, 1.5);
      pCoral.position.set(13, 8, -8);
      scene.add(pCoral);

      const pGoldEast = new THREE.PointLight(0xf3dcaa, 32, 62, 1.45);
      pGoldEast.position.set(14, 12, 16);
      scene.add(pGoldEast);

      const pAmberFront = new THREE.PointLight(0xd4af63, 28, 56, 1.45);
      pAmberFront.position.set(0, 8, 19);
      scene.add(pAmberFront);

      // Shared contact shadow texture
      const shadowTex = createContactShadowTexture();

      // Outdoor Campus Scenery, Roads, Cars, Trees, Reflecting Pools & Entrance Canopy
      const sceneryBundle = createExpoCampusScenery(stateRef.current.nightMode, shadowTex, maxAniso);
      scene.add(sceneryBundle.sceneryGroup);

      // Indoor Hall Slab Floor + Grid
      const floorGeo = new THREE.PlaneGeometry(35, 35.5);
      const floorTexNight = createHallFloorTexture(true, maxAniso);
      const floorTexDay = createHallFloorTexture(false, maxAniso);
      const floorMat = new THREE.MeshStandardMaterial({
        map: stateRef.current.nightMode ? floorTexNight : floorTexDay,
        roughness: 0.42,
        metalness: 0.22,
      });
      const floorMesh = new THREE.Mesh(floorGeo, floorMat);
      floorMesh.rotation.x = -Math.PI / 2;
      floorMesh.position.set(0, 0.02, -0.75);
      floorMesh.receiveShadow = true;
      scene.add(floorMesh);

      const gridHelper = new THREE.GridHelper(34, 17, 0xe8c987, 0x1d1d27);
      gridHelper.position.set(0, 0.028, -0.75);
      const gridMats = Array.isArray(gridHelper.material) ? gridHelper.material : [gridHelper.material];
      gridMats.forEach((m) => {
        m.transparent = true;
        m.opacity = 0.14;
      });
      scene.add(gridHelper);

      // Center aisle runner carpet (obsidian carbon with subtle perimeter)
      const runnerGeo = new THREE.PlaneGeometry(2.8, 35.2);
      const runnerMat = new THREE.MeshStandardMaterial({
        color: 0x101016,
        roughness: 0.85,
      });
      const runner = new THREE.Mesh(runnerGeo, runnerMat);
      runner.rotation.x = -Math.PI / 2;
      runner.position.set(0, 0.032, -0.8);
      runner.receiveShadow = true;
      scene.add(runner);

      // Keynote Stage + VIP Auditorium Seating
      const stageGroup = createKeynoteStageGroup(maxAniso);
      scene.add(stageGroup);

      // Subtle Geodesic EventSphere Dome & Zoom-Responsive Floor Zone Sections
      const domeBundle = createSphereDomeGroup();
      const { domeGroup, meridianRingA, meridianRingB } = domeBundle;
      scene.add(domeGroup);

      const zoneBundle = createZoneSectionsGroup();
      scene.add(zoneBundle.zoneGroup);

      // Truss & Instanced Crowd
      const { trussGroup, visitorMesh, visitorHeadMesh, visitorSeeds } = createExpoTrussAndCrowd();
      scene.add(trussGroup);

      // Booth groups
      const boothGroupMap = new Map();
      const raycastTargets = [];

      for (const b of stateRef.current.booths) {
        const g = createBoothGroup(b, shadowTex, maxAniso);
        boothGroupMap.set(b.id, g);
        scene.add(g);
        const refs = g.userData.refs;
        if (refs?.hitMeshes) {
          raycastTargets.push(...refs.hitMeshes);
        }
      }

      // Ambient floating champagne stardust particles (expo energy field)
      const ptCount = 320;
      const ptPositions = new Float32Array(ptCount * 3);
      for (let i = 0; i < ptCount; i++) {
        ptPositions[i * 3] = (Math.random() - 0.5) * 52;
        ptPositions[i * 3 + 1] = 1.2 + Math.random() * 16;
        ptPositions[i * 3 + 2] = (Math.random() - 0.5) * 44;
      }
      const ptGeo = new THREE.BufferGeometry();
      ptGeo.setAttribute('position', new THREE.BufferAttribute(ptPositions, 3));
      const ptMat = new THREE.PointsMaterial({
        size: 0.15,
        color: 0xf3dcaa,
        transparent: true,
        opacity: 0.62,
      });
      const points = new THREE.Points(ptGeo, ptMat);
      scene.add(points);

      // Campus Perimeter Vehicle Cruise Loop
      const vehicleLoopCurve = new THREE.CatmullRomCurve3(
        [
          new THREE.Vector3(-25, 0.03, 24.4),
          new THREE.Vector3(0, 0.03, 24.4),
          new THREE.Vector3(25, 0.03, 24.4),
          new THREE.Vector3(28.5, 0.03, 20),
          new THREE.Vector3(28.5, 0.03, -20),
          new THREE.Vector3(25, 0.03, -24.5),
          new THREE.Vector3(-25, 0.03, -24.5),
          new THREE.Vector3(-28.5, 0.03, -20),
          new THREE.Vector3(-28.5, 0.03, 20),
        ],
        true,
        'catmullrom',
        0.2,
      );

      // Scroll Voyage Catmull-Rom Camera Path (u=0 frames arrival boulevard + cars + trees + dome)
      const posCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-12.5, 19.5, 34),
        new THREE.Vector3(-13, 10.5, 22),
        new THREE.Vector3(-1.4, 3.8, 12),
        new THREE.Vector3(1.4, 3.2, -2.5),
        new THREE.Vector3(15, 8.2, -4),
        new THREE.Vector3(0, 18.5, 18),
      ]);
      const lookCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-4.2, 1.2, 4),
        new THREE.Vector3(-2.5, 1.2, 5),
        new THREE.Vector3(0, 1.8, -11),
        new THREE.Vector3(0, 2.2, -14.5),
        new THREE.Vector3(1, 1.2, 2),
        new THREE.Vector3(0, 1.2, 2),
      ]);

      // Pre-allocated math scratch (zero GC per frame)
      const scratchPos = new THREE.Vector3();
      const scratchLook = new THREE.Vector3();
      const scratchCarPos = new THREE.Vector3();
      const scratchCarTan = new THREE.Vector3();
      const scratchDummy = new THREE.Object3D();
      const raycaster = new THREE.Raycaster();
      const pointerNdc = new THREE.Vector2();

      let pointerX = 0;
      let pointerY = 0;
      let smoothPointerX = 0;
      let smoothPointerY = 0;
      let smoothScroll = stateRef.current.scrollProgress;
      let hoveredBoothId = null;
      let lastRayTime = 0;
      let pointerDownAt = { x: 0, y: 0 };

      const handleResize = () => {
        if (!container) return;
        const w = Math.max(1, container.clientWidth || window.innerWidth);
        const h = Math.max(1, container.clientHeight || window.innerHeight);
        renderer.setSize(w, h, false);
        if (composer) {
          composer.setSize(w, h);
        }
        camera.aspect = w / h;
        camera.fov = camera.aspect < 1 ? 64 : 50;
        camera.updateProjectionMatrix();
      };
      handleResize();
      const ro = new ResizeObserver(handleResize);
      ro.observe(container);

      const handlePointerMove = (e) => {
        const rect = canvas.getBoundingClientRect();
        const nx = (e.clientX - rect.left) / rect.width;
        const ny = (e.clientY - rect.top) / rect.height;
        pointerX = nx - 0.5;
        pointerY = ny - 0.5;

        const now = performance.now();
        if (now - lastRayTime < 45) return;
        lastRayTime = now;

        pointerNdc.set(nx * 2 - 1, -(ny * 2 - 1));
        raycaster.setFromCamera(pointerNdc, camera);
        const hits = raycaster.intersectObjects(raycastTargets, false);
        const hitBoothId = hits[0]?.object?.userData?.boothId;
        hoveredBoothId = hitBoothId || null;
        canvas.style.cursor = hoveredBoothId ? 'pointer' : stateRef.current.cameraMode === 'explore' ? 'grab' : '';

        if (hoveredBoothId) {
          const booth = stateRef.current.booths.find((b) => b.id === hoveredBoothId);
          if (booth) {
            setHoveredTooltip({ x: e.clientX, y: e.clientY, booth });
            return;
          }
        }
        setHoveredTooltip(null);
      };

      const handlePointerDown = (e) => {
        pointerDownAt = { x: e.clientX, y: e.clientY };
        // Cancel focus flight if user grabs orbit controls
        if (stateRef.current.cameraMode === 'explore') {
          focusTargetRef.current.active = false;
        }
      };

      const handlePointerUp = (e) => {
        const dist = Math.hypot(e.clientX - pointerDownAt.x, e.clientY - pointerDownAt.y);
        if (dist > 6) return;
        const rect = canvas.getBoundingClientRect();
        const nx = (e.clientX - rect.left) / rect.width;
        const ny = (e.clientY - rect.top) / rect.height;
        pointerNdc.set(nx * 2 - 1, -(ny * 2 - 1));
        raycaster.setFromCamera(pointerNdc, camera);
        const hits = raycaster.intersectObjects(raycastTargets, false);
        const hitBoothId = hits[0]?.object?.userData?.boothId;
        if (hitBoothId) {
          onSelectBoothRef.current(hitBoothId);
        }
      };

      const handlePointerLeave = () => {
        hoveredBoothId = null;
        setHoveredTooltip(null);
      };

      canvas.addEventListener('pointermove', handlePointerMove);
      canvas.addEventListener('pointerdown', handlePointerDown);
      canvas.addEventListener('pointerup', handlePointerUp);
      canvas.addEventListener('pointerleave', handlePointerLeave);

      const handleContextLost = (ev) => {
        ev.preventDefault();
        setContextLost(true);
      };
      const handleContextRestored = () => {
        setContextLost(false);
      };
      canvas.addEventListener('webglcontextlost', handleContextLost);
      canvas.addEventListener('webglcontextrestored', handleContextRestored);

      if (!isSoftGl) {
        renderer.compile(scene, camera);
      }

      let rafId = 0;
      let timerId = 0;
      let disposed = false;
      let prevTime = performance.now();
      let prevNight = stateRef.current.nightMode;
      let prevCameraMode = stateRef.current.cameraMode;
      let lastReportedZoom = -1;

      const afterDraw = (cb) => {
        const ctx = renderer.getContext();
        if (typeof ctx.fenceSync !== 'function') {
          timerId = window.setTimeout(cb, 80);
          return;
        }
        const sync = ctx.fenceSync(ctx.SYNC_GPU_COMMANDS_COMPLETE, 0);
        ctx.flush();
        const poll = () => {
          if (disposed) {
            if (sync) ctx.deleteSync(sync);
            return;
          }
          const status = sync ? ctx.getSyncParameter(sync, ctx.SYNC_STATUS) : ctx.SIGNALED;
          if (status === ctx.UNSIGNALED) {
            timerId = window.setTimeout(poll, 6);
          } else {
            if (sync) ctx.deleteSync(sync);
            timerId = window.setTimeout(cb, 80);
          }
        };
        timerId = window.setTimeout(poll, 6);
      };

      const animate = (now) => {
        if (disposed) return;
        const dt = Math.min(0.05, (now - prevTime) * 0.001);
        prevTime = now;
        const t = now * 0.001;

        const cur = stateRef.current;

        // Smooth handoff when entering Explore mode from Scroll Voyage
        if (cur.cameraMode !== prevCameraMode) {
          prevCameraMode = cur.cameraMode;
          if (cur.cameraMode === 'explore' && !focusTargetRef.current.active && !cur.selectedBoothId) {
            focusTargetRef.current = {
              active: true,
              pos: new THREE.Vector3(0, 21.5, 32),
              lookAt: new THREE.Vector3(0, 1.8, 1.5),
            };
          }
        }

        // Theme switch (Night vs Daylight)
        if (cur.nightMode !== prevNight) {
          prevNight = cur.nightMode;
          scene.background = cur.nightMode ? nightBg : dayBg;
          fog.color.copy(cur.nightMode ? nightBg : dayBg);
          floorMat.map = cur.nightMode ? floorTexNight : floorTexDay;
          floorMat.needsUpdate = true;
          sceneryBundle.terrainMat.map = cur.nightMode
            ? sceneryBundle.terrainTexNight
            : sceneryBundle.terrainTexDay;
          sceneryBundle.terrainMat.needsUpdate = true;
          sceneryBundle.plazaMat.map = cur.nightMode
            ? sceneryBundle.plazaTexNight
            : sceneryBundle.plazaTexDay;
          sceneryBundle.plazaMat.needsUpdate = true;
          ptMat.color.setHex(cur.nightMode ? 0xf3dcaa : 0x8a621c);
          ptMat.opacity = cur.nightMode ? 0.62 : 0.36;
          hemi.intensity = cur.nightMode ? 0.92 : 1.24;
          if (bloomPass) {
            bloomPass.strength = cur.nightMode ? 0.28 : 0.14;
            bloomPass.radius = cur.nightMode ? 0.45 : 0.3;
            bloomPass.threshold = cur.nightMode ? 0.72 : 0.96;
          }
        }

        gridHelper.visible = cur.showFloorGrid;
        trussGroup.visible = cur.showTrussAndVisitors;
        domeGroup.visible = cur.nightMode || cur.showFloorGrid;
        meridianRingA.rotation.z = 0.18 + t * 0.045;
        meridianRingB.rotation.z = -0.22 - t * 0.035;

        // Rotate showcase EV turntables + animate cruising boulevard fleet + drone patrols
        for (let c = 0; c < sceneryBundle.turntableCars.length; c++) {
          sceneryBundle.turntableCars[c].rotation.y = t * 0.34 + c * 1.2;
        }
        for (const mv of sceneryBundle.movingVehicles) {
          const u = (mv.offset + t * mv.speed) % 1;
          vehicleLoopCurve.getPointAt(u, scratchCarPos);
          vehicleLoopCurve.getTangentAt(u, scratchCarTan);
          mv.group.position.copy(scratchCarPos);
          mv.group.rotation.y = Math.atan2(scratchCarTan.x, scratchCarTan.z);
          for (const w of mv.wheels) {
            w.rotation.x += dt * 7.5;
          }
        }
        for (const dr of sceneryBundle.drones) {
          const ang = t * dr.speed + dr.phase;
          dr.group.position.set(
            dr.centerX + Math.cos(ang) * dr.radiusX,
            dr.baseY + Math.sin(t * 2.1 + dr.phase) * 0.28,
            dr.centerZ + Math.sin(ang) * dr.radiusZ,
          );
          dr.group.rotation.y = -ang;
          for (const rot of dr.rotors) {
            rot.rotation.y += dt * 26;
          }
        }

        // Animate booth entrances, beacons, display sculptures, and live status sync
        for (let i = 0; i < cur.booths.length; i++) {
          const b = cur.booths[i];
          const grp = boothGroupMap.get(b.id);
          if (!grp) continue;

          const dimmed = cur.statusFilter !== 'all' && b.status !== cur.statusFilter;
          const isSelected = cur.selectedBoothId === b.id || hoveredBoothId === b.id;
          updateBoothGroupAppearance(grp, b, dimmed, isSelected, maxAniso, t, i * 0.85);

          const targetScaleY = isSelected ? 1.08 : 1.0;
          grp.scale.y = THREE.MathUtils.damp(grp.scale.y, targetScaleY, 7, dt);

          const refs = grp.userData.refs;
          if (refs?.beaconMesh) {
            refs.beaconMesh.rotation.y = t * 1.4 + i * 0.4;
            refs.beaconMesh.position.y =
              (b.size === '6x6m Island' ? 2.35 : b.size === '6x3m Corner' ? 2.05 : 1.75) +
              0.65 +
              Math.sin(t * 2.2 + i) * 0.08;
          }
          if (refs?.displayArt) {
            refs.displayArt.rotation.y = t * 0.9 + i * 0.5;
            refs.displayArt.rotation.x = Math.sin(t * 0.7 + i) * 0.18;
          }
        }

        // Animate instanced visitors (body + head) when visible
        if (cur.showTrussAndVisitors) {
          for (let i = 0; i < visitorSeeds.length; i++) {
            const s = visitorSeeds[i];
            const vx = s.baseX + Math.sin(t * s.speed + s.phase) * s.radius;
            const vz = s.baseZ + Math.cos(t * s.speed * 0.8 + s.phase) * s.radius;
            scratchDummy.position.set(vx, 0.42, vz);
            scratchDummy.updateMatrix();
            visitorMesh.setMatrixAt(i, scratchDummy.matrix);

            scratchDummy.position.set(vx, 0.92, vz);
            scratchDummy.updateMatrix();
            visitorHeadMesh.setMatrixAt(i, scratchDummy.matrix);
          }
          visitorMesh.instanceMatrix.needsUpdate = true;
          visitorHeadMesh.instanceMatrix.needsUpdate = true;
        }

        // Camera control
        if (cur.cameraMode === 'voyage') {
          controls.enabled = false;
          smoothScroll = THREE.MathUtils.damp(smoothScroll, cur.scrollProgress, 6, dt);
          smoothPointerX = THREE.MathUtils.damp(smoothPointerX, pointerX, 5, dt);
          smoothPointerY = THREE.MathUtils.damp(smoothPointerY, pointerY, 5, dt);

          const u = THREE.MathUtils.clamp(smoothScroll, 0, 1);
          posCurve.getPointAt(u, scratchPos);
          lookCurve.getPointAt(u, scratchLook);

          camera.position.set(
            scratchPos.x + smoothPointerX * 2.4,
            scratchPos.y - smoothPointerY * 1.3,
            scratchPos.z,
          );
          camera.lookAt(scratchLook);
        } else {
          controls.enabled = true;
          if (focusTargetRef.current.active) {
            const alpha = 1 - Math.exp(-6.5 * dt);
            camera.position.lerp(focusTargetRef.current.pos, alpha);
            controls.target.lerp(focusTargetRef.current.lookAt, alpha);
            if (
              camera.position.distanceTo(focusTargetRef.current.pos) < 0.06 &&
              controls.target.distanceTo(focusTargetRef.current.lookAt) < 0.06
            ) {
              focusTargetRef.current.active = false;
            }
          }
          controls.update();
          controls.target.y = Math.max(0.4, Math.min(10, controls.target.y));
          camera.position.y = Math.max(1.1, camera.position.y);
        }

        // Zoom-responsive 3D borders & floor section criteria:
        // Adapt grid, zone outlines, and dome wireframe smoothly to camera distance
        const refTarget = cur.cameraMode === 'explore' ? controls.target : scratchLook;
        const camDist = camera.position.distanceTo(refTarget);
        const zoomRatio = THREE.MathUtils.clamp((camDist - 2.6) / 93.4, 0, 1); // 0 = zoomed in close, 1 = far aerial
        const zoomPercent = THREE.MathUtils.clamp(Math.round((26.5 / Math.max(2.6, camDist)) * 100), 25, 350);

        // Close-up: fine grid stays crisp, dome wireframe & wide zone outlines recede so they don't obstruct booths.
        // Overview (~73%): champagne-gold geodesic dome & meridian arcs frame the glass hall clearly.
        const gridOpacity = cur.showFloorGrid
          ? THREE.MathUtils.lerp(0.22, 0.05, THREE.MathUtils.smoothstep(zoomRatio, 0.35, 0.95))
          : 0;
        gridMats.forEach((m) => {
          m.opacity = gridOpacity;
        });

        const dayScale = cur.nightMode ? 1.0 : 0.72;
        zoneBundle.zoneGroup.visible = cur.showFloorGrid || zoomRatio > 0.12;
        zoneBundle.zoneBorderMat.opacity =
          THREE.MathUtils.lerp(0.1, 0.3, THREE.MathUtils.smoothstep(zoomRatio, 0.08, 0.5)) * dayScale;
        zoneBundle.hallBorderMat.opacity =
          THREE.MathUtils.lerp(0.14, 0.36, THREE.MathUtils.smoothstep(zoomRatio, 0.05, 0.45)) * dayScale;

        const domeVisibilityFactor = THREE.MathUtils.smoothstep(zoomRatio, 0.1, 0.34);
        domeBundle.wireMat.opacity = 0.38 * domeVisibilityFactor * dayScale;
        domeBundle.arcMatA.opacity = 0.52 * domeVisibilityFactor * dayScale;
        domeBundle.arcMatB.opacity = 0.38 * domeVisibilityFactor * dayScale;
        domeBundle.floorRingMat.opacity = THREE.MathUtils.lerp(0.1, 0.32, zoomRatio) * dayScale;
        domeBundle.laneMatA.opacity = THREE.MathUtils.lerp(0.28, 0.52, zoomRatio) * dayScale;
        domeBundle.laneMatB.opacity = THREE.MathUtils.lerp(0.25, 0.48, zoomRatio) * dayScale;

        if (onZoomChangeRef.current && Math.abs(zoomPercent - lastReportedZoom) >= 1) {
          lastReportedZoom = zoomPercent;
          onZoomChangeRef.current({ distance: camDist, zoomPercent, zoomRatio });
        }

        if (composer) {
          composer.render(dt);
        } else {
          renderer.render(scene, camera);
        }

        if (isSoftGl) {
          afterDraw(() => {
            rafId = requestAnimationFrame(animate);
          });
        } else {
          rafId = requestAnimationFrame(animate);
        }
      };

      rafId = requestAnimationFrame(animate);

      return () => {
        disposed = true;
        cancelAnimationFrame(rafId);
        window.clearTimeout(timerId);
        ro.disconnect();
        controls.removeEventListener('start', handleControlStart);
        canvas.removeEventListener('pointermove', handlePointerMove);
        canvas.removeEventListener('pointerdown', handlePointerDown);
        canvas.removeEventListener('pointerup', handlePointerUp);
        canvas.removeEventListener('pointerleave', handlePointerLeave);
        canvas.removeEventListener('webglcontextlost', handleContextLost);
        canvas.removeEventListener('webglcontextrestored', handleContextRestored);
        controls.dispose();
        composerRef.current = null;
        bloomPass?.dispose();
        outputPass?.dispose();
        composer?.dispose();
        composerRT?.dispose();
        pmrem.dispose();
        envRT.dispose();
        floorTexNight.dispose();
        floorTexDay.dispose();
        sceneryBundle.terrainTexNight.dispose();
        sceneryBundle.terrainTexDay.dispose();
        sceneryBundle.plazaTexNight.dispose();
        sceneryBundle.plazaTexDay.dispose();
        sceneryBundle.roadTex.dispose();
        shadowTex.dispose();
        scene.traverse((obj) => {
          if (obj instanceof THREE.Mesh || obj instanceof THREE.Points || obj instanceof THREE.LineSegments) {
            obj.geometry?.dispose();
            const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
            for (const m of mats) {
              m?.dispose();
            }
          }
        });
        renderer.dispose();
        rendererRef.current = null;
      };
    }, []);

    return (
      <div ref={containerRef} className="fixed inset-0 z-0 overflow-hidden select-none">
        <canvas ref={canvasRef} className="block h-full w-full" aria-label="EventSphere 3D Expo Floor" />

        {hoveredTooltip && (
          <div
            role="status"
            className="pointer-events-none fixed z-30 rounded-xl border border-[#2D2D3A] bg-[#0B0B0E]/95 px-3.5 py-2.5 text-xs text-[#F2F3F7] shadow-2xl"
            style={{
              left: Math.min(hoveredTooltip.x + 16, window.innerWidth - 240),
              top: Math.min(hoveredTooltip.y + 16, window.innerHeight - 95),
            }}
          >
            <div className="flex items-center gap-2 font-display font-bold">
              <span
                className="inline-block h-2.5 w-2.5 rounded-xs"
                style={{ backgroundColor: STATUS_HEX[hoveredTooltip.booth.status] }}
              />
              <span>Booth {hoveredTooltip.booth.number}</span>
              <span className="font-mono text-[11px] text-[#E8C987]">
                ${hoveredTooltip.booth.priceUsd.toLocaleString()}
              </span>
            </div>
            <div className="mt-0.5 text-[11px] text-[#9497A6]">
              {hoveredTooltip.booth.exhibitorName
                ? `${hoveredTooltip.booth.exhibitorName} · Click to inspect`
                : hoveredTooltip.booth.status === 'available'
                  ? 'Available · Click to inspect or reserve'
                  : 'Pending review · Click to inspect'}
            </div>
          </div>
        )}

        {contextLost && (
          <div className="fixed inset-0 z-20 flex items-center justify-center bg-[#0B0B0E]/94 p-6 text-center text-[#F2F3F7]">
            <div className="max-w-md rounded-2xl border border-[#2D2D3A] bg-[#121217] p-6">
              <p className="font-display text-lg font-bold">3D Floor Canvas Paused</p>
              <p className="mt-2 text-sm text-[#9497A6]">
                Your browser paused WebGL rendering. All Portals, Schedules, and Analytics remain interactive.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  },
);

ExpoHallCanvas.displayName = 'ExpoHallCanvas';
