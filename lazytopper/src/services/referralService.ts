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

export function generateQRDataUrl(text: string, size: number = 200): string {
  const modules = encodeToQRModules(text);
  const n = modules.length;
  const cellSize = Math.floor(size / n);
  const totalSize = cellSize * n;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalSize}" height="${totalSize}" viewBox="0 0 ${totalSize} ${totalSize}">`;
  svg += `<rect width="${totalSize}" height="${totalSize}" fill="white"/>`;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (modules[r][c]) {
        svg += `<rect x="${c * cellSize}" y="${r * cellSize}" width="${cellSize}" height="${cellSize}" fill="black"/>`;
      }
    }
  }
  svg += `</svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

function encodeToQRModules(text: string): boolean[][] {
  const size = 21;
  const grid: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  addFinderPattern(grid, 0, 0);
  addFinderPattern(grid, 0, size - 7);
  addFinderPattern(grid, size - 7, 0);
  const bytes = new TextEncoder().encode(text);
  let bitIdx = 0;
  for (let r = 8; r < size - 8; r++) {
    for (let c = 8; c < size - 8; c++) {
      if (bitIdx < bytes.length * 8) {
        const byteIndex = Math.floor(bitIdx / 8);
        const bitPos = 7 - (bitIdx % 8);
        grid[r][c] = Boolean((bytes[byteIndex] >> bitPos) & 1);
        bitIdx++;
      } else {
        grid[r][c] = (r + c) % 2 === 0;
      }
    }
  }
  return grid;
}

function addFinderPattern(grid: boolean[][], startR: number, startC: number): void {
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      const isOuter = r === 0 || r === 6 || c === 0 || c === 6;
      const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
      grid[startR + r][startC + c] = isOuter || isInner;
    }
  }
}
