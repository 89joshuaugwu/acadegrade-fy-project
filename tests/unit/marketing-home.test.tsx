import { render, screen } from '@testing-library/react';
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
      screen.getByRole('heading', {
        level: 1,
        name: /see the path behind every result.*understand your cgpa.*spot courses at risk.*plan the next semester/i,
      })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /start your academic record/i })).toHaveAttribute(
      'href',
      '/register'
    );
    expect(screen.getByRole('link', { name: /try the cgpa calculator/i })).toHaveAttribute(
      'href',
      '/calculator'
    );
    expect(screen.getByText(/private by default/i)).toBeInTheDocument();
    expect(screen.getByText(/record\. understand\. plan\./i)).toBeInTheDocument();
    expect(container.querySelector('[data-hero-type-loop]')).toHaveClass('marketing-hero-type-loop');
    expect(screen.getByRole('link', { name: /start your academic record/i })).toHaveClass('marketing-edge-cta');
    const heroArt = screen.getByRole('figure', { name: /students using acadegrade to review results and scan academic records/i });
    const heroImages = Array.from(heroArt.querySelectorAll('img'));
    expect(heroImages).toHaveLength(3);
    expect(heroImages.map((image) => decodeURIComponent(image.getAttribute('src') || ''))).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Smiling Student Showcasing Academic Dashboard.png'),
        expect.stringContaining('heroimage2.png'),
        expect.stringContaining('heroimage3.png'),
      ])
    );
    expect(heroImages[0]).toHaveAttribute('alt', 'Student holding a phone showing the AcadeGrade academic dashboard');
    expect(heroImages[0]).toHaveClass('hero-art-image-primary');
    expect(screen.getByText(/session and level aware/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 }).parentElement).toHaveClass('marketing-stagger');
    expect(container.querySelector('canvas')).not.toBeInTheDocument();
  });

  it('explains the calculation boundary without implying institutional certification', () => {
    render(<AcademicProof />);

    expect(
      screen.getByRole('heading', { level: 2, name: /a result becomes useful when its basis stays visible/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/01 · result input/i)).toBeInTheDocument();
    expect(screen.getByText(/02 · credit weighting/i)).toBeInTheDocument();
    expect(screen.getByText(/03 · gpa \+ pi/i)).toBeInTheDocument();
    expect(screen.getByText(/04 · degree outlook/i)).toBeInTheDocument();
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
    expect(screen.getByText(/01 · capture/i)).toBeInTheDocument();
    expect(screen.getByText(/02 · review/i)).toBeInTheDocument();
    expect(screen.getByText(/03 · save/i)).toBeInTheDocument();
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
