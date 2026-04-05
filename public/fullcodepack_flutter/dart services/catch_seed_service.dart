import 'package:flutter/services.dart' show rootBundle;
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:intl/intl.dart';
import 'package:dbfishing_app/models/species_model.dart';
import 'package:dbfishing_app/models/catch_model.dart';
import 'package:dbfishing_app/services/xp_calculator.dart';

class CatchSeedService {
  final FirebaseFirestore _db = FirebaseFirestore.instance;

  Future<void> migrateCatchesFromCsv() async {
    try {
      print("🚀 Start migratie... We maken de database schoon!");

      // 1. Soorten inladen voor XP engine
      Map<String, Species> speciesMap = {};
      final speciesSnapshot = await _db.collection('species').get();
      for (var doc in speciesSnapshot.docs) {
        final s = Species.fromMap(doc.data());
        speciesMap[s.name.toLowerCase()] = s;
      }

      if (speciesMap.isEmpty) {
        print("❌ CRITISCH: Geen soorten gevonden! Draai eerst de species upload.");
        return;
      }

      // 2. CSV Lezen
      final String csvContent = await rootBundle.loadString('assets/data/catches.csv');
      List<String> lines = csvContent.split('\n');
      if (lines.isNotEmpty) lines.removeAt(0); // Header (met rommelige namen) weggooien

      WriteBatch batch = _db.batch();
      int counter = 0;
      int successCount = 0;
      int skipCount = 0;

      for (String line in lines) {
        if (line.trim().isEmpty) continue;
        
        // Simpele split (werkt zolang er geen komma's IN de tekstvelden staan)
        List<String> cells = line.split(','); 

        if (cells.length < 10) continue;

        try {
          // --- HIER PAKKEN WE DE ROMMELIGE CSV KOLOMMEN ---
          String oldId = cells[0].trim();           // ID
          String dateStr = cells[1].trim();         // Datum
          String userId = cells[2].trim();          // User_UID
          String spotName = cells[3].trim();        // spot_name
          // Index 4, 5, 6 slaan we over (Sessie, Plaats, Soort_algemeen)
          String specificSpecies = cells[7].trim(); // Soort_specifiek
          double weight = double.tryParse(cells[8].trim()) ?? 0.0; // Gewicht (KG)
          double length = double.tryParse(cells[9].trim()) ?? 0.0; // Lengte (CM)
          // Index 10, 11, 12 slaan we over
          String image = cells[13].trim();          // mainImage

          // --- DATUM PARSEN ---
          DateTime date;
          try {
             // CSV format is dd/MM/yyyy
             date = DateFormat('d/M/yyyy').parse(dateStr);
          } catch (e) {
             date = DateTime.now();
          }

          // --- VIS KOPPELEN & XP BEREKENEN ---
          Species? species = speciesMap[specificSpecies.toLowerCase()];
          
          // Fallback: Als 'Spiegelkarper' niet bestaat, zoek 'Karper' (kolom 6)
          if (species == null && cells.length > 6) {
             species = speciesMap[cells[6].trim().toLowerCase()];
          }

          if (species == null) {
            print("⚠️ Vis onbekend: '$specificSpecies' (ID: $oldId). Check species.csv!");
            skipCount++;
            continue; 
          }

          int newXp = XPCalculator.calculateCatchXP(
            species: species, 
            weightKg: weight, 
            lengthCm: length
          );

          // --- HET SCHONE MODEL MAKEN ---
          final cleanCatch = Catch(
            id: oldId,
            userId: userId,
            speciesId: species.id,
            speciesName: species.name, // De officiële naam uit species DB, niet de CSV naam!
            weight: weight,
            length: length,
            xp: newXp,
            date: date,
            location: spotName,
            imageUrl: image.isNotEmpty ? image : null,
          );

          // Opslaan in 'catches_v2' (Schone collectie)
          DocumentReference docRef = _db.collection('catches_v2').doc(oldId);
          batch.set(docRef, cleanCatch.toMap());

          counter++;
          successCount++;

          if (counter == 400) {
            await batch.commit();
            batch = _db.batch();
            counter = 0;
          }

        } catch (e) {
          print("❌ Fout bij regel: $line -> $e");
          skipCount++;
        }
      }

      if (counter > 0) await batch.commit();

      print("🏁 Migratie Klaar!");
      print("✅ $successCount vangsten schoon in catches_v2");
      print("⏭️ $skipCount overgeslagen");

    } catch (e) {
      print("❌ Error: $e");
    }
  }
}