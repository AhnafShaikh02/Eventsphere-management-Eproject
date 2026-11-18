import * as THREE from 'three';

export function createGrassTerrainTexture(nightMode, maxAniso) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = nightMode ? '#0B0B0E' : '#B7BBC7';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle organic turf speckles & mowing bands
  for (let y = 0; y < 512; y += 64) {
    ctx.fillStyle = nightMode ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.07)';
    ctx.fillRect(0, y, 512, 32);
  }
  for (let i = 0; i < 1800; i++) {
    const x = (i * 97) % 512;
    const y = (i * 193) % 512;
    const r = 1 + (i % 3);
    ctx.fillStyle =
      i % 2 === 0
        ? nightMode
          ? 'rgba(148, 152, 174, 0.045)'
          : 'rgba(21, 128, 61, 0.12)'
        : nightMode
          ? 'rgba(5, 5, 8, 0.32)'
          : 'rgba(11, 11, 14, 0.06)';
    ctx.fillRect(x, y, r, r);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(22, 22);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, maxAniso);
  return tex;
}

export function createPlazaStoneTexture(nightMode, maxAniso) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = nightMode ? '#111116' : '#DCE0E8';
  ctx.fillRect(0, 0, 512, 512);

  ctx.strokeStyle = nightMode ? 'rgba(148, 152, 174, 0.12)' : 'rgba(11, 11, 14, 0.10)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 512; i += 64) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }

  for (let i = 0; i < 600; i++) {
    const x = (i * 137) % 512;
    const y = (i * 223) % 512;
    ctx.fillStyle = nightMode ? 'rgba(242, 243, 247, 0.04)' : 'rgba(255, 255, 255, 0.18)';
    ctx.fillRect(x, y, 2, 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 6);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, maxAniso);
  return tex;
}

export function createAsphaltRoadTexture(maxAniso) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#15151B';
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 2400; i++) {
    const x = (i * 151) % 512;
    const y = (i * 271) % 512;
    ctx.fillStyle = i % 3 === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.22)';
    ctx.fillRect(x, y, 2, 2);
  }

  // Crisp shoulder lines
  ctx.fillStyle = 'rgba(242, 243, 247, 0.60)';
  ctx.fillRect(14, 0, 6, 512);
  ctx.fillRect(492, 0, 6, 512);

  // Dashed center divider
  ctx.fillStyle = '#E8C987';
  for (let y = 16; y < 512; y += 64) {
    ctx.fillRect(252, y, 8, 34);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 6);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, maxAniso);
  return tex;
}

function createEntranceSignTexture(maxAniso) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 192;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#0B0B0E';
  ctx.fillRect(0, 0, 1024, 192);

  ctx.strokeStyle = '#E8C987';
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, 1008, 176);

  ctx.fillStyle = '#E8C987';
  ctx.font = '700 26px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('SOUTH GRAND CONCOURSE · HALL 4', 512, 62);

  ctx.fillStyle = '#F8F9FC';
  ctx.font = '800 58px "Bricolage Grotesque", system-ui, sans-serif';
  ctx.fillText('EVENTSPHERE EXPO ARENA', 512, 134);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, maxAniso);
  return tex;
}

