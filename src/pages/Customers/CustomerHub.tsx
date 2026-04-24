import React, { useEffect, useState } from 'react';
import { 
  Users, 
  Search, 
  MapPin, 
  Phone, 
  ChevronRight,
  Filter,
  Plus,
  Mail,
  CreditCard,
  Rocket
} from 'lucide-react';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useLpo } from '../../context/LpoContext';

const CustomerHub: React.FC = () => {
  const { lpo } = useLpo();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (lpo) {
      const fetchCustomers = async () => {
        try {
          const q = query(
            collection(db, `lpo/${lpo.id}/customers`),
            orderBy('companyName', 'asc')
          );
          const snapshot = await getDocs(q);
          setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
          console.error("Error fetching customers:", error);
          // Fallback if index isn't ready
          const q = query(collection(db, `lpo/${lpo.id}/customers`));
          const snapshot = await getDocs(q);
          setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } finally {
          setLoading(false);
        }
      };
      fetchCustomers();
    }
  }, [lpo]);

  const filteredCustomers = customers.filter(c => {
    const searchStr = searchTerm.toLowerCase();
    const name = (c.companyName || c.company_name || '').toLowerCase();
    const city = (c.city || c.address?.suburb || '').toLowerCase();
    const franchisee = (c.franchiseeText || '').toLowerCase();
    return name.includes(searchStr) || city.includes(searchStr) || franchisee.includes(searchStr);
  });

  return (
    <div className="customer-hub-premium">
      <div className="mesh-bg">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
      </div>

      <div className="content-container">
        <header className="page-header">
           <div className="header-left">
              <div className="title-area">
                <Users className="header-icon" />
                <div>
                  <h1>Customer Hub</h1>
                  <p>Manage and track your service territory clients.</p>
                </div>
              </div>
           </div>
           <div className="header-right">
              <button className="btn-premium-action" onClick={() => window.location.href = '/new-job'}>
                <Plus size={20} />
                <span>NEW JOB FOR CUSTOMER</span>
              </button>
           </div>
        </header>

        <div className="hub-controls">
           <div className="search-bar-glass">
              <Search size={20} />
              <input 
                type="text" 
                placeholder="Search by company, contact or suburb..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
           </div>
           <div className="filter-pills">
              <button className="pill active"><Filter size={14} /> All Clients</button>
              <button className="pill">Recent Acquisitions</button>
              <button className="pill">Frequent Service</button>
           </div>
        </div>

        <div className="customers-view">
           {loading ? (
             <div className="loading-state">Syncing Database...</div>
           ) : filteredCustomers.length === 0 ? (
             <div className="empty-hub glass-card">
                <Users size={64} className="empty-icon" />
                <h3>No Customers Found</h3>
                <p>Start a job for a new client to see them listed here.</p>
             </div>
           ) : (
             <div className="customer-grid">
                {filteredCustomers.map((customer) => (
                   <div key={customer.id} className="customer-card glass-card">
                       <div className="card-top">
                          <div className="avatar">
                             {(customer.companyName || customer.company_name || '?').charAt(0)}
                          </div>
                          <div className="main-info">
                             <h3>{customer.companyName || customer.company_name}</h3>
                             {customer.franchiseeText && (
                               <div className="sub-info franchisee-tag">
                                  <Users size={12} />
                                  <span>Franchisee: {customer.franchiseeText}</span>
                               </div>
                             )}
                          </div>
                          <div className={`status-badge-premium ${customer.status === 'Active' ? 'active' : 'awaiting'}`}>{customer.status === 'Active' ? 'ACTIVE' : 'AWAITING T&C'}</div>
                       </div>

                      <div className="card-body">
                          <div className="contact-item">
                             <Phone size={14} />
                             <span>{customer.customerPhone || customer.phone || 'No phone'}</span>
                          </div>
                          <div className="contact-item">
                             <MapPin size={14} />
                             <span>{(customer.address1 || customer.address?.street || 'No address')}, {(customer.city || customer.address?.suburb || '')}</span>
                          </div>
                          <div className="contact-item">
                             <Mail size={14} />
                             <span>{(customer.state || customer.address?.state || '')} {(customer.zip || customer.address?.postcode || '')}</span>
                          </div>
                      </div>
 
                       <div className="services-setup-premium">
                          <div className="setup-header">
                             <Rocket size={12} />
                             <span>SERVICES SETUP</span>
                          </div>
                          <div className="setup-tags">
                             <span className={`service-tag-pill ${customer.lpoServiceAMPOInternalID && customer.lpoServiceAMPOInternalID !== 'null' ? 'enabled' : 'disabled'}`}>
                               LPO ➔ Site
                             </span>
                             <span className={`service-tag-pill ${customer.lpoServicePMPOInternalID && customer.lpoServicePMPOInternalID !== 'null' ? 'enabled' : 'disabled'}`}>
                               Site ➔ LPO
                             </span>
                             <span className={`service-tag-pill ${customer.lpoServiceAMPOPMPOInternalID && customer.lpoServiceAMPOPMPOInternalID !== 'null' ? 'enabled' : 'disabled'}`}>
                               Round Trip
                             </span>
                          </div>
                       </div>

                      <div className="service-details-premium">
                         <div className="detail-tag">
                            <CreditCard size={12} />
                            <span>Billing: <strong style={{ textTransform: 'uppercase' }}>{customer.billing || 'N/A'}</strong></span>
                         </div>
                         <div className="detail-tag">
                            <Rocket size={12} />
                            <span>Job Type: <strong style={{ textTransform: 'capitalize' }}>{customer.jobtype || customer.jobType || 'N/A'}</strong></span>
                         </div>
                      </div>

                      <div className="card-footer">
                         <div className="stats">
                            <div className="stat-item">
                               <label>Total Jobs</label>
                               <span>--</span>
                            </div>
                            <div className="stat-item">
                               <label>Last Service</label>
                               <span>{customer.lastJobDate ? new Date(customer.lastJobDate).toLocaleDateString() : 'N/A'}</span>
                            </div>
                         </div>
                         <button className="view-details" onClick={() => window.location.href = `/new-job?rebook=true&customerId=${customer.id}`}>
                            <ChevronRight size={18} />
                         </button>
                      </div>
                   </div>
                ))}
             </div>
           )}
        </div>
      </div>

      <style>{`
        .customer-hub-premium { min-height: 100vh; background: var(--cream); padding: 40px 24px 100px; position: relative; overflow-x: hidden; }
        .mesh-bg { position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 0; filter: blur(100px); opacity: 0.5; }
        .blob { position: absolute; border-radius: 50%; width: 600px; height: 600px; background: var(--cream-warm); }
        .blob-1 { top: -100px; right: -100px; }
        .blob-2 { bottom: -100px; left: -100px; background: var(--cream-warm); }

        .content-container { position: relative; z-index: 1; max-width: 1200px; margin: 0 auto; }

        .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
        .title-area { display: flex; gap: 20px; align-items: center; }
        .header-icon { width: 44px; height: 44px; color: var(--ink); }
        .page-header h1 { font-family: var(--font-headings); font-size: 2.2rem; font-weight: 400; color: var(--ink); margin: 0; letter-spacing: -0.025em; }
        .page-header p { margin: 4px 0; color: var(--ink-soft); font-size: 1rem; font-weight: 400; }

        .btn-premium-action {
          background: var(--ink); color: white; border: none; padding: 14px 28px; border-radius: 18px;
          font-weight: 800; display: flex; align-items: center; gap: 12px; cursor: pointer;
          box-shadow: 0 10px 25px rgba(26, 61, 51, 0.2); transition: all 0.3s;
        }

        .hub-controls { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; gap: 20px; }
        .search-bar-glass {
           flex: 1; display: flex; align-items: center; gap: 16px; background: rgba(255,255,255,0.7);
           backdrop-filter: blur(10px); padding: 0 24px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.4);
           max-width: 600px;
        }
        .search-bar-glass input { border: none; background: transparent; padding: 18px 0; width: 100%; font-weight: 600; font-size: 1rem; color: var(--ink); }
        .search-bar-glass input:focus { outline: none; }
        .search-bar-glass svg { color: var(--ink-soft); }

        .filter-pills { display: flex; gap: 10px; }
        .pill { background: white; border: 1px solid var(--cream-warm); padding: 10px 20px; border-radius: 50px; font-weight: 700; color: var(--ink-soft); font-size: 0.85rem; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s; }
        .pill.active { background: var(--ink); color: white; border-color: var(--ink); }

        .customers-view { margin-top: 20px; }
        .glass-card { background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.4); border-radius: 32px; padding: 24px; }
        
        .customer-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px; }
        .customer-card { transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        .customer-card:hover { transform: translateY(-8px); background: var(--paper); box-shadow: 0 20px 40px rgba(26, 61, 51, 0.08); }

        .card-top { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; position: relative; }
        .avatar { width: 44px; height: 44px; background: var(--cream-warm); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: 400; color: var(--ink); font-size: 1.2rem; font-family: var(--font-headings); }
        .main-info h3 { margin: 0; font-size: 1.1rem; font-weight: 400; color: var(--ink); letter-spacing: -0.015em; font-family: var(--font-headings); }
        .sub-info { display: flex; align-items: center; gap: 6px; color: var(--ink-soft); font-size: 0.75rem; font-weight: 400; margin-top: 2px; }
        .franchisee-tag { color: var(--ink); background: rgba(26, 61, 51, 0.05); padding: 2px 8px; border-radius: 6px; width: fit-content; }
        .status-badge-premium { font-family: var(--font-ui); padding: 4px 10px; border-radius: 8px; font-size: 0.55rem; font-weight: 500; letter-spacing: 0.16em; text-transform: uppercase; }
        .status-badge-premium.active { background: var(--cream-warm); color: var(--ink); }
        .status-badge-premium.awaiting { background: var(--cream-warm); color: var(--gold); }

        .card-body { border-top: 1px solid var(--cream-warm); border-bottom: 1px solid var(--cream-warm); padding: 16px 0; margin-bottom: 16px; display: flex; flex-direction: column; gap: 10px; }
        .contact-item { display: flex; align-items: center; gap: 10px; color: var(--ink-soft); font-size: 0.85rem; font-weight: 600; }
        .contact-item svg { color: var(--ink-soft); opacity: 0.6; }

        .service-details-premium { padding: 0 24px 16px; display: flex; gap: 12px; }
        .detail-tag { display: flex; align-items: center; gap: 6px; background: var(--paper); padding: 6px 12px; border-radius: 10px; font-size: 0.75rem; font-weight: 600; color: var(--ink-soft); }
        .detail-tag svg { color: var(--gold); }
        .detail-tag strong { color: var(--ink); }
 
        .services-setup-premium { padding: 0 24px 16px; }
        .setup-header { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
        .setup-header span { font-family: var(--font-ui); font-size: 0.55rem; font-weight: 500; color: var(--ink-soft); opacity: 0.6; letter-spacing: 0.16em; text-transform: uppercase; }
        .setup-header svg { color: var(--gold); opacity: 0.6; }
        .setup-tags { display: flex; flex-wrap: wrap; gap: 8px; }
        .service-tag-pill { font-family: var(--font-ui); padding: 4px 10px; border-radius: 20px; font-size: 0.55rem; font-weight: 500; border: 1px solid transparent; text-transform: uppercase; letter-spacing: 0.05em; }
        .service-tag-pill.enabled { background: var(--cream-warm); color: var(--ink); border-color: rgba(26, 61, 51, 0.1); }
        .service-tag-pill.disabled { background: var(--cream); color: var(--ink-soft); border-color: var(--cream-warm); text-decoration: line-through; opacity: 0.6; }

        .card-footer { display: flex; justify-content: space-between; align-items: flex-end; }
        .stats { display: flex; gap: 20px; }
        .stat-item { display: flex; flex-direction: column; }
        .stat-item label { font-family: var(--font-ui); font-size: 0.55rem; font-weight: 500; color: var(--ink-soft); opacity: 0.6; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.16em; }
        .stat-item span { font-family: var(--font-ui); font-size: 0.75rem; font-weight: 500; color: var(--ink); }

        .view-details { width: 40px; height: 40px; border-radius: 12px; background: var(--cream-warm); border: none; color: var(--ink); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .view-details:hover { background: var(--ink); color: white; }

        .empty-hub { text-align: center; padding: 80px; color: var(--ink-soft); }
        .empty-icon { opacity: 0.2; margin-bottom: 24px; }
        .empty-hub h3 { color: var(--ink); margin-bottom: 8px; }

        @media (max-width: 768px) {
           .hub-controls { flex-direction: column; align-items: stretch; }
           .pill { flex: 1; justify-content: center; }
        }
      `}</style>
    </div>
  );
};

export default CustomerHub;
