class LpoMetadata {
  final String id;
  final String name;
  final String location;
  final String address;
  final dynamic franchiseeTerritoryJSON;

  LpoMetadata({
    required this.id,
    required this.name,
    required this.location,
    required this.address,
    this.franchiseeTerritoryJSON,
  });

  factory LpoMetadata.fromFirestore(Map<String, dynamic> data, String documentId) {
    return LpoMetadata(
      id: documentId,
      name: data['name'] ?? '',
      location: data['location'] ?? '',
      address: data['address'] ?? '',
      franchiseeTerritoryJSON: data['franchiseeTerritoryJSON'],
    );
  }

  Map<String, dynamic> toFirestore() {
    return {
      'name': name,
      'location': location,
      'address': address,
      'franchiseeTerritoryJSON': franchiseeTerritoryJSON,
    };
  }
}
