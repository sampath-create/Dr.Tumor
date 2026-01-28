import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import Navbar from '../../components/Navbar';
import { appointmentAPI, medicalAPI } from '../../services/api';

const PatientDashboard = () => {
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [labRequests, setLabRequests] = useState([]);
  const [doctors, setDoctors] = useState([]);
  
  // Booking Form State
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [dateTime, setDateTime] = useState('');

  const [activeTab, setActiveTab] = useState('appointments');
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [apptRes, rxRes, docRes, labRes] = await Promise.all([
        appointmentAPI.getAll(),
        medicalAPI.getPrescriptions(),
        medicalAPI.getDoctors(),
        medicalAPI.getLabRequests()
      ]);
      setAppointments(apptRes.data);
      setPrescriptions(rxRes.data);
      setDoctors(docRes.data);
      setLabRequests(labRes.data);
    } catch (error) {
      console.error("Error fetching patient data", error);
    }
  };

  const handleBookAppointment = async (e) => {
    e.preventDefault();
    try {
      await appointmentAPI.create({
        doctor_id: selectedDoctor,
        date_time: new Date(dateTime).toISOString(),
        symptoms: symptoms
      });
      toast.success('Appointment Booked Successfully');
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
    <div className="min-h-screen bg-cream-50">
      <Navbar role="patient" />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        
        {/* Tabs */}
        <div className="flex border-b mb-6 overflow-x-auto border-brown-200">
          <button onClick={() => {setActiveTab('appointments'); setSelectedReport(null);}} className={`mr-4 pb-2 whitespace-nowrap ${activeTab === 'appointments' ? 'border-b-2 border-brown-600 font-medium text-brown-800' : 'text-brown-500 hover:text-brown-700'}`}>My Appointments</button>
          <button onClick={() => {setActiveTab('prescriptions'); setSelectedReport(null);}} className={`mr-4 pb-2 whitespace-nowrap ${activeTab === 'prescriptions' ? 'border-b-2 border-brown-600 font-medium text-brown-800' : 'text-brown-500 hover:text-brown-700'}`}>Prescriptions</button>
          <button onClick={() => {setActiveTab('labs'); setSelectedReport(null);}} className={`mr-4 pb-2 whitespace-nowrap ${activeTab === 'labs' ? 'border-b-2 border-brown-600 font-medium text-brown-800' : 'text-brown-500 hover:text-brown-700'}`}>Lab Reports (AI)</button>
          <button onClick={() => {setActiveTab('book'); setSelectedReport(null);}} className={`mr-4 pb-2 whitespace-nowrap ${activeTab === 'book' ? 'border-b-2 border-brown-600 font-medium text-brown-800' : 'text-brown-500 hover:text-brown-700'}`}>Book Appointment</button>
        </div>

        {/* Content */}
        {activeTab === 'appointments' && (
          <div className="bg-white shadow overflow-hidden sm:rounded-md p-6">
            <h3 className="text-lg font-medium text-brown-900 mb-4">My Appointments</h3>
            {appointments.length === 0 ? <p className="text-brown-600">No appointments found.</p> : (
              <ul className="divide-y divide-gray-200">
                {appointments.map((appt) => (
                  <li key={appt.id} className="py-4">
                    <p className="text-sm font-medium text-brown-600">ID: {appt.id}</p>
                    <p className="text-sm text-brown-500">Date: {new Date(appt.date_time).toLocaleString()}</p>
                    <p className="text-sm text-brown-500">Status: <span className={`capitalize ${appt.status === 'confirmed' ? 'text-green-600' : 'text-yellow-600'}`}>{appt.status}</span></p>
                    <p className="text-sm text-brown-500">Symptoms: {appt.symptoms}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {activeTab === 'prescriptions' && (
          <div className="bg-white shadow overflow-hidden sm:rounded-md p-6">
             <h3 className="text-lg font-medium text-brown-900 mb-4">My Prescriptions</h3>
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
                <h3 className="text-lg font-medium text-brown-900 mb-4">Lab Requests & Reports</h3>
                
                {selectedReport ? (
                    <div className="bg-cream-50 p-4 rounded border border-brown-200">
                        <button onClick={() => setSelectedReport(null)} className="text-brown-600 mb-2 hover:text-brown-800">&larr; Back</button>
                        <h4 className="font-bold text-xl mb-2 text-brown-800">My Lab Report - AI Analysis</h4>
                        <div className="p-4 bg-white border border-brown-200 rounded">
                             <p className="text-sm text-brown-500">Technician ID: {selectedReport.technician_id}</p>
                             <div className="mt-4">
                                <h5 className="font-bold text-brown-700">Analysis Result:</h5>
                                <pre className="whitespace-pre-wrap text-sm bg-cream-100 p-2 rounded mt-2 text-brown-800">
                                    {JSON.stringify(selectedReport.ai_analysis_result, null, 2)}
                                </pre>
                             </div>
                        </div>
                    </div>
                ) : (
                    labRequests.length === 0 ? <p className="text-brown-600">No lab records found.</p> : (
                        <ul className="divide-y divide-gray-200">
                            {labRequests.map(req => (
                                <li key={req.id} className="py-4 flex justify-between items-center">
                                    <div>
                                        <p className="font-bold text-brown-800">{req.test_type}</p>
                                        <p className="text-sm text-brown-500">Date: {new Date(req.created_at).toLocaleDateString()}</p>
                                        <p className="text-xs text-brown-400">Status: {req.status}</p>
                                    </div>
                                    <div>
                                        {req.status === 'completed' && req.result_id ? (
                                            <button onClick={() => viewReport(req.result_id)} className="bg-brown-600 text-white px-3 py-1 rounded text-sm hover:bg-brown-700">View Report</button>
                                        ) : (
                                            <span className="text-xs text-brown-400">Analysis Pending</span>
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
             <h3 className="text-lg font-medium text-brown-900 mb-4">Book New Appointment</h3>
             <form onSubmit={handleBookAppointment}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-brown-700">Select Doctor</label>
                  <select 
                    className="mt-1 block w-full border-brown-200 rounded-md shadow-sm h-10 border px-2 focus:ring-brown-500 focus:border-brown-500"
                    value={selectedDoctor} onChange={(e) => setSelectedDoctor(e.target.value)} required
                  >
                    <option value="">Choose a doctor...</option>
                    {doctors.map(doc => (
                      <option key={doc.id} value={doc.id}>{doc.full_name}</option>
                    ))}
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-brown-700">Date & Time</label>
                  <input 
                    type="datetime-local" 
                    className="mt-1 block w-full border-brown-200 rounded-md shadow-sm h-10 border px-2 focus:ring-brown-500 focus:border-brown-500"
                    value={dateTime} onChange={(e) => setDateTime(e.target.value)} required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-brown-700">Symptoms</label>
                  <textarea 
                    className="mt-1 block w-full border-brown-200 rounded-md shadow-sm border p-2 focus:ring-brown-500 focus:border-brown-500"
                    rows="3"
                    value={symptoms} onChange={(e) => setSymptoms(e.target.value)} required
                  ></textarea>
                </div>
                <button type="submit" className="w-full bg-brown-600 text-white py-2 px-4 rounded-md hover:bg-brown-700">
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