export function createVehicleGroup(style, paintHex, shadowTexture) {
  const group = new THREE.Group();
  const wheels = [];

  const length = style === 'shuttle' ? 3.8 : style === 'suv' ? 3.45 : 3.35;
  const width = style === 'shuttle' ? 1.56 : 1.48;
  const bodyH = style === 'shuttle' ? 0.92 : style === 'suv' ? 0.56 : 0.44;
  const wheelRadius = style === 'suv' ? 0.3 : 0.27;
  const wheelWidth = 0.2;

  // 1. Contact shadow
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(width + 1.05, length + 1.05),
    new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      depthWrite: false,
      opacity: 0.72,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.018;
  group.add(shadow);

  // Materials with clear roughness/metalness contrast
  const paintMat = new THREE.MeshPhysicalMaterial({
    color: paintHex,
    metalness: 0.82,
    roughness: 0.2,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x14141b,
    roughness: 0.68,
    metalness: 0.2,
  });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x0e0e14,
    metalness: 0.1,
    roughness: 0.06,
    clearcoat: 1.0,
    opacity: 0.92,
    transparent: true,
  });
  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x121216,
    roughness: 0.88,
    metalness: 0.05,
  });
  const rimMat = new THREE.MeshStandardMaterial({
    color: 0xe2e4ec,
    roughness: 0.2,
    metalness: 0.9,
  });
  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xfffbeb,
    emissive: 0xe8c987,
    emissiveIntensity: 1.4,
    roughness: 0.2,
  });
  const taillightMat = new THREE.MeshStandardMaterial({
    color: 0xff3b52,
    emissive: 0xff2842,
    emissiveIntensity: 1.35,
    roughness: 0.25,
  });

  // 2. Lower rocker skirt / chassis floorpan
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(width * 0.96, 0.14, length * 0.94), trimMat);
  chassis.position.y = wheelRadius * 0.85;
  chassis.castShadow = true;
  group.add(chassis);

  // 3. Sculpted lower body (ExtrudeGeometry side silhouette rotated onto X axis)
  const halfL = length * 0.5;
  const profile = new THREE.Shape();
  if (style === 'shuttle') {
    profile.moveTo(-halfL, 0);
    profile.lineTo(halfL, 0);
    profile.lineTo(halfL - 0.12, bodyH);
    profile.lineTo(-halfL + 0.12, bodyH);
    profile.closePath();
  } else {
    profile.moveTo(-halfL, 0);
    profile.lineTo(halfL, 0);
    profile.lineTo(halfL - 0.06, bodyH * 0.68);
    profile.lineTo(halfL * 0.42, bodyH); // hood crest
    profile.lineTo(-halfL * 0.88, bodyH * 1.02); // beltline to trunk
    profile.lineTo(-halfL, bodyH * 0.62);
    profile.closePath();
  }

  const bodyGeo = new THREE.ExtrudeGeometry(profile, {
    depth: width * 0.9,
    bevelEnabled: true,
    bevelThickness: 0.06,
    bevelSize: 0.05,
    bevelSegments: 2,
  });
  bodyGeo.center();
  // Rotate so length aligns along Z (+Z = front) and width along X
  bodyGeo.rotateY(Math.PI / 2);
  const bodyMesh = new THREE.Mesh(bodyGeo, paintMat);
  bodyMesh.position.y = wheelRadius * 0.95 + bodyH * 0.5;
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  group.add(bodyMesh);

  // 4. Sculpted glass cabin / roof greenhouse
  if (style !== 'shuttle') {
    const cabinShape = new THREE.Shape();
    const cabHalf = length * (style === 'suv' ? 0.34 : 0.31);
    const cabH = style === 'suv' ? 0.46 : 0.38;
    cabinShape.moveTo(-cabHalf, 0);
    cabinShape.lineTo(cabHalf, 0);
    cabinShape.lineTo(cabHalf * 0.46, cabH);
    cabinShape.lineTo(-cabHalf * 0.68, cabH);
    cabinShape.closePath();

    const cabGeo = new THREE.ExtrudeGeometry(cabinShape, {
      depth: width * 0.76,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.04,
      bevelSegments: 2,
    });
    cabGeo.center();
    cabGeo.rotateY(Math.PI / 2);
    const cabinMesh = new THREE.Mesh(cabGeo, glassMat);
    cabinMesh.position.set(0, wheelRadius * 0.95 + bodyH + cabH * 0.42, -length * 0.06);
    cabinMesh.castShadow = true;
    group.add(cabinMesh);

    // Roof cap
    const roofCap = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.72, 0.04, cabHalf * 1.08),
      paintMat,
    );
    roofCap.position.set(0, wheelRadius * 0.95 + bodyH + cabH * 0.85, -length * 0.08);
    group.add(roofCap);
  } else {
    // Shuttle panoramic glass band + roof lidar pod
    const glassBand = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.97, bodyH * 0.55, length * 0.82),
      glassMat,
    );
    glassBand.position.set(0, wheelRadius * 0.95 + bodyH * 0.65, 0);
    group.add(glassBand);

    const roofSensor = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.14, 16), rimMat);
    roofSensor.position.set(0, wheelRadius * 0.95 + bodyH + 0.14, length * 0.22);
    group.add(roofSensor);
  }

  // 5. Headlight & Taillight LED bars + front splitter
  const frontLight = new THREE.Mesh(
    new THREE.BoxGeometry(width * 0.86, 0.07, 0.08),
    headlightMat,
  );
  frontLight.position.set(0, wheelRadius * 0.95 + bodyH * 0.45, halfL + 0.04);
  group.add(frontLight);

  const rearLight = new THREE.Mesh(
    new THREE.BoxGeometry(width * 0.86, 0.07, 0.08),
    taillightMat,
  );
  rearLight.position.set(0, wheelRadius * 0.95 + bodyH * 0.55, -halfL - 0.04);
  group.add(rearLight);

  // 6. Side Mirrors (left & right)
  if (style !== 'shuttle') {
    const mirrorGeo = new THREE.BoxGeometry(0.16, 0.08, 0.12);
    for (const sx of [-1, 1]) {
      const m = new THREE.Mesh(mirrorGeo, paintMat);
      m.position.set(sx * (width * 0.54), wheelRadius * 0.95 + bodyH * 0.96, length * 0.12);
      group.add(m);
    }
  }

  // 7. Four rotating wheel assemblies (tire + alloy hub + center cap)
  const tireGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 18);
  tireGeo.rotateZ(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(wheelRadius * 0.62, wheelRadius * 0.62, wheelWidth + 0.02, 12);
  rimGeo.rotateZ(Math.PI / 2);
  const hubGeo = new THREE.CylinderGeometry(wheelRadius * 0.2, wheelRadius * 0.2, wheelWidth + 0.04, 8);
  hubGeo.rotateZ(Math.PI / 2);

  const axleZ = length * 0.31;
  const axleX = width * 0.48;
  const wheelCoords = [
    [-axleX, axleZ],
    [axleX, axleZ],
    [-axleX, -axleZ],
    [axleX, -axleZ],
  ];

  for (const [wx, wz] of wheelCoords) {
    const wheelPivot = new THREE.Group();
    wheelPivot.position.set(wx, wheelRadius, wz);
    const tire = new THREE.Mesh(tireGeo, tireMat);
    tire.castShadow = true;
    const rim = new THREE.Mesh(rimGeo, rimMat);
    const hub = new THREE.Mesh(hubGeo, trimMat);
    wheelPivot.add(tire, rim, hub);
    group.add(wheelPivot);
    wheels.push(wheelPivot);
  }

  return { group, wheels };
}

