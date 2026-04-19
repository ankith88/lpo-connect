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
  Lock
} from 'lucide-react';
import { Autocomplete, useJsApiLoader } from '@react-google-maps/api';
import { getDefaultBookingDate, formatDateForInput } from '../../utils/scheduling';
import { useLpo } from '../../context/LpoContext';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db, googleMapsApiKey } from '../../firebase/config';

type ServiceType = 'site-to-lpo' | 'lpo-to-site' | 'round-trip';
type BillingOption = 'customer' | 'split' | 'lpo';

interface JobData {
  customer: {
    company: string;
    contact: string;
    phone: string;
    address: string;
    suburb: string;
    state: string;
    postcode: string;
    instructions: string;
  };
  saveToAddressBook: boolean;
  service: ServiceType;
  billing: BillingOption;
  date: string;
}

const LIBRARIES: ("places")[] = ["places"];

const NewJobForm: React.FC = () => {
  const { lpo } = useLpo();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [animating, setAnimating] = useState(false);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: googleMapsApiKey,
    libraries: LIBRARIES
  });

  const [formData, setFormData] = useState<JobData>({
    customer: {
      company: '',
      contact: '',
      phone: '',
      address: '',
      suburb: '',
      state: '',
      postcode: '',
      instructions: '',
    },
    saveToAddressBook: false,
    service: 'site-to-lpo',
    billing: 'customer',
    date: formatDateForInput(getDefaultBookingDate()),
  });

  const [searchResults, setSearchResults] = useState<any[]>([]);


  useEffect(() => {
    const draft = localStorage.getItem('rebook_draft');
    if (draft && window.location.search.includes('rebook=true')) {
      try {
        const jobData = JSON.parse(draft);
        setFormData(prev => ({
          ...prev,
          customer: jobData.customer,
          service: jobData.service,
          billing: jobData.billing,
          // Note: Date is NOT prefilled from draft to ensure 12PM cutoff logic is respected
        }));
        // Clean up
        localStorage.removeItem('rebook_draft');
      } catch (e) {
        console.error("Failed to parse rebook draft", e);
      }
    }
  }, []);

  useEffect(() => {
    if (formData.customer.company.length > 2 && lpo) {
      const searchCustomers = async () => {
        const q = query(
          collection(db, `lpo/${lpo.id}/customers`),
          where('search_name', '>=', formData.customer.company.toLowerCase()),
          where('search_name', '<=', formData.customer.company.toLowerCase() + '\uf8ff')
        );
        const snapshot = await getDocs(q);
        setSearchResults(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      };
      searchCustomers();
    } else {
      setSearchResults([]);
    }
  }, [formData.customer.company, lpo]);

  const selectCustomer = (c: any) => {
    setFormData({
      ...formData,
      customer: {
        company: c.company_name,
        contact: c.contact_person,
        phone: c.phone,
        address: c.address.street,
        suburb: c.address.suburb,
        state: c.address.state,
        postcode: c.address.postcode,
        instructions: c.instructions || '',
      }
    });
    setSearchResults([]);
  };

  const handleNext = () => {
    if (step === 1) {
      setValidationError(null);
      
      if (!formData.customer.address || !formData.customer.suburb) {
        setValidationError("Please select a valid address from the dropdown.");
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

      setFormData(prev => ({
        ...prev,
        customer: {
          ...prev.customer,
          address: fullStreet,
          suburb: suburb,
          state: state,
          postcode: postcode
        }
      }));
    }
  };

  const handleSubmit = async () => {
    if (!lpo) return;
    setLoading(true);
    try {
      if (formData.saveToAddressBook) {
        await addDoc(collection(db, `lpo/${lpo.id}/customers`), {
          company_name: formData.customer.company,
          search_name: formData.customer.company.toLowerCase(),
          contact_person: formData.customer.contact,
          phone: formData.customer.phone,
          address: {
            street: formData.customer.address,
            suburb: formData.customer.suburb,
            state: formData.customer.state,
            postcode: formData.customer.postcode
          },
          instructions: formData.customer.instructions
        });
      }

      await addDoc(collection(db, 'jobs'), {
        ...formData,
        lpo_id: lpo.id,
        status: 'scheduled',
        createdAt: new Date()
      });

      setSuccess(true);
    } catch (error) {
      console.error("Error creating job:", error);
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
                <h2>Booking Confirmed!</h2>
                <p>The adhoc job for <strong>{formData.customer.company}</strong> has been successfully broadcasted and scheduled.</p>
              </div>
              <div className="success-actions-premium">
                <button onClick={() => window.location.href = '/dashboard'} className="btn-primary flex-1 shadow-teal">
                   VIEW JOB MANAGER
                </button>
                <button onClick={() => window.location.reload()} className="btn-secondary full-width">
                   BOOK ANOTHER JOB
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
              <p>Create a one-off service job for your customers in seconds.</p>
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
                        onChange={(e) => setFormData({...formData, customer: {...formData.customer, company: e.target.value}})}
                      />
                      {searchResults.length > 0 && (
                        <div className="search-dropdown glass">
                          {searchResults.map(c => (
                            <div key={c.id} className="search-item" onClick={() => selectCustomer(c)}>
                              <div><strong>{c.company_name}</strong></div>
                              <div className="sub">{c.address.suburb}, {c.address.postcode}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="input-pill">
                      <User size={18} />
                      <input 
                        type="text" 
                        placeholder="Contact Person"
                        value={formData.customer.contact}
                        onChange={(e) => setFormData({...formData, customer: {...formData.customer, contact: e.target.value}})}
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

                  <div className="toggle-section">
                    <label className="toggle-pill">
                      <input 
                        type="checkbox" 
                        checked={formData.saveToAddressBook}
                        onChange={(e) => setFormData({...formData, saveToAddressBook: e.target.checked})}
                      />
                      <span>Save to Address Book</span>
                    </label>
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
                    <h3>Service Selection</h3>
                  </div>

                  <div className="selection-group">
                    <label className="group-label">Billing Option</label>
                    <div className="billing-grid two-cols">
                       {[
                         { id: 'customer', label: 'Customer Pays' },
                         { id: 'lpo', label: 'LPO Pays' }
                       ].map(opt => (
                         <button 
                           key={opt.id}
                           className={`billing-btn glass ${formData.billing === opt.id ? 'active' : ''}`}
                           onClick={() => setFormData({...formData, billing: opt.id as BillingOption})}
                         >
                           <CreditCard size={18} />
                           {opt.label}
                         </button>
                       ))}
                    </div>
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

                  <div className="selection-group">
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
                    {new Date().getHours() < 12 ? (
                      <div className="alert-pill glass success">
                        <Info size={14} /> Same-day pickup available before 12:00 PM
                      </div>
                    ) : (
                      <div className="alert-pill glass warning">
                        <Info size={14} /> Today is closed (Past 12:00 PM cutoff). Booking for next business day.
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
                       <div className="v-badge">ADHOC JOB</div>
                    </div>
                    <div className="voucher-body">
                      <div className="v-row">
                        <span className="v-label">CUSTOMER</span>
                        <span className="v-val">{formData.customer.company}</span>
                      </div>
                      <div className="v-row">
                        <span className="v-label">SERVICE</span>
                        <span className="v-val">{formData.service.replace(/-/g, ' ').toUpperCase()}</span>
                      </div>
                      <div className="v-row">
                        <span className="v-label">SCHEDULED</span>
                        <span className="v-val">{formData.date}</span>
                      </div>
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
                      {loading ? 'PROCESSING...' : 'CONFIRM & BOOK JOB'}
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

        .search-pill { display: flex; align-items: center; gap: 12px; background: white; border-radius: 20px; padding: 8px 8px 8px 20px; border: 1px solid #e0e7e4; margin-bottom: 32px; position: relative; }
        .has-suggestions { position: relative; }
        .search-pill input { flex: 1; border: none; background: transparent; font-size: 0.95rem; }
        .book-btn { background: var(--mailplus-teal); color: white; padding: 8px 20px; border-radius: 14px; font-weight: 800; display: flex; align-items: center; gap: 8px; font-size: 0.75rem; border: none; cursor: pointer; }
        .search-dropdown { position: absolute; top: calc(100% + 5px); left: 0; right: 0; max-height: 240px; overflow-y: auto; background: white; border-radius: 16px; padding: 8px; z-index: 1000; box-shadow: 0 10px 40px rgba(0,65,65,0.15); border: 1px solid rgba(0,65,65,0.05); }
        .search-item { padding: 12px 16px; border-radius: 10px; cursor: pointer; transition: background 0.2s; border-bottom: 1px solid rgba(0,0,0,0.02); }
        .search-item:last-child { border-bottom: none; }
        .search-item:hover { background: rgba(0, 65, 65, 0.05); }
        .search-item .sub { font-size: 0.75rem; color: #8fa6a0; margin-top: 4px; }

        .input-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
        .input-pill { display: flex; align-items: center; gap: 12px; background: white; border-radius: 18px; padding: 12px 20px; border: 1px solid #f0f4f4; transition: border-color 0.2s; }
        .input-pill:focus-within { border-color: var(--mailplus-teal); }
        .input-pill.full { grid-column: span 2; }
        .input-pill.area { padding: 8px 20px; }
        .input-pill input, .input-pill textarea { border: none; background: transparent; width: 100%; font-size: 0.95rem; color: var(--mailplus-teal); font-weight: 500; }
        .input-pill.area textarea { resize: none; margin-top: 8px; }
        .input-pill input::placeholder, .input-pill textarea::placeholder { color: #8fa6a0; }

        .toggle-section { margin-bottom: 32px; }
        .toggle-pill { display: inline-flex; align-items: center; gap: 12px; background: white; padding: 10px 20px; border-radius: 14px; font-weight: 700; color: #5b7971; cursor: pointer; border: 1px solid #f0f4f4; }
        .toggle-pill input { width: 18px; height: 18px; }

        .error-pill { display: flex; align-items: center; gap: 10px; padding: 14px 20px; border-radius: 16px; background: #fff5f5 !important; color: #c53030; font-weight: 700; font-size: 0.9rem; margin-bottom: 24px; }

        .group-label { display: block; font-size: 0.8rem; font-weight: 800; text-transform: uppercase; color: #8fa6a0; letter-spacing: 1px; margin-bottom: 16px; }
        .selection-group { margin-bottom: 40px; }
        .billing-grid { display: grid; gap: 12px; }
        .billing-grid.two-cols { grid-template-columns: 1fr 1fr; max-width: 500px; margin: 0 auto; }
        .alert-pill.success { color: #2ecc71; background: rgba(46, 204, 113, 0.05) !important; }
        .alert-pill.warning { color: #e67e22; background: rgba(230, 126, 34, 0.05) !important; }
        .billing-btn { padding: 16px; border-radius: 20px; font-weight: 700; color: #8fa6a0; display: flex; flex-direction: column; align-items: center; gap: 8px; cursor: pointer; transition: all 0.2s; border: none; }
        .billing-btn.active { background: var(--mailplus-teal) !important; color: white; transform: translateY(-4px); box-shadow: 0 10px 25px rgba(0, 65, 65, 0.2); }
        .service-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .service-btn { padding: 24px; border-radius: 24px; display: flex; flex-direction: column; align-items: center; gap: 12px; color: #5b7971; cursor: pointer; transition: all 0.3s; border: none; }
        .service-btn.active { background: white !important; color: var(--mailplus-teal); transform: translateY(-6px); box-shadow: 0 20px 40px rgba(0, 65, 65, 0.1); border: 2px solid var(--mailplus-teal); }
        .srv-label { font-size: 0.75rem; font-weight: 700; opacity: 0.8; }
        .srv-price { font-size: 1.4rem; color: var(--mailplus-teal); }

        .date-pill-group { display: flex; align-items: center; gap: 16px; background: white; padding: 14px 24px; border-radius: 20px; max-width: 300px; border: 1px solid #f0f4f4; }
        .date-pill-group input { border: none; font-weight: 700; color: var(--mailplus-teal); }
        .alert-pill { display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; border-radius: 12px; font-size: 0.75rem; font-weight: 700; color: #2ecc71; margin-top: 16px; background: rgba(46, 204, 113, 0.05) !important; }

        .voucher-card { padding: 40px; border-radius: 32px; border: 2px dashed #e0e7e4; background: white !important; margin-bottom: 40px; position: relative; }
        .voucher-header { display: flex; justify-content: space-between; border-bottom: 1px solid #f0f4f4; padding-bottom: 24px; margin-bottom: 32px; }
        .v-logo { font-size: 1.4rem; font-weight: 800; color: var(--mailplus-teal); }
        .v-badge { background: var(--mailplus-yellow); color: var(--mailplus-teal); padding: 4px 12px; border-radius: 6px; font-weight: 800; font-size: 0.65rem; }
        .v-row { display: flex; justify-content: space-between; padding: 12px 0; }
        .v-label { font-size: 0.75rem; font-weight: 800; color: #8fa6a0; }
        .v-val { font-weight: 700; color: var(--mailplus-teal); }
        .v-row.total { margin-top: 24px; padding-top: 24px; border-top: 2px solid #f0f4f4; }
        .v-row.total .v-val { font-size: 2rem; }
        .voucher-footer { margin-top: 40px; text-align: center; font-size: 0.8rem; color: #8fa6a0; font-weight: 600; }

        .btn-primary { background: var(--mailplus-teal); color: white; padding: 18px; border-radius: 20px; font-weight: 800; font-size: 1.1rem; display: flex; align-items: center; justify-content: center; gap: 12px; border: none; cursor: pointer; transition: all 0.2s; }
        .btn-primary:active { transform: scale(0.98); }
        .shadow-teal { box-shadow: 0 10px 30px rgba(0, 65, 65, 0.15); }
        .form-actions { display: flex; gap: 16px; margin-top: 40px; }
        .btn-secondary { padding: 18px 32px; border-radius: 20px; background: white; color: var(--mailplus-teal); font-weight: 800; border: 1px solid #e0e7e4; }
        .btn-text { background: transparent; color: var(--mailplus-teal); padding: 12px; font-weight: 700; font-size: 0.9rem; }
        
        .success-view-premium { display: flex; justify-content: center; align-items: center; min-height: 60vh; width: 100%; }
        .success-card { text-align: center; padding: 60px 40px; max-width: 500px; width: 100%; border-radius: 40px; }
        .success-icon-animation { color: #2ecc71; margin-bottom: 32px; }
        .pulse-icon { animation: successPulse 2s infinite; }
        @keyframes successPulse { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.1); opacity: 0.8; } 100% { transform: scale(1); opacity: 1; } }
        .success-text h2 { font-size: 2.2rem; font-weight: 900; margin-bottom: 16px; color: var(--mailplus-teal); }
        .success-text p { font-size: 1.1rem; color: #5b7971; line-height: 1.6; }
        .success-actions-premium { margin-top: 48px; display: flex; flex-direction: column; gap: 16px; }
        .full-width { width: 100%; }

        .fade-in { animation: fadeIn 0.4s forwards; }
        .fade-out { animation: fadeOut 0.3s forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeOut { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(-10px); } }

        @media screen and (max-width: 700px) {
          .input-grid, .billing-grid, .service-grid { grid-template-columns: 1fr; }
          .input-pill.half { grid-column: span 1; }
          .page-container { padding: 40px 16px; }
          .form-header h1 { font-size: 2.2rem; }
          .glass-card { padding: 24px; border-radius: 24px; }
        }
      `}</style>
    </div>
  );
};

export default NewJobForm;
