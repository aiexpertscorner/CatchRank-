import 'package:cloud_firestore/cloud_firestore.dart';

enum PostType { auto, user }

class PostModel {
  final String id;
  final PostType type;

  final String authorId;
  final String authorName;
  final String authorPhotoUrl;

  final DateTime createdAt;

  /// global | friends | club
  final String visibility;

  final String? clubId;
  final String? clubName;

  final String title;
  final String body;

  final List<Map<String, dynamic>> media;
  final Map<String, dynamic> meta;

  final int likeCount;
  final int commentCount;
  final int saveCount;

  PostModel({
    required this.id,
    required this.type,
    required this.authorId,
    required this.authorName,
    required this.authorPhotoUrl,
    required this.createdAt,
    required this.visibility,
    required this.clubId,
    required this.clubName,
    required this.title,
    required this.body,
    required this.media,
    required this.meta,
    required this.likeCount,
    required this.commentCount,
    required this.saveCount,
  });

  factory PostModel.fromFirestore(DocumentSnapshot doc) {
    final data = (doc.data() as Map<String, dynamic>?) ?? {};

    final typeStr = (data['type'] ?? 'user').toString();
    final PostType type = typeStr == 'auto' ? PostType.auto : PostType.user;

    final Timestamp? ts = data['createdAt'] as Timestamp?;
    final createdAt = ts?.toDate() ?? DateTime.fromMillisecondsSinceEpoch(0);

    final stats = (data['stats'] as Map<String, dynamic>?) ?? {};

    final rawMedia = (data['media'] as List?) ?? const [];
    final mediaSafe = rawMedia
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList();

    return PostModel(
      id: doc.id,
      type: type,
      authorId: (data['authorId'] ?? '').toString(),
      authorName: (data['authorName'] ?? 'Visser').toString(),
      authorPhotoUrl: (data['authorPhotoUrl'] ?? '').toString(),
      createdAt: createdAt,
      visibility: (data['visibility'] ?? 'global').toString(),
      clubId: data['clubId']?.toString(),
      clubName: data['clubName']?.toString(),
      title: (data['title'] ?? '').toString(),
      body: (data['body'] ?? '').toString(),
      media: mediaSafe,
      meta: Map<String, dynamic>.from((data['meta'] as Map?) ?? {}),
      likeCount: (stats['likeCount'] ?? 0) as int,
      commentCount: (stats['commentCount'] ?? 0) as int,
      saveCount: (stats['saveCount'] ?? 0) as int,
    );
  }

  Map<String, dynamic> toFirestore() {
    return {
      'type': type == PostType.auto ? 'auto' : 'user',
      'authorId': authorId,
      'authorName': authorName,
      'authorPhotoUrl': authorPhotoUrl,
      'createdAt': FieldValue.serverTimestamp(),
      'visibility': visibility,
      if (clubId != null) 'clubId': clubId,
      if (clubName != null) 'clubName': clubName,
      'title': title,
      'body': body,
      'media': media,
      'meta': meta,
      'stats': {
        'likeCount': likeCount,
        'commentCount': commentCount,
        'saveCount': saveCount,
      },
    };
  }
}
