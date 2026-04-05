import 'package:cloud_firestore/cloud_firestore.dart';

class CatchModel {
  final String id;
  final String userId;

  // Relaties (NIEUW)
  final String spotId;     // spots_v2/{spotId}
  final String sessionId;  // sessions_v2/{sessionId}

  // Vis Info
  final String speciesGeneral;
  final String speciesSpecific;

  final double weight;
  final double length;

  // Locatie & Tijd
  final DateTime timestamp;

  // (optioneel, denormalized voor UI)
  final String spotName;
  final String city;

  // Media
  final String mainImage;
  final List<String> extraImages;

  // Game Info
  final int xpEarned;

  CatchModel({
    required this.id,
    required this.userId,
    required this.spotId,
    required this.sessionId,
    required this.speciesGeneral,
    required this.speciesSpecific,
    required this.weight,
    required this.length,
    required this.timestamp,
    this.spotName = '',
    this.city = '',
    this.mainImage = '',
    this.extraImages = const [],
    this.xpEarned = 0,
  });

  factory CatchModel.fromMap(Map<String, dynamic> data, String docId) {
    return CatchModel(
      id: docId,
      userId: data['userId'] ?? '',

      spotId: data['spotId'] ?? '',
      sessionId: data['sessionId'] ?? '',

      speciesGeneral: data['speciesGeneral'] ?? 'Onbekend',
      speciesSpecific: data['speciesSpecific'] ?? '',

      weight: (data['weight'] ?? 0).toDouble(),
      length: (data['length'] ?? 0).toDouble(),

      timestamp: (data['timestamp'] as Timestamp?)?.toDate() ?? DateTime.now(),

      spotName: data['spotName'] ?? '',
      city: data['city'] ?? '',

      mainImage: data['mainImage'] ?? '',
      extraImages: List<String>.from(data['extraImages'] ?? []),

      xpEarned: (data['xpEarned'] ?? 0).toInt(),
    );
  }

  Map<String, dynamic> toMap({bool includeCreatedAtIfMissing = false}) {
    final map = <String, dynamic>{
      'userId': userId,

      'spotId': spotId,
      'sessionId': sessionId,

      'speciesGeneral': speciesGeneral,
      'speciesSpecific': speciesSpecific,
      'weight': weight,
      'length': length,
      'timestamp': Timestamp.fromDate(timestamp),

      'spotName': spotName,
      'city': city,

      'mainImage': mainImage,
      'extraImages': extraImages,

      'xpEarned': xpEarned,
      'updatedAt': FieldValue.serverTimestamp(),
    };

    if (includeCreatedAtIfMissing) {
      map['createdAt'] = FieldValue.serverTimestamp();
    }
    return map;
  }
}
