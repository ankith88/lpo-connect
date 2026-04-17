import React, { useEffect, useState } from 'react';
import { 
  Search, 
  Filter, 
  RotateCcw, 
  Trash2, 
  ArrowRightLeft,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useLpo } from '../../context/LpoContext';

const Dashboard: React.FC = () => {
  const { lpo } = useLpo();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (lpo) {
      const fetchJobs = async () => {
        const q = query(collection(db, 'jobs'), where('lpo_id', '==', lpo.id));
        const snapshot = await getDocs(q);
        setJobs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      };
      fetchJobs();
    }
  }, [lpo]);

  const handleRebook = (job: any) => {
    // Clone job details into a new draft
    localStorage.setItem('rebook_draft', JSON.stringify(job));
    window.location.href = '/new-job?rebook=true';
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to cancel this job?')) {
      await deleteDoc(doc(db, 'jobs', id));
      setJobs(jobs.filter(j => j.id !== id));
    }
  };

  const filteredJobs = jobs.filter(j => 
    j.customer.company.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getServiceIcon = (type: string) => {
    if (type === 'round-trip') return <ArrowRightLeft size={18} />;
    if (type === 'site-to-lpo') return <ArrowRight size={18} />;
    return <ArrowLeft size={18} />;
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <h1>Scheduled Jobs</h1>
        <p>View and manage all upcoming courier tasks for your LPO.</p>
      </div>

      <div className="dashboard-actions card">
        <div className="search-bar">
          <Search size={20} />
          <input 
            type="text" 
            placeholder="Search by customer name..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="btn-filter">
          <Filter size={18} /> Filters
        </button>
      </div>

      <div className="jobs-list">
        {loading ? (
          <p className="text-center">Loading jobs...</p>
        ) : filteredJobs.length === 0 ? (
          <div className="empty-state text-center">
            <h3>No jobs found</h3>
            <p>Ready to book some logistics? Use the "New Adhoc Job" button.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="jobs-table">
              <thead>
                <tr>
                  <th>Job ID</th>
                  <th>Customer</th>
                  <th>Service</th>
                  <th>Date</th>
                  <th>Billing</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.map(job => (
                  <tr key={job.id}>
                    <td><span className="job-id-tag">#{job.id.slice(0, 6)}</span></td>
                    <td>
                      <div className="customer-info">
                        <strong>{job.customer.company}</strong>
                        <span>{job.customer.contact}</span>
                      </div>
                    </td>
                    <td>
                      <div className="service-info">
                        {getServiceIcon(job.service)}
                        <span>{job.service.replace(/-/g, ' ')}</span>
                      </div>
                    </td>
                    <td>{job.date}</td>
                    <td className="capitalize">{job.billing}</td>
                    <td>
                      <span className={`status-pill ${job.status}`}>
                        {job.status}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button className="action-btn rebook" title="Rebook" onClick={() => handleRebook(job)}>
                          <RotateCcw size={18} />
                        </button>
                        <button className="action-btn delete" title="Cancel" onClick={() => handleDelete(job.id)}>
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        .dashboard-header {
          margin-bottom: 30px;
        }

        .dashboard-actions {
          display: flex;
          gap: 16px;
          margin-bottom: 24px;
          padding: 16px;
        }

        .search-bar {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 12px;
          background: #f5f5f5;
          padding: 0 16px;
          border-radius: 8px;
        }

        .search-bar input {
          border: none;
          background: transparent;
          padding: 12px 0;
        }

        .btn-filter {
          background: white;
          border: 1px solid #ddd;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 20px;
        }

        .table-wrapper {
          overflow-x: auto;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }

        .jobs-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .jobs-table th {
          background: var(--mailplus-teal);
          color: white;
          padding: 16px;
          font-weight: 600;
          font-size: 0.9rem;
        }

        .jobs-table td {
          padding: 16px;
          border-bottom: 1px solid #eee;
          vertical-align: middle;
        }

        .job-id-tag {
          font-family: monospace;
          background: #eee;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.8rem;
        }

        .customer-info {
          display: flex;
          flex-direction: column;
        }

        .customer-info span {
          font-size: 0.8rem;
          color: #666;
        }

        .service-info {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.85rem;
          text-transform: capitalize;
        }

        .status-pill {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
        }

        .status-pill.scheduled {
          background: #e3f2fd;
          color: #1976d2;
        }

        .action-buttons {
          display: flex;
          gap: 8px;
        }

        .action-btn {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          background: #f5f5f5;
          color: #555;
        }

        .action-btn.rebook:hover {
          background: var(--mailplus-teal);
          color: white;
        }

        .action-btn.delete:hover {
          background: var(--mailplus-red);
          color: white;
        }

        .empty-state {
          padding: 60px;
          background: white;
          border-radius: 12px;
        }

        .capitalize { text-transform: capitalize; }
      `}</style>
    </div>
  );
};

export default Dashboard;
