import { ToolPage, toolMetadata } from '../ToolPage';
import { CarryOverCalculator } from '../CarryOverCalculator';

export const metadata = toolMetadata('carry-over-impact');

export default function CarryOverImpactPage() {
  return (
    <ToolPage slug="carry-over-impact" lastTone="haze">
      <CarryOverCalculator />
    </ToolPage>
  );
}
