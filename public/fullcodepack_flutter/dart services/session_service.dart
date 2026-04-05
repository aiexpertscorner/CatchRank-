import 'package:cloud_firestore/cloud_firestore.dart';

class SessionService {
  SessionService(this._db);
  final FirebaseFirestore _db;

  CollectionReference<Map<String, dynamic>> get _sessions =>
      _db.collection('sessions_v2');

  /// Haal actieve sessie voor user+spot op (optioneel).
  Future<DocumentSnapshot<Map<String, dynamic>>?> getActiveSessionForSpot({
    required String userId,
    required String spotId,
  }) async {
    final q = await _sessions
        .where('createdBy', isEqualTo: userId)
        .where('spotId', isEqualTo: spotId)
        .where('isActive', isEqualTo: true)
        .orderBy('lastActivityAt', descending: true)
        .limit(1)
        .get();

    if (q.docs.isEmpty) return null;
    return q.docs.first;
  }

  /// Auto-session: hergebruik actieve sessie als laatste activiteit binnen window valt,
  /// anders maak nieuwe sessie.
  Future<DocumentReference<Map<String, dynamic>>> getOrCreateAutoSession({
    required String userId,
    required String spotId,
    String? spotName,
    String? city,
    Duration window = const Duration(hours: 2),

    // later:
    String? teamId,
    String? teamName,
    String visibility = 'private', // private | team | public
  }) async {
    final now = DateTime.now();
    final cutoff = now.subtract(window);

    final q = await _sessions
        .where('createdBy', isEqualTo: userId)
        .where('spotId', isEqualTo: spotId)
        .where('isActive', isEqualTo: true)
        .orderBy('lastActivityAt', descending: true)
        .limit(1)
        .get();

    if (q.docs.isNotEmpty) {
      final doc = q.docs.first;
      final last = (doc.data()['lastActivityAt'] as Timestamp?)?.toDate();
      if (last != null && last.isAfter(cutoff)) {
        return doc.reference;
      }
    }

    final ref = _sessions.doc();
    await ref.set({
      'createdBy': userId,
      'participantIds': [userId], // v1: alleen owner

      'spotId': spotId,
      if (spotName != null) 'spotName': spotName,
      if (city != null) 'city': city,

      // scope
      'visibility': visibility,
      if (teamId != null) 'teamId': teamId,
      if (teamName != null) 'teamName': teamName,

      // timing
      'startAt': FieldValue.serverTimestamp(),
      'endAt': null,
      'isActive': true,
      'lastActivityAt': FieldValue.serverTimestamp(),

      // denorm counters
      'catchCount': 0,
      'totalXp': 0,

      'createdAt': FieldValue.serverTimestamp(),
      'updatedAt': FieldValue.serverTimestamp(),
    });

    return ref;
  }

  /// Call na catch-save: houdt sessie "levend" + counters bij.
  Future<void> touchSessionOnCatch({
    required String sessionId,
    required int xpEarned,
  }) async {
    final ref = _sessions.doc(sessionId);

    await _db.runTransaction((tx) async {
      final snap = await tx.get(ref);
      if (!snap.exists) return;

      final data = snap.data() as Map<String, dynamic>? ?? {};
      final currentCatchCount = (data['catchCount'] ?? 0) as int;
      final currentXp = (data['totalXp'] ?? 0) as int;

      tx.update(ref, {
        'catchCount': currentCatchCount + 1,
        'totalXp': currentXp + xpEarned,
        'lastActivityAt': FieldValue.serverTimestamp(),
        'updatedAt': FieldValue.serverTimestamp(),
      });
    });
  }

  Future<void> endSession(String sessionId) async {
    await _sessions.doc(sessionId).update({
      'isActive': false,
      'endAt': FieldValue.serverTimestamp(),
      'updatedAt': FieldValue.serverTimestamp(),
    });
  }
}
