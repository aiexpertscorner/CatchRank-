import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:dbfishing_app/services/weather_service.dart';
import 'package:dbfishing_app/services/weather_mapper.dart';

class CatchWeatherService {
  final FirebaseFirestore _db = FirebaseFirestore.instance;

  Future<void> attachWeatherToCatch({
    required String catchId,
    GeoPoint? geoOverride, // if you want exact catch geo
  }) async {
    final raw = await WeatherService().fetchWeatherData();
    final snapshot = WeatherMapper.toSnapshot(raw: raw, geoOverride: geoOverride);

    await _db.collection('catches_v2').doc(catchId).set({
      'weatherAtCatch': snapshot,
      'updatedAt': FieldValue.serverTimestamp(),
    }, SetOptions(merge: true));
  }
}
