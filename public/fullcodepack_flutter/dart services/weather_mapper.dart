import 'package:cloud_firestore/cloud_firestore.dart';

class WeatherMapper {
  /// Map WeatherAPI forecast.json response to a clean snapshot for Firestore.
  /// - Backwards compatible: behoudt jouw huidige keys
  /// - Adds extra fields (druktrend, dauwpunt, heatindex, kans op regen, etc.)
  /// - Adds small hourly summary (nextHours) without saving all 72 hours
  static Map<String, dynamic> toSnapshot({
    required Map<String, dynamic> raw,
    GeoPoint? geoOverride,
    int nextHoursCount = 6, // hoeveel uur vooruit compact opslaan
  }) {
    final location = (raw['location'] as Map?)?.cast<String, dynamic>() ?? {};
    final current = (raw['current'] as Map?)?.cast<String, dynamic>() ?? {};
    final condition = (current['condition'] as Map?)?.cast<String, dynamic>() ?? {};
    final forecast = (raw['forecast'] as Map?)?.cast<String, dynamic>() ?? {};
    final forecastDayList = (forecast['forecastday'] as List?) ?? [];

    Map<String, dynamic> firstDay = {};
    if (forecastDayList.isNotEmpty) {
      firstDay = (forecastDayList.first as Map?)?.cast<String, dynamic>() ?? {};
    }

    final astro = (firstDay['astro'] as Map?)?.cast<String, dynamic>() ?? {};
    final day = (firstDay['day'] as Map?)?.cast<String, dynamic>() ?? {};
    final hours = (firstDay['hour'] as List?) ?? const [];

    double? numD(dynamic v) => (v is num) ? v.toDouble() : double.tryParse('$v');
    int? numI(dynamic v) => (v is num) ? v.toInt() : int.tryParse('$v');
    bool? numB(dynamic v) {
      if (v is bool) return v;
      final s = '$v'.toLowerCase().trim();
      if (s == '1' || s == 'true' || s == 'yes') return true;
      if (s == '0' || s == 'false' || s == 'no') return false;
      return null;
    }

    final double? lat = geoOverride?.latitude ?? numD(location['lat']);
    final double? lng = geoOverride?.longitude ?? numD(location['lon']);

    // ---- Extra: pressure trend (simple) ----
    // WeatherAPI heeft geen directe "trend", dus we schatten:
    // current pressure vs. pressure ~3 uur geleden (als hour data beschikbaar is).
    final double? pressureNow = numD(current['pressure_mb']);
    final _PressureTrend pressureTrend = _computePressureTrend(
      hours: hours,
      pressureNow: pressureNow,
    );

    // ---- Extra: next hours compact ----
    final nextHours = _mapNextHours(
      hours: hours,
      count: nextHoursCount,
      numD: numD,
      numI: numI,
    );

    // ---- Day summary (vandaag) ----
    final todaySummary = {
      'maxTempC': numD(day['maxtemp_c']),
      'minTempC': numD(day['mintemp_c']),
      'avgTempC': numD(day['avgtemp_c']),
      'maxWindKph': numD(day['maxwind_kph']),
      'totalPrecipMm': numD(day['totalprecip_mm']),
      'chanceOfRain': numI(day['daily_chance_of_rain']),
      'chanceOfSnow': numI(day['daily_chance_of_snow']),
      'avgHumidityPct': numI(day['avghumidity']),
      'uv': numD(day['uv']),
    };

    // ---- Air quality (als aqi=yes) ----
    final air = (current['air_quality'] as Map?)?.cast<String, dynamic>();
    final airQuality = air == null
        ? null
        : {
            'co': numD(air['co']),
            'no2': numD(air['no2']),
            'o3': numD(air['o3']),
            'so2': numD(air['so2']),
            'pm2_5': numD(air['pm2_5']),
            'pm10': numD(air['pm10']),
            'usEpaIndex': numI(air['us-epa-index']),
            'gbDefraIndex': numI(air['gb-defra-index']),
          };

    // ---- Alerts (als alerts=yes + plan ondersteunt het) ----
    final alertsBlock = (raw['alerts'] as Map?)?.cast<String, dynamic>();
    final alertsList = (alertsBlock?['alert'] as List?) ?? const [];
    final alerts = alertsList.take(3).map((a) {
      final m = (a as Map?)?.cast<String, dynamic>() ?? {};
      return {
        'headline': m['headline'],
        'event': m['event'],
        'severity': m['severity'],
        'urgency': m['urgency'],
        'areas': m['areas'],
        'category': m['category'],
        'effective': m['effective'],
        'expires': m['expires'],
        'desc': m['desc'],
        'instruction': m['instruction'],
      };
    }).toList();

    // ---- Backwards compatible snapshot (jouw bestaande keys blijven) ----
    return {
      'source': 'weatherapi',
      'capturedAt': FieldValue.serverTimestamp(),

      'locationName': location['name'] ?? '',
      'lat': lat,
      'lng': lng,

      'tempC': numD(current['temp_c']),
      'feelslikeC': numD(current['feelslike_c']),
      'windKph': numD(current['wind_kph']),
      'windDir': current['wind_dir'],
      'windDegree': numI(current['wind_degree']),
      'gustKph': numD(current['gust_kph']),

      'pressureMb': pressureNow,
      'pressureTrend': pressureTrend.label, // NEW: "rising"/"falling"/"steady"
      'pressureDelta3hMb': pressureTrend.delta3hMb, // NEW

      'humidityPct': numI(current['humidity']),
      'cloudPct': numI(current['cloud']),
      'visKm': numD(current['vis_km']),
      'precipMm': numD(current['precip_mm']),
      'uv': numD(current['uv']),

      'conditionText': condition['text'],
      'conditionCode': numI(condition['code']),
      'conditionIcon': condition['icon'],

      // NEW: extra comfort/physics fields (current)
      'isDay': numI(current['is_day']) == 1,
      'tempF': numD(current['temp_f']),
      'feelslikeF': numD(current['feelslike_f']),
      'windMph': numD(current['wind_mph']),
      'gustMph': numD(current['gust_mph']),
      'pressureIn': numD(current['pressure_in']),
      'precipIn': numD(current['precip_in']),
      'humidityRatio': _pctToRatio(numI(current['humidity'])),
      'cloudRatio': _pctToRatio(numI(current['cloud'])),
      'dewpointC': numD(current['dewpoint_c']), // komt vaak in hour, niet altijd in current
      'heatindexC': numD(current['heatindex_c']),
      'windchillC': numD(current['windchill_c']),
      'windKmH': numD(current['wind_kph']), // alias (soms handig)
      'visibilityMiles': numD(current['vis_miles']),
      'lastUpdatedEpoch': numI(current['last_updated_epoch']),

      // NEW: day/today summary
      'today': todaySummary,

      // NEW: compact hourly vooruit (klein!)
      'nextHours': nextHours,

      // NEW: astro uitgebreider
      'astro': {
        'sunrise': _hhmm(astro['sunrise']),
        'sunset': _hhmm(astro['sunset']),
        'moonPhase': astro['moon_phase'],
        'moonIlluminationPct': numI(astro['moon_illumination']),
        'moonrise': _hhmm(astro['moonrise']),
        'moonset': _hhmm(astro['moonset']),
      },

      // NEW: air quality + alerts (indien aanwezig)
      if (airQuality != null) 'airQuality': airQuality,
      if (alerts.isNotEmpty) 'alerts': alerts,
    };
  }

