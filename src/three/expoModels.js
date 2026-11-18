import * as THREE from 'three';

export const STATUS_COLORS = {
  available: 0xe8c987,
  reserved: 0xf97362,
  occupied: 0x38bdf8,
  pending: 0xc58b3b,
};

export const STATUS_HEX = {
  available: '#E8C987',
  reserved: '#F97362',
  occupied: '#38BDF8',
  pending: '#C58B3B',
};

export function getBoothWorldPosition(booth) {
  const x = (booth.col - 2.5) * 4.4 + (booth.col >= 3 ? 1.6 : -1.6);
  const z = (booth.row - 1.5) * 5.6 + 2.0;
  return new THREE.Vector3(x, 0, z);
}

function getBoothDimensions(size) {
  if (size === '6x6m Island') return { w: 3.4, d: 3.4, h: 2.35 };
  if (size === '6x3m Corner') return { w: 3.2, d: 2.5, h: 2.05 };
  return { w: 2.55, d: 2.35, h: 1.75 };
}

export function createContactShadowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(64, 64, 12, 64, 64, 62);
  grad.addColorStop(0, 'rgba(3, 4, 10, 0.64)');
  grad.addColorStop(0.6, 'rgba(3, 4, 10, 0.24)');
  grad.addColorStop(1, 'rgba(3, 4, 10, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createHallFloorTexture(nightMode, maxAniso) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = nightMode ? '#0B0B0E' : '#EAEBF1';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle architectural slab grid
  ctx.strokeStyle = nightMode ? 'rgba(148, 152, 174, 0.11)' : 'rgba(11, 11, 14, 0.08)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 512; i += 32) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }

  // Primary tile border
  ctx.strokeStyle = nightMode ? 'rgba(232, 201, 135, 0.16)' : 'rgba(138, 98, 28, 0.16)';
  ctx.lineWidth = 2;
  ctx.strokeRect(2, 2, 508, 508);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 16);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, maxAniso);
  return tex;
}

export function createBoothFasciaTexture(booth, maxAniso) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  const accent = STATUS_HEX[booth.status];
  ctx.fillStyle = '#101015';
  ctx.fillRect(0, 0, 512, 128);

  // Left color block
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, 112, 128);

  ctx.fillStyle = '#0B0B0E';
  ctx.font = '800 50px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(booth.number, 56, 66);

  // Right exhibitor / status copy
  ctx.textAlign = 'left';
  ctx.fillStyle = '#F8F9FC';
  ctx.font = '700 30px "DM Sans", system-ui, sans-serif';
  const title = booth.exhibitorName || (booth.status === 'pending' ? 'PENDING REVIEW' : 'OPEN BOOTH');
  ctx.fillText(title.slice(0, 22), 132, 48);

  ctx.fillStyle = '#E8C987';
  ctx.font = '600 21px "JetBrains Mono", monospace';
  const subtitle = `${booth.size.split(' ')[0]} · $${booth.priceUsd.toLocaleString()}`;
  ctx.fillText(subtitle, 132, 90);

  // Bottom hairline
  ctx.fillStyle = accent;
  ctx.fillRect(112, 120, 400, 8);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(4, maxAniso);
  return tex;
}

export function createKeynoteLedTexture(maxAniso) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 384;
  const ctx = canvas.getContext('2d');

  const bg = ctx.createLinearGradient(0, 0, 1024, 384);
  bg.addColorStop(0, '#0B0B0E');
  bg.addColorStop(0.5, '#191612');
  bg.addColorStop(1, '#0B0B0E');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1024, 384);

  // Architectural champagne equalizer bars
  const barColors = ['#C99E4E', '#E8C987', '#F3DCAA'];
  for (let i = 0; i < 36; i++) {
    const h = 44 + ((i * 37) % 120);
    ctx.fillStyle = barColors[i % 3];
    ctx.globalAlpha = 0.28;
    ctx.fillRect(36 + i * 27, 348 - h, 14, h);
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = '#E8C987';
  ctx.font = '700 24px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('EVENTSPHERE ARENA · REAL-TIME SYNCHRONIZATION', 512, 118);

  ctx.fillStyle = '#F8F9FC';
  ctx.font = '800 68px "Bricolage Grotesque", system-ui, sans-serif';
  ctx.fillText('MAIN KEYNOTE STAGE', 512, 206);

  ctx.fillStyle = '#A8A296';
  ctx.font = '500 26px "DM Sans", system-ui, sans-serif';
  ctx.fillText('NEXTGEN INDUSTRIAL & TECH EXPO 2026', 512, 268);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, maxAniso);
  return tex;
}

