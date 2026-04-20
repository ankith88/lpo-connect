import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../services/auth_provider.dart';
import '../services/job_service.dart';
import '../models/job_model.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final JobService _jobService = JobService();
  String _activeTab = 'upcoming'; // 'upcoming', 'active', 'history'
  String _searchTerm = '';

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final lpoId = auth.lpoMetadata?.id;

    if (lpoId == null) {
      return const Center(child: CircularProgressIndicator());
    }

    return StreamBuilder<List<JobModel>>(
      stream: _jobService.getJobsStream(lpoId),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }

        final allJobs = snapshot.data ?? [];
        
        // Filter by Tab and Search
        final filteredJobs = _filterJobs(allJobs);
        
        // Group by Date
        final groupedJobs = _groupJobsByDate(filteredJobs);

        return SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildHeader(context, auth),
              const SizedBox(height: 32),
              _buildStatsRow(allJobs),
              const SizedBox(height: 32),
              _buildControls(),
              const SizedBox(height: 24),
              _buildTimeline(groupedJobs),
            ],
          ),
        );
      },
    );
  }

  List<JobModel> _filterJobs(List<JobModel> jobs) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);

    return jobs.where((job) {
      // Search filter
      final matchesSearch = job.companyName.toLowerCase().contains(_searchTerm.toLowerCase()) ||
          job.address.toLowerCase().contains(_searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      // Tab filter
      final jobDate = DateTime(job.date.year, job.date.month, job.date.day);
      if (_activeTab == 'active') return jobDate.isAtSameMomentAs(today);
      if (_activeTab == 'upcoming') return jobDate.isAfter(today);
      if (_activeTab == 'history') return jobDate.isBefore(today);

      return true;
    }).toList();
  }

  Map<DateTime, List<JobModel>> _groupJobsByDate(List<JobModel> jobs) {
    final Map<DateTime, List<JobModel>> groups = {};
    for (var job in jobs) {
      final date = DateTime(job.date.year, job.date.month, job.date.day);
      groups.putIfAbsent(date, () => []).add(job);
    }
    
    // Sort dates
    final sortedKeys = groups.keys.toList();
    if (_activeTab == 'history') {
      sortedKeys.sort((a, b) => b.compareTo(a));
    } else {
      sortedKeys.sort((a, b) => a.compareTo(b));
    }

    return Map.fromEntries(sortedKeys.map((k) => MapEntry(k, groups[k]!)));
  }

  Widget _buildHeader(BuildContext context, AuthProvider auth) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Welcome Back,',
              style: Theme.of(context).textTheme.bodyLarge,
            ),
            Text(
              auth.lpoMetadata?.name ?? 'LPO Manager',
              style: Theme.of(context).textTheme.displayLarge,
            ),
          ],
        ),
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.black.withOpacity(0.05)),
          ),
          child: IconButton(
            icon: const Icon(LucideIcons.logOut, color: Colors.redAccent, size: 20),
            onPressed: () => auth.logout(),
          ),
        ),
      ],
    );
  }

  Widget _buildStatsRow(List<JobModel> allJobs) {
    final activeCount = allJobs.where((j) => j.status == 'scheduled' || j.status == 'in-progress').length;
    final todayCount = allJobs.where((j) {
      final now = DateTime.now();
      return j.date.year == now.year && j.date.month == now.month && j.date.day == now.day;
    }).length;

    return Row(
      children: [
        _buildStatCard('Total Manifest', allJobs.length.toString(), LucideIcons.database, const Color(0xFF5B7971)),
        const SizedBox(width: 16),
        _buildStatCard('Active Jobs', activeCount.toString(), LucideIcons.layers, const Color(0xFF004141)),
        const SizedBox(width: 16),
        _buildStatCard('Today', todayCount.toString(), LucideIcons.clock, const Color(0xFF2ECC71)),
      ],
    );
  }

  Widget _buildStatCard(String label, String value, IconData icon, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(24),
          boxShadow: [
            BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 20, offset: const Offset(0, 10)),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: color, size: 20),
            ),
            const SizedBox(height: 16),
            Text(value, style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w900)),
            Text(label, style: const TextStyle(color: Colors.grey, fontWeight: FontWeight.w600, fontSize: 13)),
          ],
        ),
      ),
    );
  }

  Widget _buildControls() {
    return Column(
      children: [
        // Tabs
        Container(
          padding: const EdgeInsets.all(6),
          decoration: BoxDecoration(
            color: Colors.black.withOpacity(0.05),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Row(
            children: [
              _buildTab('upcoming', 'Upcoming', LucideIcons.calendar),
              _buildTab('active', 'Today', LucideIcons.clock),
              _buildTab('history', 'History', LucideIcons.history),
            ],
          ),
        ),
        const SizedBox(height: 16),
        // Search
        TextField(
          onChanged: (v) => setState(() => _searchTerm = v),
          decoration: InputDecoration(
            hintText: 'Search company or address...',
            prefixIcon: const Icon(LucideIcons.search, size: 20),
            filled: true,
            fillColor: Colors.white,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: BorderSide.none,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildTab(String id, String label, IconData icon) {
    final isActive = _activeTab == id;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _activeTab = id),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: isActive ? Colors.white : Colors.transparent,
            borderRadius: BorderRadius.circular(12),
            boxShadow: isActive ? [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10)] : null,
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 16, color: isActive ? const Color(0xFF004141) : Colors.grey),
              const SizedBox(width: 8),
              Text(
                label,
                style: TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 13,
                  color: isActive ? const Color(0xFF004141) : Colors.grey,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTimeline(Map<DateTime, List<JobModel>> groupedJobs) {
    if (groupedJobs.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 60),
          child: Column(
            children: [
              Icon(LucideIcons.layers, size: 48, color: Colors.grey.withOpacity(0.3)),
              const SizedBox(height: 16),
              const Text('No Active Jobs Found', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
              const Text('Start by booking a new job', style: TextStyle(color: Colors.grey)),
            ],
          ),
        ),
      );
    }

    return Stack(
      children: [
        Positioned(
          left: 20,
          top: 0,
          bottom: 0,
          child: Container(width: 2, color: Colors.black.withOpacity(0.05)),
        ),
        Column(
          children: groupedJobs.entries.map((entry) {
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildDateSeparator(entry.key),
                ...entry.value.map((job) => _buildJobCard(job)),
              ],
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildDateSeparator(DateTime date) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16, top: 24),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Colors.black.withOpacity(0.05)),
            ),
            child: Text(
              DateFormat('EEEE, d MMM').format(date).toUpperCase(),
              style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w900, letterSpacing: 1, color: Color(0xFF5B7971)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildJobCard(JobModel job) {
    return Container(
      margin: const EdgeInsets.only(left: 40, bottom: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.8),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(job.companyName, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: Color(0xFF004141))),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        const Icon(LucideIcons.mapPin, size: 12, color: Colors.grey),
                        const SizedBox(width: 4),
                        Text('${job.suburb}, ${job.state}', style: const TextStyle(color: Colors.grey, fontSize: 12, fontWeight: FontWeight.w600)),
                      ],
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: job.status == 'scheduled' ? const Color(0xFFE2F9EC) : Colors.grey.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  job.status.toUpperCase(),
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w900,
                    color: job.status == 'scheduled' ? const Color(0xFF2ECC71) : Colors.grey,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              _buildMetaPill(LucideIcons.clock, job.service.replaceAll('-', ' ')),
              const SizedBox(width: 12),
              _buildMetaPill(LucideIcons.repeat, job.billing),
              const Spacer(),
              Text('REF: ${job.id?.substring(0, 6).toUpperCase()}', style: TextStyle(fontFamily: 'monospace', fontSize: 10, color: Colors.grey.withOpacity(0.5))),
            ],
          ),
          const SizedBox(height: 16),
          const Divider(height: 1),
          const SizedBox(height: 12),
          Row(
            children: [
              _buildActionBtn(LucideIcons.messageSquare, 'SMS', const Color(0xFF2ECC71)),
              const SizedBox(width: 8),
              _buildActionBtn(LucideIcons.mail, 'EMAIL', const Color(0xFF3498DB)),
              const Spacer(),
              IconButton(
                onPressed: () => _confirmDelete(job),
                icon: const Icon(LucideIcons.trash2, size: 18, color: Colors.redAccent),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildMetaPill(IconData icon, String text) {
    return Row(
      children: [
        Icon(icon, size: 12, color: Colors.grey),
        const SizedBox(width: 4),
        Text(text.toUpperCase(), style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Colors.grey)),
      ],
    );
  }

  Widget _buildActionBtn(IconData icon, String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.black.withOpacity(0.05)),
      ),
      child: Row(
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 8),
          Text(label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: color)),
        ],
      ),
    );
  }

  Future<void> _confirmDelete(JobModel job) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cancel Job'),
        content: const Text('Are you sure you want to cancel this job?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('KEEP')),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('CANCEL JOB'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      await _jobService.deleteJob(job.id!);
    }
  }
}
