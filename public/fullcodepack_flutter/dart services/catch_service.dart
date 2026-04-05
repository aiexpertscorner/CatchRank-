import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

import 'session_service.dart';

class CatchService {
  final FirebaseFirestore db;
  final SessionService sessionService;

  CatchService(this.db, this.sessionService);

  // -------------------------
  // NEW API (map-based)
  // -------------------------
  Future<DocumentReference<Map<String, dynamic>>> addCatch({
    required Map<String, dynamic> catchData,
  }) async {
    final user = FirebaseAuth.instance.currentUser;

    // Als user niet is ingelogd, val terug op catchData userId (voor test)
    final uid = user?.uid ?? (catchData['userId']?.toString() ?? '');
    if (uid.isEmpty) {
      throw Exception('No userId available (not logged in and no userId in catchData)');
    }

    final data = <String, dynamic>{
      ...catchData,

      // force userId
      'userId': uid,

      // timestamps
      'createdAt': FieldValue.serverTimestamp(),

      // XP velden (pak altijd iets)
      'xpTotal': _asInt(catchData['xpTotal'] ?? catchData['xpEarned'] ?? catchData['xp'] ?? 0),
      'xpVersion': _asInt(catchData['xpVersion'] ?? 1),
    };

    return await db.collection('catches_v2').add(data);
  }

  // -------------------------
  // BACKWARD COMPAT API
  // Jouw UI roept deze aan
  // -------------------------
  Future<String> createCatch({
    required Map<String, dynamic> catchData,
  }) async {
    final ref = await addCatch(catchData: catchData);
    return ref.id;
  }

  // -------------------------
  // UPDATE / DELETE
  // -------------------------
  Future<void> updateCatch(
    String catchId,
    Map<String, dynamic> updates,
  ) async {
    await db.collection('catches_v2').doc(catchId).update({
      ...updates,
      'updatedAt': FieldValue.serverTimestamp(),
    });
  }

  Future<void> deleteCatch(String catchId) async {
    await db.collection('catches_v2').doc(catchId).delete();
  }

  // -------------------------
  // HELPERS
  // -------------------------
  int _asInt(dynamic v) {
    if (v == null) return 0;
    if (v is int) return v;
    if (v is num) return v.toInt();
    return int.tryParse(v.toString()) ?? 0;
  }
}