function createMonitorScreenTexture(accentHex, maxAniso) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0B0B0E';
  ctx.fillRect(0, 0, 256, 160);
  ctx.fillStyle = accentHex;
  ctx.fillRect(14, 14, 228, 12);
  ctx.fillStyle = 'rgba(232, 201, 135, 0.42)';
  for (let i = 0; i < 6; i++) {
    const h = 24 + ((i * 29) % 72);
    ctx.fillRect(18 + i * 36, 134 - h, 24, h);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(4, maxAniso);
  return tex;
}

export function createBoothGroup(booth, shadowTexture, maxAniso) {
  const group = new THREE.Group();
  const { w, d, h } = getBoothDimensions(booth.size);
  const pos = getBoothWorldPosition(booth);
  group.position.copy(pos);

  const statusColor = STATUS_COLORS[booth.status];

  // 1. Soft contact shadow plane underneath
  const shadowGeo = new THREE.PlaneGeometry(w + 1.0, d + 1.0);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTexture,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = 0.015;
  group.add(shadowMesh);

  // 2. Two-step chamfered terrazzo plinth base
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x111116,
    roughness: 0.44,
    metalness: 0.36,
  });
  const deckMat = new THREE.MeshStandardMaterial({
    color: 0x181820,
    roughness: 0.62,
    metalness: 0.14,
  });
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(w, 0.16, d), baseMat);
  plinth.position.y = 0.08;
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  group.add(plinth);

  const carpetInset = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, 0.03, d * 0.88), deckMat);
  carpetInset.position.y = 0.175;
  carpetInset.receiveShadow = true;
  group.add(carpetInset);

  // 3. Sleek architectural status perimeter trim + backdrop wall
  const trimMat = new THREE.MeshStandardMaterial({
    color: statusColor,
    emissive: statusColor,
    emissiveIntensity: 0.22,
    roughness: 0.35,
    metalness: 0.25,
  });
  const perimeter = new THREE.Mesh(new THREE.BoxGeometry(w + 0.04, 0.024, d + 0.04), trimMat);
  perimeter.position.y = 0.162;
  group.add(perimeter);

  // Rear exhibition media wall (leaving Island booths open on 4 sides)
  if (booth.size !== '6x6m Island') {
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(w * 0.82, h * 0.72, 0.12), baseMat);
    backWall.position.set(0, h * 0.36 + 0.18, -d * 0.36);
    backWall.castShadow = true;
    group.add(backWall);

    const monitorTex = createMonitorScreenTexture(STATUS_HEX[booth.status], maxAniso);
    const monitorScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(w * 0.56, h * 0.42),
      new THREE.MeshStandardMaterial({
        map: monitorTex,
        emissiveMap: monitorTex,
        emissive: 0xffffff,
        emissiveIntensity: 0.45,
        roughness: 0.2,
      }),
    );
    monitorScreen.position.set(0, h * 0.46 + 0.18, -d * 0.36 + 0.07);
    group.add(monitorScreen);
  }

  // 4. Sculpted reception counter + dual desk monitors
  const podium = new THREE.Mesh(new THREE.BoxGeometry(w * 0.46, 0.56, d * 0.28), baseMat);
  podium.position.set(-w * 0.14, 0.46, d * 0.22);
  podium.castShadow = true;
  group.add(podium);

  const counterTop = new THREE.Mesh(
    new THREE.BoxGeometry(w * 0.5, 0.05, d * 0.32),
    new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.25, metalness: 0.4 }),
  );
  counterTop.position.set(-w * 0.14, 0.76, d * 0.22);
  group.add(counterTop);

  // Counter kiosk display
  const deskScreen = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.28, 0.04), trimMat);
  deskScreen.position.set(-w * 0.14, 0.94, d * 0.22);
  deskScreen.rotation.x = -0.25;
  group.add(deskScreen);

  // 5. Product Exhibit Pedestal + Rotating Sculpture
  const pedX = w * 0.22;
  const pedZ = booth.size === '6x6m Island' ? 0 : d * 0.12;
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.68, 12), baseMat);
  pedestal.position.set(pedX, 0.52, pedZ);
  pedestal.castShadow = true;
  group.add(pedestal);

  const displayArtMat = new THREE.MeshStandardMaterial({
    color: 0xf3dcaa,
    emissive: statusColor,
    emissiveIntensity: 0.45,
    metalness: 0.85,
    roughness: 0.18,
  });
  const displayArt = new THREE.Mesh(
    booth.size === '6x6m Island'
      ? new THREE.TorusKnotGeometry(0.24, 0.07, 36, 8)
      : new THREE.IcosahedronGeometry(0.24, 0),
    displayArtMat,
  );
  displayArt.position.set(pedX, 1.08, pedZ);
  group.add(displayArt);

  // 6. Four brushed steel truss corner pillars + spotlight cans
  const pillarGeo = new THREE.CylinderGeometry(0.06, 0.06, h, 10);
  const pillarMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    roughness: 0.24,
    metalness: 0.85,
  });
  const px = w * 0.44;
  const pz = d * 0.44;
  const corners = [
    [-px, -pz],
    [px, -pz],
    [-px, pz],
    [px, pz],
  ];
  for (const [cx, cz] of corners) {
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position.set(cx, h * 0.5 + 0.14, cz);
    pillar.castShadow = true;
    group.add(pillar);
  }

  // Spotlight cans mounted under canopy rim
  const spotCanGeo = new THREE.CylinderGeometry(0.055, 0.08, 0.18, 8);
  for (const sx of [-w * 0.25, w * 0.25]) {
    const can = new THREE.Mesh(spotCanGeo, pillarMat);
    can.position.set(sx, h - 0.14, d * 0.36);
    can.rotation.x = 0.35;
    group.add(can);
  }

  // 7. Overhead fascia canopy with dynamic CanvasTexture sign
  const fasciaTex = createBoothFasciaTexture(booth, maxAniso);
  const fasciaMat = new THREE.MeshStandardMaterial({
    map: fasciaTex,
    emissiveMap: fasciaTex,
    emissive: 0xffffff,
    emissiveIntensity: 0.3,
    roughness: 0.38,
    metalness: 0.18,
  });
  const canopy = new THREE.Mesh(
    new THREE.BoxGeometry(w * 0.96, 0.44, d * 0.88),
    [baseMat, baseMat, baseMat, baseMat, fasciaMat, fasciaMat],
  );
  canopy.position.y = h + 0.14;
  canopy.castShadow = true;
  group.add(canopy);

  // 8. Floating status crystal beacon
  const beaconMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), trimMat);
  beaconMesh.position.y = h + 0.65;
  group.add(beaconMesh);

  // Tag all raycastable meshes with boothId
  const hitMeshes = [plinth, podium, canopy, beaconMesh];
  for (const hm of hitMeshes) {
    hm.userData.boothId = booth.id;
  }

  const refs = {
    boothId: booth.id,
    baseMat,
    trimMat,
    fasciaMat,
    beaconMesh,
    displayArt,
    displayArtMat,
    hitMeshes,
    targetHeightScale: 1,
    lastStatusKey: `${booth.status}:${booth.exhibitorName || ''}:${booth.priceUsd}`,
  };
  group.userData.refs = refs;
  group.scale.y = 0.01;
  return group;
}

