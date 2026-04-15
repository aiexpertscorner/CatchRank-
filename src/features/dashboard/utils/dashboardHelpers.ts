/**
 * Dashboard helper utilities.
 * Centralised normalisation for catch / session / spot display data,
 * handling both v2 schema fields and legacy migration fallbacks.
 */

import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Catch, Session, Spot } from '../../../types';

/* ──────────────────────────────────────────────────────────────
   Catch helpers
   ────────────────────────────────────────────────────────────── */

export function getCatchSpecies(c: Partial<Catch>): string {
  return (
    (c as any).speciesSpecific ||
    (c as any).speciesGeneral ||
    c.species ||
    'Onbekend'
  );
}

export function getCatchImage(c: Partial<Catch>): string {
  return (c as any).mainImage || c.photoURL || '';
}

export function getCatchTimestampDate(c: Partial<Catch>): Date | null {
  const raw = (c as any).timestamp || (c as any).catchTime;
  if (!raw) return null;
  if (typeof raw?.toDate === 'function') return raw.toDate();
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

/* ──────────────────────────────────────────────────────────────
   Session helpers
   ────────────────────────────────────────────────────────────── */

export function getSessionName(s: Partial<Session> | null | undefined): string {
  return (s as any)?.name || (s as any)?.title || 'Sessie';
}

export function getSessionStartDate(s: Partial<Session> | null | undefined): Date | null {
  const raw = (s as any)?.startTime || (s as any)?.startedAt;
  if (!raw) return null;
  if (typeof raw?.toDate === 'function') return raw.toDate();
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function getSessionEndDate(s: Partial<Session> | null | undefined): Date | null {
  const raw = (s as any)?.endTime || (s as any)?.endedAt;
  if (!raw) return null;
  if (typeof raw?.toDate === 'function') return raw.toDate();
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function getSessionCatchCount(s: Partial<Session> | null | undefined): number {
  return (
    (s as any)?.stats?.totalCatches ||
    (s as any)?.statsSummary?.totalCatches ||
    (s as any)?.linkedCatchIds?.length ||
    0
  );
}

export function getSessionSpotName(s: Partial<Session> | null | undefined): string {
  return (
    (s as any)?.spotName ||
    (s as any)?.locationName ||
    (s as any)?.spotTitle ||
    'Onbekende stek'
  );
}

export function getSessionStatus(s: Partial<Session> | null | undefined): string {
  return (s as any)?.status || ((s as any)?.isActive ? 'active' : 'complete');
}

/* ──────────────────────────────────────────────────────────────
   Spot helpers
   ────────────────────────────────────────────────────────────── */

export function getSpotName(s: Partial<Spot>): string {
  return (s as any)?.title || s.name || 'Onbekende stek';
}

export function getSpotWaterType(s: Partial<Spot>): string {
  return (s as any)?.waterType || (s as any)?.water_type || 'Water';
}

export function getSpotCatchCount(s: Partial<Spot>): number {
  return (s as any)?.statsSummary?.totalCatches || s.stats?.totalCatches || 0;
}

export function getSpotImage(s: Partial<Spot>): string {
  return (s as any)?.mainImage || (s as any)?.mainPhotoURL || '';
}

/* ──────────────────────────────────────────────────────────────
   Session image — local static fallback map
   Maps numeric legacy session IDs to their primary "Foto" filename
   stored in public/assets/images/sessions/. Returned as a Storage-
   style path so LazyImage / media.ts resolves it to the local URL.
   ────────────────────────────────────────────────────────────── */

const SESSION_FOTO_MAP: Record<string, string> = {
  '2':   '2.Extra Foto 1.195505.jpg',
  '6':   '6.Foto.192854.jpg',
  '8':   '8.Foto.194326.jpg',
  '9':   '9.Foto.194355.jpg',
  '10':  '10.Foto.194420.jpg',
  '11':  '11.Foto.195243.jpg',
  '13':  '13.Foto.000254.jpg',
  '15':  '15.Foto.000432.jpg',
  '16':  '16.Foto.204608.jpg',
  '17':  '17.Foto.205321.jpg',
  '18':  '18.Foto.205955.jpg',
  '19':  '19.Foto.000040.jpg',
  '20':  '20.Foto.235742.jpg',
  '21':  '21.Foto.213805.jpg',
  '23':  '23.Foto.141010.jpg',
  '24':  '24.Foto.190802.jpg',
  '25':  '25.Foto.190859.jpg',
  '26':  '26.Foto.155342.jpg',
  '29':  '29.Foto.120720.jpg',
  '30':  '30.Foto.184414.jpg',
  '31':  '31.Foto.133843.jpg',
  '33':  '33.Foto.155023.jpg',
  '34':  '34.Foto.123741.jpg',
  '35':  '35.Foto.010101.jpg',
  '36':  '36.Foto.125537.jpg',
  '37':  '37.Foto.174926.jpg',
  '38':  '38.Foto.014117.jpg',
  '39':  '39.Foto.150005.jpg',
  '40':  '40.Foto.135726.jpg',
  '41':  '41.Foto.131855.jpg',
  '42':  '42.Foto.174748.jpg',
  '43':  '43.Foto.122847.jpg',
  '44':  '44.Foto.184448.jpg',
  '45':  '45.Foto.155358.jpg',
  '46':  '46.Foto.145125.jpg',
  '47':  '47.Foto.190833.jpg',
  '48':  '48.Foto.182335.jpg',
  '49':  '49.Foto.161217.jpg',
  '50':  '50.Foto.191918.jpg',
  '51':  '51.Foto.185247.jpg',
  '52':  '52.Foto.163130.jpg',
  '53':  '53.Foto.192609.jpg',
  '56':  '56.Foto.171229.jpg',
  '58':  '58.Foto.110303.jpg',
  '149': '149.Foto.195931.jpg',
  '151': '151.Foto.193810.jpg',
};

export function getSessionImage(s: Partial<Session> | null | undefined): string {
  if (!s) return '';
  // Check explicit image fields first (new user uploads)
  const stored = (s as any)?.mainImage || (s as any)?.photoURL || (s as any)?.imageUrl || '';
  if (stored) return stored;
  // Fall back to local static mapping using the Firestore document ID
  const docId = String((s as any)?.id || '');
  const filename = SESSION_FOTO_MAP[docId];
  if (filename) return `images/sessions/${filename}`;
  return '';
}

/* ──────────────────────────────────────────────────────────────
   Date/time formatters
   ────────────────────────────────────────────────────────────── */

export function formatDateShort(value: any): string {
  const date = value?.toDate?.() ?? (value ? new Date(value) : null);
  return date ? format(date, 'd MMM', { locale: nl }) : 'Onbekend';
}

export function formatTimeShort(value: any): string {
  const date = value?.toDate?.() ?? (value ? new Date(value) : null);
  return date ? format(date, 'HH:mm', { locale: nl }) : '--:--';
}

export function formatDateTimeShort(date: Date | null): string {
  if (!date) return 'Onbekend';
  return format(date, 'd MMM HH:mm', { locale: nl });
}

/* ──────────────────────────────────────────────────────────────
   Browser geolocation
   ────────────────────────────────────────────────────────────── */

export function getBrowserPosition(): Promise<{ lat: number; lon: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 10 * 60 * 1000 }
    );
  });
}