function createPlanterTreeGroup(x, z, scale, shadowTexture) {
  const grp = new THREE.Group();
  grp.position.set(x, 0, z);

  const planterMat = new THREE.MeshStandardMaterial({
    color: 0x15151c,
    roughness: 0.45,
    metalness: 0.32,
  });
  const rimLedMat = new THREE.MeshStandardMaterial({
    color: 0xe8c987,
    emissive: 0xd4af63,
    emissiveIntensity: 0.55,
    roughness: 0.3,
  });
  const soilMat = new THREE.MeshStandardMaterial({
    color: 0x2a2018,
    roughness: 0.95,
  });
  const barkMat = new THREE.MeshStandardMaterial({
    color: 0x4f3827,
    roughness: 0.9,
  });
  const leafMatA = new THREE.MeshStandardMaterial({
    color: 0x696432,
    roughness: 0.78,
    metalness: 0.05,
  });
  const leafMatB = new THREE.MeshStandardMaterial({
    color: 0xb99a5b,
    roughness: 0.72,
    metalness: 0.06,
  });

  // Contact shadow
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6 * scale, 2.6 * scale),
    new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      depthWrite: false,
      opacity: 0.55,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.025;
  grp.add(shadow);

  // Octagonal stone planter + illuminated collar + soil bed
  const tub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.95 * scale, 0.82 * scale, 0.55 * scale, 8),
    planterMat,
  );
  tub.position.y = 0.275 * scale;
  tub.castShadow = true;
  tub.receiveShadow = true;
  grp.add(tub);

  const ledRing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.98 * scale, 0.98 * scale, 0.06 * scale, 8),
    rimLedMat,
  );
  ledRing.position.y = 0.54 * scale;
  grp.add(ledRing);

  const soil = new THREE.Mesh(
    new THREE.CylinderGeometry(0.84 * scale, 0.84 * scale, 0.06 * scale, 8),
    soilMat,
  );
  soil.position.y = 0.56 * scale;
  grp.add(soil);

  // Main trunk + secondary forked branches
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08 * scale, 0.14 * scale, 1.55 * scale, 8),
    barkMat,
  );
  trunk.position.y = 1.3 * scale;
  trunk.castShadow = true;
  grp.add(trunk);

  const branchL = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045 * scale, 0.07 * scale, 0.85 * scale, 7),
    barkMat,
  );
  branchL.position.set(-0.22 * scale, 1.9 * scale, 0.08 * scale);
  branchL.rotation.z = 0.52;
  grp.add(branchL);

  const branchR = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045 * scale, 0.07 * scale, 0.8 * scale, 7),
    barkMat,
  );
  branchR.position.set(0.2 * scale, 1.86 * scale, -0.1 * scale);
  branchR.rotation.z = -0.48;
  branchR.rotation.x = -0.2;
  grp.add(branchR);

  // Multi-cluster organic foliage crown
  const canopySpecs = [
    [0, 2.55, 0, 0.72, false],
    [-0.44, 2.25, 0.26, 0.54, true],
    [0.46, 2.28, -0.22, 0.52, false],
    [0.05, 2.38, -0.42, 0.48, true],
    [-0.1, 2.86, 0.15, 0.44, true],
  ];
  for (const [cx, cy, cz, cr, bright] of canopySpecs) {
    const crown = new THREE.Mesh(
      new THREE.DodecahedronGeometry(cr * scale, 1),
      bright ? leafMatB : leafMatA,
    );
    crown.position.set(cx * scale, cy * scale, cz * scale);
    crown.scale.set(1.1, 0.86, 1.05);
    crown.castShadow = true;
    grp.add(crown);
  }

  return grp;
}

