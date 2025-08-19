import React, { useEffect, useState } from "react";
import axios from "axios";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000";

function toast(opts) {
  // Minimal fallback toast. Replace with your project's toast if available.
  // Example shape: { title: "Success", description: "..." }
  console.log("TOAST:", opts.title, opts.description || "");
}

export default function App() {
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${API}/invoices`);
      setInvoices(res.data || []);
    } catch (err) {
      console.error("Failed to fetch invoices:", err);
      toast({
        title: "Error",
        description: "Failed to load invoices",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Download handler: fetch PDF as blob and trigger download
  const downloadInvoice = async (inv) => {
    try {
      const response = await axios.get(`${API}/invoices/${inv.id}/pdf`, {
        responseType: "blob",
      });

      const blob = new Blob([response.data], { type: "application/pdf" });
      if (blob.size === 0) {
        throw new Error("Received an empty PDF blob");
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `invoice_${inv.invoice_number || inv.id}.pdf`;
      // hide link, trigger click
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Invoice PDF downloaded successfully",
      });
    } catch (error) {
      console.error("PDF download error:", error);

      // If the server returned HTML or JSON instead of PDF, log it for debugging.
      try {
        if (error.response && error.response.data) {
          const reader = new FileReader();
          reader.onload = () => {
            console.error("Response text:", reader.result);
          };
          reader.readAsText(error.response.data);
        }
      } catch (e) {
        // ignore reader errors
      }

      toast({
        title: "Error",
        description: "Failed to download PDF. Please try again.",
      });
    }
  };

  // Keep a generatePDF function (same behavior) for compatibility if you call it elsewhere
  const generatePDF = async (invoice) => {
    try {
      const response = await axios.get(`${API}/invoices/${invoice.id}/pdf`, {
        responseType: "blob",
      });

      const blob = new Blob([response.data], { type: "application/pdf" });
      if (blob.size === 0) {
        throw new Error("Received an empty PDF blob");
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `invoice_${invoice.invoice_number || invoice.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Invoice PDF downloaded successfully",
      });
    } catch (error) {
      console.error("PDF generation error:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
      });
    }
  };

  // Print handler: create HTML version, open new window, and print
  const printInvoice = (invoice) => {
    const printWindow = window.open("", "_blank");
    const invoiceHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Invoice ${invoice.invoice_number || invoice.id}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
          .invoice-header { display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
          .company-info h1 { margin: 0; color: #333; font-size: 24px; }
          .billing-section { margin-bottom: 20px; }
          .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .items-table th, .items-table td { border: 1px solid #ccc; padding: 8px; text-align: left; }
          .items-table th { background: #f4f4f4; }
          .footer { margin-top: 30px; font-size: 12px; color: #666; }
          .right { text-align: right; }
        </style>
      </head>
      <body>
        <div class="invoice-header">
          <div class="company-info">
            <h1>${invoice.business_profile?.company_name || "Your Company"}</h1>
            <div>${invoice.business_profile?.address_line1 || ""}</div>
            <div>${invoice.business_profile?.city || ""} ${invoice.business_profile?.state || ""} ${invoice.business_profile?.pincode || ""}</div>
          </div>
          <div class="invoice-meta">
            <h2>TAX INVOICE</h2>
            <div><strong>Invoice No:</strong> ${invoice.invoice_number || invoice.id}</div>
            <div><strong>Date:</strong> ${new Date(invoice.invoice_date).toLocaleDateString()}</div>
          </div>
        </div>

        <div class="billing-section">
          <div><strong>Bill To:</strong></div>
          <div>${invoice.customer?.name || ""}</div>
          <div>${invoice.customer?.address || ""}</div>
          <div>${invoice.customer?.city || ""} ${invoice.customer?.state || ""} ${invoice.customer?.pincode || ""}</div>
        </div>

        <table class="items-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Description</th>
              <th>Qty</th>
              <th>Rate</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${invoice.items && invoice.items.length ? invoice.items.map((item, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td>${item.product_name}${item.description ? `<br/><small>${item.description}</small>` : ""}</td>
                <td class="right">${item.quantity}</td>
                <td class="right">₹${item.rate?.toFixed ? item.rate.toFixed(2) : item.rate}</td>
                <td class="right">₹${item.amount?.toFixed ? item.amount.toFixed(2) : item.amount}</td>
              </tr>
            `).join("") : `<tr><td colspan="5">No items</td></tr>`}
          </tbody>
        </table>

        <div style="width: 300px; float: right;">
          <div style="display:flex;justify-content:space-between;"><div>Subtotal:</div><div>₹${invoice.subtotal?.toFixed(2) || "0.00"}</div></div>
          <div style="display:flex;justify-content:space-between;"><div>CGST (${(invoice.tax_rate/2) || 0}%):</div><div>₹${(invoice.tax_amount/2)?.toFixed(2) || "0.00"}</div></div>
          <div style="display:flex;justify-content:space-between;"><div>SGST (${(invoice.tax_rate/2) || 0}%):</div><div>₹${(invoice.tax_amount/2)?.toFixed(2) || "0.00"}</div></div>
          <hr/>
          <div style="display:flex;justify-content:space-between;font-weight:bold"><div>Total:</div><div>₹${invoice.total_amount?.toFixed(2) || "0.00"}</div></div>
        </div>

        <div class="footer">
          <p>This is a computer generated invoice and does not require signature.</p>
          <p>Thank you for your business!</p>
        </div>
      </body>
      </html>
    `;
    printWindow.document.write(invoiceHTML);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 200);
  };

  const handleViewInvoice = async (invoiceId) => {
    try {
      const res = await axios.get(`${API}/invoices/${invoiceId}`);
      setSelectedInvoice(res.data);
    } catch (err) {
      console.error("Failed to fetch invoice:", err);
      toast({ title: "Error", description: "Failed to load invoice" });
    }
  };

  if (isLoading) {
    return <div style={{ padding: 20 }}>Loading invoices...</div>;
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Invoices</h2>
      <div>
        {invoices.map((invoice) => (
          <div key={invoice.id} style={{ border: "1px solid #ddd", padding: 12, marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontWeight: "bold" }}>{invoice.invoice_number || invoice.id}</div>
                <div style={{ fontSize: 12, color: "#666" }}>{new Date(invoice.invoice_date).toLocaleDateString()}</div>
                <div style={{ fontSize: 12 }}>{invoice.customer?.name}</div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button onClick={() => handleViewInvoice(invoice.id)} title="View" aria-label="View">
                  View
                </button>

                <button
                  onClick={() => {
                    if (!invoice.customer?.email) {
                      toast({ title: "Error", description: "Customer email not available" });
                      return;
                    }
                    toast({ title: "Email Feature", description: "Email functionality will be available soon" });
                  }}
                  title="Send Email"
                >
                  Email
                </button>

                {/* Download button calls downloadInvoice */}
                <button onClick={() => downloadInvoice(invoice)} title="Download PDF">
                  Download
                </button>

                <button onClick={() => printInvoice(invoice)} title="Print">
                  Print
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Minimal invoice modal/view */}
      {selectedInvoice && (
        <div style={{ marginTop: 20, padding: 12, border: "1px solid #ccc" }}>
          <h3>Invoice: {selectedInvoice.invoice_number}</h3>
          <div>Customer: {selectedInvoice.customer?.name}</div>
          <div>Total: ₹{selectedInvoice.total_amount?.toFixed(2)}</div>
          <div style={{ marginTop: 12 }}>
            <button onClick={() => generatePDF(selectedInvoice)}>Download PDF (Generate)</button>
            <button onClick={() => printInvoice(selectedInvoice)} style={{ marginLeft: 8 }}>
              Print
            </button>
            <button onClick={() => setSelectedInvoice(null)} style={{ marginLeft: 8 }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
