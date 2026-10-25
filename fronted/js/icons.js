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

/* Productos de tianguis en el mismo estilo. Las usa offerArt() cuando una oferta no trae foto. */
Object.assign(FRUITS, {
  tortilla: `<ellipse cx="32" cy="44" rx="23" ry="10" fill="#d99a4a" ${OUT}/><ellipse cx="32" cy="37" rx="23" ry="10" fill="#e8b765" ${OUT}/><ellipse cx="32" cy="30" rx="23" ry="10" fill="#f3d08f" ${OUT}/><g fill="#c47a2c"><circle cx="22" cy="29" r="1.8"/><circle cx="34" cy="26" r="1.8"/><circle cx="43" cy="31" r="1.8"/><circle cx="30" cy="33" r="1.4"/></g>`,
  egg: `<path d="M32 8c9 0 17 17 17 29 0 10-8 17-17 17S15 47 15 37C15 25 23 8 32 8z" fill="#fff4dc" ${OUT}/><ellipse cx="25" cy="30" rx="3.4" ry="7" fill="#fff" opacity=".85" transform="rotate(18 25 30)"/>`,
  milk: `<path d="M19 24 25 10h14l6 14z" fill="#e9eef0" ${OUT}/><path d="M19 24h26v32H19z" fill="#fff" ${OUT}/><path d="M19 38h26v10H19z" fill="#64ada6" ${OUT}/><path d="M32 27c-2 3-3 4.5-3 6a3 3 0 0 0 6 0c0-1.5-1-3-3-6z" fill="#4b8fd0" ${OUT}/>`,
  beans: `<path d="M8 30h48c0 14-9 24-24 24S8 44 8 30z" fill="#c46a3c" ${OUT}/><ellipse cx="32" cy="30" rx="24" ry="7" fill="#4a3025" ${OUT}/><g fill="#7a4b3a" stroke="#1c3233" stroke-width="1.6"><ellipse cx="22" cy="26" rx="3.6" ry="2.4" transform="rotate(-20 22 26)"/><ellipse cx="31" cy="23" rx="3.6" ry="2.4" transform="rotate(15 31 23)"/><ellipse cx="40" cy="26" rx="3.6" ry="2.4" transform="rotate(-10 40 26)"/><ellipse cx="27" cy="29" rx="3.6" ry="2.4" transform="rotate(20 27 29)"/><ellipse cx="36" cy="30" rx="3.6" ry="2.4" transform="rotate(-25 36 30)"/><ellipse cx="46" cy="30" rx="3.2" ry="2.2"/><ellipse cx="17" cy="31" rx="3.2" ry="2.2"/></g>`,
  papaya: `<path d="M32 6c14 2 22 16 20 30-2 14-12 22-20 22S14 50 12 36C10 22 18 8 32 6z" fill="#f08a1c" ${OUT}/><path d="M32 16c8 2 12 11 11 20-1 9-6 14-11 14s-10-5-11-14c-1-9 3-18 11-20z" fill="#f9b36b"/><g fill="#1c3233"><circle cx="28" cy="30" r="2"/><circle cx="35" cy="28" r="2"/><circle cx="32" cy="36" r="2"/><circle cx="27" cy="41" r="1.8"/><circle cx="37" cy="41" r="1.8"/></g>`,
  nopal: `<path d="M32 6c10 0 18 10 18 26 0 16-8 26-18 26S14 48 14 32C14 16 22 6 32 6z" fill="#5f9d4e" ${OUT}/><g stroke="#1c3233" stroke-width="2" stroke-linecap="round"><path d="M26 18l-3-3M38 16l3-3M24 30l-4-1M40 30l4-1M27 43l-3 3M37 43l3 3M32 24v-4M32 38v-4"/></g><g fill="#e9f0c9"><circle cx="27" cy="22" r="1.5"/><circle cx="37" cy="21" r="1.5"/><circle cx="23" cy="34" r="1.5"/><circle cx="41" cy="34" r="1.5"/><circle cx="32" cy="30" r="1.5"/><circle cx="28" cy="44" r="1.5"/><circle cx="36" cy="44" r="1.5"/></g>`,
  chicken: `<ellipse cx="38" cy="26" rx="17" ry="14" transform="rotate(-35 38 26)" fill="#d98a3a" ${OUT}/><path d="M28 36 14 50" stroke="#1c3233" stroke-width="9" stroke-linecap="round"/><path d="M28 36 14 50" stroke="#f7ecd2" stroke-width="5" stroke-linecap="round"/><circle cx="11" cy="47" r="4.2" fill="#f7ecd2" ${OUT}/><circle cx="16" cy="53" r="4.2" fill="#f7ecd2" ${OUT}/><path d="M33 18c4-3 9-3 12 0" stroke="#fff" opacity=".45" fill="none" stroke-width="3" stroke-linecap="round"/>`,
  cheese: `<path d="M6 22l24-10 28 18-52-8z" fill="#fbe08a" ${OUT}/><path d="M6 22l52 8v16H6z" fill="#f6cc2e" ${OUT}/><g fill="#e0a92a" stroke="#1c3233" stroke-width="1.8"><circle cx="18" cy="35" r="3.4"/><circle cx="36" cy="40" r="2.6"/><circle cx="49" cy="37" r="2.2"/></g>`,
  herb: `<path d="M32 56V34M26 56l-4-22M38 56l4-22" stroke="#1c3233" stroke-width="2.6" stroke-linecap="round" fill="none"/><g fill="#5aa04a" ${OUT}><circle cx="22" cy="28" r="9"/><circle cx="42" cy="28" r="9"/><circle cx="32" cy="21" r="10"/></g><g fill="#86c46b"><circle cx="29" cy="18" r="3"/><circle cx="19" cy="25" r="2.6"/><circle cx="40" cy="25" r="2.6"/></g><rect x="25" y="44" width="14" height="7" rx="2" fill="#f4a903" ${OUT}/>`,
  corn: `<path d="M32 6c9 0 14 12 14 26S41 52 32 52s-14-6-14-20S23 6 32 6z" fill="#f6cc2e" ${OUT}/><path d="M32 8v44M24 14c-3 8-3 22 0 32M40 14c3 8 3 22 0 32M19 24h26M18 34h28M20 44h24" stroke="#c9961a" stroke-width="1.6" fill="none"/><path d="M32 58c-12 0-20-8-22-22 8 4 14 8 22 8s14-4 22-8c-2 14-10 22-22 22z" fill="#6aa84f" ${OUT}/>`,
  potato: `<path d="M10 34c0-12 12-20 24-20 14 0 22 8 20 20-2 12-12 18-24 18S10 44 10 34z" fill="#c9a06a" ${OUT}/><g fill="#8a6a3c"><circle cx="24" cy="31" r="1.8"/><circle cx="38" cy="26" r="1.8"/><circle cx="41" cy="40" r="1.8"/><circle cx="26" cy="43" r="1.8"/><circle cx="33" cy="35" r="1.4"/></g><ellipse cx="22" cy="24" rx="5" ry="2.6" fill="#fff" opacity=".4" transform="rotate(-25 22 24)"/>`,
  mango: `<path d="M12 36C12 20 24 10 38 12c12 2 16 14 12 28-4 12-16 16-26 12-8-3-12-8-12-16z" fill="#f08a1c" ${OUT}/><path d="M30 14c4-6 12-6 18-2-4 6-12 8-18 2z" fill="#64ada6" ${OUT}/><path d="M20 28c4-5 9-8 15-8" stroke="#f6cc2e" stroke-width="5" opacity=".75" stroke-linecap="round" fill="none"/><ellipse cx="22" cy="40" rx="3.4" ry="6" fill="#fff" opacity=".35" transform="rotate(25 22 40)"/>`,
  strawberry: `<path d="M32 56C14 46 8 32 12 22c3-7 12-7 20-2 8-5 17-5 20 2 4 10-2 24-20 34z" fill="#e0314b" ${OUT}/><path d="M20 20c4-4 7-7 12-7s8 3 12 7c-4 0-8 3-12 3s-8-3-12-3z" fill="#4f8a3a" ${OUT}/><g fill="#ffe8a3"><ellipse cx="22" cy="32" rx="1.3" ry="2"/><ellipse cx="32" cy="35" rx="1.3" ry="2"/><ellipse cx="42" cy="32" rx="1.3" ry="2"/><ellipse cx="27" cy="43" rx="1.3" ry="2"/><ellipse cx="37" cy="43" rx="1.3" ry="2"/><ellipse cx="32" cy="50" rx="1.3" ry="2"/><ellipse cx="17" cy="26" rx="1.3" ry="2"/><ellipse cx="47" cy="26" rx="1.3" ry="2"/></g>`,
  apple: `<path d="M32 18c-6-5-20-4-20 14 0 14 9 24 20 24s20-10 20-24c0-18-14-19-20-14z" fill="#d93b3b" ${OUT}/><path d="M32 18c0-5 2-9 6-12" fill="none" ${OUT}/><path d="M36 11c5-4 11-3 14 1-4 4-10 4-14-1z" fill="#4f8a3a" ${OUT}/><ellipse cx="22" cy="32" rx="3.4" ry="7" fill="#fff" opacity=".4" transform="rotate(15 22 32)"/>`,
  orange: `<circle cx="32" cy="36" r="22" fill="#f58a1a" ${OUT}/><path d="M32 15c-3-4-2-8 2-10 4 2 5 6 3 10z" fill="#4f8a3a" ${OUT}/><ellipse cx="22" cy="28" rx="4.4" ry="7" fill="#fff" opacity=".35" transform="rotate(25 22 28)"/><g fill="#d96d0c"><circle cx="38" cy="30" r="1.1"/><circle cx="44" cy="40" r="1.1"/><circle cx="30" cy="46" r="1.1"/><circle cx="24" cy="40" r="1.1"/><circle cx="36" cy="40" r="1.1"/></g>`,
  taco: `<path d="M12 36c2-8 8-12 14-10 2-6 10-8 14-2 6-2 10 4 12 10z" fill="#5aa04a" ${OUT}/><circle cx="26" cy="30" r="5" fill="#f4a903" ${OUT}/><circle cx="40" cy="28" r="4" fill="#8a4b2a" ${OUT}/><path d="M5 50c0-16 11-24 27-24s27 8 27 24z" fill="#f0c36d" ${OUT}/><path d="M16 46c3-8 9-12 16-12" stroke="#c98d2a" stroke-width="2.4" fill="none" stroke-linecap="round"/>`,
  plate: `<path d="M24 22c-3-4 3-6 0-10M32 20c-3-4 3-6 0-10M40 22c-3-4 3-6 0-10" stroke="#1c3233" fill="none" stroke-width="2.4" stroke-linecap="round" opacity=".55"/><ellipse cx="32" cy="40" rx="27" ry="15" fill="#fff8ea" ${OUT}/><ellipse cx="32" cy="40" rx="19" ry="9.5" fill="#f3e6c9"/><ellipse cx="24" cy="39" rx="8" ry="5" fill="#eed38a" ${OUT}/><ellipse cx="39" cy="38" rx="9" ry="5.5" fill="#b5623a" ${OUT}/><circle cx="31" cy="44" r="3" fill="#5aa04a" ${OUT}/>`,
  drink: `<path d="M18 16h28l-4 40H22z" fill="#fde7ee"/><path d="M19.400 28h25.200l-2.6 28H22z" fill="#e61d68" opacity=".9"/><path d="M18 16h28l-4 40H22z" fill="none" ${OUT}/><path d="M38 6l-4 24" stroke="#1c3233" stroke-width="3.2" stroke-linecap="round"/><rect x="24" y="32" width="8" height="8" rx="2" fill="#fff" opacity=".6" transform="rotate(12 28 36)"/>`,
  tamal: `<path d="M6 36c0-9 10-15 26-15s26 6 26 15-10 15-26 15S6 45 6 36z" fill="#e8d29a" ${OUT}/><path d="M12 31c8 3 16 4 20 4s12-1 20-4M12 41c8-3 16-4 20-4s12 1 20 4" stroke="#b79a52" stroke-width="2" fill="none"/><path d="M32 21v30" stroke="#8a5a2b" stroke-width="3.5" stroke-linecap="round"/><path d="M6 36 1 31M6 36 1 41M58 36l5-5M58 36l5 5" stroke="#1c3233" stroke-width="2.6" stroke-linecap="round"/>`,
  panmuerto: `<path d="M8 44c0-14 11-24 24-24s24 10 24 24c0 5-4 8-9 8H17c-5 0-9-3-9-8z" fill="#e8a94f" ${OUT}/><path d="M20 28c-3 6-4 14-2 21M44 28c3 6 4 14 2 21M32 25v25" stroke="#fbe2b3" stroke-width="4.4" stroke-linecap="round" fill="none"/><circle cx="32" cy="18" r="5.5" fill="#fbe2b3" ${OUT}/><g fill="#fff"><circle cx="26" cy="36" r="1.2"/><circle cx="38" cy="38" r="1.2"/><circle cx="30" cy="46" r="1.2"/><circle cx="40" cy="30" r="1.2"/></g>`,
  crate: `<path d="M14 26c-2-9 3-15 11-16 0 8-3 14-11 16z" fill="#64ada6" ${OUT}/><path d="M48 24c2-8-2-14-10-15 0 8 3 13 10 15z" fill="#64ada6" ${OUT}/><circle cx="32" cy="22" r="9" fill="#f6cc2e" ${OUT}/><path d="M6 28h52l-5 29H11z" fill="#f4a903" ${OUT}/><path d="M8 42h48M24 28v29M40 28v29" ${OUT} fill="none"/>`,
  bunting: `<path d="M4 16Q32 30 60 16" fill="none" ${OUT}/>` + [[9.6, 18.5, "#e61d68"], [23.6, 22.4, "#f4a903"], [40.4, 22.4, "#64ada6"], [54.4, 18.5, "#c582c7"]].map(([x, y, color]) => `<path d="M${x - 5.5} ${y}h11v22l-2.75-4-2.75 4-2.75-4-2.75 4z" fill="${color}" ${OUT}/>`).join("")
});
function fruit(name, cls = "") {
  return `<svg class="fruit ${cls}" viewBox="0 0 64 64" aria-hidden="true">${FRUITS[name] || FRUITS.crate}</svg>`;
}

