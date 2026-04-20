import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../screens/dashboard_screen.dart';
import '../screens/new_job_screen.dart';
import '../screens/service_area_screen.dart';

class ResponsiveScaffold extends StatefulWidget {
  final String title;

  const ResponsiveScaffold({
    super.key,
    required this.title,
  });

  @override
  State<ResponsiveScaffold> createState() => _ResponsiveScaffoldState();
}

class _ResponsiveScaffoldState extends State<ResponsiveScaffold> {
  int _selectedIndex = 0;

  final List<Widget> _screens = [
    const DashboardScreen(),
    const NewJobScreen(),
    const ServiceAreaScreen(),
    const Center(child: Text('Settings coming soon')),
  ];

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        bool isDesktop = constraints.maxWidth > 900;

        return Scaffold(
          appBar: isDesktop
              ? null
              : AppBar(
                  title: Text(
                    _getLabel(_selectedIndex),
                    style: const TextStyle(fontWeight: FontWeight.w900, letterSpacing: -0.5),
                  ),
                  centerTitle: true,
                  backgroundColor: Colors.white,
                  elevation: 0,
                  foregroundColor: const Color(0xFF004141),
                ),
          body: Row(
            children: [
              if (isDesktop)
                NavigationRail(
                  selectedIndex: _selectedIndex,
                  onDestinationSelected: (index) {
                    setState(() {
                      _selectedIndex = index;
                    });
                  },
                  labelType: NavigationRailLabelType.all,
                  backgroundColor: const Color(0xFF004141),
                  unselectedIconTheme: const IconThemeData(color: Colors.white70),
                  selectedIconTheme: const IconThemeData(color: Colors.white),
                  unselectedLabelTextStyle: const TextStyle(color: Colors.white70, fontSize: 11),
                  selectedLabelTextStyle: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 11),
                  destinations: const [
                    NavigationRailDestination(
                      icon: Icon(LucideIcons.layoutDashboard),
                      label: Text('Dashboard'),
                    ),
                    NavigationRailDestination(
                      icon: Icon(LucideIcons.plusCircle),
                      label: Text('New Job'),
                    ),
                    NavigationRailDestination(
                      icon: Icon(LucideIcons.map),
                      label: Text('Service Area'),
                    ),
                    NavigationRailDestination(
                      icon: Icon(LucideIcons.settings),
                      label: Text('Settings'),
                    ),
                  ],
                ),
              Expanded(
                child: Container(
                  color: const Color(0xFFF7FBF9),
                  child: AnimatedSwitcher(
                    duration: const Duration(milliseconds: 300),
                    child: _screens[_selectedIndex],
                  ),
                ),
              ),
            ],
          ),
          bottomNavigationBar: isDesktop
              ? null
              : BottomNavigationBar(
                  type: BottomNavigationBarType.fixed,
                  currentIndex: _selectedIndex,
                  onTap: (index) {
                    setState(() {
                      _selectedIndex = index;
                    });
                  },
                  selectedItemColor: const Color(0xFF004141),
                  unselectedItemColor: const Color(0xFF8FA6A0),
                  items: const [
                    BottomNavigationBarItem(
                      icon: Icon(LucideIcons.layoutDashboard),
                      label: 'Home',
                    ),
                    BottomNavigationBarItem(
                      icon: Icon(LucideIcons.plusCircle),
                      label: 'Book',
                    ),
                    BottomNavigationBarItem(
                      icon: Icon(LucideIcons.map),
                      label: 'Service',
                    ),
                    BottomNavigationBarItem(
                      icon: Icon(LucideIcons.settings),
                      label: 'More',
                    ),
                  ],
                ),
        );
      },
    );
  }

  String _getLabel(int index) {
    switch (index) {
      case 0: return 'Dashboard';
      case 1: return 'Book a Job';
      case 2: return 'Service Area';
      default: return 'Settings';
    }
  }
}
