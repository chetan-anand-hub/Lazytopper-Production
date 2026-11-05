/**
 * SectionTypeLens - SCORECARD-SECTION-TYPE-1: the scorecard's "By section" (A-E) and "By question
 * type" tables. ONE component for every grading surface, live and restored, so the card looks the
 * same everywhere. Lazy-loaded by ResultsScorecard (it stays out of the entry chunk).
 *
 * Presentational only: it renders the rows it is given (scored / out of / lost) and the honest note
 * under them. It derives nothing and writes nothing. A compact table that fits a 360px phone: the
 * label takes the free width, three narrow number columns sit at the right.
 */
import "./SectionTypeLens.css";

export interface SectionTypeLensRow {
  id: string;
  label: string;
  awarded: number;
  total: number;
  lost: number;
  /** The section was only inferred by the paper read: show the "check" chip. */
  check?: boolean;
}

export interface SectionTypeLensProps {
  kind: "section" | "type";
  heading: string;
  rows: SectionTypeLensRow[];
  note?: string | null;
}

export default function SectionTypeLens({ kind, heading, rows, note }: SectionTypeLensProps) {
  if (rows.length === 0) return null;
  return (
    <section className="lt-stl" data-testid={`sc-${kind}-lens`} aria-label={heading}>
      <div className="lt-stl__h">{heading}</div>
      <table className="lt-stl__tbl">
        <thead>
          <tr>
            <th scope="col" className="lt-stl__c lt-stl__c--lbl">
              <span className="lt-stl__sr">{kind === "section" ? "Section" : "Type"}</span>
            </th>
            <th scope="col" className="lt-stl__c lt-stl__c--num">Scored</th>
            <th scope="col" className="lt-stl__c lt-stl__c--num">Out of</th>
            <th scope="col" className="lt-stl__c lt-stl__c--num">Lost</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} data-row={r.id} data-lost={r.lost} className={r.lost > 0 ? "lt-stl__r lt-stl__r--lost" : "lt-stl__r"}>
              <th scope="row" className="lt-stl__c lt-stl__c--lbl">
                {r.label}
                {r.check && <span className="lt-stl__chk" title="Worked out from the order of the questions - check it against your paper">check</span>}
              </th>
              <td className="lt-stl__c lt-stl__c--num">{r.awarded}</td>
              <td className="lt-stl__c lt-stl__c--num">{r.total}</td>
              <td className="lt-stl__c lt-stl__c--num lt-stl__lost">{r.lost > 0 ? r.lost : "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {note && <p className="lt-stl__note">{note}</p>}
    </section>
  );
}
