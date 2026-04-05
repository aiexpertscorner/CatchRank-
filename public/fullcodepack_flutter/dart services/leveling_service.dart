import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

class LevelingService {
  LevelingService({FirebaseFirestore? db}) : _db = db ?? FirebaseFirestore.instance;
  final FirebaseFirestore _db;

  /// XP die je minimaal nodig hebt om level N te bereiken.
  /// Level 1 = 0 XP (start).
  ///
  /// Gebaseerd op jouw richtpunten:
  /// L2=150, L4=800, L6=2200, L8=4800, L10=10000
  ///
  /// Je kunt deze waardes later 1-op-1 tweaken zonder andere code te veranderen.
  static const Map<int, int> levelXpFloor = {
    1: 0,
    2: 150,
    3: 400,
    4: 800,
    5: 1400,
    6: 2200,
    7: 3300,
    8: 4800,
    9: 6800,
    10: 10000,
  };

  /// Rank titles per level (simpel, later uitbreiden)
  String getRankTitle(int level) {
    if (level >= 10) return 'CatchRank Legend 🏆';
    if (level >= 8) return 'Big Game Angler 🎖️';
    if (level >= 6) return 'Pro Visser 🥇';
    if (level >= 4) return 'Gevorderd 🎣';
    if (level >= 2) return 'Rookie 🟢';
    return 'Beginner 🟢';
  }

  /// Bepaal level op basis van totalXp
  int calculateLevel(int totalXp) {
    if (totalXp < 0) return 1;

    // hoogste level waarvan floor <= totalXp
    int level = 1;
    for (final e in levelXpFloor.entries) {
      if (totalXp >= e.value && e.key > level) {
        level = e.key;
      }
    }
    return level;
  }

  /// XP tot volgende level (op basis van curve)
  int xpToNextLevel(int currentXp) {
    final level = calculateLevel(currentXp);
    final nextLevel = (level + 1);

    final nextFloor = levelXpFloor[nextLevel];
    if (nextFloor == null) return 0; // max level reached
    return (nextFloor - currentXp).clamp(0, 1 << 31);
  }

  /// XP multiplier per level (jouw voorstel)
  double xpMultiplierForLevel(int level) {
    if (level >= 10) return 0.7;
    if (level >= 7) return 0.8;
    if (level >= 4) return 0.9;
    return 1.0;
  }

  /// Helper: pas multiplier toe op "baseXp" die je net hebt uitgerekend bij een catch
  int applyLevelMultiplier({required int baseXp, required int userLevel}) {
    final m = xpMultiplierForLevel(userLevel);
    final adjusted = (baseXp * m).round();
    return adjusted.clamp(0, 1000000);
  }

  /// Sync user stats (telt xpEarned/xp op en update users doc).
  /// + throttle om spam-builds te voorkomen.
  Future<void> syncUserStats({
    Duration minInterval = const Duration(minutes: 10),
    bool force = false,
  }) async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return;

    final userRef = _db.collection('users').doc(user.uid);

    try {
      final userSnap = await userRef.get();
      if (!userSnap.exists) return;

      final userData = (userSnap.data() as Map<String, dynamic>?) ?? {};

      if (!force) {
        final last = (userData['last_stats_update'] as Timestamp?)?.toDate();
        if (last != null && DateTime.now().difference(last) < minInterval) {
          return;
        }
      }

      final catchesSnapshot = await _db
          .collection('catches_v2')
          .where('userId', isEqualTo: user.uid)
          .get();

      int totalXp = 0;
      int catchCount = 0;

      for (final doc in catchesSnapshot.docs) {
        final c = doc.data();
        final raw = c['xpEarned'] ?? c['xp'] ?? 0;
        final xp = (raw is num) ? raw.toInt() : int.tryParse(raw.toString()) ?? 0;
        totalXp += xp;
        catchCount++;
      }

      final newLevel = calculateLevel(totalXp);
      final newRank = getRankTitle(newLevel);

      await userRef.update({
        'total_xp': totalXp,
        'level': newLevel,
        'rank_title': newRank,
        'catch_count': catchCount,
        'last_stats_update': FieldValue.serverTimestamp(),
      });
    } catch (e) {
      // ignore: avoid_print
      print("❌ LevelingService syncUserStats error: $e");
    }
  }
}
