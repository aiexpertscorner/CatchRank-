class Species {
  final String id;
  final String name;
  final String latinName;
  final String group; // 'witvis', 'roofvis', 'karper', 'zeevis'
  final int baseXp;
  final String rarity; // 'common', 'uncommon', 'epic', etc.
  final String habitat; // 'Zoet' of 'Zout'

  Species({
    required this.id,
    required this.name,
    required this.latinName,
    required this.group,
    required this.baseXp,
    required this.rarity,
    required this.habitat,
  });

  // Fabriek om van Firestore data (Map) naar een Species object te gaan
  factory Species.fromMap(Map<String, dynamic> data) {
    return Species(
      id: data['species_id'] ?? '',
      name: data['name_nl'] ?? 'Onbekend',
      latinName: data['name_latin'] ?? '',
      group: data['set_group'] ?? 'witvis',
      baseXp: data['xp_base'] ?? 10,
      rarity: data['rarity'] ?? 'common',
      habitat: data['habitat'] ?? 'Zoet',
    );
  }

  // Omgekeerd: Van Species object naar Firestore (voor uploaden)
  Map<String, dynamic> toMap() {
    return {
      'species_id': id,
      'name_nl': name,
      'name_latin': latinName,
      'set_group': group,
      'xp_base': baseXp,
      'rarity': rarity,
      'habitat': habitat,
      // Later kun je hier extra velden toevoegen (images, description, etc)
    };
  }
}