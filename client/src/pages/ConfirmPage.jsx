import { useNavigate } from 'react-router-dom'
import useAppStore from '../store/useAppStore'

export default function ConfirmPage() {
  const navigate = useNavigate()
  const { submittedReceipt, selectedPO, credentials } = useAppStore()

  const goAgain = () => navigate('/po-search')

  return (
    <div className="min-h-screen bg-navy-900 flex flex-col px-6 py-12">
      <div className="text-center mb-8">
        <div className="text-5xl mb-4">✅</div>
        <h1 className="text-2xl font-bold text-white">Receipt Submitted</h1>
        <p className="text-slate-400 text-sm mt-2">Item Receipt created in NetSuite</p>
      </div>

      <div className="bg-navy-800 border border-navy-600 rounded-xl p-5 mb-6">
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-slate-400 text-sm font-mono">IR Number</span>
            <span className="text-amber-400 font-mono font-semibold">{submittedReceipt?.tranid || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400 text-sm font-mono">PO Reference</span>
            <span className="text-white font-mono text-sm">{selectedPO?.tranid}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400 text-sm font-mono">Lines Received</span>
            <span className="text-white font-mono text-sm">{submittedReceipt?.linesReceived || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400 text-sm font-mono">Date</span>
            <span className="text-white font-mono text-sm">{new Date().toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {submittedReceipt?.id && credentials?.accountId && (
        <a
          href={`https://${credentials.accountId}.app.netsuite.com/app/accounting/transactions/itemreceipt.nl?id=${submittedReceipt.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-center border border-amber-400/50 text-amber-400 font-mono py-3 rounded-lg mb-3 text-sm"
        >
          View in NetSuite ↗
        </a>
      )}

      <button
        onClick={goAgain}
        className="w-full bg-amber-400 hover:bg-amber-500 text-navy-900 font-bold py-4 rounded-lg text-base min-h-[52px] transition-colors"
      >
        Receive Another
      </button>
    </div>
  )
}
