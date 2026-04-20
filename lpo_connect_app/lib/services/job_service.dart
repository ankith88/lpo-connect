import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_core/firebase_core.dart';
import '../models/job_model.dart';

class JobService {
  final FirebaseFirestore _db = FirebaseFirestore.instanceFor(
    app: Firebase.app(),
    databaseId: 'lpoconnect',
  );

  /// Streams real-time jobs for a specific LPO, ordered by creation time.
  Stream<List<JobModel>> getJobsStream(String lpoId) {
    return _db
        .collection('jobs')
        .where('lpo_id', isEqualTo: lpoId)
        .snapshots()
        .map((snapshot) {
      return snapshot.docs.map((doc) {
        return JobModel.fromFirestore(doc.data(), doc.id);
      }).toList();
    });
  }

  /// Cancels (deletes) a job.
  Future<void> deleteJob(String jobId) async {
    await _db.collection('jobs').doc(jobId).delete();
  }

  /// Searches for existing customers linked to the LPO.
  Future<List<Map<String, dynamic>>> searchCustomers(String queryText, String lpoId) async {
    if (queryText.length < 2) return [];
    
    final q = queryText.toLowerCase();
    final snapshot = await _db
        .collection('lpo')
        .doc(lpoId)
        .collection('customers')
        .where('search_name', isGreaterThanOrEqualTo: q)
        .where('search_name', isLessThanOrEqualTo: q + '\uf8ff')
        .limit(10)
        .get();

    return snapshot.docs.map((doc) => {'id': doc.id, ...doc.data()}).toList();
  }

  /// Saves a customer to the address book.
  Future<void> saveCustomer(String lpoId, Map<String, dynamic> customerData) async {
    await _db
        .collection('lpo')
        .doc(lpoId)
        .collection('customers')
        .add(customerData);
  }

  /// Creates a new job.
  Future<void> createJob(Map<String, dynamic> jobData) async {
    await _db.collection('jobs').add({
      ...jobData,
      'createdAt': FieldValue.serverTimestamp(),
    });
  }
}
