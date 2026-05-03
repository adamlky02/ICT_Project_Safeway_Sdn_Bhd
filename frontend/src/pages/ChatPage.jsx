import React, { useState } from 'react';
import { Send, LogOut, FileText, UserCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ChatPage = () => {
    const navigate = useNavigate();
    const [messages, setMessages] = useState([
        { sender: 'bot', text: 'Hello! I am the Safeway Internal Assistant. You can ask me questions about HR policies, handbooks, or company procedures.' }
    ]);
    const [input, setInput] = useState('');

    const handleSend = () => {
        if (!input.trim()) return;

        const userMsg = { sender: 'user', text: input };
        setMessages([...messages, userMsg]);
        setInput('');

        // Simulate AI Response
        setTimeout(() => {
            setMessages(prev => [...prev, {
                sender: 'bot',
                text: 'Prototype Mode: I am currently being integrated with Safeway documents. Soon, I will use AI to answer this specifically from your manuals.'
            }]);
        }, 800);
    };

    return (
        <div className="flex h-screen bg-slate-50">
            {/* Sidebar */}
            <div className="w-72 bg-slate-900 text-white p-6 hidden md:flex flex-col">
                <h1 className="text-xl font-bold mb-10 text-blue-400">Safeway Assistant</h1>

                <div className="flex-1 space-y-4">
                    <div className="text-xs uppercase text-slate-500 font-bold tracking-wider">Internal Manuals</div>
                    <div className="flex items-center gap-3 text-slate-300 hover:text-white cursor-pointer transition">
                        <FileText size={18} /> <span>Employee Handbook</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-300 hover:text-white cursor-pointer transition">
                        <FileText size={18} /> <span>IT Security Policy</span>
                    </div>
                </div>

                <button
                    onClick={() => navigate('/')}
                    className="flex items-center gap-3 text-red-400 hover:text-red-300 transition mt-auto border-t border-slate-700 pt-4"
                >
                    <LogOut size={18} /> <span>Logout</span>
                </button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col">
                <header className="h-16 bg-white border-b flex items-center justify-between px-8">
                    <div className="font-semibold text-slate-700">Internal Document Chat</div>
                    <button
                        onClick={() => navigate('/profile')}
                        className="flex items-center gap-2 text-slate-600 hover:text-blue-600 transition px-3 py-2 rounded-lg hover:bg-slate-100"
                        title="Open profile"
                    >
                        <UserCircle2 size={20} />
                        <span className="text-sm font-medium">Profile</span>
                    </button>
                </header>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-8 space-y-6">
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-2xl px-5 py-3 rounded-2xl shadow-sm ${
                                msg.sender === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-slate-800 border rounded-tl-none'
                            }`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Input */}
                <div className="p-6 bg-white border-t">
                    <div className="max-w-4xl mx-auto flex gap-4">
                        <input
                            type="text"
                            className="flex-1 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50"
                            placeholder="Ask me about company rules..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                        />
                        <button
                            onClick={handleSend}
                            className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 transition shadow-md shadow-blue-200"
                        >
                            <Send size={20} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatPage;