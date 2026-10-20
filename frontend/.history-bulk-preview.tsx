import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ChatHistorySidebar } from './src/components/chat/ChatHistorySidebar';
import { MotionProvider } from './src/components/motion/MotionProvider';
import { deleteSessions } from './src/api/chatHistory';
import './src/index.css';
const ids = ['00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003'];
const initial = ids.map((id, i) => ({ id, user_id: 'test', title: ['Alpha safety', 'Beta handbook', 'Gamma policy'][i], is_archived: false, last_message: 'Synthetic preview conversation' }));
const trace = { requests: [] as unknown[], downloads: [] as string[], confirmations: [] as string[] };
let acceptDelete = false;
let failRequests = false;
const update = () => window.dispatchEvent(new Event('preview-trace'));
const originalFetch = window.fetch.bind(window);
window.fetch = async (input, init) => {
    const url = String(input);
    if (!url.includes('/api/chat-history/')) return originalFetch(input, init);
    const body = init?.body ? JSON.parse(String(init.body)) : null;
    trace.requests.push({ url, method: init?.method || 'GET', body }); update();
    if (failRequests) return new Response(JSON.stringify({ detail: 'Unavailable' }), { status: 404 });
    if (url.endsWith('/sessions/delete')) return new Response(JSON.stringify({ ids: body.session_ids }), { headers: { 'Content-Type': 'application/json' } });
    return new Response('Synthetic TXT export', { headers: { 'Content-Type': 'text/plain' } });
};
HTMLAnchorElement.prototype.click = function () { trace.downloads.push(this.download); update(); };
window.confirm = (message) => { trace.confirmations.push(String(message)); update(); return acceptDelete; };
function Preview() {
    const [sessions, setSessions] = useState(initial);
    const [active, setActive] = useState<string | null>(ids[0]);
    const [snapshot, setSnapshot] = useState('');
    useEffect(() => { const listener = () => setSnapshot(JSON.stringify(trace, null, 2)); window.addEventListener('preview-trace', listener); return () => window.removeEventListener('preview-trace', listener); }, []);
    return <div className="h-screen md:grid md:grid-cols-[20rem_1fr]">
        <ChatHistorySidebar isOpen onClose={() => {}} onEngage={() => {}} sessions={sessions} activeSessionId={active} onSelectSession={setActive} onNewChat={() => setActive(null)} isLoading={false} onRenameSession={() => {}}
            onDeleteSessions={async (selected) => { const result = await deleteSessions(selected); setSessions((current) => current.filter((session) => !result.ids.includes(session.id))); if (active && result.ids.includes(active)) setActive(null); }} />
        <main className="p-8"><h1>Bulk history preview</h1><label className="block"><input type="checkbox" onChange={(event) => { acceptDelete = event.target.checked; }} />Accept deletion confirmation</label><label className="block"><input type="checkbox" onChange={(event) => { failRequests = event.target.checked; }} />Simulate failure</label><p>Active: {active || 'none'}</p><pre aria-label="Test trace" className="whitespace-pre-wrap text-xs">{snapshot}</pre></main>
    </div>;
}
createRoot(document.getElementById('root')!).render(<MotionProvider><Preview /></MotionProvider>);
