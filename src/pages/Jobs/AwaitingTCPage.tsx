import React, { useEffect, useState } from 'react';
import { 
  Search, 
  Trash2, 
  ArrowRightLeft,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Clock,
  MapPin,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  RotateCcw,
  CheckCircle2
} from 'lucide-react';
import LoadingScreen from '../../components/LoadingScreen';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useLpo } from '../../context/LpoContext';

const AwaitingTCPage: React.FC = () => {
  const { lpo } = useLpo();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedJobIds, setExpandedJobIds] = useState<Set<string>>(new Set());

  const toggleExpand = (jobId: string) => {
    const newExpanded = new Set(expandedJobIds);
    if (newExpanded.has(jobId)) {
      newExpanded.delete(jobId);
    } else {
      newExpanded.add(jobId);
    }
    setExpandedJobIds(newExpanded);
  };

  useEffect(() => {
    if (lpo) {
      const fetchData = async () => {
        setLoading(true);
        try {
          const reqQ = query(collection(db, 'requests'), where('lpo_id', '==', lpo.id));
          const reqSnapshot = await getDocs(reqQ);
          const allReqs = reqSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
          // Only show awaiting-activation
          setRequests(allReqs.filter((r: any) => r.status === 'awaiting-activation'));
        } catch (error) {
          console.error("Error fetching data:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [lpo]);

  const filteredRequests = requests.filter(j => {
    const matchesSearch = j.customer.company.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         j.customer.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         j.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const handleDeleteRequest = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this job request?')) {
      await deleteDoc(doc(db, 'requests', id));
      setRequests(requests.filter(r => r.id !== id));
    }
  };

  const handleEditRequest = (request: any) => {
    localStorage.setItem('edit_request_draft', JSON.stringify(request));
    window.location.href = `/new-job?edit=true&id=${request.id}`;
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
                <Clock className="header-icon" />
                <div>
                  <h1>Awaiting T&C</h1>
                  <p>Manage requests waiting for customer agreement.</p>
                </div>
              </div>
           </div>
        </header>

        <div className="dashboard-grid">
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
                  <button className="btn-secondary-glass" onClick={() => window.location.reload()}><RefreshCw size={18} /></button>
               </div>
            </div>

            {/* Logistics Timeline */}
            <div className="timeline-container">
               {loading ? (
                 <LoadingScreen fullScreen={false} message="Loading Requests" />
               ) : filteredRequests.length === 0 ? (
                 <div className="glass-card empty-state">
                   <div className="empty-icon"><CheckCircle2 size={48} /></div>
                   <h3>No Pending Approvals</h3>
                   <p>All customers have accepted their terms and conditions.</p>
                 </div>
               ) : (
                 <div className="timeline-manifest">
                   <div className="timeline-rail"></div>
                   
                   <div className="timeline-group">
                      {filteredRequests.map((job: any) => (
                        <div key={job.id} className="timeline-item">
                           <div className="timeline-node">
                              <div className={`node-inner pill-${job.status}`}>
                                 {getServiceIcon(job.service)}
                              </div>
                           </div>
                           <div className="timeline-content-card glass-card">
                               <div className="card-header" onClick={() => toggleExpand(job.id)} style={{ cursor: 'pointer' }}>
                                  <div className="customer-block">
                                     <h3 className="company-name">{job.customer.company}</h3>
                                     <div className="location-info">
                                        <MapPin size={12} />
                                        <span>{job.customer.suburb}, {job.customer.state}</span>
                                     </div>
                                  </div>
                                  <div className="header-meta-group">
                                    <div className="status-tag status-not-accepted">
                                       Awaiting T&C
                                    </div>
                                    <div className="expand-icon">
                                      {expandedJobIds.has(job.id) ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                    </div>
                                  </div>
                               </div>

                               {expandedJobIds.has(job.id) && (
                                 <div className="job-stops-container fade-in">
                                    <div className="stops-visual-line"></div>
                                    {(job.stops || []).map((stop: any, sIdx: number) => (
                                      <div key={sIdx} className="stop-entry">
                                        <div className={`stop-node ${stop.type}`}></div>
                                        <div className="stop-details">
                                          <div className="stop-type-header">
                                            <span className="type-pill">{stop.label || stop.type.toUpperCase()}</span>
                                            <span className="stop-seq">STOP {stop.sequence}</span>
                                          </div>
                                          <div className="stop-loc-name">{stop.locationName}</div>
                                          <div className="stop-addr">{stop.address}, {stop.suburb}</div>
                                        </div>
                                      </div>
                                    ))}
                                 </div>
                               )}

                              <div className="card-meta">
                                 <div className="meta-pill">
                                    <Clock size={12} />
                                    <span>{job.service.replace(/-/g, ' ')}</span>
                                 </div>
                                 <div className="meta-pill">
                                    <RotateCcw size={12} />
                                    <span>{job.billing}</span>
                                 </div>
                                  <div className="job-ref">REF: {job.id}</div>
                              </div>

                               <div className="card-actions">
                                  <div className="messaging-group">
                                    <button className="btn-primary-glass mini-chat" onClick={() => window.open(`/request/${job.id}`, '_blank')}>
                                       <MessageSquare size={16} />
                                       <span>CHAT & MANAGE</span>
                                    </button>
                                  </div>
                                  
                                  <div className="overflow-menu">
                                     <div className="menu-trigger">
                                        <MoreHorizontal size={18} />
                                        <div className="menu-dropdown glass">
                                           <button onClick={() => handleEditRequest(job)}><RotateCcw size={14} /> Edit Request</button>
                                           <button className="cancel" onClick={() => handleDeleteRequest(job.id)}><Trash2 size={14} /> Delete Request</button>
                                        </div>
                                     </div>
                                  </div>
                               </div>
                           </div>
                        </div>
                      ))}
                   </div>
                 </div>
               )}
            </div>
        </div>
      </div>

      <style>{`
        .job-manager-premium {
          position: relative;
          min-height: 100vh;
          background: var(--offwhite);
          overflow-x: hidden;
        }

        .mesh-bg {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          z-index: 0; filter: blur(100px); opacity: 0.5;
        }
        .blob { position: absolute; border-radius: 50%; width: 600px; height: 600px; background: var(--cream-warm); animation: blobMove 15s infinite alternate; }
        .blob-1 { top: -100px; right: -100px; }
        .blob-2 { bottom: -100px; left: -100px; background: var(--gold); opacity: 0.2; animation-delay: -5s; }

        @keyframes blobMove {
          0% { transform: translate(0, 0) scale(1); }
          100% { transform: translate(100px, 50px) scale(1.1); }
        }

        .content-container { position: relative; z-index: 1; max-width: 1200px; margin: 0 auto; padding: 40px 24px 100px; }

        .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
        .title-area { display: flex; gap: 20px; align-items: center; }
        .header-icon { width: 44px; height: 44px; color: var(--ink); }
        .page-header h1 { font-family: var(--font-headings); font-size: 2.2rem; font-weight: 400; color: var(--ink); margin: 0; letter-spacing: -0.025em; }
        .page-header p { margin: 4px 0 0; color: var(--ink-soft); font-size: 1rem; font-weight: 400; }

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
          color: var(--ink);
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
          background: var(--cream-warm); border-radius: 4px;
        }

        .timeline-item { position: relative; margin-bottom: 24px; display: flex; align-items: center; }
        .timeline-node {
          position: absolute; left: -60px; width: 44px; height: 44px;
          display: flex; align-items: center; justify-content: center; z-index: 2;
        }
        .node-inner {
          width: 44px; height: 44px; border-radius: 14px; display: flex; align-items: center; justify-content: center;
          background: white; border: 3px solid var(--offwhite); color: var(--ink);
          box-shadow: 0 8px 20px rgba(26, 61, 51, 0.08); transition: all 0.3s;
        }
        .node-inner.pill-scheduled { border-color: var(--ink); color: var(--ink); }

        .timeline-content-card {
          flex: 1; padding: 20px 24px; border-radius: 24px; background: rgba(255,255,255,0.6);
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          border: 1px solid rgba(255,255,255,0.4);
        }
        .timeline-content-card:hover {
          transform: translateX(10px); background: rgba(255,255,255,0.9);
          box-shadow: 0 15px 40px rgba(26, 61, 51, 0.08);
        }

        .card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
        .company-name { font-family: var(--font-headings); font-size: 1.1rem; font-weight: 500; color: var(--ink); margin: 0; }
        .location-info { display: flex; align-items: center; gap: 6px; color: var(--ink-soft); opacity: 0.6; font-size: 0.75rem; font-weight: 600; margin-top: 4px; }
        
        .status-tag {
          padding: 4px 10px; border-radius: 8px; font-family: var(--font-ui); font-size: 0.55rem; font-weight: 500;
          text-transform: uppercase; background: var(--cream-warm); color: var(--ink-soft); letter-spacing: 0.16em;
        }
        .status-tag.status-not-accepted { background: var(--cream-warm); color: var(--gold); }

        .card-meta { display: flex; gap: 16px; align-items: center; margin-bottom: 16px; }
        .meta-pill { display: flex; align-items: center; gap: 6px; font-size: 0.75rem; font-weight: 700; color: var(--ink-soft); opacity: 0.6; text-transform: capitalize; }
        .job-ref { margin-left: auto; font-family: var(--font-ui); font-size: 0.65rem; color: var(--ink-soft); opacity: 0.4; font-weight: 500; }

        .card-actions {
          display: flex; justify-content: space-between; align-items: center;
          padding-top: 16px; border-top: 1px solid rgba(0,0,0,0.03);
        }
        .messaging-group { display: flex; gap: 8px; }
        .btn-primary-glass {
          background: var(--ink);
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 12px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-size: 0.8rem;
        }

        .overflow-menu { position: relative; }
        .menu-trigger { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 10px; color: var(--ink-soft); cursor: pointer; }
        .menu-trigger:hover { background: rgba(26, 61, 51, 0.05); color: var(--ink); }
        .menu-dropdown {
          position: absolute; bottom: 100%; right: 0;
          min-width: 160px; border-radius: 16px; padding: 6px; z-index: 100;
          display: none; flex-direction: column; gap: 2px;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(15px);
          box-shadow: 0 10px 40px rgba(26, 61, 51, 0.15); 
          border: 1px solid rgba(26, 61, 51, 0.05);
          transform: translateY(-4px);
        }
        .menu-trigger:hover .menu-dropdown, .menu-dropdown:hover { display: flex; }
        .menu-dropdown button {
          padding: 10px 14px; border-radius: 10px; border: none; background: transparent;
          display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 0.8rem;
          color: var(--ink-soft); cursor: pointer; text-align: left;
        }
        .menu-dropdown button:hover { background: rgba(26, 61, 51, 0.05); color: var(--ink); }
        .menu-dropdown button.cancel:hover { background: #fff5f5; color: #ff4757; }

        .glass-card.empty-state { text-align: center; padding: 60px 20px; }
        .empty-icon { color: var(--ink-soft); opacity: 0.3; margin-bottom: 20px; }
        .empty-state h3 { font-family: var(--font-headings); font-size: 1.5rem; color: var(--ink); margin-bottom: 8px; }
        .empty-state p { color: var(--ink-soft); margin-bottom: 24px; }

        .job-stops-container {
          position: relative;
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px dashed rgba(26, 61, 51, 0.1);
          padding-left: 20px;
        }
        .stops-visual-line {
          position: absolute;
          left: 6px;
          top: 30px;
          bottom: 10px;
          width: 2px;
          background: rgba(26, 61, 51, 0.1);
        }
        .stop-entry {
          position: relative;
          display: flex;
          align-items: flex-start;
          margin-bottom: 20px;
        }
        .stop-entry:last-child { margin-bottom: 0; }
        .stop-node {
          position: absolute;
          left: -19px;
          top: 4px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: white;
          border: 2px solid var(--ink);
          z-index: 2;
        }
        .stop-details { flex: 1; }
        .stop-type-header { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
        .type-pill {
          background: var(--cream-warm);
          color: var(--ink);
          padding: 2px 8px;
          border-radius: 6px;
          font-size: 0.6rem;
          font-weight: 700;
          letter-spacing: 0.05em;
        }
        .stop-seq { font-size: 0.65rem; color: var(--ink-soft); font-weight: 600; opacity: 0.7; }
        .stop-loc-name { font-family: var(--font-headings); font-size: 0.95rem; font-weight: 600; color: var(--ink); }
        .stop-addr { font-size: 0.8rem; color: var(--ink-soft); }

        @media (max-width: 700px) {
          .timeline-manifest { padding-left: 50px; }
          .timeline-rail { left: 18px; }
          .timeline-node { left: -54px; }
          .node-inner { width: 36px; height: 36px; border-radius: 10px; }
          .timeline-content-card { padding: 16px; border-radius: 16px; }
          .card-header { margin-bottom: 12px; }
          .company-name { font-size: 1rem; }
          .card-meta { flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
          .job-ref { width: 100%; margin: 0; }
          .page-header { flex-direction: column; gap: 16px; align-items: stretch; }
          .card-actions { flex-direction: row; justify-content: space-between; align-items: center; padding-top: 12px; }
          .messaging-group { flex-direction: row; width: auto; gap: 8px; }
          .mini-chat span { display: none; }
          .mini-chat { width: 36px; height: 36px; justify-content: center; padding: 0; }
          .overflow-menu { position: relative; top: auto; right: auto; }
        }
      `}</style>
    </div>
  );
};

export default AwaitingTCPage;
