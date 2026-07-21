import React, { useState, useEffect, useRef } from 'react';
import { X, Save, User, Mail, Phone, MapPin, Building2, RefreshCw, ChevronRight } from 'lucide-react';
import { useJsApiLoader } from '@react-google-maps/api';
import { doc, updateDoc } from 'firebase/firestore';
import { db, googleMapsApiKey } from '../firebase/config';

interface EditCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: any;
  onUpdate: (updatedCustomer: any) => void;
}

const EditCustomerModal: React.FC<EditCustomerModalProps> = ({ 
  isOpen, 
  onClose, 
  customer,
  onUpdate
}) => {
  const [formData, setFormData] = useState({
    companyName: '',
    firstName: '',
    lastName: '',
    customerEmail: '',
    customerPhone: '',
    address1: '',
    city: '',
    state: '',
    postcode: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  // Google Maps Autocomplete integration
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: googleMapsApiKey,
    libraries: ['places']
  });

  const [addressPredictions, setAddressPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);

  const fetchAddressPredictions = async (input: string) => {
    if (!isLoaded || !input.trim()) {
      setAddressPredictions([]);
      return;
    }

    if (!autocompleteServiceRef.current) {
      autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
    }

    const request: google.maps.places.AutocompletionRequest = {
      input,
      componentRestrictions: { country: 'AU' },
      types: ['address']
    };

    autocompleteServiceRef.current.getPlacePredictions(request, (predictions, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
        setAddressPredictions(predictions);
      } else {
        setAddressPredictions([]);
      }
    });
  };

  const handleAddressSelect = (prediction: google.maps.places.AutocompletePrediction) => {
    if (!isLoaded) return;

    if (!placesServiceRef.current) {
      const dummyDiv = document.createElement('div');
      placesServiceRef.current = new google.maps.places.PlacesService(dummyDiv);
    }

    placesServiceRef.current.getDetails({
      placeId: prediction.place_id,
      fields: ['address_components']
    }, (place, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && place) {
        let streetNumber = '';
        let route = '';
        let suburb = '';
        let state = '';
        let postcode = '';

        place.address_components?.forEach(component => {
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
          address1: fullStreet,
          city: suburb,
          state: state,
          postcode: postcode
        }));
        setAddressPredictions([]);
      }
    });
  };

  useEffect(() => {
    if (customer) {
      setFormData({
        companyName: customer.companyName || customer.company_name || '',
        firstName: customer.firstName || customer.first_name || '',
        lastName: customer.lastName || customer.last_name || '',
        customerEmail: customer.customerEmail || customer.email || '',
        customerPhone: customer.customerPhone || customer.phone || '',
        address1: customer.address1 || customer.address?.street || '',
        city: customer.city || customer.address?.suburb || '',
        state: customer.state || customer.address?.state || '',
        postcode: customer.postcode || customer.zip || customer.address?.postcode || ''
      });
    }
  }, [customer]);

  const handleSave = async () => {
    if (!customer?.id || !customer?.lpo_id) return;

    setIsSaving(true);
    try {
      const customerRef = doc(db, `lpo/${customer.lpo_id}/customers`, customer.id);
      
      const updates: any = {
        companyName: formData.companyName,
        company_name: formData.companyName,
        firstName: formData.firstName,
        first_name: formData.firstName,
        lastName: formData.lastName,
        last_name: formData.lastName,
        customerEmail: formData.customerEmail,
        email: formData.customerEmail,
        customerPhone: formData.customerPhone,
        phone: formData.customerPhone,
        address1: formData.address1,
        city: formData.city,
        state: formData.state,
        postcode: formData.postcode,
        zip: formData.postcode
      };

      await updateDoc(customerRef, updates);
      
      onUpdate({ ...customer, ...updates });
      onClose();
    } catch (error) {
      console.error("Error updating customer:", error);
      alert("Failed to update customer. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !customer) return null;


  return (
    <div className="modal-overlay active">
      <div className="modal-content glass-card fade-in" style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <div className="header-title">
            <Building2 size={20} />
            <h2>Edit Customer Details</h2>
          </div>
          <button className="close-btn" onClick={onClose} disabled={isSaving}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="edit-form-grid">
            <div className="form-group full-width">
              <label>Company Name</label>
              <div className="input-wrapper">
                <Building2 size={16} />
                <input 
                  type="text" 
                  value={formData.companyName}
                  onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                  placeholder="Enter company name"
                />
              </div>
            </div>

            <div className="form-group">
              <label>First Name</label>
              <div className="input-wrapper">
                <User size={16} />
                <input 
                  type="text" 
                  value={formData.firstName}
                  onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                  placeholder="First Name"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Last Name</label>
              <div className="input-wrapper">
                <User size={16} />
                <input 
                  type="text" 
                  value={formData.lastName}
                  onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                  placeholder="Last Name"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Email Address</label>
              <div className="input-wrapper">
                <Mail size={16} />
                <input 
                  type="email" 
                  value={formData.customerEmail}
                  onChange={(e) => setFormData({...formData, customerEmail: e.target.value})}
                  placeholder="email@example.com"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Phone Number</label>
              <div className="input-wrapper">
                <Phone size={16} />
                <input 
                  type="text" 
                  value={formData.customerPhone}
                  onChange={(e) => setFormData({...formData, customerPhone: e.target.value})}
                  placeholder="Phone number"
                />
              </div>
            </div>

            <div className="form-group full-width" style={{ position: 'relative' }}>
              <label>Street Address</label>
              <div className="input-wrapper">
                <MapPin size={16} />
                <input 
                  type="text" 
                  value={formData.address1}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData({...formData, address1: val});
                    fetchAddressPredictions(val);
                  }}
                  placeholder="Start typing street address..."
                />
              </div>
              {addressPredictions.length > 0 && (
                <div className="search-dropdown address-suggestions">
                  <div className="dropdown-header">
                    <MapPin size={12} />
                    <span>ADDRESS SUGGESTIONS</span>
                  </div>
                  {addressPredictions.map(p => (
                    <div key={p.place_id} className="search-item-premium address-item" onClick={() => handleAddressSelect(p)}>
                      <div className="item-info">
                        <div className="main-text">{p.structured_formatting.main_text}</div>
                        <div className="secondary-text">{p.structured_formatting.secondary_text}</div>
                      </div>
                      <div className="item-action">
                        <span>SELECT</span>
                        <ChevronRight size={14} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Suburb / City</label>
              <div className="input-wrapper">
                <MapPin size={16} />
                <input 
                  type="text" 
                  value={formData.city}
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                  placeholder="Suburb"
                />
              </div>
            </div>

            <div className="form-group">
              <label>State</label>
              <div className="input-wrapper">
                <MapPin size={16} />
                <input 
                  type="text" 
                  value={formData.state}
                  onChange={(e) => setFormData({...formData, state: e.target.value})}
                  placeholder="State"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Postcode</label>
              <div className="input-wrapper">
                <MapPin size={16} />
                <input 
                  type="text" 
                  value={formData.postcode}
                  onChange={(e) => setFormData({...formData, postcode: e.target.value})}
                  placeholder="Postcode"
                />
              </div>
            </div>
          </div>

          <div className="modal-actions">
            <button 
              className="btn-secondary-glass" 
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button 
              className="btn-primary-glass" 
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? <RefreshCw size={18} className="spin" /> : <><Save size={18} /> Save Changes</>}
            </button>
          </div>
        </div>
      </div>
      
      <style>{`
        .modal-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(26, 61, 51, 0.4); backdrop-filter: blur(8px);
          display: flex; align-items: center; justify-content: center; z-index: 3000;
          padding: 24px;
        }
        .modal-content { 
          width: 100%; 
          background: white;
          padding: 32px; 
          border-radius: 24px;
          position: relative;
          box-shadow: 0 20px 50px rgba(0,0,0,0.2);
        }
        .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
        .header-title { display: flex; align-items: center; gap: 12px; color: var(--ink); }
        .header-title h2 { font-size: 1.25rem; font-weight: 800; margin: 0; }
        .close-btn { background: transparent; border: none; color: var(--ink-soft); opacity: 0.6; cursor: pointer; }
        
        .edit-form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 24px;
        }
        .form-group.full-width { grid-column: span 2; }
        
        .form-group label {
          display: block; 
          font-size: 0.7rem; 
          font-weight: 800; 
          text-transform: uppercase; 
          color: var(--ink-soft); 
          margin-bottom: 6px;
          opacity: 0.6;
          letter-spacing: 0.05em;
        }
        
        .input-wrapper {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(0,0,0,0.03);
          border: 1px solid rgba(0,0,0,0.05);
          padding: 10px 14px;
          border-radius: 12px;
          transition: all 0.2s;
        }
        .input-wrapper:focus-within {
          background: white;
          border-color: var(--ink);
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }
        .input-wrapper svg { color: var(--ink-soft); opacity: 0.5; }
        .input-wrapper input {
          border: none;
          background: transparent;
          width: 100%;
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--ink);
          outline: none;
        }

        .search-dropdown { 
          position: absolute; 
          top: calc(100% + 4px); 
          left: 0; 
          right: 0; 
          max-height: 200px; 
          overflow-y: auto; 
          background: white; 
          border-radius: 16px; 
          padding: 8px; 
          z-index: 1000; 
          box-shadow: 0 10px 30px rgba(0,0,0,0.15); 
          border: 1px solid rgba(0,0,0,0.08); 
          animation: dropdownSlide 0.2s ease-out forwards; 
        }
        @keyframes dropdownSlide { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
        
        .dropdown-header { display: flex; align-items: center; gap: 8px; padding: 6px 10px; font-size: 0.65rem; font-weight: 800; color: var(--ink); opacity: 0.6; letter-spacing: 1px; border-bottom: 1px solid rgba(0,0,0,0.05); margin-bottom: 6px; }
        
        .search-item-premium { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; border-radius: 10px; cursor: pointer; transition: all 0.2s; margin-bottom: 4px; border: 1px solid transparent; }
        .search-item-premium:hover { background: rgba(0,0,0,0.02); border-color: rgba(0,0,0,0.05); transform: translateX(2px); }
        
        .item-action { display: flex; align-items: center; gap: 4px; font-size: 0.7rem; font-weight: 800; color: var(--ink); opacity: 0; transition: opacity 0.2s; }
        .search-item-premium:hover .item-action { opacity: 1; }
        
        .address-item { padding: 8px 12px; text-align: left; }
        .address-item .main-text { font-weight: 700; color: var(--ink); font-size: 0.9rem; }
        .address-item .secondary-text { font-size: 0.75rem; color: var(--ink-soft); opacity: 0.6; margin-top: 2px; }

        .modal-actions { display: flex; gap: 12px; margin-top: 8px; }
        .btn-secondary-glass {
          flex: 1; padding: 14px; border-radius: 14px; font-weight: 700;
          border: 1px solid rgba(0,0,0,0.1); background: transparent;
          color: var(--ink); cursor: pointer; transition: all 0.2s;
        }
        .btn-secondary-glass:hover { background: rgba(0,0,0,0.05); }
        
        .btn-primary-glass {
          flex: 1; padding: 14px; border-radius: 14px; font-weight: 700;
          background: var(--ink); color: white; border: none;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          cursor: pointer; transition: all 0.2s;
        }
        .btn-primary-glass:hover { opacity: 0.9; transform: translateY(-2px); }
        .btn-primary-glass:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .fade-in { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        @media (max-width: 600px) {
          .edit-form-grid { grid-template-columns: 1fr; }
          .form-group.full-width { grid-column: span 1; }
          .modal-content { padding: 20px; }
        }
      `}</style>
    </div>
  );
};

export default EditCustomerModal;

