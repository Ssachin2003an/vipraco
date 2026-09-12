import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import ChatMessage from '../components/ChatMessage.jsx';
import SuggestedQuestions from '../components/SuggestedQuestions.jsx';

export default function Chat() {
  const { user, logout } = useAuth();
  const [messages, setMessages] = useState([
    {
      role: 'bot',
      text: `Hey ${user.first_name}! I'm ProjectAthena, your HR assistant for ${user.org_name} (powered by VipraCo). Ask me anything about your leave, salary, profile, or company policies.`
    }
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const send = async (text) => {
    const question = text ?? input;
    if (!question.trim() || busy) return;
    setMessages((m) => [...m, { role: 'user', text: question }]);
    setInput('');
    setBusy(true);
    try {
      const res = await axios.post('/api/query', { message: question });
      setMessages((m) => [...m, { role: 'bot', text: res.data.reply, animate: true }]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: 'bot', text: err?.response?.data?.error || 'Something went wrong. Please try again.', animate: true }
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="h-screen flex bg-gray-100">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-gray-200 p-5 hidden md:flex md:flex-col">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold text-sm">V</div>
          <span className="font-bold text-gray-900">ProjectAthena</span>
        </div>
        <p className="text-[10px] text-gray-400 mb-3 -mt-1">by VipraCo</p>
        <div className="mb-6 mt-4 p-3 rounded-xl bg-gray-50 border border-gray-100">
          <p className="text-sm font-semibold text-gray-800">{user.first_name} {user.last_name}</p>
          <p className="text-xs text-gray-500">{user.role} · {user.department}</p>
          <p className="text-xs text-brand-600 font-medium mt-1">{user.org_name}</p>
          {user.role === 'Admin' && (
            <Link to="/admin" className="text-xs text-brand-600 hover:underline mt-2 inline-block">
              Open admin panel →
            </Link>
          )}
        </div>
        <div className="flex-1 overflow-y-auto chat-scroll">
          <SuggestedQuestions onPick={send} />
        </div>
        <button
          onClick={logout}
          className="mt-4 text-xs text-gray-400 hover:text-red-600 transition text-left"
        >
          Sign out
        </button>
      </aside>

      {/* Chat area */}
      <main className="flex-1 flex flex-col">
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">ProjectAthena Assistant</h2>
            <p className="text-xs text-gray-400">Multi-tenant HR chat · {user.organization_id}</p>
          </div>
          <button onClick={logout} className="md:hidden text-xs text-gray-400">Sign out</button>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto chat-scroll px-6 py-6">
          <div className="max-w-2xl mx-auto">
            {messages.map((m, i) => (
              <ChatMessage key={i} role={m.role} text={m.text} animate={m.animate} />
            ))}
            {busy && (
              <div className="flex justify-start mb-3">
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm text-gray-400 shadow-sm">
                  ProjectAthena is typing…
                </div>
              </div>
            )}
          </div>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); send(); }}
          className="border-t border-gray-200 bg-white px-6 py-4"
        >
          <div className="max-w-2xl mx-auto flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask ProjectAthena anything about HR..."
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
            />
            <button
              type="submit"
              disabled={busy}
              className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-full text-sm font-medium transition disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}