export function updateBoothGroupAppearance(
  group,
  booth,
  dimmed,
  isSelected,
  maxAniso,
  elapsedSec = 0,
  phaseOffset = 0,
) {
  const refs = group.userData.refs;
  if (!refs) return;

  const statusColor = STATUS_COLORS[booth.status];
  const isPulsing = !dimmed && (booth.status === 'pending' || booth.status === 'occupied');
  const pulseWave = isPulsing ? 0.5 + 0.5 * Math.sin(elapsedSec * 2.2 + phaseOffset) : 0;

  refs.trimMat.color.setHex(statusColor);
  refs.trimMat.emissive.setHex(statusColor);
  refs.trimMat.emissiveIntensity = dimmed
    ? 0.05
    : isSelected
      ? 0.85 + pulseWave * 0.28
      : isPulsing
        ? 0.26 + pulseWave * 0.66
        : 0.22;

  refs.baseMat.opacity = dimmed ? 0.32 : 1;
  refs.baseMat.transparent = dimmed;

  refs.fasciaMat.emissiveIntensity = dimmed
    ? 0.06
    : isSelected
      ? 0.52 + pulseWave * 0.12
      : isPulsing
        ? 0.24 + pulseWave * 0.14
        : 0.24;
  refs.fasciaMat.opacity = dimmed ? 0.35 : 1;
  refs.fasciaMat.transparent = dimmed;

  if (refs.displayArtMat) {
    refs.displayArtMat.emissive.setHex(statusColor);
    refs.displayArtMat.emissiveIntensity = dimmed
      ? 0.1
      : isSelected
        ? 0.65 + pulseWave * 0.25
        : isPulsing
          ? 0.42 + pulseWave * 0.36
          : 0.45;
  }

  refs.beaconMesh.scale.setScalar(isPulsing ? 1 + pulseWave * 0.12 : 1);

  const statusKey = `${booth.status}:${booth.exhibitorName || ''}:${booth.priceUsd}`;
  if (refs.lastStatusKey !== statusKey) {
    refs.lastStatusKey = statusKey;
    const oldMap = refs.fasciaMat.map;
    const nextTex = createBoothFasciaTexture(booth, maxAniso);
    refs.fasciaMat.map = nextTex;
    refs.fasciaMat.emissiveMap = nextTex;
    refs.fasciaMat.needsUpdate = true;
    oldMap?.dispose();
  }
}

