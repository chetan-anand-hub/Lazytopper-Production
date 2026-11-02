// Browser side of scripts/samples/generatePackSamples.ts: exposes window.__genSample(id) -> saves <id>.pdf through the paid pipeline.
import { PACK_SAMPLES } from "../../src/lib/packs/packSamples";
import { buildPackSample } from "../../src/lib/packs/packSampleBuild";

declare global {
  interface Window {
    __genSample?: (id: string) => Promise<string>;
    __sampleIds?: string[];
  }
}

window.__sampleIds = PACK_SAMPLES.map((s) => s.id);
window.__genSample = async (id: string) => {
  const spec = PACK_SAMPLES.find((s) => s.id === id);
  if (!spec) throw new Error(`unknown sample ${id}`);
  return buildPackSample(spec);
};
