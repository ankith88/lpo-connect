import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';
import '../services/auth_provider.dart';
import '../widgets/responsive_scaffold.dart';

class ServiceAreaScreen extends StatefulWidget {
  const ServiceAreaScreen({super.key});

  @override
  State<ServiceAreaScreen> createState() => _ServiceAreaScreenState();
}

class _ServiceAreaScreenState extends State<ServiceAreaScreen> {
  String _searchTerm = '';
  String? _hoveredSuburb;
  GoogleMapController? _mapController;

  // Ported coordinates from React source
  static const Map<String, LatLng> _coordinatesMap = {
    'CASTLE HILL': LatLng(-33.729, 151.003),
    'KELLYVILLE': LatLng(-33.719, 150.946),
    'NORTH KELLYVILLE': LatLng(-33.693, 150.931),
    'ROUSE HILL': LatLng(-33.676, 150.922),
    'BEAUMONT HILLS': LatLng(-33.689, 150.927),
  };

  List<Map<String, dynamic>> _getTerritories(dynamic territoryData) {
    if (territoryData == null) return [];

    List<dynamic> rawData = [];
    if (territoryData is List) {
      rawData = territoryData;
    } else if (territoryData is String) {
      try {
        rawData = jsonDecode(territoryData);
      } catch (e) {
        return [];
      }
    }

    return rawData.map((item) {
      if (item is String) {
        final parts = item.split(',');
        final suburb = parts[0].trim();
        final rest = parts.length > 1 ? parts[1].trim() : '';
        final restParts = rest.split(' ');
        final state = restParts.isNotEmpty ? restParts[0] : '';
        final postcode = restParts.isNotEmpty ? restParts.last : '';

        return {
          'suburb': suburb,
          'state': state,
          'postcode': postcode,
          'lat': _coordinatesMap[suburb.toUpperCase()]?.latitude,
          'lng': _coordinatesMap[suburb.toUpperCase()]?.longitude,
        };
      } else if (item is Map) {
        final suburb = item['suburb']?.toString() ?? '';
        return {
          'suburb': suburb,
          'state': item['state']?.toString() ?? '',
          'postcode': item['postcode']?.toString() ?? '',
          'lat': item['lat'] ?? _coordinatesMap[suburb.toUpperCase()]?.latitude,
          'lng': item['lng'] ?? _coordinatesMap[suburb.toUpperCase()]?.longitude,
        };
      }
      return <String, dynamic>{};
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final lpo = context.watch<AuthProvider>().lpoMetadata;
    final allTerritories = _getTerritories(lpo?.franchiseeTerritoryJSON);
    
    final filteredTerritories = allTerritories.where((t) {
      final suburb = t['suburb'].toString().toLowerCase();
      final postcode = t['postcode'].toString();
      return suburb.contains(_searchTerm.toLowerCase()) || postcode.contains(_searchTerm);
    }).toList();

    return LayoutBuilder(
      builder: (context, constraints) {
        final isWide = constraints.maxWidth > 900;
        
        if (isWide) {
          return Row(
            children: [
              _buildSidebar(filteredTerritories),
              Expanded(child: _buildMap(filteredTerritories)),
            ],
          );
        } else {
          return Column(
            children: [
              _buildSidebar(filteredTerritories, scrollable: false),
              SizedBox(height: 400, child: _buildMap(filteredTerritories)),
            ],
          );
        }
      },
    );
  }

  Widget _buildSidebar(List<Map<String, dynamic>> territories, {bool scrollable = true}) {
    return Container(
      width: scrollable ? 400 : double.infinity,
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.5),
        border: Border(right: BorderSide(color: Colors.white.withOpacity(0.3))),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(32.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildBadge(),
                const SizedBox(height: 20),
                const Text('Service Areas', style: TextStyle(fontSize: 32, fontWeight: FontWeight.w900, color: Color(0xFF004141))),
                const SizedBox(height: 12),
                Text(
                  'Managing service availability across ${territories.length} active regions.',
                  style: const TextStyle(color: Color(0xFF5B7971), height: 1.5),
                ),
                const SizedBox(height: 32),
                _buildSearchField(),
              ],
            ),
          ),
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              itemCount: territories.length,
              itemBuilder: (context, index) {
                final t = territories[index];
                return _buildLocationCard(t);
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBadge() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(color: const Color(0xFF004141), borderRadius: BorderRadius.circular(20)),
      child: const Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(LucideIcons.navigation, color: Colors.white, size: 12),
          SizedBox(width: 6),
          Text('COVERAGE MAP', style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 1)),
        ],
      ),
    );
  }

  Widget _buildSearchField() {
    return Container(
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: const Color(0xFFE0E7E4))),
      child: TextField(
        onChanged: (v) => setState(() => _searchTerm = v),
        decoration: const InputDecoration(
          hintText: 'Search suburbs or postcodes...',
          prefixIcon: Icon(LucideIcons.search, size: 20, color: Color(0xFF8FA6A0)),
          border: InputBorder.none,
          contentPadding: EdgeInsets.all(16),
        ),
      ),
    );
  }

  Widget _buildLocationCard(Map<String, dynamic> t) {
    final isHovered = _hoveredSuburb == t['suburb'];
    return InkWell(
      onTap: () {
        if (t['lat'] != null) {
          _mapController?.animateCamera(CameraUpdate.newLatLng(LatLng(t['lat'], t['lng'])));
          setState(() => _hoveredSuburb = t['suburb']);
        }
      },
      onHover: (hovering) {
         setState(() => _hoveredSuburb = hovering ? t['suburb'] : null);
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 16),
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: isHovered ? Colors.white : Colors.white.withOpacity(0.8),
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: isHovered ? const Color(0xFF004141) : Colors.transparent),
          boxShadow: isHovered ? [BoxShadow(color: const Color(0xFF004141).withOpacity(0.05), blurRadius: 20)] : null,
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(t['suburb'], style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Color(0xFF004141))),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Text(t['state'], style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFFA0B7B0))),
                    const SizedBox(width: 12),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(color: const Color(0xFFE9F2EE), borderRadius: BorderRadius.circular(6)),
                      child: Text(t['postcode'], style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF004141))),
                    ),
                  ],
                ),
              ],
            ),
            const Text('ACTIVE', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF2ECC71), letterSpacing: 0.5)),
          ],
        ),
      ),
    );
  }

  Widget _buildMap(List<Map<String, dynamic>> territories) {
    final markers = territories
        .where((t) => t['lat'] != null)
        .map((t) => Marker(
              markerId: MarkerId(t['suburb']),
              position: LatLng(t['lat'], t['lng']),
              infoWindow: InfoWindow(title: t['suburb']),
            ))
        .toSet();

    return GoogleMap(
      onMapCreated: (controller) => _mapController = controller,
      initialCameraPosition: const CameraPosition(
        target: LatLng(-33.71, 150.97),
        zoom: 11,
      ),
      markers: markers,
      myLocationButtonEnabled: false,
      zoomControlsEnabled: true,
    );
  }
}
