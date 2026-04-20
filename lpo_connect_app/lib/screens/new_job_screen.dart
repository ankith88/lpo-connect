import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:google_places_flutter/google_places_flutter.dart';
import 'package:google_places_flutter/model/prediction.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../widgets/responsive_scaffold.dart';
import '../services/booking_service.dart';
import '../services/job_service.dart';
import '../services/auth_provider.dart';

class NewJobScreen extends StatefulWidget {
  const NewJobScreen({super.key});

  @override
  State<NewJobScreen> createState() => _NewJobScreenState();
}

class _NewJobScreenState extends State<NewJobScreen> {
  int _currentStep = 1;
  bool _isLoading = false;
  bool _showSuccess = false;
  final _bookingService = BookingService();
  final _jobService = JobService();
  
  // Controllers
  final _addressController = TextEditingController();
  final _companyController = TextEditingController();
  
  // Form State
  String _companyName = '';
  String _contactPerson = '';
  String _phone = '';
  String _address = '';
  String _suburb = '';
  String _state = '';
  String _postcode = '';
  String _instructions = '';
  bool _saveToAddressBook = false;
  
  String _serviceType = 'site-to-lpo'; // 'site-to-lpo', 'lpo-to-site', 'round-trip'
  String _billingOption = 'customer'; // 'customer', 'lpo'
  late DateTime _bookingDate;
  
  String? _validationError;
  List<Map<String, dynamic>> _customerSearchResults = [];

  @override
  void initState() {
    super.initState();
    _bookingDate = _bookingService.getDefaultBookingDate();
  }

