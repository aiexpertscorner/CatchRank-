import 'package:cloud_firestore/cloud_firestore.dart';

class DataUploadService {
  final FirebaseFirestore _db = FirebaseFirestore.instance;

  // Deze functie roep je 1x aan om je DB te vullen
  Future<void> uploadSpeciesCsv(String csvContent) async {
    // 1. Splits de CSV in regels
    List<String> lines = csvContent.split('\n');

    // Check of er data is
    if (lines.length <= 1) return;

    // Haal de header eraf (eerste regel)
    // Headers: species_id, name_nl, xp_base, difficulty, name_latin, ...
    lines.removeAt(0);

    WriteBatch batch = _db.batch();
    int counter = 0;

    for (String line in lines) {
      if (line.trim().isEmpty) continue;

      // Splits op komma's
      List<String> cells = line.split(',');

      // VEILIGHEIDSCHECK: Zorg dat we genoeg kolommen hebben
      // (Pas dit getal aan als je CSV verandert, in je voorbeeld zijn het er ~23)
      if (cells.length < 5) continue; 

      // Data mappen (Volgorde van je CSV!)
      String id = cells[0].trim();
      String nameNL = cells[1].trim();
      int xpBase = int.tryParse(cells[2].trim()) ?? 10;
      String latin = cells[4].trim();
      String group = cells[6].trim(); // set_group staat op index 6
      String rarity = cells[9].trim();
      String habitat = cells[15].trim(); // habitat staat verderop

      // Maak document referentie
      DocumentReference docRef = _db.collection('species').doc(id);

      // Zet in batch
      batch.set(docRef, {
        'species_id': id,
        'name_nl': nameNL,
        'name_latin': latin,
        'set_group': group,
        'xp_base': xpBase,
        'rarity': rarity,
        'habitat': habitat,
        'last_updated': FieldValue.serverTimestamp(),
      });

      counter++;

      // Firebase Batches mogen max 500 operaties hebben
      if (counter == 450) {
        await batch.commit();
        batch = _db.batch();
        counter = 0;
      }
    }

    // Laatste restje committen
    if (counter > 0) {
      await batch.commit();
    }
    
    print("✅ Succesvol geüpload!");
  }
}