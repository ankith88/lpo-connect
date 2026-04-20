import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:provider/provider.dart';
import 'firebase_options.dart';
import 'theme/app_theme.dart';
import 'services/auth_provider.dart';
import 'widgets/responsive_scaffold.dart';
import 'screens/dashboard_screen.dart';
import 'screens/sign_in_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );
  
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
      ],
      child: const LpoConnectApp(),
    ),
  );
}

class LpoConnectApp extends StatelessWidget {
  const LpoConnectApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'LPO Connect',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      home: Consumer<AuthProvider>(
        builder: (context, auth, _) {
          if (auth.isLoading) {
            return const Scaffold(
              body: Center(
                child: CircularProgressIndicator(),
              ),
            );
          }
          
          if (!auth.isAuthenticated) {
            return const SignInScreen();
          }
          
          return const ResponsiveScaffold(
            title: 'LPO Connect',
          );
        },
      ),
    );
  }
}
