import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  AcademicProof,
  HomeFAQ,
  HomeHero,
  ProductStory,
  SmartAutomation,
} from '@/components/marketing';

describe('AcadeGrade landing presentation', () => {
  it('introduces the product with honest actions and privacy framing', () => {
    const { container } = render(<HomeHero />);

    expect(
      screen.getByRole('heading', { level: 1, name: /know where your degree is heading/i })
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
    expect(screen.getByText(/illustrative example/i)).toBeInTheDocument();
    expect(container.querySelector('canvas')).not.toBeInTheDocument();
  });

  it('explains the calculation boundary without implying institutional certification', () => {
    render(<AcademicProof />);

    expect(
      screen.getByRole('heading', { level: 2, name: /from semester results to a clear degree outlook/i })
    ).toBeInTheDocument();
    expect(screen.getByRole('figure', { name: /worked academic record example/i })).toBeInTheDocument();
    expect(screen.getByText(/records you enter/i)).toBeInTheDocument();
    expect(screen.getByText(/does not replace an official university record/i)).toBeInTheDocument();
  });

  it('presents the product workflow as a real ordered sequence', () => {
    render(<ProductStory />);

    expect(screen.getByRole('heading', { level: 2, name: /one record, three useful answers/i })).toBeInTheDocument();
    const workflow = screen.getByRole('list', { name: /academic workflow/i });
    expect(workflow).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByRole('heading', { level: 3, name: /record what happened/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: /see where you stand/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: /plan what comes next/i })).toBeInTheDocument();
  });

  it('makes OCR import and AI insights visible without overstating either feature', () => {
    render(<SmartAutomation />);

    expect(screen.getByRole('heading', { level: 3, name: /review the extracted courses before saving/i })).toBeInTheDocument();
    expect(screen.getByText(/image or pdf result slip/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: /ask better questions about what comes next/i })).toBeInTheDocument();
    expect(screen.getByText(/guidance, not an official academic decision/i)).toBeInTheDocument();
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
