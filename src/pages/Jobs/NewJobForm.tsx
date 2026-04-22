import React, { useState, useEffect, useRef } from 'react';
import { 
  ChevronRight,
  ChevronLeft, 
  Truck, 
  Repeat, 
  Calendar,
  CheckCircle2,
  Info,
  Building2,
  User,
  Phone,
  MapPin,
  ClipboardList,
  CreditCard,
  Rocket,
  Lock,
  Clock,
  Mail,
  Database,
  Sparkles
} from 'lucide-react';
import { Autocomplete, useJsApiLoader } from '@react-google-maps/api';
import { getDefaultBookingDate, formatDateForInput } from '../../utils/scheduling';
import { useLpo } from '../../context/LpoContext';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, googleMapsApiKey } from '../../firebase/config';

type ServiceType = 'site-to-lpo' | 'lpo-to-site' | 'round-trip';
type BillingOption = 'customer' | 'split' | 'lpo';

interface JobData {
  customer: {
    company: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    suburb: string;
    state: string;
    postcode: string;
    instructions: string;
    netsuiteId?: string;
    coordinates?: { lat: number, lng: number };
  };
  service: ServiceType;
  billing: BillingOption;
  date: string;
  jobType: 'one-off' | 'scheduled';
  frequency: string[];
  preferredTime?: string;
}

const LIBRARIES: ("places")[] = ["places"];