function buildOutdoorParkForestInstanced(placements) {
  const forestGroup = new THREE.Group();
  const count = placements.length;
  if (count === 0) return forestGroup;

  // Shared geometries for multi-part trees (trunk + 3 foliage crown tiers)
  const trunkGeo = new THREE.CylinderGeometry(0.14, 0.28, 2.4, 7);
  trunkGeo.translate(0, 1.2, 0);
  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0x4b3626,
    roughness: 0.92,
    metalness: 0.02,
  });

  const lowerFoliageGeo = new THREE.DodecahedronGeometry(1.35, 1);
  lowerFoliageGeo.scale(1.15, 0.82, 1.1);
  lowerFoliageGeo.translate(0, 2.75, 0);

  const midFoliageGeo = new THREE.DodecahedronGeometry(1.1, 1);
  midFoliageGeo.scale(1.05, 0.92, 1.05);
  midFoliageGeo.translate(0.28, 3.65, 0.18);

  const topFoliageGeo = new THREE.DodecahedronGeometry(0.84, 1);
  topFoliageGeo.translate(-0.18, 4.35, -0.14);

  const foliageMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.82,
    metalness: 0.04,
  });

  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, count);
  const lower = new THREE.InstancedMesh(lowerFoliageGeo, foliageMat, count);
  const mid = new THREE.InstancedMesh(midFoliageGeo, foliageMat, count);
  const top = new THREE.InstancedMesh(topFoliageGeo, foliageMat, count);

  trunks.castShadow = true;
  lower.castShadow = true;
  mid.castShadow = true;

  const dummy = new THREE.Object3D();
  const palette = [
    new THREE.Color('#B99A5B'),
    new THREE.Color('#8E7B42'),
    new THREE.Color('#696432'),
    new THREE.Color('#4F4B28'),
    new THREE.Color('#CCA96A'),
  ];
  const tint = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const p = placements[i];
    dummy.position.set(p.x, 0, p.z);
    dummy.rotation.set(0, p.rotY, 0);
    dummy.scale.set(
      p.pine ? p.scale * 0.82 : p.scale,
      p.pine ? p.scale * 1.28 : p.scale,
      p.pine ? p.scale * 0.82 : p.scale,
    );
    dummy.updateMatrix();

    trunks.setMatrixAt(i, dummy.matrix);
    lower.setMatrixAt(i, dummy.matrix);
    mid.setMatrixAt(i, dummy.matrix);
    top.setMatrixAt(i, dummy.matrix);

    const baseCol = palette[i % palette.length];
    tint.copy(baseCol).offsetHSL(0, 0, ((i % 5) - 2) * 0.018);
    lower.setColorAt(i, tint);
    tint.offsetHSL(0, 0, 0.03);
    mid.setColorAt(i, tint);
    tint.offsetHSL(0, 0, 0.035);
    top.setColorAt(i, tint);
  }

  for (const im of [trunks, lower, mid, top]) {
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.computeBoundingSphere();
    forestGroup.add(im);
  }

  return forestGroup;
}

