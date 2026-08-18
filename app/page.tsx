import { Nav } from "./components/nav";
import { Hero } from "./components/hero";
import { PartHeader } from "./components/part-header";
import { ComplexSystem } from "./components/complex-system";
import { GrowthChart } from "./components/growth-chart";
import { QuantityQuality } from "./components/quantity-quality";
import { ThreatModels } from "./components/threat-models";
import { Disciplines } from "./components/disciplines";
import { FocusAreas } from "./components/focus-areas";
import { Barriers } from "./components/barriers";
import { ResearchAgendas } from "./components/research-agendas";
import { OrgsMap } from "./components/orgs-map";
import { Join } from "./components/join";
import { Footer } from "./components/footer";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <Nav />
      <main className="flex-1">
        <Hero />

        <PartHeader id="problem" eyebrow="Part One" title="The problem." />
        <ComplexSystem />
        <GrowthChart />
        <QuantityQuality />
        <ThreatModels />

        <PartHeader
          id="help"
          eyebrow="Part Two"
          title="The approach."
          description="Large agent systems are an object of study. Different fields see the problem in different ways. To keep large agent systems pro-human, we need to develop a common ground."
        />
        <Disciplines />
        <FocusAreas />
        <ResearchAgendas />
        <OrgsMap />

        <PartHeader
          id="start"
          eyebrow="Part Three"
          title="Take action."
          description="In the face of potentially irreversible risks, the time to start working on large agent systems is now. We highlight some pressing open problems and barriers the field faces in the near-term."
        />
        <Barriers />

        <Join />
      </main>
      <Footer />
    </div>
  );
}
