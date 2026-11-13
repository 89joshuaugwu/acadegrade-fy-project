import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AcademicProof,
  HomeFAQ,
  HomeHero,
  ProductStory,
  SmartAutomation,
} from '@/components/marketing';
import { MobileAppDownload } from '@/components/ui/MobileAppDownload';
import FeaturesPage from '@/app/(public)/features/page';

const { subscribeToDocumentMock } = vi.hoisted(() => ({
  subscribeToDocumentMock: vi.fn(),
}));

vi.mock('@/lib/firebase/firestore', () => ({
  subscribeToDocument: subscribeToDocumentMock,
}));

vi.mock('@/components/marketing/PublicPage', () => ({
  PublicPage: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  EditorialHero: () => null,
  ProductCta: () => null,
  SectionIntro: () => null,
}));

beforeEach(() => {
  subscribeToDocumentMock.mockReset();
  subscribeToDocumentMock.mockImplementation((_path, onData) => {
    onData({ mobileAppLinks: { androidUrl: 'https://example.com/android.apk', iosUrl: '' } });
    return () => undefined;
  });
});

describe('AcadeGrade landing presentation', () => {
  it('introduces the product with honest actions and privacy framing', () => {
    const { container } = render(<HomeHero />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'See the path behind every result.' })
    ).toBeInTheDocument();
    expect(screen.getByText('Understand your CGPA, spot courses at risk and plan the next semester.')).toHaveClass('sr-only');
    expect(screen.getByRole('link', { name: /start your academic record/i })).toHaveAttribute(
      'href',
      '/register'
    );
    expect(screen.getByRole('link', { name: /try the cgpa calculator/i })).toHaveAttribute(
      'href',
      '/calculator'
    );
    expect(screen.getByText(/private by default/i)).toBeInTheDocument();
    expect(container.querySelector('[data-hero-type-loop]')).toHaveClass('marketing-hero-type-loop');
    expect(container.querySelector('[data-hero-type-loop]')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByRole('link', { name: /start your academic record/i })).toHaveClass('marketing-edge-cta');
    const heroArt = screen.getByRole('img', { name: /students using acadegrade on mobile to review a dashboard and scan academic records/i });
    expect(heroArt).toHaveClass('aspect-[6/7]');
    const heroImages = Array.from(heroArt.querySelectorAll('img'));
    expect(heroImages).toHaveLength(3);
    const heroSources = heroImages.map((image) => {
      const source = image.getAttribute('src') || '';
      const optimizedSource = new URL(source, 'http://localhost').searchParams.get('url') || source;
      return decodeURIComponent(optimizedSource);
    });
    expect(heroSources).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Smiling Student Showcasing Academic Dashboard.png'),
        expect.stringContaining('heroimage2.png'),
        expect.stringContaining('heroimage3.png'),
      ])
    );
    expect(heroImages.every((image) => image.getAttribute('alt') === '')).toBe(true);
    expect(heroImages[0]).toHaveClass('hero-art-image-primary');
    expect(heroImages[1]).toHaveClass('hero-art-image-secondary');
    expect(heroImages[2]).toHaveClass('hero-art-image-tertiary');
    expect(screen.getByText('100L–500L · 2025/2026 sessions')).toBeInTheDocument();
    expect(screen.getByText('Confirm your institution’s applicable rules')).toBeInTheDocument();
    expect(screen.getByText(/session and level aware/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 }).parentElement).toHaveClass('marketing-stagger');
    expect(container.querySelector('canvas')).not.toBeInTheDocument();
  });

  it('explains the calculation boundary without implying institutional certification', () => {
    render(<AcademicProof />);

    expect(screen.getByRole('heading', { level: 2, name: /calculation you can follow/i })).toBeInTheDocument();
    expect(screen.getByText(/a result becomes useful when its basis stays visible/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: /record the semester evidence/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: /weight the result by its academic load/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: /gpa and pi, side by side/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: /a trajectory, not just a total/i })).toBeInTheDocument();
    expect(screen.getByText(/semester gpa = total quality points ÷ total credits/i)).toBeInTheDocument();
    const sequence = screen.getByRole('list', { name: /illustrative calculation sequence/i });
    const stages = Array.from(sequence.children);
    expect(sequence).toHaveClass('academic-proof-deck', 'min-w-0', 'space-y-6', 'lg:space-y-0');
    expect(stages).toHaveLength(4);
    expect(stages.map((stage) => stage.getAttribute('data-stage'))).toEqual(['1', '2', '3', '4']);
    expect(stages.every(stage => stage.querySelector('.academic-proof-card'))).toBe(true);
    expect(screen.getByRole('table', { name: /illustrative semester result inputs/i }).parentElement).toHaveClass('hidden', 'sm:block');
    expect(screen.getByRole('list', { name: /illustrative courses on small screens/i })).toHaveClass('sm:hidden');
    expect(screen.getByText(/u = credit units/i)).toBeInTheDocument();
    expect(screen.getByText(/records you enter/i)).toBeInTheDocument();
    expect(screen.getByText(/does not replace an official university record/i)).toBeInTheDocument();
  });

  it('presents the product workflow as a real ordered sequence', () => {
    render(<ProductStory />);

    const heading = screen.getByRole('heading', { level: 2, name: /record\. understand\. plan\./i });
    expect(heading).toBeInTheDocument();
    const workflow = screen.getByRole('list', { name: /academic workflow/i });
    expect(workflow).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByRole('heading', { level: 3, name: /record what happened/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: /see where you stand/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: /plan what comes next/i })).toBeInTheDocument();
  });

  it('makes OCR import and AI insights visible without overstating either feature', () => {
    render(<SmartAutomation />);

    expect(screen.getByRole('heading', { level: 2, name: /turn a result slip into fields you can review/i })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /acadegrade ai result import screen/i })).toBeInTheDocument();
    const capture = screen.getByRole('list', { name: /ocr result capture workflow/i });
    expect(capture.children).toHaveLength(3);
    expect(capture).toHaveTextContent(/capture\..*review\..*save\./i);
    expect(screen.getByRole('link', { name: /explore result scanner/i })).toHaveAttribute('href', '/features/result-scanner');
    expect(screen.getByRole('heading', { level: 2, name: /ask better questions about what comes next/i })).toBeInTheDocument();
    expect(screen.getByText(/ai-generated guidance/i)).toBeInTheDocument();
  });

  it('keeps production positioning free of school-project framing', () => {
    const { container } = render(
      <main>
        <HomeHero />
        <AcademicProof />
        <ProductStory />
        <SmartAutomation />
        <HomeFAQ />
      </main>
    );

    expect(container).not.toHaveTextContent(/final[- ]year|school project|course project|defen[cs]e|github|repository/i);
  });
});

