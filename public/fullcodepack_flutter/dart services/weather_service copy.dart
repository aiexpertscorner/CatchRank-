import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:geolocator/geolocator.dart';

class WeatherService {
  // JOUW API KEY
  static const String apiKey = 'e3a6d60d44a445358d305608252412'; 
  static const String baseUrl = 'http://api.weatherapi.com/v1';

  // Fallback data
  static final Map<String, dynamic> _fallbackData = {
    "location": {"name": "Houten (Fallback)", "country": "NL"},
    "current": {
      "temp_c": 14.0, "feelslike_c": 12.5,
      "condition": {"text": "Wisselvallig", "code": 1003, "icon":"//cdn.weatherapi.com/weather/64x64/day/116.png"},
      "wind_kph": 15.0, "wind_dir": "ZW", "wind_degree": 220, "gust_kph": 25.0,
      "pressure_mb": 1012.0, "humidity": 78,
      "cloud": 40, "vis_km": 10.0, "precip_mm": 0.0
    },
    "forecast": {
      "forecastday": [
        {
          "date_epoch": 1703419200,
          "day": {
             "maxtemp_c": 14.0, "mintemp_c": 8.0, 
             "daily_chance_of_rain": 20, "totalprecip_mm": 0.5,
             "condition": {"icon":"//cdn.weatherapi.com/weather/64x64/day/116.png"}
          },
          "astro": {"moon_phase": "Waxing Gibbous", "moon_illumination": "84", "sunrise":"08:45", "sunset":"16:30"},
          "hour": []
        }
      ]
    }
  };

  // Hulpfunctie om permissies te regelen
  Future<Position> _determinePosition() async {
    bool serviceEnabled;
    LocationPermission permission;

    // 1. Staat GPS aan op de telefoon?
    serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      return Future.error('GPS staat uit op je telefoon.');
    }

    // 2. Check of we al toestemming hebben
    permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      // Zo nee, vraag het aan de gebruiker (de popup!)
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        return Future.error('Locatie toestemming geweigerd.');
      }
    }
    
    if (permission == LocationPermission.deniedForever) {
      return Future.error('Locatie toestemming permanent geweigerd. Zet aan in instellingen.');
    }

    // 3. Alles OK? Haal positie op.
    // TimeLimit verhoogd naar 5 sec, fysieke telefoons hebben soms even nodig.
    return await Geolocator.getCurrentPosition(
      timeLimit: const Duration(seconds: 5) 
    );
  }

  Future<Map<String, dynamic>> fetchWeatherData() async {
    try {
      // Gebruik onze nieuwe veilige functie
      Position position = await _determinePosition();

      String q = "${position.latitude},${position.longitude}";
      print("📍 GPS Gevonden: $q"); // Debug print om te zien of het werkt

      // API Aanroepen
      final url = Uri.parse('$baseUrl/forecast.json?key=$apiKey&q=$q&days=3&aqi=no&alerts=no');
      final response = await http.get(url);

      if (response.statusCode == 200) {
        return json.decode(response.body);
      } else {
        print("API Fout: ${response.statusCode}");
        return _fallbackData;
      }
    } catch (e) {
      print("⚠️ Service Fout: $e. Gebruik fallback data.");
      return _fallbackData;
    }
  }
}