const NewJobForm: React.FC = () => {
  const { lpo } = useLpo();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [animating, setAnimating] = useState(false);
  const [netsuiteMessage, setNetsuiteMessage] = useState<string | null>(null);
  const [customerStatus, setCustomerStatus] = useState<string | null>(null);
  const [isAwaitingTC, setIsAwaitingTC] = useState(false);
  const [isExistingCustomer, setIsExistingCustomer] = useState(false);
  const [createdRequestId, setCreatedRequestId] = useState<string | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: googleMapsApiKey,
    libraries: LIBRARIES
  });

  const [formData, setFormData] = useState<JobData>({
    customer: {
      company: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: '',
      suburb: '',
      state: '',
      postcode: '',
      instructions: '',
    },
    service: 'site-to-lpo',
    billing: 'customer',
    date: formatDateForInput(getDefaultBookingDate()),
    jobType: 'one-off',
    frequency: [],
    preferredTime: '',
  });

  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [allCustomers, setAllCustomers] = useState<any[]>([]);

  useEffect(() => {
    const draft = localStorage.getItem('rebook_draft');
    const editDraft = localStorage.getItem('edit_request_draft');
    
    if (draft && window.location.search.includes('rebook=true')) {
      try {
        const jobData = JSON.parse(draft);
        setFormData(prev => ({
          ...prev,
          customer: jobData.customer,
          service: jobData.service,
          billing: jobData.billing,
        }));
        localStorage.removeItem('rebook_draft');
      } catch (e) {
        console.error("Failed to parse rebook draft", e);
      }
    } else if (editDraft && window.location.search.includes('edit=true')) {
      try {
        const jobData = JSON.parse(editDraft);
        const customer = jobData.customer || {};
        if (customer.contact && !customer.firstName) {
          const parts = customer.contact.split(' ');
          customer.firstName = parts[0] || '';
          customer.lastName = parts.slice(1).join(' ') || '';
        }
        setFormData({
          customer: {
            ...customer,
            netsuiteId: jobData.customer?.netsuiteId || undefined
          },
          service: jobData.service,
          billing: jobData.billing,
          date: jobData.date,
          jobType: jobData.jobType,
          frequency: jobData.frequency || [],
          preferredTime: jobData.preferredTime || ''
        });
        setIsExistingCustomer(true);
      } catch (e) {
        console.error("Failed to parse edit draft", e);
      }
    }
  }, []);

  useEffect(() => {
    if (lpo) {
      const fetchAll = async () => {
        try {
          const q = query(collection(db, `lpo/${lpo.id}/customers`));
          const snapshot = await getDocs(q);
          setAllCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
          console.error("Error fetching customers for cache:", error);
        }
      };
      fetchAll();
    }
  }, [lpo]);

  useEffect(() => {
    const term = formData.customer.company.toLowerCase();
    if (term.length > 2) {
      const results = allCustomers.filter(c => {
        const name = (c.companyName || c.company_name || '').toLowerCase();
        const city = (c.city || c.address?.suburb || '').toLowerCase();
        const zip = (c.zip || c.address?.postcode || '').toLowerCase();
        return name.includes(term) || city.includes(term) || zip.includes(term);
      });
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [formData.customer.company, allCustomers]);

  const selectCustomer = (c: any) => {
    const displayName = c.companyName || c.company_name || '';
    const parts = displayName.split(' ');
    
    setFormData({
      ...formData,
      customer: {
        company: displayName,
        firstName: c.first_name || parts[0] || '',
        lastName: c.last_name || (parts.length > 1 ? parts.slice(1).join(' ') : ''),
        email: c.customerEmail || c.email || '',
        phone: c.customerPhone || c.phone || '',
        address: c.address1 || c.address?.street || '',
        suburb: c.city || c.address?.suburb || '',
        state: c.state || c.address?.state || '',
        postcode: c.zip || c.address?.postcode || '',
        instructions: c.instructions || '',
        netsuiteId: c.companyId || c.customerInternalId || undefined,
        coordinates: c.coordinates || undefined
      }
    });
    setIsExistingCustomer(true);
    setFormData(prev => ({
      ...prev,
      billing: (c.billing || prev.billing) as BillingOption,
      jobType: (c.jobtype || c.jobType || prev.jobType) as 'one-off' | 'scheduled'
    }));
    setCustomerStatus(c.status || "Active");
    setSearchResults([]);
  };

  const handleNext = () => {
    if (step === 1) {
      setValidationError(null);
      
      if (!formData.customer.address || !formData.customer.suburb) {
        setValidationError("Please select a valid address from the dropdown.");
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!formData.customer.email || !emailRegex.test(formData.customer.email)) {
        setValidationError("Please enter a valid email address.");
        return;
      }

      const phoneRegex = /^(\+?61|0)4\d{8}$|^(\+?61|0)[2378]\d{8}$/;
      const cleanPhone = formData.customer.phone.replace(/\s/g, '');
      if (!cleanPhone || !phoneRegex.test(cleanPhone)) {
        setValidationError("Please enter a valid contact phone number (AU Mobile or Landline).");
        return;
      }

      // T&C Compliance Check
      if (isExistingCustomer && customerStatus !== "Active") {
        setValidationError(`This customer (${formData.customer.company}) is still Awaiting T&C acceptance. You cannot proceed until their status is changed to Active.`);
        return;
      }

      if (!lpo?.franchiseeTerritoryJSON) {
        changeStep(step + 1);
        return;
      }

      let territories: string[] = [];
      if (Array.isArray(lpo.franchiseeTerritoryJSON)) {
        territories = lpo.franchiseeTerritoryJSON;
      } else {
        try {
          const parsed = JSON.parse(lpo.franchiseeTerritoryJSON);
          territories = Array.isArray(parsed) ? (typeof parsed[0] === 'string' ? parsed : parsed.map((p: any) => p.suburb)) : [];
        } catch (e) {
          console.error("Failed to parse territory:", e);
        }
      }

      const userSuburb = formData.customer.suburb.trim().toUpperCase();
      const userPostcode = formData.customer.postcode.trim();
      const isValid = territories.some(t => {
        const territoryStr = t.toUpperCase();
        return territoryStr.includes(userSuburb) || territoryStr.includes(userPostcode);
      });

      if (!isValid && userSuburb !== "") {
        setValidationError(`Sorry, the address in ${userSuburb} is outside our coverage.`);
        return;
      }
    }

    if (step === 2) {
      setValidationError(null);
      
      if (formData.jobType === 'scheduled' && formData.frequency.length === 0) {
        setValidationError("Please select at least one day for the scheduled service.");
        return;
      }

      const now = new Date();
      const todayStr = formatDateForInput(now);
      
      if (formData.date === todayStr && now.getHours() >= 12) {
        setValidationError("Same-day booking is no longer available (it's past 12:00 PM). Please select the next available business day.");
        return;
      }
    }
    
    changeStep(step + 1);
  };

  const changeStep = (newStep: number) => {
    setAnimating(true);
    setTimeout(() => {
      setStep(newStep);
      setAnimating(false);
    }, 300);
  };

  const handleBack = () => {
    setValidationError(null);
    changeStep(step - 1);
  };

  const onAutocompleteLoad = (autocomplete: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocomplete;
  };

  const onPlaceChanged = () => {
    if (autocompleteRef.current !== null) {
      const place = autocompleteRef.current.getPlace();
      if (!place.address_components) return;

      let streetNumber = '';
      let route = '';
      let suburb = '';
      let state = '';
      let postcode = '';

      place.address_components.forEach(component => {
        const types = component.types;
        if (types.includes('street_number')) streetNumber = component.long_name;
        if (types.includes('route')) route = component.long_name;
        if (types.includes('locality')) suburb = component.long_name;
        if (types.includes('administrative_area_level_1')) state = component.short_name;
        if (types.includes('postal_code')) postcode = component.long_name;
      });

      const fullStreet = `${streetNumber} ${route}`.trim();

      const location = place.geometry?.location;
      const coordinates = location ? {
        lat: location.lat(),
        lng: location.lng()
      } : undefined;

      setFormData(prev => ({
        ...prev,
        customer: {
          ...prev.customer,
          address: fullStreet,
          suburb: suburb,
          state: state,
          postcode: postcode,
          coordinates
        }
      }));
    }
  };

  const generateStops = (data: JobData, lpoData: any) => {
    const stops = [];
    const customerLoc = {
      name: data.customer.company,
      address: data.customer.address,
      suburb: data.customer.suburb,
      state: data.customer.state,
      postcode: data.customer.postcode,
      lat: data.customer.coordinates?.lat,
      lng: data.customer.coordinates?.lng
    };
    const lpoLoc = {
      name: lpoData?.name || '',
      address: lpoData?.address1 || lpoData?.address || '',
      suburb: lpoData?.city || lpoData?.location || lpoData?.suburb || '',
      state: lpoData?.state || 'NSW',
      postcode: lpoData?.zip || lpoData?.postcode || '',
      lat: lpoData?.latitude,
      lng: lpoData?.longitude
    };

    if (data.service === 'site-to-lpo') {
      stops.push(
        { type: 'pickup', label: 'Pickup Site', locationName: customerLoc.name, address: customerLoc.address, suburb: customerLoc.suburb, state: customerLoc.state, postcode: customerLoc.postcode, lat: customerLoc.lat, lng: customerLoc.lng, sequence: 1, status: 'pending' },
        { type: 'delivery', label: 'Delivery LPO', locationName: lpoLoc.name, address: lpoLoc.address, suburb: lpoLoc.suburb, state: lpoLoc.state, postcode: lpoLoc.postcode, lat: lpoLoc.lat, lng: lpoLoc.lng, sequence: 2, status: 'pending' }
      );
    } else if (data.service === 'lpo-to-site') {
      stops.push(
        { type: 'pickup', label: 'Pickup LPO', locationName: lpoLoc.name, address: lpoLoc.address, suburb: lpoLoc.suburb, state: lpoLoc.state, postcode: lpoLoc.postcode, lat: lpoLoc.lat, lng: lpoLoc.lng, sequence: 1, status: 'pending' },
        { type: 'delivery', label: 'Delivery Site', locationName: customerLoc.name, address: customerLoc.address, suburb: customerLoc.suburb, state: customerLoc.state, postcode: customerLoc.postcode, lat: customerLoc.lat, lng: customerLoc.lng, sequence: 2, status: 'pending' }
      );
    } else if (data.service === 'round-trip') {
      stops.push(
        { type: 'pickup', label: 'Pickup LPO', locationName: lpoLoc.name, address: lpoLoc.address, suburb: lpoLoc.suburb, state: lpoLoc.state, postcode: lpoLoc.postcode, lat: lpoLoc.lat, lng: lpoLoc.lng, sequence: 1, status: 'pending' },
        { type: 'delivery', label: 'Delivery Site', locationName: customerLoc.name, address: customerLoc.address, suburb: customerLoc.suburb, state: customerLoc.state, postcode: customerLoc.postcode, lat: customerLoc.lat, lng: customerLoc.lng, sequence: 2, status: 'pending' },
        { type: 'pickup', label: 'Pickup Site', locationName: customerLoc.name, address: customerLoc.address, suburb: customerLoc.suburb, state: customerLoc.state, postcode: customerLoc.postcode, lat: customerLoc.lat, lng: customerLoc.lng, sequence: 3, status: 'pending' },
        { type: 'delivery', label: 'Delivery LPO', locationName: lpoLoc.name, address: lpoLoc.address, suburb: lpoLoc.suburb, state: lpoLoc.state, postcode: lpoLoc.postcode, lat: lpoLoc.lat, lng: lpoLoc.lng, sequence: 4, status: 'pending' }
      );
    }
    return stops;
  };

  const getShorthandFrequency = (days: string[]) => {
    const map: Record<string, string> = {
      'Monday': 'M',
      'Tuesday': 'T',
      'Wednesday': 'W',
      'Thursday': 'Th',
      'Friday': 'F'
    };
    return days.map(d => map[d] || d).join(',');
  };

  const handleSubmit = async () => {
    if (!lpo) return;
    setLoading(true);
    setValidationError(null);

    try {
      const isEditing = window.location.search.includes('edit=true');
      const requestId = new URLSearchParams(window.location.search).get('id');
      const stops = generateStops(formData, lpo);

      let nsResult: any = { success: true };

      // 1. NetSuite API Integration (Stage 1) - Only for NEW customers
      if (!isExistingCustomer) {
        const NETSUITE_API = "https://1048144.extforms.netsuite.com/app/site/hosting/scriptlet.nl?script=2527&deploy=1&compid=1048144&ns-at=AAEJ7tMQJX8dMLsjS5TGMacB9-M8pUB6q50I_ptxbLYqKZ_HR3c";
        
        const params = new URLSearchParams({
          lpo_id: lpo.id,
          company: formData.customer.company,
          firstName: formData.customer.firstName,
          lastName: formData.customer.lastName,
          email: formData.customer.email,
          phone: formData.customer.phone,
          address: formData.customer.address,
          suburb: formData.customer.suburb,
          state: formData.customer.state,
          postcode: formData.customer.postcode,
          lat: (formData.customer.coordinates?.lat || "").toString(),
          lng: (formData.customer.coordinates?.lng || "").toString(),
          service: formData.service,
          billing: formData.billing,
          jobType: formData.jobType,
          startDate: formData.date,
          frequency: getShorthandFrequency(formData.frequency),
          preferredTime: formData.preferredTime || ""
        });

        const nsResponse = await fetch(`${NETSUITE_API}&${params.toString()}`);
        nsResult = await nsResponse.json();
        
        console.log("NetSuite Script 2527 Response:", nsResult);

        if (!nsResult.success) {
          setValidationError(nsResult.message || "Failed to create record in NetSuite.");
          setLoading(false);
          return;
        }

        // Check if we need to pause for T&C
        // Billing 'lpo' means "LPO Pays", which sets status to Active immediately
        const initialStatus = formData.billing === 'lpo' ? 'Active' : "Awaiting T&C's to be Accepted";
        setCustomerStatus(initialStatus);
        
        // We'll set isAwaitingTC later, after the Firestore write succeeds
      } else {
        // Existing customer: check their current cached status
        // We'll set isAwaitingTC later
      }

      // 2. Local Firestore Job Request
      if (!lpo?.id) {
        throw new Error("LPO ID is missing. Cannot save request.");
      }
      
      let finalRequestId = requestId;
      const isActuallyActive = (isExistingCustomer && customerStatus === 'Active') || 
                               (!isExistingCustomer && formData.billing === 'lpo');
      
      const initialRequestStatus = isActuallyActive ? 'pending' : 'awaiting-activation';

      if (isEditing && requestId) {
        const cleanUpdate = JSON.parse(JSON.stringify({
          ...formData,
          stops,
          isExistingCustomer,
          netsuiteCustomerId: nsResult.customerInternalId || formData.customer.netsuiteId || null
        }));

        await updateDoc(doc(db, 'requests', requestId), {
          ...cleanUpdate,
          updatedAt: serverTimestamp()
        });
        localStorage.removeItem('edit_request_draft');
      } else {
        const cleanData = JSON.parse(JSON.stringify({
          ...formData,
          stops,
          lpo_id: lpo.id,
          isExistingCustomer,
          netsuiteCustomerId: nsResult.customerInternalId || formData.customer.netsuiteId || null,
          status: initialRequestStatus,
          skippedDates: [],
          recurrenceStatus: 'active',
          chat: []
        }));

        const requestPayload = {
          ...cleanData,
          createdAt: serverTimestamp()
        };

        console.log("Attempting to create Firestore request with payload:", requestPayload);

        const docRef = await addDoc(collection(db, 'requests'), requestPayload);
        finalRequestId = docRef.id;
        console.log("Firestore request created successfully. Doc ID:", finalRequestId);
        setCreatedRequestId(finalRequestId);
      }

      // 3. Second NetSuite API (Job Confirmation with Request ID)
      const SECOND_NETSUITE_API = "https://1048144.extforms.netsuite.com/app/site/hosting/scriptlet.nl?script=2528&deploy=1&compid=1048144&ns-at=AAEJ7tMQM_E8dKF2qjDMy9ESy5q883g7xrb8uKwfgGOku62wheU";
      try {
        const customer_id = nsResult.customerInternalId || formData.customer.netsuiteId || "";
        const confirmResponse = await fetch(`${SECOND_NETSUITE_API}&request_id=${finalRequestId}&lpo_id=${lpo.id}&customer_id=${customer_id}`);
        const confirmResult = await confirmResponse.json();
        console.log("NetSuite Script 2528 Response:", confirmResult);
        if (confirmResult.success && confirmResult.message) {
          setNetsuiteMessage(confirmResult.message);
        }
      } catch (e) {
        console.error("Secondary NetSuite sync failed", e);
        // We don't block success state here as the primary records are created
      }

      // Now update the UI state based on the calculated status
      if (initialRequestStatus !== 'pending') {
        setIsAwaitingTC(true);
        console.log("Request created with awaiting-activation status. Showing T&C screen.");
      } else {
        setSuccess(true);
      }
    } catch (error) {
      console.error("Error saving job request:", error);
      setValidationError("A technical error occurred during submission. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const checkManualStatus = async () => {
    if (!lpo || !formData.customer.company) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, `lpo/${lpo.id}/customers`), 
        where('companyName', '==', formData.customer.company)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const c = snap.docs[0].data();
        setCustomerStatus(c.status || "Active");
        if (c.status === "Active") {
          setIsAwaitingTC(false);
          // If we already created a request, just show success. 
          // Otherwise, submit now that they are active.
          if (createdRequestId) {
            setSuccess(true);
          } else {
            handleSubmit();
          }
        }
      }
    } catch (e) {
      console.error("Failed to check status", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="new-job-premium">
      <div className="mesh-bg">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>

      <div className="form-container">
        {success ? (
          <div className="success-view-premium fade-in">
            <div className="success-card glass">
              <div className="success-icon-animation">
                <CheckCircle2 size={80} strokeWidth={2.5} className="pulse-icon" />
              </div>
              <div className="success-text">
                <h2>Request Sent!</h2>
                {netsuiteMessage ? (
                  <p>{netsuiteMessage}</p>
                ) : (
                  <p>The job request for <strong>{formData.customer.company}</strong> has been sent to the operator for review.</p>
                )}
                <p className="sub-hint">You can track the progress and coordinate with the operator via the chat links in your Job Manager.</p>
              </div>
              <div className="success-actions-premium">
                <button onClick={() => window.location.href = '/dashboard'} className="btn-primary flex-1 shadow-teal">
                   VIEW PENDING REQUESTS
                </button>
                <button onClick={() => window.location.reload()} className="btn-secondary full-width">
                   REQUEST ANOTHER JOB
                </button>
              </div>
            </div>
          </div>
        ) : isAwaitingTC ? (
          <div className="success-view-premium fade-in">
            <div className="success-card glass tc-waiting">
              <div className="success-icon-animation">
                <Clock size={80} strokeWidth={2.5} className="pulse-icon warning" />
              </div>
              <div className="success-text">
                <h2>T&C Acceptance Pending</h2>
                <p>The customer <strong>{formData.customer.company}</strong> has been created, but they must accept the Terms & Conditions before you can request a job.</p>
                <p className="sub-hint">As soon as the status changes to "Active" in NetSuite, you can proceed with the request.</p>
              </div>
              
              <div className="status-progress">
                <div className="progress-label">CURRENT STATUS</div>
                <div className="status-pill warning">AWAITING T&C</div>
              </div>

              <div className="success-actions-premium">
                <button 
                  onClick={checkManualStatus} 
                  className="btn-primary flex-1 shadow-teal"
                  disabled={loading}
                >
                   {loading ? 'CHECKING...' : 'REFRESH STATUS'}
                </button>
                <button onClick={() => window.location.reload()} className="btn-secondary">
                   CANCEL
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <header className="form-header">
              <div className="header-icon-pill">
                <Rocket size={20} />
              </div>
              <h1>Book a Job</h1>
              <p>Create a service job for your customers in seconds.</p>
            </header>

            <div className="step-tracker">
              {[1, 2, 3].map((s) => (
                <div key={s} className={`step-item ${step === s ? 'active' : step > s ? 'completed' : ''}`}>
                  <div className="step-circle">{step > s ? <CheckCircle2 size={16} /> : s}</div>
                  <span className="step-label">{s === 1 ? 'Site' : s === 2 ? 'Service' : 'Review'}</span>
                  {s < 3 && <div className="step-connector"></div>}
                </div>
              ))}
            </div>

            <div className={`step-container ${animating ? 'fade-out' : 'fade-in'}`}>
              {step === 1 && (
                <div className="glass-card step-card">
                  <div className="card-top-info">
                    <Building2 size={20} />
                    <h3>Site Information</h3>
                  </div>

                  <div className="input-grid">
                    <div className="input-pill full has-suggestions">
                      <Building2 size={18} />
                      <input 
                        type="text" 
                        placeholder="Company Name" 
                        value={formData.customer.company}
                        onChange={(e) => {
                          setFormData({...formData, customer: {...formData.customer, company: e.target.value}});
                          setIsExistingCustomer(false);
                        }}
                      />
                      {searchResults.length > 0 && (
                        <div className="match-badge">
                          <Sparkles size={14} className="sparkle-icon" />
                          <span>SAVED</span>
                        </div>
                      )}
                      {searchResults.length > 0 && (
                        <div className="search-dropdown glass floating-dropdown">
                          <div className="dropdown-header">
                            <Database size={12} />
                            <span>MATCHED FROM ADDRESS BOOK</span>
                          </div>
                          {searchResults.map(c => (
                            <div key={c.id} className="search-item-premium" onClick={() => selectCustomer(c)}>
                              <div className="item-info">
                                <div className="company-name">{c.companyName || c.company_name}</div>
                                <div className="sub">{(c.city || c.address?.suburb)}, {(c.zip || c.address?.postcode)}</div>
                              </div>
                              <div className="item-action">
                                <span>SELECT CLIENT</span>
                                <ChevronRight size={14} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="input-pill half">
                      <User size={18} />
                      <input 
                        type="text" 
                        placeholder="First Name"
                        value={formData.customer.firstName}
                        onChange={(e) => setFormData({...formData, customer: {...formData.customer, firstName: e.target.value}})}
                      />
                    </div>
                    <div className="input-pill half">
                      <User size={18} />
                      <input 
                        type="text" 
                        placeholder="Last Name"
                        value={formData.customer.lastName}
                        onChange={(e) => setFormData({...formData, customer: {...formData.customer, lastName: e.target.value}})}
                      />
                    </div>
                    <div className="input-pill">
                      <Mail size={18} />
                      <input 
                        type="email" 
                        placeholder="Email Address"
                        value={formData.customer.email}
                        onChange={(e) => setFormData({...formData, customer: {...formData.customer, email: e.target.value}})}
                      />
                    </div>
                    <div className="input-pill">
                      <Phone size={18} />
                      <input 
                        type="tel" 
                        placeholder="Phone Number"
                        value={formData.customer.phone}
                        onChange={(e) => setFormData({...formData, customer: {...formData.customer, phone: e.target.value}})}
                      />
                    </div>

                    <div className="input-pill full">
                      <MapPin size={18} />
                      {isLoaded ? (
                        <Autocomplete
                          onLoad={onAutocompleteLoad}
                          onPlaceChanged={onPlaceChanged}
                          options={{
                            types: ['address'],
                            componentRestrictions: { country: 'AU' }
                          }}
                          className="autocomplete-wrapper"
                        >
                          <input 
                            type="text" 
                            placeholder="Start typing address..."
                            value={formData.customer.address}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              customer: { ...prev.customer, address: e.target.value }
                            }))}
                          />
                        </Autocomplete>
                      ) : (
                        <input type="text" placeholder="Loading address search..." disabled />
                      )}
                    </div>

                    <div className="input-pill read-only">
                      <input 
                        type="text" 
                        placeholder="Suburb"
                        className="no-icon"
                        value={formData.customer.suburb}
                        readOnly
                      />
                      <Lock size={14} className="lock-icon" />
                    </div>
                    <div className="input-pill half read-only">
                      <input 
                        type="text" 
                        placeholder="State"
                        className="no-icon"
                        value={formData.customer.state}
                        readOnly
                      />
                      <Lock size={14} className="lock-icon" />
                    </div>
                    <div className="input-pill half read-only">
                      <input 
                        type="text" 
                        placeholder="Postcode"
                        className="no-icon"
                        value={formData.customer.postcode}
                        readOnly
                      />
                      <Lock size={14} className="lock-icon" />
                    </div>
                    <div className="input-pill full area">
                      <textarea 
                        placeholder="Special Instructions (Optional)"
                        rows={2}
                        value={formData.customer.instructions}
                        onChange={(e) => setFormData({...formData, customer: {...formData.customer, instructions: e.target.value}})}
                      />
                    </div>
                  </div>


                  {validationError && (
                    <div className="error-pill glass">
                      <Info size={16} />
                      {validationError}
                    </div>
                  )}

                  <button className="btn-primary w-full shadow-teal" onClick={handleNext}>
                    VERIFY ADDRESS <ChevronRight size={18} />
                  </button>
                </div>
              )}

              {step === 2 && (
                <div className="glass-card step-card">
                  <div className="card-top-info">
                    <ClipboardList size={20} />
                    <h3>Service & Schedule</h3>
                  </div>

                  <div className="selection-group">
                    <label className="group-label">Billing Option</label>
                    {isExistingCustomer && (
                      <div className="locked-badge fade-in">
                         <Lock size={12} />
                         <span>LOCKED BY CUSTOMER HUB</span>
                      </div>
                    )}
                    <div className={`billing-grid two-cols ${isExistingCustomer ? 'locked-group' : ''}`}>
                       {[
                         { id: 'customer', label: 'Customer Pays' },
                         { id: 'lpo', label: 'LPO Pays' }
                       ].map(opt => (
                         <button 
                           key={opt.id}
                           className={`billing-btn glass ${formData.billing === opt.id ? 'active' : ''}`}
                           onClick={() => !isExistingCustomer && setFormData({...formData, billing: opt.id as BillingOption})}
                           disabled={isExistingCustomer && formData.billing !== opt.id}
                           style={isExistingCustomer && formData.billing !== opt.id ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                         >
                           <CreditCard size={18} />
                           {opt.label}
                         </button>
                       ))}
                    </div>
                    {isExistingCustomer && (
                      <p className="field-hint mini">Billing for this client is permanently set to {formData.billing.toUpperCase()} as per their Customer Hub profile.</p>
                    )}
                  </div>

                  <div className="selection-group">
                    <label className="group-label">Pickup & Delivery Type</label>
                    <div className="service-grid">
                      {[
                        { id: 'site-to-lpo', label: 'Site ➔ LPO', icon: Truck, price: '$10.00' },
                        { id: 'lpo-to-site', label: 'LPO ➔ Site', icon: Truck, price: '$10.00', flip: true },
                        { id: 'round-trip', label: 'Round Trip', icon: Repeat, price: '$20.00' }
                      ].map(srv => (
                         <button 
                           key={srv.id}
                           className={`service-btn glass ${formData.service === srv.id ? 'active' : ''}`}
                           onClick={() => setFormData({...formData, service: srv.id as ServiceType})}
                         >
                           <srv.icon size={28} style={srv.flip ? { transform: 'scaleX(-1)' } : {}} />
                           <span className="srv-label">{srv.label}</span>
                           <strong className="srv-price">{srv.price}</strong>
                         </button>
                      ))}
                    </div>
                  </div>

                  <div className="date-time-row">
                    <div className="selection-group flex-1">
                      <label className="group-label">Booking Date</label>
                      <div className="date-pill-group">
                        <Calendar size={18} />
                        <input 
                          type="date" 
                          value={formData.date}
                          min={formatDateForInput(getDefaultBookingDate())}
                          onChange={(e) => setFormData({...formData, date: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="selection-group flex-1">
                      <label className="group-label">Time Constraints (Optional)</label>
                      <div className="input-pill time-pill no-margin">
                        <Clock size={18} />
                        <input 
                          type="time" 
                          value={formData.preferredTime}
                          onChange={(e) => setFormData({...formData, preferredTime: e.target.value})}
                        />
                      </div>
                      <p className="field-hint">Are there any timing restrictions for this job? Leave blank if the operator can attend anytime during business hours.</p>
                    </div>
                  </div>

                  <div className="alert-wrapper">
                    {new Date().getHours() < 12 ? (
                      <div className="alert-pill glass success">
                        <Info size={14} /> Same-day pickup available before 12:00 PM
                      </div>
                    ) : (
                      <div className="alert-pill glass warning">
                        <Info size={14} /> Today is closed (Past 12:00 PM). Booking for next business day.
                      </div>
                    )}
                  </div>

                  <div className="selection-group recurring-section">
                    <label className="group-label">Is this a recurring job?</label>
                    <div className="job-type-tabs glass small-tabs">
                       <button 
                        className={`type-tab ${formData.jobType === 'one-off' ? 'active' : ''}`}
                        onClick={() => setFormData({...formData, jobType: 'one-off', frequency: []})}
                       >
                         No
                       </button>
                       <button 
                        className={`type-tab ${formData.jobType === 'scheduled' ? 'active' : ''}`}
                        onClick={() => setFormData({...formData, jobType: 'scheduled', frequency: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']})}
                       >
                         Yes
                       </button>
                    </div>

                    {formData.jobType === 'scheduled' && (
                      <div className="frequency-picker fade-in">
                        <div className="flex-between">
                          <label className="group-label sub">Select Frequency (Weekdays Only)</label>
                        </div>
                        <div className="frequency-grid weekdays-only">
                          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(day => (
                            <button
                              key={day}
                              className={`freq-pill ${formData.frequency.includes(day) ? 'active' : ''}`}
                              onClick={() => {
                                const newFreq = formData.frequency.includes(day)
                                  ? formData.frequency.filter(d => d !== day)
                                  : [...formData.frequency, day];
                                setFormData({...formData, frequency: newFreq});
                              }}
                            >
                              {day}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {validationError && (
                    <div className="error-pill glass">
                      <Info size={16} />
                      {validationError}
                    </div>
                  )}

                  <div className="form-actions">
                    <button className="btn-secondary" onClick={handleBack}><ChevronLeft size={20} /> BACK</button>
                    <button className="btn-primary flex-1 shadow-teal" onClick={handleNext}>NEXT <ChevronRight size={20} /></button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="glass-card step-card confirmation">
                  <div className="card-top-info">
                    <ClipboardList size={20} />
                    <h3>Final Confirmation</h3>
                  </div>

                  <div className="voucher-card glass">
                    <div className="voucher-header">
                       <div className="v-logo">mailplus</div>
                       <div className="v-badge">JOB BOOKING</div>
                    </div>
                    <div className="voucher-body">
                      <div className="v-row">
                        <span className="v-label">CUSTOMER</span>
                        <span className="v-val">{formData.customer.company}</span>
                      </div>
                      <div className="v-row">
                        <span className="v-label">TYPE</span>
                        <span className="v-val">{formData.jobType.replace(/-/g, ' ').toUpperCase()}</span>
                      </div>
                      {formData.jobType === 'scheduled' && (
                        <div className="v-row">
                          <span className="v-label">FREQUENCY</span>
                          <span className="v-val">{formData.frequency.join(', ')}</span>
                        </div>
                      )}
                      <div className="v-row">
                        <span className="v-label">SERVICE</span>
                        <span className="v-val">{formData.service.replace(/-/g, ' ').toUpperCase()}</span>
                      </div>
                      <div className="v-row">
                        <span className="v-label">{formData.jobType === 'scheduled' ? 'START DATE' : 'SCHEDULED'}</span>
                        <span className="v-val">{formData.date}</span>
                      </div>
                      {formData.preferredTime && (
                        <div className="v-row">
                          <span className="v-label">BY TIME</span>
                          <span className="v-val">{formData.preferredTime}</span>
                        </div>
                      )}
                      <div className="v-row total">
                        <span className="v-label">TOTAL PRICE</span>
                        <span className="v-val">{formData.service === 'round-trip' ? '$20.00' : '$10.00'}</span>
                      </div>
                    </div>
                    <div className="voucher-footer">
                       Valid for lodgement at {lpo?.name || 'Rouse Hill LPO'}
                    </div>
                  </div>

                  <div className="form-actions">
                    <button className="btn-text" onClick={handleBack}>Modify Selection</button>
                    <button 
                      className="btn-primary flex-1 shadow-teal" 
                      onClick={handleSubmit}
                      disabled={loading}
                    >
                      {loading ? 'PROCESSING...' : 'REQUEST JOB'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <style>{`
        .new-job-premium {
          position: relative;
          min-height: 100vh;
          overflow-x: hidden;
          background: #f0f7f4;
          padding-bottom: 60px;
        }

        .mesh-bg {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          z-index: 0; filter: blur(100px); opacity: 0.6;
        }
        .blob {
          position: absolute; width: 600px; height: 600px; border-radius: 50%;
          background: var(--mailplus-light-green); animation: blobPulse 20s infinite alternate;
        }
        .blob-1 { top: -100px; right: -100px; }
        .blob-2 { bottom: -150px; left: -100px; background: #c3e2d3; }
        .blob-3 { top: 30%; left: 30%; width: 300px; height: 300px; background: var(--mailplus-yellow); opacity: 0.2; }

        @keyframes blobPulse {
          0%, 100% { border-radius: 63% 37% 54% 46% / 55% 48% 52% 45%; }
          50% { border-radius: 40% 60% 54% 46% / 49% 60% 40% 51%; }
        }

        .form-container { position: relative; z-index: 1; max-width: 800px; margin: 0 auto; padding: 60px 24px; }
        .form-header { text-align: center; margin-bottom: 48px; }
        .header-icon-pill { width: 48px; height: 48px; background: white; border-radius: 16px; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; color: var(--mailplus-teal); box-shadow: 0 8px 24px rgba(0,0,0,0.05); }
        .form-header h1 { font-size: 2.8rem; font-weight: 800; color: var(--mailplus-teal); letter-spacing: -1px; margin-bottom: 8px; }
        .form-header p { font-size: 1.1rem; color: #5b7971; }

        .step-tracker { display: flex; justify-content: space-between; max-width: 500px; margin: 0 auto 60px; position: relative; }
        .step-item { display: flex; flex-direction: column; align-items: center; gap: 12px; position: relative; z-index: 2; flex: 1; }
        .step-circle { width: 40px; height: 40px; border-radius: 50%; background: #e2ebe2; color: #8fa6a0; display: flex; align-items: center; justify-content: center; font-weight: 800; transition: all 0.3s; border: 2px solid white; }
        .step-item.active .step-circle { background: var(--mailplus-teal); color: white; transform: scale(1.1); box-shadow: 0 8px 20px rgba(0, 65, 65, 0.2); }
        .step-item.completed .step-circle { background: #2ecc71; color: white; }
        .step-label { font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: #8fa6a0; letter-spacing: 1px; }
        .step-item.active .step-label { color: var(--mailplus-teal); }
        .step-connector { position: absolute; top: 20px; left: calc(50% + 20px); width: calc(100% - 40px); height: 2px; background: #e2ebe2; z-index: 1; }
        .step-item.completed .step-connector { background: #2ecc71; }

        .glass-card { background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.4); border-radius: 32px; padding: 40px; box-shadow: 0 20px 60px rgba(0, 65, 65, 0.05); }
        .card-top-info { display: flex; align-items: center; gap: 12px; margin-bottom: 32px; color: var(--mailplus-teal); }
        .card-top-info h3 { font-weight: 800; font-size: 1.25rem; margin: 0; }

        .search-dropdown { position: absolute; top: calc(100% + 8px); left: 0; right: 0; max-height: 280px; overflow-y: auto; background: white; border-radius: 20px; padding: 12px; z-index: 1000; box-shadow: 0 20px 50px rgba(0,65,65,0.15); border: 1px solid rgba(0,65,65,0.08); animation: dropdownSlide 0.3s cubic-bezier(0.19, 1, 0.22, 1) forwards; }
        @keyframes dropdownSlide { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        
        .dropdown-header { display: flex; align-items: center; gap: 8px; padding: 8px 12px; font-size: 0.65rem; font-weight: 800; color: var(--mailplus-teal); opacity: 0.6; letter-spacing: 1px; border-bottom: 1px solid #f0f4f4; margin-bottom: 8px; }
        
        .search-item-premium { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-radius: 14px; cursor: pointer; transition: all 0.2s; margin-bottom: 4px; border: 1px solid transparent; }
        .search-item-premium:hover { background: #f8fcfb; border-color: rgba(0, 65, 65, 0.05); transform: translateX(4px); }
        .company-name { font-weight: 800; color: #1a3c34; font-size: 1rem; }
        .search-item-premium .sub { font-size: 0.75rem; color: #8fa6a0; margin-top: 2px; }
        
        .item-action { display: flex; align-items: center; gap: 6px; font-size: 0.7rem; font-weight: 800; color: var(--mailplus-teal); opacity: 0; transition: opacity 0.2s; }
        .search-item-premium:hover .item-action { opacity: 1; }

        .input-pill.has-suggestions { position: relative; }
        .match-badge { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: var(--mailplus-teal); color: white; padding: 4px 10px; border-radius: 8px; font-size: 0.55rem; font-weight: 900; display: flex; align-items: center; gap: 4px; animation: badgePop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; box-shadow: 0 4px 12px rgba(0, 65, 65, 0.1); }
        @keyframes badgePop { from { transform: translateY(-50%) scale(0.5); opacity: 0; } to { transform: translateY(-50%) scale(1); opacity: 1; } }
        .sparkle-icon { animation: sparkleSpin 2s infinite linear; }
        @keyframes sparkleSpin { 0% { transform: rotate(0); } 50% { transform: scale(1.2); } 100% { transform: rotate(360deg); } }

        .input-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
        .input-pill { display: flex; align-items: center; gap: 12px; background: white; border-radius: 18px; padding: 12px 20px; border: 1px solid #f0f4f4; transition: border-color 0.2s; }
        .input-pill:focus-within { border-color: var(--mailplus-teal); }
        
        .locked-badge { display: inline-flex; align-items: center; gap: 8px; background: #e8f4ef; color: var(--mailplus-teal); padding: 8px 16px; border-radius: 12px; font-size: 0.65rem; font-weight: 800; margin-bottom: 24px; border: 1px solid rgba(0, 65, 65, 0.05); }
        .locked-group { pointer-events: none; margin-top: 8px; }
        .field-hint.mini { font-size: 0.7rem; margin-top: 8px; }
        .input-pill.full { grid-column: span 2; }
        .input-pill input, .input-pill textarea { border: none; background: transparent; width: 100%; font-size: 0.95rem; color: var(--mailplus-teal); font-weight: 500; }
        .input-pill.area textarea { resize: none; margin-top: 8px; }
        .input-pill.read-only { background: #f8fcfb; }
        .lock-icon { color: #8fa6a0; }

        .toggle-section { margin-bottom: 32px; }
        .toggle-pill { display: inline-flex; align-items: center; gap: 12px; background: white; padding: 10px 20px; border-radius: 14px; font-weight: 700; color: #5b7971; cursor: pointer; border: 1px solid #f0f4f4; }

        .error-pill { display: flex; align-items: center; gap: 10px; padding: 14px 20px; border-radius: 16px; background: #fff5f5 !important; color: #c53030; font-weight: 700; font-size: 0.9rem; margin-bottom: 24px; }

        .selection-group { margin-bottom: 40px; }
        .group-label { display: block; font-size: 0.8rem; font-weight: 800; text-transform: uppercase; color: #8fa6a0; letter-spacing: 1px; margin-bottom: 16px; }
        .billing-grid { display: grid; gap: 12px; grid-template-columns: 1fr 1fr; max-width: 500px; margin: 0 auto; }
        .billing-btn { padding: 16px; border-radius: 20px; font-weight: 700; color: #8fa6a0; display: flex; flex-direction: column; align-items: center; gap: 8px; cursor: pointer; transition: all 0.2s; border: 1px solid #f0f4f4; background: white; }
        .billing-btn.active { background: var(--mailplus-teal); color: white; transform: translateY(-4px); box-shadow: 0 10px 25px rgba(0, 65, 65, 0.2); }

        .service-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .service-btn { padding: 24px; border-radius: 24px; display: flex; flex-direction: column; align-items: center; gap: 12px; color: #5b7971; cursor: pointer; transition: all 0.3s; border: 1px solid #f0f4f4; background: white; }
        .service-btn.active { background: white; color: var(--mailplus-teal); transform: translateY(-6px); box-shadow: 0 20px 40px rgba(0, 65, 65, 0.1); border: 2px solid var(--mailplus-teal); }
        .srv-label { font-size: 0.75rem; font-weight: 700; opacity: 0.8; }
        .srv-price { font-size: 1.4rem; color: var(--mailplus-teal); }

        .date-time-row { display: flex; gap: 20px; margin-bottom: 24px; }
        .date-pill-group { display: flex; align-items: center; gap: 16px; background: white; padding: 14px 24px; border-radius: 20px; border: 1px solid #f0f4f4; }
        .date-pill-group input { border: none; font-weight: 700; color: var(--mailplus-teal); }
        .alert-pill { display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; border-radius: 12px; font-size: 0.75rem; font-weight: 700; margin-top: 16px; }
        .alert-pill.success { color: #2ecc71; background: rgba(46, 204, 113, 0.05); }
        .alert-pill.warning { color: #e67e22; background: rgba(230, 126, 34, 0.05); }

        .job-type-tabs { display: flex; gap: 4px; background: #f0f4f4; padding: 4px; border-radius: 12px; width: fit-content; }
        .type-tab { padding: 8px 24px; border-radius: 10px; border: none; font-weight: 700; color: #8fa6a0; cursor: pointer; transition: all 0.2s; }
        .type-tab.active { background: white; color: var(--mailplus-teal); box-shadow: 0 4px 10px rgba(0,0,0,0.05); }

        .frequency-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-top: 16px; }
        .freq-pill { padding: 10px; border-radius: 12px; border: 1px solid #f0f4f4; background: white; font-weight: 700; color: #8fa6a0; cursor: pointer; transition: all 0.2s; }
        .freq-pill.active { background: var(--mailplus-teal); color: white; border-color: var(--mailplus-teal); }

        .voucher-card { padding: 40px; border-radius: 32px; border: 2px dashed #e0e7e4; background: white !important; margin-bottom: 40px; }
        .voucher-header { display: flex; justify-content: space-between; border-bottom: 1px solid #f0f4f4; padding-bottom: 24px; margin-bottom: 32px; }
        .v-logo { font-size: 1.4rem; font-weight: 800; color: var(--mailplus-teal); }
        .v-badge { background: var(--mailplus-yellow); color: var(--mailplus-teal); padding: 4px 12px; border-radius: 6px; font-weight: 800; font-size: 0.65rem; }
        .v-row { display: flex; justify-content: space-between; margin-bottom: 12px; }
        .v-label { font-size: 0.75rem; font-weight: 800; color: #8fa6a0; }
        .v-val { font-weight: 700; color: var(--mailplus-teal); }
        .v-row.total { margin-top: 24px; padding-top: 24px; border-top: 1px solid #f0f4f4; }
        .v-row.total .v-val { font-size: 1.5rem; }
        .voucher-footer { text-align: center; font-size: 0.75rem; color: #8fa6a0; margin-top: 24px; }

        .form-actions { display: flex; gap: 16px; margin-top: 40px; }
        .btn-primary { background: var(--mailplus-teal); color: white; border: none; padding: 16px 32px; border-radius: 18px; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 12px; }
        .btn-secondary { background: white; color: var(--mailplus-teal); border: 1px solid #f0f4f4; padding: 16px 32px; border-radius: 18px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 12px; }
        .btn-text { background: transparent; border: none; color: #8fa6a0; font-weight: 700; cursor: pointer; }

        .success-card.tc-waiting { border-top: 6px solid #f39c12; }
        .pulse-icon.warning { color: #f39c12; }
        .status-progress { margin: 24px 0; background: #fff8e1; padding: 16px; border-radius: 16px; display: flex; flex-direction: column; align-items: center; gap: 8px; }
        .progress-label { font-size: 0.6rem; font-weight: 900; color: #d35400; letter-spacing: 1px; }

        .fade-in { animation: fadeIn 0.4s ease-out forwards; }
        .fade-out { animation: fadeOut 0.3s ease-in forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeOut { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(-10px); } }

        @media (max-width: 700px) {
          .input-grid { grid-template-columns: 1fr; }
          .input-pill.full { grid-column: span 1; }
          .service-grid { grid-template-columns: 1fr; }
          .date-time-row { flex-direction: column; }
        }
      `}</style>
    </div>
  );
};

export default NewJobForm;
