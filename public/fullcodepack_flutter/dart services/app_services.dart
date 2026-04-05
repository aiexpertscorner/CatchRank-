import 'package:cloud_firestore/cloud_firestore.dart';
import 'session_service.dart';
import 'catch_service.dart';

class AppServices {
  AppServices._();

  static final FirebaseFirestore db = FirebaseFirestore.instance;

  // Core services
  static final SessionService sessionService = SessionService(db);
  static final CatchService catchService = CatchService(db, sessionService);

  // later: PostService, ClubService, GearService etc.
}
