import { ToolPage, toolMetadata } from '../ToolPage';
import { DegreeClassCalculator } from '../DegreeClassCalculator';

export const metadata = toolMetadata('degree-class-checker');

export default function DegreeClassCheckerPage() {
  return (
    <ToolPage slug="degree-class-checker">
      <DegreeClassCalculator />
    </ToolPage>
  );
}
