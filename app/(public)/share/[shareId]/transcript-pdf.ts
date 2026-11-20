import jsPDF from 'jspdf';
import autoTable, { type CellHookData, type RowInput } from 'jspdf-autotable';
import { arcAngle } from '@/components/public/ArcMeter';
import { formatCgpa, resolveDegreeClass, roundCgpa } from '@/lib/cgpa/academicRules';
import {
  MADE_WITH_LINE,
  NOT_OFFICIAL_LINE,
  POINTS_CAPTION,
  SELF_REPORTED_NOTICE,
  SUMMARY_ONLY_LEAD,
  SUMMARY_ONLY_REST,
  UNOFFICIAL_RECORD_HEADING,
  coursePoints,
  expiryLine,
  isFailGrade,
  plural,
  resolveUniversityName,
  semesterUnits,
  totalPoints,
} from './record-labels';
import { resolveSharedStanding } from './shared-standing';
import type { SharedTranscript } from './types';

/**
 * The shared record as an A4 PDF, drawn in the same stationery as the paper:
 * the five-block stripe, the heading and meta, the notice as an ink band,
 * ink table heads, F grades in examiner red, the "Points" column, and the
 * cumulative ink bar with the CGPA on a gold cell beside a small five-segment
 * arc. The notice and "Page n of m" are on every page foot.
 *
 * Imported only from the Download PDF click (dynamic import), so jspdf never
 * loads for a visitor who only reads. Hanken Grotesk 400 and 500 are embedded
 * when /fonts loads; otherwise the PDF falls back to Helvetica.
 */

type Rgb = [number, number, number];

const INK: Rgb = [24, 21, 61];
const INK_SOFT: Rgb = [75, 72, 104];
const PAPER: Rgb = [251, 250, 247];
const PAPER_ROW: Rgb = [241, 239, 233];
const GOLD: Rgb = [242, 169, 34];
const MARK: Rgb = [194, 58, 34];
const STEPS: readonly Rgb[] = [
  [91, 82, 242],
  [139, 103, 221],
  [194, 123, 170],
  [229, 143, 104],
  [242, 169, 34],
];

const FONT_FILES = [
  { url: '/fonts/hanken-grotesk-400.ttf', file: 'HankenGrotesk-Regular.ttf', style: 'normal' },
  // Registered as "bold" so autoTable's bold heads use the 500 weight (the site has no bold).
  { url: '/fonts/hanken-grotesk-500.ttf', file: 'HankenGrotesk-Medium.ttf', style: 'bold' },
] as const;
const EMBEDDED_FONT = 'HankenGrotesk';

const MARGIN = 14;
const FOOT_SPACE = 26;

interface PdfOptions {
  /** "30 November 2026", or null. */
  expiry: string | null;
}

type Doc = jsPDF & {
  lastAutoTable?: { finalY: number };
  internal: { pageSize: { width: number; height: number }; getNumberOfPages: () => number };
};

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return btoa(binary);
}

async function fetchBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response?.ok) return null;
    return toBase64(await response.arrayBuffer());
  } catch {
    return null;
  }
}

async function fetchDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response?.ok) return null;
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** Embeds Hanken Grotesk 400/500; returns the font family to use. */
async function loadFont(doc: Doc): Promise<string> {
  const files = await Promise.all(FONT_FILES.map((font) => fetchBase64(font.url)));
  if (files.some((file) => !file)) return 'helvetica';
  try {
    FONT_FILES.forEach((font, index) => {
      doc.addFileToVFS(font.file, files[index] as string);
      doc.addFont(font.file, EMBEDDED_FONT, font.style);
    });
    return EMBEDDED_FONT;
  } catch {
    return 'helvetica';
  }
}

function drawStripe(doc: Doc, y: number, width: number, height: number) {
  const block = width / STEPS.length;
  STEPS.forEach((colour, index) => {
    doc.setFillColor(...colour);
    doc.rect(MARGIN + index * block, y, block, height, 'F');
  });
}

/** The arc meter: five flat segments from 0.00 (bottom) round to 5.00 (right), and a gold dot. */
function drawArc(doc: Doc, cx: number, cy: number, radius: number, value: number) {
  const pointAt = (angle: number) => {
    const rad = (angle * Math.PI) / 180;
    return [cx + radius * Math.cos(rad), cy + radius * Math.sin(rad)] as const;
  };
  doc.setLineWidth(2.2);
  STEPS.forEach((colour, index) => {
    doc.setDrawColor(...colour);
    const from = arcAngle(index);
    const to = arcAngle(index + 1);
    const steps = 10;
    for (let step = 0; step < steps; step += 1) {
      const [x0, y0] = pointAt(from + ((to - from) * step) / steps);
      const [x1, y1] = pointAt(from + ((to - from) * (step + 1)) / steps);
      doc.line(x0, y0, x1, y1);
    }
  });
  const [dx, dy] = pointAt(arcAngle(value));
  doc.setFillColor(...PAPER);
  doc.circle(dx, dy, 2.3, 'F');
  doc.setFillColor(...GOLD);
  doc.circle(dx, dy, 1.6, 'F');
  doc.setLineWidth(0.2);
}

