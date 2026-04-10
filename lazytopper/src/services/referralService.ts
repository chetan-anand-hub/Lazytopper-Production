import QRCode from "qrcode";

const REFERRAL_KEY = "lazytopper.referral.v1";
const PENDING_REFERRAL_KEY = "lazytopper.pending_referral";
const REFERRAL_CREDITED_KEY = "lazytopper.referral_credited";
const REFERRED_BY_KEY = "lazytopper.referred_by";
const REFERRAL_STORE_PREFIX = "lazytopper.refstore.";

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
      if (parsed && parsed.code) {
        syncFromStore(parsed);
        return parsed;
      }
    }
  } catch {}
  const data: ReferralData = {
    code: generateCode(),
    referrals: [],
    rewardWeeksEarned: 0,
    createdAt: new Date().toISOString(),
  };
  saveReferralData(data);
  publishToStore(data);
  return data;
}

function saveReferralData(data: ReferralData): void {
  try {
    localStorage.setItem(REFERRAL_KEY, JSON.stringify(data));
  } catch {}
}

function publishToStore(data: ReferralData): void {
  try {
    localStorage.setItem(REFERRAL_STORE_PREFIX + data.code, JSON.stringify(data));
  } catch {}
}

function syncFromStore(data: ReferralData): void {
  try {
    const storeRaw = localStorage.getItem(REFERRAL_STORE_PREFIX + data.code);
    if (storeRaw) {
      const storeData = JSON.parse(storeRaw) as ReferralData;
      if (storeData.referrals && storeData.referrals.length > data.referrals.length) {
        data.referrals = storeData.referrals;
        data.rewardWeeksEarned = Math.floor(data.referrals.length / 3);
        saveReferralData(data);
      }
    }
  } catch {}
}

export function addReferralToCode(referrerCode: string, friendIdentifier: string): void {
  try {
    const storeKey = REFERRAL_STORE_PREFIX + referrerCode;
    let storeData: ReferralData;
    const raw = localStorage.getItem(storeKey);
    if (raw) {
      storeData = JSON.parse(raw) as ReferralData;
    } else {
      storeData = {
        code: referrerCode,
        referrals: [],
        rewardWeeksEarned: 0,
        createdAt: new Date().toISOString(),
      };
    }
    if (storeData.referrals.includes(friendIdentifier)) return;
    storeData.referrals.push(friendIdentifier);
    storeData.rewardWeeksEarned = Math.floor(storeData.referrals.length / 3);
    localStorage.setItem(storeKey, JSON.stringify(storeData));
    const myData = getReferralDataRaw();
    if (myData && myData.code === referrerCode) {
      myData.referrals = storeData.referrals;
      myData.rewardWeeksEarned = storeData.rewardWeeksEarned;
      saveReferralData(myData);
    }
  } catch {}
}

function getReferralDataRaw(): ReferralData | null {
  try {
    const raw = localStorage.getItem(REFERRAL_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ReferralData;
      if (parsed && parsed.code) return parsed;
    }
  } catch {}
  return null;
}

export function addReferral(friendIdentifier: string): ReferralData {
  const data = getReferralData();
  if (data.referrals.includes(friendIdentifier)) return data;
  data.referrals.push(friendIdentifier);
  data.rewardWeeksEarned = Math.floor(data.referrals.length / 3);
  saveReferralData(data);
  publishToStore(data);
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
    addReferralToCode(pendingCode, newUserIdentifier);
    localStorage.setItem(REFERRED_BY_KEY, pendingCode);
    localStorage.setItem(REFERRAL_CREDITED_KEY, JSON.stringify({
      referrerCode: pendingCode,
      creditedAt: new Date().toISOString(),
      newUserId: newUserIdentifier,
    }));
    localStorage.removeItem(PENDING_REFERRAL_KEY);
  } catch {}
}

export async function generateQRDataUrl(text: string, width: number = 200): Promise<string> {
  return QRCode.toDataURL(text, {
    width,
    margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
    errorCorrectionLevel: "M",
  });
}