  @override
  Widget build(BuildContext context) {
    if (_showSuccess) return _buildSuccessView();

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 40),
      child: Column(
        children: [
          _buildHeader(),
          const SizedBox(height: 48),
          _buildStepTracker(),
          const SizedBox(height: 40),
          AnimatedSwitcher(
            duration: const Duration(milliseconds: 300),
            child: _buildCurrentStepView(),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10)],
          ),
          child: const Icon(LucideIcons.rocket, color: Color(0xFF004141), size: 24),
        ),
        const SizedBox(height: 16),
        Text(
          'Book a Job',
          style: Theme.of(context).textTheme.displayLarge?.copyWith(fontSize: 32, letterSpacing: -1),
        ),
        const SizedBox(height: 8),
        const Text(
          'Create a one-off service job in seconds.',
          style: TextStyle(color: Color(0xFF5B7971), fontSize: 16),
        ),
      ],
    );
  }

  Widget _buildStepTracker() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        _trackerItem(1, 'Site', active: _currentStep >= 1, completed: _currentStep > 1),
        _trackerConnector(completed: _currentStep > 1),
        _trackerItem(2, 'Service', active: _currentStep >= 2, completed: _currentStep > 2),
        _trackerConnector(completed: _currentStep > 2),
        _trackerItem(3, 'Review', active: _currentStep >= 3, completed: _currentStep > 3),
      ],
    );
  }

  Widget _trackerItem(int s, String label, {bool active = false, bool completed = false}) {
    return Column(
      children: [
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: completed ? const Color(0xFF2ECC71) : (active ? const Color(0xFF004141) : const Color(0xFFE2EBE2)),
            boxShadow: active && !completed ? [BoxShadow(color: const Color(0xFF004141).withOpacity(0.2), blurRadius: 15, offset: const Offset(0, 5))] : null,
          ),
          child: Center(
            child: completed 
              ? const Icon(Icons.check, color: Colors.white, size: 18) 
              : Text('$s', style: TextStyle(color: active ? Colors.white : const Color(0xFF8FA6A0), fontWeight: FontWeight.w800)),
          ),
        ),
        const SizedBox(height: 12),
        Text(label.toUpperCase(), style: TextStyle(fontSize: 10, letterSpacing: 1, fontWeight: FontWeight.w800, color: active ? const Color(0xFF004141) : const Color(0xFF8FA6A0))),
      ],
    );
  }

  Widget _trackerConnector({bool completed = false}) {
    return Container(
      width: 40,
      height: 2,
      margin: const EdgeInsets.only(bottom: 24, left: 8, right: 8),
      color: completed ? const Color(0xFF2ECC71) : const Color(0xFFE2EBE2),
    );
  }

  Widget _buildCurrentStepView() {
    switch (_currentStep) {
      case 1: return _buildStep1();
      case 2: return _buildStep2();
      case 3: return _buildStep3();
      default: return const SizedBox.shrink();
    }
  }

  // --- Step 1: Site Information ---

  Widget _buildStep1() {
    return Container(
      key: const ValueKey(1),
      padding: const EdgeInsets.all(32),
      decoration: _glassDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _sectionTitle(LucideIcons.building2, 'Site Information'),
          _buildCustomerSearchField(),
          const SizedBox(height: 16),
          _buildInputField(LucideIcons.user, 'Contact Person', (v) => _contactPerson = v, initial: _contactPerson),
          const SizedBox(height: 16),
          _buildInputField(LucideIcons.phone, 'Phone Number', (v) => _phone = v, initial: _phone, type: TextInputType.phone),
          const SizedBox(height: 16),
          _buildAddressAutocomplete(),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(child: _buildReadOnlyField('Suburb', _suburb)),
              const SizedBox(width: 12),
              Expanded(child: _buildReadOnlyField('State', _state)),
            ],
          ),
          const SizedBox(height: 12),
          _buildReadOnlyField('Postcode', _postcode),
          const SizedBox(height: 16),
          _buildTextArea(LucideIcons.clipboardList, 'Special Instructions (Optional)', (v) => _instructions = v),
          const SizedBox(height: 24),
          _buildToggle('Save to Address Book', _saveToAddressBook, (v) => setState(() => _saveToAddressBook = v)),
          if (_validationError != null) _buildErrorPill(_validationError!),
          const SizedBox(height: 32),
          ElevatedButton(
            onPressed: _validateAndProceedToStep2,
            style: _primaryButtonStyle(),
            child: const Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text('VERIFY ADDRESS'),
                SizedBox(width: 12),
                Icon(LucideIcons.chevronRight, size: 18),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCustomerSearchField() {
    return Column(
      children: [
        _buildInputField(
          LucideIcons.building2, 
          'Company Name', 
          (v) {
            _companyName = v;
            _searchCustomers(v);
          }, 
          controller: _companyController
        ),
        if (_customerSearchResults.isNotEmpty)
          Container(
            margin: const EdgeInsets.only(top: 4),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 20)],
            ),
            child: Column(
              children: _customerSearchResults.map((c) => ListTile(
                title: Text(c['company_name'], style: const TextStyle(fontWeight: FontWeight.bold)),
                subtitle: Text('${c['address']['suburb']}, ${c['address']['postcode']}'),
                onTap: () => _selectCustomer(c),
              )).toList(),
            ),
          ),
      ],
    );
  }

  void _searchCustomers(String query) async {
    final results = await _jobService.searchCustomers(query, context.read<AuthProvider>().lpoMetadata!.id);
    setState(() => _customerSearchResults = results);
  }

  void _selectCustomer(Map<String, dynamic> c) {
    setState(() {
      _companyName = c['company_name'];
      _companyController.text = _companyName;
      _contactPerson = c['contact_person'] ?? '';
      _phone = c['phone'] ?? '';
      _address = c['address']['street'] ?? '';
      _addressController.text = _address;
      _suburb = c['address']['suburb'] ?? '';
      _state = c['address']['state'] ?? '';
      _postcode = c['address']['postcode'] ?? '';
      _instructions = c['instructions'] ?? '';
      _customerSearchResults = [];
    });
  }

  Widget _buildAddressAutocomplete() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFF0F4F4)),
      ),
      child: GooglePlaceAutoCompleteTextField(
        textEditingController: _addressController,
        googleAPIKey: "AIzaSyC3uWNpVJ7jFsGyWUKkzQGkDJGrW4yY-2o",
        inputDecoration: const InputDecoration(
          hintText: 'Start typing address...',
          prefixIcon: Icon(LucideIcons.mapPin, size: 20, color: Color(0xFF004141)),
          border: InputBorder.none,
          contentPadding: EdgeInsets.all(20),
        ),
        debounceTime: 600,
        countries: const ["AU"],
        getPlaceDetailWithLatLng: (Prediction prediction) {
          // Robust parsing would happen here via Place Details API. 
          // For now, we simulate extraction.
          setState(() {
            _address = prediction.description ?? '';
            // Demo fallback: if address is just typed without selection, we won't have suburb
          });
        },
        itemClick: (Prediction prediction) {
          _addressController.text = prediction.description ?? '';
          _extractPlaceDetails(prediction);
        },
      ),
    );
  }

  void _extractPlaceDetails(Prediction p) {
    // In a real app, you'd call Place Details API with p.placeId.
    // For this replication, we parse the description terms as a fallback.
    final terms = p.terms ?? [];
    if (terms.length >= 3) {
      setState(() {
        _suburb = terms[terms.length - 3].value ?? '';
        _state = terms[terms.length - 2].value?.split(' ').first ?? '';
        _postcode = terms[terms.length - 2].value?.split(' ').last ?? '';
      });
    }
  }

  void _validateAndProceedToStep2() {
    final lpo = context.read<AuthProvider>().lpoMetadata;
    final isValid = _bookingService.isValidTerritory(
      territoryData: lpo?.franchiseeTerritoryJSON,
      suburb: _suburb,
      postcode: _postcode,
    );

    if (_suburb.isEmpty) {
      setState(() => _validationError = "Please select a valid address from the dropdown.");
      return;
    }

    if (!isValid) {
      setState(() => _validationError = "Sorry, the address in ${_suburb.toUpperCase()} is outside our coverage.");
      return;
    }

    setState(() {
      _validationError = null;
      _currentStep = 2;
    });
  }

  // --- Step 2: Service Selection ---

  Widget _buildStep2() {
    return Container(
      key: const ValueKey(2),
      padding: const EdgeInsets.all(32),
      decoration: _glassDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _sectionTitle(LucideIcons.clipboardList, 'Service Selection'),
          
          _groupLabel('Billing Option'),
          Row(
            children: [
              _billingButton('customer', 'Customer Pays'),
              const SizedBox(width: 12),
              _billingButton('lpo', 'LPO Pays'),
            ],
          ),
          
          const SizedBox(height: 32),
          _groupLabel('Pickup & Delivery Type'),
          Row(
            children: [
              _serviceButton('site-to-lpo', 'Site ➔ LPO', LucideIcons.truck, '\$10.00'),
              const SizedBox(width: 8),
              _serviceButton('lpo-to-site', 'LPO ➔ Site', LucideIcons.truck, '\$10.00', flip: true),
              const SizedBox(width: 8),
              _serviceButton('round-trip', 'Round Trip', LucideIcons.repeat, '\$20.00'),
            ],
          ),

          const SizedBox(height: 32),
          _groupLabel('Booking Date'),
          _buildDatePicker(),
          const SizedBox(height: 12),
          _buildCutoffAlert(),

          if (_validationError != null) _buildErrorPill(_validationError!),

          const SizedBox(height: 40),
          Row(
            children: [
              _secondaryButton('BACK', () => setState(() => _currentStep = 1)),
              const SizedBox(width: 16),
              Expanded(
                child: ElevatedButton(
                  onPressed: _validateAndProceedToStep3,
                  style: _primaryButtonStyle(),
                  child: const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text('NEXT'),
                      SizedBox(width: 12),
                      Icon(LucideIcons.chevronRight, size: 18),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _billingButton(String id, String label) {
    final isActive = _billingOption == id;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _billingOption = id),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(vertical: 20),
          decoration: BoxDecoration(
            color: isActive ? const Color(0xFF004141) : Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: isActive ? Colors.transparent : const Color(0xFFF0F4F4)),
            boxShadow: isActive ? [BoxShadow(color: const Color(0xFF004141).withOpacity(0.2), blurRadius: 15, offset: const Offset(0, 5))] : null,
          ),
          child: Column(
            children: [
              Icon(LucideIcons.creditCard, color: isActive ? Colors.white : const Color(0xFF8FA6A0), size: 20),
              const SizedBox(height: 8),
              Text(label, style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: isActive ? Colors.white : const Color(0xFF8FA6A0))),
            ],
          ),
        ),
      ),
    );
  }

  Widget _serviceButton(String id, String label, IconData icon, String price, {bool flip = false}) {
    final isActive = _serviceType == id;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _serviceType = id),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 8),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: isActive ? const Color(0xFF004141) : Colors.transparent, width: 2),
            boxShadow: isActive ? [BoxShadow(color: const Color(0xFF004141).withOpacity(0.1), blurRadius: 20, offset: const Offset(0, 10))] : null,
          ),
          child: Column(
            children: [
              Transform(
                alignment: Alignment.center,
                transform: Matrix4.rotationY(flip ? 3.14159 : 0),
                child: Icon(icon, color: const Color(0xFF004141), size: 28),
              ),
              const SizedBox(height: 12),
              Text(label, textAlign: TextAlign.center, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Color(0xFF5B7971))),
              const SizedBox(height: 4),
              Text(price, style: const TextStyle(fontWeight: FontWeight.w900, color: Color(0xFF004141), fontSize: 14)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDatePicker() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFF0F4F4)),
      ),
      child: Row(
        children: [
          const Icon(LucideIcons.calendar, size: 18, color: Color(0xFF004141)),
          const SizedBox(width: 12),
          Expanded(
            child: TextButton(
              onPressed: () async {
                final picked = await showDatePicker(
                  context: context,
                  initialDate: _bookingDate,
                  firstDate: _bookingService.getDefaultBookingDate(),
                  lastDate: DateTime.now().add(const Duration(days: 90)),
                );
                if (picked != null) setState(() => _bookingDate = picked);
              },
              style: TextButton.styleFrom(alignment: Alignment.centerLeft, padding: EdgeInsets.zero),
              child: Text(
                DateFormat('EEEE, d MMMM yyyy').format(_bookingDate),
                style: const TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF004141)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCutoffAlert() {
    final now = DateTime.now();
    final isAfterCutoff = now.hour >= 12;
    final isToday = _bookingDate.year == now.year && _bookingDate.month == now.month && _bookingDate.day == now.day;

    if (isAfterCutoff && isToday) {
       return _alertBox( LucideIcons.info, "Today is closed (Past 12:00 PM cutoff). Booking for next business day.", Colors.orange);
    }
    return _alertBox(LucideIcons.info, "Same-day pickup available before 12:00 PM", Colors.green);
  }

  void _validateAndProceedToStep3() {
    final now = DateTime.now();
    final isToday = _bookingDate.year == now.year && _bookingDate.month == now.month && _bookingDate.day == now.day;
    
    if (isToday && now.hour >= 12) {
      setState(() => _validationError = "Same-day booking is no longer available past 12:00 PM.");
      return;
    }

    setState(() {
      _validationError = null;
      _currentStep = 3;
    });
  }

  // --- Step 3: Final Review (Voucher) ---

  Widget _buildStep3() {
    final lpo = context.read<AuthProvider>().lpoMetadata;
    return Container(
      key: const ValueKey(3),
      padding: const EdgeInsets.all(32),
      decoration: _glassDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _sectionTitle(LucideIcons.clipboardList, 'Final Confirmation'),
          
          // Premium Voucher Design
          Container(
            padding: const EdgeInsets.all(32),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(32),
              border: Border.all(color: const Color(0xFFE0E7E4), width: 2, style: BorderStyle.solid), // Dart doesn't have native dashed, will use solid
            ),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('mailplus', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: Color(0xFF004141))),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(color: const Color(0xFFFFCC00), borderRadius: BorderRadius.circular(6)),
                      child: const Text('ADHOC JOB', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 10, color: Color(0xFF004141))),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                const Divider(),
                const SizedBox(height: 24),
                _voucherRow('CUSTOMER', _companyName),
                _voucherRow('SERVICE', _serviceType.replaceAll('-', ' ').toUpperCase()),
                _voucherRow('SCHEDULED', DateFormat('yyyy-MM-dd').format(_bookingDate)),
                const SizedBox(height: 16),
                const Divider(),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('TOTAL PRICE', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF8FA6A0))),
                    Text(_serviceType == 'round-trip' ? '\$20.00' : '\$10.00', style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w900, color: Color(0xFF004141))),
                  ],
                ),
                const SizedBox(height: 24),
                Text('Valid for lodgement at ${lpo?.name ?? 'your LPO'}', style: const TextStyle(fontSize: 11, color: Color(0xFF8FA6A0), fontWeight: FontWeight.w600)),
              ],
            ),
          ),

          const SizedBox(height: 40),
          Row(
            children: [
              TextButton(onPressed: () => setState(() => _currentStep = 2), child: const Text('Modify Selection', style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF004141)))),
              const SizedBox(width: 16),
              Expanded(
                child: ElevatedButton(
                  onPressed: _handleFinalSubmit,
                  style: _primaryButtonStyle(),
                  child: _isLoading ? const CircularProgressIndicator(color: Colors.white) : const Text('CONFIRM & BOOK JOB'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _voucherRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF8FA6A0))),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w700, color: Color(0xFF004141))),
        ],
      ),
    );
  }

  void _handleFinalSubmit() async {
    final lpo = context.read<AuthProvider>().lpoMetadata;
    setState(() => _isLoading = true);
    
    try {
      final jobData = {
        'customer': {
          'company': _companyName,
          'contact': _contactPerson,
          'phone': _phone,
          'address': _address,
          'suburb': _suburb,
          'state': _state,
          'postcode': _postcode,
          'instructions': _instructions,
        },
        'service': _serviceType,
        'billing': _billingOption,
        'date': DateFormat('yyyy-MM-dd').format(_bookingDate),
        'lpo_id': lpo!.id,
        'status': 'scheduled',
      };

      if (_saveToAddressBook) {
        await _jobService.saveCustomer(lpo.id, {
          'company_name': _companyName,
          'search_name': _companyName.toLowerCase(),
          'contact_person': _contactPerson,
          'phone': _phone,
          'address': {
            'street': _address,
            'suburb': _suburb,
            'state': _state,
            'postcode': _postcode,
          },
          'instructions': _instructions,
        });
      }

      await _jobService.createJob(jobData);
      setState(() => _showSuccess = true);
    } catch (e) {
      setState(() => _validationError = "Failed to create job: $e");
    } finally {
      setState(() => _isLoading = false);
    }
  }

  // --- Success View ---

  Widget _buildSuccessView() {
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: Center(
        child: Container(
          constraints: const BoxConstraints(maxWidth: 500),
          padding: const EdgeInsets.all(40),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(LucideIcons.checkCircle2, color: Color(0xFF2ECC71), size: 100),
              const SizedBox(height: 32),
              const Text('Booking Confirmed!', style: TextStyle(fontSize: 32, fontWeight: FontWeight.w900, color: Color(0xFF004141))),
              const SizedBox(height: 16),
              Text(
                'The adhoc job for $_companyName has been successfully scheduled.',
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 16, color: Color(0xFF5B7971)),
              ),
              const SizedBox(height: 48),
              ElevatedButton(
                onPressed: () => Navigator.pop(context),
                style: _primaryButtonStyle(),
                child: const Text('VIEW JOB MANAGER'),
              ),
              const SizedBox(height: 16),
              OutlinedButton(
                onPressed: () => setState(() {
                  _showSuccess = false;
                  _currentStep = 1;
                  _addressController.clear();
                  _companyController.clear();
                  _companyName = '';
                  _contactPerson = '';
                  _phone = '';
                  _address = '';
                  _suburb = '';
                  _state = '';
                  _postcode = '';
                }),
                style: _secondaryButtonStyle(),
                child: const Text('BOOK ANOTHER JOB'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // --- UI Helpers ---

  BoxDecoration _glassDecoration() => BoxDecoration(
    color: Colors.white.withOpacity(0.7),
    borderRadius: BorderRadius.circular(32),
    border: Border.all(color: Colors.white.withOpacity(0.4)),
    boxShadow: [BoxShadow(color: const Color(0xFF004141).withOpacity(0.05), blurRadius: 60, offset: const Offset(0, 20))],
  );

  ButtonStyle _primaryButtonStyle() => ElevatedButton.styleFrom(
    backgroundColor: const Color(0xFF004141),
    foregroundColor: Colors.white,
    minimumSize: const Size.fromHeight(60),
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
    elevation: 10,
    shadowColor: const Color(0xFF004141).withOpacity(0.4),
    textStyle: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
  );

  ButtonStyle _secondaryButtonStyle() => OutlinedButton.styleFrom(
    minimumSize: const Size.fromHeight(60),
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
    side: const BorderSide(color: Color(0xFFE0E7E4)),
    foregroundColor: const Color(0xFF004141),
    textStyle: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
  );

  Widget _secondaryButton(String label, VoidCallback onPressed) => OutlinedButton(
    onPressed: onPressed,
    style: OutlinedButton.styleFrom(
      padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 20),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      side: const BorderSide(color: Color(0xFFE0E7E4)),
      foregroundColor: const Color(0xFF004141),
    ),
    child: Text(label, style: const TextStyle(fontWeight: FontWeight.w800)),
  );

  Widget _sectionTitle(IconData icon, String title) => Padding(
    padding: const EdgeInsets.only(bottom: 32),
    child: Row(
      children: [
        Icon(icon, color: const Color(0xFF004141), size: 20),
        const SizedBox(width: 12),
        Text(title, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: Color(0xFF004141))),
      ],
    ),
  );

  Widget _groupLabel(String label) => Padding(
    padding: const EdgeInsets.only(bottom: 16),
    child: Text(label.toUpperCase(), style: const TextStyle(fontSize: 10, letterSpacing: 1, fontWeight: FontWeight.w800, color: Color(0xFF8FA6A0))),
  );

  Widget _buildInputField(IconData icon, String hint, Function(String) onChanged, {TextEditingController? controller, String? initial, TextInputType type = TextInputType.text}) {
    return Container(
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(18), border: Border.all(color: const Color(0xFFF0F4F4))),
      child: TextField(
        controller: controller ?? (initial != null ? TextEditingController(text: initial) : null),
        onChanged: onChanged,
        keyboardType: type,
        decoration: InputDecoration(
          hintText: hint,
          prefixIcon: Icon(icon, size: 18, color: const Color(0xFF004141)),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.all(20),
        ),
      ),
    );
  }

  Widget _buildReadOnlyField(String label, String value) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      decoration: BoxDecoration(color: const Color(0xFFF0F4F4).withOpacity(0.5), borderRadius: BorderRadius.circular(16)),
      child: Row(
        children: [
          Expanded(child: Text(value.isEmpty ? label : value, style: TextStyle(color: value.isEmpty ? Colors.grey : const Color(0xFF004141), fontWeight: FontWeight.w600))),
          const Icon(LucideIcons.lock, size: 14, color: Colors.grey),
        ],
      ),
    );
  }

  Widget _buildTextArea(IconData icon, String hint, Function(String) onChanged) {
    return Container(
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(18), border: Border.all(color: const Color(0xFFF0F4F4))),
      child: TextField(
        onChanged: onChanged,
        maxLines: 2,
        decoration: InputDecoration(
          hintText: hint,
          prefixIcon: Icon(icon, size: 18, color: const Color(0xFF004141)),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.all(20),
        ),
      ),
    );
  }

  Widget _buildToggle(String label, bool value, Function(bool) onChanged) {
    return GestureDetector(
      onTap: () => onChanged(!value),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: const Color(0xFFF0F4F4))),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(width: 20, height: 20, child: Checkbox(value: value, onChanged: (v) => onChanged(v!))),
            const SizedBox(width: 12),
            Text(label, style: const TextStyle(fontWeight: FontWeight.w700, color: Color(0xFF5B7971))),
          ],
        ),
      ),
    );
  }

  Widget _buildErrorPill(String error) {
    return Container(
      margin: const EdgeInsets.only(top: 24),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: const Color(0xFFFFF5F5), borderRadius: BorderRadius.circular(16), border: Border.all(color: const Color(0xFFFFE0E0))),
      child: Row(
        children: [
          const Icon(LucideIcons.info, color: Colors.red, size: 18),
          const SizedBox(width: 12),
          Expanded(child: Text(error, style: const TextStyle(color: Colors.red, fontWeight: FontWeight.bold, fontSize: 13))),
        ],
      ),
    );
  }

  Widget _alertBox(IconData icon, String text, Color color) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: color.withOpacity(0.05), borderRadius: BorderRadius.circular(12)),
      child: Row(
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 8),
          Expanded(child: Text(text, style: TextStyle(color: color, fontWeight: FontWeight.w700, fontSize: 11))),
        ],
      ),
    );
  }
}
