/**
 * templateService.ts
 *
 * Reads Setup Coach static data from Firestore:
 *   - setup_templates     (4 MVP session templates)
 *   - setup_sections      (canonical setup blocks)
 *   - setup_requirements  (required items per template per section)
 *
 * All data is seeded by seed-setup-templates.mjs and is read-only at runtime.
 * Session-level in-memory cache prevents repeated reads.
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import type {
  SetupTemplate,
  SetupSection,
  SetupRequirement,
} from '../../../types';

/* -------------------------------------------------------------------------- */
/* Session cache                                                               */
/* -------------------------------------------------------------------------- */

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes — templates rarely change

interface CacheEntry<T> {
  data: T;
  fetchedAt: number;
}

const cache = new Map<string, CacheEntry<any>>();

function fromCache<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function toCache<T>(key: string, data: T): void {
  cache.set(key, { data, fetchedAt: Date.now() });
}

export function clearTemplateCache(): void {
  cache.clear();
}

/* -------------------------------------------------------------------------- */
/* templateService                                                             */
/* -------------------------------------------------------------------------- */

export const templateService = {

  /* ── Setup Sections ────────────────────────────────────────────────────── */

  /**
   * All setup sections, sorted by sortOrder.
   */
  async getAllSections(): Promise<SetupSection[]> {
    const cacheKey = 'sections:all';
    const cached = fromCache<SetupSection[]>(cacheKey);
    if (cached) return cached;

    const snap = await getDocs(
      query(collection(db, 'setup_sections'), orderBy('sortOrder', 'asc'))
    );
    const sections = snap.docs.map((d) => ({ id: d.id, ...d.data() } as SetupSection));
    toCache(cacheKey, sections);
    return sections;
  },

  /**
   * Sections for a specific discipline.
   */
  async getSectionsForDiscipline(discipline: string): Promise<SetupSection[]> {
    const all = await this.getAllSections();
    return all.filter((s) => s.discipline.includes(discipline));
  },

  /**
   * Single section by ID.
   */
  async getSection(sectionId: string): Promise<SetupSection | null> {
    const all = await this.getAllSections();
    return all.find((s) => s.id === sectionId) ?? null;
  },

  /* ── Setup Templates ───────────────────────────────────────────────────── */

  /**
   * All templates. Returns isDefault ones first.
   */
  async getAllTemplates(): Promise<SetupTemplate[]> {
    const cacheKey = 'templates:all';
    const cached = fromCache<SetupTemplate[]>(cacheKey);
    if (cached) return cached;

    const snap = await getDocs(collection(db, 'setup_templates'));
    const templates = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as SetupTemplate))
      .sort((a, b) => {
        // isDefault first, then by discipline
        if (a.isDefault && !b.isDefault) return -1;
        if (!a.isDefault && b.isDefault) return  1;
        return 0;
      });

    toCache(cacheKey, templates);
    return templates;
  },

  /**
   * Templates for a specific discipline.
   */
  async getTemplatesForDiscipline(discipline: string): Promise<SetupTemplate[]> {
    const all = await this.getAllTemplates();
    return all.filter((t) => t.discipline === discipline);
  },

  /**
   * Single template by ID.
   */
  async getTemplate(templateId: string): Promise<SetupTemplate | null> {
    const cacheKey = `template:${templateId}`;
    const cached = fromCache<SetupTemplate>(cacheKey);
    if (cached) return cached;

    const snap = await getDoc(doc(db, 'setup_templates', templateId));
    if (!snap.exists()) return null;
    const template = { id: snap.id, ...snap.data() } as SetupTemplate;
    toCache(cacheKey, template);
    return template;
  },

  /* ── Setup Requirements ────────────────────────────────────────────────── */

  /**
   * All requirements for a specific template, sorted by sectionId then priority.
   */
  async getRequirementsForTemplate(templateId: string): Promise<SetupRequirement[]> {
    const cacheKey = `requirements:${templateId}`;
    const cached = fromCache<SetupRequirement[]>(cacheKey);
    if (cached) return cached;

    const q = query(
      collection(db, 'setup_requirements'),
      where('templateId', '==', templateId)
    );
    const snap = await getDocs(q);
    const reqs = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as SetupRequirement))
      .sort((a, b) => {
        // Sort by sectionId first, then priority order
        if (a.sectionId !== b.sectionId) return a.sectionId.localeCompare(b.sectionId);
        const order = { essential: 0, recommended: 1, optional: 2 };
        return (order[a.priority] ?? 3) - (order[b.priority] ?? 3);
      });

    toCache(cacheKey, reqs);
    return reqs;
  },

  /**
   * Requirements for a specific template AND section.
   */
  async getRequirementsForSection(
    templateId: string,
    sectionId: string
  ): Promise<SetupRequirement[]> {
    const all = await this.getRequirementsForTemplate(templateId);
    return all.filter((r) => r.sectionId === sectionId);
  },

  /**
   * Load a complete template bundle: template + requirements + sections.
   * Used by SetupBuilderModal and completenessService.
   */
  async getTemplateBundle(templateId: string): Promise<{
    template: SetupTemplate;
    requirements: SetupRequirement[];
    sections: SetupSection[];
  } | null> {
    const [template, requirements, allSections] = await Promise.all([
      this.getTemplate(templateId),
      this.getRequirementsForTemplate(templateId),
      this.getAllSections(),
    ]);

    if (!template) return null;

    const sections = allSections.filter((s) =>
      template.setupSectionIds.includes(s.id)
    );

    return { template, requirements, sections };
  },
};