  // -------- Helpers --------

  static double? _pctToRatio(int? pct) {
    if (pct == null) return null;
    return (pct.clamp(0, 100)) / 100.0;
  }

  static String? _hhmm(dynamic v) {
    if (v == null) return null;
    final s = v.toString().trim();
    if (s.isEmpty) return null;
    final cleaned = s.replaceAll(RegExp(r'\s?(AM|PM)', caseSensitive: false), '');
    return cleaned.length >= 5 ? cleaned.substring(0, 5) : cleaned;
  }

  static List<Map<String, dynamic>> _mapNextHours({
    required List hours,
    required int count,
    required double? Function(dynamic) numD,
    required int? Function(dynamic) numI,
  }) {
    // Pak eerste X uur items (meestal is dit "vanaf nu", maar kan ook vanaf 00:00 zijn).
    // Voor simpele compactheid nemen we de eerste X uit de lijst.
    // Wil je echt "vanaf nu", dan kan ik dat ook (op basis van time_epoch).
    final slice = hours.take(count).toList();

    return slice.map((h) {
      final m = (h as Map?)?.cast<String, dynamic>() ?? {};
      final cond = (m['condition'] as Map?)?.cast<String, dynamic>() ?? {};

      return {
        'timeEpoch': numI(m['time_epoch']),
        'tempC': numD(m['temp_c']),
        'feelslikeC': numD(m['feelslike_c']),
        'windKph': numD(m['wind_kph']),
        'gustKph': numD(m['gust_kph']),
        'windDegree': numI(m['wind_degree']),
        'windDir': m['wind_dir'],
        'pressureMb': numD(m['pressure_mb']),
        'humidityPct': numI(m['humidity']),
        'cloudPct': numI(m['cloud']),
        'precipMm': numD(m['precip_mm']),
        'chanceOfRain': numI(m['chance_of_rain']),
        'chanceOfSnow': numI(m['chance_of_snow']),
        'visKm': numD(m['vis_km']),
        'uv': numD(m['uv']),
        'dewpointC': numD(m['dewpoint_c']),
        'heatindexC': numD(m['heatindex_c']),
        'windchillC': numD(m['windchill_c']),
        'conditionText': cond['text'],
        'conditionCode': numI(cond['code']),
        'conditionIcon': cond['icon'],
      };
    }).toList();
  }

  static _PressureTrend _computePressureTrend({
    required List hours,
    required double? pressureNow,
  }) {
    if (pressureNow == null || hours.isEmpty) {
      return _PressureTrend(label: 'unknown', delta3hMb: null);
    }

    // Neem een uuritem "ongeveer 3 uur geleden" uit de lijst.
    // Simpel: index 0 is vaak begin van dag; dit is niet perfect.
    // In jouw app werkt dit vooral als je bij start sessie data pakt
    // en nextHours ook gebruikt. Later kunnen we 'vanaf nu' indexeren.
    final idx = hours.length >= 4 ? 3 : hours.length - 1;
    final m = (hours[idx] as Map?)?.cast<String, dynamic>() ?? {};
    final prev = (m['pressure_mb'] is num) ? (m['pressure_mb'] as num).toDouble() : null;

    if (prev == null) return _PressureTrend(label: 'unknown', delta3hMb: null);

    final delta = pressureNow - prev;
    const threshold = 0.8; // mb drempel (tweakbaar)
    final label = (delta > threshold)
        ? 'rising'
        : (delta < -threshold)
            ? 'falling'
            : 'steady';

    return _PressureTrend(label: label, delta3hMb: double.parse(delta.toStringAsFixed(1)));
  }
}

class _PressureTrend {
  _PressureTrend({required this.label, required this.delta3hMb});
  final String label; // rising / falling / steady / unknown
  final double? delta3hMb;
}
