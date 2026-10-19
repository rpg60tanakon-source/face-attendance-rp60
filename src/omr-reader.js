/* ===== ตัวอ่านกระดาษคำตอบ (OMR) จากภาพ — ไม่ใช้ไลบรารีภายนอก =====
   ขั้นตอน: ภาพ → ขาวดำ → หาสี่เหลี่ยมดำ 4 มุม → homography (มม. → พิกเซล) → วัดความเข้มในแต่ละวงกลม
   ใช้คู่กับ OMR_LAYOUT ใน screens-omr.jsx */
window.OmrReader = {
  // เกณฑ์ (ปรับได้หากทดสอบกับกระดาษจริงแล้วพลาด)
  FILLED: 0.45,   // สัดส่วนพิกเซลเข้มในวงกลม ≥ ค่านี้ = ฝน
  FAINT: 0.22,    // ระหว่าง FAINT–FILLED = ไม่แน่ใจ (ฝนจาง/ลบไม่สะอาด)
  DARK_RATIO: 0.65, // พิกเซลที่เข้มกว่า 65% ของสีกระดาษรอบๆ = เข้ม

  // ---- ภาพ (canvas) → ค่าความสว่าง 0–255 ----
  grayFromCanvas(canvas) {
    const w = canvas.width, h = canvas.height;
    const d = canvas.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, w, h).data;
    const g = new Uint8Array(w * h);
    for (let i = 0, j = 0; i < g.length; i++, j += 4) g[i] = (d[j] * 77 + d[j + 1] * 150 + d[j + 2] * 29) >> 8;
    return { g, w, h };
  },

  // ---- หาสี่เหลี่ยมดำ 4 มุม → [TL, TR, BL, BR] หรือ null ----
  findMarkers(img) {
    const { g, w, h } = img;
    // threshold แบบปรับตามแสงรอบๆ (integral image) — กันเงา/แสงไม่เท่ากัน
    const W1 = w + 1;
    const integ = new Float64Array(W1 * (h + 1));
    for (let y = 0; y < h; y++) {
      let row = 0;
      for (let x = 0; x < w; x++) {
        row += g[y * w + x];
        integ[(y + 1) * W1 + x + 1] = integ[y * W1 + x + 1] + row;
      }
    }
    const half = Math.max(8, Math.round(Math.max(w, h) / 14));
    const bin = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      const y0 = Math.max(0, y - half), y1 = Math.min(h, y + half + 1);
      for (let x = 0; x < w; x++) {
        const x0 = Math.max(0, x - half), x1 = Math.min(w, x + half + 1);
        const sum = integ[y1 * W1 + x1] - integ[y0 * W1 + x1] - integ[y1 * W1 + x0] + integ[y0 * W1 + x0];
        const mean = sum / ((x1 - x0) * (y1 - y0));
        bin[y * w + x] = g[y * w + x] < mean * 0.7 ? 1 : 0;
      }
    }

    // แยกกลุ่มพิกเซลเข้มที่ติดกัน (connected components)
    const label = new Int32Array(w * h);
    const stack = new Int32Array(w * h);
    const blobs = [];
    const minArea = w * h * 0.00012, maxArea = w * h * 0.03;
    let next = 1;
    for (let start = 0; start < w * h; start++) {
      if (!bin[start] || label[start]) continue;
      let sp = 0, n = 0, sx = 0, sy = 0, sxx = 0, syy = 0;
      let minx = w, maxx = 0, miny = h, maxy = 0;
      stack[sp++] = start; label[start] = next;
      while (sp) {
        const p = stack[--sp];
        const x = p % w, y = (p - x) / w;
        n++; sx += x; sy += y; sxx += x * x; syy += y * y;
        if (x < minx) minx = x; if (x > maxx) maxx = x;
        if (y < miny) miny = y; if (y > maxy) maxy = y;
        if (x > 0 && bin[p - 1] && !label[p - 1]) { label[p - 1] = next; stack[sp++] = p - 1; }
        if (x < w - 1 && bin[p + 1] && !label[p + 1]) { label[p + 1] = next; stack[sp++] = p + 1; }
        if (y > 0 && bin[p - w] && !label[p - w]) { label[p - w] = next; stack[sp++] = p - w; }
        if (y < h - 1 && bin[p + w] && !label[p + w]) { label[p + w] = next; stack[sp++] = p + w; }
      }
      next++;
      if (n < minArea || n > maxArea) continue;
      const cx = sx / n, cy = sy / n;
      // ความทึบ: (Ixx+Iyy)/A² — สี่เหลี่ยม/วงกลมทึบ ≈ 0.16–0.17 ไม่ขึ้นกับการหมุน; ตัวหนังสือ/กรอบกลวงจะสูงกว่ามาก
      const inertia = (sxx - n * cx * cx) + (syy - n * cy * cy);
      const compact = inertia / (n * n);
      const bw = maxx - minx + 1, bh = maxy - miny + 1;
      if (compact < 0.14 || compact > 0.24) continue;
      if (bw / bh > 2.2 || bh / bw > 2.2) continue;
      // มุมดำต้องมีกระดาษขาวล้อมรอบ (คีย์บอร์ด/ลายพื้นมีสี่เหลี่ยมดำติดกันหลายอัน — ตัดทิ้ง)
      const side = Math.sqrt(n), ring = [];
      for (const k of [0.95, 1.15]) for (let a = 0; a < 32; a++) {
        const t = a * Math.PI / 16;
        const x = Math.round(cx + Math.cos(t) * side * k), y = Math.round(cy + Math.sin(t) * side * k);
        if (x >= 0 && y >= 0 && x < w && y < h) ring.push(g[y * w + x]); // มุมชิดขอบภาพได้ — ข้ามจุดที่หลุดภาพ
      }
      if (ring.length < 24) continue;
      ring.sort((p, q) => p - q);
      const inner = g[Math.round(cy) * w + Math.round(cx)];
      const lo = ring[Math.floor(ring.length * 0.1)], med = ring[ring.length >> 1];
      if (lo < inner + 0.45 * (med - inner) || med < inner * 1.6 + 25) continue;
      blobs.push({ x: cx, y: cy, area: n });
    }
    if (blobs.length < 4) return null;

    // ลองทุกชุด 4 กลุ่มที่รูปร่างเข้าเค้า แล้วเลือกชุดที่ "วงกลมบนกระดาษตรงตำแหน่ง" มากที่สุด
    // (ไม่เลือกตามขนาด — ฉากหลังอย่างคีย์บอร์ดมีสี่เหลี่ยมดำใหญ่กว่ามุมกระดาษได้)
    const cand = blobs.sort((a, b) => b.area - a.area).slice(0, 18);
    const L = OMR_LAYOUT.marker.centers;
    const expRatio = (L[1][0] - L[0][0]) / (L[2][1] - L[0][1]); // กว้าง/สูง ≈ 0.674
    let best = null;
    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    for (let a = 0; a < cand.length; a++)
      for (let b = a + 1; b < cand.length; b++)
        for (let c = b + 1; c < cand.length; c++)
          for (let d = c + 1; d < cand.length; d++) {
            const q = [cand[a], cand[b], cand[c], cand[d]];
            const areas = q.map(p => p.area);
            if (Math.max(...areas) / Math.min(...areas) > 4) continue;
            const ord = this.orderCorners(q);
            if (!ord) continue;
            const [tl, tr, bl, br] = ord;
            const wTop = dist(tl, tr), wBot = dist(bl, br), hL = dist(tl, bl), hR = dist(tr, br);
            const ratio = ((wTop + wBot) / 2) / ((hL + hR) / 2);
            // ต้องถือกระดาษแนวตั้ง (แนวนอนแยกไม่ได้ว่าหมุนทางไหน)
            if (ratio / expRatio < 0.6 || ratio / expRatio > 1.6) continue;
            if (Math.min(wTop, wBot) / Math.max(wTop, wBot) < 0.5 || Math.min(hL, hR) / Math.max(hL, hR) < 0.5) continue;
            const markerSide = Math.sqrt(areas.reduce((s, v) => s + v, 0) / 4);
            // มุมดำต้องเล็กกว่าระยะห่างระหว่างมุมมาก (10 มม. เทียบ 180 มม.)
            const sideRel = markerSide / Math.min(wTop, wBot, hL, hR);
            if (sideRel < 0.02 || sideRel > 0.15) continue;
            const score = this.fitScore(img, ord);
            if (!best || score > best.score) best = { score, ord };
          }
    if (!best || best.score < this.MIN_FIT) return null;
    return best.ord;
  },

  MIN_FIT: 0.05,

  // ความเข้ากันของมุมที่เลือกกับแบบกระดาษ: เส้นขอบวงกลม (เลขประจำตัว + ปลายหัวคอลัมน์) ต้องเข้มกว่ากระดาษรอบๆ
  // คืนค่าความต่างเฉลี่ย (0 = ไม่ตรงเลย) — ทดสอบได้ทั้งแบบตั้งตรงและกลับหัว
  fitScore(img, ord) {
    const Lm = OMR_LAYOUT;
    const pts = [];
    for (let d = 0; d < Lm.id.digits; d++) for (const v of [0, 2, 4, 6, 8, 9]) pts.push(Lm.idBubble(d, v));
    for (let i = 0; i < 6; i++) for (const k of [0, 3]) pts.push(Lm.answerBubble(i, k)); // ข้อ 1–6 มีทุกวิชา
    const evalH = (corners) => {
      const H = this.homography(Lm.marker.centers, corners.map(p => [p.x, p.y]));
      let s = 0;
      for (const [x, y] of pts) s += this.outlineContrast(img, H, x, y, Lm.bubbleR);
      return s / pts.length;
    };
    const [tl, tr, bl, br] = ord;
    return Math.max(evalH(ord), evalH([br, bl, tr, tl]));
  },

  // ความต่างระหว่างเส้นวงกลม (รัศมี ~r) กับกระดาษรอบนอก — ค่าบวก = เห็นวงกลมตรงตำแหน่งนั้น
  outlineContrast(img, H, mx, my, r) {
    const { g, w, h } = img;
    const at = (x, y) => {
      const [px, py] = this.project(H, x, y);
      const ix = Math.round(px), iy = Math.round(py);
      return (ix >= 0 && iy >= 0 && ix < w && iy < h) ? g[iy * w + ix] : -1;
    };
    let ringMin = 255;
    for (const k of [0.85, 1, 1.15]) {
      let s = 0, n = 0;
      for (let a = 0; a < 16; a++) {
        const t = a * Math.PI / 8, v = at(mx + Math.cos(t) * r * k, my + Math.sin(t) * r * k);
        if (v < 0) return -1;
        s += v; n++;
      }
      ringMin = Math.min(ringMin, s / n);
    }
    const out = [];
    for (let a = 0; a < 16; a++) {
      const t = a * Math.PI / 8, v = at(mx + Math.cos(t) * r * 1.3, my + Math.sin(t) * r * 1.3);
      if (v < 0) return -1;
      out.push(v);
    }
    out.sort((p, q) => p - q);
    const paper = Math.max(out[12], 40);
    return Math.max(-0.2, Math.min(0.5, (paper - ringMin) / paper));
  },

  // เรียง 4 จุดเป็น TL, TR, BL, BR ตามตำแหน่งบนภาพ
  orderCorners(pts) {
    const cx = pts.reduce((s, p) => s + p.x, 0) / 4, cy = pts.reduce((s, p) => s + p.y, 0) / 4;
    const byAngle = [...pts].sort((p, q) => Math.atan2(p.y - cy, p.x - cx) - Math.atan2(q.y - cy, q.x - cx));
    // byAngle วนตามเข็มนาฬิกา (แกน y ชี้ลง) เริ่มจากซ้ายบนโดยประมาณ
    let start = 0, bestS = Infinity;
    byAngle.forEach((p, i) => { const s = p.x + p.y; if (s < bestS) { bestS = s; start = i; } });
    const r = [0, 1, 2, 3].map(i => byAngle[(start + i) % 4]); // TL, TR, BR, BL
    // ตรวจว่าเป็นรูปนูน
    for (let i = 0; i < 4; i++) {
      const a = r[i], b = r[(i + 1) % 4], c = r[(i + 2) % 4];
      if ((b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x) <= 0) return null;
    }
    return [r[0], r[1], r[3], r[2]];
  },

  // ---- homography: แก้สมการ 8×8 จาก 4 คู่จุด ----
  homography(src, dst) {
    const A = [], bv = [];
    for (let i = 0; i < 4; i++) {
      const [x, y] = src[i], [u, v] = dst[i];
      A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); bv.push(u);
      A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); bv.push(v);
    }
    for (let c = 0; c < 8; c++) {
      let piv = c;
      for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
      [A[c], A[piv]] = [A[piv], A[c]]; [bv[c], bv[piv]] = [bv[piv], bv[c]];
      for (let r = 0; r < 8; r++) {
        if (r === c) continue;
        const f = A[r][c] / A[c][c];
        for (let k = c; k < 8; k++) A[r][k] -= f * A[c][k];
        bv[r] -= f * bv[c];
      }
    }
    const hh = bv.map((v, i) => v / A[i][i]);
    return [...hh, 1];
  },
  project(H, x, y) {
    const z = H[6] * x + H[7] * y + 1;
    return [(H[0] * x + H[1] * y + H[2]) / z, (H[3] * x + H[4] * y + H[5]) / z];
  },

  // ---- วัดว่าวงกลมที่ (mm) ถูกฝนกี่ส่วน (0–1) ----
  fillAt(img, H, mx, my, rMm) {
    const { g, w, h } = img;
    const [cx, cy] = this.project(H, mx, my);
    const [ex, ey] = this.project(H, mx + rMm, my);
    const rp = Math.hypot(ex - cx, ey - cy);
    // สีกระดาษรอบวงกลม (วงแหวนด้านนอก) — ใช้ค่าสว่างระดับสูง กันโดนเส้น/วงข้างๆ
    const ring = [];
    for (let a = 0; a < 24; a++) {
      const t = (a / 24) * Math.PI * 2;
      for (const k of [1.3, 1.45]) {
        const x = Math.round(cx + Math.cos(t) * rp * k), y = Math.round(cy + Math.sin(t) * rp * k);
        if (x >= 0 && y >= 0 && x < w && y < h) ring.push(g[y * w + x]);
      }
    }
    if (!ring.length) return 0;
    ring.sort((a, b) => a - b);
    const white = Math.max(ring[Math.floor(ring.length * 0.8)], 60);
    const lim = white * this.DARK_RATIO;
    const ri = rp * 0.62;
    let n = 0, dark = 0;
    for (let y = Math.floor(cy - ri); y <= Math.ceil(cy + ri); y++) {
      for (let x = Math.floor(cx - ri); x <= Math.ceil(cx + ri); x++) {
        if ((x - cx) ** 2 + (y - cy) ** 2 > ri * ri || x < 0 || y < 0 || x >= w || y >= h) continue;
        n++;
        if (g[y * w + x] < lim) dark++;
      }
    }
    return n ? dark / n : 0;
  },

  // เลือกคำตอบจากค่าความเข้มของแต่ละตัวเลือก
  pick(fills) {
    const filled = fills.map((f, i) => f >= this.FILLED ? i : -1).filter(i => i >= 0);
    const faint = fills.some(f => f >= this.FAINT && f < this.FILLED);
    if (filled.length === 1) return { index: filled[0], status: faint ? "unsure" : "ok" };
    if (filled.length > 1) return { index: null, status: "multi" };
    return { index: null, status: faint ? "unsure" : "blank" };
  },

  // ความเข้มเฉลี่ยในกรอบ (มม.) — ใช้ตรวจว่ากระดาษกลับหัวหรือไม่
  meanIn(img, H, x0, y0, x1, y1) {
    let s = 0, n = 0;
    for (let y = y0; y <= y1; y += 0.5) for (let x = x0; x <= x1; x += 0.5) {
      const [px, py] = this.project(H, x, y).map(Math.round);
      if (px >= 0 && py >= 0 && px < img.w && py < img.h) { s += img.g[py * img.w + px]; n++; }
    }
    return n ? s / n : 255;
  },

  // ---- อ่านทั้งแผ่น ----
  read(img, corners, questions) {
    const L = OMR_LAYOUT;
    let H = this.homography(L.marker.centers, corners.map(p => [p.x, p.y]));
    // หัวกระดาษ "กระดาษคำตอบ" (มีตัวหนังสือ) ต้องเข้มกว่าตำแหน่งตรงข้ามมุมล่างขวา (ว่าง) ไม่งั้นแปลว่ากลับหัว
    if (this.meanIn(img, H, 26, 11, 60, 16) > this.meanIn(img, H, 150, 281, 184, 286)) {
      corners = [corners[3], corners[2], corners[1], corners[0]];
      H = this.homography(L.marker.centers, corners.map(p => [p.x, p.y]));
    }
    const r = L.bubbleR;

    const digits = [];
    for (let d = 0; d < L.id.digits; d++) {
      const fills = [];
      for (let v = 0; v < 10; v++) { const [x, y] = L.idBubble(d, v); fills.push(this.fillAt(img, H, x, y, r)); }
      const p = this.pick(fills);
      digits.push({ value: p.index, status: p.status, fills });
    }
    const idOk = digits.every(d => d.status === "ok");
    const code = digits.map(d => d.value === null ? "?" : String(d.value)).join("");

    const answers = questions.slice(0, L.maxQuestions).map((q, i) => {
      if (q.type === "text") return { type: "text" };
      const fills = L.choices.map((_, k) => { const [x, y] = L.answerBubble(i, k); return this.fillAt(img, H, x, y, r); });
      const p = this.pick(fills);
      return { type: "choice", choice: p.index === null ? null : L.choices[p.index], status: p.status, fills };
    });
    return { H, corners, code, idOk, digits, answers };
  },
};
