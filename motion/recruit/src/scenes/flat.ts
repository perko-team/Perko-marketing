// FLAT (0-12 s): the same story, flat and premium. Paper, ink and one lime, lots of air, slow clean moves.
// A punch card; the eighth stamp is punched out on the paper clack; the view slides into the hole until its
// lime fills the frame; a quiet street is drawn line by line on the lime, each shop with a blank round sign
// (an open place); the signs leave the street and settle into one Perko card, two of its places still open.
// Nothing here names or shows a real business; the punch card is marked as an example.
import * as THREE from 'three';
import { Scene, type Frame } from '../engine/scene';
import { FSPass, Layer2D } from '../engine/gl';
import { font } from '../engine/type';
import { ease, keys, lerp, prog, rgba, hexToLinear } from '../engine/util';
import { brand } from '../brand';

const C = brand.colors;
const TP = 0.5; // the punch, on the paper clack
const LAND = 4.0; // the street, on the drop
const CARD = { x: 540, y: 1010, w: 780, h: 480, r: 30 };
const STAMP = { r: 31, dx: 118, rows: [CARD.y + 60, CARD.y + 168] };
const HOLE_I = 7; // the eighth stamp, right to left
const stampXY = (i: number) => ({ x: CARD.x + 2 * STAMP.dx - (i % 5) * STAMP.dx, y: STAMP.rows[Math.floor(i / 5)]! });
const hole = stampXY(HOLE_I);
// the street: six shops along a baseline, drawn on the lime; the camera pans across it right to left
const BASE = 1330;
const SHOPS = Array.from({ length: 7 }, (_, i) => ({ x: 1080 - 40 - i * 300, w: 280, h: [380, 450, 340, 420, 470, 360, 430][i]! }));
const signXY = (i: number, pan: number) => { const s = SHOPS[i]!; return { x: s.x - s.w * 0.5 + pan, y: BASE - s.h + 120 }; };
const panAt = (t: number) => keys(t, [[LAND, -40], [7.6, 720, ease.inOutCubic]]);
// the Perko card the signs settle into
const PK = { x: 540, y: 1060, w: 860, h: 660, r: 44 };
const slotXY = (i: number) => ({ x: PK.x + 2 * 150 - (i % 5) * 150, y: PK.y + 105 + Math.floor(i / 5) * 140 });

/** The ground: paper or lime, with fibres and a soft light from the upper right (this piece's own surface). */
class Ground {
  pass = new FSPass(/* glsl */ `
    uniform vec3 base; uniform float t;
    void main() {
      vec2 p = FRAG_PX / uRes.y;
      float fib = fbm(p * vec2(140.0, 22.0)) - 0.5;          // long paper fibres
      float mot = fbm(p * 3.0 + vec2(t * 0.01, 0.0)) - 0.5;    // soft mottling
      float light = 0.035 * exp(-dot(p - vec2(0.62, 0.9), p - vec2(0.62, 0.9)) * 1.6);
      vec3 col = base * (1.0 + 0.035 * fib + 0.025 * mot) + light;
      fragColor = vec4(col, 1.0);
    }`, { base: { value: new THREE.Vector3() }, t: { value: 0 } });
  render(r: THREE.WebGLRenderer, out: THREE.WebGLRenderTarget, hex: string, t: number) {
    (this.pass.u.base!.value as THREE.Vector3).set(...hexToLinear(hex)); this.pass.u.t!.value = t;
    this.pass.render(r, out);
  }
}

function rr(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath(); (c as any).roundRect(x, y, w, h, r);
}

export default class Flat extends Scene {
  ground = new Ground();
  L = new Layer2D();

