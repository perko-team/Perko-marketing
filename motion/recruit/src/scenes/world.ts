// WORLD (0-12 s): one continuous camera through a paper world.
// A punch card floats above a paper model of the neighbourhood. The punch cuts the eighth stamp out on the second
// beat; the camera follows the paper chip down through the hole to the street. The chip lands on the drop and
// becomes a stamp; a lime ring spreads from it down the street, and every blank shop-sign disc it reaches lights
// up: an open place. The camera cranes up, the street folds flat on its hinges, the lit discs fly into one Perko
// card, and the camera pushes into its open slot. Nothing here names or shows a real business.
import * as THREE from 'three';
import { Scene, type Frame } from '../engine/scene';
import { Layer2D } from '../engine/gl';
import { Stage3D, castShadows, ground, paper, matte } from '../engine/stage3d';
import { customLook } from '../engine/looks';
import { font } from '../engine/type';
import { ease, keys, lerp, mulberry32, prog, rgba, hexToLinear, type Key } from '../engine/util';
import { brand } from '../brand';

const C = brand.colors;
const CARD = { y: 12, cz: -6, w: 3.6, h: 6 };
const HOLE = { x: 0, sy: -1.95, r: 0.27 };
const holeZ = CARD.cz - HOLE.sy;
const TP = 0.5; // the punch, on the paper clack
const LAND = 4.0; // the chip lands on the drop
const LANDZ = -9.5;
const WAVE_SPEED = 9; // world units per second
const N_LIT = 8;
const PUSH = 11.3; // the push into the open slot, then the end card at 12.0

/** The card's print: paper fibres, a small header, ten stamp circles (seven stamped), the upper half blank. */
function cardTexture() {
  const PW = 720, PH = 1200, cv = document.createElement('canvas');
  cv.width = PW; cv.height = PH;
  const c = cv.getContext('2d')!;
  c.fillStyle = '#F4F1E6'; c.fillRect(0, 0, PW, PH);
  const rnd = mulberry32(31);
  for (let i = 0; i < 3000; i++) {
    const x = rnd() * PW, y = rnd() * PH, l = 3 + rnd() * 12, a = rnd() * Math.PI;
    c.strokeStyle = rnd() > 0.5 ? 'rgba(255,255,255,0.18)' : 'rgba(80,70,50,0.07)';
    c.lineWidth = 0.7; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke();
  }
  const px = (x: number) => ((x + CARD.w / 2) / CARD.w) * PW, py = (y: number) => ((CARD.h / 2 - y) / CARD.h) * PH;
  c.direction = 'rtl'; c.textAlign = 'right'; c.fillStyle = C.ink;
  c.font = font(brand.fonts.display, 52, 800); c.fillText('בית הקפה', px(1.35), py(2.55));
  c.font = font(brand.fonts.mono, 24, 500); c.fillText('כרטיס ניקוב · 10 חותמות = קפה', px(1.35), py(2.25));
  c.font = font(brand.fonts.mono, 22, 500); c.fillText('כרטיס לדוגמה', px(1.35), py(-2.7));
  const R = (HOLE.r / CARD.w) * PW;
  [-1.05, -1.95].forEach((y, row) => [1.4, 0.7, 0, -0.7, -1.4].forEach((x, col) => {
    const stamped = row * 5 + col < 7;
    c.beginPath(); c.arc(px(x), py(y), R, 0, Math.PI * 2);
    if (stamped) { c.fillStyle = C.ink; c.globalAlpha = 0.92; c.fill(); c.globalAlpha = 1; }
    else { c.strokeStyle = C.ink; c.lineWidth = 5; c.stroke(); }
  }));
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  tex.repeat.set(1 / CARD.w, 1 / CARD.h); tex.offset.set(0.5, 0.5);
  return tex;
}

