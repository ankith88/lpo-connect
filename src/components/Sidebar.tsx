import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  ClipboardList,
  PlusCircle, 
  MapPin, 
  Share2,
  Users, 
  RotateCcw, 
  FileText, 
  TrendingUp, 
  HelpCircle, 
  LogOut,
  BarChart3
} from 'lucide-react';
import { auth } from '../firebase/config';

const Sidebar: React.FC = () => {
  const navItems = [
    { name: 'Job Manager', icon: ClipboardList, path: '/dashboard' },
    { name: 'New Job', icon: PlusCircle, path: '/new-job' },
    { name: 'Recurring Schedules', icon: RotateCcw, path: '/schedules' },
    { name: 'Service Area', icon: MapPin, path: '/service-area' },
    { name: 'Share Booking Link', icon: Share2, path: '/share' },
    { name: 'Customer Hub', icon: Users, path: '/customers' },
    { name: 'Weekly Invoices', icon: FileText, path: '/invoices' },
    { name: 'Growth Leads', icon: TrendingUp, path: '/leads' },
    { name: 'Operational Insights', icon: BarChart3, path: '/reports' },
  ];

  const handleLogout = async () => {
    try {
      await auth.signOut();
      window.location.href = '/signin';
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <aside className="sidebar-premium">
      {/* Background decoration removed for clean dark look */}
      <div className="sidebar-mesh">
      </div>

      <div className="sidebar-content">
        <div className="sidebar-header">
          <div className="brand-redesign">
            <div className="logo-text">
              <span className="logo-lpo">lpo</span><span className="logo-plus">.plus</span>
            </div>
            <div className="logo-platform">
              A MAILPLUS PLATFORM
            </div>
          </div>
          
          <div className="user-profile-glass">
            <div className="avatar-ring">
              <div className="avatar-placeholder">CK</div>
            </div>
            <div className="user-info">
              <p className="user-name">Clarke Kent</p>
              <p className="lpo-name">Rouse Hill LPO</p>
            </div>
          </div>
        </div>
        
        <nav className="sidebar-nav">
          <div className="nav-group">
            <p className="group-title">Logistics Management</p>
            {navItems.slice(0, 4).map((item) => (
              <NavLink 
                key={item.path} 
                to={item.path}
                className={({ isActive }) => `nav-item-glass ${isActive ? 'active' : ''}`}
              >
                <item.icon size={20} className="nav-icon" />
                <span>{item.name}</span>
              </NavLink>
            ))}
          </div>

          <div className="nav-group">
            <p className="group-title">Administration</p>
            {navItems.slice(4).map((item) => (
              <NavLink 
                key={item.path} 
                to={item.path}
                className={({ isActive }) => `nav-item-glass ${isActive ? 'active' : ''}`}
              >
                <item.icon size={20} className="nav-icon" />
                <span>{item.name}</span>
              </NavLink>
            ))}
          </div>
        </nav>

        <div className="sidebar-footer">
          <NavLink to="/help" className="nav-item-glass footer-item">
            <HelpCircle size={20} />
            <span>Support Center</span>
          </NavLink>
          <button className="nav-item-glass logout-btn" onClick={handleLogout}>
            <LogOut size={20} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      <style>{`
        .sidebar-premium {
          width: var(--sidebar-width);
          height: 100vh;
          position: fixed;
          left: 0;
          top: 0;
          z-index: 1000;
          background: var(--ink);
          border-right: 1px solid rgba(255, 255, 255, 0.1);
          overflow: hidden;
        }

        .sidebar-mesh {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          z-index: 0;
          filter: blur(40px);
          opacity: 0.4;
        }

        .mesh-blob {
          position: absolute;
          border-radius: 50%;
        }
        .blob-1 {
          width: 200px; height: 200px;
          background: var(--gold);
          top: -50px; left: -50px;
          opacity: 0.1;
        }
        .blob-2 {
          width: 150px; height: 150px;
          background: var(--gold);
          bottom: 10%; right: -20px;
          opacity: 0.1;
        }

        .sidebar-content {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .sidebar-header {
          padding: 32px 24px;
        }

        .brand-redesign {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 40px;
          padding-left: 4px;
        }
        
        .logo-text {
          font-family: var(--font-headings);
          font-size: 1.6rem;
          font-weight: 400;
          color: #ffffff;
          display: flex;
          align-items: baseline;
          letter-spacing: -0.025em;
          line-height: 1;
        }
        
        .logo-plus {
          font-family: var(--font-headings);
          font-weight: 500;
          font-style: italic;
          color: var(--red);
        }
        
        .logo-platform {
          font-family: var(--font-ui);
          font-size: 0.5rem;
          font-weight: 500;
          letter-spacing: 0.16em;
          color: rgba(255, 255, 255, 0.4);
          white-space: nowrap;
          text-transform: uppercase;
        }

        .user-profile-glass {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 16px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .avatar-ring {
          padding: 3px;
          background: linear-gradient(45deg, var(--gold), #ffffff);
          border-radius: 50%;
        }
        .avatar-placeholder {
          width: 36px; height: 36px;
          background: white; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-weight: 900; font-size: 0.75rem; color: var(--ink);
        }

        .user-name { font-weight: 800; font-size: 0.85rem; color: #ffffff; margin: 0; }
        .lpo-name { font-size: 0.65rem; font-weight: 600; color: rgba(255, 255, 255, 0.5); margin: 0; }

        .sidebar-nav {
          flex: 1;
          padding: 0 16px;
          overflow-y: auto;
        }

        .nav-group {
          margin-bottom: 24px;
        }
        .group-title {
          font-family: var(--font-ui);
          font-size: 0.6rem; font-weight: 500; color: rgba(255, 255, 255, 0.3);
          text-transform: uppercase; letter-spacing: 0.16em;
          margin: 0 0 12px 16px;
        }

        .nav-item-glass {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 16px;
          text-decoration: none;
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.85rem; font-weight: 700;
          border-radius: 14px;
          margin-bottom: 4px;
          transition: all 0.2s;
          border: 1px solid transparent;
        }

        .nav-item-glass:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #ffffff;
          transform: translateX(4px);
        }

        .nav-item-glass.active {
          background: rgba(255, 255, 255, 0.1);
          color: #ffffff;
          border-left: 4px solid var(--gold);
          border-radius: 0 14px 14px 0;
          margin-left: -16px;
          padding-left: 28px;
        }
        .nav-item-glass.active .nav-icon { color: var(--gold); }

        .sidebar-footer {
          padding: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(0, 0, 0, 0.1);
        }

        .logout-btn {
          width: 100%; border: none; background: transparent; cursor: pointer;
        }
        .logout-btn:hover { background: rgba(229, 62, 62, 0.2); color: #feb2b2; }

        @media (max-width: 1024px) {
          .sidebar-premium { display: none; }
        }
      `}</style>
    </aside>
  );
};

export default Sidebar;
