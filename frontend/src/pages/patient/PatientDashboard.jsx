import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import Navbar from '../../components/Navbar';
import { appointmentAPI, medicalAPI } from '../../services/api';

const CarePrinciplesBanner = () => {
  const principles = [
    {
      title: 'Evidence-Based Guidance',
      text: 'Your reports and recommendations are presented with clinical context to support informed decisions with your doctor.'
    },
    {
      title: 'Continuous Care Tracking',
      text: 'Appointments, prescriptions, and lab outcomes are organized in one timeline so your next step is always clear.'
    },
    {
      title: 'Human-Centered Support',
      text: 'Technology assists your journey, but treatment decisions stay in the hands of qualified medical professionals.'
    }
  ];

  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 shadow-sm mb-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(56,189,248,0.22),_transparent_55%)]" />
      <div className="relative p-6 md:p-8">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-sky-200">Patient Care Center</p>
          <h2 className="mt-2 text-2xl md:text-3xl font-semibold text-white">Professional, coordinated support for every stage of your treatment journey</h2>
          <p className="mt-3 text-slate-100 text-sm md:text-base">
            Access your clinical workflow in one place, from appointment requests to AI-assisted reports and pharmacy-ready prescriptions.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {principles.map((item) => (
            <article key={item.title} className="rounded-xl border border-slate-600 bg-slate-800/70 p-4">
              <h3 className="text-sm font-semibold text-white">{item.title}</h3>
              <p className="mt-2 text-sm text-slate-100 leading-relaxed">{item.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
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
      toast.success('Appointment request sent to all doctors. You will be notified once one accepts.');
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

  const latestAcceptedAppointment = appointments
    .filter((appt) => appt.status === 'confirmed' && appt.doctor_id && appt.accepted_at)
    .sort((a, b) => new Date(b.accepted_at) - new Date(a.accepted_at))[0];

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar role="patient" />
      
      {/* Inspiration Banner */}
      <div className="max-w-7xl mx-auto pt-6 px-4 sm:px-6 lg:px-8">
        <CarePrinciplesBanner />
      </div>

      <div className="max-w-7xl mx-auto py-4 sm:px-6 lg:px-8">
        {latestAcceptedAppointment && (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900">
            <p className="text-sm font-semibold">Appointment accepted</p>
            <p className="text-sm">
              Dr. {latestAcceptedAppointment.doctor_name || latestAcceptedAppointment.doctor_id} accepted your appointment on{' '}
              {new Date(latestAcceptedAppointment.accepted_at).toLocaleString()}.
            </p>
          </div>
        )}
        
        {/* Tabs */}
        <div className="flex border-b mb-6 overflow-x-auto border-slate-200">
          <button onClick={() => {setActiveTab('appointments'); setSelectedReport(null);}} className={`mr-4 pb-2 px-2 whitespace-nowrap ${activeTab === 'appointments' ? 'border-b-2 border-blue-600 font-medium text-white bg-slate-800 rounded-t' : 'text-slate-500 hover:text-slate-700'}`}>My Appointments</button>
          <button onClick={() => {setActiveTab('prescriptions'); setSelectedReport(null);}} className={`mr-4 pb-2 px-2 whitespace-nowrap ${activeTab === 'prescriptions' ? 'border-b-2 border-blue-600 font-medium text-white bg-slate-800 rounded-t' : 'text-slate-500 hover:text-slate-700'}`}>Prescriptions</button>
          <button onClick={() => {setActiveTab('labs'); setSelectedReport(null);}} className={`mr-4 pb-2 px-2 whitespace-nowrap ${activeTab === 'labs' ? 'border-b-2 border-blue-600 font-medium text-white bg-slate-800 rounded-t' : 'text-slate-500 hover:text-slate-700'}`}>Lab Reports (AI)</button>
          <button onClick={() => {setActiveTab('book'); setSelectedReport(null);}} className={`mr-4 pb-2 px-2 whitespace-nowrap ${activeTab === 'book' ? 'border-b-2 border-blue-600 font-medium text-white bg-slate-800 rounded-t' : 'text-slate-500 hover:text-slate-700'}`}>Book Appointment</button>
        </div>

        {/* Content */}
        {activeTab === 'appointments' && (
          <div className="bg-white shadow overflow-hidden sm:rounded-md p-6">
            <h3 className="text-lg font-medium text-white bg-slate-800 px-3 py-2 rounded mb-4">My Appointments</h3>
            {appointments.length === 0 ? <p className="text-slate-600">No appointments found.</p> : (
              <ul className="divide-y divide-gray-200">
                {appointments.map((appt) => (
                  <li key={appt.id} className="py-4">
                    <p className="text-sm font-medium text-slate-600">ID: {appt.id}</p>
                    <p className="text-sm text-slate-500">Date: {new Date(appt.date_time).toLocaleString()}</p>
                    <p className="text-sm text-slate-500">Status: <span className={`capitalize ${appt.status === 'confirmed' ? 'text-green-600' : 'text-yellow-600'}`}>{appt.status}</span></p>
                    {appt.status === 'pending' && !appt.doctor_id && (
                      <p className="text-xs text-blue-600">Waiting for a doctor to accept this request.</p>
                    )}
                    {appt.doctor_id && (
                      <p className="text-xs text-slate-500">Assigned doctor: Dr. {appt.doctor_name || appt.doctor_id}</p>
                    )}
                    {appt.accepted_at && (
                      <p className="text-xs text-emerald-700">Accepted on: {new Date(appt.accepted_at).toLocaleString()}</p>
                    )}
                    <p className="text-sm text-slate-500">Symptoms: {appt.symptoms}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {activeTab === 'prescriptions' && (
          <div className="bg-white shadow overflow-hidden sm:rounded-md p-6">
             <h3 className="text-lg font-medium text-white bg-slate-800 px-3 py-2 rounded mb-4">My Prescriptions</h3>
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
          <h3 className="text-lg font-medium text-white bg-slate-800 px-3 py-2 rounded mb-4">Lab Requests & Reports</h3>
                
                {selectedReport ? (
                    <div className="bg-slate-50 p-4 rounded border border-slate-200">
                        <button onClick={() => setSelectedReport(null)} className="text-blue-600 mb-2 hover:text-blue-800">&larr; Back</button>
                    <h4 className="font-bold text-xl mb-2 text-white bg-slate-800 px-3 py-2 rounded">My Lab Report - AI Analysis</h4>
                        <div className="p-4 bg-white border border-slate-200 rounded">
                             <p className="text-sm text-slate-500">Technician ID: {selectedReport.technician_id}</p>
                             <div className="mt-4">
                                <h5 className="font-bold text-white bg-slate-800 px-2 py-1 rounded inline-block">Analysis Result:</h5>
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
             <h3 className="text-lg font-medium text-white bg-slate-800 px-3 py-2 rounded mb-4">Book New Appointment</h3>
             <p className="text-sm text-slate-600 mb-4">Your request will be sent to all doctors. The first available doctor can accept it.</p>
             <form onSubmit={handleBookAppointment}>
                <div className="mb-4">
                  <label className="inline-block text-sm font-medium text-white bg-slate-800 px-2 py-1 rounded">Date & Time</label>
                  <input 
                    type="datetime-local" 
                    className="mt-1 block w-full border-slate-200 rounded-md shadow-sm h-10 border px-2 focus:ring-blue-500 focus:border-blue-500"
                    value={dateTime} onChange={(e) => setDateTime(e.target.value)} required
                  />
                </div>
                <div className="mb-4">
                  <label className="inline-block text-sm font-medium text-white bg-slate-800 px-2 py-1 rounded">Symptoms</label>
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