export function createKeynoteStageGroup(maxAniso) {
  const stage = new THREE.Group();
  stage.position.set(0, 0, -14.5);

  const deckMat = new THREE.MeshStandardMaterial({
    color: 0x121218,
    roughness: 0.42,
    metalness: 0.45,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: 0xe8c987,
    emissive: 0xd4af63,
    emissiveIntensity: 0.65,
    roughness: 0.28,
  });
  const metalMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.25,
    metalness: 0.85,
  });
  const seatMat = new THREE.MeshStandardMaterial({
    color: 0x1b1b24,
    roughness: 0.62,
    metalness: 0.15,
  });

  // 1. Tiered stage deck + entry steps
  const tier1 = new THREE.Mesh(new THREE.BoxGeometry(14.5, 0.35, 5.2), deckMat);
  tier1.position.y = 0.175;
  tier1.receiveShadow = true;
  tier1.castShadow = true;
  stage.add(tier1);

  const tier2 = new THREE.Mesh(new THREE.BoxGeometry(11.6, 0.28, 3.8), deckMat);
  tier2.position.y = 0.49;
  tier2.castShadow = true;
  stage.add(tier2);

  for (const sx of [-5.8, 5.8]) {
    const steps = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.2, 0.9), deckMat);
    steps.position.set(sx, 0.1, 2.9);
    stage.add(steps);
  }

  // 2. Stage front neon lip + confidence monitors
  const frontLip = new THREE.Mesh(new THREE.BoxGeometry(14.6, 0.07, 0.1), accentMat);
  frontLip.position.set(0, 0.36, 2.6);
  stage.add(frontLip);

  for (const mx of [-2.4, 2.4]) {
    const mon = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.35, 0.42), deckMat);
    mon.position.set(mx, 0.72, 1.5);
    mon.rotation.x = 0.35;
    stage.add(mon);
  }

  // 3. LED screen wall + flanking acoustic slat wings
  const ledTex = createKeynoteLedTexture(maxAniso);
  const screenMat = new THREE.MeshStandardMaterial({
    map: ledTex,
    emissiveMap: ledTex,
    emissive: 0xffffff,
    emissiveIntensity: 0.55,
    roughness: 0.24,
  });
  const ledWall = new THREE.Mesh(new THREE.BoxGeometry(10.6, 4.1, 0.28), [
    deckMat,
    deckMat,
    deckMat,
    deckMat,
    screenMat,
    deckMat,
  ]);
  ledWall.position.set(0, 2.75, -1.25);
  ledWall.castShadow = true;
  stage.add(ledWall);

  for (const side of [-1, 1]) {
    for (let s = 0; s < 4; s++) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.8, 0.65), seatMat);
      fin.position.set(side * (5.7 + s * 0.42), 2.5, -1.1 + s * 0.22);
      fin.rotation.y = side * -0.25;
      fin.castShadow = true;
      stage.add(fin);
    }
  }

  // 4. Speaker lectern + mic
  const lectern = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.1, 0.65), deckMat);
  lectern.position.set(-2.2, 1.15, 1.0);
  stage.add(lectern);

  const lecternTrim = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.08, 0.08), accentMat);
  lecternTrim.position.set(-2.2, 1.66, 1.32);
  stage.add(lecternTrim);

  // 5. Flanking lighting truss towers & overhead truss bar + spotlights
  for (const sx of [-6.4, 6.4]) {
    const tower = new THREE.Mesh(new THREE.BoxGeometry(0.42, 5.4, 0.42), metalMat);
    tower.position.set(sx, 2.7, -0.6);
    tower.castShadow = true;
    stage.add(tower);
  }

  const headerBar = new THREE.Mesh(new THREE.BoxGeometry(13.4, 0.36, 0.36), metalMat);
  headerBar.position.set(0, 5.4, -0.6);
  stage.add(headerBar);

  for (const lx of [-4.5, -2.2, 0, 2.2, 4.5]) {
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.16, 0.3, 10), metalMat);
    lamp.position.set(lx, 5.1, -0.45);
    lamp.rotation.x = 0.5;
    stage.add(lamp);
  }

  // 6. Auditorium VIP Seating Pods in front of stage (z local +3.6..+5.5 -> world z -10.9..-9.0, clear of Row A)
  for (let row = 0; row < 2; row++) {
    for (let col = -4; col <= 4; col++) {
      if (col === 0) continue; // preserve center aisle sightline
      const seatGroup = new THREE.Group();
      seatGroup.position.set(col * 1.15, 0, 3.95 + row * 1.25);

      const base = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.34, 0.66), seatMat);
      base.position.y = 0.17;
      base.castShadow = true;
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.56, 0.14), seatMat);
      back.position.set(0, 0.52, 0.26);
      const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.08, 0.56), accentMat);
      cushion.position.set(0, 0.36, -0.02);
      seatGroup.add(base, back, cushion);
      stage.add(seatGroup);
    }
  }

  return stage;
}

