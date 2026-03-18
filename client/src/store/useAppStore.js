import { create } from 'zustand'

const useAppStore = create((set) => ({
  // Auth
  credentials: null,
  setCredentials: (creds) => set({ credentials: creds }),
  clearCredentials: () => set({ credentials: null, subsidiary: null, location: null, selectedPO: null }),

  // Subsidiary + Location
  subsidiary: null,
  location: null,
  setSubsidiary: (s) => set({ subsidiary: s }),
  setLocation: (l) => set({ location: l }),

  // Purchase Order
  selectedPO: null,
  setSelectedPO: (po) => set({ selectedPO: po }),

  // Captured image
  capturedImage: null,
  setCapturedImage: (img) => set({ capturedImage: img }),

  // Extracted line items from AI
  extractedItems: [],
  setExtractedItems: (items) => set({ extractedItems: items }),

  // Matched lines (AI extracted + PO lines merged)
  matchedLines: [],
  setMatchedLines: (lines) => set({ matchedLines: lines }),

  // Submitted receipt
  submittedReceipt: null,
  setSubmittedReceipt: (r) => set({ submittedReceipt: r }),
}))

export default useAppStore
