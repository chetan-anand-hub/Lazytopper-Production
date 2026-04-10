const REFERRAL_KEY = "lazytopper.referral.v1";
const PENDING_REFERRAL_KEY = "lazytopper.pending_referral";
const REFERRAL_CREDITED_KEY = "lazytopper.referral_credited";
const REFERRED_BY_KEY = "lazytopper.referred_by";

export interface ReferralData {
  code: string;
  referrals: string[];
  rewardWeeksEarned: number;
  createdAt: string;
}

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "LT-";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function getReferralData(): ReferralData {
  try {
    const raw = localStorage.getItem(REFERRAL_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ReferralData;
      if (parsed && parsed.code) return parsed;
    }
  } catch {}
  const data: ReferralData = {
    code: generateCode(),
    referrals: [],
    rewardWeeksEarned: 0,
    createdAt: new Date().toISOString(),
  };
  saveReferralData(data);
  return data;
}

function saveReferralData(data: ReferralData): void {
  try {
    localStorage.setItem(REFERRAL_KEY, JSON.stringify(data));
  } catch {}
}

export function addReferral(friendIdentifier: string): ReferralData {
  const data = getReferralData();
  if (data.referrals.includes(friendIdentifier)) return data;
  data.referrals.push(friendIdentifier);
  data.rewardWeeksEarned = Math.floor(data.referrals.length / 3);
  saveReferralData(data);
  return data;
}

export function getReferralLink(code: string): string {
  const base = typeof window !== "undefined" ? window.location.origin : "https://lazytopper.com";
  return `${base}/app/?ref=${code}`;
}

export function getWhatsAppShareUrl(code: string): string {
  const link = getReferralLink(code);
  const text = `Hey! I'm using LazyTopper to prep for CBSE boards — it predicts which questions will come in the exam! Use my code ${code} to sign up: ${link}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function captureIncomingReferral(): void {
  try {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (!ref || !ref.startsWith("LT-")) return;
    const alreadyCredited = localStorage.getItem(REFERRAL_CREDITED_KEY);
    if (alreadyCredited) return;
    const myData = getReferralData();
    if (ref === myData.code) return;
    localStorage.setItem(PENDING_REFERRAL_KEY, ref);
  } catch {}
}

export function getPendingReferralCode(): string | null {
  try {
    return localStorage.getItem(PENDING_REFERRAL_KEY);
  } catch {
    return null;
  }
}

export function getReferredByCode(): string | null {
  try {
    return localStorage.getItem(REFERRED_BY_KEY);
  } catch {
    return null;
  }
}

export function creditPendingReferral(newUserIdentifier: string): void {
  try {
    const pendingCode = localStorage.getItem(PENDING_REFERRAL_KEY);
    if (!pendingCode) return;
    const alreadyCredited = localStorage.getItem(REFERRAL_CREDITED_KEY);
    if (alreadyCredited) return;
    localStorage.setItem(REFERRED_BY_KEY, pendingCode);
    localStorage.setItem(REFERRAL_CREDITED_KEY, JSON.stringify({
      referrerCode: pendingCode,
      creditedAt: new Date().toISOString(),
      newUserId: newUserIdentifier,
    }));
    localStorage.removeItem(PENDING_REFERRAL_KEY);
  } catch {}
}

export function simulateReferralCredit(friendName: string): ReferralData {
  return addReferral(friendName);
}
