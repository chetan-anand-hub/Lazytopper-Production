/**
 * RestoredPurchaseCard - FU-RELOAD-CARD-PACKS-ONLY (owner ruling 13 Nov 2026): a signed-out buyer who reloads the paid screen finds what
 * they bought again on /cbq-packs, /pricing and /board-pass too (not only /packs, where PacksShop already does the same thing).
 * Reads THIS tab's receipt proof (ids + Razorpay signature, no contact data) once at mount; shows the existing PurchaseCard (own lazy
 * chunk, read-only server lookup) while the visitor is signed out. "Hide" clears the proof. Nothing here grants anything.
 */
import { lazy, Suspense, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { clearReceiptProof, readReceiptProof, type ReceiptProof } from "../../services/paidReceiptProof";
import { isPacksClientEnabled } from "../../services/packs";
import PayReturnResume from "../payReturn/PayReturnResume";

import "./restoredPurchaseCard.css";

const PurchaseCard = lazy(() => import("./PurchaseCard"));

export default function RestoredPurchaseCard() {
  const { user, loading } = useAuth();
  const [proof, setProof] = useState<ReceiptProof | null>(() => (isPacksClientEnabled() ? readReceiptProof() : null));
  // PAY-RETURN-1: the same slot also answers a buyer who came back from the UPI app on a reset page (its own switch; renders nothing otherwise).
  if (!proof || user || loading) return <PayReturnResume />;
  return (
    <>
    <PayReturnResume />
    <div className="lt-rpc" data-testid="restored-purchase-card">
      <Suspense fallback={null}>
        <PurchaseCard
          proof={proof}
          onHide={() => {
            clearReceiptProof();
            setProof(null);
          }}
        />
      </Suspense>
    </div>
    </>
  );
}
