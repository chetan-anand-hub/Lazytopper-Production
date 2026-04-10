const REFERRAL_KEY = "lazytopper.referral.v1";

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

export function addReferral(friendName: string): ReferralData {
  const data = getReferralData();
  data.referrals.push(friendName);
  const sets = Math.floor(data.referrals.length / 3);
  data.rewardWeeksEarned = sets;
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
