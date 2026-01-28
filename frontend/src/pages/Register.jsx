import React, { useState, useEffect } from 'react';
import { authAPI, publicAPI } from '../services/api';
import { useNavigate, Link } from 'react-router-dom';

const Register = () => {
  const [formData, setFormData] = useState({
    email: '', full_name: '', password: '', role: 'patient',
    height: '', weight: '', gender: 'Male', sleep_routine: '',
    verification_document: null // New field for file
  });
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

  const handleChange = (e) => {
    if (e.target.name === 'verification_document') {
      setFormData({ ...formData, verification_document: e.target.files[0] });
    } else {
      setFormData({ ...formData, [e.target.name]: e.target.value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Create FormData object
      const data = new FormData();
      Object.keys(formData).forEach(key => {
        if (formData[key] !== null && formData[key] !== '') {
          data.append(key, formData[key]);
        }
      });
      
      await authAPI.register(data);
      navigate('/login');
    } catch (err) {
      setError('Registration failed. Email might be taken or validation error.');
      console.error(err);
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
            Join our platform to experience next-generation healthcare with AI-assisted tumor detection and medical analysis.
          </p>
        </div>
      </div>

      {/* Right Side - Register Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="px-8 py-6 text-left bg-white shadow-lg rounded-xl w-full max-w-md animate-slide-in-right hover:shadow-xl transition-shadow duration-300">
          <div className="lg:hidden text-center mb-6 animate-bounce-in">
            <h1 className="text-3xl font-bold text-brown-700">Dr.Tumor</h1>
            <p className="text-brown-500 text-sm">AI-Powered Medical Diagnosis</p>
          </div>
          <h3 className="text-2xl font-bold text-center text-brown-800 animate-fade-in">Create Account</h3>
          <p className="text-center text-brown-500 text-sm mb-4 animate-fade-in" style={{animationDelay: '0.1s'}}>Join our healthcare platform</p>
          <form onSubmit={handleSubmit} className="animate-slide-up" style={{animationDelay: '0.2s'}}>
          <div className="mt-4">
            <div>
              <label className="block text-brown-700">Full Name</label>
              <input type="text" name="full_name" placeholder="Full Name"
                className="w-full px-4 py-2 mt-2 border border-brown-200 rounded-md focus:outline-none focus:ring-1 focus:ring-brown-500 bg-cream-50"
                onChange={handleChange} required />
            </div>
            <div className="mt-4">
              <label className="block text-brown-700">Email</label>
              <input type="email" name="email" placeholder="Email"
                className="w-full px-4 py-2 mt-2 border border-brown-200 rounded-md focus:outline-none focus:ring-1 focus:ring-brown-500 bg-cream-50"
                onChange={handleChange} required />
            </div>
            <div className="mt-4">
              <label className="block text-brown-700">Role</label>
              <select name="role" className="w-full px-4 py-2 mt-2 border border-brown-200 rounded-md focus:outline-none focus:ring-1 focus:ring-brown-500 bg-cream-50"
                onChange={handleChange} value={formData.role}>
                <option value="patient">Patient</option>
                <option value="doctor">Doctor</option>
                <option value="lab_technician">Lab Technician</option>
                <option value="pharmacy">Pharmacy</option>
              </select>
            </div>

            <div className="mt-4">
              <label className="block text-brown-700">Gender</label>
              <select name="gender" className="w-full px-4 py-2 mt-2 border border-brown-200 rounded-md focus:outline-none focus:ring-1 focus:ring-brown-500 bg-cream-50"
                    onChange={handleChange} value={formData.gender}>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
              </select>
            </div>

            <div className="mt-4">
              <label className="block text-brown-700">Password</label>
              <input type="password" name="password" placeholder="Password"
                className="w-full px-4 py-2 mt-2 border border-brown-200 rounded-md focus:outline-none focus:ring-1 focus:ring-brown-500 bg-cream-50"
                onChange={handleChange} required />
            </div>

            {/* Patient Specific Fields */}
            {formData.role === 'patient' && (
              <div className="mt-4 p-4 bg-cream-100 rounded border border-brown-200 animate-fade-in">
                 <h4 className="text-sm font-bold text-brown-800 mb-2">Patient Details</h4>
                 <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-xs text-brown-700">Sleep Routine</label>
                         <input type="text" name="sleep_routine" placeholder="e.g. 8 hours"
                            className="w-full px-2 py-2 mt-1 border border-brown-200 rounded-md text-sm bg-white"
                            onChange={handleChange} />
                    </div>
                    <div>
                        <label className="block text-xs text-brown-700">Height (cm)</label>
                        <input type="number" name="height" placeholder="Height"
                            className="w-full px-2 py-2 mt-1 border border-brown-200 rounded-md text-sm bg-white"
                            onChange={handleChange} />
                    </div>
                    <div>
                        <label className="block text-xs text-brown-700">Weight (kg)</label>
                        <input type="number" name="weight" placeholder="Weight"
                            className="w-full px-2 py-2 mt-1 border border-brown-200 rounded-md text-sm bg-white"
                            onChange={handleChange} />
                    </div>
                 </div>
              </div>
            )}

            {/* Staff Specific Fields */}
            {['doctor', 'lab_technician', 'pharmacy'].includes(formData.role) && (
              <div className="mt-4 p-4 bg-cream-100 rounded border border-brown-200 animate-fade-in">
                 <h4 className="text-sm font-bold text-brown-800 mb-2">Professional Verification</h4>
                 <div>
                    <label className="block text-xs text-brown-700">Upload Certificate/License (PDF/Image)</label>
                    <input type="file" name="verification_document" accept=".pdf,.jpg,.jpeg,.png"
                        className="w-full px-2 py-2 mt-1 border border-brown-200 rounded-md text-sm bg-white"
                        onChange={handleChange} required />
                 </div>
              </div>
            )}

            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            <div className="flex items-baseline justify-between">
              <button className="px-6 py-2 mt-4 text-white bg-brown-600 rounded-lg hover:bg-brown-800 transform hover:scale-105 transition-all duration-200 active:scale-95">Register</button>
              <Link to="/login" className="text-sm text-brown-600 hover:text-brown-800 hover:underline transition-colors duration-200">Login</Link>
            </div>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
};

export default Register;
