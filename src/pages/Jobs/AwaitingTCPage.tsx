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
  CheckCircle2,
  Calendar,
  Mail,
  Copy
} from 'lucide-react';
import LoadingScreen from '../../components/LoadingScreen';
import SupportEmailModal from '../../components/SupportEmailModal';
import { collection, query, where, getDocs, deleteDoc, doc, updateDoc, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { sortStops } from '../../utils/stops';

import { db } from '../../firebase/config';
import { useLpo } from '../../context/LpoContext';
import CustomSelect from '../../components/CustomSelect';

const AwaitingTCPage: React.FC = () => {
  const { lpo, isAdmin, userData, user, selectedLpoIds, setSelectedLpoIds, allLpos } = useLpo();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedJobIds, setExpandedJobIds] = useState<Set<string>>(new Set());
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [supportJobId, setSupportJobId] = useState('');
  const [supportMetadata, setSupportMetadata] = useState<any>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [acceptingTcId, setAcceptingTcId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isPrivilegedUser = isAdmin || userData?.role === 'admin' || userData?.role === 'superadmin' || userData?.uid === 'lwOQ8j5MSIdOiyR0VZ1zEvfpx7A3';

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
    const fetchData = async () => {
      setLoading(true);
      try {
        let reqBaseQ = collection(db, 'requests');
        let constraints: any[] = [];

        const isFilteredByLpo = !selectedLpoIds.includes('all') && selectedLpoIds.length > 0;
        if (isFilteredByLpo) {
          if (selectedLpoIds.length === 1) {
            constraints.push(where('lpo_id', '==', selectedLpoIds[0]));
          } else {
            constraints.push(where('lpo_id', 'in', selectedLpoIds.slice(0, 30)));
          }
        }

        const reqQ = query(reqBaseQ, ...constraints);
        const reqSnapshot = await getDocs(reqQ);
        const allReqs = reqSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as any));
        // Only show awaiting-activation
        setRequests(allReqs.filter((r: any) => r.status === 'awaiting-activation'));
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (lpo || isAdmin) {
      fetchData();
    }
  }, [lpo, isAdmin, selectedLpoIds]);

  const filteredRequests = requests.filter(j => {
    const matchesSearch = (j.customer?.company || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (j.customer?.address || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (j.id || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const handleDeleteRequest = async (id: string) => {
    if (!isPrivilegedUser) {
      alert("Only administrators and superadmins can delete job requests.");
      return;
    }

    const request = requests.find(r => r.id === id);
    const companyName = request?.customer?.company || "this";

    if (window.confirm(`Are you sure you want to delete the job request for "${companyName}"?\n\nThis action cannot be undone.`)) {
      setDeletingId(id);
      try {
        if (request) {
          const NETSUITE_API = "https://1048144.extforms.netsuite.com/app/site/hosting/scriptlet.nl?script=2533&deploy=1&compid=1048144&ns-at=AAEJ7tMQft1Dl2RVClm4B9TZr9MEKQ4mSl-fhRftfdOXMPsHlRI";
          
          const params = new URLSearchParams({
            job_id: id,
            request_id: id,
            customer_id: request.netsuiteCustomerId || request.customer?.netsuiteId || "",
            lpo_id: request.lpo_id || ""
          });

          console.log("Syncing T&C request deletion with NetSuite (2533)...", Object.fromEntries(params));
          
          try {
            const res = await fetch(`${NETSUITE_API}&${params.toString()}`);
            const data = await res.json();
            console.log("NetSuite T&C Sync Response:", data);
          } catch (netErr) {
            console.error("NetSuite T&C Sync Error:", netErr);
          }
        }

        // Clean up any stray child jobs or scheduled jobs
        try {
          const jobsQ = query(collection(db, 'jobs'), where('originalRequestId', '==', id));
          const jobsSnap = await getDocs(jobsQ);
          for (const jobDoc of jobsSnap.docs) {
            await deleteDoc(doc(db, 'jobs', jobDoc.id));
          }

          const schedQ = query(collection(db, 'scheduled_jobs'), where('originalRequestId', '==', id));
          const schedSnap = await getDocs(schedQ);
          for (const schedDoc of schedSnap.docs) {
            await deleteDoc(doc(db, 'scheduled_jobs', schedDoc.id));
          }
        } catch (cleanupErr) {
          console.warn("Child cleanup warning:", cleanupErr);
        }

        await deleteDoc(doc(db, 'requests', id));
        setRequests(prev => prev.filter(r => r.id !== id));
      } catch (error) {
        console.error("Error deleting request:", error);
        alert("Failed to delete request. Please try again.");
      } finally {
        setDeletingId(null);
      }
    }
  };

  const handleAcceptTcOnBehalf = async (job: any) => {
    if (!isPrivilegedUser) {
      alert("Only administrators and superadmins can accept Terms & Conditions on behalf of customers.");
      return;
    }

    const companyName = job.customer?.company || "the customer";
    const confirmed = window.confirm(
      `Accept Terms & Conditions on behalf of "${companyName}"?\n\nThis will mark the customer as Active and transition this request to Pending.`
    );
    if (!confirmed) return;

    setAcceptingTcId(job.id);
    try {
      const adminName = userData?.first_name 
        ? `${userData.first_name} ${userData.last_name || ''}`.trim() 
        : (user?.displayName || user?.email || 'Admin');
      const adminRole = userData?.role === 'superadmin' ? 'Super Admin' : 'Admin';
      const adminEmail = user?.email || userData?.email || '';

      const targetLpoId = job.lpo_id || lpo?.id;
      if (targetLpoId) {
        const custColl = collection(db, `lpo/${targetLpoId}/customers`);
        const custId = job.netsuiteCustomerId || job.customer?.netsuiteId;
        let custDocs: any[] = [];

        if (custId) {
          const q1 = query(custColl, where('companyId', 'in', [custId.toString(), Number(custId)]));
          const snap1 = await getDocs(q1);
          if (!snap1.empty) {
            custDocs = snap1.docs;
          } else {
            const q2 = query(custColl, where('customerInternalId', 'in', [custId.toString(), Number(custId)]));
            const snap2 = await getDocs(q2);
            if (!snap2.empty) custDocs = snap2.docs;
          }
        }

        if (custDocs.length === 0 && job.customer?.company) {
          const q3 = query(custColl, where('companyName', '==', job.customer.company));
          const snap3 = await getDocs(q3);
          if (!snap3.empty) {
            custDocs = snap3.docs;
          } else {
            const q4 = query(custColl, where('company_name', '==', job.customer.company));
            const snap4 = await getDocs(q4);
            if (!snap4.empty) custDocs = snap4.docs;
          }
        }

        if (custDocs.length === 0 && job.customer?.email) {
          const q5 = query(custColl, where('customerEmail', '==', job.customer.email));
          const snap5 = await getDocs(q5);
          if (!snap5.empty) {
            custDocs = snap5.docs;
          } else {
            const q6 = query(custColl, where('email', '==', job.customer.email));
            const snap6 = await getDocs(q6);
            if (!snap6.empty) custDocs = snap6.docs;
          }
        }

        for (const cDoc of custDocs) {
          await updateDoc(cDoc.ref, {
            status: 'Active',
            termsAccepted: true,
            tcAccepted: true,
            tcAcceptedOnBehalf: true,
            tcAcceptedBy: adminName,
            tcAcceptedByEmail: adminEmail,
            tcAcceptedByRole: adminRole,
            tcAcceptedAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
      }

      const sysMessage = {
        id: Date.now().toString(),
        sender: 'system',
        text: `Terms & Conditions accepted on behalf of ${companyName} by ${adminName} (${adminRole}). Request moved to Pending.`,
        timestamp: new Date().toISOString()
      };

      await updateDoc(doc(db, 'requests', job.id), {
        status: 'pending',
        activatedAt: serverTimestamp(),
        activationReason: `T&C accepted on behalf of customer by ${adminName} (${adminRole})`,
        tcAcceptedOnBehalf: true,
        tcAcceptedBy: adminName,
        tcAcceptedByEmail: adminEmail,
        tcAcceptedByRole: adminRole,
        tcAcceptedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        chat: arrayUnion(sysMessage)
      });

      setRequests(prev => prev.filter(r => r.id !== job.id));
      alert(`Success! Terms & Conditions accepted on behalf of "${companyName}". The request has been moved to Pending.`);
    } catch (error) {
      console.error("Error accepting T&C on behalf of customer:", error);
      alert("Failed to accept Terms & Conditions. Please try again.");
    } finally {
      setAcceptingTcId(null);
    }
  };

  const handleEditRequest = (request: any) => {
    localStorage.setItem('edit_request_draft', JSON.stringify(request));
    window.location.href = `/new-job?edit=true&id=${request.id}`;
  };

  const handleVerifyStatus = async (request: any) => {
    const targetLpoId = request.lpo_id || lpo?.id;
    if (!targetLpoId || !request.customer?.company) {
      alert("Missing customer or LPO details to verify status.");
      return;
    }
    
    setLoading(true);
    try {
      const custColl = collection(db, `lpo/${targetLpoId}/customers`);
      const custId = request.netsuiteCustomerId || request.customer?.netsuiteId;
      let snap;
      if (custId) {
        snap = await getDocs(query(custColl, where('companyId', 'in', [custId.toString(), Number(custId)])));
        if (snap.empty) {
          snap = await getDocs(query(custColl, where('customerInternalId', 'in', [custId.toString(), Number(custId)])));
        }
      }
      if (!snap || snap.empty) {
        snap = await getDocs(query(custColl, where('companyName', '==', request.customer.company)));
      }
      if (!snap || snap.empty) {
        snap = await getDocs(query(custColl, where('company_name', '==', request.customer.company)));
      }
      
      if (snap && !snap.empty) {
        const c = snap.docs[0].data();
        if (c.status === "Active") {
          await updateDoc(doc(db, 'requests', request.id), {
            status: 'pending',
            activatedAt: serverTimestamp(),
            activationReason: "Manual verification from Awaiting T&C page"
          });
          
          setRequests(prev => prev.filter(r => r.id !== request.id));
          alert(`Success! ${request.customer.company} is now Active. The request has been moved to Pending.`);
        } else {
          alert(`Status for ${request.customer.company} is still "${c.status || 'Pending'}".`);
        }
      } else {
        alert("Could not find customer profile to verify status.");
      }
    } catch (e) {
      console.error("Failed to verify status", e);
      alert("Error verifying status. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendSCF = async (job: any) => {
    const customerId = job.netsuiteCustomerId || job.customer?.netsuiteId;
    const lpoId = job.lpo_id;
    
    if (!customerId || !lpoId) {
      alert("Missing Customer ID or LPO ID.");
      return;
    }

    setResendingId(job.id);
    try {
      const API_URL = `https://1048144.extforms.netsuite.com/app/site/hosting/scriptlet.nl?script=2637&deploy=1&compid=1048144&ns-at=AAEJ7tMQrC0U5eU7eURqGp_fiWWSwngcoYtGs8zoTcbsZ8JJkNk&customer_id=${customerId}&lpo_id=${lpoId}`;
      const response = await fetch(API_URL);
      const result = await response.json();
      if (result.success) {
        alert("SCF Form resent successfully!");
      } else {
        alert("Failed to resend SCF: " + (result.message || "Unknown error"));
      }
    } catch (error) {
      console.error("Error resending SCF:", error);
      alert("An error occurred while resending the SCF Form.");
    } finally {
      setResendingId(null);
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
              {isAdmin && (
                <CustomSelect 
                  value={selectedLpoIds}
                  onChange={(val) => setSelectedLpoIds(val)}
                  options={[
                    { value: 'all', label: 'All LPOs', icon: <MapPin size={14} /> },
                    ...allLpos.map(l => ({ value: l.id, label: l.name || l.id, icon: <MapPin size={14} /> }))
                  ]}
                  className="lpo-select-custom"
                  multiple={true}
                />
              )}
              <div className="search-pill">
                <Search size={18} />
                <input 
                  type="text" 
                  placeholder="Search company, address or Job ID..." 
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
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <h3 className="company-name">{job.customer.company}</h3>
                                        {isAdmin && (
                                          <span className="lpo-badge-inline">
                                            {allLpos.find(l => l.id === job.lpo_id)?.name || 'Unknown LPO'}
                                          </span>
                                        )}
                                      </div>
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
                                     {sortStops(job.stops).map((stop: any, sIdx: number) => (
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
                                 <div className="meta-pill">
                                    <Calendar size={12} />
                                    <span>Created: {job.createdAt ? (() => {
                                         const createdDate = job.createdAt.toDate ? job.createdAt.toDate() : new Date(job.createdAt);
                                         const diffTime = Math.abs(new Date().getTime() - createdDate.getTime());
                                         const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                                         return `${createdDate.toLocaleDateString('en-AU')} (${diffDays} days ago)`;
                                       })() : 'N/A'}</span>
                                 </div>
                                  <div className="job-ref">
                                    <div 
                                      className="ref-id interactive" 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSupportJobId(job.id);
                                        setSupportMetadata({
                                          lpoName: lpo?.name,
                                          companyName: job.customer?.company,
                                          contactName: job.customer?.contactName,
                                          contactEmail: job.customer?.email,
                                          contactPhone: job.customer?.phone,
                                          serviceType: job.service,
                                          billing: job.billing
                                        });
                                        setIsSupportModalOpen(true);
                                      }}
                                      title="Click for support"
                                    >
                                      REF: {job.id}
                                    </div>
                                    <button 
                                      className="copy-ref-icon"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigator.clipboard.writeText(job.id);
                                        alert("Reference ID copied!");
                                      }}
                                      title="Copy Reference ID"
                                    >
                                      <Copy size={12} />
                                    </button>
                                  </div>
                              </div>

                               <div className="card-actions">
                                   <div className="messaging-group">
                                     <button className="btn-primary-glass mini-chat" onClick={() => window.open(`/request/${job.id}`, '_blank')}>
                                        <MessageSquare size={16} />
                                        <span>CHAT & MANAGE</span>
                                     </button>
                                     {isPrivilegedUser && (
                                       <button 
                                         className="btn-primary-glass mini-chat btn-accept-tc-admin"
                                         onClick={() => handleAcceptTcOnBehalf(job)}
                                         disabled={acceptingTcId === job.id || deletingId === job.id}
                                         title="Accept Terms & Conditions on behalf of customer"
                                       >
                                         <CheckCircle2 size={16} className={acceptingTcId === job.id ? 'spin' : ''} />
                                         <span>{acceptingTcId === job.id ? 'ACCEPTING...' : 'ACCEPT T&C'}</span>
                                       </button>
                                     )}
                                     <button className="btn-secondary-glass mini-chat" onClick={() => handleVerifyStatus(job)}>
                                        <RefreshCw size={16} />
                                        <span>VERIFY STATUS</span>
                                     </button>
                                     <button 
                                        className="btn-secondary-glass mini-chat" 
                                        onClick={() => handleResendSCF(job)}
                                        disabled={resendingId === job.id || acceptingTcId === job.id || deletingId === job.id}
                                      >
                                         <Mail size={16} className={resendingId === job.id ? 'spin' : ''} />
                                         <span>{resendingId === job.id ? 'RESENDING...' : 'RESEND SCF'}</span>
                                      </button>
                                     {isPrivilegedUser && (
                                       <button 
                                         className="btn-secondary-glass mini-chat btn-delete-req-admin"
                                         onClick={() => handleDeleteRequest(job.id)}
                                         disabled={deletingId === job.id || acceptingTcId === job.id}
                                         title="Delete this job request"
                                       >
                                         <Trash2 size={16} className={deletingId === job.id ? 'spin' : ''} />
                                         <span>{deletingId === job.id ? 'DELETING...' : 'DELETE'}</span>
                                       </button>
                                     )}
                                   </div>
                                  
                                  <div className="overflow-menu">
                                     <div className="menu-trigger">
                                        <MoreHorizontal size={18} />
                                        <div className="menu-dropdown glass">
                                           {isPrivilegedUser && (
                                             <button 
                                               onClick={() => handleAcceptTcOnBehalf(job)}
                                               disabled={acceptingTcId === job.id}
                                               style={{ color: '#059669' }}
                                             >
                                               <CheckCircle2 size={14} /> Accept T&C on Behalf
                                             </button>
                                           )}
                                           <button onClick={() => handleEditRequest(job)}><RotateCcw size={14} /> Edit Request</button>
                                           {isPrivilegedUser && (
                                             <button 
                                               className="cancel" 
                                               onClick={() => handleDeleteRequest(job.id)}
                                               disabled={deletingId === job.id}
                                             >
                                               <Trash2 size={14} /> Delete Request
                                             </button>
                                           )}
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

      <SupportEmailModal 
        isOpen={isSupportModalOpen} 
        onClose={() => setIsSupportModalOpen(false)}
        jobId={supportJobId}
        contextTitle={supportJobId ? `Job Reference: ${supportJobId}` : undefined}
        metadata={supportMetadata}
      />

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

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .spin { animation: spin 1s linear infinite; }

        .content-container { position: relative; z-index: 1; max-width: 1200px; margin: 0 auto; padding: 40px 24px 100px; }

        .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
        .title-area { display: flex; gap: 20px; align-items: center; }
        .header-icon { width: 44px; height: 44px; color: var(--ink); }
        .page-header h1 { font-family: var(--font-headings); font-size: 2.2rem; font-weight: 400; color: var(--ink); margin: 0; letter-spacing: -0.025em; }
        .page-header p { margin: 4px 0 0; color: var(--ink-soft); font-size: 1rem; font-weight: 400; }

        .lpo-select-custom {
          margin-right: 12px;
          min-width: 200px;
        }

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

        .lpo-badge-inline {
          font-family: var(--font-ui);
          font-size: 0.6rem;
          font-weight: 700;
          color: var(--gold);
          background: rgba(234, 240, 68, 0.1);
          padding: 2px 8px;
          border-radius: 6px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
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
        .node-inner.pill-awaiting-driver,
        .node-inner.pill-awaiting-activation { border-color: var(--ink); color: var(--ink); }

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
        .job-ref { margin-left: auto; display: flex; align-items: center; gap: 8px; }
        .ref-id { font-family: var(--font-ui); font-size: 0.65rem; color: var(--ink-soft); opacity: 0.4; font-weight: 500; cursor: pointer; transition: opacity 0.2s; }
        .ref-id:hover { opacity: 0.8; }
        .copy-ref-icon { 
          background: rgba(0, 0, 0, 0.03); 
          border: none; 
          border-radius: 4px; 
          padding: 3px; 
          cursor: pointer; 
          display: flex; 
          align-items: center; 
          justify-content: center;
          color: var(--ink-soft);
          opacity: 0.4;
          transition: all 0.2s;
        }
        .copy-ref-icon:hover { background: rgba(0, 0, 0, 0.08); color: var(--ink); opacity: 0.8; }

        .card-actions {
          display: flex; justify-content: space-between; align-items: center;
          padding-top: 16px; border-top: 1px solid rgba(0,0,0,0.03);
          gap: 12px; flex-wrap: wrap;
        }
        .messaging-group { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }

        .btn-accept-tc-admin {
          background: linear-gradient(135deg, #059669 0%, #10b981 100%) !important;
          color: white !important;
          box-shadow: 0 4px 15px rgba(16, 185, 129, 0.25) !important;
        }
        .btn-accept-tc-admin:hover {
          background: linear-gradient(135deg, #047857 0%, #059669 100%) !important;
          box-shadow: 0 8px 25px rgba(16, 185, 129, 0.35) !important;
          color: white !important;
        }
        .btn-accept-tc-admin:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none !important;
        }

        .btn-delete-req-admin {
          background: rgba(239, 68, 68, 0.08) !important;
          border: 1px solid rgba(239, 68, 68, 0.3) !important;
          color: #ef4444 !important;
          transition: all 0.2s ease;
        }
        .btn-delete-req-admin:hover {
          background: #ef4444 !important;
          color: white !important;
          border-color: #ef4444 !important;
          box-shadow: 0 4px 15px rgba(239, 68, 68, 0.25) !important;
        }
        .btn-delete-req-admin:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none !important;
        }

        .overflow-menu { position: relative; }
        .menu-trigger { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 10px; color: var(--ink-soft); cursor: pointer; }
        .menu-trigger:hover { background: rgba(26, 61, 51, 0.05); color: var(--ink); }
        .menu-dropdown {
          position: absolute; bottom: calc(100% + 8px); right: 0;
          min-width: 160px; border-radius: 16px; padding: 6px; z-index: 100;
          display: none; flex-direction: column; gap: 2px;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(15px);
          box-shadow: 0 10px 40px rgba(26, 61, 51, 0.15); 
          border: 1px solid rgba(26, 61, 51, 0.05);
        }
        /* Bridge the gap for hover */
        .menu-dropdown::after {
          content: '';
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          height: 12px;
          background: transparent;
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
