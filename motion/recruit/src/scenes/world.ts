// WORLD (0-12 s): one continuous camera through a paper world.
// A punch card floats above a paper model of the neighbourhood. A hole is punched on the second beat, the
// camera dives through it, levels out at street height and, on the drop, the empty stamp rings on the shop
// doors light up one by one down the street (the open spots). The camera cranes to overhead, the street folds
// flat like a pop-up book, and the lit rings fly into one Perko card.
// The rings are open places, not businesses: nothing here names or shows a real business.
import * as THREE from 'three';
import { Scene, type Frame } from '../engine/scene';
import { Layer2D } from '../engine/gl';
import { Stage3D, castShadows, ground, paper, matte } from '../engine/stage3d';
import { customLook } from '../engine/looks';
import { font } from '../engine/type';
import { clamp, ease, keys, lerp, mulberry32, prog, rgba, hexToLinear, type Key } from '../engine/util';
import { brand } from '../brand';

const C = brand.colors;
const CARD = { y: 12, cz: -6, w: 3.6, h: 6 };
const HOLE = { x: 0, sy: -1.95, r: 0.27 }; // in card space (x right, y = away from the viewer)
const holeZ = CARD.cz - HOLE.sy;
const TP = 0.5; // the punch, on the paper clack in the score
const RING_T0 = 4.0, RING_STEP = 0.25; // one ring per eighth from the drop
const N_LIT = 8;

/** The card's print: paper fibres, a small header, ten stamp circles (seven stamped). */
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
  c.font = font(brand.fonts.display, 52, 800); c.fillText('בית הקפה', px(1.5), py(2.55));
  c.font = font(brand.fonts.mono, 24, 500); c.fillText('כרטיס ניקוב · 10 חותמות = קפה', px(1.5), py(2.25));
  c.font = font(brand.fonts.mono, 22, 500); c.fillText('כרטיס לדוגמה', px(1.5), py(-2.7));
  // the upper half stays blank paper: the hook line sits there
  const R = (HOLE.r / CARD.w) * PW;
  [-1.05, -1.95].forEach((y, row) => [1.4, 0.7, 0, -0.7, -1.4].forEach((x, col) => {
    const stamped = row * 5 + col < 7; // right to left, the way the card is read
    c.beginPath(); c.arc(px(x), py(y), R, 0, Math.PI * 2);
    if (stamped) { c.fillStyle = C.ink; c.globalAlpha = 0.92; c.fill(); c.globalAlpha = 1; }
    else { c.strokeStyle = C.ink; c.lineWidth = 5; c.stroke(); }
  }));
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  tex.repeat.set(1 / CARD.w, 1 / CARD.h); tex.offset.set(0.5, 0.5);
  return tex;
}

/** The signature surface: a lime light that runs around the ring and kicks on every beat. */
function litRingLook() {
  const [r, g, b] = hexToLinear(C.accent);
  return customLook(/* glsl */ `
    float run = 0.5 + 0.5 * sin(atan(P.y - uC.y, P.z - uC.z) * 3.0 - uTime * 7.0 + uSeed);
    float kick = exp(-fract(uBeat) * 5.0);
    col = uAccent * (1.5 + 1.1 * run + 0.9 * kick) * uLit;
    alpha = uLit;`,
  { uAccent: { value: new THREE.Vector3(r, g, b) }, uLit: { value: 0 }, uC: { value: new THREE.Vector3() }, uSeed: { value: 0 } },
  { transparent: true, depthWrite: false });
}

type Shop = { group: THREE.Group; side: number; z: number; h: number; home: THREE.Vector3; lit: THREE.Mesh; litMat: THREE.ShaderMaterial; order: number };

export default class World extends Scene {
  stage = new Stage3D(38).fog(C.bg, 24, 95);
  text = new Layer2D();
  shops: Shop[] = [];
  chip!: THREE.Group;
  holeGlow!: THREE.Mesh;
  card!: THREE.Group;
  slots: THREE.Vector3[] = [];

