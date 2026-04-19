import React, { useEffect, useState } from 'react';
import { 
  Search, 
  RotateCcw, 
  Trash2, 
  ArrowRightLeft,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Layers,
  Plus,
  RefreshCw,
  Clock,
  LineChart,
  MapPin,
  Mail,
  MessageSquare,
  Download,
  MoreHorizontal,
  X
} from 'lucide-react';
import { collection, query, where, getDocs, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useLpo } from '../../context/LpoContext';

const Dashboard: React.FC = () => {
  const { lpo } = useLpo();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'upcoming' | 'in-progress' | 'history'>('upcoming');
  const [serviceFilter, setServiceFilter] = useState('all');

  useEffect(() => {
    if (lpo) {
      const fetchJobs = async () => {
        try {
          const q = query(
            collection(db, 'jobs'), 
            where('lpo_id', '==', lpo.id),
            orderBy('createdAt', 'desc')
          );
          const snapshot = await getDocs(q);
          setJobs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
          console.error("Error fetching jobs:", error);
          // Fallback if index isn't ready
          const q = query(collection(db, 'jobs'), where('lpo_id', '==', lpo.id));
          const snapshot = await getDocs(q);
          setJobs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } finally {
          setLoading(false);
        }
      };
      fetchJobs();
    }
  }, [lpo]);

  const handleSendMessage = (job: any, type: 'sms' | 'email') => {
    // NetSuite API integration point
    // TODO: In the future, this will hit a NetSuite endpoint to trigger the message
    const contact = job.customer.phone; 
    
    if (type === 'sms') {
      window.location.href = `sms:${contact}?body=Hi, update regarding job #${job.id.slice(0,6)} for ${job.customer.company}`;
    } else {
      window.location.href = `mailto:operator@mailplus.com.au?subject=Job Update #${job.id.slice(0,6)}&body=Follow up on job for ${job.customer.company}`;
    }
    console.log(`Triggering NetSuite-ready ${type} for job ${job.id}`);
  };

  const exportJobsCSV = () => {
    const headers = ['Job ID', 'Customer', 'Address', 'Suburb', 'Service', 'Date', 'Billing', 'Status'];
    const rows = filteredJobs.map(j => [
      j.id,
      j.customer.company,
      j.customer.address,
      j.customer.suburb,
      j.service,
      j.date,
      j.billing,
      j.status
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `jobs_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  const today = new Date().toISOString().split('T')[0];

  const filteredJobs = jobs.filter(j => {
    const matchesSearch = j.customer.company.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         j.customer.address.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesService = serviceFilter === 'all' || j.service === serviceFilter;
    
    // Tab Filtering
    let matchesTab = false;
    if (activeTab === 'in-progress') matchesTab = j.date === today;
    if (activeTab === 'upcoming') matchesTab = j.date > today;
    if (activeTab === 'history') matchesTab = j.date < today;

    // Date selection filter
    const matchesDate = !dateFilter || j.date === dateFilter;

    return matchesSearch && matchesService && matchesTab && matchesDate;
  });

  // Group jobs by date for the timeline
  const groupedJobs = filteredJobs.reduce((acc: any[], job) => {
    const date = job.date;
    const existingGroup = acc.find(g => g.date === date);
    if (existingGroup) {
      existingGroup.jobs.push(job);
    } else {
      acc.push({ date, jobs: [job] });
    }
    return acc;
  }, []).sort((a, b) => {
    return activeTab === 'history' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date);
  });

  const handleRebook = (job: any) => {
    localStorage.setItem('rebook_draft', JSON.stringify(job));
    window.location.href = '/new-job?rebook=true';
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to cancel this job?')) {
      await deleteDoc(doc(db, 'jobs', id));
      setJobs(jobs.filter(j => j.id !== id));
    }
  };

  const getServiceIcon = (type: string) => {
    if (type === 'round-trip') return <ArrowRightLeft size={16} />;
    if (type === 'site-to-lpo') return <ArrowRight size={16} />;
    return <ArrowLeft size={16} />;
  };

  return (
    <div className="job-manager-premium">
      {/* Mesh Background */}
      <div className="mesh-bg">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
      </div>

      <div className="content-container">
        <header className="page-header">
           <div className="header-left">
              <div className="title-area">
                <Layers className="header-icon" />
                <div>
                  <h1>Job Manager</h1>
                  <p>Centralized control for all your scheduled logistics tasks.</p>
                </div>
              </div>
           </div>
           <div className="header-right">
              <button onClick={() => window.location.href = '/new-job'} className="btn-premium-action">
                <Plus size={20} />
                <span>BOOK NEW ADHOC JOB</span>
              </button>
           </div>
        </header>

        <div className="dashboard-grid">
           {/* Stats Section */}
           <div className="stats-row">
              {[
                { label: 'Active Jobs', value: jobs.length, icon: Calendar, color: '#004141' },
                { label: 'Pending Pickups', value: jobs.filter(j => j.status === 'scheduled').length, icon: Clock, color: '#2ecc71' },
                { label: 'Total Volume', value: `$${jobs.length * 10}`, icon: LineChart, color: '#f39c12' }
              ].map((stat, i) => (
                <div key={i} className="stat-card glass">
                   <div className="stat-icon" style={{ background: `${stat.color}15`, color: stat.color }}>
                      <stat.icon size={20} />
                   </div>
                   <div className="stat-data">
                      <span className="stat-label">{stat.label}</span>
                      <span className="stat-value">{stat.value}</span>
                   </div>
                </div>
              ))}
           </div>

            {/* Controls Row */}
            <div className="controls-row">
              <div className="tabs-glass">
                {[
                  { id: 'upcoming', label: 'Upcoming', icon: Calendar },
                  { id: 'in-progress', label: 'Active Today', icon: Clock },
                  { id: 'history', label: 'History', icon: RotateCcw }
                ].map(tab => (
                  <button 
                    key={tab.id}
                    className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab.id as any)}
                  >
                    <tab.icon size={16} />
                    <span>{tab.label}</span>
                    <span className="count-badge">
                      {jobs.filter(j => {
                        if (tab.id === 'in-progress') return j.date === today;
                        if (tab.id === 'upcoming') return j.date > today;
                        return j.date < today;
                      }).length}
                    </span>
                  </button>
                ))}
              </div>

              <div className="action-pill-group">
                <button className="btn-secondary-glass" onClick={exportJobsCSV}>
                  <Download size={18} /> EXPORT
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="glass-card filter-bar">
              <div className="search-pill">
                <Search size={18} />
                <input 
                  type="text" 
                  placeholder="Search company or address..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
               <div className="filter-actions">
                  <div className="date-picker-glass">
                     <Calendar size={16} />
                     <input 
                       type="date" 
                       value={dateFilter}
                       onChange={(e) => setDateFilter(e.target.value)}
                     />
                     {dateFilter && (
                       <button className="clear-date" onClick={() => setDateFilter('')}>
                          <X size={14} />
                       </button>
                     )}
                  </div>
                  <select 
                    className="select-glass"
                    value={serviceFilter}
                    onChange={(e) => setServiceFilter(e.target.value)}
                  >
                    <option value="all">All Services</option>
                    <option value="site-to-lpo">Site ➔ LPO</option>
                    <option value="lpo-to-site">LPO ➔ Site</option>
                    <option value="round-trip">Round Trip</option>
                  </select>
                  <button className="btn-secondary-glass" onClick={() => window.location.reload()}><RefreshCw size={18} /></button>
               </div>
            </div>

            {/* Logistics Timeline */}
            <div className="timeline-container">
               {loading ? (
                 <div className="loading-state">
                   <RefreshCw className="spinner" />
                   <p>Syncing Manifest...</p>
                 </div>
               ) : groupedJobs.length === 0 ? (
                 <div className="glass-card empty-state">
                   <div className="empty-icon"><Layers size={48} /></div>
                   <h3>No Active Jobs Found</h3>
                   <p>Your manifest is currently empty. Start by booking a new job.</p>
                   <button onClick={() => window.location.href = '/new-job'} className="btn-primary-glass">
                     BOOK YOUR FIRST JOB
                   </button>
                 </div>
               ) : (
                 <div className="timeline-manifest">
                   <div className="timeline-rail"></div>
                   
                   {groupedJobs.map((group) => (
                     <div key={group.date} className="timeline-group">
                        <div className="date-separator">
                           <div className="separator-line"></div>
                           <div className="date-badge glass">
                              <Calendar size={14} />
                              <span>{new Date(group.date).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'short' })}</span>
                           </div>
                           <div className="separator-line"></div>
                        </div>

                        {group.jobs.map((job: any) => (
                          <div key={job.id} className="timeline-item">
                             <div className="timeline-node">
                                <div className={`node-inner pill-${job.status}`}>
                                   {getServiceIcon(job.service)}
                                </div>
                             </div>

                             <div className="timeline-content-card glass-card">
                                <div className="card-header">
                                   <div className="customer-block">
                                      <h3 className="company-name">{job.customer.company}</h3>
                                      <div className="location-info">
                                         <MapPin size={12} />
                                         <span>{job.customer.suburb}, {job.customer.state}</span>
                                      </div>
                                   </div>
                                   <div className={`status-tag status-${job.status}`}>
                                      {job.status}
                                   </div>
                                </div>

                                <div className="card-meta">
                                   <div className="meta-pill">
                                      <Clock size={12} />
                                      <span>{job.service.replace(/-/g, ' ')}</span>
                                   </div>
                                   <div className="meta-pill">
                                      <RotateCcw size={12} />
                                      <span>{job.billing}</span>
                                   </div>
                                   <div className="job-ref">REF: {job.id.slice(0, 6)}</div>
                                </div>

                                <div className="card-actions">
                                   <div className="messaging-group">
                                      <button className="mini-action sms" onClick={() => handleSendMessage(job, 'sms')}>
                                         <MessageSquare size={16} />
                                         <span>SMS</span>
                                      </button>
                                      <button className="mini-action email" onClick={() => handleSendMessage(job, 'email')}>
                                         <Mail size={16} />
                                         <span>EMAIL</span>
                                      </button>
                                   </div>
                                   
                                   <div className="overflow-menu">
                                      <div className="menu-trigger">
                                         <MoreHorizontal size={18} />
                                         <div className="menu-dropdown glass">
                                            <button onClick={() => handleRebook(job)}><RotateCcw size={14} /> Rebook</button>
                                            <button className="cancel" onClick={() => handleDelete(job.id)}><Trash2 size={14} /> Cancel</button>
                                         </div>
                                      </div>
                                   </div>
                                </div>
                             </div>
                          </div>
                        ))}
                     </div>
                   ))}
                 </div>
               )}
            </div>
        </div>
      </div>

      <style>{`
        .job-manager-premium {
          position: relative;
          min-height: 100vh;
          background: #f0f7f4;
          overflow-x: hidden;
        }

        .mesh-bg {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          z-index: 0; filter: blur(100px); opacity: 0.5;
        }
        .blob { position: absolute; border-radius: 50%; width: 600px; height: 600px; background: var(--mailplus-light-green); animation: blobMove 15s infinite alternate; }
        .blob-1 { top: -100px; right: -100px; }
        .blob-2 { bottom: -100px; left: -100px; background: #c3e2d3; animation-delay: -5s; }

        @keyframes blobMove {
          0% { transform: translate(0, 0) scale(1); }
          100% { transform: translate(100px, 50px) scale(1.1); }
        }

        .content-container { position: relative; z-index: 1; max-width: 1200px; margin: 0 auto; padding: 40px 24px 100px; }

        .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
        .title-area { display: flex; gap: 20px; align-items: center; }
        .header-icon { width: 44px; height: 44px; color: var(--mailplus-teal); }
        .page-header h1 { font-size: 2.2rem; font-weight: 900; color: var(--mailplus-teal); margin: 0; letter-spacing: -1px; }
        .page-header p { margin: 4px 0 0; color: #5b7971; font-size: 1rem; font-weight: 500; }

        .btn-premium-action {
          background: var(--mailplus-teal);
          color: white;
          border: none;
          padding: 14px 28px;
          border-radius: 18px;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          box-shadow: 0 10px 25px rgba(0, 65, 65, 0.2);
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .btn-premium-action:hover { transform: translateY(-4px); box-shadow: 0 15px 35px rgba(0, 65, 65, 0.25); }

        .stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 32px; }
        .stat-card {
          padding: 24px;
          border-radius: 24px;
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .stat-icon { width: 50px; height: 50px; border-radius: 14px; display: flex; align-items: center; justify-content: center; }
        .stat-data { display: flex; flex-direction: column; }
        .stat-label { font-size: 0.75rem; font-weight: 800; color: #8fa6a0; text-transform: uppercase; letter-spacing: 1px; }
        .stat-value { font-size: 1.6rem; font-weight: 900; color: var(--mailplus-teal); }

        .filter-bar {
          display: flex;
          justify-content: space-between;
          padding: 12px;
          margin-bottom: 24px;
          border-radius: 20px;
        }
        .search-pill {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(255, 255, 255, 0.8);
          padding: 0 20px;
          border-radius: 14px;
          max-width: 400px;
        }
        .search-pill input { border: none; background: transparent; padding: 14px 0; width: 100%; font-weight: 500; font-size: 0.95rem; }
        .filter-actions { display: flex; gap: 8px; }

        .btn-secondary-glass {
          background: rgba(255, 255, 255, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.5);
          color: var(--mailplus-teal);
          padding: 0 16px;
          border-radius: 14px;
          font-weight: 700;
          cursor: pointer;
          display: flex; align-items: center; gap: 8px;
        }
        
        .timeline-container { position: relative; padding-top: 20px; }
        .timeline-manifest { position: relative; padding-left: 60px; }
        .timeline-rail {
          position: absolute; left: 24px; top: 0; bottom: 0; width: 4px;
          background: rgba(0, 65, 65, 0.05); border-radius: 4px;
        }
        
        .date-separator {
          display: flex; align-items: center; gap: 20px; margin: 40px 0 24px -60px;
        }
        .separator-line { flex: 1; height: 1px; background: rgba(0, 65, 65, 0.1); }
        .date-badge {
          padding: 8px 24px; border-radius: 50px; background: white !important;
          display: flex; align-items: center; gap: 10px; font-weight: 800;
          color: var(--mailplus-teal); font-size: 0.85rem; box-shadow: 0 4px 15px rgba(0,0,0,0.05);
          text-transform: uppercase; letter-spacing: 1px;
        }

        .timeline-item { position: relative; margin-bottom: 24px; display: flex; align-items: center; }
        .timeline-node {
          position: absolute; left: -60px; width: 44px; height: 44px;
          display: flex; align-items: center; justify-content: center; z-index: 2;
        }
        .node-inner {
          width: 44px; height: 44px; border-radius: 14px; display: flex; align-items: center; justify-content: center;
          background: white; border: 3px solid #f0f7f4; color: var(--mailplus-teal);
          box-shadow: 0 8px 20px rgba(0,65,65,0.08); transition: all 0.3s;
        }
        .node-inner.pill-scheduled { border-color: #2ecc71; color: #2ecc71; }

        .timeline-content-card {
          flex: 1; padding: 20px 24px; border-radius: 24px; background: rgba(255,255,255,0.6);
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          border: 1px solid rgba(255,255,255,0.4);
        }
        .timeline-content-card:hover {
          transform: translateX(10px); background: rgba(255,255,255,0.9);
          box-shadow: 0 15px 40px rgba(0,65,65,0.08);
        }

        .card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
        .company-name { font-size: 1.1rem; font-weight: 900; color: var(--mailplus-teal); margin: 0; }
        .location-info { display: flex; align-items: center; gap: 6px; color: #8fa6a0; font-size: 0.75rem; font-weight: 600; margin-top: 4px; }
        
        .status-tag {
          padding: 4px 10px; border-radius: 8px; font-size: 0.6rem; font-weight: 800;
          text-transform: uppercase; background: rgba(0, 65, 65, 0.05); color: #5b7971;
        }
        .status-tag.status-scheduled { background: #e2f9ec; color: #2ecc71; }

        .card-meta { display: flex; gap: 16px; align-items: center; margin-bottom: 16px; }
        .meta-pill { display: flex; align-items: center; gap: 6px; font-size: 0.75rem; font-weight: 700; color: #8fa6a0; text-transform: capitalize; }
        .job-ref { margin-left: auto; font-family: monospace; font-size: 0.7rem; color: #c0d1cc; font-weight: 700; }

        .card-actions {
          display: flex; justify-content: space-between; align-items: center;
          padding-top: 16px; border-top: 1px solid rgba(0,0,0,0.03);
        }
        .messaging-group { display: flex; gap: 8px; }
        .mini-action {
          padding: 8px 14px; border-radius: 10px; border: none; cursor: pointer;
          display: flex; align-items: center; gap: 8px; font-weight: 800; font-size: 0.7rem;
          transition: all 0.2s; background: white; border: 1px solid rgba(0,0,0,0.05);
        }
        .mini-action.sms { color: #2ecc71; }
        .mini-action.email { color: #3498db; }
        .mini-action:hover { background: var(--mailplus-teal); color: white; transform: translateY(-2px); }

        .overflow-menu { position: relative; }
        .menu-trigger { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 10px; color: #8fa6a0; cursor: pointer; }
        .menu-trigger:hover { background: rgba(0,0,0,0.05); color: var(--mailplus-teal); }
        .menu-dropdown {
          position: absolute; bottom: 100%; right: 0; margin-bottom: 8px;
          min-width: 160px; border-radius: 16px; padding: 6px; z-index: 10;
          display: none; flex-direction: column; gap: 2px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.1); border: 1px solid rgba(255,255,255,0.5);
        }
        .menu-trigger:hover .menu-dropdown { display: flex; }
        .menu-dropdown button {
          padding: 10px 14px; border-radius: 10px; border: none; background: transparent;
          display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 0.8rem;
          color: #5b7971; cursor: pointer; text-align: left;
        }
        .menu-dropdown button:hover { background: rgba(0, 65, 65, 0.05); color: var(--mailplus-teal); }
        .menu-dropdown button.cancel:hover { background: #fff5f5; color: #ff4757; }

        @media (max-width: 700px) {
          .timeline-manifest { padding-left: 50px; }
          .timeline-rail { left: 18px; }
          .timeline-node { left: -54px; }
          .node-inner { width: 36px; height: 36px; border-radius: 10px; }
          .company-name { font-size: 1rem; }
          .date-badge { font-size: 0.7rem; padding: 6px 16px; }
          .card-meta { flex-wrap: wrap; gap: 10px; }
          .job-ref { width: 100%; margin: 0; }
        }

        .loading-state { padding: 100px; text-align: center; color: #8fa6a0; font-weight: 600; }
        .spinner { animation: spin 1s linear infinite; margin-bottom: 16px; width: 32px; height: 32px; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        .glass-card { background: rgba(255, 255, 255, 0.6); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.4); padding: 32px; }

        .controls-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; gap: 20px; }
        .tabs-glass { 
          display: flex; gap: 4px; background: rgba(0, 65, 65, 0.05); padding: 5px; border-radius: 16px; 
          border: 1px solid rgba(255,255,255,0.4);
        }
        .tab-btn {
          padding: 8px 16px; border-radius: 12px; display: flex; align-items: center; gap: 8px;
          color: #5b7971; font-weight: 700; font-size: 0.85rem; transition: all 0.2s;
        }
        .tab-btn.active { background: white; color: var(--mailplus-teal); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .count-badge {
          background: rgba(0, 65, 65, 0.1); color: var(--mailplus-teal); 
          font-size: 0.65rem; padding: 2px 6px; border-radius: 6px;
        }

        .select-glass:focus { border-color: var(--mailplus-teal); }

        .date-picker-glass {
          display: flex; align-items: center; gap: 8px; background: rgba(255, 255, 255, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.5); padding: 8px 14px; border-radius: 14px;
          color: var(--mailplus-teal); font-weight: 600;
        }
        .date-picker-glass input {
          border: none; background: transparent; color: inherit; font-family: inherit;
          font-weight: 700; font-size: 0.85rem; outline: none;
        }
        .clear-date {
          background: rgba(0, 0, 0, 0.05); border: none; width: 22px; height: 22px;
          border-radius: 50%; display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: #ff4757; transition: all 0.2s;
        }
        .clear-date:hover { background: #ff4757; color: white; }

        @media (max-width: 900px) {
          .cards-wrapper { grid-template-columns: 1fr; }
          .stats-row { grid-template-columns: 1fr; }
          .controls-row { flex-direction: column; align-items: stretch; }
          .page-header h1 { font-size: 1.8rem; }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
