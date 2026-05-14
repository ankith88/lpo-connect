import React, { useState, useEffect } from 'react';
import { X, StickyNote, Send, Calendar, User, RefreshCw, MessageSquare } from 'lucide-react';
import { collection, query, orderBy, addDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useLpo } from '../context/LpoContext';

interface CustomerNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: any;
}

const CustomerNotesModal: React.FC<CustomerNotesModalProps> = ({ 
  isOpen, 
  onClose, 
  customer
}) => {
  const { userData } = useLpo();
  const [notes, setNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen && customer?.id && customer?.lpo_id) {
      setIsLoading(true);
      const notesRef = collection(db, `lpo/${customer.lpo_id}/customers/${customer.id}/notes`);
      const q = query(notesRef, orderBy('createdAt', 'desc'));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const notesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setNotes(notesData);
        setIsLoading(false);
      }, (error) => {
        console.error("Error fetching notes:", error);
        setIsLoading(false);
      });

      return () => unsubscribe();
    }
  }, [isOpen, customer]);

  const handleAddNote = async () => {
    if (!newNote.trim() || !customer?.id || !customer?.lpo_id || !userData) return;

    setIsSaving(true);
    try {
      const notesRef = collection(db, `lpo/${customer.lpo_id}/customers/${customer.id}/notes`);
      await addDoc(notesRef, {
        text: newNote.trim(),
        userName: `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || userData.email,
        userEmail: userData.email,
        createdAt: serverTimestamp()
      });
      setNewNote('');
    } catch (error) {
      console.error("Error adding note:", error);
      alert("Failed to add note. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !customer) return null;

  return (
    <div className="modal-overlay active">
      <div className="modal-content glass-card fade-in" style={{ maxWidth: '600px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header" style={{ marginBottom: '16px' }}>
          <div className="header-title">
            <StickyNote size={20} />
            <div>
              <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Customer Notes</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--ink-soft)', margin: 0, opacity: 0.7 }}>
                {customer.companyName || customer.company_name}
              </p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose} disabled={isSaving}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Add Note Input */}
          <div className="add-note-area">
            <div className="input-wrapper" style={{ padding: '4px 14px' }}>
              <MessageSquare size={16} />
              <textarea 
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Write a note about this customer..."
                style={{ 
                  border: 'none', 
                  background: 'transparent', 
                  width: '100%', 
                  minHeight: '80px', 
                  padding: '10px 0',
                  fontSize: '0.95rem',
                  color: 'var(--ink)',
                  outline: 'none',
                  resize: 'none',
                  fontFamily: 'inherit'
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
              <button 
                className="btn-primary-glass" 
                onClick={handleAddNote}
                disabled={isSaving || !newNote.trim()}
                style={{ padding: '8px 20px', borderRadius: '12px', fontSize: '0.85rem' }}
              >
                {isSaving ? <RefreshCw size={16} className="spin" /> : <><Send size={16} /> Add Note</>}
              </button>
            </div>
          </div>

          {/* Notes List */}
          <div className="notes-list" style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <RefreshCw size={32} className="spin" style={{ opacity: 0.2 }} />
              </div>
            ) : notes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--ink-soft)', opacity: 0.5 }}>
                <StickyNote size={48} style={{ marginBottom: '16px' }} />
                <p>No notes for this customer yet.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {notes.map((note) => (
                  <div key={note.id} className="note-card" style={{ 
                    background: 'rgba(0,0,0,0.02)', 
                    borderRadius: '16px', 
                    padding: '16px',
                    border: '1px solid rgba(0,0,0,0.04)'
                  }}>
                    <p style={{ margin: '0 0 12px 0', fontSize: '0.95rem', lineHeight: '1.5', color: 'var(--ink)' }}>
                      {note.text}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(0,0,0,0.04)', paddingTop: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--ink-soft)', opacity: 0.7 }}>
                        <User size={12} />
                        <span>{note.userName}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--ink-soft)', opacity: 0.7 }}>
                        <Calendar size={12} />
                        <span>
                          {note.createdAt?.toDate ? note.createdAt.toDate().toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
        .modal-header { display: flex; justify-content: space-between; align-items: flex-start; }
        .header-title { display: flex; align-items: center; gap: 12px; color: var(--ink); }
        .close-btn { background: transparent; border: none; color: var(--ink-soft); opacity: 0.6; cursor: pointer; padding: 4px; }
        .close-btn:hover { opacity: 1; color: var(--ink); }
        
        .input-wrapper {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          background: rgba(0,0,0,0.03);
          border: 1px solid rgba(0,0,0,0.05);
          border-radius: 16px;
          transition: all 0.2s;
        }
        .input-wrapper:focus-within {
          background: white;
          border-color: var(--ink);
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }
        .input-wrapper svg { margin-top: 12px; color: var(--ink-soft); opacity: 0.5; }

        .btn-primary-glass {
          background: var(--ink); color: white; border: none;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          cursor: pointer; transition: all 0.2s; font-weight: 700;
        }
        .btn-primary-glass:hover { opacity: 0.9; transform: translateY(-1px); }
        .btn-primary-glass:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

        .notes-list::-webkit-scrollbar { width: 6px; }
        .notes-list::-webkit-scrollbar-track { background: transparent; }
        .notes-list::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
        .notes-list::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.1); }

        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .fade-in { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        @media (max-width: 600px) {
          .modal-content { padding: 20px; }
        }
      `}</style>
    </div>
  );
};

export default CustomerNotesModal;