  render(f: Frame, out: THREE.WebGLRenderTarget) {
    const { renderer, comp, SAFE } = this.ctx;
    const t = f.t, cx = SAFE.x + SAFE.w / 2;
    // before the hole fills the frame the ground is paper; after, it is lime
    const intoHole = prog(t, 1.9, 3.3, ease.inOutExpo);
    this.ground.render(renderer, out, intoHole >= 1 ? C.accent : C.bg, t);
    const c = this.L.clear();
    c.direction = 'rtl'; c.textBaseline = 'alphabetic';

    const text = (s: string, px: number, w: number, x: number, y: number, t0: number, t1: number, color: string = C.ink, fam = brand.fonts.display, align: CanvasTextAlign = 'center') => {
      const k = prog(t, t0, t0 + 0.6, ease.outCubic), o = prog(t, t1 - 0.35, t1, ease.inCubic);
      if (k <= 0 || o >= 1) return;
      c.save(); c.font = font(fam, px, w); c.textAlign = align; (c as any).letterSpacing = `${-0.02 * px}px`;
      c.fillStyle = rgba(color, k * (1 - o)); c.fillText(s, x, y + (1 - k) * 18); c.restore();
    };

    if (intoHole < 1) {
      // --- the punch card: a slow push, then the view slides into the punched hole
      const push = lerp(1, 1.05, prog(t, 0, 1.9, ease.inOutQuad));
      const zoom = push * Math.exp(Math.log(40) * intoHole);
      c.save();
      c.translate(lerp(hole.x, cx, intoHole), lerp(hole.y, this.ctx.H / 2, intoHole)); // zoom about the hole, which drifts to the centre
      c.scale(zoom, zoom);
      c.translate(-hole.x, -hole.y);
      // a soft contact shadow, then the card
      c.save(); c.shadowColor = rgba(C.ink, 0.16); c.shadowBlur = 70; c.shadowOffsetY = 26;
      c.fillStyle = '#FCFBF6'; rr(c, CARD.x - CARD.w / 2, CARD.y - CARD.h / 2, CARD.w, CARD.h, CARD.r); c.fill(); c.restore();
      c.strokeStyle = rgba(C.ink, 0.14); c.lineWidth = 1.5; rr(c, CARD.x - CARD.w / 2, CARD.y - CARD.h / 2, CARD.w, CARD.h, CARD.r); c.stroke();
      c.textAlign = 'right'; c.fillStyle = C.ink;
      c.font = font(brand.fonts.display, 44, 800); c.fillText('בית הקפה', CARD.x + CARD.w / 2 - 50, CARD.y - CARD.h / 2 + 86);
      c.font = font(brand.fonts.mono, 22, 500); c.fillStyle = C.muted; c.fillText('כרטיס ניקוב · 10 חותמות = קפה', CARD.x + CARD.w / 2 - 50, CARD.y - CARD.h / 2 + 124);
      c.textAlign = 'left'; c.fillText('לדוגמה', CARD.x - CARD.w / 2 + 50, CARD.y - CARD.h / 2 + 86);
      for (let i = 0; i < 10; i++) {
        const p = stampXY(i);
        c.beginPath(); c.arc(p.x, p.y, STAMP.r, 0, Math.PI * 2);
        if (i < 7) { c.fillStyle = C.ink; c.fill(); }
        else if (i === HOLE_I && t >= TP) {
          // the hole: lime shows through, with a fine paper edge
          c.fillStyle = C.accent; c.fill();
          c.save(); c.clip(); c.strokeStyle = rgba(C.ink, 0.25); c.lineWidth = 10; c.beginPath(); c.arc(p.x, p.y - 4, STAMP.r + 4, 0, Math.PI * 2); c.stroke(); c.restore();
        } else { c.strokeStyle = C.ink; c.lineWidth = 2.5; c.stroke(); }
      }
      // the punched chip lifts out of the hole and drifts away
      const ck = prog(t, TP, TP + 0.9, ease.outCubic);
      if (t >= TP && ck < 1) {
        c.save(); c.globalAlpha = 1 - ck; c.translate(hole.x - ck * 60, hole.y - ck * 210); c.rotate(-ck * 0.6);
        c.shadowColor = rgba(C.ink, 0.2); c.shadowBlur = 20; c.shadowOffsetY = 8 + ck * 20;
        c.fillStyle = '#FCFBF6'; c.beginPath(); c.arc(0, 0, STAMP.r, 0, Math.PI * 2); c.fill();
        c.shadowColor = 'transparent'; c.strokeStyle = C.ink; c.lineWidth = 2.5; c.stroke(); c.restore();
      }
      c.restore();
      const hookOut = 1.9;
      text('עוד כרטיס ניקוב?', 92, 700, cx, SAFE.y + 260, 0.15, hookOut);
    }

    if (intoHole >= 1 && t < 7.6) {
      text('או שכונה שלמה.', 92, 700, cx, SAFE.y + 260, 3.25, LAND + 0.05);
      // --- the street, drawn line by line on the lime, a slow pan right to left
      const pan = panAt(t);
      c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
      const draw = (len: number, k: number, path: () => void) => {
        if (k <= 0) return;
        c.setLineDash([len * k, len]); path(); c.stroke(); c.setLineDash([]);
      };
      c.strokeStyle = C.ink; c.lineWidth = 3.5;
      draw(2400, prog(t, LAND - 0.3, LAND + 0.6, ease.outCubic), () => { c.beginPath(); c.moveTo(1080, BASE); c.lineTo(-1200 + pan * 0, BASE); });
      SHOPS.forEach((s, i) => {
        const x0 = s.x + pan, x1 = x0 - s.w, top = BASE - s.h;
        if (x0 < -80 || x1 > 1160) return;
        const k = prog(t, LAND + 0.1 + i * 0.22, LAND + 0.9 + i * 0.22, ease.outCubic);
        draw(2 * s.h + s.w, k, () => { c.beginPath(); c.moveTo(x0, BASE); c.lineTo(x0, top); c.lineTo(x1, top); c.lineTo(x1, BASE); });
        draw(360, prog(t, LAND + 0.4 + i * 0.22, LAND + 1.1 + i * 0.22, ease.outCubic), () => { // door and window
          c.beginPath(); c.moveTo(x0 - 40, BASE); c.lineTo(x0 - 40, BASE - 150); c.lineTo(x0 - 110, BASE - 150); c.lineTo(x0 - 110, BASE);
          c.rect(x1 + 30, BASE - 160, 120, 90);
        });
        draw(s.w, prog(t, LAND + 0.5 + i * 0.22, LAND + 1.0 + i * 0.22, ease.outCubic), () => { c.beginPath(); c.moveTo(x0 - 12, BASE - 200); c.lineTo(x1 + 12, BASE - 200); }); // awning line
        // the sign: a bracket and a blank paper disc (an open place)
        const sp = signXY(i, pan), sk = prog(t, LAND + 0.7 + i * 0.22, LAND + 1.05 + i * 0.22, ease.outBack);
        if (sk > 0) {
          c.beginPath(); c.moveTo(x0, sp.y - 46); c.lineTo(sp.x, sp.y - 46); c.lineTo(sp.x, sp.y - 34); c.stroke();
          c.save(); c.translate(sp.x, sp.y); c.scale(sk, sk);
          c.fillStyle = '#FCFBF6'; c.beginPath(); c.arc(0, 0, 34, 0, Math.PI * 2); c.fill(); c.stroke(); c.restore();
        }
      });
      c.restore();
      text('מחפשים את', 104, 800, cx, SAFE.y + 250, LAND + 0.05, 7.4);
      text('העסקים הראשונים.', 104, 800, cx, SAFE.y + 370, LAND + 0.2, 7.4);
      text('בעמק רפאים ובדרך בית לחם', 44, 500, cx, SAFE.y + 450, LAND + 0.7, 7.4, C.muted, brand.fonts.body);
    }

    if (t >= 7.6) {
      // --- one Perko card: the signs settle into its places; two places stay open
      const kc = prog(t, 7.6, 8.4, ease.outExpo);
      const push = lerp(1, 1.03, prog(t, 8.4, 12, ease.inOutQuad));
      c.save(); c.translate(PK.x, PK.y); c.scale(push * lerp(0.94, 1, kc), push * lerp(0.94, 1, kc)); c.translate(-PK.x, -PK.y);
      c.globalAlpha = kc;
      c.save(); c.shadowColor = rgba(C.ink, 0.22); c.shadowBlur = 80; c.shadowOffsetY = 30;
      c.fillStyle = C.ink; rr(c, PK.x - PK.w / 2, PK.y - PK.h / 2, PK.w, PK.h, PK.r); c.fill(); c.restore();
      c.textAlign = 'left'; c.font = font(brand.fonts.display, 48, 800); c.fillStyle = C.accent;
      (c as any).letterSpacing = '-2.6px'; c.fillText('perk', PK.x - PK.w / 2 + 56, PK.y - PK.h / 2 + 86);
      const ww = c.measureText('perk').width; (c as any).letterSpacing = '0px';
      c.beginPath(); c.arc(PK.x - PK.w / 2 + 56 + ww + 16, PK.y - PK.h / 2 + 74, 12, 0, Math.PI * 2); c.fill();
      c.globalAlpha = 1;
      for (let i = 0; i < 10; i++) {
        const s = slotXY(i);
        c.strokeStyle = rgba(C.bg, 0.25 * kc); c.lineWidth = 2; c.beginPath(); c.arc(s.x, s.y, 44, 0, Math.PI * 2); c.stroke();
        if (i >= 8) {
          // the open places: a lime ring that breathes slowly
          const br = 0.55 + 0.45 * Math.sin((t - 8) * 3.2 + i);
          c.strokeStyle = rgba(C.accent, prog(t, 9.4, 9.9) * br); c.lineWidth = 4; c.setLineDash([10, 8]);
          c.beginPath(); c.arc(s.x, s.y, 44, 0, Math.PI * 2); c.stroke(); c.setLineDash([]);
        }
      }
      c.restore();
      // the signs fly from where the street left them into the first eight places
      for (let i = 0; i < 8; i++) {
        const k = prog(t, 7.6 + i * 0.1, 8.7 + i * 0.1, ease.inOutCubic), land = prog(t, 8.55 + i * 0.1, 8.75 + i * 0.1, ease.outCubic);
        const from = signXY(i % SHOPS.length, panAt(7.6)), to = slotXY(i);
        const x = lerp(from.x, to.x, k), y = lerp(from.y, to.y, k) - Math.sin(k * Math.PI) * 120;
        c.save(); c.translate(x, y); const sc = lerp(1, 44 / 34, k); c.scale(sc, sc);
        c.fillStyle = land > 0 ? `rgba(${[0, 1, 2].map((j) => Math.round(lerp(parseInt('FCFBF6'.substr(j * 2, 2), 16), parseInt(C.accent.substr(1 + j * 2, 2), 16), land))).join(',')},1)` : '#FCFBF6';
        c.beginPath(); c.arc(0, 0, 34, 0, Math.PI * 2); c.fill();
        c.strokeStyle = C.ink; c.lineWidth = 3; c.stroke(); c.restore();
      }
      text('יש מקום', 88, 800, PK.x, PK.y - PK.h / 2 + 200, 9.3, 12.0, C.bg);
      text('גם לעסק שלך.', 88, 800, PK.x, PK.y - PK.h / 2 + 300, 9.45, 12.0, C.accent);
      text('בחינם, בגישה מוקדמת', 52, 700, cx, PK.y + PK.h / 2 + 120, 9.9, 12.0, C.ink, brand.fonts.body);
    }

    comp.draw(renderer, this.L.upload(), out);
    return { bloom: 0, vignette: 0.12, grain: 0.025 };
  }
}
