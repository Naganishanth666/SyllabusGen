import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { Plus, FileText, Loader, Search, Filter, ArrowUpDown, Database, Cpu, Cloud, Network, Code, Server, Zap, Laptop, Smartphone, BookOpen } from 'lucide-react';

// A collection of vibrant gradients for the dynamic icons
const gradients = [
    { bg: 'from-indigo-500 to-purple-600', shadow: 'shadow-indigo-500/40' },
    { bg: 'from-blue-400 to-cyan-500', shadow: 'shadow-blue-400/40' },
    { bg: 'from-emerald-400 to-teal-500', shadow: 'shadow-emerald-400/40' },
    { bg: 'from-orange-400 to-rose-400', shadow: 'shadow-orange-400/40' },
    { bg: 'from-pink-500 to-rose-500', shadow: 'shadow-pink-500/40' },
    { bg: 'from-violet-500 to-fuchsia-500', shadow: 'shadow-violet-500/40' },
];

const icons = [Database, Cpu, Cloud, Network, Code, Server, Zap, Laptop, Smartphone, BookOpen];

// A sleek swooping wave to place inside each card
const CardWave = () => (
    <svg className="absolute bottom-0 left-0 w-full h-auto text-indigo-50/50 pointer-events-none" viewBox="0 0 1440 320" preserveAspectRatio="none">
       <path fill="currentColor" fillOpacity="1" d="M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,128C672,128,768,160,864,170.7C960,181,1056,171,1152,149.3C1248,128,1344,96,1392,80L1440,64L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
    </svg>
);

const Dashboard = () => {
    const [syllabi, setSyllabi] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchSyllabi();
    }, []);

    const fetchSyllabi = async () => {
        try {
            const response = await api.get('/syllabus');
            setSyllabi(response.data);
        } catch (err) {
            console.error('Error fetching syllabi:', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredSyllabi = syllabi.filter(s => 
        s.course_title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.course_code.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[60vh]">
                <Loader className="animate-spin h-8 w-8 text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-12">
            {/* Ambient Background Gradient for the page */}
            <div className="fixed inset-0 z-[-1] bg-gradient-to-br from-indigo-50 via-white to-purple-50" />

            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 pt-6">
                <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">My Syllabi</h1>
                <Link
                    to="/create-syllabus"
                    className="inline-flex items-center px-5 py-2.5 border border-transparent text-sm font-semibold rounded-lg shadow-md text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transform transition-all hover:scale-105"
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Create New Syllabus
                </Link>
            </div>

            {/* Action Toolbar */}
            <div className="bg-white/60 backdrop-blur-md border border-white/20 p-4 rounded-2xl shadow-sm mb-8 flex flex-col md:flex-row gap-4 justify-between items-center">
                
                {/* Search Bar */}
                <div className="relative w-full md:w-1/2 lg:w-1/3">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-10 pr-3 py-2.5 border-transparent text-sm bg-slate-100/80 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all shadow-inner"
                        placeholder="Search syllabi..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                
                {/* Filters */}
                <div className="flex gap-3 w-full md:w-auto">
                    <button className="flex flex-1 md:flex-none items-center justify-center px-4 py-2 border border-slate-200 shadow-sm text-sm font-medium rounded-xl text-slate-700 bg-white hover:bg-slate-50 transition-colors">
                        <Filter className="mr-2 h-4 w-4 text-indigo-500" />
                        Filter
                    </button>
                    <button className="flex flex-1 md:flex-none items-center justify-center px-4 py-2 border border-slate-200 shadow-sm text-sm font-medium rounded-xl text-slate-700 bg-white hover:bg-slate-50 transition-colors">
                        <ArrowUpDown className="mr-2 h-4 w-4 text-indigo-500" />
                        Sort
                    </button>
                    <button className="flex flex-1 md:flex-none items-center justify-center px-4 py-2 border border-slate-200 shadow-sm text-sm font-medium rounded-xl text-slate-700 bg-white hover:bg-slate-50 transition-colors">
                        <Filter className="mr-2 h-4 w-4 text-slate-400" />
                        Filters <span className="ml-1 text-slate-400 text-xs">▼</span>
                    </button>
                </div>
            </div>

            {syllabi.length === 0 ? (
                <div className="text-center py-16 bg-white/80 backdrop-blur-sm rounded-3xl shadow-sm border border-slate-100">
                    <FileText className="mx-auto h-14 w-14 text-indigo-300 mb-4" />
                    <h3 className="text-lg font-bold text-slate-800">No syllabi yet</h3>
                    <p className="mt-1 text-sm text-slate-500">Get started by creating a new curriculum.</p>
                    <div className="mt-6">
                        <Link
                            to="/create-syllabus"
                            className="inline-flex items-center px-5 py-2.5 shadow-md text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all"
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Create New Syllabus
                        </Link>
                    </div>
                </div>
            ) : filteredSyllabi.length === 0 ? (
                <div className="text-center py-16">
                    <p className="text-slate-500">No syllabi found matching "{searchQuery}"</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredSyllabi.map((syllabus) => {
                        // Dynamically assign an icon and gradient purely for visual aesthetics based on ID
                        const theme = gradients[syllabus.id % gradients.length];
                        const IconComponent = icons[syllabus.id % icons.length];

                        return (
                            <Link
                                key={syllabus.id}
                                to={`/syllabus/${syllabus.id}`}
                                className="group relative block bg-white overflow-hidden shadow-sm rounded-3xl hover:shadow-xl transition-all duration-300 border border-slate-100 transform hover:-translate-y-1"
                            >
                                {/* Aesthetic absolute waves */}
                                <CardWave />

                                <div className="relative z-10 p-6 flex flex-col h-full">
                                    
                                    {/* Icon & Title Row */}
                                    <div className="flex items-center mb-6">
                                        <div className={`flex-shrink-0 flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br ${theme.bg} shadow-lg ${theme.shadow} text-white transform group-hover:scale-110 transition-transform`}>
                                            <IconComponent className="h-6 w-6" strokeWidth={2.5} />
                                        </div>
                                        <div className="ml-4 overflow-hidden">
                                            <h3 className="text-[17px] font-bold text-slate-900 truncate tracking-tight">
                                                {syllabus.course_title}
                                            </h3>
                                            <p className="mt-0.5 text-xs font-medium text-slate-400 capitalize truncate">
                                                {syllabus.course_code} - {syllabus.department}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Footer details aligned to bottom */}
                                    <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between text-xs font-medium text-slate-500">
                                        <div className="flex items-center">
                                            <FileText className="flex-shrink-0 mr-1.5 h-3.5 w-3.5 text-slate-400" />
                                            <span>{syllabus.duration} Hours</span>
                                        </div>
                                        <span className="text-slate-400">
                                            Created: {new Date(syllabus.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default Dashboard;