export function createExpoTrussAndCrowd() {
  const trussGroup = new THREE.Group();
  const metalMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.35,
    metalness: 0.78,
  });

  // Overhead hall gantry beams
  const beamGeo = new THREE.BoxGeometry(34, 0.26, 0.26);
  for (const zPos of [-11, -3, 5, 13]) {
    const beam = new THREE.Mesh(beamGeo, metalMat);
    beam.position.set(0, 7.6, zPos);
    trussGroup.add(beam);
  }
  const sideBeamGeo = new THREE.BoxGeometry(0.28, 0.28, 28);
  for (const xPos of [-16.8, 16.8]) {
    const sBeam = new THREE.Mesh(sideBeamGeo, metalMat);
    sBeam.position.set(xPos, 7.6, 1);
    trussGroup.add(sBeam);
  }

  // Instanced venue columns along outer perimeter
  const colGeo = new THREE.CylinderGeometry(0.24, 0.28, 7.6, 12);
  const colCount = 8;
  const columns = new THREE.InstancedMesh(colGeo, metalMat, colCount);
  const dummy = new THREE.Object3D();
  const zCoords = [-11, -3, 5, 13];
  let idx = 0;
  for (const x of [-16.8, 16.8]) {
    for (const z of zCoords) {
      dummy.position.set(x, 3.8, z);
      dummy.updateMatrix();
      columns.setMatrixAt(idx++, dummy.matrix);
    }
  }
  columns.instanceMatrix.needsUpdate = true;
  columns.computeBoundingSphere();
  trussGroup.add(columns);

  // Instanced strolling expo visitors (distinct torso + head across 2 synchronized InstancedMeshes)
  const visitorCount = 68;
  const visitorGeo = new THREE.CapsuleGeometry(0.15, 0.48, 4, 8);
  const visitorHeadGeo = new THREE.SphereGeometry(0.13, 10, 10);
  const visitorMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.55,
    metalness: 0.12,
  });
  const headMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    roughness: 0.45,
    metalness: 0.08,
  });
  const visitorMesh = new THREE.InstancedMesh(visitorGeo, visitorMat, visitorCount);
  const visitorHeadMesh = new THREE.InstancedMesh(visitorHeadGeo, headMat, visitorCount);
  const visitorSeeds = [];
  const attirePalette = [
    new THREE.Color('#E8C987'),
    new THREE.Color('#F3DCAA'),
    new THREE.Color('#CBD5E1'),
    new THREE.Color('#C58B3B'),
    new THREE.Color('#64748B'),
  ];

  for (let i = 0; i < visitorCount; i++) {
    const isCenterAisle = i % 3 === 0;
    const isPlazaVisitor = i > 52;
    const baseX = isPlazaVisitor
      ? (Math.random() - 0.5) * 20
      : isCenterAisle
        ? (Math.random() - 0.5) * 1.5
        : (Math.random() - 0.5) * 24;
    const baseZ = isPlazaVisitor ? 14.5 + Math.random() * 5.2 : -8 + Math.random() * 21;
    visitorSeeds.push({
      baseX,
      baseZ,
      radius: 0.35 + Math.random() * 0.95,
      speed: 0.35 + Math.random() * 0.5,
      phase: Math.random() * Math.PI * 2,
    });
    dummy.position.set(baseX, 0.42, baseZ);
    dummy.updateMatrix();
    visitorMesh.setMatrixAt(i, dummy.matrix);
    visitorMesh.setColorAt(i, attirePalette[i % attirePalette.length]);

    dummy.position.set(baseX, 0.92, baseZ);
    dummy.updateMatrix();
    visitorHeadMesh.setMatrixAt(i, dummy.matrix);
  }
  visitorMesh.instanceMatrix.needsUpdate = true;
  if (visitorMesh.instanceColor) visitorMesh.instanceColor.needsUpdate = true;
  visitorHeadMesh.instanceMatrix.needsUpdate = true;
  visitorMesh.computeBoundingSphere();
  visitorHeadMesh.computeBoundingSphere();
  trussGroup.add(visitorMesh, visitorHeadMesh);

  return { trussGroup, visitorMesh, visitorHeadMesh, visitorSeeds };
}