/* Imagen de un producto sin foto: la primera regla que coincide con su nombre; si ninguna, el huacal. */
const ART_RULES = [
  [/\b(agua|atole|champurrado|horchata|licuado|refresco|cafe)\b|jugo de|jamaica/, "drink"],
  [/taco|quesadilla|gordita|sope|tlayuda|\btorta\b/, "taco"],
  [/comida|caldo|sopa|pozole|menu|guisado|desayuno/, "plate"],
  [/tamal/, "tamal"], [/pan de muerto/, "panmuerto"], [/papel picado/, "bunting"],
  [/\bpan\b|bolillo|concha|cuernito|telera|birote/, "bread"],
  [/tortilla|tostada|masa|totopo/, "tortilla"], [/huevo/, "egg"],
  [/queso|panela|oaxaca|requeson/, "cheese"], [/leche|crema|yogur/, "milk"],
  [/frijol|lenteja|garbanzo/, "beans"], [/pollo|pechuga|muslo|pierna|alita/, "chicken"],
  [/limon/, "lemon"], [/naranja|mandarina|toronja/, "orange"], [/mango/, "mango"], [/fresa/, "strawberry"],
  [/manzana/, "apple"], [/papaya/, "papaya"], [/platano|banana/, "banana"], [/sandia|melon/, "watermelon"],
  [/aguacate/, "avocado"], [/jitomate|tomate/, "tomato"],
  [/cebolla/, "onion"], [/zanahoria/, "carrot"], [/\bpapas?\b/, "potato"],
  [/cilantro|perejil|hierbabuena|epazote|albahaca|hierba/, "herb"], [/nopal/, "nopal"],
  [/elote|esquite|maiz/, "corn"], [/chile|serrano|poblano|jalapeno|habanero/, "chile"],
  [/cempasuchil|flor/, "marigold"]
];
const ART_TINT = { lemon: "#fbf0b4", avocado: "#e3edc8", banana: "#fbefb0", watermelon: "#fbd9e1", marigold: "#ffe1a8", onion: "#eed8ef", carrot: "#fde0bd", chile: "#fcd9c8", bread: "#fdebc8", tomato: "#fbd6d3", tortilla: "#f9e6c4", egg: "#fdf1d8", milk: "#dcebf3", beans: "#ecd9cd", papaya: "#fddcc0", nopal: "#dcebd3", chicken: "#fbdfc2", cheese: "#fdf0bd", herb: "#dcefd2", corn: "#fcefb8", potato: "#efe0c6", mango: "#fde0bd", strawberry: "#fcd5da", apple: "#fcd8d3", orange: "#fde1c3", taco: "#fbe8c4", plate: "#f5ecd6", drink: "#fbdbe6", tamal: "#f2e7c8", panmuerto: "#fdebc8", crate: "#e3ebe4", bunting: "#e8e0f3" };
function offerArt(name) {
  const text = String(name || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const rule = ART_RULES.find(([pattern]) => pattern.test(text));
  return rule ? rule[1] : "crate";
}

/* Marca: huacal con jitomate y hoja. */
const LOGO_MARK = `<svg class="logo__mark" viewBox="0 0 64 64" aria-hidden="true"><circle cx="24" cy="22" r="12" fill="#e04a55" stroke="#1c3233" stroke-width="3"/><path d="M38 24c2-9 8-14 17-14-1 9-7 14-17 14z" fill="#64ada6" stroke="#1c3233" stroke-width="3" stroke-linejoin="round"/><path d="M8 30h48l-4 26H12z" fill="#f4a903" stroke="#1c3233" stroke-width="3" stroke-linejoin="round"/><path d="M10 43h44M24 30v26M40 30v26" stroke="#1c3233" stroke-width="3"/></svg>`;
