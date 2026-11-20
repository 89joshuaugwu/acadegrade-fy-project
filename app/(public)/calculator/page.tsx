import { faqPageJsonLd } from '@/components/public/Accordion';
import { JsonLd, breadcrumbJsonLd, toolsMetadata, webApplicationJsonLd } from '@/components/public/tools/seo';
import { Trail } from '@/components/site/ui';
import { ToolFaqSection, ToolHero } from '@/components/site/tools/frame';
import '@/components/site/site.css';
import '@/components/site/tools/tools-v2.css';
import { CALCULATOR_COPY, CALCULATOR_FAQS } from './calculator-content';
import { CalculatorProvider } from './CalculatorProvider';
import { CalculatorClose, CalculatorReceipt, CalculatorScale, CalculatorTools } from './CalculatorSections';
import { CalculatorSlip } from './CalculatorSlip';

/**
 * /calculator, brand v2 (docs/brand-v2/BUILD_V2.md; behaviour from
 * docs/public-redesign/pages/calculator.md). A server page: the default rows
 * (GPA 4.13) are in the first HTML; the client island reads a shared
 * ?m=&c= link after mount. The layout provides header, main and footer.
 */

export const metadata = toolsMetadata({
  title: CALCULATOR_COPY.title,
  description: CALCULATOR_COPY.description,
  path: '/calculator',
  keywords: [...CALCULATOR_COPY.keywords],
});

export default function CalculatorPage() {
  return (
    <div className="ag-site">
      <CalculatorProvider>
        <ToolHero
          trail={<Trail items={[{ label: 'Free tools', href: '/tools' }, { label: 'CGPA calculator' }]} />}
          title={CALCULATOR_COPY.h1}
          sentence={CALCULATOR_COPY.sentence}
          facts={CALCULATOR_COPY.facts}
        />
        <CalculatorSlip />
        <CalculatorReceipt />
        <CalculatorScale />
        <CalculatorTools />
        <ToolFaqSection id="calculator-questions" title="Calculator questions" faqs={CALCULATOR_FAQS} tone="haze" />
        <CalculatorClose />
        <JsonLd
          data={[
            webApplicationJsonLd({
              name: 'AcadeGrade CGPA calculator',
              path: '/calculator',
              description: CALCULATOR_COPY.description,
            }),
            faqPageJsonLd(CALCULATOR_FAQS),
            breadcrumbJsonLd([
              { name: 'Home', path: '/' },
              { name: 'Free tools', path: '/tools' },
              { name: 'CGPA calculator', path: '/calculator' },
            ]),
          ]}
        />
      </CalculatorProvider>
    </div>
  );
}
