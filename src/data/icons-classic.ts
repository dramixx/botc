// « Classique » theme: the motifs of the official Trouble Brewing tokens, redrawn flat and modern
// (48×48 viewBox, same classes as the « Illustré » theme).
import type { RoleId } from './roles';

/** Mirror a drawing left ↔ right. */
const mirror = (s: string) => `<g transform="matrix(-1 0 0 1 48 0)">${s}</g>`;
const rotate = (deg: number, s: string) => `<g transform="rotate(${deg} 24 24)">${s}</g>`;

const wing = `
  <path class="a" d="M22 13C15 6 6 5 2.5 8.5c2 .8 3.2 2 3.5 3.8-2 .2-3.2 1.4-3.2 3.2 2.2 0 4 .8 5.2 2-2 .8-3 2.2-3 4 3 0 5.2.4 7 1.4-1.2 1.2-1.8 2.8-1.3 4.8 3-1 5.8-1 7.8.2-.8 2-.8 4 0 6C22 31 23.5 26 23.5 20c0-3-.5-5.2-1.5-7z"/>
  <path class="t" d="M19.5 16C15 12.5 10 11 6 11.2M20.5 21.5c-4-2-8.5-3-12.8-3M21 27c-3-1.2-6.5-1.6-10-.8"/>`;

const ramHorn = `
  <path d="M19.5 14c-2.5-4.5-9.5-5-12-.5-2.2 4 .8 9 5 8.2 3-.6 3.2-4.6.6-4.9" stroke-width="4.2" stroke-opacity=".9"/>
  <path class="b" d="M18 19.5l-6 2 6 2z"/>`;

