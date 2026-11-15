import { ToolPage, toolMetadata } from '../ToolPage';
import { CarryOverCalculator } from '../calculators';

export const metadata = toolMetadata('carry-over-impact');

export default function CarryOverImpactPage() {
  return (
    <ToolPage slug="carry-over-impact">
      <CarryOverCalculator />
    </ToolPage>
  );
}