export async function downloadTranscriptPdf(transcript: SharedTranscript, { expiry }: PdfOptions): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }) as Doc;
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const contentWidth = pageWidth - MARGIN * 2;
  const centre = pageWidth / 2;

  const [font, logo, photo] = await Promise.all([
    loadFont(doc),
    fetchDataUrl('/logo.png'),
    transcript.showPhoto && transcript.avatarUrl ? fetchDataUrl(transcript.avatarUrl) : Promise.resolve(null),
  ]);
  const setType = (style: 'normal' | 'bold', size: number, colour: Rgb = INK) => {
    doc.setFont(font, style);
    doc.setFontSize(size);
    doc.setTextColor(...colour);
  };

  // -- Stripe and header
  drawStripe(doc, 10, contentWidth, 7);
  let y = 24;
  if (logo) {
    try {
      doc.addImage(logo, 'PNG', centre - 6, y, 12, 12);
      y += 18;
    } catch {
      /* skip the mark */
    }
  } else {
    y += 4;
  }
  // A self-reported record: never print an institution as if it issued the document.
  setType('bold', 15);
  doc.text(UNOFFICIAL_RECORD_HEADING, centre, y, { align: 'center' });
  setType('normal', 9, INK_SOFT);
  doc.text(MADE_WITH_LINE, centre, y + 6, { align: 'center' });
  doc.text(`University (as entered by the student): ${resolveUniversityName(transcript)}`, centre, y + 11, { align: 'center' });

  // -- Notice band
  const bandY = y + 16;
  doc.setFillColor(...INK);
  doc.rect(MARGIN, bandY, contentWidth, 9, 'F');
  setType('bold', 9.5, PAPER);
  doc.text(SELF_REPORTED_NOTICE, centre, bandY + 5.9, { align: 'center' });

  // -- Student block
  const blockY = bandY + 17;
  const photoWidth = 22;
  const hasPhoto = Boolean(photo);
  if (photo) {
    try {
      doc.addImage(photo, 'JPEG', MARGIN + contentWidth - photoWidth, blockY - 3, photoWidth, 29);
    } catch {
      /* skip the photograph */
    }
  }
  const columnWidth = (contentWidth - (hasPhoto ? photoWidth + 6 : 0)) / 2;
  const level = transcript.currentLevel?.trim() ? `${transcript.currentLevel.trim()}L` : '–';
  const details: Array<[string, string]> = [
    ['Name', transcript.studentName?.trim() || '–'],
    ['Department', transcript.department?.trim() || '–'],
    ['Matric number', transcript.matric?.trim() || '–'],
    ['Programme', transcript.programme?.trim() || '–'],
    ['Level', level],
  ];
  details.forEach(([label, value], index) => {
    const x = MARGIN + (index % 2) * columnWidth;
    const rowY = blockY + Math.floor(index / 2) * 10;
    setType('normal', 7.5, INK_SOFT);
    doc.text(label, x, rowY);
    setType('bold', 10);
    doc.text(value, x, rowY + 4.5, { maxWidth: columnWidth - 4 });
  });

  let currentY = blockY + 34;
  const tableBase = {
    theme: 'plain' as const,
    styles: { font, fontSize: 8.5, textColor: INK, cellPadding: 1.8, lineColor: PAPER_ROW, lineWidth: { bottom: 0.2 } },
    headStyles: { fillColor: INK, textColor: PAPER, fontStyle: 'bold' as const },
    margin: { left: MARGIN, right: MARGIN, bottom: FOOT_SPACE, top: 16 },
  };

  if (transcript.shareLevel === 'summary') {
    // A summary link carries semester totals only: one table, no course rows.
    setType('normal', 8.5);
    doc.text(`${SUMMARY_ONLY_LEAD} ${SUMMARY_ONLY_REST}`, MARGIN, currentY);
    autoTable(doc, {
      ...tableBase,
      startY: currentY + 4,
      head: [['Semester', 'Session', 'Units', 'GPA', 'PI']],
      body: transcript.semesters.map((sem) => [
        sem.label,
        sem.session,
        String(semesterUnits(sem)),
        formatCgpa(sem.gpa),
        typeof sem.pi === 'number' ? formatCgpa(sem.pi) : '–',
      ]),
      columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
    });
    currentY = (doc.lastAutoTable?.finalY ?? currentY) + 10;
  } else {
    setType('normal', 8, INK_SOFT);
    doc.text(POINTS_CAPTION, MARGIN, currentY);
    currentY += 4;
    for (const sem of transcript.semesters) {
      const courses = sem.courses ?? [];
      const failRows = new Set(courses.flatMap((course, index) => (isFailGrade(course.grade) ? [index] : [])));
      const body: RowInput[] = courses.map((course) => [
        course.code,
        course.title || '–',
        String(course.units),
        course.caScore?.toString() ?? '–',
        course.examScore?.toString() ?? '–',
        course.totalScore?.toString() ?? '–',
        course.grade ?? '–',
        course.gradePoint?.toString() ?? '–',
        String(coursePoints(course)),
      ]);
      const pi = typeof sem.pi === 'number' ? formatCgpa(sem.pi) : '–';
      body.push([
        {
          content: `Semester total · ${plural(semesterUnits(sem), 'unit')} · ${plural(totalPoints(courses), 'point')} · GPA ${formatCgpa(sem.gpa)} · PI ${pi}`,
          colSpan: 9,
          styles: { fillColor: PAPER_ROW, fontStyle: 'bold' },
        },
      ]);

      autoTable(doc, {
        ...tableBase,
        startY: currentY,
        head: [
          [
            {
              content: `${sem.label} · ${sem.session}`,
              colSpan: 9,
              styles: { halign: 'left', fillColor: PAPER, textColor: INK, fontStyle: 'bold', fontSize: 10, cellPadding: { top: 2, bottom: 2.5, left: 0, right: 0 } },
            },
          ],
          ['Code', 'Course title', 'Units', 'CA', 'Exam', 'Total', 'Grade', 'Point', 'Points'],
        ],
        body,
        columnStyles: {
          0: { cellWidth: 20, fontStyle: 'bold' },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 12, halign: 'right' },
          3: { cellWidth: 11, halign: 'right' },
          4: { cellWidth: 12, halign: 'right' },
          5: { cellWidth: 12, halign: 'right' },
          6: { cellWidth: 13, halign: 'right' },
          7: { cellWidth: 12, halign: 'right' },
          8: { cellWidth: 14, halign: 'right' },
        },
        didParseCell: (data: CellHookData) => {
          if (data.section === 'body' && failRows.has(data.row.index) && (data.column.index === 6 || data.column.index === 7)) {
            data.cell.styles.textColor = MARK;
          }
        },
      });
      currentY = (doc.lastAutoTable?.finalY ?? currentY) + 9;
    }
  }

  // -- Cumulative: the arc on paper, then the ink bar with the CGPA on gold
  if (currentY > pageHeight - FOOT_SPACE - 34) {
    doc.addPage();
    currentY = 20;
  }
  const standing = resolveSharedStanding(transcript);
  const degreeClass = resolveDegreeClass(standing.cgpa).transcriptLabel;
  const barHeight = 24;
  drawArc(doc, MARGIN + 13, currentY + 12, 9.5, roundCgpa(standing.cgpa));

  const barX = MARGIN + 32;
  const barWidth = contentWidth - 32;
  doc.setFillColor(...INK);
  doc.rect(barX, currentY, barWidth, barHeight, 'F');
  const cells: Array<{ label: string; value: string; width: number; gold?: boolean }> = [
    { label: 'CGPA', value: `${formatCgpa(standing.cgpa)} / 5.00`, width: 36, gold: true },
    { label: 'PI', value: `${formatCgpa(standing.pi)} / 5.00`, width: 32 },
    { label: 'Total units', value: String(standing.totalCredits), width: 26 },
    { label: 'Projected class', value: degreeClass, width: barWidth - 94 },
  ];
  let cellX = barX;
  for (const cell of cells) {
    if (cell.gold) {
      doc.setFillColor(...GOLD);
      doc.rect(cellX, currentY, cell.width, barHeight, 'F');
    }
    const colour = cell.gold ? INK : PAPER;
    setType('normal', 7.5, colour);
    doc.text(cell.label, cellX + 4, currentY + 8);
    const long = cell.value.length > 16;
    setType('bold', long ? 9.5 : 12, colour);
    doc.text(cell.value, cellX + 4, currentY + (long ? 14 : 16), { maxWidth: cell.width - 8 });
    cellX += cell.width;
  }

  // -- Foot on every page
  const footLine = [MADE_WITH_LINE, NOT_OFFICIAL_LINE, expiry ? expiryLine(expiry) : null].filter(Boolean).join(' · ');
  const pageCount = doc.internal.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    setType('bold', 8.5);
    doc.text(SELF_REPORTED_NOTICE, centre, pageHeight - 17, { align: 'center' });
    setType('normal', 7.5, INK_SOFT);
    doc.text(footLine, centre, pageHeight - 12, { align: 'center' });
    doc.text(`Page ${page} of ${pageCount}`, pageWidth - MARGIN, pageHeight - 7, { align: 'right' });
  }

  doc.save(`${(transcript.studentName || 'Shared').replace(/\s+/g, '_')}_Transcript.pdf`);
}