export const CLASSIC_ICONS: Record<RoleId, string> = {
  washerwoman: `<g transform="translate(2.4 7) scale(.9)">
    <path d="M2 12q22 7 44 0"/>
    <path class="b" d="M5 16.5l4.5-1.5c.8 1.4 2 2.2 3.3 2.2s2.5-.8 3.3-2.2l4.5 1.5-1.4 5-2.2-.6V32H9.4V20.9l-2.2.6z"/>
    <path class="a" d="M22.5 16.6h8l1.2 16.4h-4l-1.2-10-1.2 10h-4z"/>
    <path class="b" d="M35 15.8h6l-1 4.2 4 12.5H32l4-12.5z"/>
    <rect class="c" x="11.6" y="13.3" width="2.4" height="4.5" rx=".6"/>
    <rect class="c" x="25.4" y="14" width="2.4" height="4.5" rx=".6"/>
    <rect class="c" x="36.8" y="12.6" width="2.4" height="4.5" rx=".6"/></g>`,

  librarian: `
    <path class="b" d="M5 23l21-8 17 6.5-21 8z"/>
    <path class="a" d="M5 23v7l17 6.5v-7z"/>
    <path class="c" d="M22 29.5v7l21-8V21.5z"/>
    <path class="t" d="M7.5 26.2l12.5 4.8M7.5 29.2l12.5 4.8"/>
    <path class="t" d="M17 22.2l9-3.4 7.5 2.8-9 3.4z"/>
    <circle class="c" cx="25.3" cy="22.4" r="1.6"/>`,

  investigator: `
    <circle class="a" cx="19" cy="19" r="13"/>
    <circle class="t" cx="19" cy="19" r="9.5"/>
    <path class="t" d="M12 15.5a7.5 7.5 0 0 1 4.5-4.4"/>
    <path d="M28.2 28.2l3.3 3.3"/>
    <path class="c" d="M30.4 35.6l5.2-5.2 8.8 8.8a3.7 3.7 0 0 1-5.2 5.2z"/>`,

  chef: `
    <path class="a" d="M13 31v-8.5A7.5 7.5 0 0 1 11.6 8.2 9 9 0 0 1 24 4a9 9 0 0 1 12.4 4.2A7.5 7.5 0 0 1 35 22.5V31"/>
    <path class="t" d="M17 17.5c1 4 1.3 9 1 13.5M24 15.5v15.5M31 17.5c-1 4-1.3 9-1 13.5"/>
    <path class="b" d="M12.5 31h23l-1.2 9.5a2 2 0 0 1-2 1.8H15.7a2 2 0 0 1-2-1.8z"/>
    <path class="t" d="M17.5 31.5l.7 10.5M24 31.5V42M30.5 31.5l-.7 10.5"/>`,

  empath: `
    <path class="a" d="M24 42S5 31 5 17.5A9.5 9.5 0 0 1 24 12a9.5 9.5 0 0 1 19 5.5C43 31 24 42 24 42z"/>
    <path class="t" d="M24 36.5S10.5 28.5 10.5 18.5a5 5 0 0 1 9-3"/>
    <path class="c" d="M34.5 14.5a3.4 3.4 0 0 1 3.5 3.3 1.2 1.2 0 0 1-2.4.1 1.1 1.1 0 0 0-1.1-1 1.2 1.2 0 0 1 0-2.4z"/>`,

  fortuneteller: `
    <circle class="a" cx="24" cy="19" r="15"/>
    <path class="b" d="M13 19s4.5-6.5 11-6.5S35 19 35 19s-4.5 6.5-11 6.5S13 19 13 19z"/>
    <circle class="c" cx="24" cy="19" r="3.6"/>
    <path class="t" d="M24 8.5V6M15.5 11.5l-1.6-1.6M32.5 11.5l1.6-1.6M24 29.5V32"/>
    <path class="b" d="M14 34.5c2.6 2.3 6 3.5 10 3.5s7.4-1.2 10-3.5l2.5 5.5h-25z"/>
    <path d="M8.5 43.5h31"/>
    <path class="t" d="M15 40l-2 3.5M33 40l2 3.5"/>`,

  undertaker: rotate(40, `
    <path d="M24 4.5V30"/>
    <path class="b" d="M19 4.5c0-2 2.3-3 5-3s5 1 5 3v2.5H19z"/>
    <path class="c" d="M17 30h14v8.5c0 4-3.2 7-7 8.5-3.8-1.5-7-4.5-7-8.5z"/>
    <path class="t" d="M24 33v9"/>`),

  monk: `
    <path class="b" d="M21 4h6v10h10v6H27v20h-6V20H11v-6h10z"/>
    <circle cx="24" cy="17" r="7.5" stroke-width="3"/>
    <circle class="c" cx="24" cy="17" r="2"/>
    <path class="c" d="M15 40h18l2 4H13z"/>`,

  ravenkeeper: `
    <path class="c" fill-rule="evenodd" d="M4 17l7-2.6c1.5-3.2 4.5-4.9 7.8-4.4 3.4.5 5.8 3.3 6.3 6.6 5.6 1.6 10.4 5.6 13.6 11.2l6.3 8.7-8.6-3.1c-3.4 3.8-8.8 5.4-14 4.4l-3 4.7h-2.6l1.6-5.4c-4.2-2.2-6.6-6.5-6.6-11.2 0-1.9.4-3.6 1.2-5.1zM16.8 13.6a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/>
    <path class="b" d="M18 22.5c6-.8 13 2 18 8.5-6.5 1.6-13.5.4-18.5-3.4z"/>
    <path class="t" d="M22.5 26c3 .2 6.5 1.6 9 3.6"/>
    <path class="t" d="M24 41l-2 4M28 40.5l-1 4.5"/>
    <circle class="c" cx="41" cy="16" r="1.6"/><circle class="c" cx="44.5" cy="21" r="1"/><circle class="c" cx="37" cy="11.5" r="1.1"/><circle class="c" cx="6" cy="31" r="1.2"/><circle class="c" cx="9.5" cy="37" r=".9"/>`,

  virgin: `
    <ellipse cx="18" cy="26" rx="11" ry="12" stroke-width="4.5" transform="rotate(-20 18 26)"/>
    <ellipse cx="30" cy="22" rx="11" ry="12" stroke-width="4.5" transform="rotate(-20 30 22)"/>
    <path d="M27.4 35.6c-1.4.5-2.9.7-4.4.7" stroke-width="4.5"/>
    <ellipse class="t" cx="30" cy="22" rx="8" ry="9" transform="rotate(-20 30 22)" stroke-opacity=".55"/>
    <path class="c" d="M33 12.5a2 2 0 0 1 2.6 1.5 1 1 0 0 1-2 .4.7.7 0 0 0-.9-.4 1 1 0 0 1 .3-1.5z"/>`,

  slayer: rotate(-35, `
    <path d="M30 9c5.5 5 5.5 25 0 30" stroke-width="3.2"/>
    <path class="t" d="M30.5 9.5L19 24l11.5 14.5"/>
    <rect class="b" x="5" y="22" width="26" height="4.5" rx="1.2"/>
    <path d="M14 24.2h30"/>
    <path class="c" d="M45 24.2l-5-3v6z"/>
    <path class="c" d="M5 22l-2 4.5 2 4h4.5l1-4.5z"/>
    <path class="t" d="M12.5 26.5l-1 4"/>`),

  soldier: `
    <path class="a" d="M24 4l17 5.5V22c0 10.5-7.5 17.5-17 22-9.5-4.5-17-11.5-17-22V9.5z"/>
    <path class="b" d="M24 4L7 9.5V22h17z"/>
    <path class="b" d="M24 22h17c0 10.5-7.5 17.5-17 22z"/>
    <path class="t" d="M24 4v40M7 22h34"/>`,

  mayor: `
    <path class="b" d="M4 15L24 5l20 10z"/>
    <path class="c" d="M5 17h38v3H5z"/>
    <path class="a" d="M9 22h5v15H9zM17.5 22h5v15h-5zM25.5 22h5v15h-5zM34 22h5v15h-5z"/>
    <path class="c" d="M6 38h36v2.5H6zM3.5 41.5h41V44h-41z"/>
    <circle class="t" cx="24" cy="11" r="2"/>`,

  butler: `
    <circle class="c" cx="24" cy="8.5" r="2.4"/>
    <path class="a" d="M7.5 26a16.5 15 0 0 1 33 0z"/>
    <path class="t" d="M13 21a11 11 0 0 1 6.5-7"/>
    <path class="b" d="M4 26.5h40l-2 3H6z"/>
    <path class="b" d="M18.5 29.5h11l-.8 6.5c-.3 2-1.8 3.2-3.8 3.2h-1.4l-1.8 5.3h-4.2l1.3-5.6c-.6-.8-.8-1.8-.6-2.9z"/>
    <path class="t" d="M22 29.6v5.5M25.3 29.6v5.5"/>`,

  drunk: `
    <path class="a" d="M10 15h22v26a3 3 0 0 1-3 3H13a3 3 0 0 1-3-3z"/>
    <path class="b" d="M12 22h18v19.5a1 1 0 0 1-1 1H13a1 1 0 0 1-1-1z"/>
    <path class="c" d="M9 16.5c-1.5-3 .5-6.5 4-6 1.2-3.2 5.5-4 7.5-1.6 2.5-2.5 7-2 8.5 1 3.5-.5 5.5 2.5 4 5.5-.3 1-1 1.6-2 1.6H11c-.8 0-1.5-.2-2-.5z"/>
    <path d="M32 21h4.5a4.5 4.5 0 0 1 4.5 4.5v7a4.5 4.5 0 0 1-4.5 4.5H32" stroke-width="3"/>
    <circle class="t" cx="17" cy="30" r="1.1"/><circle class="t" cx="23" cy="35" r="1.3"/><circle class="t" cx="25" cy="27" r=".9"/>`,

  recluse: `
    <path class="c" d="M10 39h28v4.5H10z"/>
    <path class="b" d="M14 33h20c2 0 3 1.5 3 3v3H11v-3c0-1.5 1-3 3-3z"/>
    <path d="M37 36h4.5a2.5 2.5 0 0 0 0-5h-1"/>
    <path class="a" d="M19.5 33V29c-2.5-1.5-4-4-4-7.5 0-4 2.5-7 4.5-8.5V5h8v8c2 1.5 4.5 4.5 4.5 8.5 0 3.5-1.5 6-4 7.5v4z"/>
    <path class="c" d="M24 14.5c2.5 3 3.5 5 3.5 7a3.5 3.5 0 0 1-7 0c0-2 1-4 3.5-7z"/>
    <path class="c" d="M18.5 3h11v2.5h-11z"/>`,

  saint: wing + mirror(wing),

  poisoner: rotate(-25, `
    <rect class="c" x="18.5" y="2" width="11" height="6" rx="1.5"/>
    <path class="a" d="M19.5 8h9v31a4.5 4.5 0 0 1-9 0z"/>
    <path class="b" d="M19.5 22c3-1.5 6 1.5 9 0v17a4.5 4.5 0 0 1-9 0z"/>
    <path class="t" d="M22 11.5v8"/>
    <circle class="t" cx="24.5" cy="30" r="1.2"/><circle class="t" cx="23" cy="36" r="1"/>`),

  spy: rotate(45, `
    <path class="a" d="M24 2l3.8 7v22h-7.6V9z"/>
    <path class="t" d="M24 7v22"/>
    <path class="c" d="M15 31h18a2 2 0 0 1 0 4H15a2 2 0 0 1 0-4z"/>
    <path class="b" d="M21.5 35h5v8h-5z"/>
    <path class="t" d="M21.5 37.5h5M21.5 40.5h5"/>
    <circle class="c" cx="24" cy="45" r="2.6"/>`),

  scarletwoman: `
    <path class="c" d="M3 24c5-1.6 8.5-8 14-8 3 0 5 1.6 7 3.2 2-1.6 4-3.2 7-3.2 5.5 0 9 6.4 14 8-6.8 1.2-14 1.4-21 1.4S9.8 25.2 3 24z"/>
    <path class="b" d="M3 24c6.8 1.6 14 2.4 21 2.4s14.2-.8 21-2.4c-4.2 7-11.5 12-21 12S7.2 31 3 24z"/>
    <path class="t" d="M16 31c3 1.2 6 1.6 9.5 1.3M33 29.5l1.5-1"/>`,

  baron: `
    <path class="a" d="M13.5 5.5c0-1 4.5-2 10.5-2s10.5 1 10.5 2L33 33H15z"/>
    <path class="c" d="M14.6 26h18.8l-.4 7H15z"/>
    <path class="b" d="M4 33.5c3.5 3.5 36.5 3.5 40 0 0 4-4.5 7.5-10 7.5H14c-5.5 0-10-3.5-10-7.5z"/>
    <path class="t" d="M18 8.5l.8 15"/>`,

  imp: `
    <path class="b" d="M22 21h4v25h-4z"/>
    <path class="c" d="M8.5 6.5l3.5 4.5L10.2 13C11.5 19.5 16 23 24 23s12.5-3.5 13.8-10L36 11l3.5-4.5 2.5 7.5h-3c-1 9-7 14.5-15 14.5S10 23 9 14H6z"/>
    <path class="c" d="M24 2l4.2 6.5-2.2.2V22h-4V8.7l-2.2-.2z"/>
    <path class="c" d="M19.5 33h9l-1.5 2.5h-6z"/>`,

  bureaucrat: `
    <path class="a" d="M4 31l20-8 20 7.5-20 8z"/>
    <path class="b" d="M4 26l20-8 20 7.5-20 8z"/>
    <path class="a" d="M4 21l20-8 20 7.5-20 8z"/>
    <path class="c" d="M24 13l10-4 3.5 1.3c-1 3-.5 6 1.5 9.2L44 20.5z" fill-opacity=".85"/>
    <path class="t" d="M12 21.5l10-4M14.5 23.5l10-4M17 25.5l7-2.8"/>
    <path class="t" d="M4 31v2.5l20 8 20-8V30.5"/>`,

  thief: `
    <path class="b" d="M14 9h20l9 10H5z"/>
    <path class="a" d="M5 19h38L24 43z"/>
    <path class="t" d="M14 9l-3 10 13 24M34 9l3 10-13 24M19.5 9L17 19l7 24M28.5 9L31 19l-7 24M24 9v10"/>
    <path class="c" d="M40 3l1 2.5L43.5 6.5 41 7.5 40 10 39 7.5 36.5 6.5 39 5.5z"/>`,

  gunslinger: rotate(-25, `
    <path class="b" d="M3 25.5c0-2 1.5-3.5 4-4l11-2.5h6V28h-6l-11 2.8C4.5 31.2 3 29.5 3 27.5z"/>
    <path class="a" d="M24 19h10v6H24z"/>
    <path d="M30 21h16" stroke-width="3"/>
    <path class="c" d="M43.5 18.5h1.6v2h-1.6z"/>
    <path class="t" d="M27 25v3.5c0 2 1.5 3 3.5 3"/>
    <path class="t" d="M29 25l-.6 3"/>
    <path class="t" d="M8 23.5l8-2M8 27.5l8-1.6"/>`),

  scapegoat: `
    <path class="a" d="M17.5 16.5c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5c0 9-2 17-6.5 23.5-4.5-6.5-6.5-14.5-6.5-23.5z"/>${ramHorn}${mirror(ramHorn)}
    <path class="c" d="M19.5 21h3.2v1.8h-3.2zM25.3 21h3.2v1.8h-3.2z"/>
    <path class="t" d="M22 33.5l2 1.5 2-1.5"/>
    <path class="b" d="M21.5 38.5l2.5 7.5 2.5-7.5c-.9 1-1.7 1.6-2.5 2-.8-.4-1.6-1-2.5-2z"/>`,

  beggar: `
    <path class="a" d="M5 22h38c0 11-8.5 19.5-19 19.5S5 33 5 22z"/>
    <ellipse class="b" cx="24" cy="22" rx="19" ry="4.5"/>
    <ellipse class="c" cx="24" cy="22.4" rx="15" ry="2.8"/>
    <path class="t" d="M10 28c4 3 8 4 14 4M12.5 33.5c3.5 2 7 2.5 11.5 2.5M30 30c3-.3 6-1.3 8.5-3"/>
    <path class="t" d="M24 26.5v15" stroke-opacity=".6"/>`,
};
