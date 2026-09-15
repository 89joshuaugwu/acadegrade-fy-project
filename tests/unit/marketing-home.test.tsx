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

const { subscribeToDocumentMock } = vi.hoisted(() => ({
  subscribeToDocumentMock: vi.fn(),
}));

vi.mock('@/lib/firebase/firestore', () => ({
  subscribeToDocument: subscribeToDocumentMock,
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
      screen.getByRole('heading', { level: 1, name: /see the path behind every result/i })
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
    expect(screen.getByText(/record · understand · plan/i)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /student holding a phone showing the acadegrade academic dashboard/i })).toBeInTheDocument();
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
    expect(sequence).toHaveClass('min-w-0', 'lg:pb-[36vh]');
    expect(stages).toHaveLength(4);
    expect(stages.every((stage) => stage.classList.contains('lg:sticky'))).toBe(true);
    expect(stages[0]).toHaveClass('lg:top-24');
    expect(stages[1]).toHaveClass('lg:top-36');
    expect(stages[2]).toHaveClass('lg:top-48');
    expect(stages[3]).toHaveClass('lg:top-60');
    expect(screen.getByRole('table', { name: /illustrative semester result inputs/i }).parentElement).toHaveClass('hidden', 'sm:block');
    expect(screen.getByRole('list', { name: /illustrative courses on small screens/i })).toHaveClass('sm:hidden');
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