describe('live GPA and PI example', () => {
  it('recalculates with the real engine: GPA holds inside a letter band while PI follows the score', () => {
    render(<AcademicProof />);

    const slider = screen.getByRole('slider', { name: /mth 321 total score/i });
    const [gpa, pi] = screen.getAllByRole('status');
    expect(slider).toHaveValue('71');
    expect(gpa).toHaveTextContent('4.14');
    expect(pi).toHaveTextContent('3.18');

    fireEvent.change(slider, { target: { value: '95' } });
    expect(gpa).toHaveTextContent('4.14');
    expect(pi).toHaveTextContent('3.69');
    expect(slider).toHaveAttribute('aria-valuetext', '95 out of 100, grade A');

    fireEvent.change(slider, { target: { value: '65' } });
    expect(gpa).toHaveTextContent('3.71');
    expect(slider).toHaveAttribute('aria-valuetext', '65 out of 100, grade B');
  });
});

describe('mobile app availability', () => {
  it('keeps iOS non-interactive until an admin link is configured', () => {
    render(<MobileAppDownload />);

    expect(screen.getByRole('link', { name: /download for android/i })).toHaveAttribute('href', '/app/download/android');
    expect(screen.getByText(/ios coming soon/i)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /download for ios/i })).not.toBeInTheDocument();
  });

  it('reveals the stable iOS route when an admin link exists', () => {
    subscribeToDocumentMock.mockImplementationOnce((_path, onData) => {
      onData({ mobileAppLinks: { iosUrl: 'https://apps.apple.com/example' } });
      return () => undefined;
    });

    render(<MobileAppDownload />);

    expect(screen.getByRole('link', { name: /download for ios/i })).toHaveAttribute('href', '/app/download/ios');
  });
});

describe('Features page capability coverage', () => {
  it('identifies AcadeMind with its logo and explains transcript export and sharing', () => {
    render(<FeaturesPage />);

    expect(screen.getByRole('img', { name: 'AcadeMind' })).toHaveAttribute('src', expect.stringContaining('acadegradeailogo.png'));
    expect(screen.getByRole('heading', { name: /transcripts ready to export and share/i })).toBeInTheDocument();
    expect(screen.getByText(/pdf and html export/i)).toBeInTheDocument();
  });
});

describe('HomeFAQ', () => {
  it('reveals an answer from an accessible disclosure control', async () => {
    const user = userEvent.setup();
    render(<HomeFAQ />);

    const trigger = screen.getByRole('button', { name: /is acadegrade an official university record/i });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/use your institution's official records for formal verification/i)).toBeInTheDocument();
  });
});
