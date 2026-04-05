import 'package:cloud_firestore/cloud_firestore.dart';

class UserModel {
  final String id;
  final String displayName;
  final String photoUrl;
  final DateTime createdAt;
  final int totalCatches;
  final num totalPoints; // num werkt voor int én double

  UserModel({
    required this.id,
    required this.displayName,
    required this.photoUrl,
    required this.createdAt,
    this.totalCatches = 0,
    this.totalPoints = 0,
  });

  factory UserModel.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    final stats = data['stats'] as Map<String, dynamic>? ?? {};

    return UserModel(
      id: doc.id,
      displayName: data['displayName'] ?? 'Onbekende Visser',
      photoUrl: data['photoUrl'] ?? '',
      createdAt: (data['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      totalCatches: stats['totalCatches'] ?? 0,
      totalPoints: stats['totalPoints'] ?? 0,
    );
  }
}