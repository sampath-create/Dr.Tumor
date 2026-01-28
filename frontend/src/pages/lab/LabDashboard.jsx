import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import Navbar from '../../components/Navbar';
import { medicalAPI } from '../../services/api';

const LabDashboard = () => {
    const [requests, setRequests] = useState([]);
    const [uploading, setUploading] = useState(null); // ID of request being uploaded
    const [file, setFile] = useState(null);

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            const res = await medicalAPI.getLabRequests();
            setRequests(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleUpload = async (reqId) => {
        if (!file) return;
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('ai_analysis', 'true');

        try {
            await medicalAPI.uploadLabReport(reqId, formData);
            toast.success('Report Uploaded & AI Analysis Requested');
            setFile(null);
            setUploading(null);
            fetchRequests();
        } catch (error) {
            toast.error('Upload failed');
        }
    };

    return (
        <div className="min-h-screen bg-cream-50">
            <Navbar role="lab_technician" />
            <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="bg-white shadow overflow-hidden sm:rounded-md p-6">
                    <h3 className="text-lg font-medium text-brown-900 mb-6">Pending Lab Requests</h3>
                    <ul className="divide-y divide-gray-200">
                        {requests.map(req => (
                             <li key={req.id} className="py-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold text-brown-800">Test: {req.test_type}</p>
                                        <p className="text-sm text-brown-500">Patient ID: {req.patient_id}</p>
                                        <p className="text-sm text-brown-500">Requested by Dr: {req.doctor_id}</p>
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${req.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                            {req.status}
                                        </span>
                                    </div>
                                    {req.status !== 'completed' && (
                                        <div className="ml-4 flex flex-col items-end">
                                            {uploading === req.id ? (
                                                <div className="flex flex-col items-end gap-2">
                                                    <input type="file" onChange={e => setFile(e.target.files[0])} className="text-sm text-brown-600" />
                                                    <div className="flex gap-2">
                                                        <button onClick={() => setUploading(null)} className="text-xs text-red-500">Cancel</button>
                                                        <button onClick={() => handleUpload(req.id)} className="bg-brown-600 text-white px-2 py-1 rounded text-xs hover:bg-brown-700">Confirm Upload</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <button onClick={() => setUploading(req.id)} className="bg-brown-600 text-white px-3 py-1 rounded text-sm hover:bg-brown-700">
                                                    Upload Report
                                                </button>
                                            )}
                                        </div>
                                    )}
                                    {req.status === 'completed' && (
                                        <div className="text-right">
                                            <p className="text-xs text-brown-500">Report ID: {req.result_id}</p>
                                            <span className="text-xs text-green-600 font-bold">AI Analysis Available</span>
                                        </div>
                                    )}
                                </div>
                             </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default LabDashboard;
