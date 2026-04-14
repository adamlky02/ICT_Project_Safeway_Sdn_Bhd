import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Users } from 'lucide-react';

const LandingPage = () => {
    const navigate = useNavigate();

    const handleSelectRole = (role) => {
        navigate('/login', { state: { role } });
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold text-slate-800 mb-2 text-blue-600">Safeway Sdn Bhd</h1>
                <p className="text-gray-500 text-lg">Internal Document AI Assistant</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl w-full">
                {/* Admin Card */}
                <button
                    onClick={() => handleSelectRole('admin')}
                    className="group p-8 bg-white border-2 border-slate-100 rounded-2xl shadow-sm hover:border-blue-500 hover:shadow-xl transition-all text-center"
                >
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <ShieldCheck size={32} />
                    </div>
                    <h2 className="text-xl font-bold mb-2">Administrator</h2>
                    <p className="text-gray-500 text-sm">Manage company documents, handbooks, and system settings.</p>
                </button>

                {/* Staff Card */}
                <button
                    onClick={() => handleSelectRole('staff')}
                    className="group p-8 bg-white border-2 border-slate-100 rounded-2xl shadow-sm hover:border-blue-500 hover:shadow-xl transition-all text-center"
                >
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-green-600 group-hover:text-white transition-colors">
                        <Users size={32} />
                    </div>
                    <h2 className="text-xl font-bold mb-2">Safeway Staff</h2>
                    <p className="text-gray-500 text-sm">Ask questions about HR policies, safety manuals, and procedures.</p>
                </button>
            </div>
        </div>
    );
};

export default LandingPage;