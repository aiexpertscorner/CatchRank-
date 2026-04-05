import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:dbfishing_app/models/post_model.dart';

class PostService {
  final FirebaseFirestore _db;
  final FirebaseAuth _auth;

  PostService({FirebaseFirestore? db, FirebaseAuth? auth})
      : _db = db ?? FirebaseFirestore.instance,
        _auth = auth ?? FirebaseAuth.instance;

  CollectionReference get _posts => _db.collection('posts');

  Stream<List<PostModel>> streamFeed({
    required String feedMode, // global | friends | clubs
    String? clubId,
    int limit = 30,
  }) {
    Query q = _posts.orderBy('createdAt', descending: true).limit(limit);

    if (feedMode == 'global') {
      q = q.where('visibility', isEqualTo: 'global');
    } else if (feedMode == 'friends') {
      q = q.where('visibility', whereIn: ['global', 'friends']);
    } else if (feedMode == 'clubs') {
      if (clubId != null && clubId.isNotEmpty) {
        q = q.where('visibility', isEqualTo: 'club').where('clubId', isEqualTo: clubId);
      } else {
        q = q.where('visibility', isEqualTo: 'club');
      }
    }

    return q.snapshots().map((snap) => snap.docs.map(PostModel.fromFirestore).toList());
  }

  Future<void> createUserPost({
    required String title,
    String body = "",
    String visibility = "global",
    String? clubId,
    String? clubName,
    List<Map<String, dynamic>> media = const [],
  }) async {
    final user = _auth.currentUser;
    if (user == null) throw Exception("Not logged in");

    final data = PostModel(
      id: "",
      type: PostType.user,
      authorId: user.uid,
      authorName: user.displayName ?? "Visser",
      authorPhotoUrl: user.photoURL ?? "",
      createdAt: DateTime.now(),
      visibility: visibility,
      clubId: clubId,
      clubName: clubName,
      title: title,
      body: body,
      media: media,
      meta: const {},
      likeCount: 0,
      commentCount: 0,
      saveCount: 0,
    ).toFirestore();

    await _posts.add(data);
  }
}
