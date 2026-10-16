// src/pages/tutor/tutorFigures.ts
// TUTOR-FIX-2 T4.1 — the figure keys the client actually OFFERS the model.
//
// The server validates the model's `[[figure:key]]` against exactly the set the client sent
// (server/routes/tutor.cjs), and the prompt then licenses "the diagram beside us". So the client
// must send only keys the panel can RENDER: `resolveConceptVisual` returns a visual whose body is
// not the honest "gap" ("no diagram yet"). That makes "server-valid" == "the student sees a
// diagram" — the model can never point at an empty panel.

import {
  catalogueFiguresForTopic,
  resolveConceptVisual,
  type CatalogueFigureOption,
} from "./conceptVisualCatalogue";

export function renderableFiguresForTopic(args: {
  subject: "maths" | "science" | "";
  topicKey: string;
}): CatalogueFigureOption[] {
  return catalogueFiguresForTopic(args).filter((f) => {
    const visual = resolveConceptVisual({ subject: args.subject, topicKey: args.topicKey, conceptKey: f.key });
    return !!visual && visual.body.kind !== "gap";
  });
}
