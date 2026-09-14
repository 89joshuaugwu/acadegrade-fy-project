import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { useState, type ElementType } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { Select } from '@/components/ui/Select';
import * as UI from '@/components/ui';

describe('Button', () => {
  it('does not submit a surrounding form unless submit is explicit', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());

    render(
      <form onSubmit={onSubmit}>
        <Button>Preview result</Button>
      </form>
    );

    const button = screen.getByRole('button', { name: 'Preview result' });
    expect(button).toHaveAttribute('type', 'button');
    await user.click(button);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('announces and disables a pending action without losing its name', () => {
    render(<Button loading loadingLabel="Saving semester…">Save semester</Button>);

    const button = screen.getByRole('button', { name: 'Saving semester…' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });
});

describe('Switch', () => {
  it('passes disabled state to the interactive element and never changes value', async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();

    render(
      <Switch
        checked={false}
        onCheckedChange={onCheckedChange}
        disabled
        aria-label="Grade alerts"
      />
    );

    const control = screen.getByRole('switch', { name: 'Grade alerts' });
    expect(control).toBeDisabled();
    await user.click(control);
    expect(onCheckedChange).not.toHaveBeenCalled();
  });
});

describe('Input', () => {
  it('associates both help and validation messages with the field', () => {
    render(
      <Input
        id="entry-session"
        label="Entry session"
        hint="Use the format 2022/2023."
        error="The second year must follow the first year."
        required
      />
    );

    const input = screen.getByRole('textbox', { name: /entry session/i });
    expect(input).toBeRequired();
    expect(input).toHaveAttribute(
      'aria-describedby',
      'entry-session-hint entry-session-error'
    );
    expect(screen.getByText('Use the format 2022/2023.')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'The second year must follow the first year.'
    );
  });
});

describe('navigation controls', () => {
  it('renders button-styled navigation as one semantic link', () => {
    const LinkButton = (UI as Record<string, ElementType>).LinkButton;
    expect(LinkButton, 'LinkButton must be part of the public UI registry').toBeTypeOf('function');

    render(<LinkButton href="/register">Create account</LinkButton>);
    const link = screen.getByRole('link', { name: 'Create account' });
    expect(link).toHaveAttribute('href', '/register');
    expect(link.querySelector('button')).toBeNull();
  });

  it('requires an accessible name for icon-only actions', () => {
    const IconButton = (UI as Record<string, ElementType>).IconButton;
    expect(IconButton, 'IconButton must be part of the public UI registry').toBeTruthy();

    render(<IconButton aria-label="Close dialog">×</IconButton>);
    expect(screen.getByRole('button', { name: 'Close dialog' })).toHaveAttribute(
      'type',
      'button'
    );
  });
});

describe('Tabs', () => {
  it('moves selection with arrow keys and exposes the selected panel', async () => {
    const user = userEvent.setup();
    const Tabs = (UI as Record<string, ElementType>).Tabs;
    const TabsList = (UI as Record<string, ElementType>).TabsList;
    const TabsTrigger = (UI as Record<string, ElementType>).TabsTrigger;
    const TabsPanel = (UI as Record<string, ElementType>).TabsPanel;

    expect(Tabs, 'Tabs must be part of the public UI registry').toBeTypeOf('function');

    function Example() {
      const [value, setValue] = useState('forecast');
      return (
        <Tabs value={value} onValueChange={setValue}>
          <TabsList aria-label="Insight views">
            <TabsTrigger value="forecast">Forecast</TabsTrigger>
            <TabsTrigger value="risk">Risk</TabsTrigger>
            <TabsTrigger value="written">Written</TabsTrigger>
          </TabsList>
          <TabsPanel value="forecast">Forecast content</TabsPanel>
          <TabsPanel value="risk">Risk content</TabsPanel>
          <TabsPanel value="written">Written content</TabsPanel>
        </Tabs>
      );
    }

    render(<Example />);
    const forecast = screen.getByRole('tab', { name: 'Forecast' });
    forecast.focus();
    await user.keyboard('{ArrowRight}');

    expect(screen.getByRole('tab', { name: 'Risk' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Risk content');
  });
});

describe('form and choice controls', () => {
  it('provides stable accessible field metadata to custom controls', () => {
    const FormField = (UI as Record<string, ElementType>).FormField;
    expect(FormField, 'FormField must be part of the public UI registry').toBeTruthy();

    render(
      <FormField
        id="course-code"
        label="Course code"
        description="Use the code on your result."
        error="Course code is required."
      >
        {(field: { id: string; describedBy?: string; invalid: boolean }) => (
          <input id={field.id} aria-describedby={field.describedBy} aria-invalid={field.invalid} />
        )}
      </FormField>
    );

    expect(screen.getByRole('textbox', { name: 'Course code' })).toHaveAttribute(
      'aria-describedby',
      'course-code-description course-code-error'
    );
  });

  it('groups related fields under a named form section', () => {
    const FormSection = (UI as Record<string, ElementType>).FormSection;
    expect(FormSection, 'FormSection must be part of the public UI registry').toBeTruthy();

    render(
      <FormSection title="Academic details" description="Tell us about your programme.">
        <input aria-label="Matric number" />
      </FormSection>
    );

    expect(screen.getByRole('group', { name: 'Academic details' })).toContainElement(
      screen.getByRole('textbox', { name: 'Matric number' })
    );
  });

  it('keeps textarea help and error text associated with the control', () => {
    const Textarea = (UI as Record<string, ElementType>).Textarea;
    expect(Textarea, 'Textarea must be part of the public UI registry').toBeTruthy();

    render(
      <Textarea
        id="admin-message"
        label="Message"
        hint="Students will receive this message."
        error="Enter a message."
      />
    );

    expect(screen.getByRole('textbox', { name: 'Message' })).toHaveAttribute(
      'aria-describedby',
      'admin-message-hint admin-message-error'
    );
  });

  it('exposes a single selected choice in a segmented preference control', async () => {
    const user = userEvent.setup();
    const SegmentedControl = (UI as Record<string, ElementType>).SegmentedControl;
    expect(SegmentedControl, 'SegmentedControl must be part of the public UI registry').toBeTruthy();
    const onValueChange = vi.fn();

    render(
      <SegmentedControl
        aria-label="Primary metric"
        value="cgpa"
        onValueChange={onValueChange}
        options={[
          { value: 'cgpa', label: 'CGPA' },
          { value: 'pi', label: 'PI' },
        ]}
      />
    );

    expect(screen.getByRole('radio', { name: 'CGPA' })).toBeChecked();
    await user.click(screen.getByRole('radio', { name: 'PI' }));
    expect(onValueChange).toHaveBeenCalledWith('pi');
  });

  it('supports End and Enter in a long select and reports the active option', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Select
        label="Department"
        value=""
        onChange={onChange}
        options={[
          { value: 'agric', label: 'Agricultural Engineering' },
          { value: 'biology', label: 'Biology' },
          { value: 'computer-science', label: 'Computer Science' },
        ]}
      />
    );

    const combobox = screen.getByRole('combobox', { name: 'Department' });
    await user.click(combobox);
    await user.keyboard('{End}');
    expect(combobox).toHaveAttribute(
      'aria-activedescendant',
      expect.stringContaining('computer-science')
    );
    await user.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledWith('computer-science');
  });
});
