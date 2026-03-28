'use client';
import { useEffect, useState } from 'react';

interface Lead { id: string; name: string; email: string; company: string; status: string; score: number; created_at: string; campaign_id: string; }
interface RevenueRecord { id: string; amount_cents: number; mrr_cents: number; status: string; type: string; paid_at: string; }
interface Reply { id: string; from_email: string; classification: string; sentiment: string; suggested_reply: string; approved: boolean; created_at: string; }
interface Feedback { stats: { avg_rating: number; nps_score: number; promoters: number; detractors: number; total: number; }; }
interface Referral { id: string; referral_code: string; total_referred: number; total_earned_cents: number; }

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-500/20 text-blue-300',
  contacted: 'bg-yellow-500/20 text-yellow-300',
  qualified: 'bg-green-500/20 text-green-300',
  closed_won: 'bg-emerald-500/20 text-emerald-300',
  closed_lost: 'bg-red-500/20 text-red-300',
};
const CLASS_COLORS: Record<string, string> = {
  interested: 'text-green-400',
  objection: 'text-yellow-400',
  not_interested: 'text-red-400',
  question: 'text-blue-400',
  out_of_office: 'text-gray-400',
};

export default function RevenuePage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [revenue, setRevenue] = useState<RevenueRecord[]>([]);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [tab, setTab] = useState<'leads' | 'revenue' | 'replies' | 'feedback' | 'referrals'>('leads');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [l, r, rep, fb, ref] = await Promise.all([
          fetch('/api/leads').then(r => r.json()),
          fetch('/api/revenue').then(r => r.json()),
          fetch('/api/replies').then(r => r.json()),
          fetch('/api/feedback').then(r => r.json()),
          fetch('/api/referrals').then(r => r.json()),
        ]);
        setLeads(l.leads || []);
        setRevenue(r.revenue || []);
        setReplies(rep.replies || []);
        setFeedback(fb || null);
        setReferrals(ref.referrals || []);
      } catch { /* ignore */ }
      setLoading(false);
    }
    load();
  }, []);

  const totalMrr = revenue.filter(r => r.status === 'paid' && r.type === 'subscription').reduce((s, r) => s + r.mrr_cents, 0);
  const totalRevenue = revenue.filter(r => r.status === 'paid').reduce((s, r) => s + r.amount_cents, 0);
  const pendingReplies = replies.filter(r => !r.approved && ['interested', 'objection', 'question'].includes(r.classification)).length;

  async function approveReply(id: string) {
    await fetch(`/api/replies/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ approved: true }) });
    setReplies(prev => prev.map(r => r.id === id ? { ...r, approved: true } : r));
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-amber-400">Revenue Engine</h1>
          <p className="text-gray-400 mt-1">Leads → Pipeline → Revenue → Retention</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { label: 'Total MRR', value: `$${(totalMrr / 100).toFixed(0)}`, color: 'text-emerald-400' },
            { label: 'Total Revenue', value: `$${(totalRevenue / 100).toFixed(0)}`, color: 'text-amber-400' },
            { label: 'Total Leads', value: leads.length, color: 'text-blue-400' },
            { label: 'Replies to Review', value: pendingReplies, color: pendingReplies > 0 ? 'text-yellow-400' : 'text-gray-400' },
            { label: 'NPS Score', value: feedback?.stats?.nps_score ?? '--', color: 'text-purple-400' },
          ].map(k => (
            <div key={k.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">{k.label}</p>
              <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-800 pb-2">
          {(['leads', 'revenue', 'replies', 'feedback', 'referrals'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-t-lg text-sm font-medium capitalize transition-colors ${
                tab === t ? 'bg-amber-500/20 text-amber-400 border-b-2 border-amber-400' : 'text-gray-500 hover:text-gray-300'
              }`}>
              {t}{t === 'replies' && pendingReplies > 0 ? ` (${pendingReplies})` : ''}
            </button>
          ))}
        </div>

        {loading && <div className="text-center text-gray-500 py-12">Loading...</div>}

        {/* LEADS TAB */}
        {!loading && tab === 'leads' && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-800 text-gray-500">
                <th className="text-left p-3">Name</th><th className="text-left p-3">Email</th>
                <th className="text-left p-3">Company</th><th className="text-left p-3">Status</th>
                <th className="text-left p-3">Score</th><th className="text-left p-3">Date</th>
              </tr></thead>
              <tbody>{leads.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-600">No leads yet. Share your landing pages!</td></tr>
              ) : leads.map(l => (
                <tr key={l.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="p-3">{l.name || '—'}</td>
                  <td className="p-3 text-blue-400">{l.email}</td>
                  <td className="p-3">{l.company || '—'}</td>
                  <td className="p-3"><span className={`px-2 py-0.5 rounded text-xs ${STATUS_COLORS[l.status] || 'text-gray-400'}`}>{l.status}</span></td>
                  <td className="p-3">{l.score || 0}</td>
                  <td className="p-3 text-gray-500">{new Date(l.created_at).toLocaleDateString()}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}

        {/* REPLIES TAB */}
        {!loading && tab === 'replies' && (
          <div className="space-y-3">
            {replies.length === 0 ? <p className="text-gray-600 text-center py-8">No email replies yet.</p>
            : replies.map(r => (
              <div key={r.id} className={`bg-gray-900 border rounded-xl p-4 ${!r.approved && ['interested','objection','question'].includes(r.classification) ? 'border-yellow-500/40' : 'border-gray-800'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-sm font-medium ${CLASS_COLORS[r.classification] || 'text-gray-400'}`}>{r.classification}</span>
                      <span className="text-gray-600 text-xs">• {r.sentiment}</span>
                      <span className="text-gray-600 text-xs">• {r.from_email}</span>
                    </div>
                    {r.suggested_reply && (
                      <div className="mt-2 p-3 bg-gray-800 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Suggested reply:</p>
                        <p className="text-sm text-gray-200">{r.suggested_reply}</p>
                      </div>
                    )}
                  </div>
                  {!r.approved && (
                    <button onClick={() => approveReply(r.id)}
                      className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-black rounded text-xs font-medium">
                      Approve
                    </button>
                  )}
                  {r.approved && <span className="text-green-400 text-xs">✓ Approved</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* FEEDBACK TAB */}
        {!loading && tab === 'feedback' && feedback?.stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'NPS Score', value: feedback.stats.nps_score, suffix: '' },
              { label: 'Avg Rating', value: feedback.stats.avg_rating, suffix: '/10' },
              { label: 'Promoters', value: feedback.stats.promoters, suffix: '' },
              { label: 'Detractors', value: feedback.stats.detractors, suffix: '' },
            ].map(s => (
              <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
                <p className="text-gray-500 text-sm mb-2">{s.label}</p>
                <p className="text-4xl font-bold text-amber-400">{s.value}{s.suffix}</p>
              </div>
            ))}
          </div>
        )}

        {/* REFERRALS TAB */}
        {!loading && tab === 'referrals' && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-800 text-gray-500">
                <th className="text-left p-3">Code</th><th className="text-left p-3">Referred</th>
                <th className="text-left p-3">Earned</th><th className="text-left p-3">Link</th>
              </tr></thead>
              <tbody>{referrals.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-8 text-gray-600">No referrals yet.</td></tr>
              ) : referrals.map(r => (
                <tr key={r.id} className="border-b border-gray-800/50">
                  <td className="p-3 font-mono text-amber-400">{r.referral_code}</td>
                  <td className="p-3">{r.total_referred}</td>
                  <td className="p-3 text-emerald-400">${(r.total_earned_cents / 100).toFixed(2)}</td>
                  <td className="p-3"><a href={`/r/${r.referral_code}`} className="text-blue-400 hover:underline text-xs" target="_blank">/r/{r.referral_code}</a></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
