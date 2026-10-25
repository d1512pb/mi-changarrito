/* Cámara + reconocimiento óptico de etiquetas de precio (Tesseract.js, idioma español). */
const OCR = (() => {
  const CFG = window.HUACAL_CONFIG;
  let loading = null;

  function loadScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = src; s.async = true; s.onload = res; s.onerror = () => rej(new Error("No se pudo cargar " + src));
      document.head.appendChild(s);
    });
  }
  function ready() {
    if (window.Tesseract) return Promise.resolve(true);
    if (!CFG.OCR_ENABLED) return Promise.resolve(false);
    loading = loading || loadScript(CFG.TESSERACT_CDN).then(() => !!window.Tesseract).catch(() => false);
    return loading;
  }

  async function recognize(blob, onProgress = () => { }) {
    const ok = await ready();
    if (!ok) throw new Error("ocr-unavailable");
    const job = Tesseract.recognize(blob, "spa", { logger: m => { if (m.status === "recognizing text") onProgress(m.progress); } });
    const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error("ocr-timeout")), CFG.OCR_TIMEOUT_MS));
    const res = await Promise.race([job, timeout]);
    return res.data.text || "";
  }

  /* Extrae nombre, precio y unidad del texto de una cartulina de precio típica de tianguis:
   * "JITOMATE SALADET  $28 EL KILO", "Aguacate 3x$100", "Cilantro 10 pesos manojo". */
  const UNIT_RX = [
    [/\b(1\/2|medio|½)\s*(kg|kilo)/i, "1/2kg"], [/\b(kg|kilo|kilos|k)\b/i, "kg"], [/\b(pza|pzas|pieza|piezas|c\/u|cu)\b/i, "pza"],
    [/\bmanojo/i, "manojo"], [/\bdocena/i, "docena"], [/\b(litro|lt|lts)\b/i, "litro"], [/\bcaja/i, "caja"], [/\bbolsa/i, "bolsa"],
    [/\bpliego/i, "pliego"], [/\borden/i, "orden"], [/\bvaso/i, "vaso"]
  ];
  function parse(text) {
    const clean = text.replace(/[|_~]/g, " ").replace(/[ \t]+/g, " ");
    const lines = clean.split(/\n+/).map(l => l.trim()).filter(Boolean);
    let price = null;
    const m = clean.match(/\$\s*(\d{1,4}(?:[.,]\d{1,2})?)/) || clean.match(/(\d{1,4}(?:[.,]\d{1,2})?)\s*(?:pesos|mxn|\$)/i) || clean.match(/\b(\d{1,4}(?:[.,]\d{1,2})?)\b/);
    if (m) price = parseFloat(m[1].replace(",", "."));
    let unit = "";
    for (const [rx, u] of UNIT_RX) if (rx.test(clean)) { unit = u; break; }
    const nameLine = lines
      .map(l => l.replace(/\$?\s*\d+([.,]\d+)?/g, " ").replace(/\b(el|la|por|kilo|kilos|kg|pza|pieza|manojo|docena|litro|caja|bolsa|pesos|c\/u|medio)\b/gi, " ").replace(/[^\p{L}\s]/gu, " ").replace(/\s+/g, " ").trim())
      .filter(l => l.length >= 3)
      .sort((a, b) => b.length - a.length)[0] || "";
    const name = nameLine ? nameLine.toLowerCase().replace(/(^|\s)\p{L}/u, c => c.toUpperCase()) : "";
    return { name, price, unit, raw: text };
  }

  /* Cartulina de ejemplo para probar el flujo sin cámara. */
  const SAMPLES = [
    { lines: ["JITOMATE", "SALADET"], price: "$28", unit: "EL KILO", text: "JITOMATE SALADET\n$28 EL KILO", bg: "#f4a903" },
    { lines: ["CHILE"], price: "$45", unit: "KILO", text: "CHILE MORITA\n$45 KILO", bg: "#64ada6", sub: "MORITA" },
    { lines: ["NOPALES"], price: "$15", unit: "BOLSA", text: "NOPALES\n$15 BOLSA", bg: "#c582c7" }
  ];
  function sampleImage(i = 0) {
    const s = SAMPLES[i % SAMPLES.length];
    const c = document.createElement("canvas"); c.width = 640; c.height = 480;
    const g = c.getContext("2d");
    g.fillStyle = "#c9b48d"; g.fillRect(0, 0, 640, 480);
    g.save(); g.translate(320, 240); g.rotate(-0.05);
    g.fillStyle = s.bg; g.fillRect(-250, -180, 500, 360);
    g.fillStyle = "#1c3233"; g.textAlign = "center";
    g.font = "900 64px 'Bungee', Impact, sans-serif";
    const title = s.lines.concat(s.sub ? [s.sub] : []);
    title.forEach((l, k) => g.fillText(l, 0, -100 + k * 66));
    g.font = "900 120px 'Bungee', Impact, sans-serif"; g.fillStyle = "#b33208"; g.fillText(s.price, 0, 110);
    g.font = "800 40px 'Figtree', sans-serif"; g.fillStyle = "#1c3233"; g.fillText(s.unit, 0, 160);
    g.restore();
    return { dataUrl: c.toDataURL("image/jpeg", .85), text: s.text };
  }

  /* Reduce una imagen para guardarla sin saturar el almacenamiento. */
  function shrink(src, max = 640, q = .78) {
    return new Promise(res => {
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        res(c.toDataURL("image/jpeg", q));
      };
      img.onerror = () => res(null);
      img.src = src;
    });
  }
  const fileToDataUrl = f => new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => res(null); r.readAsDataURL(f); });

  async function startCamera(video) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error("no-camera");
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } }, audio: false });
    video.srcObject = stream; await video.play();
    return stream;
  }
  function snap(video) {
    const c = document.createElement("canvas"); c.width = video.videoWidth; c.height = video.videoHeight;
    c.getContext("2d").drawImage(video, 0, 0);
    return c.toDataURL("image/jpeg", .9);
  }

  return { ready, recognize, parse, sampleImage, shrink, fileToDataUrl, startCamera, snap };
})();
