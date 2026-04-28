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
  MapPin,
  Mail,
  MessageSquare,
  Download,
  X,
  XCircle,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  CheckCircle2
} from 'lucide-react';
import LoadingScreen from '../../components/LoadingScreen';
import { collection, query, where, getDocs, deleteDoc, doc, updateDoc, orderBy } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useLpo } from '../../context/LpoContext';
import { getDayName, formatDateForInput, parseLocalDate } from '../../utils/scheduling';

const Dashboard: React.FC = () => {
  const { lpo } = useLpo();
  const [jobs, setJobs] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'upcoming' | 'in-progress' | 'history' | 'declined'>('in-progress');
  const [serviceFilter, setServiceFilter] = useState('all');
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
          // Fetch Jobs
          const jobsQ = query(
            collection(db, 'jobs'), 
            where('lpo_id', '==', lpo.id),
            orderBy('createdAt', 'desc')
          );
          const jobsSnapshot = await getDocs(jobsQ);
          setJobs(jobsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

          // Fetch Requests (Both pending and awaiting-activation)
          const reqQ = query(
            collection(db, 'requests'),
            where('lpo_id', '==', lpo.id),
            orderBy('createdAt', 'desc')
          );
          const reqSnapshot = await getDocs(reqQ);
          const allReqs = reqSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setRequests(allReqs);

        } catch (error) {
          console.error("Error fetching data:", error);
          // Fallback if index isn't ready
          const jobsQ = query(collection(db, 'jobs'), where('lpo_id', '==', lpo.id));
          const jobsSnapshot = await getDocs(jobsQ);
          setJobs(jobsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          
          const reqQ = query(collection(db, 'requests'), where('lpo_id', '==', lpo.id));
          const reqSnapshot = await getDocs(reqQ);
          setRequests(reqSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } finally {
          setLoading(false);
        }
      };
      fetchData();
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

  const today = formatDateForInput(new Date());

  // Define source based on tab
  const source = (activeTab === 'pending' || activeTab === 'declined') 
    ? requests 
    : (activeTab === 'history' ? [...jobs, ...requests] : jobs);

  const filteredJobs = source.filter(j => {
    const matchesSearch = j.customer.company.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         j.customer.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         j.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesService = serviceFilter === 'all' || j.service === serviceFilter;
    
    const todayDayName = getDayName(new Date());
    
    // Tab Filtering
    let matchesTab = false;
    const isOneOff = j.jobType === 'one-off';
    const isScheduled = j.jobType === 'scheduled' && j.recurrenceStatus !== 'stopped';

    if (activeTab === 'pending') {
      // Only show pending requests that are for today or future
      matchesTab = j.status === 'pending' && (!isOneOff || j.date >= today); 
    } else if (activeTab === 'in-progress') {
      const matchesOneOff = isOneOff && j.date === today;
      const matchesRecurring = isScheduled && j.frequency.includes(todayDayName) && today >= j.date && !(j.skippedDates || []).includes(today);
      matchesTab = matchesOneOff || matchesRecurring;
    } else if (activeTab === 'upcoming') {
      const matchesOneOff = isOneOff && j.date > today;
      const matchesRecurring = isScheduled && j.date > today && !(j.skippedDates || []).includes(j.date);
      matchesTab = matchesOneOff || matchesRecurring;
    } else if (activeTab === 'history') {
      // Show both completed jobs AND one-off requests that were never accepted
      matchesTab = isOneOff && j.date < today;
    } else if (activeTab === 'declined') {
      matchesTab = j.status === 'rejected';
    }

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
    link.setAttribute("download", `jobs_export_${formatDateForInput(new Date())}.csv`);
    document.body.appendChild(link);
    link.click();
  };

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

  const handleDeleteRequest = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this job request?')) {
      await deleteDoc(doc(db, 'requests', id));
      setRequests(requests.filter(r => r.id !== id));
    }
  };

  const handleUpdateStopStatus = async (jobId: string, stopIndex: number, newStatus: string) => {
    const job = (activeTab === 'pending' ? requests : jobs).find(j => j.id === jobId);
    if (!job) return;

    const updatedStops = [...(job.stops || [])];
    updatedStops[stopIndex] = { ...updatedStops[stopIndex], status: newStatus };

    // Calculate overall job status
    const allCompleted = updatedStops.every(s => s.status === 'completed');
    const anyCompleted = updatedStops.some(s => s.status === 'completed');
    
    let newJobStatus = job.status;
    if (allCompleted) {
      newJobStatus = 'completed';
    } else if (anyCompleted) {
      newJobStatus = 'in-progress';
    }

    try {
      const collectionName = (activeTab === 'pending') ? 'requests' : 'jobs';
      await updateDoc(doc(db, collectionName, jobId), {
        stops: updatedStops,
        status: newJobStatus,
        updatedAt: new Date()
      });
      
      if (collectionName === 'requests') {
        setRequests(requests.map(r => r.id === jobId ? { ...r, stops: updatedStops, status: newJobStatus } : r));
      } else {
        setJobs(jobs.map(j => j.id === jobId ? { ...j, stops: updatedStops, status: newJobStatus } : j));
      }
    } catch (err) {
      console.error("Error updating stop status:", err);
      alert("Failed to update status.");
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

  const getTabCount = (tabId: string) => {
    if (tabId === 'pending') return requests.filter(r => r.status === 'pending').length;
    if (tabId === 'declined') return requests.filter(r => r.status === 'rejected').length;
    return jobs.filter(j => {
      const todayDayName = getDayName(new Date());
      if (tabId === 'in-progress') {
        return (j.jobType === 'one-off' && j.date === today) || 
               (j.jobType === 'scheduled' && j.frequency?.includes(todayDayName) && today >= j.date && !(j.skippedDates || []).includes(today));
      }
      if (tabId === 'upcoming') return j.date > today;
      return j.date < today;
    }).length;
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
                  <p>Centralized control for all your logistics tasks.</p>
                </div>
              </div>
           </div>
           <div className="header-right">
              <button onClick={() => window.location.href = '/new-job'} className="btn-premium-action">
                <Plus size={20} />
                <span>BOOK NEW JOB</span>
              </button>
           </div>
        </header>

        <div className="dashboard-grid">
           {/* Stats Section */}
           <div className="stats-row">
              {[
                { label: 'Active Jobs', value: jobs.length, icon: Calendar, color: 'var(--ink)' },
                { label: 'Pending Requests', value: requests.filter(r => r.status === 'pending').length, icon: MessageSquare, color: 'var(--gold)' },
                { label: 'Completed Jobs', value: jobs.filter(j => j.date < today).length, icon: CheckCircle2, color: 'var(--ink)' }
              ].map((stat, i) => (
                <div key={i} className="stat-card glass">
                   <div className="stat-icon" style={{ background: `var(--cream-warm)`, color: stat.color }}>
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
              {/* Desktop Tabs */}
              <div className="tabs-glass desktop-tabs">
                {[
                  { id: 'pending', label: 'Pending Requests', icon: MessageSquare },
                  { id: 'in-progress', label: 'Active Today', icon: Clock },
                  { id: 'upcoming', label: 'Upcoming', icon: Calendar },
                  { id: 'history', label: 'History', icon: RotateCcw },
                  { id: 'declined', label: 'Declined', icon: XCircle }
                ].map(tab => (
                  <button 
                    key={tab.id}
                    className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab.id as any)}
                  >
                    <tab.icon size={16} />
                    <span>{tab.label}</span>
                    <span className="count-badge">
                      {getTabCount(tab.id)}
                    </span>
                  </button>
                ))}
              </div>

              {/* Mobile Tabs Dropdown */}
              <div className="mobile-tabs-dropdown">
                <select 
                  value={activeTab} 
                  onChange={(e) => setActiveTab(e.target.value as any)}
                  className="mobile-tab-select"
                >
                  {[
                    { id: 'pending', label: 'Pending Requests' },
                    { id: 'in-progress', label: 'Active Today' },
                    { id: 'upcoming', label: 'Upcoming' },
                    { id: 'history', label: 'History' },
                    { id: 'declined', label: 'Declined' }
                  ].map(tab => (
                    <option key={tab.id} value={tab.id}>
                      {tab.label} ({getTabCount(tab.id)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="action-pill-group">
                <button className="btn-secondary-glass icon-only" onClick={exportJobsCSV} title="Export Jobs">
                  <Download size={18} />
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
                 <LoadingScreen fullScreen={false} message="Syncing Manifest" />
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
                              <span>{parseLocalDate(group.date).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'short' })}</span>
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
                                 <div className="card-header" onClick={() => toggleExpand(job.id)} style={{ cursor: 'pointer' }}>
                                    <div className="customer-block">
                                       <h3 className="company-name">{job.customer.company}</h3>
                                       <div className="location-info">
                                          <MapPin size={12} />
                                          <span>{job.customer.suburb}, {job.customer.state}</span>
                                       </div>
                                    </div>
                                    <div className="header-meta-group">
                                      <div className={`status-tag status-${
                                        (activeTab === 'history' && job.date < today && job.status === 'pending') ? 'not-accepted' :
                                        (activeTab === 'history' && job.date < today && (job.status === 'accepted' || job.status === 'scheduled')) ? 'unperformed' :
                                        job.status
                                      }`}>
                                         {activeTab === 'history' && job.date < today && job.status === 'pending' ? 'Not Accepted' :
                                          activeTab === 'history' && job.date < today && (job.status === 'accepted' || job.status === 'scheduled') ? 'Unperformed' :
                                          job.status}
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
                                          <div className="stop-action-group">
                                            <div className={`stop-status-pill ${stop.status}`}>{stop.status}</div>
                                            {stop.status !== 'completed' && (activeTab !== 'pending') && (
                                              <button 
                                                className="btn-complete-stop"
                                                onClick={() => handleUpdateStopStatus(job.id, sIdx, 'completed')}
                                                title="Mark Stop Completed"
                                              >
                                                <CheckCircle2 size={16} />
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                      {(!job.stops || job.stops.length === 0) && (
                                        <div className="legacy-hint">
                                          Consolidated view unavailable for legacy records.
                                        </div>
                                      )}
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
                                     {activeTab === 'pending' || activeTab === 'declined' ? (
                                      <div className="messaging-group">
                                        <button className="btn-primary-glass mini-chat" onClick={() => window.open(`/request/${job.id}`, '_blank')}>
                                           <MessageSquare size={16} />
                                           <span>CHAT & MANAGE</span>
                                        </button>
                                      </div>
                                    ) : (
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
                                    )}
                                    
                                    <div className="overflow-menu">
                                       <div className="menu-trigger">
                                          <MoreHorizontal size={18} />
                                          <div className="menu-dropdown glass">
                                             {activeTab === 'pending' || activeTab === 'declined' ? (
                                               <>
                                                 <button onClick={() => handleEditRequest(job)}><RotateCcw size={14} /> Edit Request</button>
                                                 <button className="cancel" onClick={() => handleDeleteRequest(job.id)}><Trash2 size={14} /> Delete Request</button>
                                               </>
                                             ) : (
                                               <>
                                                 <button onClick={() => handleRebook(job)}><RotateCcw size={14} /> Rebook</button>
                                                 {job.status !== 'accepted' && job.status !== 'rejected' && (
                                                   <button className="cancel" onClick={() => handleDelete(job.id)}><Trash2 size={14} /> Cancel</button>
                                                 )}
                                               </>
                                             )}
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

        .btn-premium-action {
          background: var(--ink);
          color: white;
          border: none;
          padding: 14px 28px;
          border-radius: 18px;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          box-shadow: 0 10px 25px rgba(26, 61, 51, 0.2);
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .btn-premium-action:hover { transform: translateY(-4px); box-shadow: 0 15px 35px rgba(26, 61, 51, 0.25); }

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
        .stat-label { font-family: var(--font-ui); font-size: 0.7rem; font-weight: 500; color: var(--ink-soft); opacity: 0.6; text-transform: uppercase; letter-spacing: 0.16em; }
        .stat-value { font-family: var(--font-headings); font-size: 1.6rem; font-weight: 500; color: var(--ink); }

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
        .btn-secondary-glass.icon-only {
          padding: 10px;
          justify-content: center;
        }
        
        .timeline-container { position: relative; padding-top: 20px; }
        .timeline-manifest { position: relative; padding-left: 60px; }
        .timeline-rail {
          position: absolute; left: 24px; top: 0; bottom: 0; width: 4px;
          background: var(--cream-warm); border-radius: 4px;
        }
        
        .date-separator {
          display: flex; align-items: center; gap: 20px; margin: 40px 0 24px -60px;
        }
        .separator-line { flex: 1; height: 1px; background: rgba(0, 65, 65, 0.1); }
        .date-badge {
          padding: 8px 24px; border-radius: 50px; background: white !important;
          display: flex; align-items: center; gap: 10px; font-family: var(--font-ui); font-weight: 500;
          color: var(--ink); font-size: 0.75rem; box-shadow: 0 4px 15px rgba(26, 61, 51, 0.05);
          text-transform: uppercase; letter-spacing: 0.16em;
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
        .status-tag.status-scheduled { background: var(--cream-warm); color: var(--ink); }
        .status-tag.status-not-accepted { background: var(--cream-warm); color: var(--gold); }
        .status-tag.status-unperformed { background: var(--cream-warm); color: var(--danger); }
        .status-tag.status-accepted { background: var(--cream-warm); color: var(--ink); }
        .status-tag.status-in-progress { background: var(--cream-warm); color: var(--ink); }
        .status-tag.status-completed { background: var(--ink); color: white; }
        .status-tag.status-rejected { background: var(--cream-warm); color: var(--danger); }

        .card-meta { display: flex; gap: 16px; align-items: center; margin-bottom: 16px; }
        .meta-pill { display: flex; align-items: center; gap: 6px; font-size: 0.75rem; font-weight: 700; color: var(--ink-soft); opacity: 0.6; text-transform: capitalize; }
        .job-ref { margin-left: auto; font-family: var(--font-ui); font-size: 0.65rem; color: var(--ink-soft); opacity: 0.4; font-weight: 500; }

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
        .mini-action.sms { color: var(--ink); }
        .mini-action.email { color: #3498db; }
        .mini-action:hover { background: var(--ink); color: white; transform: translateY(-2px); }

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

        @media (max-width: 700px) {
          .timeline-manifest { padding-left: 50px; }
          .timeline-rail { left: 18px; }
          .timeline-node { left: -54px; }
          .node-inner { width: 36px; height: 36px; border-radius: 10px; }
          .timeline-content-card { padding: 16px; border-radius: 16px; }
          .card-header { margin-bottom: 12px; }
          .company-name { font-size: 1rem; }
          .date-badge { font-size: 0.7rem; padding: 6px 16px; }
          .card-meta { flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
          .job-ref { width: 100%; margin: 0; }
          .page-header { flex-direction: column; gap: 16px; align-items: stretch; }
          .header-right .btn-premium-action { width: 100%; justify-content: center; }
          .card-actions { flex-direction: row; justify-content: space-between; align-items: center; padding-top: 12px; }
          .messaging-group { flex-direction: row; width: auto; gap: 8px; }
          .mini-action span, .mini-chat span { display: none; }
          .mini-action, .mini-chat { width: 36px; height: 36px; justify-content: center; padding: 0; }
          .overflow-menu { position: relative; top: auto; right: auto; }
        }


        .loading-state { padding: 100px; text-align: center; color: var(--ink-soft); opacity: 0.6; font-weight: 600; }

        .glass-card { background: rgba(255, 255, 255, 0.6); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.4); padding: 32px; }

        .controls-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; gap: 20px; }
        .tabs-glass { 
          display: flex; gap: 4px; background: rgba(26, 61, 51, 0.05); padding: 5px; border-radius: 16px; 
          border: 1px solid rgba(255,255,255,0.4);
          flex-wrap: wrap; justify-content: center;
        }
        .mobile-tabs-dropdown { display: none; width: 100%; }
        .mobile-tab-select { 
          width: 100%; padding: 16px; font-family: var(--font-headings); font-weight: 700; font-size: 1rem;
          color: var(--ink); background: white; border: 2px solid var(--cream-warm); border-radius: 16px; 
          appearance: none; background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23095c7b' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
          background-repeat: no-repeat; background-position: right 16px center; background-size: 16px;
        }
        .tab-btn {
          padding: 8px 16px; border-radius: 12px; display: flex; align-items: center; justify-content: center; gap: 8px;
          color: var(--ink-soft); font-weight: 700; font-size: 0.85rem; transition: all 0.2s;
          flex: 1 1 calc(33.333% - 8px); min-width: 130px; text-align: center;
        }
        .tab-btn.active { background: white; color: var(--ink); box-shadow: 0 4px 12px rgba(26, 61, 51, 0.05); }
        .count-badge {
          background: rgba(26, 61, 51, 0.1); color: var(--ink); 
          font-family: var(--font-ui); font-size: 0.6rem; padding: 2px 6px; border-radius: 6px;
          font-weight: 500;
        }

        .select-glass:focus { border-color: var(--ink); }

        .date-picker-glass {
          display: flex; align-items: center; gap: 8px; background: rgba(255, 255, 255, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.5); padding: 8px 14px; border-radius: 14px;
          color: var(--ink); font-weight: 600;
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
          .desktop-tabs { display: none !important; }
          .mobile-tabs-dropdown { display: block; }
          .cards-wrapper { grid-template-columns: 1fr; }
          .stats-row { grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 24px; }
          .stat-card { padding: 16px 8px; flex-direction: column; gap: 8px; text-align: center; border-radius: 16px; align-items: center; justify-content: center; }
          .stat-card::before { top: 0; left: 0; width: 100%; height: 4px; }
          .stat-icon { width: 36px; height: 36px; border-radius: 12px; }
          .stat-icon svg { width: 18px !important; height: 18px !important; }
          .stat-data { align-items: center; }
          .stat-label { font-size: 0.55rem; letter-spacing: 0; line-height: 1.2; margin-bottom: 4px; }
          .stat-value { font-size: 1.5rem; }
          .controls-row { flex-direction: column; align-items: stretch; }
          .page-header h1 { font-size: 1.8rem; }
          .filter-bar { flex-direction: column; gap: 16px; align-items: stretch; }
          .search-pill { max-width: 100%; }
          .filter-actions { flex-wrap: wrap; justify-content: flex-start; }
          .date-picker-glass, .select-glass { flex: 1; min-width: 120px; }
        }

        .header-meta-group { display: flex; align-items: center; gap: 12px; }
        .expand-icon { color: var(--ink-soft); opacity: 0.6; transition: all 0.2s; }
        .card-header:hover .expand-icon { transform: scale(1.1); opacity: 1; color: var(--ink); }

        .job-stops-container {
          margin-top: 20px; padding-top: 20px; border-top: 1px solid rgba(0,0,0,0.03);
          position: relative; padding-left: 24px;
        }
        .stops-visual-line {
          position: absolute; left: 7px; top: 30px; bottom: 30px; width: 2px;
          background: rgba(26, 61, 51, 0.08); border-radius: 2px;
        }
        .stop-entry {
          display: flex; gap: 16px; margin-bottom: 24px; position: relative;
        }
        .stop-entry:last-child { margin-bottom: 0; }
        .stop-node {
          width: 16px; height: 16px; border-radius: 50%; background: white;
          border: 3px solid var(--offwhite); z-index: 2; margin-top: 4px;
          box-shadow: 0 4px 10px rgba(26,61,51,0.1);
        }
        .stop-node.pickup { border-color: var(--ink); }
        .stop-node.delivery { border-color: var(--gold); }
        
        .stop-details { flex: 1; }
        .stop-type-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
        .type-pill { font-family: var(--font-ui); font-size: 0.55rem; font-weight: 500; color: var(--ink-soft); text-transform: uppercase; letter-spacing: 0.16em; }
        .stop-seq { font-family: var(--font-ui); font-size: 0.6rem; color: var(--ink-soft); opacity: 0.4; font-weight: 500; letter-spacing: 0.05em; }
        .stop-loc-name { font-weight: 800; color: var(--ink); font-size: 0.9rem; }
        .stop-addr { font-size: 0.75rem; color: var(--ink-soft); font-weight: 600; margin-top: 2px; }
        
        .stop-action-group {
          display: flex;
          align-items: center;
          gap: 12px;
          align-self: flex-start;
        }

        .stop-status-pill {
          font-size: 0.6rem;
          font-weight: 800;
          color: var(--ink-soft);
          opacity: 0.6;
          text-transform: uppercase;
          background: rgba(0,0,0,0.03);
          padding: 4px 8px;
          border-radius: 6px;
        }
        
        .stop-status-pill.completed {
          background: var(--cream-warm);
          color: var(--ink);
        }

        .btn-complete-stop {
          background: transparent;
          border: none;
          color: var(--ink);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          padding: 4px;
        }
        .btn-complete-stop:hover {
          transform: scale(1.2);
          color: var(--ink);
        }

        .legacy-hint { padding: 20px; text-align: center; color: var(--ink-soft); opacity: 0.6; font-size: 0.8rem; font-weight: 600; font-style: italic; }

        .fade-in { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }

        /* Modal Styles */
        .modal-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(26, 61, 51, 0.4); backdrop-filter: blur(8px);
          display: none; align-items: center; justify-content: center; z-index: 2000;
          padding: 24px;
        }
        .modal-overlay.active { display: flex; }
        .modal-content { width: 100%; max-width: 550px; padding: 32px; position: relative; }
        .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
        .header-title { display: flex; align-items: center; gap: 12px; color: var(--ink); }
        .header-title h2 { font-size: 1.25rem; font-weight: 800; margin: 0; }
        .close-btn { background: transparent; border: none; color: var(--ink-soft); opacity: 0.6; cursor: pointer; }

        .schedule-info-summary { background: var(--offwhite); padding: 20px; border-radius: 20px; margin-bottom: 32px; }
        .m-company { font-weight: 800; color: var(--ink); font-size: 1.1rem; margin-bottom: 4px; }
        .m-address { display: flex; align-items: center; gap: 8px; font-size: 0.8rem; color: var(--ink-soft); font-weight: 600; }

        .mgmt-section { margin-bottom: 32px; }
        .m-label { display: block; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: var(--ink-soft); opacity: 0.6; margin-bottom: 8px; letter-spacing: 0.5px; }
        .m-hint { font-size: 0.8rem; color: var(--ink-soft); margin-bottom: 16px; line-height: 1.4; }

        .m-frequency-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
        .m-freq-pill { padding: 12px; border-radius: 12px; border: 1px solid var(--cream-warm); background: white; font-weight: 700; color: var(--ink-soft); cursor: pointer; transition: all 0.2s; }
        .m-freq-pill.active { background: var(--ink); color: white; border-color: var(--ink); }

        .occurrences-list { display: flex; flex-direction: column; gap: 10px; }
        .occ-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: white; border: 1px solid var(--cream-warm); border-radius: 14px; }
        .occ-row.skipped { background: var(--cream-warm); border-color: var(--danger); opacity: 0.7; }
        .occ-date { display: flex; align-items: center; gap: 10px; font-size: 0.9rem; font-weight: 700; color: var(--ink); }
        .occ-date svg { color: var(--ink-soft); opacity: 0.6; }
        .skip-toggle { padding: 6px 14px; border-radius: 50px; font-size: 0.65rem; font-weight: 800; border: 1px solid var(--cream-warm); background: white; color: var(--ink-soft); cursor: pointer; }
        .skip-toggle.active { background: var(--danger); color: white; border-color: var(--danger); }

        .modal-danger-zone { border-top: 1px solid var(--cream-warm); padding-top: 24px; margin-top: 10px; }
        .btn-danger-outline { width: 100%; padding: 14px; border-radius: 14px; border: 1px solid var(--danger); color: var(--danger); background: transparent; font-weight: 800; display: flex; align-items: center; justify-content: center; gap: 10px; cursor: pointer; transition: all 0.2s; }
        .btn-danger-outline:hover { background: var(--cream-warm); }

        .manage-schedule { width: 100%; margin-bottom: 8px; border: 1px solid rgba(26, 61, 51, 0.1) !important; background: white !important; color: var(--ink) !important; }
        .manage-schedule:hover { background: var(--offwhite) !important; border-color: var(--ink) !important; }
      `}</style>
    </div>
  );
};

export default Dashboard;
