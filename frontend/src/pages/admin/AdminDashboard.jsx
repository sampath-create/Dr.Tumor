import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import Navbar from '../../components/Navbar';
import { adminAPI } from '../../services/api';
import { Trash2, UserPlus, Users, Activity, FlaskConical, DollarSign, CheckCircle2 } from 'lucide-react';
import { 
  PieChart, Pie, Cell, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [activeTab, setActiveTab] = useState('stats'); // 'stats' or 'users'
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [selectedUserDashboard, setSelectedUserDashboard] = useState(null);
    const [loadingUserDashboard, setLoadingUserDashboard] = useState(false);
    
    // Create User Form State
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        full_name: '',
        role: 'doctor'
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const statsRes = await adminAPI.getStats();
            setStats(statsRes.data);
        } catch (error) {
            console.error("Error fetching dashboard stats", error);
        }

        try {
            const usersRes = await adminAPI.getAllUsers(0, 1000);
            setUsers(usersRes.data);

            if (!selectedUserId && usersRes.data.length > 0) {
                await handleSelectUser(usersRes.data[0].id);
            }
        } catch (error) {
            console.error("Error fetching users from database", error);
            toast.error('Failed to fetch users from database');
        }
    };

    const handleSelectUser = async (id) => {
        try {
            setSelectedUserId(id);
            setLoadingUserDashboard(true);
            const res = await adminAPI.getUserDashboard(id);
            setSelectedUserDashboard(res.data);
        } catch (error) {
            toast.error('Could not load user dashboard');
            setSelectedUserDashboard(null);
        } finally {
            setLoadingUserDashboard(false);
        }
    };

    const handleDeleteUser = async (id) => {
        if(!window.confirm("Are you sure you want to delete this user?")) return;
        try {
            await adminAPI.deleteUser(id);
            toast.success('User deleted successfully');
            if (selectedUserId === id) {
                setSelectedUserId(null);
                setSelectedUserDashboard(null);
            }
            fetchData();
        } catch (error) {
            toast.error('Failed to delete user');
        }
    }

    const handleVerifyUser = async (id) => {
        try {
            await adminAPI.verifyUser(id);
            toast.success('User approved successfully');
            fetchData();
        } catch (error) {
            toast.error(error?.response?.data?.detail || 'Failed to approve user');
        }
    }

    const handleRejectUser = async (id) => {
        try {
            await adminAPI.rejectUser(id);
            toast.success('User marked as not real');
            fetchData();
        } catch (error) {
            toast.error(error?.response?.data?.detail || 'Failed to reject user');
        }
    }

    // ... existing handleCreateUser ... (keep it if needed, or assume it's further down) -> Wait, I'm replacing the whole file content? No, "replace_string_in_file".
    // I need to be careful. The user request implied *adding* charts. 
    // I will replace the imports and the 'stats' tab content.

    const handleCreateUser = async (e) => {
        e.preventDefault();
        try {
            const payload = new FormData();
            payload.append('email', formData.email);
            payload.append('password', formData.password);
            payload.append('full_name', formData.full_name);
            payload.append('role', formData.role);

            await adminAPI.createUser(payload);
            toast.success('User created successfully');
            setShowCreateModal(false);
            setFormData({ email: '', password: '', full_name: '', role: 'doctor' });
            fetchData();
        } catch (error) {
            toast.error(error?.response?.data?.detail || 'Failed to create user.');
        }
    };
    
    // Helper for rendering charts if stats are available
    const renderCharts = () => {
        if (!stats || !stats.charts) return <div className="p-4 text-center">Loading detailed analytics...</div>;

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                {/* User Roles Pie Chart */}
                <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                    <h3 className="text-lg font-semibold mb-4 text-white bg-slate-800 px-3 py-2 rounded">User Distribution Breakdown</h3>
                    <div className="h-64">
                         <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={stats.charts.user_roles}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {stats.charts.user_roles.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Appointment Status Bar Chart */}
                <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                    <h3 className="text-lg font-semibold mb-4 text-white bg-slate-800 px-3 py-2 rounded">Appointment Status</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.charts.appointment_status}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis allowDecimals={false} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="value" name="Appointments" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                 {/* Lab Requests Status (if applicable) */}
                 {stats.charts.lab_requests && stats.charts.lab_requests.length > 0 && (
                     <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 md:col-span-2">
                                <h3 className="text-lg font-semibold mb-4 text-white bg-slate-800 px-3 py-2 rounded">Lab Request Pipeline</h3>
                        <div className="h-64">
                             <ResponsiveContainer width="100%" height="100%">
                                <BarChart layout="vertical" data={stats.charts.lab_requests}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" allowDecimals={false} />
                                    <YAxis dataKey="name" type="category" width={100} />
                                    <Tooltip />
                                    <Bar dataKey="value" name="Requests" fill="#82ca9d" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                     </div>
                 )}
            </div>
        );
    };

    const usersByRoleChart = ['patient', 'doctor', 'lab_technician', 'pharmacy', 'admin', 'student']
        .map((role) => ({
            name: role.replace('_', ' '),
            value: users.filter((user) => user.role === role).length,
        }))
        .filter((item) => item.value > 0);

    const approvalChart = [
        {
            name: 'Pending Approvals',
            value: users.filter((user) => ['doctor', 'pharmacy'].includes(user.role) && !user.is_verified && !user.is_rejected).length,
        },
        {
            name: 'Approved Staff',
            value: users.filter((user) => ['doctor', 'pharmacy'].includes(user.role) && user.is_verified).length,
        },
        {
            name: 'Rejected',
            value: users.filter((user) => ['doctor', 'pharmacy'].includes(user.role) && user.is_rejected).length,
        },
    ];

    const selectedUser = users.find((user) => user.id === selectedUserId);
    const loggedUsersCount = users.filter((user) => Boolean(user.last_login_at)).length;
    const loggedInLast24h = users.filter((user) => {
        if (!user.last_login_at) return false;
        const diffMs = Date.now() - new Date(user.last_login_at).getTime();
        return diffMs <= 24 * 60 * 60 * 1000;
    }).length;

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                    <div className="bg-white rounded-lg shadow-sm p-1 border border-gray-200">
                        <button
                            onClick={() => setActiveTab('stats')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                activeTab === 'stats' 
                                ? 'bg-blue-600 text-white' 
                                : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            Analytics
                        </button>
                        <button
                            onClick={() => setActiveTab('users')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                activeTab === 'users' 
                                ? 'bg-blue-600 text-white' 
                                : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            Manage Users
                        </button>
                    </div>
                </div>

                {activeTab === 'stats' ? (
                    <div>
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <StatCard 
                                icon={<Users size={24} className="text-blue-600" />}
                                title="Total Users"
                                value={stats?.overview?.total_users || 0}
                                color="bg-blue-50"
                            />
                            <StatCard 
                                icon={<Activity size={24} className="text-green-600" />}
                                title="Appointments"
                                value={stats?.overview?.total_appointments || 0}
                                subValue={`${stats?.overview?.completed_appointments || 0} Completed`}
                                color="bg-green-50"
                            />
                            <StatCard 
                                icon={<FlaskConical size={24} className="text-purple-600" />}
                                title="Prescriptions"
                                value={stats?.overview?.total_prescriptions || 0}
                                color="bg-purple-50"
                            />
                            <StatCard 
                                icon={<DollarSign size={24} className="text-amber-600" />}
                                title="Est. Revenue"
                                value={`Rs.${stats?.overview?.revenue || 0}`}
                                color="bg-amber-50"
                            />
                        </div>

                        {/* Detailed Charts */}
                        {renderCharts()}
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="bg-white border border-gray-100 rounded-lg p-4 shadow-sm">
                                <p className="text-xs text-gray-500">Users Who Logged In</p>
                                <p className="text-2xl font-semibold text-gray-900">{loggedUsersCount}</p>
                            </div>
                            <div className="bg-white border border-gray-100 rounded-lg p-4 shadow-sm">
                                <p className="text-xs text-gray-500">Logged In Last 24 Hours</p>
                                <p className="text-2xl font-semibold text-emerald-700">{loggedInLast24h}</p>
                            </div>
                            <div className="bg-white border border-gray-100 rounded-lg p-4 shadow-sm">
                                <p className="text-xs text-gray-500">Users Never Logged In</p>
                                <p className="text-2xl font-semibold text-amber-700">{users.length - loggedUsersCount}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                                <h3 className="text-sm font-semibold text-white bg-slate-800 px-3 py-2 rounded mb-3">User Role Analysis</h3>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={usersByRoleChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} label>
                                                {usersByRoleChart.map((_, index) => (
                                                    <Cell key={`role-chart-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                                <h3 className="text-sm font-semibold text-white bg-slate-800 px-3 py-2 rounded mb-3">Approval Analysis</h3>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={approvalChart}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="name" />
                                            <YAxis allowDecimals={false} />
                                            <Tooltip />
                                            <Bar dataKey="value" fill="#2563EB" radius={[6, 6, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-100">
                            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                                <div>
                                    <h2 className="text-lg font-semibold text-white bg-slate-800 px-3 py-2 rounded">System Users</h2>
                                    <p className="text-xs text-slate-600 mt-2">Doctor and Pharmacy registrations appear here for admin real-user verification.</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={fetchData}
                                        className="bg-slate-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-900"
                                    >
                                        <Users size={18} /> Refresh DB Users
                                    </button>
                                    <button 
                                        onClick={() => setShowCreateModal(true)}
                                        className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
                                    >
                                        <UserPlus size={18} /> Add User
                                    </button>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-slate-800">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">User</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Role</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Email</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Created</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Last Login</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Login Count</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Approval</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Registration Proof</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {users.map((user) => (
                                            <tr
                                                key={user.id}
                                                onClick={() => handleSelectUser(user.id)}
                                                className={`cursor-pointer hover:bg-blue-50 ${selectedUserId === user.id ? 'bg-blue-50' : ''}`}
                                            >
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold">
                                                            {user.full_name?.charAt(0) || 'U'}
                                                        </div>
                                                        <div className="ml-4">
                                                            <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                        ${user.role === 'admin' ? 'bg-red-100 text-red-800' : 
                                                          user.role === 'doctor' ? 'bg-blue-100 text-blue-800' : 
                                                          'bg-green-100 text-green-800'}`}>
                                                        {user.role}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {user.last_login_at ? new Date(user.last_login_at).toLocaleString() : 'Never'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700">{user.login_count || 0}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    {['doctor', 'pharmacy'].includes(user.role) ? (
                                                        user.is_rejected ? (
                                                            <span className="inline-flex items-center text-rose-700 bg-rose-100 px-2 py-1 rounded-full text-xs font-semibold">
                                                                Not Real
                                                            </span>
                                                        ) : user.is_verified ? (
                                                            <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full text-xs font-semibold">
                                                                <CheckCircle2 size={14} /> Approved
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center text-amber-700 bg-amber-100 px-2 py-1 rounded-full text-xs font-semibold">
                                                                Pending
                                                            </span>
                                                        )
                                                    ) : (
                                                        <span className="text-gray-500 text-xs">N/A</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    {user.verification_document ? (
                                                        <a
                                                            href={user.verification_document}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="text-blue-600 hover:text-blue-800 underline"
                                                        >
                                                            View Proof
                                                        </a>
                                                    ) : (
                                                        <span className="text-gray-500 text-xs">No file</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <div className="flex justify-end items-center gap-3" onClick={(e) => e.stopPropagation()}>
                                                        {['doctor', 'pharmacy'].includes(user.role) && !user.is_verified && !user.is_rejected && (
                                                            <>
                                                                <button onClick={() => handleVerifyUser(user.id)} className="px-2 py-1 rounded text-xs font-semibold text-emerald-700 bg-emerald-100 hover:bg-emerald-200" title="Mark as real user">
                                                                    Real User
                                                                </button>
                                                                <button onClick={() => handleRejectUser(user.id)} className="px-2 py-1 rounded text-xs font-semibold text-rose-700 bg-rose-100 hover:bg-rose-200" title="Mark as not real user">
                                                                    Not Real
                                                                </button>
                                                            </>
                                                        )}
                                                        {['doctor', 'pharmacy'].includes(user.role) && user.is_rejected && (
                                                            <button onClick={() => handleVerifyUser(user.id)} className="px-2 py-1 rounded text-xs font-semibold text-emerald-700 bg-emerald-100 hover:bg-emerald-200" title="Re-approve user">
                                                                Mark Real
                                                            </button>
                                                        )}
                                                        <button onClick={() => handleDeleteUser(user.id)} className="text-red-600 hover:text-red-900" title="Delete user">
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            {loadingUserDashboard ? (
                                <p className="text-sm text-gray-500">Loading selected user dashboard...</p>
                            ) : !selectedUserDashboard ? (
                                <p className="text-sm text-gray-500">Select a user from the list to view detailed dashboard insights.</p>
                            ) : (
                                <div>
                                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-5">
                                        <div>
                                            <h3 className="text-xl font-semibold text-white bg-slate-800 px-3 py-2 rounded inline-block">{selectedUserDashboard.user.full_name}</h3>
                                            <p className="text-sm text-gray-500">{selectedUserDashboard.user.email} • {selectedUserDashboard.user.role}</p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Last login: {selectedUserDashboard.user.last_login_at ? new Date(selectedUserDashboard.user.last_login_at).toLocaleString() : 'Never'}
                                                {' '}• Login count: {selectedUserDashboard.user.login_count || 0}
                                            </p>
                                        </div>
                                        {selectedUser && (
                                            <span className="text-xs font-medium px-3 py-1 rounded-full bg-gray-100 text-gray-700 w-fit">
                                                Account status: {selectedUser.is_rejected ? 'Not Real' : selectedUser.is_verified ? 'Verified' : 'Pending'}
                                            </span>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                                        <StatCardMini label="Appointments" value={selectedUserDashboard.overview.total_appointments} />
                                        <StatCardMini label="Completed Visits" value={selectedUserDashboard.overview.completed_appointments} />
                                        <StatCardMini label="Prescriptions" value={selectedUserDashboard.overview.total_prescriptions} />
                                        <StatCardMini label="Dispensed" value={selectedUserDashboard.overview.dispensed_prescriptions} />
                                        <StatCardMini label="Lab Requests" value={selectedUserDashboard.overview.total_lab_requests} />
                                        <StatCardMini label="Completed Labs" value={selectedUserDashboard.overview.completed_lab_requests} />
                                    </div>

                                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 mb-6">
                                        <h4 className="text-sm font-semibold text-white bg-slate-800 px-3 py-2 rounded mb-3 inline-block">Complete User Profile Data</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 text-sm">
                                            <DetailItem label="Full Name" value={selectedUserDashboard.user.full_name} />
                                            <DetailItem label="Email" value={selectedUserDashboard.user.email} />
                                            <DetailItem label="Role" value={selectedUserDashboard.user.role} />
                                            <DetailItem label="Created At" value={selectedUserDashboard.user.created_at ? new Date(selectedUserDashboard.user.created_at).toLocaleString() : '-'} />
                                            <DetailItem label="Approval Status" value={selectedUserDashboard.user.is_rejected ? 'Not Real' : selectedUserDashboard.user.is_verified ? 'Verified' : 'Pending'} />
                                            <DetailItem label="Last Login" value={selectedUserDashboard.user.last_login_at ? new Date(selectedUserDashboard.user.last_login_at).toLocaleString() : 'Never'} />
                                            <DetailItem label="Login Count" value={selectedUserDashboard.user.login_count || 0} />
                                            <DetailItem label="Last Login IP" value={selectedUserDashboard.user.last_login_ip || '-'} />
                                            <DetailItem label="Gender" value={selectedUserDashboard.user.gender || '-'} />
                                            <DetailItem label="Height" value={selectedUserDashboard.user.height || '-'} />
                                            <DetailItem label="Weight" value={selectedUserDashboard.user.weight || '-'} />
                                            <DetailItem label="Sleep Routine" value={selectedUserDashboard.user.sleep_routine ?? '-'} />
                                        </div>
                                        {selectedUserDashboard.user.verification_document && (
                                            <div className="mt-3 text-sm">
                                                <span className="text-gray-600">Verification Document: </span>
                                                <a
                                                    href={selectedUserDashboard.user.verification_document}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-blue-600 hover:text-blue-800 underline"
                                                >
                                                    View uploaded document
                                                </a>
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                        <MiniBarChart title="Appointment Status" data={selectedUserDashboard.charts.appointment_status} barColor="#2563EB" />
                                        <MiniBarChart title="Prescription Status" data={selectedUserDashboard.charts.prescription_status} barColor="#7C3AED" />
                                        <MiniBarChart title="Lab Status" data={selectedUserDashboard.charts.lab_status} barColor="#0D9488" />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
            
            {/* Create User Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center">
                    <div className="bg-white p-6 rounded-lg shadow-xl w-96">
                        <h3 className="text-lg font-bold mb-4 text-white bg-slate-800 px-3 py-2 rounded">Create New User</h3>
                        <form onSubmit={handleCreateUser}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700">Full Name</label>
                                <input className="border w-full p-2 rounded mt-1" required value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700">Email</label>
                                <input type="email" className="border w-full p-2 rounded mt-1" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700">Password</label>
                                <input type="password" className="border w-full p-2 rounded mt-1" required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700">Role</label>
                                <select className="border w-full p-2 rounded mt-1" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                                    <option value="doctor">Doctor</option>
                                    <option value="pharmacy">Pharmacy</option>
                                </select>
                                <p className="text-xs text-slate-500 mt-1">Admin can add only Doctor and Pharmacy users here.</p>
                            </div>
                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const StatCard = ({ icon, title, value, subValue, color }) => (
    <div className="bg-white overflow-hidden shadow rounded-lg px-4 py-5 sm:p-6 border border-gray-100">
        <div className="flex items-center">
            <div className={`rounded-md p-3 ${color}`}>
                {icon}
            </div>
            <div className="ml-5 w-0 flex-1">
                <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
                <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">{value}</div>
                    {subValue && (
                        <div className="ml-2 flex items-baseline text-sm font-semibold text-gray-600">
                            {subValue}
                        </div>
                    )}
                </dd>
            </div>
        </div>
    </div>
);

const StatCardMini = ({ label, value }) => (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
        <p className="text-xs text-white bg-slate-800 px-2 py-1 rounded inline-block">{label}</p>
        <p className="text-xl font-semibold text-gray-900">{value ?? 0}</p>
    </div>
);

const DetailItem = ({ label, value }) => (
    <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-900 break-words">{value}</p>
    </div>
);

const MiniBarChart = ({ title, data, barColor }) => (
    <div className="rounded-lg border border-gray-200 p-3">
        <h4 className="text-sm font-semibold text-white bg-slate-800 px-3 py-2 rounded mb-2">{title}</h4>
        {data && data.length > 0 ? (
            <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="value" fill={barColor} radius={[6, 6, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        ) : (
            <p className="text-xs text-gray-500">No data available for this user.</p>
        )}
    </div>
);

export default AdminDashboard;
