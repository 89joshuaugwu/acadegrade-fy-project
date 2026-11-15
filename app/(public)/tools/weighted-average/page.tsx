import { ToolPage, toolMetadata } from '../ToolPage';
import { WeightedAverageCalculator } from '../calculators';

export const metadata = toolMetadata('weighted-average');

export default function WeightedAveragePage() {
  return (
    <ToolPage slug="weighted-average">
      <WeightedAverageCalculator />
    </ToolPage>
  );
}
