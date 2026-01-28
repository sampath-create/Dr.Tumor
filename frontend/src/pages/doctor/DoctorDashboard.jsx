import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import Navbar from '../../components/Navbar';
import { appointmentAPI, medicalAPI } from '../../services/api';

const DoctorDashboard = () => {
  const [appointments, setAppointments] = useState([]);
  const [labRequests, setLabRequests] = useState([]);
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [activeView, setActiveView] = useState('list'); // 'list', 'consult'
  const [activeTab, setActiveTab] = useState('appointments'); // 'appointments', 'lab_requests'

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const apptRes = await appointmentAPI.getAll();
      setAppointments(apptRes.data);
      const labRes = await medicalAPI.getLabRequests();
      setLabRequests(labRes.data);
    } catch (error) {
      console.error(error);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await appointmentAPI.updateStatus(id, status);
      toast.success('Appointment status updated');
      fetchData();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleConsultClick = (appt) => {
    setSelectedAppt(appt);
    setActiveView('consult');
  };

  return (
    <div className="min-h-screen bg-cream-50">
      <Navbar role="doctor" />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        
        {/* Top Tabs */}
        <div className="flex border-b mb-6 border-brown-200">
            <button onClick={() => { setActiveTab('appointments'); setActiveView('list'); }} className={`mr-4 pb-2 ${activeTab === 'appointments' ? 'border-b-2 border-brown-600 font-medium text-brown-700' : 'text-brown-400'}`}>Appointments</button>
            <button onClick={() => { setActiveTab('lab_requests'); setActiveView('list'); }} className={`mr-4 pb-2 ${activeTab === 'lab_requests' ? 'border-b-2 border-brown-600 font-medium text-brown-700' : 'text-brown-400'}`}>Lab Reports & Requests</button>
        </div>

        {activeTab === 'appointments' && activeView === 'list' && (
          <div className="bg-white shadow overflow-hidden sm:rounded-md p-6">
            <h3 className="text-lg font-medium text-brown-900 mb-4">Appointments</h3>
             <ul className="divide-y divide-gray-200">
                {appointments.map((appt) => (
                  <li key={appt.id} className="py-4 flex justify-between items-center">
                    <div>
                        <p className="text-sm font-medium text-brown-600">Patient ID: {appt.patient_id}</p>
                        <p className="text-sm text-gray-500">{new Date(appt.date_time).toLocaleString()}</p>
                        <p className="text-sm text-brown-800">Symptoms: {appt.symptoms}</p>
                        <p className="text-sm">Status: <strong className="capitalize text-brown-700">{appt.status}</strong></p>
                    </div>
                    <div className="flex gap-2">
                        {appt.status === 'pending' && (
                            <button onClick={() => updateStatus(appt.id, 'confirmed')} className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700">Confirm</button>
                        )}
                        <button onClick={() => handleConsultClick(appt)} className="bg-brown-600 text-white px-3 py-1 rounded text-sm hover:bg-brown-700">Consult</button>
                    </div>
                  </li>
                ))}
              </ul>
          </div>
        )}

        {activeTab === 'lab_requests' && activeView === 'list' && (
             <LabRequestsList requests={labRequests} />
        )}

        {activeView === 'consult' && selectedAppt && (
           <ConsultationView 
              appt={selectedAppt} 
              onBack={() => { setActiveView('list'); setSelectedAppt(null); fetchData(); }} 
            />
        )}

      </div>
    </div>
  );
};

