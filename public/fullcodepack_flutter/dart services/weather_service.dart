import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:geolocator/geolocator.dart';
import 'package:shared_preferences/shared_preferences.dart';

class WeatherService {
  /// Let op: liever via --dart-define, maar om niks te breken houden we een fallback.
  static const String apiKeyFallback = 'PASTE_YOUR_KEY_HERE_IF_NEEDED';

  /// Pak key uit build-time define als die bestaat, anders fallback.
  static String get apiKey {
    const fromDefine = String.fromEnvironment('WEATHERAPI_KEY');
    if (fromDefine.isNotEmpty) return fromDefine;
    return apiKeyFallback;
  }

  /// Gebruik HTTPS
  static const String baseUrl = 'https://api.weatherapi.com/v1';

  /// Cache TTL (10 minuten)
  static const int _cacheTtlSeconds = 600;

  /// Fallback data (laat ik exact zoals jij 'm had)
  static final Map<String, dynamic> _fallbackData = {
    "location": {"name": "Houten (Fallback)", "country": "NL"},
    "current": {
      "temp_c": 14.0,
      "feelslike_c": 12.5,
      "condition": {
        "text": "Wisselvallig",
        "code": 1003,
        "icon": "//cdn.weatherapi.com/weather/64x64/day/116.png"
      },
      "wind_kph": 15.0,
      "wind_dir": "ZW",
      "wind_degree": 220,
      "gust_kph": 25.0,
      "pressure_mb": 1012.0,
      "humidity": 78,
      "cloud": 40,
      "vis_km": 10.0,
      "precip_mm": 0.0
    },
    "forecast": {
      "forecastday": [
        {
          "date_epoch": 1703419200,
          "day": {
            "maxtemp_c": 14.0,
            "mintemp_c": 8.0,
            "daily_chance_of_rain": 20,
            "totalprecip_mm": 0.5,
            "condition": {
              "icon": "//cdn.weatherapi.com/weather/64x64/day/116.png"
            }
          },
          "astro": {
            "moon_phase": "Waxing Gibbous",
            "moon_illumination": "84",
            "sunrise": "08:45",
            "sunset": "16:30"
          },
          "hour": []
        }
      ]
    }
  };

  // ---------------- Location helpers ----------------

  Future<Position> _determinePosition() async {
    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      return Future.error('GPS staat uit op je telefoon.');
    }

    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        return Future.error('Locatie toestemming geweigerd.');
      }
    }

    if (permission == LocationPermission.deniedForever) {
      return Future.error(
          'Locatie toestemming permanent geweigerd. Zet aan in instellingen.');
    }

    return await Geolocator.getCurrentPosition(
      timeLimit: const Duration(seconds: 5),
    );
  }

  // ---------------- Public API ----------------

  /// ✅ Backwards compatible: jouw bestaande method blijft bestaan.
  /// Default houdt hij aqi/alerts uit zoals nu.
  Future<Map<String, dynamic>> fetchWeatherData() async {
    return fetchWeatherDataMax(
      days: 3,
      aqi: false,
      alerts: false,
      lang: 'nl',
      useCache: true,
    );
  }

  /// ⭐ Nieuwe "max" method: zoveel mogelijk parameters in 1 call + caching.
  /// - aqi/alerts/lang aanpasbaar
  /// - cache voorkomt quota-verbruik
  /// - fallback op laatste stale cache of _fallbackData
  Future<Map<String, dynamic>> fetchWeatherDataMax({
    int days = 3,
    bool aqi = true,
    bool alerts = true,
    String lang = 'nl',
    bool useCache = true,
  }) async {
    try {
      final Position position = await _determinePosition();
      final q = "${position.latitude.toStringAsFixed(6)},${position.longitude.toStringAsFixed(6)}";
      print("📍 GPS Gevonden: $q");

      final cacheKey = _cacheKey(q, days, aqi, alerts, lang);

      // 1) Cache hit
      if (useCache) {
        final cached = await _readCache(cacheKey);
        if (cached != null) return cached;
      }

      // 2) Live call
      final key = apiKey;
      if (key.isEmpty || key == 'PASTE_YOUR_KEY_HERE_IF_NEEDED') {
        print("⚠️ WEATHERAPI_KEY ontbreekt. Gebruik fallback data.");
        return _fallbackData;
      }

      final uri = Uri.parse('$baseUrl/forecast.json').replace(queryParameters: {
        'key': key,
        'q': q,
        'days': '$days',
        'aqi': aqi ? 'yes' : 'no',
        'alerts': alerts ? 'yes' : 'no',
        'lang': lang,
      });

      final response = await http.get(uri).timeout(const Duration(seconds: 15));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        if (useCache) {
          await _writeCache(cacheKey, data);
        }
        return data;
      }

      print("API Fout: ${response.statusCode} ${response.body}");

      // 3) Stale cache fallback
      if (useCache) {
        final stale = await _readCache(cacheKey, allowStale: true);
        if (stale != null) return stale;
      }

      return _fallbackData;
    } catch (e) {
      print("⚠️ Service Fout: $e. Probeer stale cache, anders fallback.");

      // Als location faalt of timeout: probeer laatste cached variant (auto key)
      try {
        // Geen q beschikbaar -> probeer generieke fallback key (laatste succesvolle)
        final last = await _readLastSuccessful();
        if (last != null) return last;
      } catch (_) {}

      return _fallbackData;
    }
  }

  // ---------------- Cache ----------------

  String _cacheKey(String q, int days, bool aqi, bool alerts, String lang) {
    // q is "lat,lon" -> alleen 3 decimalen is genoeg voor cache-buckets (~100m)
    final parts = q.split(',');
    final lat = double.tryParse(parts[0]) ?? 0.0;
    final lon = double.tryParse(parts[1]) ?? 0.0;
    final bucket = "${lat.toStringAsFixed(3)},${lon.toStringAsFixed(3)}";
    return "wx:forecast:$bucket:$days:$aqi:$alerts:$lang";
  }

  Future<Map<String, dynamic>?> _readCache(String key, {bool allowStale = false}) async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(key);
    final ts = prefs.getInt('${key}_ts');
    if (raw == null || ts == null) return null;

    final ageSeconds = (DateTime.now().millisecondsSinceEpoch - ts) ~/ 1000;
    if (!allowStale && ageSeconds > _cacheTtlSeconds) return null;

    try {
      return jsonDecode(raw) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  Future<void> _writeCache(String key, Map<String, dynamic> data) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(key, jsonEncode(data));
    await prefs.setInt('${key}_ts', DateTime.now().millisecondsSinceEpoch);

    // Sla ook "laatste succesvolle payload" op als generieke fallback
    await prefs.setString('wx:last_success', jsonEncode(data));
    await prefs.setInt('wx:last_success_ts', DateTime.now().millisecondsSinceEpoch);
  }

  Future<Map<String, dynamic>?> _readLastSuccessful() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString('wx:last_success');
    if (raw == null) return null;
    try {
      return jsonDecode(raw) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }
}
