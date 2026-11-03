/**
 * packReadyBus - PACK-READY-1: one tiny shared flag so the global toast and a mounted PacksShop banner never both show
 * (PacksShop can be embedded on /pricing, which is not /packs). Banners register while they render; the toast subscribes.
 */
let banners = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function registerReadyBanner(): () => void {
  banners += 1;
  emit();
  let done = false;
  return () => {
    if (done) return;
    done = true;
    banners -= 1;
    emit();
  };
}
export const readyBannerMounted = (): boolean => banners > 0;
export function subscribeReadyBanner(l: () => void): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