// Component to list lab requests and view reports
const LabRequestsList = ({ requests }) => {
    const [selectedReport, setSelectedReport] = useState(null);

    const viewReport = async (resultId) => {
        try {
            const res = await medicalAPI.getLabReport(resultId);
            setSelectedReport(res.data);
        } catch (e) {
            toast.error('Could not load report');
        }
    }

    return (
        <div className="bg-white shadow overflow-hidden sm:rounded-md p-6">
            <h3 className="text-lg font-medium text-brown-900 mb-4">Lab Requests & Results</h3>
            {selectedReport ? (
                <div className="bg-cream-50 p-4 rounded border border-brown-200">
                    <button onClick={() => setSelectedReport(null)} className="text-brown-600 mb-2 hover:text-brown-800">&larr; Back to List</button>
                    <h4 className="font-bold text-xl text-brown-800">AI Diagnostic Report</h4>
                    <p className="text-sm text-brown-500">For Request ID: {selectedReport.lab_request_id}</p>
                    <div className="mt-4 p-4 bg-white border border-brown-200 rounded">
                        <p className="font-bold text-lg mb-2 text-brown-700">AI Analysis Result</p>
                        <pre className="whitespace-pre-wrap font-mono text-sm bg-cream-100 p-2 rounded text-brown-900">
                            {JSON.stringify(selectedReport.ai_analysis_result, null, 2)}
                        </pre>
                    </div>
                </div>
            ) : (
                <ul className="divide-y divide-gray-200">
                    {requests.map(req => (
                        <li key={req.id} className="py-4 flex justify-between">
                             <div>
                                <p className="font-medium text-brown-800">Test: {req.test_type}</p>
                                <p className="text-sm text-brown-500">Patient: {req.patient_id}</p>
                                <p className="text-sm">Status: <span className={`px-2 rounded-full text-xs ${req.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{req.status}</span></p>
                             </div>
                             <div>
                                 {req.status === 'completed' && req.result_id && (
                                     <button onClick={() => viewReport(req.result_id)} className="bg-brown-600 text-white px-3 py-1 rounded text-sm hover:bg-brown-700">View AI Report</button>
                                 )}
                             </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}

const ConsultationView = ({ appt, onBack }) => {
    const [medication, setMedication] = useState({ name: '', dosage: '', duration: '', frequency: '' });
    const [medList, setMedList] = useState([]);
    const [labTest, setLabTest] = useState('');

    const addMedicine = () => {
        if (!medication.name) return;
        setMedList([...medList, { medicine_name: medication.name, dosage: medication.dosage, duration: medication.duration, frequency: medication.frequency }]);
        setMedication({ name: '', dosage: '', duration: '', frequency: '' });
    };

    const submitPrescription = async () => {
        try {
            await medicalAPI.createPrescription({
                appointment_id: appt.id,
                patient_id: appt.patient_id,
                medications: medList,
                notes: "Consultation"
            });
            await appointmentAPI.updateStatus(appt.id, 'completed');
            toast.success('Prescription created & Appointment completed');
            onBack();
        } catch (error) {
            toast.error('Error creating prescription');
        }
    };

    const requestLab = async () => {
        try {
            await medicalAPI.createLabRequest({
                appointment_id: appt.id,
                patient_id: appt.patient_id,
                test_type: labTest
            });
            toast.success('Lab Request Sent');
            setLabTest('');
            onBack();
        } catch (error) {
            console.error(error);
            toast.error('Error sending lab request');
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 shadow rounded">
                <button onClick={onBack} className="mb-4 text-brown-600 text-sm hover:text-brown-800">&larr; Back</button>
                <h3 className="text-xl font-bold mb-4 text-brown-900">Patient Consultation</h3>
                <div className="mb-4 p-4 bg-cream-100 rounded border border-brown-200">
                    <p className="text-brown-800"><strong>Symptoms:</strong> {appt.symptoms}</p>
                    <p className="text-brown-800"><strong>Patient ID:</strong> {appt.patient_id}</p>
                    <p className="text-xs text-brown-500 mt-1">Appt ID: {appt.id}</p>
                </div>
                
                <h4 className="font-bold mt-6 mb-2 text-brown-800">Prescribe Medication</h4>
                <div className="space-y-2">
                    <input className="border border-brown-200 p-2 w-full rounded focus:ring-brown-500 focus:border-brown-500" placeholder="Medicine Name" value={medication.name} onChange={e => setMedication({...medication, name: e.target.value})} />
                    <div className="grid grid-cols-3 gap-2">
                         <input className="border border-brown-200 p-2 rounded focus:ring-brown-500 focus:border-brown-500" placeholder="Dosage" value={medication.dosage} onChange={e => setMedication({...medication, dosage: e.target.value})} />
                         <input className="border border-brown-200 p-2 rounded focus:ring-brown-500 focus:border-brown-500" placeholder="Freq" value={medication.frequency} onChange={e => setMedication({...medication, frequency: e.target.value})} />
                         <input className="border border-brown-200 p-2 rounded focus:ring-brown-500 focus:border-brown-500" placeholder="Duration" value={medication.duration} onChange={e => setMedication({...medication, duration: e.target.value})} />
                    </div>
                    <button onClick={addMedicine} className="bg-brown-700 text-white px-4 py-2 rounded w-full hover:bg-brown-800">+ Add Medicine</button>
                    
                    <ul className="mt-4 list-disc pl-4 text-sm text-brown-800">
                        {medList.map((m, i) => (
                            <li key={i}>{m.medicine_name} - {m.dosage} ({m.frequency})</li>
                        ))}
                    </ul>
                    {medList.length > 0 && (
                        <button onClick={submitPrescription} className="bg-brown-600 text-white px-4 py-2 rounded w-full mt-4 hover:bg-brown-700">Send to Pharmacy</button>
                    )}
                </div>
            </div>

            <div className="bg-white p-6 shadow rounded h-fit">
                <h4 className="font-bold mb-4 text-brown-900">Request Lab Tests</h4>
                <p className="text-sm text-brown-500 mb-2">If condition is severe, request tests first. Review results later then prescribe.</p>
                <select className="border border-brown-200 p-2 w-full rounded mb-2 focus:ring-brown-500 focus:border-brown-500" value={labTest} onChange={e => setLabTest(e.target.value)}>
                    <option value="">Select Test Type...</option>
                    <option value="X-Ray">X-Ray</option>
                    <option value="MRI">MRI</option>
                    <option value="CT Scan">CT Scan</option>
                    <option value="Blood Test">Blood Test</option>
                </select>
                <button onClick={requestLab} disabled={!labTest} className="bg-brown-600 text-white px-4 py-2 rounded w-full disabled:bg-gray-300 hover:bg-brown-700">Send Lab Request</button>
            </div>
        </div>
    )
}

export default DoctorDashboard;
