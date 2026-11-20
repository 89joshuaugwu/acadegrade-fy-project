import { ToolPage, toolMetadata } from '../ToolPage';
import { RequiredGpaCalculator } from '../RequiredGpaCalculator';

export const metadata = toolMetadata('required-gpa');

export default function RequiredGpaPage() {
  return (
    <ToolPage slug="required-gpa">
      <RequiredGpaCalculator />
    </ToolPage>
  );
}
