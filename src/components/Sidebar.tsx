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
  Mail
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
      {/* Background blobs for glass effect */}
      <div className="sidebar-mesh">
        <div className="mesh-blob blob-1"></div>
        <div className="mesh-blob blob-2"></div>
      </div>

      <div className="sidebar-content">
        <div className="sidebar-header">
          <div className="brand">
            <div className="logo-icon">
              <Mail size={24} color="white" />
            </div>
            <div className="brand-text">
              <span className="brand-main">MailPlus</span>
              <span className="brand-sub">LPO HUB</span>
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
          background: rgba(255, 255, 255, 0.4);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-right: 1px solid rgba(255, 255, 255, 0.3);
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
          background: var(--mailplus-teal);
          top: -50px; left: -50px;
        }
        .blob-2 {
          width: 150px; height: 150px;
          background: var(--mailplus-light-green);
          bottom: 10%; right: -20px;
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

        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 32px;
        }

        .logo-icon {
          width: 40px; height: 40px;
          background: var(--mailplus-teal);
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 12px rgba(0, 65, 65, 0.2);
        }

        .brand-text {
          display: flex; flex-direction: column;
        }
        .brand-main {
          font-weight: 900; font-size: 1.2rem; color: var(--mailplus-teal);
          letter-spacing: -0.5px; line-height: 1;
        }
        .brand-sub {
          font-size: 0.65rem; font-weight: 800; color: #5b7971;
          letter-spacing: 1px; margin-top: 2px;
        }

        .user-profile-glass {
          background: rgba(255, 255, 255, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.6);
          padding: 16px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          gap: 12px;
          box-shadow: 0 8px 32px rgba(0, 65, 65, 0.05);
        }

        .avatar-ring {
          padding: 3px;
          background: linear-gradient(45deg, var(--mailplus-teal), var(--mailplus-light-green));
          border-radius: 50%;
        }
        .avatar-placeholder {
          width: 36px; height: 36px;
          background: white; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-weight: 900; font-size: 0.75rem; color: var(--mailplus-teal);
        }

        .user-name { font-weight: 800; font-size: 0.85rem; color: var(--mailplus-teal); margin: 0; }
        .lpo-name { font-size: 0.65rem; font-weight: 600; color: #8fa6a0; margin: 0; }

        .sidebar-nav {
          flex: 1;
          padding: 0 16px;
          overflow-y: auto;
        }

        .nav-group {
          margin-bottom: 24px;
        }
        .group-title {
          font-size: 0.65rem; font-weight: 800; color: #8fa6a0;
          text-transform: uppercase; letter-spacing: 1px;
          margin: 0 0 12px 16px;
        }

        .nav-item-glass {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 16px;
          text-decoration: none;
          color: #5b7971;
          font-size: 0.85rem; font-weight: 700;
          border-radius: 14px;
          margin-bottom: 4px;
          transition: all 0.2s;
          border: 1px solid transparent;
        }

        .nav-item-glass:hover {
          background: rgba(255, 255, 255, 0.6);
          color: var(--mailplus-teal);
          transform: translateX(4px);
        }

        .nav-item-glass.active {
          background: var(--mailplus-teal);
          color: white;
          box-shadow: 0 8px 16px rgba(0, 65, 65, 0.15);
        }
        .nav-item-glass.active .nav-icon { color: white; }

        .sidebar-footer {
          padding: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.6);
          background: rgba(255, 255, 255, 0.3);
        }

        .logout-btn {
          width: 100%; border: none; background: transparent; cursor: pointer;
        }
        .logout-btn:hover { background: #fff1f1; color: #c53030; border-color: #ffdada; }

        @media (max-width: 1024px) {
          .sidebar-premium { display: none; }
        }
      `}</style>
    </aside>
  );
};

export default Sidebar;
