/* Vehicles use metres on one ground plane. The camera is registered to the depot image. */
function createDepot(canvas) {
  const T = window.THREE;
  if (!T) return null;
  let renderer;
  try {
    renderer = new T.WebGLRenderer({canvas, alpha:true, antialias:true});
  } catch {
    return null;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.6));
  renderer.setClearColor(0, 0);
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;

  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(48, 1, .25, 155);
  camera.position.y = 1.65;
  scene.add(new T.HemisphereLight(0xa7bed7, 0x272320, 2.15));
  const key = new T.DirectionalLight(0xffc68d, 3);
  key.position.set(9, 11, -15);
  scene.add(key);
  const fill = new T.DirectionalLight(0x9ab5d1, .65);
  fill.position.set(-10, 6, 7);
  scene.add(fill);

  const paint = (color, roughness = .54, metalness = .13) =>
    new T.MeshStandardMaterial({color, roughness, metalness});
  const rubber = paint(0x18191a, .96, 0);
  const dark = paint(0x192026, .72, .06);
  const glass = paint(0x15242c, .23, .34);
  const alloy = paint(0x6a6e72, .45, .62);
  const trim = paint(0x333c42, .52, .28);

  function box(parent, material, x, y, z, w, h, d) {
    const mesh = new T.Mesh(new T.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }

  // Near the doorway, the building conceals vehicles that have turned behind its jambs.
  const occluder = new T.MeshBasicMaterial({colorWrite:false});
  for (const side of [-1, 1]) {
    const jamb = box(scene, occluder, side * 23.25, 4.5, -17.5, 38, 9, .1);
    jamb.renderOrder = -3;
  }

  const shadowImage = document.createElement('canvas');
  shadowImage.width = shadowImage.height = 64;
  const ink = shadowImage.getContext('2d');
  const falloff = ink.createRadialGradient(32, 32, 2, 32, 32, 32);
  falloff.addColorStop(0, 'rgba(0,0,0,.88)');
  falloff.addColorStop(.55, 'rgba(0,0,0,.65)');
  falloff.addColorStop(1, 'rgba(0,0,0,0)');
  ink.fillStyle = falloff;
  ink.fillRect(0, 0, 64, 64);
  const footprint = new T.MeshBasicMaterial({map:new T.CanvasTexture(shadowImage), transparent:true, depthWrite:false, polygonOffset:true, polygonOffsetFactor:-2});

  function makeWheel(parent, x, z, steered) {
    const radius = .50;
    const axle = new T.Group();
    axle.position.set(x, radius, z);
    parent.add(axle);
    const drum = new T.Group();
    axle.add(drum);
    const tyre = new T.Mesh(new T.CylinderGeometry(radius, radius, .30, 28), rubber);
    tyre.rotation.z = Math.PI / 2;
    drum.add(tyre);
    const hub = new T.Mesh(new T.CylinderGeometry(.30, .30, .324, 24), alloy);
    hub.rotation.z = Math.PI / 2;
    drum.add(hub);
    const side = Math.sign(x);
    for (let i = 0; i < 5; i++) {
      const angle = i * Math.PI * 2 / 5;
      const nut = new T.Mesh(new T.SphereGeometry(.043, 8, 6), dark);
      nut.position.set(side * .169, Math.sin(angle) * .19, Math.cos(angle) * .19);
      drum.add(nut);
    }
    const valve = new T.Mesh(new T.SphereGeometry(.023, 6, 5), trim);
    valve.position.set(side * .176, -.25, 0);
    drum.add(valve);
    return {axle, drum, steered, radius};
  }

  function vehicle(type, color) {
    const root = new T.Group();
    scene.add(root);
    const coach = type === 'coach', cargo = type === 'box';
    const length = coach ? 11.8 : cargo ? 8.35 : 6.5;
    const front = length / 2, back = -front;
    const body = paint(color);
    const wheels = [];
    for (const side of [-1, 1]) {
      wheels.push(makeWheel(root, side * 1.02, front - 1.8, true));
      wheels.push(makeWheel(root, side * 1.02, back + 1.72, false));
      if (!coach) wheels.push(makeWheel(root, side * 1.02, back + 2.78, false));
    }
    const shadow = new T.Mesh(new T.PlaneGeometry(3.65, length + 1.11), footprint);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = .012;
    shadow.renderOrder = -1;
    root.add(shadow);
    box(root, dark, 0, .64, 0, 1.54, .31, length - .3);
    const faceY = coach ? .91 : 1.04;
    if (coach) {
      box(root, body, 0, 1.42, 0, 2.52, 1.43, length);
      box(root, trim, 0, 2.67, -.08, 2.49, 1.08, length - .16);
      box(root, body, 0, 3.31, -.06, 2.45, .26, length - .19);
      box(root, glass, 0, 2.69, front - .059, 2.29, .91, .045);
      for (const side of [-1, 1]) {
        for (let bay = 0; bay < 6; bay++) {
          box(root, glass, side * 1.251, 2.68, back + 1.15 + bay * 1.83, .037, .88, 1.66);
          box(root, trim, side * 1.264, 1.39, back + 1.15 + bay * 1.83, .022, .021, 1.70);
        }
      }
    } else {
      box(root, body, 0, 1.72, front - 1.26, 2.51, 1.88, 2.54);
      box(root, glass, 0, 2.61, front + .017, 2.24, .62, .04);
      box(root, body, 0, 3.01, front - 1.16, 2.47, .28, 2.38);
      for (const side of [-1, 1]) {
        box(root, glass, side * 1.26, 2.48, front - .83, .04, .59, 1.32);
        box(root, trim, side * 1.38, 2.31, front - .01, .25, .27, .14);
      }
      if (cargo) {
        box(root, body, 0, 2.12, back + 2.83, 2.49, 2.57, 5.62);
        box(root, trim, 0, 2.12, back -.01, 2.43, 2.47, .06);
        for (const x of [-.88, -.034, .034, .88]) box(root, alloy, x, 2.1, back - .05, .028, 2.36, .035);
        box(root, alloy, 0, .72, back - .035, 2.64, .11, .13);
      } else {
        box(root, dark, 0, .98, back + 1.7, 2.24, .16, 2.98);
        box(root, alloy, 0, 1.08, back + 2.16, .8, .1, .61);
      }
    }
    box(root, dark, 0, .85, front + .04, 2.53, .22, .15);
    for (let slot = 0; slot < 4; slot++) {
      box(root, dark, 0, faceY + .29 + slot * .12, front + .035, coach ? 1.11 : 1.66, .074, .046);
    }

    function fitting(x, y, z, tint, w, h) {
      box(root, dark, x, y, z, w + .08, h + .055, .065);
      const lens = new T.MeshBasicMaterial({color:tint});
      box(root, lens, x, y, z, w, h, .079);
      return lens;
    }
    const head = [], tail = [], turn = {};
    for (const side of [-1, 1]) {
      head.push(fitting(side * .85, faceY+.14, front+.058, 0xc7cfcc, .35, .14));
      tail.push(fitting(side * .86, .88, back-.058, 0x801d16, .30, .13));
      turn[side] = [
        fitting(side * 1.11, faceY+.15, front+.057, 0x64380b, .13, .13),
        fitting(side * 1.10, .89, back-.06, 0x64380b, .13, .13),
      ];
    }
    return {root, wheels, head, tail, turn, front, faceY};
  }

  const coach = vehicle('coach', 0x72777a);
  const tractor = vehicle('tractor', 0x39424a);
  const boxTruck = vehicle('box', 0x68696a);
  const vector = (x, z) => new T.Vector3(x, 0, z);
  const path = (...points) => new T.CubicBezierCurve3(...points.map(([x,z]) => vector(x,z)));

  const inbound = path([-2.8,-34],[-2.8,-23],[-3.1,-12.4],[-6.7,-9.3]);
  const parkClear = path([-6.7,-9.3],[-9.6,-6.8],[-14,-5],[-23,-4]);
  const near = path([.55,-31],[.55,-22],[2.5,-14.2],[3.45,-7.9]);
  const nearClear = path([3.45,-7.9],[4,-4.2],[6.1,-3.4],[9.5,-2.6]);
  const outbound = path([-1.15,.7],[-1.05,-8],[-.85,-16.2],[-.45,-25.2]);
  const beyondDoor = path([-.45,-25.2],[.1,-37.5],[11,-34.6],[26,-35]);

  const clamp = n => Math.max(0, Math.min(1,n));
  function travel(model, route, t, carry, direction, indicator, flash) {
    const progress = clamp(t);
    const eased = progress * progress * (3 - 2 * progress);
    const point = route.getPointAt(eased);
    const tangent = route.getTangentAt(eased);
    model.root.position.copy(point);
    model.flash = flash;
    const yaw = Math.atan2(tangent.x, tangent.z);
    model.root.rotation.y = yaw;
    const later = route.getTangentAt(Math.min(1, eased + .03));
    const yawDelta = Math.atan2(later.x, later.z) - yaw;
    const turn = Math.atan2(Math.sin(yawDelta), Math.cos(yawDelta));
    const distance = carry + eased * route.getLength();
    for (const wheel of model.wheels) {
      wheel.drum.rotation.x = distance / wheel.radius;
      wheel.axle.rotation.y = wheel.steered ? Math.max(-.32, Math.min(.32, turn * 2.8)) : 0;
    }
    model.head.forEach(lens => lens.color.set(flash ? 0xfff3cf : 0xd3d8d0));
    model.tail.forEach(lens => lens.color.set(progress > .89 ? 0xd93a26 : 0x7a2319));
    Object.entries(model.turn).forEach(([side, lenses]) =>
      lenses.forEach(lens => lens.color.set(indicator && +side === direction ? 0xffab31 : 0x64380b)));
  }

  function resize({left,top,iw,ih}, width, height) {
    screenWidth = width; screenHeight = height;
    renderer.setSize(width, height, false);
    const cx = left + .597 * iw, cy = top + .64 * ih;
    const focal = ih * .69;
    camera.updateProjectionMatrix();
    const matrix = camera.projectionMatrix.elements;
    matrix[0] = 2 * focal / width;
    matrix[5] = 2 * focal / height;
    matrix[8] = 1 - 2 * cx / width;
    matrix[9] = 2 * cy / height - 1;
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  }

  let screenWidth, screenHeight;
  function draw(time) {
    const blinking = time % .89 < .36;
    coach.root.visible = time >= 2.5 && time < 50;
    tractor.root.visible = time >= 14 && time < 38;
    boxTruck.root.visible = time >= 26 && time < 51;
    if (coach.root.visible) {
      if (time < 42) travel(coach, inbound, (time-2.5)/13.5, 0, -1, blinking && time > 5 && time < 15.6, time > 4.5 && time < 5);
      else travel(coach, parkClear, (time-42)/8, inbound.getLength(), -1, blinking, false);
    }
    if (tractor.root.visible) {
      if (time < 32) travel(tractor, near, (time-14)/14, 0, 1, blinking && time < 23, time > 16 && time < 16.5);
      else travel(tractor, nearClear, (time-32)/6, near.getLength(), 1, blinking, false);
    }
    if (boxTruck.root.visible) {
      if (time < 42) travel(boxTruck, outbound, (time-26)/16, 0, 1, blinking && time > 37, false);
      else travel(boxTruck, beyondDoor, (time-42)/9, outbound.getLength(), 1, blinking, false);
    }
    renderer.render(scene, camera);
    const beams = [];
    for (const model of [coach, tractor]) {
      if (!model.root.visible || Math.abs(model.root.rotation.y) > .95) continue;
      for (const side of [-1, 1]) {
        const lamp = model.root.localToWorld(new T.Vector3(side * .85, model.faceY+.14, model.front+.105));
        if (lamp.z >= -.65 || (lamp.z < -17.5 && Math.abs(lamp.x * 17.5 / lamp.z) > 4.25)) continue;
        const distance = -lamp.z;
        lamp.project(camera);
        beams.push({x:(lamp.x + 1) * screenWidth / 2, y:(1-lamp.y) * screenHeight / 2,
                    reach: Math.min(135, screenHeight * 1.13 / distance), flash:model.flash,
                    drift: Math.sin(model.root.rotation.y) * 30});
      }
    }
    return beams;
  }

  return {resize, draw, clear:() => renderer.clear()};
}
