import 'package:cloud_firestore/cloud_firestore.dart';

class SpotModel {
  final String id;
  final String userId; // Was createdBy, nu gestandaardiseerd
  final String name;
  final String town;
  final String province;
  final String waterType;
  final String waterSize;
  final bool nightFishing;
  final double latitude;
  final double longitude;
  final List<String> images; // Index 0 is altijd de Main Image

  SpotModel({
    required this.id,
    required this.userId,
    required this.name,
    required this.town,
    required this.province,
    required this.waterType,
    required this.waterSize,
    required this.nightFishing,
    required this.latitude,
    required this.longitude,
    required this.images,
  });

  factory SpotModel.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>? ?? {};

    // Helper voor strings
    String _str(dynamic v) => v?.toString() ?? '';
    
    // 1. Locatie fixen (GeoPoint vs losse lat/lng)
    double lat = 0.0;
    double lng = 0.0;
    if (data['location'] is GeoPoint) {
      final geo = data['location'] as GeoPoint;
      lat = geo.latitude;
      lng = geo.longitude;
    } else {
      lat = (data['lat'] ?? data['latitude'] as num?)?.toDouble() ?? 0.0;
      lng = (data['lng'] ?? data['longitude'] as num?)?.toDouble() ?? 0.0;
    }

    // 2. Images samenvoegen (Main + Extra)
    List<String> allImages = [];
    
    // Eerst de main image (als die er is)
    if (data['mainImage'] != null && data['mainImage'].toString().isNotEmpty) {
      allImages.add(data['mainImage'].toString());
    } else if (data['main_image'] != null) { // fallback oude snake_case
      allImages.add(data['main_image'].toString());
    }

    // Dan de extra images
    if (data['extraImages'] is List) {
      allImages.addAll((data['extraImages'] as List).map((e) => e.toString()));
    } else if (data['extra_images'] is List) {
      allImages.addAll((data['extra_images'] as List).map((e) => e.toString()));
    } else if (data['images'] is List) { // fallback oude model
      allImages.addAll((data['images'] as List).map((e) => e.toString()));
    }

    return SpotModel(
      id: doc.id,
      // CRUCIAAL: We kijken nu eerst naar 'userId' (van het script), dan pas createdBy
      userId: _str(data['userId'] ?? data['user_id'] ?? data['createdBy']),
      name: _str(data['name'] ?? data['title']),
      town: _str(data['town'] ?? data['city']),
      province: _str(data['province']),
      waterType: _str(data['waterType'] ?? data['water_type']),
      waterSize: _str(data['waterSize'] ?? data['water_size']),
      nightFishing: data['nightFishing'] == true || data['night_fishing_allowed'] == true,
      latitude: lat,
      longitude: lng,
      images: allImages,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'userId': userId,
      'name': name,
      'town': town,
      'province': province,
      'waterType': waterType,
      'waterSize': waterSize,
      'nightFishing': nightFishing,
      'location': GeoPoint(latitude, longitude),
      // We splitsen het weer bij opslaan voor database netheid
      'mainImage': images.isNotEmpty ? images.first : '',
      'extraImages': images.length > 1 ? images.sublist(1) : [],
      'updatedAt': FieldValue.serverTimestamp(),
    };
  }
}