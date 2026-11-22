import { ToolPage, toolMetadata } from '../ToolPage';
import { WaecCreditChecker } from '../WaecCreditChecker';

export const metadata = toolMetadata('waec-credit-checker');

export default function WaecCreditCheckerPage() {
  return (
    <ToolPage slug="waec-credit-checker">
      <WaecCreditChecker />
    </ToolPage>
  );
}
