(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ================= particles (confetti, hearts, sparkles) ================= */
  const fx = $("#fx");
  const ctx = fx.getContext("2d");
  let W, H, DPR;
  const parts = [];
  const resize = () => {
    DPR = Math.min(devicePixelRatio || 1, 2);
    W = fx.width = innerWidth * DPR;
    H = fx.height = innerHeight * DPR;
  };
  addEventListener("resize", resize);
  resize();

  const COLORS = ["#f6d6dc", "#e8a3b4", "#f2c46d", "#fffaf3", "#c97f95", "#b9a2e8"];
  const rand = (a, b) => a + Math.random() * (b - a);

  function confetti(n = 120, x = W / 2, y = H * 0.35) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), v = rand(4, 14) * DPR;
      parts.push({ kind: "conf", x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 6 * DPR, g: 0.28 * DPR,
        w: rand(5, 10) * DPR, h: rand(8, 16) * DPR, r: rand(0, 6), vr: rand(-0.3, 0.3), c: COLORS[i % COLORS.length], life: rand(120, 200) });
    }
  }
  function hearts(n = 24, fromBottom = true) {
    for (let i = 0; i < n; i++) {
      parts.push({ kind: "heart", x: rand(0, W), y: fromBottom ? H + rand(0, H * 0.3) : rand(0, H),
        vx: rand(-0.4, 0.4) * DPR, vy: -rand(1.2, 3) * DPR, g: 0, s: rand(10, 24) * DPR, r: rand(-0.4, 0.4), vr: 0,
        c: COLORS[Math.floor(rand(0, 3))], life: rand(220, 380), sway: rand(0, 6) });
    }
  }
  function sparkle() {
    parts.push({ kind: "spark", x: rand(0, W), y: rand(0, H), vx: 0, vy: -0.15 * DPR, g: 0, s: rand(1, 2.4) * DPR, life: rand(160, 300), max: 0 });
  }
  function drawHeart(p) {
    const s = p.s;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.r + Math.sin((p.sway += 0.04)) * 0.2);
    ctx.fillStyle = p.c;
    ctx.beginPath();
    ctx.moveTo(0, s * 0.3);
    ctx.bezierCurveTo(-s, -s * 0.4, -s * 0.4, -s, 0, -s * 0.45);
    ctx.bezierCurveTo(s * 0.4, -s, s, -s * 0.4, 0, s * 0.3);
    ctx.fill();
    ctx.restore();
  }
  function tick() {
    ctx.clearRect(0, 0, W, H);
    if (!reduceMotion && Math.random() < 0.25 && parts.length < 400) sparkle();
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life--;
      p.vy += p.g; p.x += p.vx; p.y += p.vy;
      if (p.kind === "conf") { p.vx *= 0.985; p.r += p.vr; }
      const alpha = Math.min(1, p.life / 40);
      ctx.globalAlpha = Math.max(0, alpha);
      if (p.kind === "conf") {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
        ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2)));
        ctx.restore();
      } else if (p.kind === "heart") {
        drawHeart(p);
      } else {
        p.max++;
        ctx.globalAlpha = Math.max(0, Math.sin((p.max / 300) * Math.PI)) * 0.7;
        ctx.fillStyle = "#fff3d6";
        ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2); ctx.fill();
      }
      if (p.life <= 0 || p.y > H + 60 * DPR) parts.splice(i, 1);
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  /* ================= music box (Web Audio) ================= */
  const musicBtn = $("#music");
  let ac, master, playing = false, timer, nextTime = 0, step = 0;
  const N = (n) => 440 * Math.pow(2, (n - 69) / 12);
  const [G4, A4, B4, C5, D5, E5, F5, G5] = [67, 69, 71, 72, 74, 76, 77, 79];
  // Happy Birthday in C major, 3/4 — [midi, beats]
  const MELODY = [
    [G4, .75], [G4, .25], [A4, 1], [G4, 1], [C5, 1], [B4, 2],
    [G4, .75], [G4, .25], [A4, 1], [G4, 1], [D5, 1], [C5, 2],
    [G4, .75], [G4, .25], [G5, 1], [E5, 1], [C5, 1], [B4, 1], [A4, 1],
    [F5, .75], [F5, .25], [E5, 1], [C5, 1], [D5, 1], [C5, 3], [0, 3],
  ];
  // chord roots per bar (after the 1-beat pickup)
  const CHORDS = [[0, 1], [48, 3], [43, 3], [43, 3], [48, 3], [48, 3], [41, 3], [48, 2], [43, 1], [48, 3], [0, 3]];
  const BPM = 76, BEAT = 60 / BPM;
  const events = [];
  (() => {
    let t = 0;
    for (const [n, b] of MELODY) { if (n) events.push({ t, n, kind: "box" }); t += b; }
    let c = 0;
    for (const [n, b] of CHORDS) { if (n) events.push({ t: c, n, kind: "pad", d: b }); c += b; }
    events.loop = t;
    events.sort((a, b) => a.t - b.t);
  })();

  function reverb() {
    const len = ac.sampleRate * 2.4, buf = ac.createBuffer(2, len, ac.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    const c = ac.createConvolver(); c.buffer = buf; return c;
  }
  function initAudio() {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain(); master.gain.value = 0;
    const dry = ac.createGain(); dry.gain.value = 0.7;
    const wet = ac.createGain(); wet.gain.value = 0.5;
    const rv = reverb();
    master.connect(dry).connect(ac.destination);
    master.connect(rv).connect(wet).connect(ac.destination);
  }
  function box(freq, t) {
    [[1, 0.22], [2, 0.06], [3.01, 0.025]].forEach(([m, g]) => {
      const o = ac.createOscillator(), gn = ac.createGain();
      o.type = "sine"; o.frequency.value = freq * m;
      gn.gain.setValueAtTime(0, t);
      gn.gain.linearRampToValueAtTime(g, t + 0.006);
      gn.gain.exponentialRampToValueAtTime(0.0001, t + 2.6 / m);
      o.connect(gn).connect(master); o.start(t); o.stop(t + 2.7);
    });
  }
  function pad(freq, t, dur) {
    [1, 1.5, 2.52].forEach((m, i) => {
      const o = ac.createOscillator(), gn = ac.createGain(), f = ac.createBiquadFilter();
      o.type = "triangle"; o.frequency.value = freq * (i === 2 ? 2 : m) * (i === 2 ? 1.26 : 1);
      f.type = "lowpass"; f.frequency.value = 700;
      gn.gain.setValueAtTime(0, t);
      gn.gain.linearRampToValueAtTime(0.035, t + 0.4);
      gn.gain.linearRampToValueAtTime(0, t + dur);
      o.connect(f).connect(gn).connect(master); o.start(t); o.stop(t + dur + 0.1);
    });
  }
  let loopStart = 0;
  function scheduler() {
    const ahead = ac.currentTime + 0.35;
    while (true) {
      const ev = events[step % events.length];
      const loopIdx = Math.floor(step / events.length);
      const at = loopStart + (loopIdx * events.loop + ev.t) * BEAT;
      if (at > ahead) break;
      if (ev.kind === "box") box(N(ev.n), at);
      else pad(N(ev.n), at, ev.d * BEAT);
      step++;
    }
  }
  function startMusic() {
    if (!ac) initAudio();
    ac.resume();
    if (!timer) { loopStart = ac.currentTime + 0.1; step = 0; timer = setInterval(scheduler, 80); }
    master.gain.cancelScheduledValues(ac.currentTime);
    master.gain.setValueAtTime(master.gain.value, ac.currentTime);
    master.gain.linearRampToValueAtTime(0.9, ac.currentTime + 1.2);
    playing = true;
    musicBtn.hidden = false;
    musicBtn.classList.add("is-on"); musicBtn.classList.remove("is-off");
  }
  function stopMusic() {
    if (!ac) return;
    master.gain.cancelScheduledValues(ac.currentTime);
    master.gain.setValueAtTime(master.gain.value, ac.currentTime);
    master.gain.linearRampToValueAtTime(0, ac.currentTime + 0.6);
    playing = false;
    musicBtn.classList.remove("is-on"); musicBtn.classList.add("is-off");
  }
  musicBtn.addEventListener("click", () => (playing ? stopMusic() : startMusic()));

  /* ================= scene navigation ================= */
  const enter = {};
  function show(id) {
    $$(".scene").forEach((s) => s.classList.remove("is-active"));
    const el = $("#" + id);
    el.classList.add("is-active");
    scrollTo({ top: 0, behavior: "instant" });
    enter[id] && enter[id](el);
  }
  $$("[data-next]").forEach((b) => b.addEventListener("click", () => show(b.dataset.next)));

  /* ================= 1. sorry ================= */
  const noBtn = $("#noforgive"), hint = $("#sorryHint");
  const pleas = [
    "yah… 🥺 coba sekali lagi?",
    "aku beneran nyesel kok…",
    "bertahun-tahun lho kita temenan 😭",
    "nanti aku traktir deh, janji!",
    "oke tombolnya udah nyerah, kamu juga ya? 🤍",
  ];
  let tries = 0;
  function dodge(e) {
    if (tries >= pleas.length) return;
    e && e.preventDefault();
    hint.textContent = pleas[tries];
    tries++;
    const dx = rand(-130, 130), dy = rand(-90, 50);
    noBtn.style.transform = `translate(${dx}px, ${dy}px) rotate(${rand(-12, 12)}deg) scale(${1 - tries * 0.12})`;
    if (tries >= pleas.length) {
      noBtn.style.transform = "";
      noBtn.textContent = "Iya deh, aku maafin 🥹";
      noBtn.className = "btn btn--primary";
    }
  }
  noBtn.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") dodge(e); });
  noBtn.addEventListener("click", (e) => (tries >= pleas.length ? forgive() : dodge(e)));
  $("#forgive").addEventListener("click", forgive);
  function forgive() {
    startMusic();
    confetti(160);
    hearts(30);
    setTimeout(() => show("s-cake"), 700);
  }

  /* ================= 2. cake ================= */
  const candlesEl = $("#candles");
  const CANDLE_COUNT = 7;
  let lit = CANDLE_COUNT;
  for (let i = 0; i < CANDLE_COUNT; i++) {
    const c = document.createElement("button");
    c.className = "candle";
    c.setAttribute("aria-label", `Tiup lilin ${i + 1}`);
    c.style.height = `${40 + Math.sin(i * 1.7) * 8}px`;
    c.innerHTML = '<span class="flame"></span>';
    c.addEventListener("click", () => {
      if (c.classList.contains("is-out")) return;
      c.classList.add("is-out");
      const sm = document.createElement("span"); sm.className = "smoke"; c.appendChild(sm);
      if (--lit === 0) wished();
    });
    candlesEl.appendChild(c);
  }
  function wished() {
    const r = $("#cake").getBoundingClientRect();
    setTimeout(() => {
      confetti(200, (r.left + r.width / 2) * DPR, r.top * DPR);
      $("#cakeHint").innerHTML = "Semoga semua permohonanmu terkabul, Dini. <strong>Aamiin</strong> 🤍";
      $("#cakeNext").hidden = false;
    }, 500);
  }

  /* ================= 3. journey ================= */
  $$(".card").forEach((c) => c.addEventListener("click", () => {
    c.classList.toggle("is-flipped");
    if (c.classList.contains("is-flipped")) {
      const r = c.getBoundingClientRect();
      for (let i = 0; i < 6; i++) parts.push({ kind: "heart", x: (r.left + rand(0, r.width)) * DPR, y: r.top * DPR + 20, vx: rand(-1, 1) * DPR, vy: -rand(1.5, 3) * DPR, g: 0, s: rand(8, 14) * DPR, r: 0, vr: 0, c: COLORS[i % 3], life: 120, sway: rand(0, 6) });
    }
  }));
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
  }), { threshold: 0.2 });
  $$(".tl").forEach((t) => io.observe(t));

  // ~ the first day of TK, July 2010
  const since = new Date(2010, 6, 12);
  const totalDays = Math.floor((Date.now() - since) / 864e5);
  const daysEl = $("#days");
  const cio = new IntersectionObserver((entries) => {
    if (!entries[0].isIntersecting) return;
    cio.disconnect();
    const t0 = performance.now(), dur = 2600;
    const run = (t) => {
      const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      daysEl.textContent = Math.round(totalDays * e).toLocaleString("id-ID");
      if (k < 1) requestAnimationFrame(run);
      else hearts(14);
    };
    requestAnimationFrame(run);
  }, { threshold: 0.6 });
  cio.observe($(".counter"));

  /* ================= 4. scratch ================= */
  const scratch = $("#scratch"), sc = $("#scratchCanvas"), sx = sc.getContext("2d");
  let scratchReady = false, scratched = false, moves = 0;
  enter["s-scratch"] = () => {
    if (scratchReady) return;
    scratchReady = true;
    requestAnimationFrame(() => {
      const r = sc.getBoundingClientRect();
      sc.width = r.width * DPR; sc.height = r.height * DPR;
      const g = sx.createLinearGradient(0, 0, sc.width, sc.height);
      g.addColorStop(0, "#e8a3b4"); g.addColorStop(0.5, "#f2c46d"); g.addColorStop(1, "#c97f95");
      sx.fillStyle = g; sx.fillRect(0, 0, sc.width, sc.height);
      sx.fillStyle = "rgba(255,255,255,.35)";
      for (let i = 0; i < 70; i++) { sx.beginPath(); sx.arc(rand(0, sc.width), rand(0, sc.height), rand(1, 4) * DPR, 0, 7); sx.fill(); }
      sx.fillStyle = "#4a2445"; sx.textAlign = "center";
      sx.font = `700 ${34 * DPR}px Caveat, cursive`;
      sx.fillText("gosok di sini ✨", sc.width / 2, sc.height / 2);
      sx.font = `600 ${16 * DPR}px Nunito, sans-serif`;
      sx.fillText("ada kita di baliknya", sc.width / 2, sc.height / 2 + 34 * DPR);
    });
  };
  let drawing = false, last = null;
  const pos = (e) => { const r = sc.getBoundingClientRect(); return { x: (e.clientX - r.left) * DPR, y: (e.clientY - r.top) * DPR }; };
  sc.addEventListener("pointerdown", (e) => { drawing = true; last = pos(e); sc.setPointerCapture(e.pointerId); scratchAt(last); });
  sc.addEventListener("pointermove", (e) => { if (drawing) scratchAt(pos(e)); });
  ["pointerup", "pointercancel"].forEach((t) => sc.addEventListener(t, () => { drawing = false; last = null; }));
  function scratchAt(p) {
    sx.globalCompositeOperation = "destination-out";
    sx.lineWidth = 48 * DPR; sx.lineCap = "round";
    sx.beginPath(); sx.moveTo(last.x, last.y); sx.lineTo(p.x, p.y); sx.stroke();
    last = p;
    if (++moves % 12 === 0) checkScratch();
  }
  function checkScratch() {
    if (scratched) return;
    const d = sx.getImageData(0, 0, sc.width, sc.height).data;
    let clear = 0;
    for (let i = 3; i < d.length; i += 64) if (d[i] === 0) clear++;
    if (clear / (d.length / 64) > 0.5) {
      scratched = true;
      scratch.classList.add("is-done");
      confetti(140);
      $("#scratchHint").textContent = "LLucu banget wkwk"
    }
  }

  /* ================= 5. letter ================= */
  const LETTER = `Dini,

Selamat ulang tahun yang ke-21. Kita kenal dari lama banget gak sih. Dari zaman belum bisa nulis nama sendiri dengan rapi, sampai sekarang udah sama-sama 21. Belasan tahun tuh kita udah kenal. Wow, lama banget. Bosan gak wkwk.
Makasih udah temenan samaku yaw. Makasih udah jadi temen ngobrol, ngobrolin dunia dan hidup kita yang beda tapi somehow tetap sejalan. Makasih udah tetap jadi Dini, temenku yang baik hati dan penyabar serta sholeha.
Di umur yang baru ini, aku doain kamu selalu sehat, selalu bahagia, dan semua yang lagi kamu perjuangin pelan-pelan jadi nyata. Kalau capek, istirahat. Kalau sedih, boleh yapping.

Semoga kita ketemu terus, bahagia terus, sukses terus, reuni terus, dan bertemen terus, sampai nanti kita tua dan masih ngetawain foto-foto ini bareng.

Thank you so much, Dini.
Sayang kamu, selalu. 🤍

— Eiffel`;
  const env = $("#envelope"), body = $("#letterBody");
  let opened = false, typing = null;
  function openEnvelope() {
    if (opened) { if (typing) typing.skip(); return; }
    opened = true;
    env.classList.add("is-open");
    $("#envHint").textContent = "";
    hearts(16);
    setTimeout(() => { env.classList.add("is-reading"); typeLetter(); }, 1700);
  }
  env.addEventListener("click", openEnvelope);
  env.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openEnvelope(); } });
  function typeLetter() {
    let i = 0, done = false;
    const caret = '<span class="caret"></span>';
    const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
    const finish = () => {
      done = true; typing = null;
      body.innerHTML = esc(LETTER);
      $("#letterNext").hidden = false;
      $("#envHint").textContent = "";
    };
    $("#envHint").textContent = "ketuk suratnya untuk lewati ketikan";
    const stepType = () => {
      if (done) return;
      i++;
      body.innerHTML = esc(LETTER.slice(0, i)) + caret;
      if (i >= LETTER.length) return finish();
      const ch = LETTER[i - 1];
      setTimeout(stepType, ch === "\n" ? 260 : /[.,—]/.test(ch) ? 180 : 32);
    };
    typing = { skip: finish };
    if (reduceMotion) finish(); else stepType();
  }

  /* ================= 6. wishes jar ================= */
  const WISHES = [
    ["Ketemu terus", "sesibuk apa pun nanti, kita selalu nyempetin."],
    ["Bahagia terus", "senyum kamu yang di foto-foto itu, jangan sampai hilang."],
    ["Sukses terus", "semua mimpi kamu, satu per satu kesampaian."],
    ["Reuni terus", "sama geng kita, setiap tahun, tanpa absen."],
    ["Bertemen terus", "dari kecil, sampai 21, sampai rambut kita putih."],
  ];
  const jarStars = $("#jarStars");
  WISHES.forEach((_, i) => {
    const s = document.createElement("i");
    s.textContent = "⭐";
    s.style.left = `${18 + (i % 3) * 30 + rand(-6, 6)}%`;
    s.style.bottom = `${10 + Math.floor(i / 3) * 22 + rand(0, 8)}%`;
    s.style.transform = `rotate(${rand(-30, 30)}deg)`;
    jarStars.appendChild(s);
  });
  let wishIdx = 0;
  const jar = $("#jar");
  jar.addEventListener("click", () => {
    if (wishIdx >= WISHES.length) return;
    jar.classList.remove("shake"); void jar.offsetWidth; jar.classList.add("shake");
    const star = jarStars.children[WISHES.length - 1 - wishIdx];
    star.style.opacity = 0; star.style.transform += " translateY(-80px)";
    const [t, s] = WISHES[wishIdx++];
    const li = document.createElement("li");
    li.className = "wish";
    li.innerHTML = `<span class="wish__star">⭐</span><div><strong>${t}</strong><span>${s}</span></div>`;
    $("#wishes").appendChild(li);
    const r = jar.getBoundingClientRect();
    confetti(40, (r.left + r.width / 2) * DPR, r.top * DPR);
    if (wishIdx === WISHES.length) {
      jar.setAttribute("aria-label", "Toples sudah kosong");
      setTimeout(() => { $("#wishNext").hidden = false; li.scrollIntoView({ behavior: "smooth", block: "center" }); }, 600);
    }
  });

  /* ================= 7. end ================= */
  enter["s-end"] = () => { setTimeout(() => { confetti(220); hearts(40); }, 400); };
  let hugs = 0;
  $("#hug").addEventListener("click", () => {
    hugs++;
    hearts(28);
    $("#hugCount").textContent = hugs === 1 ? "1 peluk terkirim ke Eiffel 🤗" : `${hugs} peluk terkirim ke Eiffel 🤗`;
  });
  $("#replay").addEventListener("click", () => location.reload());
})();
