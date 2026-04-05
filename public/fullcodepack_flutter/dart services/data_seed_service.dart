import 'package:flutter/services.dart' show rootBundle;
import 'package:cloud_firestore/cloud_firestore.dart';

class DataSeedService {
  final FirebaseFirestore _db = FirebaseFirestore.instance;

  Future<void> uploadSpeciesFromAsset() async {
    try {
      print("🚀 Start uploaden van species...");
      
      // 1. Lees het bestand
      final String csvContent = await rootBundle.loadString('assets/data/species.csv');
      
      // 2. Splits in regels
      List<String> lines = csvContent.split('\n');
      
      // Header overslaan
      if (lines.isNotEmpty) lines.removeAt(0);

      WriteBatch batch = _db.batch();
      int counter = 0;
      int totalUploaded = 0;

      for (String line in lines) {
        if (line.trim().isEmpty) continue;
        
        List<String> cells = line.split(',');
        
        // Simpele check op aantal kolommen (in jouw csv zijn het er ca 23)
        if (cells.length < 10) continue; 

        // Data mapping (let op de indexen uit jouw CSV!)
        // Index 0=id, 1=name_nl, 2=xp, 4=latin, 6=group, 9=rarity, 15=habitat
        String id = cells[0].trim();
        
        Map<String, dynamic> data = {
          'species_id': id,
          'name_nl': cells[1].trim(),
          'name_latin': cells[4].trim(),
          'set_group': cells[6].trim().toLowerCase(),
          'xp_base': int.tryParse(cells[2].trim()) ?? 10,
          'rarity': cells[9].trim(),
          'habitat': cells[15].trim(),
          'search_keywords': _generateKeywords(cells[1].trim()), // Handig voor zoekfunctie later
        };

        DocumentReference docRef = _db.collection('species').doc(id);
        batch.set(docRef, data);

        counter++;
        totalUploaded++;

        // Firebase batch limiet is 500
        if (counter == 400) {
          await batch.commit();
          batch = _db.batch();
          counter = 0;
        }
      }

      // Restant committen
      if (counter > 0) {
        await batch.commit();
      }

      print("✅ Klaar! $totalUploaded soorten geüpload naar Firestore.");
      
    } catch (e) {
      print("❌ Fout bij uploaden: $e");
    }
  }

  // Helper voor zoekfunctie (maakt 'snoek' -> ['s','sn','sno','snoe','snoek'])
  List<String> _generateKeywords(String name) {
    List<String> keywords = [];
    String temp = "";
    for (int i = 0; i < name.length; i++) {
      temp = temp + name[i].toLowerCase();
      keywords.add(temp);
    }
    return keywords;
  }
}