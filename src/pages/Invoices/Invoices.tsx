import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, getFirestore } from 'firebase/firestore';
import { useLpo } from '../../context/LpoContext';

interface LineItem {
  itemId: string;
  description: string;
  rate: number;
  quantity: number;
  amount: number;
}

interface Invoice {
  id: string;
  customerName: string;
  invoiceNum: string;
  date: string;
  billingMonth: string;
  totalAmount: number;
  line_items: LineItem[];
}

export default function Invoices() {
  const { userData, isAdmin, selectedLpoId } = useLpo();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Derive target LPO ID based on user context
  const currentLPOId = isAdmin && selectedLpoId !== 'all' ? selectedLpoId : userData?.lpo_id;

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const trailingMonths = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    async function fetchInvoices() {
      if (!currentLPOId || !selectedMonth) return;
      
      const db = getFirestore();
      const invoicesRef = collection(db, `lpo/${currentLPOId}/invoices`);
      const q = query(invoicesRef, where('billingMonth', '==', selectedMonth));
      
      try {
        const querySnapshot = await getDocs(q);
        const fetchedInvoices: Invoice[] = [];
        
        await Promise.all(querySnapshot.docs.map(async (docSnapshot) => {
          const data = docSnapshot.data();
          const lineItemsRef = collection(db, `lpo/${currentLPOId}/invoices/${docSnapshot.id}/line_items`);
          const lineItemsSnapshot = await getDocs(lineItemsRef);
          
          const line_items = lineItemsSnapshot.docs.map(liDoc => liDoc.data() as LineItem);
          
          fetchedInvoices.push({
            id: docSnapshot.id,
            customerName: data.customerName || '',
            invoiceNum: data.invoiceNum || '',
            date: data.date || '',
            billingMonth: data.billingMonth || '',
            totalAmount: data.totalAmount || 0,
            line_items
          });
        }));
        
        fetchedInvoices.sort((a, b) => a.customerName.localeCompare(b.customerName));
        setInvoices(fetchedInvoices);
      } catch (error) {
        console.error("Failed to fetch invoices:", error);
      }
    }
    
    fetchInvoices();
  }, [currentLPOId, selectedMonth]);

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filteredInvoices = invoices.filter(inv => 
    inv.customerName.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const totalFilteredSum = filteredInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

  const groupedInvoices = filteredInvoices.reduce((acc, inv) => {
    if (!acc[inv.customerName]) acc[inv.customerName] = [];
    acc[inv.customerName].push(inv);
    return acc;
  }, {} as Record<string, Invoice[]>);

  return (
    <div className="min-h-screen bg-[#fdfbf7] text-[#2d463e] p-8 font-sans">
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <select 
          value={selectedMonth} 
          onChange={e => setSelectedMonth(e.target.value)}
          className="p-3 bg-white border border-[#2d463e]/20 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2d463e]/50 font-medium"
        >
          {trailingMonths.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        
        <input 
          type="text" 
          placeholder="Filter by Customer Name..." 
          value={searchFilter}
          onChange={e => setSearchFilter(e.target.value)}
          className="flex-1 p-3 bg-white border border-[#2d463e]/20 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2d463e]/50"
        />
      </div>

      <div className="bg-[#2d463e] text-[#fdfbf7] p-8 rounded-2xl mb-8 flex justify-between items-center shadow-lg transition-all duration-300">
        <div>
          <h2 className="text-lg font-medium opacity-80 tracking-wide uppercase text-sm">Total Filtered Amount</h2>
          <p className="text-sm opacity-60 mt-1">Across all filtered active rows</p>
        </div>
        <span className="text-4xl font-semibold tracking-tight">
          ${totalFilteredSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-[#2d463e]/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#2d463e]/5 border-b border-[#2d463e]/10">
                <th className="p-5 font-semibold tracking-wide">Customer Name</th>
                <th className="p-5 font-semibold tracking-wide">Invoice Number</th>
                <th className="p-5 font-semibold tracking-wide">Date</th>
                <th className="p-5 font-semibold tracking-wide text-right">Total Amount</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(groupedInvoices).map(([customerName, custInvoices]) => (
                <React.Fragment key={customerName}>
                  {custInvoices.map((invoice, idx) => {
                    const isExpanded = expandedRows.has(invoice.id);
                    return (
                      <React.Fragment key={invoice.id}>
                        <tr 
                          onClick={() => toggleRow(invoice.id)}
                          className="cursor-pointer hover:bg-[#2d463e]/5 transition-colors border-b border-[#2d463e]/5 group"
                        >
                          <td className="p-5 font-semibold align-top text-[#2d463e]">
                            {idx === 0 ? customerName : ''}
                          </td>
                          <td className="p-5 text-[#2d463e]/80">
                            <span className="flex items-center gap-2">
                              {invoice.invoiceNum}
                              <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''} opacity-50 group-hover:opacity-100`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                            </span>
                          </td>
                          <td className="p-5 text-[#2d463e]/80">{invoice.date}</td>
                          <td className="p-5 text-right font-semibold text-[#2d463e]">
                            ${invoice.totalAmount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="bg-[#fdfbf7]/60 border-b border-[#2d463e]/10">
                            <td colSpan={4} className="p-0">
                              <div className="p-6 pl-14 border-l-4 border-[#2d463e] overflow-hidden animate-fade-in-down">
                                <h3 className="text-sm font-semibold uppercase tracking-wider mb-3 text-[#2d463e]/60">Line Items</h3>
                                <table className="w-full text-sm bg-white rounded-lg border border-[#2d463e]/10 shadow-sm overflow-hidden">
                                  <thead>
                                    <tr className="bg-[#2d463e]/5 text-[#2d463e]/80 border-b border-[#2d463e]/10">
                                      <th className="p-3 font-medium text-left">Description</th>
                                      <th className="p-3 font-medium text-right">Rate</th>
                                      <th className="p-3 font-medium text-right">Qty</th>
                                      <th className="p-3 font-medium text-right">Amount</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {invoice.line_items?.map((item, i) => (
                                      <tr key={i} className="border-b border-[#2d463e]/5 last:border-0 hover:bg-[#2d463e]/[0.02] transition-colors">
                                        <td className="p-3">{item.description}</td>
                                        <td className="p-3 text-right text-[#2d463e]/80">
                                          ${item.rate?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="p-3 text-right text-[#2d463e]/80">{item.quantity}</td>
                                        <td className="p-3 text-right font-medium text-[#2d463e]">
                                          ${item.amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                      </tr>
                                    ))}
                                    {(!invoice.line_items || invoice.line_items.length === 0) && (
                                      <tr>
                                        <td colSpan={4} className="p-4 text-center text-[#2d463e]/50 italic">
                                          No line items found.
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </React.Fragment>
              ))}
              
              {filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-12 text-center">
                    <p className="text-[#2d463e]/50 font-medium text-lg">No invoices found</p>
                    <p className="text-[#2d463e]/40 text-sm mt-1">Try adjusting your filters or selecting a different month.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