/** Upper-floor windows for a facade: ink panes with paper frames, drawn once and shared. */
function windowsTexture() {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 256;
  const c = cv.getContext('2d')!;
  c.clearRect(0, 0, 256, 256);
  for (let r = 0; r < 2; r++) for (let k = 0; k < 3; k++) {
    c.fillStyle = 'rgba(17,19,15,0.88)'; c.fillRect(20 + k * 80, 26 + r * 120, 56, 80);
    c.strokeStyle = 'rgba(248,248,244,0.9)'; c.lineWidth = 4; c.strokeRect(20 + k * 80, 26 + r * 120, 56, 80);
  }
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** The signature surface: a lime light that runs around a ring and kicks on every beat (rims only). */
function litRimLook() {
  const [r, g, b] = hexToLinear(C.accent);
  return customLook(/* glsl */ `
    float run = 0.5 + 0.5 * sin(atan(P.y - uC.y, P.x - uC.x) * 3.0 - uTime * 7.0 + uSeed);
    float kick = exp(-fract(uBeat) * 5.0);
    col = uAccent * (1.2 + 0.8 * run + 0.6 * kick) * uLit;
    alpha = uLit;`,
  { uAccent: { value: new THREE.Vector3(r, g, b) }, uLit: { value: 0 }, uC: { value: new THREE.Vector3() }, uSeed: { value: 0 } },
  { transparent: true, depthWrite: false });
}

type Shop = {
  pivot: THREE.Group; side: number; z: number; home: THREE.Vector3; sign: THREE.Group; face: THREE.Mesh; faceMat: THREE.MeshStandardMaterial;
  rim: THREE.Mesh; rimMat: THREE.ShaderMaterial; order: number; dist: number;
};

export default class World extends Scene {
  stage = new Stage3D(38).fog(C.bg, 26, 95);
  text = new Layer2D();
  shops: Shop[] = [];
  chip!: THREE.Group;
  chipFace!: THREE.MeshStandardMaterial;
  tool!: THREE.Group;
  wave!: THREE.Mesh;
  holeGlow!: THREE.Mesh;
  punchCard!: THREE.Mesh;
  card!: THREE.Group;
  slots: THREE.Vector3[] = [];
  openRims: THREE.Mesh[] = [];

  init() {
    const s = this.stage.scene, rnd = mulberry32(5);
    this.stage.light('studio', { extent: 34, target: [0, 0, -22] });
    s.add(ground(paper(C.bg, { repeat: 10, grain: 0.6 })));
    const road = new THREE.Mesh(new THREE.PlaneGeometry(5, 120), paper('#24271F', { repeat: 6, grain: 0.5 }));
    road.rotation.x = -Math.PI / 2; road.position.set(0, 0.01, -50); road.receiveShadow = true; s.add(road);
    const dashM = paper(C.bg, { grain: 0.3 });
    for (let i = 0; i < 26; i++) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 1.4), dashM);
      dash.rotation.x = -Math.PI / 2; dash.position.set(0, 0.02, 1 - i * 4); dash.receiveShadow = true; s.add(dash);
    }

    // the street: card-stock shops in the brand's three roles, each with a sign band, upper windows, an awning,
    // a door and a blank stamp disc hanging from a bracket like a shop sign
    const tones = [C.bg, C.accent, '#2A2D25', '#E9EADF', C.accent2].map((h) => paper(h, { grain: 0.7 }));
    const awningM = [matte(C.ink, 0.7), matte(C.accent, 0.7), matte(C.bg, 0.8)];
    const doorM = matte(C.ink, 0.9), winM = matte('#D8DACE', 0.95), inkM = matte(C.ink, 0.6), bandM = matte('#1A1C17', 0.8);
    const upperM = new THREE.MeshBasicMaterial({ map: windowsTexture(), transparent: true });
    const lit: Shop[] = [];
    for (const side of [1, -1]) {
      let z = -2.5;
      for (let i = 0; i < 12; i++) {
        const w = 3.3 + rnd() * 0.9, d = 3.2 + rnd() * 1.2, h = i < 2 ? 3.0 + rnd() * 0.5 : 3.6 + rnd() * 2.8; // the nearest shops stay low: the sky above them carries the headline
        const face = side * 3.1, zc = z - w / 2;
        // a hinge at the facade's foot: the shop folds flat outwards like a pop-up page
        const pivot = new THREE.Group(); pivot.position.set(face, 0, zc);
        const shop = new THREE.Group(); shop.position.set(-face, 0, 0); pivot.add(shop);
        const isLit = i >= 2 && i < 2 + N_LIT / 2;
        const tone = isLit ? (i % 2 ? 2 : 0) : [1, 3, 4, 2, 1][(i + (side > 0 ? 0 : 2)) % 5]!;
        const box = new THREE.Mesh(new THREE.BoxGeometry(d, h, w), tones[tone]!);
        box.position.set(face + side * d / 2, h / 2, 0); shop.add(box);
        const rotY = -side * Math.PI / 2, fx = face - side * 0.006;
        const plane = (gw: number, gh: number, m: THREE.Material, x: number, y: number, zz: number) => {
          const p = new THREE.Mesh(new THREE.PlaneGeometry(gw, gh), m); p.position.set(x, y, zz); p.rotation.y = rotY; shop.add(p); return p;
        };
        plane(0.95, 1.75, doorM, fx, 0.875, 0.65);
        plane(1.5, 1.2, winM, fx, 1.25, -0.85);
        plane(w - 0.3, 0.42, bandM, fx - side * 0.002, 2.35, 0); // the sign band, blank on purpose
        if (h > 3.9) plane(w - 0.6, Math.min(2.2, h - 3.0), upperM, fx - side * 0.003, 2.75 + Math.min(2.2, h - 3.0) / 2, 0);
        const awning = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.06, 2.6), awningM[(i + (side > 0 ? 1 : 0)) % 3]!);
        awning.position.set(face - side * 0.27, 1.95, -0.1); awning.rotation.z = side * 0.18; shop.add(awning);
        const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.04, 0.04), inkM);
        bracket.position.set(face - side * 0.33, 3.05, 0.65); shop.add(bracket);
        castShadows(box); castShadows(awning);
        s.add(pivot);
        // the sign: a blank paper disc with an ink edge, in world space so it can leave when the street folds
        const sign = new THREE.Group();
        const faceMat = new THREE.MeshStandardMaterial({ color: '#F4F1E6', roughness: 0.85, side: THREE.DoubleSide });
        const disc = new THREE.Mesh(new THREE.CircleGeometry(0.36, 48), faceMat);
        const edge = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.03, 8, 48), inkM);
        const rimMat = litRimLook(); rimMat.uniforms.uSeed!.value = i * 1.7 + side;
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.025, 8, 64), rimMat);
        sign.add(disc, edge, rim);
        sign.position.set(face - side * 0.66, 2.65, zc + 0.65);
        s.add(sign);
        const sh: Shop = { pivot, side, z: zc, home: sign.position.clone(), sign, face: disc, faceMat, rim, rimMat, order: -1, dist: 0 };
        sh.dist = Math.hypot(sign.position.x - HOLE.x, sign.position.z - LANDZ);
        this.shops.push(sh);
        if (isLit) lit.push(sh);
        z -= w + 0.15;
      }
    }
    lit.sort((a, b) => a.dist - b.dist).forEach((sh, k) => { sh.order = k; });

    // the punch card, floating above the street, with one real hole
    const shape = new THREE.Shape();
    const hw = CARD.w / 2, hh = CARD.h / 2, rr = 0.18;
    shape.moveTo(-hw + rr, -hh); shape.lineTo(hw - rr, -hh); shape.quadraticCurveTo(hw, -hh, hw, -hh + rr);
    shape.lineTo(hw, hh - rr); shape.quadraticCurveTo(hw, hh, hw - rr, hh); shape.lineTo(-hw + rr, hh);
    shape.quadraticCurveTo(-hw, hh, -hw, hh - rr); shape.lineTo(-hw, -hh + rr); shape.quadraticCurveTo(-hw, -hh, -hw + rr, -hh);
    const hole = new THREE.Path(); hole.absarc(HOLE.x, HOLE.sy, HOLE.r, 0, Math.PI * 2, true); shape.holes.push(hole);
    this.punchCard = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.025, bevelEnabled: false, curveSegments: 48 }),
      new THREE.MeshStandardMaterial({ map: cardTexture(), roughness: 0.9 }));
    this.punchCard.rotation.x = -Math.PI / 2; this.punchCard.position.set(0, CARD.y, CARD.cz); s.add(this.punchCard);
    // the chip: the punched-out stamp circle (paper, an ink edge). It turns lime when it lands: stamped.
    this.chip = new THREE.Group();
    this.chipFace = new THREE.MeshStandardMaterial({ color: '#F4F1E6', roughness: 0.85 });
    const chipBody = new THREE.Mesh(new THREE.CylinderGeometry(HOLE.r, HOLE.r, 0.025, 48), this.chipFace);
    const chipRing = new THREE.Mesh(new THREE.TorusGeometry(HOLE.r * 0.92, 0.014, 8, 48), matte(C.ink));
    chipRing.rotation.x = -Math.PI / 2; chipRing.position.y = 0.014;
    this.chip.add(chipBody, chipRing); castShadows(this.chip); s.add(this.chip);
    // the punch: an ink pin under a heavier body with a lime band
    this.tool = new THREE.Group();
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(HOLE.r * 0.97, HOLE.r * 0.97, 0.7, 48), matte(C.ink, 0.45)); pin.position.y = 0.35;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.7, 1.6, 64), matte('#1A1C17', 0.5)); body.position.y = 1.5;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.705, 0.705, 0.16, 64), matte(C.accent, 0.6)); band.position.y = 0.95;
    this.tool.add(pin, body, band); castShadows(this.tool); s.add(this.tool);
    this.holeGlow = new THREE.Mesh(new THREE.TorusGeometry(HOLE.r, 0.016, 8, 64), new THREE.MeshBasicMaterial({ color: new THREE.Color(...hexToLinear(C.accent)).multiplyScalar(2.4) }));
    this.holeGlow.rotation.x = -Math.PI / 2; this.holeGlow.position.set(HOLE.x, CARD.y + 0.03, holeZ); s.add(this.holeGlow);
    // the wave: a lime ring on the road spreading from the landed chip
    this.wave = new THREE.Mesh(new THREE.RingGeometry(0.85, 1.0, 128), new THREE.MeshBasicMaterial({ color: new THREE.Color(...hexToLinear(C.accent)).multiplyScalar(1.8), transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    this.wave.rotation.x = -Math.PI / 2; s.add(this.wave);

    // the Perko card the lit discs fly into: the headline is printed on its upper half
    this.card = new THREE.Group();
    const cw = 7.2, ch = 6.6;
    const cs = new THREE.Shape();
    cs.moveTo(-cw / 2 + 0.4, -ch / 2); cs.lineTo(cw / 2 - 0.4, -ch / 2); cs.quadraticCurveTo(cw / 2, -ch / 2, cw / 2, -ch / 2 + 0.4);
    cs.lineTo(cw / 2, ch / 2 - 0.4); cs.quadraticCurveTo(cw / 2, ch / 2, cw / 2 - 0.4, ch / 2); cs.lineTo(-cw / 2 + 0.4, ch / 2);
    cs.quadraticCurveTo(-cw / 2, ch / 2, -cw / 2, ch / 2 - 0.4); cs.lineTo(-cw / 2, -ch / 2 + 0.4); cs.quadraticCurveTo(-cw / 2, -ch / 2, -cw / 2 + 0.4, -ch / 2);
    const inkCard = new THREE.Mesh(new THREE.ExtrudeGeometry(cs, { depth: 0.12, bevelEnabled: false }), new THREE.MeshStandardMaterial({ color: C.ink, roughness: 0.55 }));
    inkCard.rotation.x = -Math.PI / 2; castShadows(inkCard); this.card.add(inkCard);
    for (let r = 0; r < 2; r++) for (let k = 0; k < 5; k++) {
      const x = 2.6 - k * 1.3, z = 0.75 + r * 1.3 + 0.35; // right to left, the way Hebrew reads
      const slot = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.03, 8, 48), matte('#4A4F43'));
      slot.rotation.x = -Math.PI / 2; slot.position.set(x, 0.14, z); this.card.add(slot);
      this.slots.push(new THREE.Vector3(x, 0.16, z));
      if (r * 5 + k >= N_LIT) {
        // the open slots: a lime rim that breathes, the place "for your business"
        const m = litRimLook(); const open = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.035, 8, 64), m);
        open.rotation.x = -Math.PI / 2; open.position.set(x, 0.15, z); this.card.add(open); this.openRims.push(open);
      }
    }
    this.card.position.set(0, 0.02, -20); s.add(this.card);
  }

  /** Camera: three-quarter over the card, down to the hole, follow the chip, settle on its landing, crane up, push in. */
  camera(t: number) {
    const k: Record<'x' | 'y' | 'z' | 'tx' | 'ty' | 'tz' | 'up', Key[]> = {
      x: [[0, 1.3], [0.5, 1.1], [1.75, HOLE.x, ease.inOutCubic], [11.3, 0], [12, -1.95, ease.inExpo]],
      y: [[0, CARD.y + 3.6], [0.5, CARD.y + 3.3], [1.75, CARD.y + 1.1, ease.inOutCubic], [2.25, 10.6, ease.inExpo], [3.4, 5.6, ease.inOutQuad],
          [4.0, 3.0, ease.outCubic], [5.6, 2.6], [7.4, 12, ease.inOutCubic], [8.6, 22.5, ease.inOutCubic], [11.3, 21.6, ease.inOutCubic], [12, 3, ease.inExpo]],
      z: [[0, holeZ + 3.9], [0.5, holeZ + 3.5], [1.75, holeZ, ease.inOutCubic], [2.25, -6.6, ease.inOutQuad], [3.4, -8.0, ease.inOutQuad],
          [4.0, -2.6, ease.outCubic], [5.6, -6, ease.inOutQuad], [7.4, -1.5, ease.inOutCubic], [8.6, -18.2, ease.inOutCubic], [11.3, -18.6], [12, -17.6, ease.inExpo]],
      tx: [[0, 0.1], [0.5, 0.1], [1.75, HOLE.x, ease.inOutCubic], [11.3, 0], [12, -1.95, ease.inExpo]],
      ty: [[0, CARD.y], [1.75, CARD.y, ease.inOutCubic], [2.25, 9.0, ease.inOutQuad], [3.4, 3.8, ease.inOutQuad], [4.0, 0.4, ease.outCubic],
           [5.6, 1.2, ease.inOutQuad], [7.4, 0.6, ease.inOutCubic], [8.6, 0, ease.inOutCubic]],
      tz: [[0, holeZ - 1.4], [0.5, holeZ - 1.2], [1.75, holeZ - 0.001, ease.inOutCubic], [2.25, -6.9, ease.inOutQuad], [3.4, -9.3, ease.inOutQuad],
           [4.0, -12.5, ease.outCubic], [5.6, -30, ease.inOutQuad], [7.4, -24, ease.inOutCubic], [8.6, -20.2, ease.inOutCubic], [11.3, -20.6], [12, -17.62, ease.inExpo]],
      up: [[0, 1], [0.6, 1], [1.6, 0, ease.inOutCubic], [3.2, 0], [4.0, 1, ease.inOutCubic], [7.4, 1], [8.6, 0, ease.inOutCubic]],
    };
    const v = (a: keyof typeof k) => keys(t, k[a]);
    const cam = this.stage.camera, u = v('up');
    cam.position.set(v('x'), v('y'), v('z'));
    cam.up.set(0, u, -(1 - u)).normalize();
    cam.lookAt(v('tx'), v('ty'), v('tz'));
  }

  render(f: Frame, out: THREE.WebGLRenderTarget) {
    const { renderer, comp, SAFE } = this.ctx;
    const t = f.t;
    this.camera(t);
    this.punchCard.visible = t < 3.0;

    // the punch comes down into the beat, cuts the eighth stamp out, and lifts away
    const down = prog(t, 0, TP, ease.inCubic), up = prog(t, TP + 0.1, TP + 0.55, ease.outExpo);
    this.tool.position.set(HOLE.x, CARD.y + 0.03 + 2.6 * (1 - down) + 6 * up, holeZ);
    this.tool.visible = up < 1;
    const g = prog(t, TP, TP + 0.12, ease.outCubic);
    this.holeGlow.scale.setScalar(Math.max(0.001, g));
    this.holeGlow.visible = t < 3.0;
    (this.holeGlow.material as THREE.MeshBasicMaterial).color.setRGB(...(hexToLinear(C.accent).map((c) => c * (2.4 + 3 * Math.exp(-Math.max(0, t - TP) * 6))) as [number, number, number]));

    // the chip falls like paper and lands on the drop; on impact it becomes a stamp (lime)
    const fall = prog(t, TP, LAND);
    const flutter = Math.sin((t - TP) * 7) * (1 - fall) * 0.25;
    this.chip.position.set(HOLE.x + flutter, t < TP ? CARD.y + 0.0125 : CARD.y - 0.0125 - (CARD.y - 0.05) * (fall * fall), t < TP ? holeZ : lerp(holeZ, LANDZ, ease.inOutCubic(fall)));
    this.chip.rotation.set(t < TP ? 0 : Math.sin((t - TP) * 5) * 0.7 * (1 - fall), (t - TP) * 1.2 * (1 - fall), t < TP ? 0 : Math.cos((t - TP) * 4) * 0.5 * (1 - fall));
    const stamped = prog(t, LAND, LAND + 0.12, ease.outCubic);
    this.chipFace.color.set('#F4F1E6').lerp(new THREE.Color(C.accent), stamped);
    this.chip.scale.setScalar(1 + 0.6 * stamped);

    // the wave spreads from the chip at a constant speed; each blank sign lights the moment it reaches it
    const radius = t >= LAND ? 0.3 + (t - LAND) * WAVE_SPEED : 0;
    this.wave.position.set(HOLE.x, 0.03, LANDZ);
    this.wave.scale.setScalar(Math.max(0.001, radius));
    (this.wave.material as THREE.MeshBasicMaterial).opacity = t >= LAND ? Math.max(0, 1 - (t - LAND) / 2.8) : 0;

    const cardIn = prog(t, 8.3, 8.9, ease.outExpo);
    this.card.scale.setScalar(Math.max(0.001, cardIn));
    const qa = new THREE.Quaternion(), qb = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
    for (const sh of this.shops) {
      const hitT = LAND + Math.max(0, sh.dist - 0.3) / WAVE_SPEED;
      const on = sh.order >= 0 ? prog(t, hitT, hitT + 0.16, ease.outExpo) : 0;
      sh.faceMat.color.set('#F4F1E6').lerp(new THREE.Color(C.accent), on);
      sh.rimMat.uniforms.uLit!.value = on;
      sh.rimMat.uniforms.uC!.value.copy(sh.sign.position);
      sh.rim.visible = on > 0.001;
      sh.sign.scale.setScalar(1 + 0.25 * on * Math.exp(-Math.max(0, t - hitT) * 5));
      // the street folds flat on its hinges, nearest first
      const fold = prog(t, 8.0 + Math.min(1, -sh.z / 50) * 0.6, 8.7 + Math.min(1, -sh.z / 50) * 0.6, ease.inOutCubic);
      sh.pivot.rotation.z = -sh.side * fold * (Math.PI / 2);
      if (sh.order < 0) {
        // unlit signs fold away with their shops
        sh.sign.visible = fold < 0.5;
        continue;
      }
      const fly = prog(t, 8.7 + sh.order * 0.09, 9.35 + sh.order * 0.09, ease.inOutCubic);
      const to = this.slots[sh.order]!.clone().multiplyScalar(Math.max(0.001, cardIn)).add(this.card.position);
      sh.sign.position.copy(sh.home).lerp(to, fly);
      sh.sign.position.y += Math.sin(fly * Math.PI) * 1.6;
      qa.identity();
      sh.sign.quaternion.copy(qa.slerp(qb, fly));
      sh.sign.scale.multiplyScalar(lerp(1, 1.1, fly));
    }
    for (const o of this.openRims) ((o.material as THREE.ShaderMaterial).uniforms.uLit!.value = prog(t, 9.4, 9.8, ease.outCubic));

    comp.draw(renderer, this.stage.render(renderer, f), out, { mode: 'replace', srgb: false });

    // type: in calm areas only (the blank card, the sky band, printed on the Perko card, the ink road)
    const c = this.text.clear(), cx = SAFE.x + SAFE.w / 2;
    c.direction = 'rtl'; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    const line = (s: string, px: number, w: number, y: number, t0: number, t1: number, color: string = C.ink, fam = brand.fonts.display) => {
      const kin = prog(t, t0, t0 + 0.22, ease.outExpo), kout = prog(t, t1 - 0.2, t1, ease.inCubic);
      if (kin <= 0 || kout >= 1) return;
      const a = Math.min(1, kin * 1.6) * (1 - kout), yy = y + (1 - kin) * 40 - kout * 30;
      c.font = font(fam, px, w);
      c.save(); c.shadowColor = rgba(C.bg, 0.9 * a); c.shadowBlur = px * 0.35; c.fillStyle = rgba(C.bg, 0.5 * a);
      c.fillText(s, cx, yy); c.fillText(s, cx, yy); c.restore(); // halo, blur only: never visible as a shape
      c.fillStyle = rgba(color, a); c.fillText(s, cx, yy);
    };
    const top = SAFE.y + 150;
    line('עוד כרטיס ניקוב?', 112, 900, top, 0.6, 1.75);
    // three short lines, so the headline fits the sky between the rooftops
    line('מחפשים', 124, 900, top, LAND - 0.05, 6.9);
    line('את העסקים', 124, 900, top + 132, LAND + 0.08, 6.9);
    line('הראשונים.', 124, 900, top + 264, LAND + 0.2, 6.9);
    line('בעמק רפאים ובדרך בית לחם', 50, 700, top + 346, LAND + 0.6, 6.9, C.ink, brand.fonts.body);

    // the headline printed on the Perko card, the offer on the ink road under it
    const proj = (x: number, z: number) => {
      const p = new THREE.Vector3(x, 0.15, z).project(this.stage.camera);
      return { x: ((p.x + 1) / 2) * this.ctx.W, y: ((1 - p.y) / 2) * this.ctx.H };
    };
    const cz = this.card.position.z, eL = proj(-3.6, cz - 2.2), eR = proj(3.6, cz - 2.2), cardPx = Math.abs(eR.x - eL.x);
    const onCard = (s2: string, px: number, w: number, p: { x: number; y: number }, t0: number, color: string, fam = brand.fonts.display) => {
      const kin = prog(t, t0, t0 + 0.25, ease.outExpo), kout = prog(t, PUSH, PUSH + 0.2, ease.inCubic);
      if (kin <= 0 || kout >= 1) return;
      c.font = font(fam, px, w); c.fillStyle = rgba(color, Math.min(1, kin * 1.6) * (1 - kout));
      c.fillText(s2, p.x, p.y + (1 - kin) * 24);
    };
    onCard('יש מקום', cardPx * 0.14, 900, proj(0, cz - 2.55), 9.7, C.bg);
    onCard('גם לעסק שלך.', cardPx * 0.14, 900, proj(0, cz - 1.3), 9.85, C.accent);
    onCard('בחינם, בגישה מוקדמת', 66, 800, proj(0, cz + 4.6), 10.2, C.bg);
    comp.draw(renderer, this.text.upload(), out);

    const punch = Math.exp(-Math.max(0, t - TP) * 9) * (t >= TP ? 1 : 0);
    const drop = Math.exp(-Math.max(0, t - LAND) * 7) * (t >= LAND ? 1 : 0);
    return { bloom: 0.55, bloomThreshold: 1.0, vignette: 0.22, grain: 0.03, zoom: 1 + 0.025 * punch + 0.025 * drop,
      shake: [punch * 6 * Math.sin(t * 90), drop * 4 * Math.sin(t * 80)] as [number, number] };
  }
}
