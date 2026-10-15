import { renderGrandStaff } from './renderGrandStaff';
import { segmentKey } from './songPractice';
import type { ParsedSong, SongFingering } from './songPractice';

const PRINT_WIDTH = 1000;
const PRINT_STYLE_ID = 'print-song-style';

// Printing happens in this page (not a popup) so the music font is already loaded
const PRINT_CSS = `
#print-song { display: none; }
@media print {
  body.printing-song > *:not(#print-song) { display: none !important; }
  body.printing-song { background: #fff !important; }
  #print-song { display: block; color: #111; font-family: Georgia, serif; }
  #print-song h1 { margin: 0; font-size: 22px; }
  #print-song p { margin: 4px 0 14px; font-size: 13px; color: #555; }
  #print-song svg { width: 100%; height: auto; }
}
`;

function escapeHtml(text: string): string {
  return text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

/** Opens the print dialog with the whole song on paper, with fingering and chord symbols */
export function printSong(song: ParsedSong, fingering: SongFingering, withFingering: boolean) {
  if (!document.getElementById(PRINT_STYLE_ID)) {
    const style = document.createElement('style');
    style.id = PRINT_STYLE_ID;
    style.textContent = PRINT_CSS;
    document.head.appendChild(style);
  }
  document.getElementById('print-song')?.remove();

  const root = document.createElement('div');
  root.id = 'print-song';
  const { source } = song;
  root.innerHTML = `<h1>${escapeHtml(source.title)}</h1><p>${escapeHtml(source.composer)}${
    source.description ? ` · ${escapeHtml(source.description)}` : ''
  }</p>`;
  const score = document.createElement('div');
  root.appendChild(score);
  document.body.appendChild(root);

  const chords = source.chords?.split('|').map((c) => c.trim());
  renderGrandStaff(score, song.measures, PRINT_WIDTH, {
    beats: source.beats,
    keySignature: source.keySignature,
    fingersOf: withFingering
      ? (staff, measure, segment) => fingering.bySegment.get(segmentKey({ staff, measure, segment }))
      : undefined,
    chordOf: chords ? (m) => chords[m] : undefined,
  });

  document.body.classList.add('printing-song');
  const cleanUp = () => {
    document.body.classList.remove('printing-song');
    root.remove();
    window.removeEventListener('afterprint', cleanUp);
  };
  window.addEventListener('afterprint', cleanUp);
  window.print();
}