export function createExpoCampusScenery(nightMode, shadowTexture, maxAniso) {
  const sceneryGroup = new THREE.Group();

  // 1. Expansive Campus Lawn Terrain
  const terrainTexNight = createGrassTerrainTexture(true, maxAniso);
  const terrainTexDay = createGrassTerrainTexture(false, maxAniso);
  const terrainMat = new THREE.MeshStandardMaterial({
    map: nightMode ? terrainTexNight : terrainTexDay,
    roughness: 0.94,
    metalness: 0.02,
  });
  const terrain = new THREE.Mesh(new THREE.PlaneGeometry(170, 170), terrainMat);
  terrain.rotation.x = -Math.PI / 2;
  terrain.position.y = -0.02;
  terrain.receiveShadow = true;
  sceneryGroup.add(terrain);

  // 2. Arrival Plaza & Exhibition Apron (stepped cleanly at y = 0.015)
  const plazaTexNight = createPlazaStoneTexture(true, maxAniso);
  const plazaTexDay = createPlazaStoneTexture(false, maxAniso);
  const plazaMat = new THREE.MeshStandardMaterial({
    map: nightMode ? plazaTexNight : plazaTexDay,
    roughness: 0.65,
    metalness: 0.12,
  });
  const arrivalPlaza = new THREE.Mesh(new THREE.BoxGeometry(42, 0.06, 7.6), plazaMat);
  arrivalPlaza.position.set(0, 0.01, 18.8);
  arrivalPlaza.receiveShadow = true;
  sceneryGroup.add(arrivalPlaza);

  // Side terrace aprons
  for (const sx of [-20.2, 20.2]) {
    const sideWalk = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.06, 39), plazaMat);
    sideWalk.position.set(sx, 0.01, -0.5);
    sideWalk.receiveShadow = true;
    sceneryGroup.add(sideWalk);
  }

  // 3. Road Network (South Arrival Boulevard, East/West Feeder Roads, North Ring Road, & Parking Lots)
  const roadTex = createAsphaltRoadTexture(maxAniso);
  const roadMat = new THREE.MeshStandardMaterial({
    map: roadTex,
    roughness: 0.78,
    metalness: 0.08,
  });
  const plainAsphaltMat = new THREE.MeshStandardMaterial({
    color: 0x16161c,
    roughness: 0.82,
    metalness: 0.06,
  });

  // South Boulevard (east-west, rotated 90 deg around Y)
  const southRoad = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.04, 62), roadMat);
  southRoad.rotation.y = Math.PI / 2;
  southRoad.position.set(0, 0.005, 24.4);
  southRoad.receiveShadow = true;
  sceneryGroup.add(southRoad);

  // North Ring Road
  const northRoad = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.04, 62), roadMat);
  northRoad.rotation.y = Math.PI / 2;
  northRoad.position.set(0, 0.005, -24.5);
  northRoad.receiveShadow = true;
  sceneryGroup.add(northRoad);

  // West & East Feeder Roads
  for (const rx of [-28.5, 28.5]) {
    const sideRoad = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.04, 54), roadMat);
    sideRoad.position.set(rx, 0.005, 0);
    sideRoad.receiveShadow = true;
    sceneryGroup.add(sideRoad);
  }

  // Crosswalk stripes in front of main entrance
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.55 });
  for (let i = -3; i <= 3; i++) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.02, 4.4), stripeMat);
    stripe.position.set(i * 0.9, 0.026, 24.4);
    sceneryGroup.add(stripe);
  }

  // West & East Visitor Parking Aprons (z = 28..36.5)
  for (const px of [-15.2, 15.2]) {
    const lot = new THREE.Mesh(new THREE.BoxGeometry(19, 0.04, 9.5), plainAsphaltMat);
    lot.position.set(px, 0.004, 31.8);
    lot.receiveShadow = true;
    sceneryGroup.add(lot);
  }

  // Painted parking stall lines + concrete wheel stops + EV Charging Totems
  const lineMat = new THREE.MeshStandardMaterial({
    color: 0xe8c987,
    emissive: 0xd4af63,
    emissiveIntensity: 0.25,
    roughness: 0.5,
  });
  const concreteMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.85 });
  const chargerMat = new THREE.MeshStandardMaterial({
    color: 0x13131a,
    roughness: 0.35,
    metalness: 0.55,
  });

  for (const side of [-1, 1]) {
    const baseLotX = side * 15.2;
    for (let s = -3; s <= 3; s++) {
      const bayX = baseLotX + s * 2.55;
      const stallLine = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 4.4), lineMat);
      stallLine.position.set(bayX - 1.27, 0.026, 30.8);
      sceneryGroup.add(stallLine);

      const stop = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.12, 0.22), concreteMat);
      stop.position.set(bayX, 0.07, 32.7);
      sceneryGroup.add(stop);
    }
    // EV Supercharger Totem Pillar at the inner parking corner
    const totem = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.85, 0.35), chargerMat);
    totem.position.set(side * 6.4, 0.92, 31.2);
    totem.castShadow = true;
    sceneryGroup.add(totem);

    const totemGlow = new THREE.Mesh(
      new THREE.BoxGeometry(0.58, 0.14, 0.38),
      new THREE.MeshStandardMaterial({
        color: 0xe8c987,
        emissive: 0xe8c987,
        emissiveIntensity: 1.1,
      }),
    );
    totemGlow.position.set(side * 6.4, 1.65, 31.2);
    sceneryGroup.add(totemGlow);
  }

  // 4. Grand Glass Canopy Entrance & Perimeter Architectural Curtain-Wall Atrium
  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    roughness: 0.26,
    metalness: 0.85,
  });
  const archGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0xe6decb,
    roughness: 0.1,
    metalness: 0.12,
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
  });
  const darkTrimMat = new THREE.MeshStandardMaterial({
    color: 0x121218,
    roughness: 0.38,
    metalness: 0.65,
  });

  // Grand South Entrance Canopy (x = [-5.8, +5.8], z = 17.6)
  const canopyDeck = new THREE.Mesh(new THREE.BoxGeometry(11.6, 0.22, 4.6), darkTrimMat);
  canopyDeck.position.set(0, 5.15, 17.8);
  canopyDeck.castShadow = true;
  sceneryGroup.add(canopyDeck);

  const canopyGlass = new THREE.Mesh(new THREE.BoxGeometry(11.2, 0.06, 4.2), archGlassMat);
  canopyGlass.position.set(0, 5.28, 17.8);
  sceneryGroup.add(canopyGlass);

  // Entrance sign fascia
  const signTex = createEntranceSignTexture(maxAniso);
  const signMesh = new THREE.Mesh(
    new THREE.BoxGeometry(10.8, 1.15, 0.18),
    [
      darkTrimMat,
      darkTrimMat,
      darkTrimMat,
      darkTrimMat,
      new THREE.MeshStandardMaterial({
        map: signTex,
        emissiveMap: signTex,
        emissive: 0xffffff,
        emissiveIntensity: 0.48,
        roughness: 0.3,
      }),
      darkTrimMat,
    ],
  );
  signMesh.position.set(0, 5.8, 19.95);
  sceneryGroup.add(signMesh);

  for (const cx of [-5.2, -2.5, 2.5, 5.2]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 5.15, 12), steelMat);
    post.position.set(cx, 2.575, 19.5);
    post.castShadow = true;
    sceneryGroup.add(post);
  }

  // Low-iron curtain-wall glass facade wings flanking the South entrance
  for (const sx of [-11.5, 11.5]) {
    const facadeWall = new THREE.Mesh(new THREE.BoxGeometry(11.2, 5.2, 0.14), archGlassMat);
    facadeWall.position.set(sx, 2.6, 16.4);
    sceneryGroup.add(facadeWall);

    const mullionBase = new THREE.Mesh(new THREE.BoxGeometry(11.4, 0.35, 0.32), darkTrimMat);
    mullionBase.position.set(sx, 0.18, 16.4);
    sceneryGroup.add(mullionBase);

    const mullionCap = new THREE.Mesh(new THREE.BoxGeometry(11.4, 0.24, 0.32), steelMat);
    mullionCap.position.set(sx, 5.25, 16.4);
    sceneryGroup.add(mullionCap);
  }

  // Side glass curtain fins along East/West perimeter
  for (const sx of [-17.4, 17.4]) {
    const sideGlass = new THREE.Mesh(new THREE.BoxGeometry(0.14, 5.2, 33.4), archGlassMat);
    sideGlass.position.set(sx, 2.6, -0.3);
    sceneryGroup.add(sideGlass);
  }

  // 5. Twin Reflecting Pools with Warm Champagne-Bronze Water & Sculptures (x = ±10.6, z = 19.0)
  const waterMats = [];
  for (const sx of [-10.6, 10.6]) {
    const coping = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.28, 3.0), darkTrimMat);
    coping.position.set(sx, 0.14, 19.0);
    coping.castShadow = true;
    coping.receiveShadow = true;
    sceneryGroup.add(coping);

    const waterMat = new THREE.MeshPhysicalMaterial({
      color: 0x3b2f1c,
      roughness: 0.08,
      metalness: 0.65,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      emissive: 0x6b532e,
      emissiveIntensity: 0.48,
    });
    waterMats.push(waterMat);

    const waterSurface = new THREE.Mesh(new THREE.PlaneGeometry(6.0, 2.4), waterMat);
    waterSurface.rotation.x = -Math.PI / 2;
    waterSurface.position.set(sx, 0.29, 19.0);
    sceneryGroup.add(waterSurface);

    // Floating sculptural water ring inside each reflecting pool
    const sculpture = new THREE.Mesh(new THREE.TorusKnotGeometry(0.45, 0.11, 48, 10), steelMat);
    sculpture.position.set(sx, 0.72, 19.0);
    sculpture.castShadow = true;
    sceneryGroup.add(sculpture);
  }

  // 6. Hero Concept EV Display Turntables inside South Promenade (no booth collisions!)
  const turntableCars = [];
  const heroCars = [
    { x: -8.6, z: 14.3, style: 'sedan', color: 0xd4af63 },
    { x: 8.6, z: 14.3, style: 'suv', color: 0xe8c987 },
    { x: -12.6, z: -13.6, style: 'shuttle', color: 0xc99e4e },
  ];

  for (const hc of heroCars) {
    const padGroup = new THREE.Group();
    padGroup.position.set(hc.x, 0, hc.z);

    const plinth = new THREE.Mesh(
      new THREE.CylinderGeometry(2.55, 2.75, 0.22, 32),
      darkTrimMat,
    );
    plinth.position.y = 0.11;
    plinth.receiveShadow = true;
    plinth.castShadow = true;
    padGroup.add(plinth);

    const glowRim = new THREE.Mesh(
      new THREE.TorusGeometry(2.6, 0.04, 8, 48),
      new THREE.MeshStandardMaterial({
        color: 0xe8c987,
        emissive: 0xe8c987,
        emissiveIntensity: 0.9,
      }),
    );
    glowRim.rotation.x = Math.PI / 2;
    glowRim.position.y = 0.22;
    padGroup.add(glowRim);

    const turntableSpin = new THREE.Group();
    turntableSpin.position.y = 0.22;
    const { group: car } = createVehicleGroup(hc.style, hc.color, shadowTexture);
    car.rotation.y = hc.x < 0 ? 0.55 : -0.55;
    turntableSpin.add(car);
    padGroup.add(turntableSpin);

    turntableCars.push(turntableSpin);
    sceneryGroup.add(padGroup);
  }

  // 7. Parked Cars in Visitor Parking Lots (12 realistic cars)
  const carPalette = [0xa67c3d, 0x1e293b, 0x334155, 0xc99e4e, 0x475569, 0x7c6236, 0x64748b];
  let carIdx = 0;
  for (const side of [-1, 1]) {
    for (const s of [-3, -2, -1, 1, 2, 3]) {
      const bayX = side * 15.2 + s * 2.55;
      const style = carIdx % 3 === 0 ? 'suv' : 'sedan';
      const paint = carPalette[carIdx % carPalette.length];
      const { group: parkedCar } = createVehicleGroup(style, paint, shadowTexture);
      parkedCar.position.set(bayX, 0.025, 30.8);
      parkedCar.rotation.y = carIdx % 2 === 0 ? Math.PI : 0;
      sceneryGroup.add(parkedCar);
      carIdx++;
    }
  }

  // 8. Animated Cruising Vehicles on the Campus Loop Road (4 vehicles)
  const movingVehicles = [];
  const fleetSpecs = [
    { style: 'shuttle', color: 0xe8c987, offset: 0.05, speed: 0.032 },
    { style: 'sedan', color: 0xc99e4e, offset: 0.31, speed: 0.038 },
    { style: 'suv', color: 0xd4af63, offset: 0.58, speed: 0.034 },
    { style: 'shuttle', color: 0xf3dcaa, offset: 0.82, speed: 0.03 },
  ];
  for (let i = 0; i < fleetSpecs.length; i++) {
    const spec = fleetSpecs[i];
    const { group: car, wheels } = createVehicleGroup(spec.style, spec.color, shadowTexture);
    sceneryGroup.add(car);
    movingVehicles.push({
      group: car,
      wheels,
      loopIndex: i,
      offset: spec.offset,
      speed: spec.speed,
    });
  }

  // 9. Indoor Architectural Planter Trees (filling empty indoor hall corners & promenade)
  const indoorPlanters = [
    [-15.3, -13.0, 0.95],
    [15.3, -13.0, 0.95],
    [-15.3, 13.8, 0.95],
    [15.3, 13.8, 0.95],
    [-3.1, 14.4, 0.82],
    [3.1, 14.4, 0.82],
    [-15.5, -1.0, 0.84],
    [15.5, -1.0, 0.84],
    [-15.5, 6.2, 0.84],
    [15.5, 6.2, 0.84],
  ];
  for (const [tx, tz, sc] of indoorPlanters) {
    sceneryGroup.add(createPlanterTreeGroup(tx, tz, sc, shadowTexture));
  }

  // 10. Outdoor Boulevard & Parkland Forest (92 instanced composite trees)
  const outdoorTrees = [];

  // Boulevard promenade trees flanking South Plaza & Entrance
  for (const bx of [-18.5, -14.2, -6.4, 6.4, 14.2, 18.5]) {
    outdoorTrees.push({ x: bx, z: 21.1, scale: 0.82, rotY: bx * 0.4, pine: false });
  }
  // West & East avenue trees
  for (let z = -20; z <= 20; z += 6.5) {
    outdoorTrees.push({ x: -23.6, z, scale: 0.92, rotY: z * 0.3, pine: Math.abs(z) % 2 === 1 });
    outdoorTrees.push({ x: 23.6, z, scale: 0.92, rotY: -z * 0.3, pine: Math.abs(z) % 2 === 0 });
  }
  // North, West, East, and South outer wooded parkland groves
  let seed = 17;
  const nextRand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  for (let i = 0; i < 76; i++) {
    const zone = i % 4;
    let x = 0;
    let z = 0;
    if (zone === 0) {
      // North Woods behind stage & road
      x = -48 + nextRand() * 96;
      z = -29 - nextRand() * 24;
    } else if (zone === 1) {
      // West Woods beyond feeder road
      x = -33 - nextRand() * 20;
      z = -26 + nextRand() * 64;
    } else if (zone === 2) {
      // East Woods beyond feeder road
      x = 33 + nextRand() * 20;
      z = -26 + nextRand() * 64;
    } else {
      // South Park beyond parking lot
      x = -46 + nextRand() * 92;
      z = 38 + nextRand() * 14;
    }
    outdoorTrees.push({
      x,
      z,
      scale: 0.85 + nextRand() * 0.52,
      rotY: nextRand() * Math.PI * 2,
      pine: nextRand() > 0.55,
    });
  }
  sceneryGroup.add(buildOutdoorParkForestInstanced(outdoorTrees));

  // 11. Illuminated Walkway Bollards & Boulevard Streetlight Masts (Instanced for zero draw-call bloat)
  const bollardCoords = [];
  for (const z of [-12, -8, -4, 0, 4, 8, 12, 16]) {
    bollardCoords.push([-1.72, z], [1.72, z]);
  }
  for (const x of [-14, -10, -6, 6, 10, 14]) {
    bollardCoords.push([x, 16.9], [x, 21.4]);
  }
  const bollardPostGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.72, 8);
  bollardPostGeo.translate(0, 0.36, 0);
  const bollardCapGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.14, 8);
  bollardCapGeo.translate(0, 0.76, 0);
  const bollardPosts = new THREE.InstancedMesh(bollardPostGeo, darkTrimMat, bollardCoords.length);
  const bollardCaps = new THREE.InstancedMesh(
    bollardCapGeo,
    new THREE.MeshStandardMaterial({
      color: 0xe8c987,
      emissive: 0xe8c987,
      emissiveIntensity: 1.25,
      roughness: 0.2,
    }),
    bollardCoords.length,
  );
  const dummy = new THREE.Object3D();
  bollardCoords.forEach(([bx, bz], idx) => {
    dummy.position.set(bx, 0.02, bz);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    bollardPosts.setMatrixAt(idx, dummy.matrix);
    bollardCaps.setMatrixAt(idx, dummy.matrix);
  });
  bollardPosts.instanceMatrix.needsUpdate = true;
  bollardCaps.instanceMatrix.needsUpdate = true;
  bollardPosts.computeBoundingSphere();
  bollardCaps.computeBoundingSphere();
  sceneryGroup.add(bollardPosts, bollardCaps);

  // Streetlight Masts along Boulevard & Feeder Roads
  const poleGeo = new THREE.CylinderGeometry(0.08, 0.12, 5.2, 8);
  const armGeo = new THREE.BoxGeometry(1.1, 0.08, 0.12);
  const lampGeo = new THREE.BoxGeometry(0.48, 0.08, 0.24);
  const lampGlowMat = new THREE.MeshStandardMaterial({
    color: 0xfff3d6,
    emissive: 0xe8c987,
    emissiveIntensity: 1.4,
  });
  const lightPositions = [
    [-16, 21.8, 0],
    [-7.5, 21.8, 0],
    [7.5, 21.8, 0],
    [16, 21.8, 0],
    [-25.8, -10, Math.PI / 2],
    [-25.8, 6, Math.PI / 2],
    [25.8, -10, -Math.PI / 2],
    [25.8, 6, -Math.PI / 2],
  ];
  for (const [lx, lz, rotY] of lightPositions) {
    const mast = new THREE.Group();
    mast.position.set(lx, 0, lz);
    mast.rotation.y = rotY;
    const pole = new THREE.Mesh(poleGeo, steelMat);
    pole.position.y = 2.6;
    pole.castShadow = true;
    const arm = new THREE.Mesh(armGeo, steelMat);
    arm.position.set(0, 5.15, 0.45);
    arm.rotation.y = Math.PI / 2;
    const head = new THREE.Mesh(lampGeo, lampGlowMat);
    head.position.set(0, 5.08, 0.88);
    mast.add(pole, arm, head);
    sceneryGroup.add(mast);
  }

  // Outdoor Courtyard Benches flanking center entrance walkway
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x7c5338, roughness: 0.72 });
  for (const bx of [-4.2, 4.2]) {
    for (const bz of [17.4, 20.4]) {
      const bench = new THREE.Group();
      bench.position.set(bx, 0.04, bz);
      const seat = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.09, 0.56), woodMat);
      seat.position.y = 0.44;
      seat.castShadow = true;
      const legL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.42, 0.5), steelMat);
      legL.position.set(-0.75, 0.21, 0);
      const legR = legL.clone();
      legR.position.x = 0.75;
      bench.add(seat, legL, legR);
      sceneryGroup.add(bench);
    }
  }

  // 12. Four Patrolling Aerial Camera Drones high above the hall
  const drones = [];
  const droneSpecs = [
    { cx: -7, cz: -4, rx: 6, rz: 9, y: 9.2, speed: 0.42, phase: 0 },
    { cx: 7, cz: 3, rx: 6.5, rz: 8.5, y: 9.8, speed: 0.36, phase: 1.8 },
    { cx: 0, cz: 13, rx: 9, rz: 4.5, y: 8.6, speed: 0.38, phase: 3.4 },
    { cx: 0, cz: -10, rx: 8, rz: 3.8, y: 9.4, speed: 0.45, phase: 4.9 },
  ];
  for (const ds of droneSpecs) {
    const dGroup = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 1), darkTrimMat);
    hull.scale.set(1.3, 0.55, 1.3);
    const camEye = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 10, 10),
      new THREE.MeshStandardMaterial({
        color: 0xe8c987,
        emissive: 0xe8c987,
        emissiveIntensity: 1.5,
      }),
    );
    camEye.position.y = -0.13;
    dGroup.add(hull, camEye);

    const rotors = [];
    const armAngles = [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75];
    for (const ang of armAngles) {
      const rx = Math.cos(ang) * 0.36;
      const rz = Math.sin(ang) * 0.36;
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.03, 0.04), steelMat);
      arm.position.set(rx * 0.5, 0.04, rz * 0.5);
      arm.rotation.y = -ang;
      dGroup.add(arm);

      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.015, 0.045),
        new THREE.MeshStandardMaterial({ color: 0xf3dcaa, roughness: 0.3, metalness: 0.7 }),
      );
      blade.position.set(rx, 0.08, rz);
      dGroup.add(blade);
      rotors.push(blade);
    }
    sceneryGroup.add(dGroup);
    drones.push({
      group: dGroup,
      rotors,
      centerX: ds.cx,
      centerZ: ds.cz,
      radiusX: ds.rx,
      radiusZ: ds.rz,
      baseY: ds.y,
      speed: ds.speed,
      phase: ds.phase,
    });
  }

  return {
    sceneryGroup,
    turntableCars,
    movingVehicles,
    drones,
    terrainMat,
    plazaMat,
    terrainTexNight,
    terrainTexDay,
    plazaTexNight,
    plazaTexDay,
    roadTex,
    waterMats,
  };
}