export function createSphereDomeGroup() {
  const domeGroup = new THREE.Group();

  // Luminous champagne-gold outer geodesic dome cradling the Expo Hall
  const domeGeo = new THREE.IcosahedronGeometry(23.8, 1);
  const wireGeo = new THREE.WireframeGeometry(domeGeo);
  domeGeo.dispose();
  const wireMat = new THREE.LineBasicMaterial({
    color: 0xe8c987,
    transparent: true,
    opacity: 0.36,
  });
  const domeWire = new THREE.LineSegments(wireGeo, wireMat);
  domeWire.position.set(0, 1.5, -1);
  domeGroup.add(domeWire);

  // Subtle floor perimeter halo ring
  const floorRingGeo = new THREE.RingGeometry(22.2, 22.36, 96);
  const floorRingMat = new THREE.MeshBasicMaterial({
    color: 0xe8c987,
    transparent: true,
    opacity: 0.28,
    side: THREE.DoubleSide,
  });
  const floorRing = new THREE.Mesh(floorRingGeo, floorRingMat);
  floorRing.rotation.x = -Math.PI / 2;
  floorRing.position.set(0, 0.025, -1);
  domeGroup.add(floorRing);

  // Two sleek orbital meridian arcs overhead
  const arcGeo = new THREE.TorusGeometry(24.0, 0.035, 8, 96);
  const arcMatA = new THREE.MeshBasicMaterial({
    color: 0xf3dcaa,
    transparent: true,
    opacity: 0.45,
  });
  const meridianRingA = new THREE.Mesh(arcGeo, arcMatA);
  meridianRingA.position.set(0, 1.5, -1);
  meridianRingA.rotation.set(Math.PI * 0.28, 0.4, 0.18);
  domeGroup.add(meridianRingA);

  const arcMatB = new THREE.MeshBasicMaterial({
    color: 0xd4af63,
    transparent: true,
    opacity: 0.34,
  });
  const meridianRingB = new THREE.Mesh(arcGeo.clone(), arcMatB);
  meridianRingB.position.set(0, 1.5, -1);
  meridianRingB.rotation.set(-Math.PI * 0.24, -0.5, -0.22);
  domeGroup.add(meridianRingB);

  // Refined center corridor guide hairlines & South entrance plaza cross
  const laneGeo = new THREE.PlaneGeometry(0.055, 35.2);
  const laneMatA = new THREE.MeshBasicMaterial({
    color: 0xe8c987,
    transparent: true,
    opacity: 0.48,
  });
  const laneMatB = new THREE.MeshBasicMaterial({
    color: 0xf3dcaa,
    transparent: true,
    opacity: 0.42,
  });
  const laneLeft = new THREE.Mesh(laneGeo, laneMatA);
  laneLeft.rotation.x = -Math.PI / 2;
  laneLeft.position.set(-1.42, 0.034, -0.8);
  domeGroup.add(laneLeft);

  const laneRight = new THREE.Mesh(laneGeo, laneMatB);
  laneRight.rotation.x = -Math.PI / 2;
  laneRight.position.set(1.42, 0.034, -0.8);
  domeGroup.add(laneRight);

  const plazaCrossGeo = new THREE.PlaneGeometry(0.05, 7.2);
  for (const ang of [Math.PI * 0.27, -Math.PI * 0.27]) {
    const crossLine = new THREE.Mesh(plazaCrossGeo, laneMatA);
    crossLine.rotation.x = -Math.PI / 2;
    crossLine.rotation.z = ang;
    crossLine.position.set(0, 0.033, 20.1);
    domeGroup.add(crossLine);
  }

  return {
    domeGroup,
    meridianRingA,
    meridianRingB,
    wireMat,
    floorRingMat,
    arcMatA,
    arcMatB,
    laneMatA,
    laneMatB,
  };
}

