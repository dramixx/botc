// « Illustré » theme: illustrated character icons (48×48 viewBox), drawn in the current colour so they follow the side's tone.
// Classes (see `.ri` in styles.css): default = outline, `a` = light tint, `b` = mid tint,
// `c` = solid, `t` = fine detail line.
import type { RoleId } from './roles';

export const ILLUSTRATED_ICONS: Record<RoleId, string> = {
  washerwoman: `
    <path class="b" d="M15 25l-3-7 6-3c1.5 2 3.5 3 6 3s4.5-1 6-3l6 3-3 7"/>
    <path class="a" d="M7 25h34l-3.5 15.5A3 3 0 0 1 34.6 43H13.4a3 3 0 0 1-2.9-2.5z"/>
    <path class="t" d="M9 31h30M10.5 37h27M17 25l1.5 18M24 25v18M31 25l-1.5 18"/>
    <circle class="t" cx="39" cy="9" r="3.2"/><circle class="t" cx="32.5" cy="5.5" r="1.8"/><circle class="t" cx="43" cy="15" r="1.4"/>`,

  librarian: `
    <path class="a" d="M5 11c7-2.5 13-2 19 2.5v28C18 37 12 36.5 5 39z"/>
    <path class="a" d="M43 11c-7-2.5-13-2-19 2.5v28C30 37 36 36.5 43 39z"/>
    <path class="t" d="M9 17.5c3.5-1 7-.6 11 1M9 23c3.5-1 7-.6 11 1M9 28.5c3.5-1 7-.6 11 1M28 18.5c3.5-1.6 7.5-2 11-1M28 24c3.5-1.6 7.5-2 11-1"/>
    <path class="c" d="M31 12.2V4h5v11.5l-2.5-2-2.5 2z"/>`,

  investigator: `
    <circle class="a" cx="20" cy="20" r="12"/>
    <path class="t" d="M12.5 16a8.5 8.5 0 0 1 5-5"/>
    <ellipse class="c" cx="21" cy="24" rx="3" ry="4.6"/>
    <circle class="c" cx="17.4" cy="17" r="1.25"/><circle class="c" cx="20.3" cy="15.7" r="1.25"/><circle class="c" cx="23.2" cy="16.6" r="1.15"/>
    <path d="M28.5 28.5l3 3"/>
    <path class="b" d="M30.5 34.5l4-4 9 9a2.8 2.8 0 0 1-4 4z"/>`,

  chef: `
    <path class="a" d="M14 30v-5.5A7 7 0 0 1 13 10.7 8.5 8.5 0 0 1 24 5a8.5 8.5 0 0 1 11 5.7A7 7 0 0 1 34 24.5V30"/>
    <path class="t" d="M19 22v8M24 19v11M29 22v8"/>
    <rect class="b" x="13" y="30" width="22" height="8" rx="1.5"/>
    <path d="M7 43h34"/>
    <path class="t" d="M10 43c0-2 1.5-3 3-3M38 43c0-2-1.5-3-3-3"/>`,

  empath: `
    <path class="t" d="M8 16a12 12 0 0 0 0 14M3.5 12a18 18 0 0 0 0 22M40 16a12 12 0 0 1 0 14M44.5 12a18 18 0 0 1 0 22"/>
    <path class="a" d="M24 39s-12.5-7.5-12.5-18A6.6 6.6 0 0 1 24 17.6 6.6 6.6 0 0 1 36.5 21C36.5 31.5 24 39 24 39z"/>
    <path class="c" d="M24 31.5s-5.5-3.4-5.5-8.2a3 3 0 0 1 5.5-1.6 3 3 0 0 1 5.5 1.6c0 4.8-5.5 8.2-5.5 8.2z"/>`,

  fortuneteller: `
    <circle class="a" cx="24" cy="20" r="14"/>
    <path class="t" d="M14.5 15a10.5 10.5 0 0 1 8-6.5"/>
    <path class="c" d="M28 13l1.4 4.2 4.2 1.4-4.2 1.4L28 24.2l-1.4-4.2-4.2-1.4 4.2-1.4z"/>
    <circle class="c" cx="18.5" cy="25" r="1.4"/><circle class="c" cx="31" cy="27" r="1"/>
    <path class="b" d="M13 39c0-3.5 4.5-5.5 11-5.5s11 2 11 5.5z"/>
    <path d="M9 43h30"/>`,

  undertaker: `
    <path class="a" d="M10 42V19a10 10 0 0 1 20 0v23"/>
    <path class="t" d="M20 18v13M15.5 22.5h9"/>
    <path d="M4 42h40"/>
    <path class="t" d="M7 42l1-3.5M9.5 42l1.5-4.5M33 42l1-3M14 42l.8-2.5"/>
    <path d="M39 5v25M36 5h6"/>
    <path class="b" d="M35.5 30h7v6.5L39 40.5l-3.5-4z"/>`,

  monk: `
    <path class="t" d="M15 6.5a11 3.5 0 0 1 18 0"/>
    <path class="a" d="M24 9c-4 2-11 6-11 14.5v3.5L8 43h32l-5-16v-3.5C35 15 28 11 24 9z"/>
    <path class="c" d="M24 15c-3.5 0-5.5 2.8-5.5 6.5V25h11v-3.5c0-3.7-2-6.5-5.5-6.5z"/>
    <path class="b" d="M14.5 30c4 2.5 15 2.5 19 0v5.5c-4 2.5-15 2.5-19 0z"/>
    <path class="t" d="M24 31.5v5M19.5 38v5M28.5 38v4"/>
    <circle class="c" cx="28.5" cy="43" r="1.3"/>`,

  ravenkeeper: `
    <circle class="a" cx="36" cy="11" r="6.5"/>
    <path class="b" d="M14.5 21.5c4.5-2.5 10.5-2 15 1.5L43 33l-9.5-1c-3.5 4-10 5-14.5 1.5-4.5-3.5-6-8.5-4.5-12z"/>
    <path class="c" fill-rule="evenodd" d="M16.5 12a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM16.8 14.2a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4z"/>
    <path class="c" d="M12.5 15.5l-8 2 8 1.5z"/>
    <path class="t" d="M19 24.5c4.5 0 8.5 2 11.5 5.5M21.5 28.5c3 0 5.5 1.2 7.5 3"/>
    <path class="t" d="M21 34.5v5.5M25.5 35v5"/>
    <path d="M5 40h36M33 40l4.5-4.5"/>`,

  virgin: `
    <path d="M24 44V26"/>
    <path class="a" d="M24 37c-6.5 0-9.5-3-10.5-7.5 5.5 0 8.5 2.5 10.5 7.5z"/>
    <path class="a" d="M24 35c6 0 9-3 10-7.5-5.5 0-8.5 2.5-10 7.5z"/>
    <path class="a" d="M24 26c-5.5 0-10.5-3.5-12-11 5.5 0 10 3.5 12 11z"/>
    <path class="a" d="M24 26c5.5 0 10.5-3.5 12-11-5.5 0-10 3.5-12 11z"/>
    <path class="b" d="M24 26c-3.5-3-4.5-9 0-15.5 4.5 6.5 3.5 12.5 0 15.5z"/>
    <path class="t" d="M9 7l1 2.2 2.2 1-2.2 1L9 13.5 8 11.2 5.8 10.2 8 9.2zM40 5l.7 1.6 1.6.7-1.6.7-.7 1.6-.7-1.6-1.6-.7 1.6-.7z"/>`,

  slayer: `
    <path class="a" d="M37 5h6v6L22.5 31.5l-6-6z"/>
    <path class="t" d="M40.5 7.5l-20.5 20.5"/>
    <path class="b" d="M12 26l2.5-2.5 10 10L22 36z"/>
    <path d="M18.5 30.5L11 38"/>
    <circle class="c" cx="9" cy="40" r="3"/>`,

  soldier: `
    <path class="a" d="M24 4l16 5.5V22c0 10.5-7.5 17.5-16 22-8.5-4.5-16-11.5-16-22V9.5z"/>
    <path class="t" d="M24 8.5l12 4.1V22c0 8-5.5 13.5-12 17.5-6.5-4-12-9.5-12-17.5v-9.4z"/>
    <path class="b" d="M21.5 13h5v7.5H34v5h-7.5V36h-5V25.5H14v-5h7.5z"/>`,

  mayor: `
    <path d="M24 8V2"/>
    <path class="c" d="M24 2h7l-1.8 2.2L31 6.5h-7z"/>
    <path class="b" d="M5 19L24 8l19 11z"/>
    <circle class="c" cx="24" cy="15" r="2"/>
    <path d="M7 22h34M11 22v15M18 22v15M30 22v15M37 22v15"/>
    <path class="a" d="M21 37V28a3 3 0 0 1 6 0v9"/>
    <path d="M6 37.5h36M4 42h40"/>`,

  butler: `
    <circle class="c" cx="24" cy="13.5" r="2.6"/>
    <path class="a" d="M8 34a16 16 0 0 1 32 0z"/>
    <path class="t" d="M13.5 29a11 11 0 0 1 6.5-8"/>
    <path d="M4 34.5h40"/>
    <path class="b" d="M9 38h30l-2 3H11z"/>`,

  drunk: `
    <path class="a" d="M9 17h23v23a3 3 0 0 1-3 3H12a3 3 0 0 1-3-3z"/>
    <path d="M32 22h4.5a4.5 4.5 0 0 1 4.5 4.5v5a4.5 4.5 0 0 1-4.5 4.5H32"/>
    <path class="t" d="M15 23v15M20.5 23v15M26 23v15"/>
    <path class="b" d="M9 19c-2.5-3 0-7.5 4-7 1-3.5 5.5-4.5 7.5-2 2.5-3 7.5-3 9 .5 3.5-.5 6 2.5 4.5 5.5-.5 2-1.5 3-3 3H29v4.5a2 2 0 0 1-4 0V19z"/>
    <circle class="t" cx="38" cy="8" r="1.6"/><circle class="t" cx="42" cy="13" r="1"/>`,

  recluse: `
    <path class="t" d="M40 43V17M40 25l4-4.5M40 31l-4-3.5M40 21l-3.5-4.5"/>
    <path class="a" d="M8 43V27l12-10 12 10v16z"/>
    <path d="M5 29L20 15.5 35 29"/>
    <path class="b" d="M26 21.5V13h4v12"/>
    <path class="b" d="M17 43v-9h6v9"/>
    <rect class="c" x="10.5" y="29" width="4" height="4" rx=".5"/>
    <path d="M3 43h42"/>`,

  saint: `
    <ellipse class="b" cx="24" cy="7.5" rx="9" ry="2.6"/>
    <path class="t" d="M11 5.5l-4-1.5M37 5.5l4-1.5M12 11l-3.5 1.5M36 11l3.5 1.5"/>
    <circle class="a" cx="24" cy="18" r="6"/>
    <path class="a" d="M9 44c0-10 6.5-16 15-16s15 6 15 16z"/>
    <path class="b" d="M24 31l-3 9h6z"/>`,

  poisoner: `
    <rect class="c" x="19.5" y="2.5" width="9" height="4.5" rx="1"/>
    <path class="a" d="M20 7h8v8.5c6.5 2.3 10.5 7.4 10.5 13.5a14.5 14.5 0 0 1-29 0c0-6.1 4-11.2 10.5-13.5z"/>
    <path class="b" d="M10.5 29.5a13.5 13.5 0 0 0 27 0c-4.5 2-9-2-13.5 0s-9 2-13.5 0z"/>
    <path class="c" fill-rule="evenodd" d="M24 29a4.5 4.5 0 0 0-4.5 4.5c0 1.6.8 2.7 1.8 3.3V39h5.4v-2.2c1-.6 1.8-1.7 1.8-3.3A4.5 4.5 0 0 0 24 29zM22.2 32.4a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2zM25.8 32.4a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2z"/>
    <circle class="t" cx="19" cy="23" r="1.3"/><circle class="t" cx="27.5" cy="20.5" r="1.7"/>`,

  spy: `
    <path class="a" d="M14 22c0-8 3.5-13 10-13s10 5 10 13"/>
    <path class="t" d="M24 10v5"/>
    <rect class="c" x="14" y="17.5" width="20" height="4.5"/>
    <path class="b" d="M4 22.5c6 2.5 34 2.5 40 0 0 3-6 5.5-20 5.5S4 25.5 4 22.5z"/>
    <path class="c" fill-rule="evenodd" d="M7 32c5.5-2.5 11.5-2.5 17 1 5.5-3.5 11.5-3.5 17-1-1 6.5-4.5 9.5-8.5 9.5-3 0-5.5-2-8.5-4.5-3 2.5-5.5 4.5-8.5 4.5-4 0-7.5-3-8.5-9.5zM12.5 35a3.5 2.2 0 1 0 7 0 3.5 2.2 0 1 0-7 0zM28.5 35a3.5 2.2 0 1 0 7 0 3.5 2.2 0 1 0-7 0z"/>`,

  scarletwoman: `
    <path class="a" d="M24 37L5.5 19.5a26 26 0 0 1 37 0z"/>
    <path class="t" d="M24 37L11.5 12M24 37L17.5 8.5M24 37V7.5M24 37l6.5-28.5M24 37l12.5-25"/>
    <path class="t" d="M5.5 19.5c2-1 3-3 3.5-5 1.5.5 3.5 0 4.5-2 1.5 1 3.5.5 4.5-1.5 2 1 4 1 6-1 2 2 4 2 6 1 1 2 3 2.5 4.5 1.5 1 2 3 2.5 4.5 2 .5 2 1.5 4 3.5 5"/>
    <path class="a" d="M24 40c-5 3-9 3-12 2 2-3 6-4.5 10-4"/>
    <circle class="b" cx="24" cy="37.5" r="5.5"/>
    <path class="t" d="M24 37.5a1.8 1.8 0 1 1 1.8 1.8c-2 0-3.6-1.6-3.6-3.6a3.6 3.6 0 0 1 3.6-3.6"/>`,

  baron: `
    <path class="a" d="M15.5 3h17l-1 18h-15z"/>
    <rect class="c" x="16.2" y="15" width="15.6" height="5"/>
    <path class="b" d="M7 21c4 2.5 30 2.5 34 0 0 3-3 4.5-6.5 4.5h-21C10 25.5 7 24 7 21z"/>
    <circle class="c" cx="18.5" cy="31.5" r="1.4"/>
    <circle class="a" cx="29.5" cy="31.5" r="4.5"/>
    <path class="t" d="M34 33c3 2.5 3.5 6.5 2.5 10.5"/>
    <path class="c" d="M24 37.5c-3-3-8.5-3.5-12-.5 3.5.5 7 1.5 12 2.8 5-1.3 8.5-2.3 12-2.8-3.5-3-9-2.5-12 .5z"/>`,

  imp: `
    <path class="c" d="M15.5 13C10 11 7.5 6 8.5 1.5c2.5 3.5 7 6 10.5 7z"/>
    <path class="c" d="M32.5 13c5.5-2 8-7 7-11.5-2.5 3.5-7 6-10.5 7z"/>
    <path class="a" d="M11.5 21c0-8.5 5.5-13.5 12.5-13.5S36.5 12.5 36.5 21c0 9.5-6.5 17.5-12.5 20-6-2.5-12.5-10.5-12.5-20z"/>
    <path class="t" d="M15 19l6 3M33 19l-6 3"/>
    <path class="c" d="M16 22.5l5.5 2-5.5 1.2zM32 22.5l-5.5 2 5.5 1.2z"/>
    <path d="M18 31c3.5 3 8.5 3 12 0"/>
    <path class="c" d="M20 31.8l1.2 3.4 1.2-2.6zM28 31.8l-1.2 3.4-1.2-2.6z"/>
    <path class="b" d="M21.5 39.5L24 46l2.5-6.5c-1 .8-1.8 1.3-2.5 1.5-.7-.2-1.5-.7-2.5-1.5z"/>`,

  bureaucrat: `
    <path class="a" d="M7 5h18l7 7v31H7z"/>
    <path class="t" d="M25 5v7h7M12 18h13M12 23h15M12 28h9"/>
    <circle class="t" cx="15" cy="36" r="3.5"/>
    <circle class="c" cx="37.5" cy="20" r="3.6"/>
    <path class="b" d="M35.5 23.5h4v5h-4z"/>
    <path class="b" d="M30 28.5h15v6H30z"/>
    <path class="t" d="M31 37.5h13"/>`,

  thief: `
    <path class="a" d="M18.5 14.5c-2-2.5-1.5-6 .5-7.5 2 1.2 3.5 1.2 5 0 1.5 1.2 3 1.2 5 0 2 1.5 2.5 5 .5 7.5 8 3.5 12 11 11 19-.8 6-6 9-13 9h-2c-7 0-12.2-3-13-9-1-8 3-15.5 11-19z"/>
    <path d="M17.5 14.5h13"/>
    <path class="t" d="M27 25.5c-1.2-1.2-4.5-1.5-5.5.2s.3 3 3 3.6 3.6 2.2 2.6 3.8-4.4 1.3-5.6 0M24.3 23v2M24.3 33v2"/>
    <ellipse class="b" cx="38" cy="42" rx="5.5" ry="2.2"/>
    <ellipse class="b" cx="9" cy="43" rx="4.5" ry="1.8"/>`,

  gunslinger: `
    <rect class="b" x="4" y="15" width="22" height="5" rx="1"/>
    <path d="M6.5 15v-2.5"/>
    <rect class="a" x="23" y="13" width="11" height="10" rx="2"/>
    <circle class="t" cx="26.5" cy="18" r="1.3"/><circle class="t" cx="30.5" cy="18" r="1.3"/>
    <path class="b" d="M33.5 13.5l4-4 2.5 2.5-3.5 4"/>
    <path class="a" d="M33 22c2.5 0 4.5 1.5 5.5 4.5l3.5 12.5c.5 2-1 3.5-3 3.5h-3.5c-2 0-3-1-3.5-3L29.5 25z"/>
    <path d="M24 23c0 4.5 2.5 7 6 7"/>
    <path class="t" d="M28 23l-1 4"/>`,

  scapegoat: `
    <path class="b" d="M19.5 13C17 7.5 10 6 6.5 10.5c3.5-1 6.5 0 8.5 4.5z"/>
    <path class="b" d="M28.5 13C31 7.5 38 6 41.5 10.5c-3.5-1-6.5 0-8.5 4.5z"/>
    <path class="t" d="M10.5 9.5l1 2.5M14 8.5l.5 3M34 8.5l-.5 3M37.5 9.5l-1 2.5"/>
    <path class="b" d="M17 18l-8 .5 6.5 4M31 18l8 .5-6.5 4"/>
    <path class="a" d="M16.5 17c0-3.5 3-5.5 7.5-5.5s7.5 2 7.5 5.5c0 8.5-2 15.5-4.5 19.5h-6C18.5 32.5 16.5 25.5 16.5 17z"/>
    <path class="c" d="M18.5 20.5h3v1.6h-3zM26.5 20.5h3v1.6h-3z"/>
    <path class="t" d="M22 33h4"/>
    <path class="b" d="M21 36.5l3 9 3-9z"/>`,

  beggar: `
    <circle class="b" cx="23" cy="10" r="4.5"/>
    <circle class="t" cx="23" cy="10" r="2"/>
    <ellipse class="b" cx="33" cy="18" rx="2.6" ry="3.6"/>
    <path class="t" d="M17 5v4M29 8.5v3"/>
    <path class="a" d="M7 28a17 14 0 0 0 34 0z"/>
    <ellipse class="b" cx="24" cy="28" rx="17" ry="3.2"/>
    <path class="t" d="M14 34l3 1.2M19 37.5l3 .8M30 36.5l3-1.4"/>`,
};
