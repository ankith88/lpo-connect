import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { 
  doc, 
  updateDoc, 
  addDoc, 
  collection, 
  onSnapshot,
  arrayUnion
} from 'firebase/firestore';
import { 
  CheckCircle2, 
  XCircle, 
  MessageSquare, 
  Clock, 
  MapPin, 
  Truck, 
  Building2,
  Phone,
  User as UserIcon,
  Send,
  ChevronLeft,
  Mail
} from 'lucide-react';
import { db } from '../../firebase/config';
import { useLpo } from '../../context/LpoContext';

const RequestPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { lpo } = useLpo();
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Identity: If lpo exists, person is the Operator. 
  // Otherwise, they are the Requester/User.
  const isOperator = !!lpo;

  useEffect(() => {
    if (!id) return;

    // Use onSnapshot for real-time chat
    const unsubscribe = onSnapshot(doc(db, 'requests', id), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.status === 'accepted') {
          setError("This request has already been accepted and is now an active job.");
        } else if (data.status === 'rejected') {
           setError("This request has been declined.");
        } else {
          setRequest({ id: docSnap.id, ...data });
        }
      } else {
        setError("Request not found or has been deleted.");
      }
      setLoading(false);
    }, (err) => {
      console.error("Error fetching request:", err);
      setError("Error loading request details.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [request?.chat]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !id) return;

    const newMessage = {
      sender: isOperator ? 'operator' : 'user',
      text: message.trim(),
      timestamp: new Date().toISOString(),
    };

    try {
      await updateDoc(doc(db, 'requests', id), {
        chat: arrayUnion(newMessage)
      });
      setMessage('');
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const handleAccept = async () => {
    if (!request || !isOperator || !lpo) return;

    if (window.confirm("Accept this job request?")) {
      try {
        // 1. Create Job
        await addDoc(collection(db, 'jobs'), {
          ...request,
          lpo_id: lpo.id,
          status: 'scheduled',
          createdAt: new Date(),
          originalRequestId: request.id
        });

        // 2. Create/Update Customer in Hub (Only for NEW customers)
        if (!request.isExistingCustomer) {
          const customerData = {
            companyName: request.customer.company || "",
            address1: request.customer.address || "",
            city: request.customer.suburb || "",
            state: request.customer.state || "",
            zip: request.customer.postcode || "",
            customerEmail: request.customer.email || "",
            customerPhone: request.customer.phone || "",
            companyId: request.customer.netsuiteId || "",
            lpoContactName: `${request.customer.firstName || ""} ${request.customer.lastName || ""}`.trim(),
            franchiseeText: lpo.name || "",
            instructions: request.customer.instructions || "",
            lastJobDate: request.date || "",
            updatedAt: new Date()
          };

          // For simplicity, we add/replace in customers subcollection
          await addDoc(collection(db, `lpo/${lpo.id}/customers`), customerData);
        }

        // 3. Update Request Status
        await updateDoc(doc(db, 'requests', request.id), {
          status: 'accepted'
        });

        const successMsg = request.isExistingCustomer 
          ? "Job accepted successfully!" 
          : "Job accepted successfully! The new customer has been added to your Customer Hub.";
        
        alert(successMsg);
      } catch (err) {
        console.error("Error accepting job:", err);
        alert("Failed to accept job.");
      }
    }
  };

  const handleReject = async () => {
    if (!request || !isOperator) return;

    if (window.confirm("Decline this job request?")) {
      try {
        await updateDoc(doc(db, 'requests', request.id), {
          status: 'rejected'
        });
      } catch (err) {
        console.error("Error rejecting job:", err);
      }
    }
  };

  if (loading) {
    return (
      <div className="request-page-loading">
        <Clock className="spinner" />
        <p>Loading Request Coordination...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="request-page-error">
         <div className="error-card glass">
            <XCircle size={64} color="#ff4757" />
            <h2>Coordination Inactive</h2>
            <p>{error}</p>
            <button onClick={() => window.location.href = '/dashboard'} className="btn-primary">
              GO TO DASHBOARD
            </button>
         </div>
         <style>{`
            .request-page-error { height: 100vh; display: flex; align-items: center; justify-content: center; background: #f0f7f4; padding: 20px; }
            .error-card { text-align: center; padding: 40px; border-radius: 32px; max-width: 500px; }
            .error-card h2 { margin: 24px 0 12px; color: var(--mailplus-teal); }
            .error-card p { color: #5b7971; margin-bottom: 32px; }
         `}</style>
      </div>
    );
  }

  return (
    <div className="request-page-premium">
      <div className="mesh-bg">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
      </div>

      <div className=" coordination-container">
        <header className="request-header">
           <button className="back-btn" onClick={() => window.history.back()}>
              <ChevronLeft size={20} />
              <span>Back</span>
           </button>
           <div className="header-main">
              <div className="status-pill pending">Coordination Phase</div>
              <h1>Job Request Coordination</h1>
              <p>Reference: #{request.id.slice(0, 8).toUpperCase()}</p>
           </div>
           
           {isOperator && (
             <div className="operator-actions">
               <button className="btn-reject" onClick={handleReject}>
                 <XCircle size={18} /> DECLINE
               </button>
                <button className="btn-accept shadow-teal" onClick={handleAccept}>
                  <div className="accept-content">
                    <CheckCircle2 size={18} /> 
                    <span>ACCEPT JOB</span>
                  </div>
                  {request.preferredTime && (
                    <div className="btn-badge">Time Priority</div>
                  )}
                </button>
             </div>
           )}
        </header>

        <div className="request-grid">
           {/* Left: Job Details */}
           <aside className="details-sidebar glass-card">
              <div className="detail-section">
                 <div className="section-title">
                    <Building2 size={18} />
                    <h3>Client Details</h3>
                 </div>
                 <div className="info-box">
                    <div className="info-row">
                       <UserIcon size={14} />
                       <strong>{request.customer.company}</strong>
                    </div>
                    <div className="info-row">
                       <Phone size={14} />
                       <span>{request.customer.phone}</span>
                    </div>
                    <div className="info-row">
                       <Mail size={14} />
                       <span>{request.customer.contact}</span>
                    </div>
                 </div>
              </div>

              <div className="detail-section">
                 <div className="section-title">
                    <MapPin size={18} />
                    <h3>Location</h3>
                 </div>
                 <div className="location-card">
                    <p className="address">{request.customer.address}</p>
                    <p className="suburb">{request.customer.suburb}, {request.customer.state} {request.customer.postcode}</p>
                 </div>
              </div>

              <div className="detail-section">
                 <div className="section-title">
                    <Truck size={18} />
                    <h3>Service Logistics</h3>
                 </div>
                 <div className="logistics-grid">
                    <div className="log-item">
                       <label>Service</label>
                       <span>{request.service.replace(/-/g, ' ')}</span>
                    </div>
                    <div className="log-item">
                       <label>Billing</label>
                       <span>{request.billing}</span>
                    </div>
                    <div className="log-item">
                       <label>Date</label>
                       <span>{new Date(request.date).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                    </div>
                 </div>
                 {request.preferredTime && (
                     <div className="time-highlight-banner">
                        <div className="time-icon-area">
                           <Clock size={20} className="pulse-clock" />
                        </div>
                        <div className="time-text-area">
                           <label>MUST BE COMPLETED BY</label>
                           <span className="time-value">{request.preferredTime}</span>
                        </div>
                     </div>
                  )}
              </div>

              {request.customer.instructions && (
                <div className="detail-section">
                  <div className="section-title">
                    <Clock size={18} />
                    <h3>Instructions</h3>
                  </div>
                  <div className="instructions-box">
                     {request.customer.instructions}
                  </div>
                </div>
              )}
           </aside>

           {/* Right: Chat Coordination */}
           <main className="chat-interface glass-card">
              <div className="chat-header">
                 <MessageSquare size={20} />
                 <h2>Coordination Chat</h2>
                 <span className="live-indicator">LIVE</span>
              </div>

              <div className="chat-messages">
                 {(!request.chat || request.chat.length === 0) ? (
                    <div className="empty-chat">
                       <MessageSquare size={48} />
                       <p>Start the coordination by sending a message.</p>
                       <span className="hint">Questions about timing, access, or billing can be discussed here.</span>
                    </div>
                 ) : (
                    request.chat.map((msg: any, idx: number) => (
                       <div key={idx} className={`message-bubble ${msg.sender}`}>
                          <div className="sender-label">{msg.sender === 'operator' ? 'MailPlus Operator' : 'Customer'}</div>
                          <div className="message-content">{msg.text}</div>
                          <div className="message-time">
                             {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                       </div>
                    ))
                 )}
                 <div ref={chatEndRef} />
              </div>

              <form className="chat-input-area" onSubmit={handleSendMessage}>
                 <input 
                   type="text" 
                   placeholder="Type your message here..."
                   value={message}
                   onChange={(e) => setMessage(e.target.value)}
                 />
                 <button type="submit" className="send-btn" disabled={!message.trim()}>
                    <Send size={18} />
                 </button>
              </form>
           </main>
        </div>
      </div>

      <style>{`
        .request-page-premium { min-height: 100vh; background: #f0f7f4; padding: 40px 24px; position: relative; overflow-x: hidden; }
        .mesh-bg { position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 0; filter: blur(100px); opacity: 0.5; }
        .blob { position: absolute; border-radius: 50%; width: 600px; height: 600px; background: var(--mailplus-light-green); }
        .blob-1 { top: -100px; right: -100px; }
        .blob-2 { bottom: -100px; left: -100px; background: #c3e2d3; }

        .coordination-container { position: relative; z-index: 1; max-width: 1200px; margin: 0 auto; }

        .request-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; }
        .back-btn { display: flex; align-items: center; gap: 8px; background: transparent; border: none; color: #5b7971; font-weight: 700; cursor: pointer; }
        .header-main h1 { font-size: 2rem; font-weight: 900; color: var(--mailplus-teal); margin: 8px 0 4px; }
        .header-main p { font-weight: 700; color: #8fa6a0; font-family: monospace; }
        .status-pill { display: inline-block; padding: 4px 12px; borderRadius: 20px; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; }
        .status-pill.pending { background: #fff8e1; color: #f39c12; }

        .operator-actions { display: flex; gap: 12px; }
        .btn-reject { background: white; color: #ff4757; border: 1px solid #ffdada; padding: 12px 24px; border-radius: 14px; font-weight: 800; display: flex; align-items: center; gap: 10px; cursor: pointer; }
        
        .request-grid { display: grid; grid-template-columns: 350px 1fr; gap: 32px; }

        .glass-card { background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.4); border-radius: 32px; padding: 32px; }
        
        .section-title { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; color: var(--mailplus-teal); }
        .section-title h3 { font-size: 0.9rem; font-weight: 800; margin: 0; text-transform: uppercase; letter-spacing: 0.5px; }

        .info-box { background: white; padding: 16px; border-radius: 16px; display: flex; flex-direction: column; gap: 10px; }
        .info-row { display: flex; align-items: center; gap: 10px; font-size: 0.9rem; color: #5b7971; }
        .info-row strong { color: var(--mailplus-teal); }

        .location-card { background: white; padding: 16px; border-radius: 16px; }
        .location-card .address { font-weight: 700; color: var(--mailplus-teal); margin-bottom: 4px; }
        .location-card .suburb { font-size: 0.8rem; color: #8fa6a0; font-weight: 600; }

        .logistics-grid { display: grid; gap: 12px; grid-template-columns: 1fr 1fr; margin-bottom: 20px; }
        .log-item { display: flex; flex-direction: column; gap: 4px; }
        .log-item label { font-size: 0.65rem; font-weight: 800; color: #8fa6a0; text-transform: uppercase; letter-spacing: 0.5px; }
        .log-item span { font-weight: 700; color: #1a3c34; font-size: 0.9rem; }

        .time-highlight-banner { 
           background: #fff8e6; 
           border: 1px solid #ffecb3; 
           border-radius: 16px; 
           padding: 16px; 
           display: flex; 
           align-items: center; 
           gap: 16px; 
           margin-top: 4px;
           box-shadow: 0 4px 12px rgba(255, 193, 7, 0.1);
         }
         .time-icon-area { 
           width: 40px; 
           height: 40px; 
           background: #ffc107; 
           color: white; 
           border-radius: 12px; 
           display: flex; 
           align-items: center; 
           justify-content: center; 
         }
         .pulse-clock { animation: clockPulse 2s infinite; }
         @keyframes clockPulse { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
         
         .time-text-area { display: flex; flex-direction: column; gap: 2px; }
         .time-text-area label { font-size: 0.6rem; font-weight: 900; color: #b28900; letter-spacing: 0.5px; }
         .time-value { font-size: 1.3rem; font-weight: 900; color: #5c4700; letter-spacing: -0.5px; }

         .btn-accept { position: relative; overflow: visible; display: flex; flex-direction: column; align-items: center; padding: 12px 24px; min-width: 160px; background: var(--mailplus-teal); color: white; border: none; border-radius: 14px; font-weight: 800; cursor: pointer; transition: all 0.2s; }
         .accept-content { display: flex; align-items: center; gap: 8px; }
         .btn-badge { 
           position: absolute; 
           top: -10px; 
           right: -10px; 
           background: #e67e22; 
           color: white; 
           font-size: 0.6rem; 
           font-weight: 900; 
           padding: 4px 10px; 
           border-radius: 20px; 
           box-shadow: 0 4px 10px rgba(230, 126, 34, 0.3);
           text-transform: uppercase;
           border: 2px solid #f0f7f4;
         }

        .instructions-box { background: #fff9db; padding: 16px; border-radius: 16px; font-size: 0.85rem; color: #7a6e2a; font-weight: 600; line-height: 1.5; }

        .chat-interface { flex: 1; display: flex; flex-direction: column; min-height: 500px; padding: 0 !important; overflow: hidden; }
        .chat-header { display: flex; align-items: center; gap: 12px; margin: 32px 32px 24px; }
        .chat-header h2 { font-size: 1.25rem; font-weight: 900; color: var(--mailplus-teal); margin: 0; }
        .live-indicator { background: #e2f9ec; color: #2ecc71; font-size: 0.6rem; font-weight: 900; padding: 2px 8px; border-radius: 50px; }

        .chat-messages { flex: 1; overflow-y: auto; padding: 10px; display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px; padding-right: 15px; }
        .message-bubble { max-width: 80%; padding: 16px; border-radius: 20px; position: relative; }
        .message-bubble.user { align-self: flex-start; background: white; color: #5b7971; border-bottom-left-radius: 4px; }
        .message-bubble.operator { align-self: flex-end; background: var(--mailplus-teal); color: white; border-bottom-right-radius: 4px; }

        .sender-label { font-size: 0.65rem; font-weight: 800; opacity: 0.7; margin-bottom: 4px; text-transform: uppercase; }
        .message-content { font-weight: 600; font-size: 0.95rem; line-height: 1.4; }
        .message-time { font-size: 0.6rem; opacity: 0.5; margin-top: 6px; text-align: right; }

        .chat-input-area { display: flex; gap: 12px; background: white; padding: 8px; border-radius: 20px; border: 1px solid #e2ebe2; }
        .chat-input-area input { flex: 1; border: none; padding: 12px 16px; font-weight: 500; font-size: 0.95rem; }
        .chat-input-area input:focus { outline: none; }
        .send-btn { background: var(--mailplus-teal); color: white; border: none; width: 44px; height: 44px; border-radius: 14px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; }
        .send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .send-btn:hover { transform: scale(1.05); }

        .empty-chat { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: #8fa6a0; padding: 40px; }
        .empty-chat p { font-weight: 800; color: var(--mailplus-teal); margin: 16px 0 8px; }
        .empty-chat .hint { font-size: 0.8rem; font-weight: 500; }

        .request-page-loading { height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #8fa6a0; }
        .spinner { animation: spin 1s linear infinite; margin-bottom: 16px; width: 40px; height: 40px; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        @media (max-width: 900px) {
           .request-grid { grid-template-columns: 1fr; }
           .details-sidebar { order: 2; }
           .chat-interface { order: 1; height: 500px; }
           .request-header { flex-direction: column; align-items: flex-start; gap: 20px; }
        }
      `}</style>
    </div>
  );
};

export default RequestPage;