export function createZoneSectionsGroup() {
  const zoneGroup = new THREE.Group();

  const zoneBorderMat = new THREE.LineBasicMaterial({
    color: 0xe8c987,
    transparent: true,
    opacity: 0.24,
  });
  const hallBorderMat = new THREE.LineBasicMaterial({
    color: 0xd4af63,
    transparent: true,
    opacity: 0.3,
  });

  // Outer floor slab boundary hairline (matches 35 x 35.5 slab without heavy edges)
  const hallPlane = new THREE.PlaneGeometry(34.4, 34.8);
  const hallEdges = new THREE.EdgesGeometry(hallPlane);
  hallPlane.dispose();
  const hallBorder = new THREE.LineSegments(hallEdges, hallBorderMat);
  hallBorder.rotation.x = -Math.PI / 2;
  hallBorder.position.set(0, 0.034, -0.75);
  zoneGroup.add(hallBorder);

  // Subtle 4-row Expo Zone section outlines (left & right wings flanking center aisle)
  const rowZCenters = [-6.4, -0.8, 4.8, 10.4];
  const wingPlane = new THREE.PlaneGeometry(13.2, 4.7);
  const wingEdges = new THREE.EdgesGeometry(wingPlane);
  wingPlane.dispose();

  for (const rz of rowZCenters) {
    for (const wx of [-8.2, 8.2]) {
      const sectionOutline = new THREE.LineSegments(wingEdges, zoneBorderMat);
      sectionOutline.rotation.x = -Math.PI / 2;
      sectionOutline.position.set(wx, 0.035, rz);
      zoneGroup.add(sectionOutline);
    }
  }

  return { zoneGroup, zoneBorderMat, hallBorderMat };
}
