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
