import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, BookOpen, FileText } from 'lucide-react';

const Navbar = () => {
    const navigate = useNavigate();
    const token = localStorage.getItem('token');

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    if (!token) return null;

    return (
        <nav className="bg-white shadow-md">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex">
                        <Link to="/dashboard" className="flex-shrink-0 flex items-center text-xl font-bold text-indigo-600">
                            <BookOpen className="mr-2" />
                            SyllabusGen
                        </Link>
                    </div>
                    <div className="flex items-center">
                        <Link to="/dashboard" className="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium">
                            Dashboard
                        </Link>
                        <Link to="/create-syllabus" className="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium">
                            Create New
                        </Link>
                        <button
                            onClick={handleLogout}
                            className="ml-4 flex items-center text-gray-700 hover:text-red-600 px-3 py-2 rounded-md text-sm font-medium"
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            Logout
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