  init() {
    const s = this.stage.scene, rnd = mulberry32(5);
    this.stage.light('studio', { extent: 34, target: [0, 0, -22] });
    s.add(ground(paper(C.bg, { repeat: 10, grain: 0.6 })));
    const road = new THREE.Mesh(new THREE.PlaneGeometry(5, 120), paper(C.bg2, { repeat: 6, grain: 0.4 }));
    road.rotation.x = -Math.PI / 2; road.position.set(0, 0.01, -50); road.receiveShadow = true; s.add(road);

    // the street: card-stock blocks on both sides, a door and an empty stamp ring on each facade
    const tones = [C.bg, '#EFEFE6', '#E4E5DA'].map((h) => paper(h, { grain: 0.7 }));
    const doorM = matte(C.ink, 0.9), winM = matte('#D8DACE', 0.95), ringM = matte(C.ink, 0.6);
    const lit: Shop[] = [];
    for (const side of [1, -1]) {
      let z = -2.5;
      for (let i = 0; i < 12; i++) {
        const w = 3.3 + rnd() * 0.9, d = 3.2 + rnd() * 1.2, h = 2.8 + rnd() * 3.2;
        const face = side * 3.1, zc = z - w / 2;
        const group = new THREE.Group();
        const box = new THREE.Mesh(new THREE.BoxGeometry(d, h, w), tones[(i + (side > 0 ? 0 : 1)) % 3]!);
        box.position.set(face + side * d / 2, h / 2, 0); group.add(box);
        const rotY = -side * Math.PI / 2, fx = face - side * 0.006;
        const door = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 1.75), doorM);
        door.position.set(fx, 0.875, 0.65); door.rotation.y = rotY; group.add(door);
        const win = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.2), winM);
        win.position.set(fx, 1.25, -0.85); win.rotation.y = rotY; group.add(win);
        // the stamp ring hangs from a bracket like a shop sign, facing down the street (readable from the pavement)
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.04, 12, 48), ringM);
        ring.position.set(face - side * 0.62, 2.45, 0.65); group.add(ring);
        const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.035, 0.035), ringM);
        bracket.position.set(face - side * 0.31, 2.45 + 0.38, 0.65); group.add(bracket);
        const litMat = litRingLook();
        const litMesh = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.07, 12, 64), litMat);
        litMesh.position.set(ring.position.x, ring.position.y, zc + ring.position.z + 0.01); litMat.uniforms.uSeed!.value = i * 1.7 + side;
        s.add(litMesh); // in world space, so it can leave the facade when the street folds
        group.position.set(0, 0, zc);
        castShadows(box);
        s.add(group);
        const shop = { group, side, z: zc, h, home: litMesh.position.clone(), lit: litMesh, litMat, order: -1 };
        this.shops.push(shop);
        if (i >= 2 && i < 2 + N_LIT / 2) lit.push(shop); // the spots ahead of the camera, not beside it
        z -= w + 0.15;
      }
    }
    lit.sort((a, b) => b.z - a.z).forEach((sh, k) => { sh.order = k; });

    // the punch card, floating above the street, with one real hole
    const shape = new THREE.Shape();
    const hw = CARD.w / 2, hh = CARD.h / 2, rr = 0.18;
    shape.moveTo(-hw + rr, -hh); shape.lineTo(hw - rr, -hh); shape.quadraticCurveTo(hw, -hh, hw, -hh + rr);
    shape.lineTo(hw, hh - rr); shape.quadraticCurveTo(hw, hh, hw - rr, hh); shape.lineTo(-hw + rr, hh);
    shape.quadraticCurveTo(-hw, hh, -hw, hh - rr); shape.lineTo(-hw, -hh + rr); shape.quadraticCurveTo(-hw, -hh, -hw + rr, -hh);
    const hole = new THREE.Path(); hole.absarc(HOLE.x, HOLE.sy, HOLE.r, 0, Math.PI * 2, true); shape.holes.push(hole);
    const cardMesh = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.025, bevelEnabled: false, curveSegments: 48 }),
      new THREE.MeshStandardMaterial({ map: cardTexture(), roughness: 0.9 }));
    cardMesh.rotation.x = -Math.PI / 2; cardMesh.position.set(0, CARD.y, CARD.cz); s.add(cardMesh);
    // the chip that is punched out: it flies at the camera
    this.chip = new THREE.Group();
    const chipBody = new THREE.Mesh(new THREE.CylinderGeometry(HOLE.r, HOLE.r, 0.025, 48), new THREE.MeshStandardMaterial({ color: '#F4F1E6', roughness: 0.9 }));
    const chipRing = new THREE.Mesh(new THREE.TorusGeometry(HOLE.r * 0.92, 0.012, 8, 48), matte(C.ink));
    chipRing.rotation.x = -Math.PI / 2; chipRing.position.y = 0.014;
    this.chip.add(chipBody, chipRing); s.add(this.chip);
    this.holeGlow = new THREE.Mesh(new THREE.TorusGeometry(HOLE.r, 0.016, 8, 64), new THREE.MeshBasicMaterial({ color: new THREE.Color(...hexToLinear(C.accent)).multiplyScalar(2.4) }));
    this.holeGlow.rotation.x = -Math.PI / 2; this.holeGlow.position.set(HOLE.x, CARD.y + 0.03, holeZ); s.add(this.holeGlow);

    // the Perko card the lit rings fly into (on the ground, seen from overhead)
    this.card = new THREE.Group();
    const cw = 7.2, ch = 4.4;
    const cardShape = new THREE.Shape();
    cardShape.moveTo(-cw / 2 + 0.4, -ch / 2); cardShape.lineTo(cw / 2 - 0.4, -ch / 2); cardShape.quadraticCurveTo(cw / 2, -ch / 2, cw / 2, -ch / 2 + 0.4);
    cardShape.lineTo(cw / 2, ch / 2 - 0.4); cardShape.quadraticCurveTo(cw / 2, ch / 2, cw / 2 - 0.4, ch / 2); cardShape.lineTo(-cw / 2 + 0.4, ch / 2);
    cardShape.quadraticCurveTo(-cw / 2, ch / 2, -cw / 2, ch / 2 - 0.4); cardShape.lineTo(-cw / 2, -ch / 2 + 0.4); cardShape.quadraticCurveTo(-cw / 2, -ch / 2, -cw / 2 + 0.4, -ch / 2);
    const inkCard = new THREE.Mesh(new THREE.ExtrudeGeometry(cardShape, { depth: 0.12, bevelEnabled: false }), new THREE.MeshStandardMaterial({ color: C.ink, roughness: 0.55 }));
    inkCard.rotation.x = -Math.PI / 2; castShadows(inkCard); this.card.add(inkCard);
    for (let r = 0; r < 2; r++) for (let k = 0; k < 5; k++) {
      const x = 2.6 - k * 1.3, z = -0.45 + r * 1.3 + 0.35; // right to left, the way Hebrew reads
      const slot = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.03, 8, 48), matte('#4A4F43'));
      slot.rotation.x = -Math.PI / 2; slot.position.set(x, 0.14, z); this.card.add(slot);
      this.slots.push(new THREE.Vector3(x, 0.16, z));
    }
    this.card.position.set(0, 0.02, -20); s.add(this.card);
  }

  /** Camera: wide over the card, push to the hole, dive through it, level out at street height, crane up. */
  camera(t: number) {
    const k: Record<'x' | 'y' | 'z' | 'tx' | 'ty' | 'tz' | 'up', Key[]> = {
      x: [[0, 0], [0.5, 0], [1.75, HOLE.x, ease.inOutCubic], [2.3, HOLE.x], [3.7, 0, ease.inOutCubic], [12, 0]],
      y: [[0, CARD.y + 9.8], [0.5, CARD.y + 9.2], [1.75, CARD.y + 1.1, ease.inOutCubic], [2.25, CARD.y - 1.4, ease.inExpo], [3.7, 1.5, ease.outCubic],
          [5.6, 1.6], [7.4, 12, ease.inOutCubic], [8.6, 22.5, ease.inOutCubic], [12, 21.6, ease.inOutCubic]],
      z: [[0, CARD.cz + 0.3], [0.5, CARD.cz + 0.1], [1.75, holeZ, ease.inOutCubic], [2.3, holeZ], [3.7, -5.5, ease.inOutCubic], [5.6, -9, ease.inOutQuad],
          [7.4, -1.5, ease.inOutCubic], [8.6, -18.2, ease.inOutCubic], [12, -18.6]],
      tx: [[0, 0], [0.5, 0], [1.75, HOLE.x, ease.inOutCubic], [2.3, HOLE.x], [3.7, 0, ease.inOutCubic], [12, 0]],
      ty: [[0, CARD.y], [2.3, 0], [3.7, 1.3, ease.inOutCubic], [5.6, 1.3], [7.4, 0.6, ease.inOutCubic], [8.6, 0, ease.inOutCubic]],
      tz: [[0, CARD.cz + 0.3 - 0.001], [0.5, CARD.cz + 0.1 - 0.001], [1.75, holeZ - 0.001, ease.inOutCubic], [2.3, holeZ - 0.4], [3.7, -32, ease.inOutCubic], [5.6, -32],
           [7.4, -24, ease.inOutCubic], [8.6, -20.2, ease.inOutCubic], [12, -20.6]],
      up: [[0, 0], [2.3, 0], [3.5, 1, ease.inOutCubic], [7.4, 1], [8.6, 0, ease.inOutCubic]],
    };
    const v = (a: keyof typeof k) => keys(t, k[a]);
    const cam = this.stage.camera, u = v('up');
    cam.position.set(v('x'), v('y'), v('z'));
    cam.up.set(0, u, -(1 - u)).normalize();
    cam.lookAt(v('tx'), v('ty'), v('tz'));
  }

  render(f: Frame, out: THREE.WebGLRenderTarget) {
    const { renderer, comp, SAFE, W } = this.ctx;
    const t = f.t;
    this.camera(t);

    // the punch: the chip sits in the hole, then flies up past the camera, spinning
    const pk = prog(t, TP, TP + 0.32, ease.inQuad);
    this.chip.position.set(HOLE.x + pk * 0.4, CARD.y + 0.0125 + pk * 9, holeZ - pk * 0.6);
    this.chip.rotation.set(pk * 4.2, 0, pk * 2.4);
    this.chip.visible = pk < 1;
    const g = prog(t, TP, TP + 0.12, ease.outCubic);
    this.holeGlow.scale.setScalar(Math.max(0.001, g));
    (this.holeGlow.material as THREE.MeshBasicMaterial).color.setRGB(...(hexToLinear(C.accent).map((c) => c * (2.4 + 3 * Math.exp(-Math.max(0, t - TP) * 6))) as [number, number, number]));

    // the open spots light up down the street, one per eighth from the drop
    for (const sh of this.shops) {
      const on = sh.order >= 0 ? prog(t, RING_T0 + sh.order * RING_STEP, RING_T0 + sh.order * RING_STEP + 0.18, ease.outExpo) : 0;
      sh.litMat.uniforms.uLit!.value = on;
      sh.litMat.uniforms.uC!.value.copy(sh.lit.getWorldPosition(new THREE.Vector3()));
      sh.lit.scale.setScalar(0.6 + 0.4 * on);
      sh.lit.visible = on > 0.001;
      // the street folds flat like a pop-up book, nearest first
      const fold = prog(t, 8.0 + Math.min(1, -sh.z / 50) * 0.6, 8.6 + Math.min(1, -sh.z / 50) * 0.6, ease.inOutCubic);
      sh.group.scale.y = Math.max(0.015, 1 - fold);
    }
    // the lit rings leave their doors and land in the card, one after another
    const cardIn = prog(t, 8.3, 8.9, ease.outExpo);
    this.card.scale.setScalar(Math.max(0.001, cardIn));
    const qa = new THREE.Quaternion(), qb = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
    for (const sh of this.shops) {
      if (sh.order < 0) continue;
      const fly = prog(t, 8.7 + sh.order * 0.09, 9.35 + sh.order * 0.09, ease.inOutCubic);
      const to = this.slots[sh.order]!.clone().multiplyScalar(Math.max(0.001, cardIn)).add(this.card.position);
      sh.lit.position.copy(sh.home).lerp(to, fly);
      sh.lit.position.y += Math.sin(fly * Math.PI) * 1.6;
      qa.identity();
      sh.lit.quaternion.copy(qa.slerp(qb, fly));
      sh.lit.scale.setScalar(lerp(sh.lit.scale.x, 1.4, fly));
    }

    comp.draw(renderer, this.stage.render(renderer, f), out, { mode: 'replace', srgb: false });

    // type, in the calm top band of every shot
    const c = this.text.clear(), cx = SAFE.x + SAFE.w / 2;
    c.direction = 'rtl'; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    const line = (s: string, px: number, w: number, y: number, t0: number, t1: number, color: string = C.ink, fam = brand.fonts.display) => {
      const kin = prog(t, t0, t0 + 0.32, ease.outExpo), kout = prog(t, t1 - 0.2, t1, ease.inCubic);
      const a = kin * (1 - kout);
      if (a <= 0) return;
      c.font = font(fam, px, w); c.fillStyle = rgba(color, a);
      c.fillText(s, cx, y + (1 - kin) * 40 - kout * 30);
    };
    const top = SAFE.y + 150;
    line('עוד כרטיס ניקוב?', 104, 900, top, 0.1, 1.85);
    line('או שכונה שלמה.', 104, 900, top, 2.35, 3.95);
    line('מחפשים את', 118, 900, top, 4.3, 6.9);
    line('העסקים הראשונים.', 118, 900, top + 130, 4.45, 6.9);
    line('עמק רפאים · דרך בית לחם', 40, 500, top + 210, 5.1, 6.9, C.muted, brand.fonts.mono);
    line('כרטיס אחד', 118, 900, top, 9.95, 11.95);
    line('לכל השכונה.', 118, 900, top + 130, 10.1, 11.95);
    line('בחינם, בגישה מוקדמת', 44, 700, top + 210, 10.5, 11.95, C.muted, brand.fonts.body);
    comp.draw(renderer, this.text.upload(), out);

    const punch = Math.exp(-Math.max(0, t - TP) * 9) * (t >= TP ? 1 : 0);
    const drop = Math.exp(-Math.max(0, t - RING_T0) * 7) * (t >= RING_T0 ? 1 : 0);
    return { bloom: 0.7, bloomThreshold: 1.0, vignette: 0.22, grain: 0.03, zoom: 1 + 0.025 * punch + 0.02 * drop, shake: [punch * 6 * Math.sin(t * 90), 0] as [number, number] };
  }
}
