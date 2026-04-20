import 'dart:convert';
import 'package:intl/intl.dart';

class BookingService {
  /// Calculates the default booking date based on the 12:00 PM cutoff.
  /// If before 12:00 PM, returns today.
  /// If after 12:00 PM (or today is a weekend), returns the next business day.
  DateTime getDefaultBookingDate({DateTime? now}) {
    now ??= DateTime.now();
    
    // Create cutoff time for today at 12:00 PM
    final cutoff = DateTime(now.year, now.month, now.day, 12, 0, 0);

    DateTime targetDate = now;

    // If past cutoff or it's a weekend (Saturday = 6, Sunday = 7)
    if (now.isAfter(cutoff) || now.weekday == DateTime.saturday || now.weekday == DateTime.sunday) {
      targetDate = getNextBusinessDay(now);
    }

    // Return the start of that day
    return DateTime(targetDate.year, targetDate.month, targetDate.day);
  }

  /// Gets the next business day (skipping Saturday and Sunday).
  DateTime getNextBusinessDay(DateTime date) {
    DateTime nextDay = date.add(const Duration(days: 1));
    while (nextDay.weekday == DateTime.saturday || nextDay.weekday == DateTime.sunday) {
      nextDay = nextDay.add(const Duration(days: 1));
    }
    return nextDay;
  }

  /// Validates if a suburb/postcode is within the LPO's territory.
  bool isValidTerritory({
    required dynamic territoryData,
    required String suburb,
    required String postcode,
  }) {
    if (territoryData == null) return true; // No restriction defined

    List<String> territories = [];
    
    if (territoryData is List) {
      territories = List<String>.from(territoryData.map((e) => e.toString()));
    } else if (territoryData is String) {
      try {
        final parsed = jsonDecode(territoryData);
        if (parsed is List) {
          territories = List<String>.from(parsed.map((e) {
            if (e is String) return e;
            if (e is Map && e.containsKey('suburb')) return e['suburb'].toString();
            return e.toString();
          }));
        }
      } catch (e) {
        print("Failed to parse territory: $e");
      }
    }

    if (territories.isEmpty) return true;

    final userSuburb = suburb.trim().toUpperCase();
    final userPostcode = postcode.trim();

    return territories.any((t) {
      final territoryStr = t.toUpperCase();
      return territoryStr.contains(userSuburb) || territoryStr.contains(userPostcode);
    });
  }

  /// Formats date for display or input fields (YYYY-MM-DD)
  String formatDate(DateTime date) {
    return DateFormat('yyyy-MM-dd').format(date);
  }
}
