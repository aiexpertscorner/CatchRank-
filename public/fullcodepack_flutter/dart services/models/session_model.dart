import 'package:cloud_firestore/cloud_firestore.dart';

class SessionModel {
  final String id;
  final String userId;
  final String spotId;
  final String mainImage; // NIEUW: Voor de cover foto in lijstjes

  final DateTime startAt;
  final DateTime? endAt;

  final bool isActive;
  final int catchCount;
  final int totalXp;

  SessionModel({
    required this.id,
    required this.userId,
    required this.spotId,
    required this.mainImage,
    required this.startAt,
    this.endAt,
    this.isActive = true,
    this.catchCount = 0,
    this.totalXp = 0,
  });

  factory SessionModel.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>? ?? {};

    // Helper om data uit geneste mappen te halen (stats)
    Map stats = data['stats'] is Map ? data['stats'] : {};

    // Datum helper (werkt met Timestamp en Strings)
    DateTime toDate(dynamic v) {
      if (v is Timestamp) return v.toDate();
      if (v is String) return DateTime.tryParse(v) ?? DateTime.now();
      return DateTime.now();
    }

    return SessionModel(
      id: doc.id,
      // userId fix
      userId: (data['userId'] ?? data['createdBy'] ?? '').toString(),
      spotId: (data['spotId'] ?? '').toString(),
      
      // Image fix (pakt de URL die Python gefixt heeft)
      mainImage: (data['mainImage'] ?? '').toString(),

      // Tijd fix (database gebruikt startTime, model startAt)
      startAt: toDate(data['startTime'] ?? data['startAt']),
      endAt: data['endTime'] != null ? toDate(data['endTime']) : null,
      
      // Status
      isActive: data['endTime'] == null, // Als er geen eindtijd is, is hij actief

      // Stats uit de sub-map halen of direct
      catchCount: (stats['totalFish'] ?? data['catchCount'] ?? 0).toInt(),
      totalXp: (stats['totalXp'] ?? data['totalXp'] ?? 0).toInt(),
    );
  }
}