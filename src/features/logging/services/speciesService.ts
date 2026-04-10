import { collection, getDocs, getDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Species } from '../../../types';

/**
 * Species Service
 * Provides a list of common fish species and fetches from Firestore.
 */

const COMMON_SPECIES: Species[] = [
  { id: 'snoek', name: 'Snoek', xpValue: 50 },
  { id: 'baars', name: 'Baars', xpValue: 30 },
  { id: 'snoekbaars', name: 'Snoekbaars', xpValue: 60 },
  { id: 'karper', name: 'Karper', xpValue: 80 },
  { id: 'brasem', name: 'Brasem', xpValue: 20 },
  { id: 'zeebaars', name: 'Zeebaars', xpValue: 70 },
  { id: 'forel', name: 'Forel', xpValue: 40 },
  { id: 'meerval', name: 'Meerval', xpValue: 100 },
  { id: 'roofblei', name: 'Roofblei', xpValue: 55 },
  { id: 'winde', name: 'Winde', xpValue: 35 },
];

export const speciesService = {
  /**
   * Get all species from Firestore or return common ones as fallback.
   */
  async getAllSpecies(): Promise<Species[]> {
    try {
      const q = query(collection(db, 'species'), orderBy('name_nl', 'asc'));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return COMMON_SPECIES;
      }

      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Normalize name_nl → name so the rest of the app works without changes
          name: data.name_nl ?? data.name ?? doc.id,
          scientificName: data.name_latin ?? data.scientificName,
          xpValue: data.xp_base ?? data.xpValue,
        } as Species;
      });
    } catch (error) {
      console.error('Error fetching species:', error);
      return COMMON_SPECIES;
    }
  },

  /**
   * Get common species for quick selection.
   */
  getCommonSpecies(): Species[] {
    return COMMON_SPECIES;
  },

  /**
   * Fetch a single species by document ID.
   * Returns undefined if not found.
   */
  async getSpeciesById(id: string): Promise<Species | undefined> {
    try {
      const snap = await getDoc(doc(db, 'species', id));
      if (!snap.exists()) return undefined;
      const data = snap.data();
      return {
        id: snap.id,
        ...data,
        name: data.name_nl ?? data.name ?? snap.id,
        scientificName: data.name_latin ?? data.scientificName,
        xpValue: data.xp_base ?? data.xpValue,
      } as Species;
    } catch {
      return undefined;
    }
  },
};
