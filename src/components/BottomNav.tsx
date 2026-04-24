import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  Users, 
  LayoutDashboard, 
  PlusCircle, 
  FileText, 
  LogOut 
} from 'lucide-react';
import { auth } from '../firebase/config';

const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const navItems = [
    { name: 'Customers', icon: Users, path: '/customers' },
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'New Job', icon: PlusCircle, path: '/new-job' },
    { name: 'Invoices', icon: FileText, path: '/invoices' },
  ];

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate('/signin');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => (
        <NavLink 
          key={item.path} 
          to={item.path}
          className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
        >
          <item.icon size={24} />
          <span>{item.name}</span>
        </NavLink>
      ))}
      
      <button className="bottom-nav-item logout-btn" onClick={handleLogout}>
        <LogOut size={24} />
        <span>Logout</span>
      </button>

      <style>{`
        .bottom-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: var(--bottom-nav-height);
          background: var(--paper);
          display: flex;
          justify-content: space-around;
          align-items: center;
          border-top: 1px solid var(--cream-warm);
          z-index: 1000;
          padding-bottom: env(safe-area-inset-bottom);
        }

        .bottom-nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          color: var(--ink-soft);
          text-decoration: none;
          font-family: var(--font-ui);
          font-size: 0.6rem;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.16em;
          flex: 1;
          background: none;
          border: none;
          cursor: pointer;
        }

        .bottom-nav-item.active {
          color: var(--ink);
        }

        .bottom-nav-item svg {
          transition: transform 0.2s;
        }

        .bottom-nav-item.active svg {
          transform: translateY(-2px);
        }

        @media (min-width: 768px) {
          .bottom-nav {
            display: none;
          }
        }
      `}</style>
    </nav>
  );
};

export default BottomNav;
