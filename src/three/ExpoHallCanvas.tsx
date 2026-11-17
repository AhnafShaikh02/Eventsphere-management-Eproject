import React, { useEffect, useImperativeHandle, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import type { BoothStatus, ExpoBooth } from '../types/eventsphere';
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

export type CameraMode = 'voyage' | 'explore';
export type StatusFilter = 'all' | BoothStatus;

export interface ExpoHallCanvasHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
  focusBooth: (boothId: string) => void;
  focusStage: () => void;
  focusPlaza: () => void;
  captureSnapshot: () => string | null;
}

export interface ZoomTelemetry {
  distance: number;
  zoomPercent: number;
  zoomRatio: number;
}

interface ExpoHallCanvasProps {
  booths: ExpoBooth[];
  selectedBoothId: string | null;
  cameraMode: CameraMode;
  scrollProgress: number;
  nightMode: boolean;
  showFloorGrid: boolean;
  showTrussAndVisitors: boolean;
  statusFilter: StatusFilter;
  onSelectBooth: (boothId: string) => void;
  onZoomChange?: (zoom: ZoomTelemetry) => void;
}

function detectSoftwareGl(gl: WebGLRenderingContext | WebGL2RenderingContext): boolean {
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  const raw = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '') : '';
  return /swiftshader|llvmpipe|software/i.test(raw);
}

