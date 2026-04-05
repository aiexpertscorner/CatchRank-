import 'package:flutter/material.dart';

class FishingBrain {
  /// De hoofdmethode die alle data analyseert en een uitgebreid advies teruggeeft.
  static Map<String, dynamic> calculateAdvice(Map<String, dynamic> weatherData) {
    if (!weatherData.containsKey('current')) {
      return _errorState();
    }

    final current = weatherData['current'];
    final double temp = (current['temp_c'] as num).toDouble();
    final double pressure = (current['pressure_mb'] as num).toDouble();
    final double windKph = (current['wind_kph'] as num).toDouble();
    final String windDir = (current['wind_dir'] as String);
    final double precip = (current['precip_mm'] as num).toDouble();
    final int cloud = (current['cloud'] as num).toInt();

    // 1. Bereken de score (0 - 100)
    double score = 70; // Startscore (neutraal/goed)

    // Luchtdruk impact (Cruciaal voor vis)
    // Ideaal is tussen 1005 en 1015 en stabiel of licht dalend.
    if (pressure < 1000) score -= 15; // Te lage druk (stormachtig)
    if (pressure > 1025) score -= 10; // Te hoge druk (passief)
    if (pressure >= 1005 && pressure <= 1015) score += 15; // Perfecte 'sweet spot'

    // Temperatuur impact
    if (temp < 5) score -= 20; // Te koud, stofwisseling laag
    if (temp > 28) score -= 15; // Te warm, zuurstofgebrek
    if (temp >= 12 && temp <= 22) score += 10; // Ideale groei/aas temp

    // Wind impact
    if (windKph > 35) score -= 20; // Te harde wind (onveilig/moeilijk)
    if (windDir.contains('O') || windDir.contains('N')) {
      score -= 10; // "Wind uit het oosten, vis laat verstek gaan"
    } else if (windDir.contains('Z') || windDir.contains('W')) {
      score += 10; // Warme zuidwester is vaak top
    }

    // Regen/Bewolking
    if (precip > 0 && precip < 2) score += 10; // Lichte regen activeert vis vaak
    if (precip > 5) score -= 15; // Plensbuien schrikken af
    if (cloud > 60) score += 5; // Bewolkt is vaak beter dan felle zon

    // Score begrenzen tussen 0 en 100
    score = score.clamp(0, 100);

    return {
      'score': score.toInt(),
      'formattedScore': "${(score / 10).toStringAsFixed(1)}", // bijv. 8.2
      'ratingText': _getRatingText(score),
      'color': _getScoreColor(score),
      'summary': _generateSummary(temp, pressure, windDir, precip),
      'advice': _generateDetailedAdvice(temp, pressure, windKph, windDir, precip),
    };
  }

  static String _getRatingText(double score) {
    if (score >= 85) return "UITMUNTEND";
    if (score >= 70) return "ZEER GOED";
    if (score >= 50) return "GEMIDDELD";
    if (score >= 30) return "MOEILIJK";
    return "SLECHT";
  }

  static Color _getScoreColor(double score) {
    if (score >= 75) return Colors.greenAccent;
    if (score >= 50) return Colors.orangeAccent;
    return Colors.redAccent;
  }

  static String _generateSummary(double temp, double pressure, String wind, double precip) {
    if (precip > 2) return "Veel neerslag verwacht. Zoek beschutting of luwte.";
    if (pressure < 1005) return "Lage luchtdruk: vis kan erg actief worden (trekgedrag).";
    if (temp > 25) return "Warm water: focus op schaduw en diepere gaten.";
    if (wind.contains('Z') || wind.contains('W')) return "Gunstige zuidwesterwind brengt actieve vis.";
    return "Stabiele condities. Een prima moment om een lijntje uit te werpen.";
  }

  static String _generateDetailedAdvice(double temp, double pressure, double wind, String dir, double precip) {
    List<String> tips = [];

    if (temp < 10) tips.add("Vis traag en met klein aas.");
    if (pressure > 1020) tips.add("Hoge druk: presenteer je aas subtiel op de bodem.");
    if (wind > 20) tips.add("Veel stroming/onderstroom: gebruik zwaarder lood.");
    if (precip > 0) tips.add("Regen spoelt voedsel in het water; vis nabij de kant.");
    
    if (tips.isEmpty) return "Standaard tactieken toepassen. Geniet van de rust!";
    return tips.join(" ");
  }

  static Map<String, dynamic> _errorState() {
    return {
      'score': 0,
      'formattedScore': '?',
      'ratingText': 'ONBEKEND',
      'color': Colors.grey,
      'summary': 'Geen weergegevens beschikbaar.',
      'advice': 'Controleer je internetverbinding.',
    };
  }
}