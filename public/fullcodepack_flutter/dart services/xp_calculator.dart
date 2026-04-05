import 'package:dbfishing_app/models/species_model.dart';

class XPCalculator {
  // =========================
  // CONFIG
  // =========================

  static const int maxXpPerCatch = 110;

  // Base XP
  static const int xpLogCatch = 10;
  static const int xpPhoto = 10;
  static const int xpLength = 5;
  static const int xpWeight = 5;
  static const int xpBait = 5;
  static const int xpNotes = 5;

  // Completeness bonus
  static const int bonus70 = 5;
  static const int bonus90 = 10;
  static const int bonus100 = 15;

  // Event bonuses
  static const int bonusBigFish = 25;
  static const int bonusNewSpecies = 20;
  static const int bonusNewSpot = 15;
  static const int bonusNightCatch = 10;
  static const int bonusPersonalRecord = 30;

  // =========================
  // MAIN ENTRY
  // =========================

  /// Hoofd XP-calculator voor een vangst
  static XPCalcResult calculate({
    required Species species,
    required Map<String, dynamic> catchData,
    bool isNewSpecies = false,
    bool isNewSpot = false,
    bool isPersonalRecord = false,
  }) {
    int xp = 0;
    final Map<String, int> breakdown = {};

    // -------------------------
    // BASE XP (velden)
    // -------------------------

    xp += xpLogCatch;
    breakdown['log'] = xpLogCatch;

    if (_hasValue(catchData['mainImage'])) {
      xp += xpPhoto;
      breakdown['photo'] = xpPhoto;
    }

    if (_hasValue(catchData['length'])) {
      xp += xpLength;
      breakdown['length'] = xpLength;
    }

    if (_hasValue(catchData['weight'])) {
      xp += xpWeight;
      breakdown['weight'] = xpWeight;
    }

    if (_hasValue(catchData['bait'])) {
      xp += xpBait;
      breakdown['bait'] = xpBait;
    }

    if (_hasValue(catchData['notes'])) {
      xp += xpNotes;
      breakdown['notes'] = xpNotes;
    }

    // -------------------------
    // COMPLETENESS BONUS
    // -------------------------

    final completeness = _completenessRatio(catchData);

    if (completeness >= 1.0) {
      xp += bonus100;
      breakdown['complete_100'] = bonus100;
    } else if (completeness >= 0.9) {
      xp += bonus90;
      breakdown['complete_90'] = bonus90;
    } else if (completeness >= 0.7) {
      xp += bonus70;
      breakdown['complete_70'] = bonus70;
    }

    // -------------------------
    // EVENT BONUSES
    // -------------------------

    if (_isBigFish(catchData, species)) {
      xp += bonusBigFish;
      breakdown['big_fish'] = bonusBigFish;
    }

    if (isNewSpecies) {
      xp += bonusNewSpecies;
      breakdown['new_species'] = bonusNewSpecies;
    }

    if (isNewSpot) {
      xp += bonusNewSpot;
      breakdown['new_spot'] = bonusNewSpot;
    }

    if (_isNightCatch(catchData)) {
      xp += bonusNightCatch;
      breakdown['night'] = bonusNightCatch;
    }

    if (isPersonalRecord) {
      xp += bonusPersonalRecord;
      breakdown['personal_record'] = bonusPersonalRecord;
    }

    // -------------------------
    // CAP (anti grind)
    // -------------------------

    if (xp > maxXpPerCatch) {
      xp = maxXpPerCatch;
      breakdown['cap'] = maxXpPerCatch;
    }

    return XPCalcResult(
      xpTotal: xp,
      breakdown: breakdown,
    );
  }

  // =========================
  // HELPERS
  // =========================

  static bool _hasValue(dynamic v) {
    if (v == null) return false;
    if (v is String) return v.trim().isNotEmpty;
    return true;
  }

  static bool _isNightCatch(Map<String, dynamic> data) {
    final DateTime? t = data['timestamp'];
    if (t == null) return false;
    return t.hour >= 22 || t.hour < 6;
  }

  static bool _isBigFish(Map<String, dynamic> data, Species species) {
    final length = data['length'];
    if (length is! num) return false;

    // Default big fish grens
    double minLength = 90;

    // Species specifieke override
    if (species.bigFishLength != null) {
      minLength = species.bigFishLength!;
    }

    return length >= minLength;
  }

  static double _completenessRatio(Map<String, dynamic> data) {
    const requiredFields = [
      'speciesGeneral',
      'speciesSpecific',
      'spotId',
      'length',
      'weight',
      'bait',
      'mainImage',
    ];

    int filled = 0;
    for (final f in requiredFields) {
      if (_hasValue(data[f])) filled++;
    }

    return filled / requiredFields.length;
  }
}

// =========================
// RESULT MODEL
// =========================

class XPCalcResult {
  final int xpTotal;
  final Map<String, int> breakdown;

  XPCalcResult({
    required this.xpTotal,
    required this.breakdown,
  });
}
