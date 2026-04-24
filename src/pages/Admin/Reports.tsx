import React, { useEffect, useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Calendar,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  Activity
} from 'lucide-react';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useLpo } from '../../context/LpoContext';

const Reports: React.FC = () => {
  const { lpo } = useLpo();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalJobs: 0,
    completedJobs: 0,
    activeCustomers: 0,
    estimatedRevenue: 0,
    serviceSplit: {
      'lpo-to-site': 0,
      'site-to-lpo': 0,
      'round-trip': 0
    }
  });

  useEffect(() => {
    if (lpo) {
      const fetchStats = async () => {
        try {
          const jobsQ = query(collection(db, 'jobs'), where('lpo_id', '==', lpo.id));
          const snapshot = await getDocs(jobsQ);
          
          let completed = 0;
          let revenue = 0;
          const split = { 'lpo-to-site': 0, 'site-to-lpo': 0, 'round-trip': 0 };
          
          snapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.status === 'completed') completed++;
            
            const rate = parseFloat(data.serviceRate || '0');
            revenue += rate;
            
            const type = data.service as keyof typeof split;
            if (split[type] !== undefined) split[type]++;
          });

          // Fetch customers count
          const custQ = query(collection(db, `lpo/${lpo.id}/customers`));
          const custSnapshot = await getDocs(custQ);

          setStats({
            totalJobs: snapshot.size,
            completedJobs: completed,
            activeCustomers: custSnapshot.size,
            estimatedRevenue: revenue,
            serviceSplit: split
          });
        } catch (err) {
          console.error("Error fetching report stats:", err);
        } finally {
          setLoading(false);
        }
      };
      fetchStats();
    }
  }, [lpo]);

  const serviceLabels: Record<string, string> = {
    'lpo-to-site': 'LPO ➔ Site',
    'site-to-lpo': 'Site ➔ LPO',
    'round-trip': 'Round Trip'
  };

  return (
    <div className="reports-premium">
      <div className="mesh-bg">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
      </div>

      <div className="content-container">
        <header className="page-header">
          <div className="header-left">
            <div className="title-area">
              <BarChart3 className="header-icon" />
              <div>
                <h1>Operational Insights</h1>
                <p>Advanced metrics and logistics performance for {lpo?.name || 'your LPO'}.</p>
              </div>
            </div>
          </div>
          <div className="header-right">
            <div className="date-range-glass">
              <Calendar size={16} />
              <span>Last 30 Days</span>
              <Filter size={14} />
            </div>
          </div>
        </header>

        {loading ? (
          <div className="loading-state">Generating Insights...</div>
        ) : (
          <>
            <div className="stats-grid">
              <div className="stat-card glass-card">
                <div className="stat-icon-wrapper blue">
                  <Activity size={24} />
                </div>
                <div className="stat-content">
                  <label>Total Bookings</label>
                  <div className="stat-value-row">
                    <h3>{stats.totalJobs}</h3>
                    <span className="trend up">
                      <ArrowUpRight size={14} /> 12%
                    </span>
                  </div>
                </div>
              </div>

              <div className="stat-card glass-card">
                <div className="stat-icon-wrapper green">
                  <DollarSign size={24} />
                </div>
                <div className="stat-content">
                  <label>Est. Revenue</label>
                  <div className="stat-value-row">
                    <h3>${stats.estimatedRevenue.toFixed(2)}</h3>
                    <span className="trend up">
                      <ArrowUpRight size={14} /> 8.4%
                    </span>
                  </div>
                </div>
              </div>

              <div className="stat-card glass-card">
                <div className="stat-icon-wrapper purple">
                  <Users size={24} />
                </div>
                <div className="stat-content">
                  <label>Active Clients</label>
                  <div className="stat-value-row">
                    <h3>{stats.activeCustomers}</h3>
                    <span className="trend down">
                      <ArrowDownRight size={14} /> 2%
                    </span>
                  </div>
                </div>
              </div>

              <div className="stat-card glass-card">
                <div className="stat-icon-wrapper orange">
                  <TrendingUp size={24} />
                </div>
                <div className="stat-content">
                  <label>Completion Rate</label>
                  <div className="stat-value-row">
                    <h3>{stats.totalJobs > 0 ? Math.round((stats.completedJobs / stats.totalJobs) * 100) : 0}%</h3>
                    <span className="trend up">
                      <ArrowUpRight size={14} /> 5%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="charts-row">
              <div className="chart-container glass-card large">
                <div className="chart-header">
                  <h3>Volume Trend</h3>
                  <div className="chart-legend">
                    <span className="dot jobs"></span> Jobs Booked
                  </div>
                </div>
                <div className="viz-placeholder">
                  {/* Custom SVG Chart */}
                  <svg viewBox="0 0 800 200" className="trend-viz">
                    <defs>
                      <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--ink)" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="var(--ink)" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path 
                      d="M0,150 Q100,140 200,160 T400,120 T600,100 T800,80" 
                      fill="none" 
                      stroke="var(--ink)" 
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                    <path 
                      d="M0,150 Q100,140 200,160 T400,120 T600,100 T800,80 L800,200 L0,200 Z" 
                      fill="url(#chartGradient)"
                    />
                    {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
                      <circle key={i} cx={i * 114} cy={150 - (i * 10)} r="5" fill="white" stroke="var(--ink)" strokeWidth="2" />
                    ))}
                  </svg>
                  <div className="x-axis">
                    <span>1 Apr</span>
                    <span>7 Apr</span>
                    <span>14 Apr</span>
                    <span>21 Apr</span>
                    <span>Today</span>
                  </div>
                </div>
              </div>

              <div className="chart-container glass-card small">
                <div className="chart-header">
                  <h3>Service Mix</h3>
                </div>
                <div className="viz-placeholder pie">
                  <div className="pie-wrapper">
                    <svg viewBox="0 0 100 100" className="pie-chart-viz">
                      <circle cx="50" cy="50" r="40" fill="transparent" stroke="#e0e0e0" strokeWidth="20" />
                      <circle 
                        cx="50" cy="50" r="40" 
                        fill="transparent" 
                        stroke="var(--ink)" 
                        strokeWidth="20" 
                        strokeDasharray={`${(stats.serviceSplit['lpo-to-site'] / (stats.totalJobs || 1)) * 251} 251`}
                        transform="rotate(-90 50 50)"
                      />
                    </svg>
                    <div className="pie-center">
                      <PieChart size={20} color="var(--ink-soft)" />
                    </div>
                  </div>
                  <div className="pie-legend">
                    {Object.entries(stats.serviceSplit).map(([key, value]) => (
                      <div key={key} className="legend-item">
                        <span className={`dot ${key}`}></span>
                        <span className="label">{serviceLabels[key]}</span>
                        <span className="value">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <style>{`
        .reports-premium { min-height: 100vh; background: var(--cream); padding: 40px 24px 100px; position: relative; overflow-x: hidden; }
        .mesh-bg { position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 0; filter: blur(100px); opacity: 0.5; }
        .blob { position: absolute; border-radius: 50%; width: 600px; height: 600px; background: var(--cream-warm); }
        .blob-1 { top: -100px; right: -100px; }
        .blob-2 { bottom: -100px; left: -100px; background: var(--cream-warm); }

        .content-container { position: relative; z-index: 1; max-width: 1200px; margin: 0 auto; }

        .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
        .title-area { display: flex; gap: 20px; align-items: center; }
        .header-icon { width: 44px; height: 44px; color: var(--ink); }
        .page-header h1 { font-family: var(--font-headings); font-size: 2.2rem; font-weight: 400; color: var(--ink); margin: 0; letter-spacing: -0.025em; }
        .page-header p { margin: 4px 0 0; color: var(--ink-soft); font-size: 1rem; font-weight: 400; }

        .date-range-glass {
          display: flex; align-items: center; gap: 12px; background: rgba(255,255,255,0.7);
          backdrop-filter: blur(10px); padding: 12px 20px; border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.4); color: var(--ink);
          font-weight: 700; font-size: 0.9rem; cursor: pointer;
        }

        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; margin-bottom: 32px; }
        .glass-card { background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.4); border-radius: 24px; padding: 24px; }
        
        .stat-card { display: flex; align-items: center; gap: 20px; transition: transform 0.3s; }
        .stat-card:hover { transform: translateY(-5px); }
        
        .stat-icon-wrapper { width: 56px; height: 56px; border-radius: 16px; display: flex; align-items: center; justify-content: center; }
        .stat-icon-wrapper.blue { background: #e3f2fd; color: #1e88e5; }
        .stat-icon-wrapper.green { background: #e8f5e9; color: #43a047; }
        .stat-icon-wrapper.purple { background: #f3e5f5; color: #8e24aa; }
        .stat-icon-wrapper.orange { background: #fff3e0; color: #fb8c00; }

        .stat-content label { display: block; font-family: var(--font-ui); font-size: 0.65rem; font-weight: 500; color: var(--ink-soft); text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.16em; }
        .stat-value-row { display: flex; align-items: baseline; gap: 8px; }
        .stat-value-row h3 { margin: 0; font-family: var(--font-ui); font-size: 1.5rem; font-weight: 500; color: var(--ink); }
        .trend { font-size: 0.7rem; font-weight: 800; display: flex; align-items: center; gap: 2px; padding: 2px 6px; border-radius: 6px; }
        .trend.up { background: #e2f9ec; color: #27ae60; }
        .trend.down { background: #fff1f1; color: #ff4757; }

        .charts-row { display: grid; grid-template-columns: 1fr 350px; gap: 24px; }
        .chart-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
        .chart-header h3 { margin: 0; font-family: var(--font-headings); font-size: 1.1rem; font-weight: 500; color: var(--ink); }
        
        .chart-legend { display: flex; gap: 16px; font-size: 0.8rem; font-weight: 700; color: var(--ink-soft); }
        .dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
        .dot.jobs { background: var(--ink); }
        
        .viz-placeholder { height: 240px; position: relative; }
        .trend-viz { width: 100%; height: 180px; }
        .x-axis { display: flex; justify-content: space-between; padding-top: 12px; color: var(--ink-soft); font-family: var(--font-ui); font-size: 0.55rem; font-weight: 500; text-transform: uppercase; letter-spacing: 0.1em; }

        .viz-placeholder.pie { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; }
        .pie-wrapper { position: relative; width: 150px; height: 150px; margin-bottom: 24px; }
        .pie-center { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); }
        
        .pie-legend { width: 100%; display: flex; flex-direction: column; gap: 8px; }
        .legend-item { display: flex; align-items: center; gap: 10px; font-size: 0.8rem; font-weight: 600; color: var(--ink-soft); }
        .legend-item .label { flex: 1; }
        .legend-item .value { font-weight: 800; color: var(--ink); }
        
        .dot.lpo-to-site { background: var(--ink); }
        .dot.site-to-lpo { background: var(--gold); }
        .dot.round-trip { background: var(--ink-soft); }

        .loading-state { padding: 100px; text-align: center; color: var(--ink-soft); font-weight: 800; font-size: 1.2rem; }

        @media (max-width: 1024px) {
          .stats-grid { grid-template-columns: repeat(2, 1fr); }
          .charts-row { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
};

export default Reports;
