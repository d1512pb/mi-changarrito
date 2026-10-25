/* Íconos de línea (24x24, currentColor) y dibujos de frutas/verduras estilo caricatura. */
const ICONS = {
  cart: '<path d="M2.5 4h2.2l2.3 10.3a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 1.9-1.4L21 8.5H6"/><circle cx="10" cy="20" r="1.6"/><circle cx="17" cy="20" r="1.6"/><path d="M10.5 8.5c-.2-2.3.7-4 2.6-4.9M13.6 8.5c.2-1.8 1.3-3.2 3.3-3.6M9 8.5C8.4 6.9 7.3 6 5.9 5.8"/>',
  map: '<path d="M9 4 3 6.2v13.6l6-2.2 6 2.2 6-2.2V4l-6 2.2L9 4z"/><path d="M9 4v13.6M15 6.2v13.6"/>',
  huacal: '<path d="M3 10h18v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-9z"/><path d="M3 15h18M8.5 10v10M15.5 10v10"/><circle cx="8" cy="6.6" r="2.6"/><circle cx="13.4" cy="6" r="2.6"/><path d="M17.5 8.6c.4-2.3 1.7-3.6 3.6-3.8"/>',
  wallet: '<path d="M4 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h11"/><path d="M15.5 13.5h4.5"/><path d="M9 10.5c-.6-.7-1.5-.9-2.3-.6-.9.3-1 1.5-.1 1.9l1.6.6c.9.4.8 1.7-.2 2-.8.3-1.8 0-2.3-.7M7.6 9v1M7.6 15v1"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 20.5c.8-3.8 4-6 8-6s7.2 2.2 8 6"/>',
  userBag: '<circle cx="9" cy="7" r="3.6"/><path d="M2.8 20.5c.6-3.6 3-6 6.2-6 1.2 0 2.3.3 3.2.9"/><path d="M13.5 13h8l-.9 8h-6.2z"/><path d="M15.6 13v-1.1a1.9 1.9 0 0 1 3.8 0V13"/>',
  stall: '<path d="M3 9 5 4h14l2 5"/><path d="M3 9a2.25 2.25 0 0 0 4.5 0 2.25 2.25 0 0 0 4.5 0 2.25 2.25 0 0 0 4.5 0 2.25 2.25 0 0 0 4.5 0"/><path d="M5 11.2V20h14v-8.8M9.5 20v-5h5v5"/>',
  board: '<rect x="4.5" y="4" width="15" height="17" rx="2"/><path d="M9 4V2.8h6V4"/><circle cx="12" cy="10.5" r="2.4"/><path d="M8 17c.7-1.9 2.2-3 4-3s3.3 1.1 4 3"/>',
  building: '<path d="M3 9.5 12 4l9 5.5"/><path d="M5 10v8.5M9.5 10v8.5M14.5 10v8.5M19 10v8.5M3 20.5h18"/>',
  camera: '<path d="M4 7.5h3l1.8-2.8h6.4L17 7.5h3a1 1 0 0 1 1 1V19a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8.5a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.6"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  pause: '<circle cx="12" cy="12" r="8.5"/><path d="M10 9v6M14 9v6"/>',
  msg: '<path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-5 3.5V6a1 1 0 0 1 1-1z"/><path d="M8 9.5h8M8 12.5h5"/>',
  star: '<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z"/>',
  heart: '<path d="M12 20s-7.5-4.4-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.6-7.5 10-7.5 10z"/>',
  card: '<rect x="2.5" y="5.5" width="19" height="13" rx="2"/><path d="M2.5 10h19M6 15h4"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  chev: '<path d="M9 5l7 7-7 7"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  gps: '<circle cx="12" cy="12" r="3.2"/><circle cx="12" cy="12" r="7.5"/><path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3"/>',
  phone: '<path d="M5 3.5h3.5l1.7 4.3-2.2 1.4a11 11 0 0 0 6.8 6.8l1.4-2.2 4.3 1.7V19a1.5 1.5 0 0 1-1.6 1.5A17 17 0 0 1 3.5 5.1 1.5 1.5 0 0 1 5 3.5z"/>',
  pin: '<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>',
  chart: '<path d="M4 20V4M4 20h16"/><path d="M8 16v-4M12 16V8M16 16v-6"/>',
  logout: '<path d="M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h5"/><path d="M15 8l4 4-4 4M19 12H9"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="m13.5 6.5 4 4"/>',
  trash: '<path d="M4 7h16M10 4h4M6 7l1 13h10l1-13M10 11v6M14 11v6"/>',
  image: '<rect x="3" y="4.5" width="18" height="15" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="m21 16-5-5-9 8.5"/>',
  send: '<path d="M4 12 20 4l-5 16-3.5-6.5L4 12z"/><path d="M11.5 13.5 20 4"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  social: '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="m8.2 10.8 7.6-3.6M8.2 13.2l7.6 3.6"/>',
  shield: '<path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.2 7.5 9.5 4.3-1.3 7.5-4.9 7.5-9.5V6z"/><path d="m9 12 2.2 2.2L15.5 10"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
  users: '<circle cx="9" cy="8" r="3.4"/><path d="M2.8 19.5c.6-3.3 3-5.5 6.2-5.5s5.6 2.2 6.2 5.5"/><path d="M15.5 4.9a3.4 3.4 0 0 1 0 6.3M17.6 14.3c1.9.7 3.2 2.6 3.6 5.2"/>',
  tag: '<path d="M3.5 12.5V4.5a1 1 0 0 1 1-1h8l8 8-9 9z"/><circle cx="8.5" cy="8.5" r="1.6"/>',
  sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  door: '<path d="M5 20.5V4.5a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v16M3 20.5h18"/><circle cx="15" cy="12.5" r="1"/>'
};

