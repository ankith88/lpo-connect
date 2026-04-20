import 'package:cloud_firestore/cloud_firestore.dart';

class JobModel {
  final String? id;
  final String lpoId;
  final String companyName;
  final String contactPerson;
  final String phone;
  final String address;
  final String suburb;
  final String state;
  final String postcode;
  final String instructions;
  final String service; // site-to-lpo, lpo-to-site, round-trip
  final String billing; // customer, lpo
  final DateTime date;
  final String status;
  final DateTime createdAt;

  JobModel({
    this.id,
    required this.lpoId,
    required this.companyName,
    required this.contactPerson,
    required this.phone,
    required this.address,
    required this.suburb,
    required this.state,
    required this.postcode,
    required this.instructions,
    required this.service,
    required this.billing,
    required this.date,
    required this.status,
    required this.createdAt,
  });

  factory JobModel.fromFirestore(Map<String, dynamic> data, String documentId) {
    return JobModel(
      id: documentId,
      lpoId: data['lpo_id'] ?? '',
      companyName: data['customer']?['company'] ?? '',
      contactPerson: data['customer']?['contact'] ?? '',
      phone: data['customer']?['phone'] ?? '',
      address: data['customer']?['address'] ?? '',
      suburb: data['customer']?['suburb'] ?? '',
      state: data['customer']?['state'] ?? '',
      postcode: data['customer']?['postcode'] ?? '',
      instructions: data['customer']?['instructions'] ?? '',
      service: data['service'] ?? 'site-to-lpo',
      billing: data['billing'] ?? 'customer',
      date: (data['date'] is String) 
          ? DateTime.parse(data['date']) 
          : DateTime.now(),
      status: data['status'] ?? 'scheduled',
      createdAt: (data['createdAt'] is Timestamp)
          ? (data['createdAt'] as Timestamp).toDate()
          : (data['createdAt'] is String)
              ? DateTime.tryParse(data['createdAt']) ?? DateTime.now()
              : DateTime.now(),
    );
  }

  Map<String, dynamic> toFirestore() {
    return {
      'lpo_id': lpoId,
      'customer': {
        'company': companyName,
        'contact': contactPerson,
        'phone': phone,
        'address': address,
        'suburb': suburb,
        'state': state,
        'postcode': postcode,
        'instructions': instructions,
      },
      'service': service,
      'billing': billing,
      'date': date.toIso8601String().split('T')[0], // Format: YYYY-MM-DD
      'status': status,
      'createdAt': FieldValue.serverTimestamp(),
    };
  }
}
