import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import Navbar from '../components/Navbar';
import { medicalAPI } from '../services/api';

const PharmacyDashboard = () => {
    const [prescriptions, setPrescriptions] = useState([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const res = await medicalAPI.getPrescriptions();
            setPrescriptions(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleDispense = async (id) => {
        try {
            await medicalAPI.dispensePrescription(id);
            toast.success('Medication dispensed successfully');
            fetchData(); // Refresh list
        } catch (error) {
            toast.error('Error dispensing medication');
        }
    };

    return (
        <div className="min-h-screen bg-cream-50">
            <Navbar role="pharmacy" />
            <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="bg-white shadow overflow-hidden sm:rounded-md p-6">
                    <h3 className="text-lg font-medium text-brown-900 mb-6">Pharmacy Queue</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-cream-100">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-brown-500 uppercase tracking-wider">Patient ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-brown-500 uppercase tracking-wider">Doctor ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-brown-500 uppercase tracking-wider">Medications</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-brown-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-brown-500 uppercase tracking-wider">Action</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {prescriptions.map((rx) => (
                                    <tr key={rx.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-brown-900">{rx.patient_id}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-brown-500">{rx.doctor_id}</td>
                                        <td className="px-6 py-4 text-sm text-brown-500">
                                            <ul className="list-disc pl-4">
                                                {rx.medications.map((m, i) => (
                                                    <li key={i}>{m.medicine_name} ({m.dosage})</li>
                                                ))}
                                            </ul>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${rx.is_dispensed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {rx.is_dispensed ? 'Dispensed' : 'Pending'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            {!rx.is_dispensed && (
                                                <button onClick={() => handleDispense(rx.id)} className="text-brown-600 hover:text-brown-900 bg-cream-100 px-3 py-1 rounded">
                                                    Mark as Dispensed
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PharmacyDashboard;