function icon(name, cls = "") {
  const solid = name === "star" || name === "heartFill";
  const body = ICONS[name === "heartFill" ? "heart" : name] || ICONS.tag;
  return `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true" fill="${solid ? "currentColor" : "none"}" stroke="currentColor" stroke-width="${solid ? 1.2 : 1.9}" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
}

/* Frutas y verduras de caricatura (viewBox 64x64, contorno grueso). */
const OUT = 'stroke="#1c3233" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"';
const FRUITS = {
  tomato: `<circle cx="32" cy="37" r="21" fill="#e04a55" ${OUT}/><path d="M32 18c-3 0-6 1-8 3l5 1-3 5 6-2 2 5 2-5 6 2-3-5 5-1c-2-2-5-3-8-3z" fill="#64ada6" ${OUT}/><ellipse cx="23" cy="32" rx="4" ry="6" fill="#fff" opacity=".45" transform="rotate(25 23 32)"/>`,
  carrot: `<path d="M21 24c4-3 18-3 22 0L34 59c-1 2-3 2-4 0z" fill="#f08a1c" ${OUT}/><path d="M26 33h6M28 41h5M30 49h3" ${OUT} fill="none"/><path d="M27 23c-3-6-1-11 3-14 0 5 1 9 2 13M37 23c3-6 1-11-3-14 0 5-1 9-2 13M32 22c0-6 0-10 0-15" fill="#64ada6" ${OUT}/>`,
  lemon: `<path d="M10 33c0-11 10-19 22-19s22 8 22 19-10 19-22 19S10 44 10 33z" fill="#f4a903" ${OUT}/><path d="M10 33 5 31M54 33l5-2" ${OUT}/><ellipse cx="24" cy="26" rx="6" ry="3" fill="#fff" opacity=".5" transform="rotate(-20 24 26)"/>`,
  chile: `<path d="M20 16c10 1 16 8 15 20-1 10-8 19-21 23 9-8 12-15 11-24-1-6-3-11-5-19z" fill="#b33208" ${OUT}/><path d="M20 16c1-5 5-8 10-8M17 15c2-2 5-3 8-2" fill="none" ${OUT}/><path d="M23 24c3 4 4 9 3 14" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" opacity=".45"/>`,
  avocado: `<path d="M32 6c7 0 10 9 13 18 4 10 9 14 9 21 0 9-9 15-22 15S10 54 10 45c0-7 5-11 9-21 3-9 6-18 13-18z" fill="#4f8a3a" ${OUT}/><path d="M32 13c5 0 7 7 9 13 3 8 7 12 7 18 0 7-7 11-16 11s-16-4-16-11c0-6 4-10 7-18 2-6 4-13 9-13z" fill="#dbe58c"/><circle cx="32" cy="41" r="8" fill="#8a5a2b" ${OUT}/>`,
  banana: `<path d="M8 22c2 17 18 30 36 28 6-1 10-4 12-8-12 6-30 0-38-14-2-4-3-7-3-9-3 0-6 1-7 3z" fill="#f6cc2e" ${OUT}/><path d="M15 19c-1-3 0-6 2-7" fill="none" ${OUT}/><path d="M56 42l3-1" ${OUT}/>`,
  watermelon: `<path d="M6 22h52c0 15-12 28-26 28S6 37 6 22z" fill="#365e60" ${OUT}/><path d="M11 22h42c0 12-9 23-21 23S11 34 11 22z" fill="#e61d68"/><g fill="#1c3233"><ellipse cx="22" cy="29" rx="1.6" ry="2.6"/><ellipse cx="32" cy="33" rx="1.6" ry="2.6"/><ellipse cx="42" cy="29" rx="1.6" ry="2.6"/><ellipse cx="27" cy="38" rx="1.6" ry="2.6"/><ellipse cx="37" cy="38" rx="1.6" ry="2.6"/></g>`,
  marigold: `<g ${OUT} fill="#f4a903">${[0,45,90,135,180,225,270,315].map(a=>`<ellipse cx="32" cy="16" rx="8" ry="11" transform="rotate(${a} 32 32)"/>`).join("")}</g><g fill="#f08a1c" ${OUT}>${[22,67,112,157,202,247,292,337].map(a=>`<ellipse cx="32" cy="22" rx="6" ry="8" transform="rotate(${a} 32 32)"/>`).join("")}</g><circle cx="32" cy="32" r="7" fill="#b33208" ${OUT}/>`,
  onion: `<path d="M32 12c5 8 20 12 20 28 0 11-9 18-20 18s-20-7-20-18c0-16 15-20 20-28z" fill="#c582c7" ${OUT}/><path d="M32 14c-3 9-7 16-7 26s3 16 7 18M32 14c3 9 7 16 7 26s-3 16-7 18" fill="none" ${OUT}/><path d="M32 12V5M29 6l3-1 3 1" fill="none" ${OUT}/>`,
  bread: `<path d="M8 40c0-12 11-22 24-22s24 10 24 22c0 5-4 8-9 8H17c-5 0-9-3-9-8z" fill="#e8a94f" ${OUT}/><path d="M18 30c4 3 6 7 6 12M30 26c3 4 4 9 3 15M42 28c2 4 2 9 0 13" fill="none" stroke="#fbe2b3" stroke-width="3" stroke-linecap="round"/>`
};
const FRUIT_KEYS = Object.keys(FRUITS);
function fruit(name, cls = "") {
  return `<svg class="fruit ${cls}" viewBox="0 0 64 64" aria-hidden="true">${FRUITS[name] || FRUITS.tomato}</svg>`;
}

/* Marca: huacal con jitomate y hoja. */
const LOGO_MARK = `<svg class="logo__mark" viewBox="0 0 64 64" aria-hidden="true"><circle cx="24" cy="22" r="12" fill="#e04a55" stroke="#1c3233" stroke-width="3"/><path d="M38 24c2-9 8-14 17-14-1 9-7 14-17 14z" fill="#64ada6" stroke="#1c3233" stroke-width="3" stroke-linejoin="round"/><path d="M8 30h48l-4 26H12z" fill="#f4a903" stroke="#1c3233" stroke-width="3" stroke-linejoin="round"/><path d="M10 43h44M24 30v26M40 30v26" stroke="#1c3233" stroke-width="3"/></svg>`;
