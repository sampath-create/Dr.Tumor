import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import Navbar from '../../components/Navbar';
import { appointmentAPI, medicalAPI } from '../../services/api';

// Cancer Recovery Inspiration Banner Component
const InspirationBanner = () => {
  const slogans = [
    {
      text: "Every day is a new victory in your journey to recovery",
      image: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=250&fit=crop"
    },
    {
      text: "You are stronger than you know, braver than you believe",
      image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=400&h=250&fit=crop"
    },
    {
      text: "Hope is the heartbeat of the soul - keep fighting",
      image: "https://images.unsplash.com/photo-1631815588090-d4bfec5b1ccb?w=400&h=250&fit=crop"
    },
    {
      text: "Cancer picked the wrong warrior - you've got this",
      image: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=400&h=250&fit=crop"
    },
    {
      text: "Healing takes time, and asking for help is a courageous step",
      image: "https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=400&h=250&fit=crop"
    },
    {
      text: "Your story isn't over yet - the best chapters are ahead",
      image: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=400&h=250&fit=crop"
    },
    {
      text: "Together we stand, together we fight, together we win",
      image: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&h=250&fit=crop"
    },
    {
      text: "One step at a time, one day at a time - you're making progress",
      image: "https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=400&h=250&fit=crop"
    }
  ];

  // Duplicate slogans for seamless infinite scroll
  const duplicatedSlogans = [...slogans, ...slogans];

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-slate-800 via-blue-800 to-slate-800 rounded-xl shadow-lg mb-6">
      {/* Decorative pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-0 w-full h-full" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>
      
      {/* Header */}
      <div className="relative bg-gradient-to-r from-slate-900/90 to-blue-900/90 px-6 py-3 text-center border-b border-blue-300/20">
        <h3 className="text-blue-100 font-bold text-lg tracking-wide">
          Cancer Recovery Inspiration
        </h3>
        <p className="text-blue-200/80 text-sm mt-1">Stories of hope, strength, and healing</p>
      </div>

      {/* Scrolling container */}
      <div className="relative py-6 px-4">
        <div 
          className="flex gap-8 animate-scroll"
          style={{
            animation: 'scroll 50s linear infinite',
            width: 'max-content'
          }}
        >
          {duplicatedSlogans.map((item, index) => (
            <div 
              key={index}
              className="relative flex-shrink-0 w-[380px] bg-white/10 backdrop-blur-sm rounded-xl overflow-hidden border border-blue-200/20 hover:bg-white/20 transition-all duration-300 hover:scale-[1.02] cursor-default shadow-xl"
            >
              <img 
                src={item.image} 
                alt="Hope and Recovery" 
                className="w-full h-48 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <p className="text-blue-50 text-xl font-semibold leading-snug drop-shadow-lg">
                  "{item.text}"
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Gradient fades on edges */}
      <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-slate-800 to-transparent pointer-events-none z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-slate-800 to-transparent pointer-events-none z-10" />

      {/* CSS Animation */}
      <style>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-scroll:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
};

const PatientDashboard = () => {
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [labRequests, setLabRequests] = useState([]);
  
  // Booking Form State
  const [symptoms, setSymptoms] = useState('');
  const [dateTime, setDateTime] = useState('');

  const [activeTab, setActiveTab] = useState('appointments');
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [apptRes, rxRes, labRes] = await Promise.all([
        appointmentAPI.getAll(),
        medicalAPI.getPrescriptions(),
        medicalAPI.getLabRequests()
      ]);
      setAppointments(apptRes.data);
      setPrescriptions(rxRes.data);
      setLabRequests(labRes.data);
    } catch (error) {
      console.error("Error fetching patient data", error);
    }
  };

  const handleBookAppointment = async (e) => {
    e.preventDefault();
    try {
      await appointmentAPI.create({
        date_time: new Date(dateTime).toISOString(),
        symptoms: symptoms
      });
      toast.success('Appointment Booked Successfully! A doctor will be assigned based on your symptoms.');
      fetchData();
      setSymptoms('');
      setDateTime('');
    } catch (error) {
      toast.error('Failed to book appointment');
    }
  };

  const viewReport = async (resultId) => {
      try {
          const res = await medicalAPI.getLabReport(resultId);
          setSelectedReport(res.data);
      } catch (e) {
          toast.error('Could not load report');
      }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar role="patient" />
      
      {/* Inspiration Banner */}
      <div className="max-w-7xl mx-auto pt-6 px-4 sm:px-6 lg:px-8">
        <InspirationBanner />
      </div>

      <div className="max-w-7xl mx-auto py-4 sm:px-6 lg:px-8">
        
        {/* Tabs */}
        <div className="flex border-b mb-6 overflow-x-auto border-slate-200">
          <button onClick={() => {setActiveTab('appointments'); setSelectedReport(null);}} className={`mr-4 pb-2 whitespace-nowrap ${activeTab === 'appointments' ? 'border-b-2 border-blue-600 font-medium text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>My Appointments</button>
          <button onClick={() => {setActiveTab('prescriptions'); setSelectedReport(null);}} className={`mr-4 pb-2 whitespace-nowrap ${activeTab === 'prescriptions' ? 'border-b-2 border-blue-600 font-medium text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>Prescriptions</button>
          <button onClick={() => {setActiveTab('labs'); setSelectedReport(null);}} className={`mr-4 pb-2 whitespace-nowrap ${activeTab === 'labs' ? 'border-b-2 border-blue-600 font-medium text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>Lab Reports (AI)</button>
          <button onClick={() => {setActiveTab('book'); setSelectedReport(null);}} className={`mr-4 pb-2 whitespace-nowrap ${activeTab === 'book' ? 'border-b-2 border-blue-600 font-medium text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>Book Appointment</button>
        </div>

        {/* Content */}
        {activeTab === 'appointments' && (
          <div className="bg-white shadow overflow-hidden sm:rounded-md p-6">
            <h3 className="text-lg font-medium text-slate-900 mb-4">My Appointments</h3>
            {appointments.length === 0 ? <p className="text-slate-600">No appointments found.</p> : (
              <ul className="divide-y divide-gray-200">
                {appointments.map((appt) => (
                  <li key={appt.id} className="py-4">
                    <p className="text-sm font-medium text-slate-600">ID: {appt.id}</p>
                    <p className="text-sm text-slate-500">Date: {new Date(appt.date_time).toLocaleString()}</p>
                    <p className="text-sm text-slate-500">Status: <span className={`capitalize ${appt.status === 'confirmed' ? 'text-green-600' : 'text-yellow-600'}`}>{appt.status}</span></p>
                    <p className="text-sm text-slate-500">Symptoms: {appt.symptoms}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {activeTab === 'prescriptions' && (
          <div className="bg-white shadow overflow-hidden sm:rounded-md p-6">
             <h3 className="text-lg font-medium text-slate-900 mb-4">My Prescriptions</h3>
             {prescriptions.length === 0 ? <p>No prescriptions found.</p> : (
              <ul className="divide-y divide-gray-200">
                {prescriptions.map((rx) => (
                  <li key={rx.id} className="py-4">
                    <p className="text-sm font-bold">Doctor ID: {rx.doctor_id}</p>
                    <div className="mt-2 text-sm">
                      {rx.medications.map((med, idx) => (
                        <div key={idx} className="ml-2 border-l-2 pl-2 border-gray-300 mb-1">
                           <span className="font-semibold">{med.medicine_name}</span> - {med.dosage}
                           <span className="text-gray-500 text-xs ml-2">({med.frequency} for {med.duration})</span>
                        </div>
                      ))}
                    </div>
                    <p className="mt-2 text-sm">Status: {rx.is_dispensed ? <span className="text-green-600 font-bold">Dispensed</span> : <span className="text-red-600">Collecting...</span>}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {activeTab === 'labs' && (
             <div className="bg-white shadow overflow-hidden sm:rounded-md p-6">
                <h3 className="text-lg font-medium text-slate-900 mb-4">Lab Requests & Reports</h3>
                
                {selectedReport ? (
                    <div className="bg-slate-50 p-4 rounded border border-slate-200">
                        <button onClick={() => setSelectedReport(null)} className="text-blue-600 mb-2 hover:text-blue-800">&larr; Back</button>
                        <h4 className="font-bold text-xl mb-2 text-slate-800">My Lab Report - AI Analysis</h4>
                        <div className="p-4 bg-white border border-slate-200 rounded">
                             <p className="text-sm text-slate-500">Technician ID: {selectedReport.technician_id}</p>
                             <div className="mt-4">
                                <h5 className="font-bold text-slate-700">Analysis Result:</h5>
                                <pre className="whitespace-pre-wrap text-sm bg-slate-100 p-2 rounded mt-2 text-slate-800">
                                    {JSON.stringify(selectedReport.ai_analysis_result, null, 2)}
                                </pre>
                             </div>
                        </div>
                    </div>
                ) : (
                    labRequests.length === 0 ? <p className="text-slate-600">No lab records found.</p> : (
                        <ul className="divide-y divide-gray-200">
                            {labRequests.map(req => (
                                <li key={req.id} className="py-4 flex justify-between items-center">
                                    <div>
                                        <p className="font-bold text-slate-800">{req.test_type}</p>
                                        <p className="text-sm text-slate-500">Date: {new Date(req.created_at).toLocaleDateString()}</p>
                                        <p className="text-xs text-slate-400">Status: {req.status}</p>
                                    </div>
                                    <div>
                                        {req.status === 'completed' && req.result_id ? (
                                            <button onClick={() => viewReport(req.result_id)} className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">View Report</button>
                                        ) : (
                                            <span className="text-xs text-slate-400">Analysis Pending</span>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )
                )}
             </div>
        )}

        {activeTab === 'book' && (
          <div className="bg-white shadow sm:rounded-md p-6 max-w-lg">
             <h3 className="text-lg font-medium text-slate-900 mb-4">Book New Appointment</h3>
             <p className="text-sm text-slate-600 mb-4">A doctor will be automatically assigned based on your symptoms.</p>
             <form onSubmit={handleBookAppointment}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700">Date & Time</label>
                  <input 
                    type="datetime-local" 
                    className="mt-1 block w-full border-slate-200 rounded-md shadow-sm h-10 border px-2 focus:ring-blue-500 focus:border-blue-500"
                    value={dateTime} onChange={(e) => setDateTime(e.target.value)} required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700">Symptoms</label>
                  <textarea 
                    className="mt-1 block w-full border-slate-200 rounded-md shadow-sm border p-2 focus:ring-blue-500 focus:border-blue-500"
                    rows="3"
                    value={symptoms} onChange={(e) => setSymptoms(e.target.value)} required
                  ></textarea>
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700">
                  Book Appointment
                </button>
             </form>
          </div>
        )}

      </div>
    </div>
  );
};

export default PatientDashboard;
