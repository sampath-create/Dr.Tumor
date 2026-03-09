import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const Navbar = ({ role }) => {
  const { logout, user } = useAuth();

  return (
    <nav className="bg-gradient-to-r from-slate-800 to-blue-900 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <h1 className="text-xl font-bold text-white">Dr.Tumor</h1>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8 items-center">
               <span className="text-blue-100 px-1 pt-1 text-sm font-medium capitalize">
                  {role?.replace('_', ' ')} Dashboard
               </span>
            </div>
          </div>
          <div className="flex items-center">
            <span className="text-blue-100 mr-4 text-sm">Hello, {user?.full_name}</span>
            <button
              onClick={logout}
              className="ml-4 px-4 py-2 rounded-lg text-sm font-medium text-blue-900 bg-white hover:bg-blue-50 focus:outline-none transition-all duration-200 hover:scale-105"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
