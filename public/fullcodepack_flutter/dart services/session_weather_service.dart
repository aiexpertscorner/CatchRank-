import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:dbfishing_app/services/weather_service.dart';
import 'package:dbfishing_app/services/weather_mapper.dart';

class SessionWeatherService {
  final FirebaseFirestore _db = FirebaseFirestore.instance;

  /// Call this right after you create a session doc.
  Future<void> attachWeatherStartToSession({
    required String sessionId,
    GeoPoint? geoOverride, // if you want exact spot geo
  }) async {
    final raw = await WeatherService().fetchWeatherData();
    final snapshot = WeatherMapper.toSnapshot(raw: raw, geoOverride: geoOverride);

    await _db.collection('sessions_v2').doc(sessionId).set({
      'weatherStart': snapshot,
      'updatedAt': FieldValue.serverTimestamp(),
    }, SetOptions(merge: true));
  }
}
