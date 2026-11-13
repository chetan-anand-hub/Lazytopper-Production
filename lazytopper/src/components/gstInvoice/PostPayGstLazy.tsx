/** GST-AFTER-PAY-1 - the signed-in PaidSheet's own lazy door to PostPayGst (its chunk loads only with the sheet, and renders nothing with the flag off). */
import { lazy, Suspense } from "react";

const PostPayGst = lazy(() => import("./PostPayGst"));

export default function PostPayGstLazy({ orderId }: { orderId: string }) {
  return (
    <Suspense fallback={null}>
      <PostPayGst target={{ kind: "account", orderId }} />
    </Suspense>
  );
}
