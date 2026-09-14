import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ElementType } from 'react';
import * as UI from '@/components/ui';
import * as Shared from '@/components/shared';
import * as Charts from '@/components/charts';

describe('DataTable', () => {
  it('renders a semantic sortable table with stable numeric columns', async () => {
    const user = userEvent.setup();
    const DataTable = (UI as Record<string, ElementType>).DataTable;
    expect(DataTable, 'DataTable must be part of the public UI registry').toBeTruthy();
    const onSort = vi.fn();

    render(
      <DataTable
        caption="Registered students"
        rows={[{ id: 'student-1', name: 'Ada Okafor', cgpa: 4.21 }]}
        rowKey={(row: { id: string }) => row.id}
        sort={{ key: 'name', direction: 'ascending' }}
        onSort={onSort}
        columns={[
          { key: 'name', header: 'Student', sortable: true, render: (row: { name: string }) => row.name },
          { key: 'cgpa', header: 'CGPA', align: 'numeric', render: (row: { cgpa: number }) => row.cgpa.toFixed(2) },
        ]}
      />
    );

    expect(screen.getByRole('table', { name: 'Registered students' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /student/i })).toHaveAttribute('aria-sort', 'ascending');
    expect(screen.getByRole('cell', { name: '4.21' })).toHaveClass('text-right');
    await user.click(screen.getByRole('button', { name: /sort by student/i }));
    expect(onSort).toHaveBeenCalledWith('name');
  });
});

describe('shared state surfaces', () => {
  it('distinguishes an error from empty data and offers a meaningful retry', async () => {
    const user = userEvent.setup();
    const ErrorState = (Shared as Record<string, ElementType>).ErrorState;
    expect(ErrorState, 'ErrorState must be part of the shared registry').toBeTruthy();
    const onRetry = vi.fn();

    render(
      <ErrorState
        title="Results could not be loaded"
        description="Check your connection and try again."
        onRetry={onRetry}
      />
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Results could not be loaded');
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows the student header seam only after scrolling', () => {
    const PageHeader = (Shared as Record<string, ElementType>).PageHeader;
    expect(PageHeader, 'PageHeader must be part of the shared registry').toBeTruthy();

    render(<PageHeader title="Dashboard" seam="curved" />);
    const seam = screen.getByTestId('page-header-seam');
    expect(Number(seam.style.getPropertyValue('--seam-line-opacity'))).toBe(0);

    Object.defineProperty(window, 'scrollY', { configurable: true, value: 20 });
    fireEvent.scroll(window);
    expect(Number(seam.style.getPropertyValue('--seam-fade-opacity'))).toBeGreaterThan(0);
  });
});

describe('supporting data controls', () => {
  it('announces the loaded slice and exposes only real pagination actions', async () => {
    const user = userEvent.setup();
    const Pagination = (UI as Record<string, ElementType>).Pagination;
    expect(Pagination, 'Pagination must be part of the public UI registry').toBeTruthy();
    const onNext = vi.fn();

    render(<Pagination shown={25} hasPrevious={false} hasNext onPrevious={() => undefined} onNext={onNext} />);
    expect(screen.getByRole('status', { name: '25 shown' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('opens row details through a named disclosure button', async () => {
    const user = userEvent.setup();
    const Disclosure = (UI as Record<string, ElementType>).Disclosure;
    expect(Disclosure, 'Disclosure must be part of the public UI registry').toBeTruthy();

    render(<Disclosure label="View Ada Okafor details"><p>Computer Science</p></Disclosure>);
    const trigger = screen.getByRole('button', { name: 'View Ada Okafor details' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Computer Science')).toBeInTheDocument();
  });

  it('frames a chart with a title, summary, and non-colour legend labels', () => {
    const ChartFrame = (Charts as Record<string, ElementType>).ChartFrame;
    expect(ChartFrame, 'ChartFrame must be part of the chart registry').toBeTruthy();

    render(
      <ChartFrame
        title="Academic trend"
        summary="CGPA improved from 3.40 to 3.71."
        legend={[
          { label: 'CGPA', colour: 'var(--chart-cgpa)', lineStyle: 'solid' },
          { label: 'PI', colour: 'var(--chart-pi)', lineStyle: 'dashed' },
        ]}
      >
        <div>Chart plot</div>
      </ChartFrame>
    );

    expect(screen.getByRole('figure', { name: 'Academic trend' })).toHaveAccessibleDescription(
      'CGPA improved from 3.40 to 3.71.'
    );
    expect(screen.getByText('CGPA')).toBeInTheDocument();
    expect(screen.getByText('PI')).toBeInTheDocument();
  });
});
