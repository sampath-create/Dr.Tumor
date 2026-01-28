import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { publicAPI } from '../services/api';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [stats, setStats] = useState({ patients: 0, doctors: 0, lab_reports_analyzed: 0, accuracy_rate: 98 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await publicAPI.getStats();
        setStats(res.data);
      } catch (err) {
        console.error("Could not fetch stats");
      }
    };
    fetchStats();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError('Invalid credentials');
    }
  };

  return (
    <div className="flex min-h-screen bg-cream-50 overflow-hidden">
      {/* Left Side - Branding & Analytics */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-brown-700 to-brown-900 flex-col justify-center items-center p-12">
        <div className="text-center animate-fade-in">
          <h1 className="text-5xl font-bold text-white mb-2 animate-slide-up">Dr.Tumor</h1>
          <p className="text-cream-100 text-lg mb-8 animate-slide-up" style={{animationDelay: '0.1s'}}>AI-Powered Medical Diagnosis System</p>
          
          <div className="grid grid-cols-2 gap-6 mt-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center animate-scale-in hover:scale-105 transition-transform duration-300" style={{animationDelay: '0.2s'}}>
              <p className="text-4xl font-bold text-cream-100">{stats.patients}</p>
              <p className="text-cream-200 text-sm">Active Patients</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center animate-scale-in hover:scale-105 transition-transform duration-300" style={{animationDelay: '0.3s'}}>
              <p className="text-4xl font-bold text-cream-100">{stats.doctors}</p>
              <p className="text-cream-200 text-sm">Expert Doctors</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center animate-scale-in hover:scale-105 transition-transform duration-300" style={{animationDelay: '0.4s'}}>
              <p className="text-4xl font-bold text-cream-100">{stats.lab_reports_analyzed}</p>
              <p className="text-cream-200 text-sm">Lab Reports Analyzed</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center animate-scale-in hover:scale-105 transition-transform duration-300" style={{animationDelay: '0.5s'}}>
              <p className="text-4xl font-bold text-cream-100">{stats.accuracy_rate}%</p>
              <p className="text-cream-200 text-sm">Accuracy Rate</p>
            </div>
          </div>
          
          <p className="text-cream-200 text-sm mt-8 max-w-md animate-fade-in" style={{animationDelay: '0.6s'}}>
            Leveraging cutting-edge AI technology for early tumor detection and comprehensive medical diagnostics.
          </p>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="px-8 py-6 text-left bg-white shadow-lg rounded-xl w-full max-w-md animate-slide-in-right hover:shadow-xl transition-shadow duration-300">
          <div className="lg:hidden text-center mb-6 animate-bounce-in">
            <h1 className="text-3xl font-bold text-brown-700">Dr.Tumor</h1>
            <p className="text-brown-500 text-sm">AI-Powered Medical Diagnosis</p>
          </div>
          <h3 className="text-2xl font-bold text-center text-brown-800 animate-fade-in">Welcome Back</h3>
          <p className="text-center text-brown-500 text-sm mb-4 animate-fade-in" style={{animationDelay: '0.1s'}}>Sign in to your account</p>
          <form onSubmit={handleSubmit} className="animate-slide-up" style={{animationDelay: '0.2s'}}>
          <div className="mt-4">
            <div>
              <label className="block text-brown-700" htmlFor="email">Email</label>
              <input type="text" placeholder="Email"
                className="w-full px-4 py-2 mt-2 border border-brown-200 rounded-md focus:outline-none focus:ring-1 focus:ring-brown-500 bg-cream-50"
                value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="mt-4">
              <label className="block text-brown-700">Password</label>
              <input type="password" placeholder="Password"
                className="w-full px-4 py-2 mt-2 border border-brown-200 rounded-md focus:outline-none focus:ring-1 focus:ring-brown-500 bg-cream-50"
                value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            <div className="flex items-baseline justify-between">
              <button className="px-6 py-2 mt-4 text-white bg-brown-600 rounded-lg hover:bg-brown-800 transform hover:scale-105 transition-all duration-200 active:scale-95">Login</button>
              <Link to="/register" className="text-sm text-brown-600 hover:text-brown-800 hover:underline transition-colors duration-200">Register</Link>
            </div>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
};
export default Login;
