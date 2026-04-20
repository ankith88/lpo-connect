import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/lpo_model.dart';
import 'auth_service.dart';

class AuthProvider with ChangeNotifier {
  final AuthService _authService = AuthService();
  final FirebaseFirestore _db = FirebaseFirestore.instanceFor(
    app: Firebase.app(),
    databaseId: 'lpoconnect',
  );

  User? _user;
  LpoMetadata? _lpoMetadata;
  bool _isLoading = true;

  User? get user => _user;
  LpoMetadata? get lpoMetadata => _lpoMetadata;
  bool get isLoading => _isLoading;
  bool get isAuthenticated => _user != null;

  AuthProvider() {
    _init();
  }

  void _init() {
    _authService.userState.listen((User? user) async {
      _user = user;
      if (user != null) {
        await _fetchLpoMetadata(user);
      } else {
        _lpoMetadata = null;
      }
      _isLoading = false;
      notifyListeners();
    });
  }

  Future<void> _fetchLpoMetadata(User user) async {
    try {
      // 1. Try fetching user doc by UID
      DocumentSnapshot userDoc = await _db.collection('users').doc(user.uid).get();

      // 2. Fallback to email if UID doc doesn't exist
      if (!userDoc.exists && user.email != null) {
        userDoc = await _db.collection('users').doc(user.email).get();
      }

      if (userDoc.exists) {
        final data = userDoc.data() as Map<String, dynamic>;
        final String? lpoId = data['lpo_id'];

        if (lpoId != null) {
          // 3. Fetch LPO Metadata
          DocumentSnapshot lpoDoc = await _db.collection('lpo').doc(lpoId).get();
          if (lpoDoc.exists) {
            _lpoMetadata = LpoMetadata.fromFirestore(
              lpoDoc.data() as Map<String, dynamic>,
              lpoId,
            );
          }
        }
      }
    } catch (e) {
      print("Error fetching LPO metadata in AuthProvider: $e");
    }
  }

  Future<void> login(String email, String password) async {
    _isLoading = true;
    notifyListeners();
    try {
      await _authService.signIn(email, password);
    } catch (e) {
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }

  Future<void> logout() async {
    await _authService.signOut();
  }
}