export const ExpoHallCanvas = React.forwardRef<ExpoHallCanvasHandle, ExpoHallCanvasProps>(
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
    const containerRef = useRef<HTMLDivElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [contextLost, setContextLost] = useState(false);
    const [hoveredTooltip, setHoveredTooltip] = useState<{
      x: number;
      y: number;
      booth: ExpoBooth;
    } | null>(null);

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

    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const focusTargetRef = useRef<{
      active: boolean;
      pos: THREE.Vector3;
      lookAt: THREE.Vector3;
    }>({
      active: false,
      pos: new THREE.Vector3(0, 18, 22),
      lookAt: new THREE.Vector3(0, 1, -2),
    });

    useImperativeHandle(ref, () => ({
      zoomIn: () => {
        const cam = cameraRef.current;
        const ctrl = controlsRef.current;
        if (!cam || !ctrl) return;
        const dir = new THREE.Vector3().subVectors(cam.position, ctrl.target);
        const nextLen = Math.max(5.5, dir.length() * 0.76);
        dir.setLength(nextLen);
        focusTargetRef.current = {
          active: true,
          pos: ctrl.target.clone().add(dir),
          lookAt: ctrl.target.clone(),
        };
      },
      zoomOut: () => {
        const cam = cameraRef.current;
        const ctrl = controlsRef.current;
        if (!cam || !ctrl) return;
        const dir = new THREE.Vector3().subVectors(cam.position, ctrl.target);
        const nextLen = Math.min(82, dir.length() * 1.28);
        dir.setLength(nextLen);
        focusTargetRef.current = {
          active: true,
          pos: ctrl.target.clone().add(dir),
          lookAt: ctrl.target.clone(),
        };
      },
      resetView: () => {
        focusTargetRef.current = {
          active: true,
          pos: new THREE.Vector3(0, 22, 29),
          lookAt: new THREE.Vector3(0, 1.2, 1),
        };
      },
      focusBooth: (boothId: string) => {
        const booth = stateRef.current.booths.find((b) => b.id === boothId);
        if (!booth) return;
        const target = getBoothWorldPosition(booth);
        focusTargetRef.current = {
          active: true,
          pos: new THREE.Vector3(target.x + 4.4, 5.2, target.z + 6.4),
          lookAt: new THREE.Vector3(target.x, 1.1, target.z),
        };
      },
      focusStage: () => {
        focusTargetRef.current = {
          active: true,
          pos: new THREE.Vector3(0, 6.2, -3.5),
          lookAt: new THREE.Vector3(0, 2.4, -14.5),
        };
      },
      focusPlaza: () => {
        focusTargetRef.current = {
          active: true,
          pos: new THREE.Vector3(-12, 10.5, 36),
          lookAt: new THREE.Vector3(0, 1.6, 20),
        };
      },
      captureSnapshot: () => {
        const renderer = rendererRef.current;
        if (!renderer) return null;
        try {
          renderer.render(sceneCaptureRef.current.scene!, sceneCaptureRef.current.camera!);
          return renderer.domElement.toDataURL('image/png');
        } catch {
          return null;
        }
      },
    }));

    const sceneCaptureRef = useRef<{ scene: THREE.Scene | null; camera: THREE.PerspectiveCamera | null }>({
      scene: null,
      camera: null,
    });

    useEffect(() => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      let renderer: THREE.WebGLRenderer;
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
      const nightBg = new THREE.Color(0x040705);
      const dayBg = new THREE.Color(0xdbe7df);
      scene.background = stateRef.current.nightMode ? nightBg.clone() : dayBg.clone();
      const fog = new THREE.FogExp2(stateRef.current.nightMode ? 0x040705 : 0xdbe7df, 0.0085);
      scene.fog = fog;

      // Environment reflections
      const pmrem = new THREE.PMREMGenerator(renderer);
      const envScene = new RoomEnvironment();
      const envRT = pmrem.fromScene(envScene, 0.04);
      scene.environment = envRT.texture;
      scene.environmentIntensity = 0.62;
      envScene.dispose();

      const camera = new THREE.PerspectiveCamera(52, 1, 0.2, 240);
      camera.position.set(0, 26, 30);
      cameraRef.current = camera;
      sceneCaptureRef.current = { scene, camera };

      const controls = new OrbitControls(camera, canvas);
      controls.enableDamping = !isSoftGl;
      controls.dampingFactor = 0.07;
      controls.maxPolarAngle = Math.PI * 0.475;
      controls.minDistance = 5.5;
      controls.maxDistance = 82;
      controls.target.set(0, 1.2, 0);
      controls.enabled = stateRef.current.cameraMode === 'explore';
      controlsRef.current = controls;

      // Lighting: crisp emerald/mint architectural key + warm neutral fill + studio softboxes
      const hemi = new THREE.HemisphereLight(0xd1fae5, 0x07120c, stateRef.current.nightMode ? 0.85 : 1.22);
      scene.add(hemi);

      const dirKey = new THREE.DirectionalLight(0xfff7ed, 1.48);
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
        const rectKeynote = new THREE.RectAreaLight(0x34d399, 3.2, 12, 3.5);
        rectKeynote.position.set(0, 6.2, -11);
        rectKeynote.lookAt(0, 0.5, -14.5);
        scene.add(rectKeynote);
      }

      const pEmerald = new THREE.PointLight(0x10b981, 36, 62, 1.45);
      pEmerald.position.set(-12, 9, 4);
      scene.add(pEmerald);

      const pCoral = new THREE.PointLight(0xf97362, 18, 46, 1.5);
      pCoral.position.set(13, 8, -8);
      scene.add(pCoral);

      const pJade = new THREE.PointLight(0x34d399, 32, 62, 1.45);
      pJade.position.set(14, 12, 16);
      scene.add(pJade);

      const pTeal = new THREE.PointLight(0x2dd4bf, 28, 56, 1.45);
      pTeal.position.set(0, 8, 19);
      scene.add(pTeal);

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

      const gridHelper = new THREE.GridHelper(34, 17, 0x10b981, 0x0c1f16);
      gridHelper.position.set(0, 0.028, -0.75);
      const gridMats = Array.isArray(gridHelper.material) ? gridHelper.material : [gridHelper.material];
      gridMats.forEach((m) => {
        m.transparent = true;
        m.opacity = 0.14;
      });
      scene.add(gridHelper);

      // Center aisle runner carpet (obsidian pine-black with subtle perimeter)
      const runnerGeo = new THREE.PlaneGeometry(2.8, 35.2);
      const runnerMat = new THREE.MeshStandardMaterial({
        color: 0x09140e,
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
      const boothGroupMap = new Map<string, THREE.Group>();
      const raycastTargets: THREE.Mesh[] = [];

      for (const b of stateRef.current.booths) {
        const g = createBoothGroup(b, shadowTex, maxAniso);
        boothGroupMap.set(b.id, g);
        scene.add(g);
        const refs = g.userData.refs as { hitMeshes?: THREE.Mesh[] } | undefined;
        if (refs?.hitMeshes) {
          raycastTargets.push(...refs.hitMeshes);
        }
      }

      // Ambient floating light particles (expo energy field)
      const ptCount = 260;
      const ptPositions = new Float32Array(ptCount * 3);
      for (let i = 0; i < ptCount; i++) {
        ptPositions[i * 3] = (Math.random() - 0.5) * 52;
        ptPositions[i * 3 + 1] = 1.2 + Math.random() * 14;
        ptPositions[i * 3 + 2] = (Math.random() - 0.5) * 44;
      }
      const ptGeo = new THREE.BufferGeometry();
      ptGeo.setAttribute('position', new THREE.BufferAttribute(ptPositions, 3));
      const ptMat = new THREE.PointsMaterial({
        size: 0.14,
        color: 0xf3f1ff,
        transparent: true,
        opacity: 0.52,
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
      let hoveredBoothId: string | null = null;
      let lastRayTime = 0;
      let pointerDownAt = { x: 0, y: 0 };

      const handleResize = () => {
        if (!container) return;
        const w = container.clientWidth || window.innerWidth;
        const h = container.clientHeight || window.innerHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.fov = camera.aspect < 1 ? 66 : 52;
        camera.updateProjectionMatrix();
      };
      handleResize();
      const ro = new ResizeObserver(handleResize);
      ro.observe(container);

      const handlePointerMove = (e: PointerEvent) => {
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
        const hitBoothId = hits[0]?.object?.userData?.boothId as string | undefined;
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

      const handlePointerDown = (e: PointerEvent) => {
        pointerDownAt = { x: e.clientX, y: e.clientY };
        // Cancel focus flight if user grabs orbit controls
        if (stateRef.current.cameraMode === 'explore') {
          focusTargetRef.current.active = false;
        }
      };

      const handlePointerUp = (e: PointerEvent) => {
        const dist = Math.hypot(e.clientX - pointerDownAt.x, e.clientY - pointerDownAt.y);
        if (dist > 6) return;
        const rect = canvas.getBoundingClientRect();
        const nx = (e.clientX - rect.left) / rect.width;
        const ny = (e.clientY - rect.top) / rect.height;
        pointerNdc.set(nx * 2 - 1, -(ny * 2 - 1));
        raycaster.setFromCamera(pointerNdc, camera);
        const hits = raycaster.intersectObjects(raycastTargets, false);
        const hitBoothId = hits[0]?.object?.userData?.boothId as string | undefined;
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

      const handleContextLost = (ev: Event) => {
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
      let lastReportedZoom = -1;

      const afterDraw = (cb: () => void) => {
        const ctx = renderer.getContext() as WebGL2RenderingContext;
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

      const animate = (now: number) => {
        if (disposed) return;
        const dt = Math.min(0.05, (now - prevTime) * 0.001);
        prevTime = now;
        const t = now * 0.001;

        const cur = stateRef.current;

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
          ptMat.color.setHex(cur.nightMode ? 0x34d399 : 0x059669);
          ptMat.opacity = cur.nightMode ? 0.56 : 0.34;
          hemi.intensity = cur.nightMode ? 0.85 : 1.22;
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
          updateBoothGroupAppearance(grp, b, dimmed, isSelected, maxAniso);

          const targetScaleY = isSelected ? 1.08 : 1.0;
          grp.scale.y = THREE.MathUtils.damp(grp.scale.y, targetScaleY, 7, dt);

          const refs = grp.userData.refs as
            | { beaconMesh?: THREE.Mesh; displayArt?: THREE.Object3D }
            | undefined;
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
            camera.position.lerp(focusTargetRef.current.pos, 1 - Math.exp(-5.5 * dt));
            controls.target.lerp(focusTargetRef.current.lookAt, 1 - Math.exp(-5.5 * dt));
            if (camera.position.distanceTo(focusTargetRef.current.pos) < 0.08) {
              focusTargetRef.current.active = false;
            }
          }
          controls.update();
        }

        // Zoom-responsive 3D borders & floor section criteria:
        // Adapt grid, zone outlines, and dome wireframe smoothly to camera distance
        const refTarget = cur.cameraMode === 'explore' ? controls.target : scratchLook;
        const camDist = camera.position.distanceTo(refTarget);
        const zoomRatio = THREE.MathUtils.clamp((camDist - 6) / 62, 0, 1); // 0 = zoomed in close, 1 = far overview
        const zoomPercent = Math.round(THREE.MathUtils.lerp(220, 45, zoomRatio));

        // Close-up: fine grid stays crisp, dome wireframe & wide zone outlines recede so they don't obstruct booths.
        // Far overview: dense inner grid fades down to prevent visual clutter, while outer hall/section borders stay legible.
        const gridOpacity = cur.showFloorGrid
          ? THREE.MathUtils.lerp(0.18, 0.04, THREE.MathUtils.smoothstep(zoomRatio, 0.35, 0.95))
          : 0;
        gridMats.forEach((m) => {
          m.opacity = gridOpacity;
        });

        const dayScale = cur.nightMode ? 1.0 : 0.72;
        zoneBundle.zoneGroup.visible = cur.showFloorGrid || zoomRatio > 0.14;
        zoneBundle.zoneBorderMat.opacity =
          THREE.MathUtils.lerp(0.08, 0.26, THREE.MathUtils.smoothstep(zoomRatio, 0.08, 0.6)) * dayScale;
        zoneBundle.hallBorderMat.opacity =
          THREE.MathUtils.lerp(0.12, 0.32, THREE.MathUtils.smoothstep(zoomRatio, 0.05, 0.55)) * dayScale;

        const domeVisibilityFactor = THREE.MathUtils.smoothstep(zoomRatio, 0.16, 0.65);
        domeBundle.wireMat.opacity = 0.11 * domeVisibilityFactor * dayScale;
        domeBundle.arcMatA.opacity = 0.18 * domeVisibilityFactor * dayScale;
        domeBundle.arcMatB.opacity = 0.14 * domeVisibilityFactor * dayScale;
        domeBundle.floorRingMat.opacity = THREE.MathUtils.lerp(0.08, 0.22, zoomRatio) * dayScale;
        domeBundle.laneMatA.opacity = THREE.MathUtils.lerp(0.24, 0.44, zoomRatio) * dayScale;
        domeBundle.laneMatB.opacity = THREE.MathUtils.lerp(0.22, 0.40, zoomRatio) * dayScale;

        if (onZoomChangeRef.current && Math.abs(zoomPercent - lastReportedZoom) >= 2) {
          lastReportedZoom = zoomPercent;
          onZoomChangeRef.current({ distance: camDist, zoomPercent, zoomRatio });
        }

        renderer.render(scene, camera);

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
        canvas.removeEventListener('pointermove', handlePointerMove);
        canvas.removeEventListener('pointerdown', handlePointerDown);
        canvas.removeEventListener('pointerup', handlePointerUp);
        canvas.removeEventListener('pointerleave', handlePointerLeave);
        canvas.removeEventListener('webglcontextlost', handleContextLost);
        canvas.removeEventListener('webglcontextrestored', handleContextRestored);
        controls.dispose();
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
            className="pointer-events-none fixed z-30 rounded-xl border border-[#10B981]/30 bg-[#040705]/95 px-3.5 py-2.5 text-xs text-[#ECFDF5] shadow-2xl"
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
              <span className="font-mono text-[11px] text-[#34D399]">
                ${hoveredTooltip.booth.priceUsd.toLocaleString()}
              </span>
            </div>
            <div className="mt-0.5 text-[11px] text-[#8EAD9E]">
              {hoveredTooltip.booth.exhibitorName
                ? `${hoveredTooltip.booth.exhibitorName} · Click to inspect`
                : hoveredTooltip.booth.status === 'available'
                  ? 'Available · Click to inspect or reserve'
                  : 'Pending review · Click to inspect'}
            </div>
          </div>
        )}

        {contextLost && (
          <div className="fixed inset-0 z-20 flex items-center justify-center bg-[#040705]/94 p-6 text-center text-[#ECFDF5]">
            <div className="max-w-md rounded-2xl border border-[#10B981]/25 bg-[#09120D] p-6">
              <p className="font-display text-lg font-bold">3D Floor Canvas Paused</p>
              <p className="mt-2 text-sm text-[#8EAD9E]">
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
