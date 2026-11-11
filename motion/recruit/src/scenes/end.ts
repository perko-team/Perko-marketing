// END (12 s - end): the wordmark, written by the punched chip landing as its "o", then the ask. Holds still.
import type * as THREE from 'three';
import { Scene, type Frame } from '../engine/scene';
import { Layer2D } from '../engine/gl';
import { font } from '../engine/type';
import { ease, prog, rgba } from '../engine/util';
import { brand } from '../brand';
import { BgField } from './_shared';

const C = brand.colors;

export default class End extends Scene {
  bg = new BgField();
  text = new Layer2D();

  render(f: Frame, out: THREE.WebGLRenderTarget) {
    const { renderer, comp, SAFE } = this.ctx;
    const t = f.t, t0 = this.ctx.start;
    const cx = SAFE.x + SAFE.w / 2, cy = SAFE.y + SAFE.h * 0.32;
    this.bg.render(renderer, out, { t, x: cx, y: cy, energy: 0.2, light: 1.2 });
    const c = this.text.clear();
    // the wordmark: "perk" wipes in, the disc drops in from above and lands as the "o" on the bell (12.5 s)
    const size = SAFE.w * 0.27;
    c.font = font(brand.fonts.display, size, 800);
    c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    (c as any).letterSpacing = `${-0.055 * size}px`;
    const wordW = c.measureText('perk').width, disc = size * 0.5, gap = size * 0.04;
    const x0 = cx - (wordW + gap + disc) / 2;
    const kw = prog(t, t0 + 0.05, t0 + 0.45, ease.outExpo);
    c.save(); c.beginPath(); c.rect(x0 - 20, cy - size, (wordW + 40) * kw, size * 1.4); c.clip();
    c.fillStyle = C.ink; c.fillText('perk', x0, cy); c.restore();
    const kd = prog(t, t0 + 0.2, t0 + 0.5, ease.inQuad);
    const land = prog(t, t0 + 0.5, t0 + 0.62, ease.outCubic);
    const dy = (1 - kd) * -900;
    if (kd > 0) {
      c.beginPath();
      const sq = 1 - 0.12 * Math.sin(land * Math.PI); // a small squash as it lands
      c.ellipse(x0 + wordW + gap + disc / 2, cy - disc / 2 + 0.015 * size + dy, disc / 2 / sq, (disc / 2) * sq, 0, 0, Math.PI * 2);
      c.fillStyle = C.ink; c.fill();
    }
    (c as any).letterSpacing = '0px';
    c.direction = 'rtl'; c.textAlign = 'center';
    const ln = (s: string, px: number, w: number, y: number, at: number, color: string = C.ink, fam = brand.fonts.display) => {
      const k = prog(t, t0 + at, t0 + at + 0.35, ease.outExpo);
      if (k <= 0) return;
      c.font = font(fam, px, w); c.fillStyle = rgba(color, k);
      c.fillText(s, cx, y + (1 - k) * 30);
    };
    ln('מחפשים את העסקים הראשונים', 64, 800, cy + size * 0.75, 0.55);
    // the ask on a lime pill with ink type (lime only on its own shape, never as text on the light ground)
    const kp = prog(t, t0 + 0.8, t0 + 1.15, ease.outExpo);
    if (kp > 0) {
      c.font = font(brand.fonts.display, 66, 900);
      const label = 'הצטרפו בחינם', pw = c.measureText(label).width + 110, ph = 120, py = cy + size * 0.75 + 70;
      c.fillStyle = rgba(C.accent, kp); c.beginPath(); (c as any).roundRect(cx - pw / 2, py + (1 - kp) * 30, pw, ph, ph / 2); c.fill();
      c.fillStyle = rgba(C.ink, kp); c.fillText(label, cx, py + ph * 0.68 + (1 - kp) * 30);
    }
    ln('הקישור בביו', 42, 500, cy + size * 0.75 + 270, 1.1, C.muted, brand.fonts.body);
    ln('גישה מוקדמת · עמק רפאים · דרך בית לחם', 32, 500, cy + size * 0.75 + 340, 1.3, C.muted, brand.fonts.mono);
    // the card again, small: eight places lit, two still open (dashed), right to left
    const kr = prog(t, t0 + 1.4, t0 + 1.8, ease.outExpo);
    if (kr > 0) {
      const r = 34, gap = 26, rowW = 10 * r * 2 + 9 * gap, y = cy + size * 0.75 + 470;
      for (let i = 0; i < 10; i++) {
        const x = cx + rowW / 2 - r - i * (2 * r + gap);
        c.beginPath(); c.arc(x, y + (1 - kr) * 20, r, 0, Math.PI * 2);
        if (i < 8) { c.fillStyle = rgba(C.ink, kr); c.fill(); }
        else { c.setLineDash([9, 7]); c.lineWidth = 5; c.strokeStyle = rgba(C.ink, kr); c.stroke(); c.setLineDash([]); }
      }
    }
    comp.draw(renderer, this.text.upload(), out);
    return { bloom: 0.4, vignette: 0.18, grain: 0.03 };
  }
}
