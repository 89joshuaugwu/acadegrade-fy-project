import { ToolPage, toolMetadata } from '../ToolPage';
import { AdmissionAggregateCalculator } from '../AdmissionAggregateCalculator';

export const metadata = toolMetadata('admission-aggregate');

export default function AdmissionAggregatePage() {
  return (
    <ToolPage slug="admission-aggregate">
      <AdmissionAggregateCalculator />
    </ToolPage>
  );
}
