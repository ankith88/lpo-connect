import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Users, 
  UserPlus, 
  Clock, 
  LayoutDashboard, 
  PlusCircle, 
  MapPin, 
  FileText, 
  TrendingUp, 
  Share2, 
  HelpCircle, 
  LogOut 
} from 'lucide-react';
import { auth } from '../firebase/config';

const Sidebar: React.FC = () => {
  const navItems = [
    { name: 'Customer Hub', icon: Users, path: '/customers' },
    { name: 'Add Customer', icon: UserPlus, path: '/add-customer' },
    { name: 'Pending Customers', icon: Clock, path: '/pending' },
    { name: 'Job Manager', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'New Adhoc Job', icon: PlusCircle, path: '/new-job' },
    { name: 'Service Area', icon: MapPin, path: '/service-area' },
    { name: 'Invoices', icon: FileText, path: '/invoices' },
    { name: 'New Leads', icon: TrendingUp, path: '/leads' },
    { name: 'Share Booking Link', icon: Share2, path: '/share' },
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
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="user-profile">
          <div className="avatar">
            <Users size={24} />
          </div>
          <div className="user-info">
            <p className="user-name">Clarke Kent</p>
            <p className="lpo-name">Rouse Hill LPO</p>
          </div>
        </div>
      </div>
      
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink 
            key={item.path} 
            to={item.path}
            className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
          >
            <item.icon size={20} />
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <NavLink to="/help" className="sidebar-item">
          <HelpCircle size={20} />
          <span>Help & Support</span>
        </NavLink>
        <button className="sidebar-item logout-btn" onClick={handleLogout}>
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>

      <style>{`
        .sidebar {
          width: var(--sidebar-width);
          height: 100vh;
          background-color: #E2EBE2;
          position: fixed;
          left: 0;
          top: 0;
          display: flex;
          flex-direction: column;
          border-right: 1px solid rgba(0,0,0,0.05);
          z-index: 1000;
        }

        .sidebar-header {
          padding: 24px;
        }

        .user-profile {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
        }

        .avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--mailplus-teal);
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .user-name {
          font-weight: 700;
          font-size: 0.95rem;
          color: var(--mailplus-teal);
        }

        .lpo-name {
          font-size: 0.75rem;
          color: #666;
        }

        .sidebar-nav {
          flex: 1;
          padding: 0 12px;
        }

        .sidebar-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          color: #444;
          text-decoration: none;
          font-size: 0.9rem;
          font-weight: 500;
          border-radius: 8px;
          margin-bottom: 4px;
          transition: all 0.2s;
        }

        .sidebar-item:hover {
          background-color: rgba(0, 65, 65, 0.05);
          color: var(--mailplus-teal);
        }

        .sidebar-item.active {
          background-color: #A9BCB0;
          color: var(--mailplus-teal);
          font-weight: 600;
        }

        .sidebar-footer {
          padding: 12px;
          border-top: 1px solid rgba(0,0,0,0.05);
        }

        .logout-btn {
          width: 100%;
          background: none;
          text-align: left;
        }

        @media (max-width: 767px) {
          .sidebar {
            display: none;
          }
        }
      `}</style>
    </aside>
  );
};

export default Sidebar;
