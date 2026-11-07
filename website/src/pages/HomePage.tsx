import { MarketingLayout } from '../components/templates/MarketingLayout';
import { DocsInstall } from '../components/organisms/DocsInstall';
import { FeatureGrid } from '../components/organisms/FeatureGrid';
import { FeatureShowcase } from '../components/organisms/FeatureShowcase';
import { FinalCTA } from '../components/organisms/FinalCTA';
import { GitComparison } from '../components/organisms/GitComparison';
import { Hero } from '../components/organisms/Hero';
import { HowItWorks } from '../components/organisms/HowItWorks';
import { ProblemSection } from '../components/organisms/ProblemSection';
import { Reveal } from '../components/organisms/Reveal';

export default function HomePage() {
  return (
    <MarketingLayout>
      <Hero />
      <Reveal>
        <ProblemSection />
      </Reveal>
      <Reveal>
        <FeatureShowcase />
      </Reveal>
      <Reveal>
        <HowItWorks />
      </Reveal>
      <Reveal>
        <GitComparison />
      </Reveal>
      <Reveal>
        <FeatureGrid />
      </Reveal>
      <Reveal>
        <DocsInstall />
      </Reveal>
      <Reveal>
        <FinalCTA />
      </Reveal>
    </MarketingLayout>
  );
}
