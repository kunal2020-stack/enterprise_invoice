import io
import logging
from datetime import datetime, timezone
from typing import List

from fastapi import FastAPI, APIRouter, Depends, HTTPException
from fastapi.responses import Response
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

# IMPORTANT:
# Replace these imports with your project's actual imports:
# - db (your database client, e.g., Motor client)
# - Invoice, User, InvoiceStatus, DashboardStats, parse_from_mongo, get_current_user
#
# Example (if present in your codebase):
# from .models import Invoice, User, parse_from_mongo
# from .db import db
#
# For safety, this file includes minimal fallback mocks so it can run for testing.
try:
    from .db import db  # your actual db
except Exception:
    db = None  # fallback - replace with actual db in your project

try:
    from .models import Invoice, User, parse_from_mongo, get_current_user
except Exception:
    # Minimal fallback models for standalone testing — replace with your real models
    from pydantic import BaseModel

    class User(BaseModel):
        username: str = "admin"

    class DummyCustomer(BaseModel):
        name: str = "Customer"
        address: str = ""
        city: str = ""
        state: str = ""
        pincode: str = ""
        gst_number: str = ""
        phone: str = ""
        email: str = ""

    class DummyBusinessProfile(BaseModel):
        company_name: str = "Your Company"
        address_line1: str = ""
        address_line2: str = ""
        city: str = ""
        state: str = ""
        pincode: str = ""
        gst_number: str = ""
        pan_number: str = ""
        state_code: str = "00"
        bank_name: str = ""
        account_number: str = ""
        ifsc_code: str = ""
        account_holder: str = ""
        phone: str = ""
        email: str = ""

    class InvoiceItem(BaseModel):
        product_name: str = ""
        description: str = ""
        quantity: int = 1
        rate: float = 0.0
        amount: float = 0.0

    class Invoice(BaseModel):
        id: str
        invoice_number: str = ""
        invoice_date: datetime = datetime.now()
        due_date: datetime = None
        status: str = "draft"
        customer: DummyCustomer = DummyCustomer()
        business_profile: DummyBusinessProfile = DummyBusinessProfile()
        items: List[InvoiceItem] = []
        subtotal: float = 0.0
        tax_rate: float = 0.0
        tax_amount: float = 0.0
        total_amount: float = 0.0
        notes: str = ""
        created_at: str = ""

    def parse_from_mongo(d):
        return d

    async def get_current_user():
        return User(username="admin")

logger = logging.getLogger("invoice_app")
logging.basicConfig(level=logging.INFO)

app = FastAPI()
api_router = APIRouter()

# PDF generation using ReportLab
def generate_invoice_pdf(invoice: Invoice) -> io.BytesIO:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=18)

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("CustomTitle", parent=styles["Heading1"], fontSize=18, spaceAfter=30, alignment=1)
    heading_style = ParagraphStyle("CustomHeading", parent=styles["Heading2"], fontSize=12, spaceAfter=12, textColor=colors.black)
    normal_style = styles["Normal"]

    story = []

    company_name = invoice.business_profile.company_name if getattr(invoice, "business_profile", None) else "Your Company Name"
    story.append(Paragraph(f"<b>{company_name}</b>", title_style))

    if getattr(invoice, "business_profile", None):
        bp = invoice.business_profile
        company_info = f"""
        {bp.address_line1}<br/>
        {bp.address_line2 or ''}<br/>
        {bp.city}, {bp.state} - {bp.pincode}<br/>
        GST No: {bp.gst_number} | PAN: {bp.pan_number or ''}<br/>
        Phone: {bp.phone} | Email: {bp.email}
        """
        story.append(Paragraph(company_info, normal_style))

    story.append(Spacer(1, 20))
    story.append(Paragraph("<b>TAX INVOICE</b>", heading_style))

    invoice_date_str = invoice.invoice_date.strftime("%d/%m/%Y") if isinstance(invoice.invoice_date, datetime) else str(invoice.invoice_date)
    invoice_details_data = [
        ["Invoice No:", invoice.invoice_number, "Date:", invoice_date_str],
        ["Status:", (invoice.status or "").upper(), "State Code:", invoice.business_profile.state_code if getattr(invoice, "business_profile", None) else "00"],
    ]

    invoice_details_table = Table(invoice_details_data, colWidths=[1 * inch, 1.5 * inch, 1 * inch, 1.5 * inch])
    invoice_details_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.grey),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 10),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
                ("BACKGROUND", (0, 1), (-1, -1), colors.beige),
                ("GRID", (0, 0), (-1, -1), 1, colors.black),
            ]
        )
    )
    story.append(invoice_details_table)
    story.append(Spacer(1, 20))

    story.append(Paragraph("<b>Bill To:</b>", heading_style))
    customer = invoice.customer or {}
    customer_info = f"""
    <b>{getattr(customer, 'name', '')}</b><br/>
    {getattr(customer, 'address', '') or ''}<br/>
    {getattr(customer, 'city', '') or ''}, {getattr(customer, 'state', '') or ''} - {getattr(customer, 'pincode', '') or ''}<br/>
    {f'GST No: {getattr(customer, \"gst_number\", \"\")}<br/>' if getattr(customer, 'gst_number', None) else ''}
    {f'Phone: {getattr(customer, \"phone\", \"\")}<br/>' if getattr(customer, 'phone', None) else ''}
    {f'Email: {getattr(customer, \"email\", \"\")}' if getattr(customer, 'email', None) else ''}
    """
    story.append(Paragraph(customer_info, normal_style))
    story.append(Spacer(1, 20))

    items_data = [["S.No", "Description", "Qty", "Rate (₹)", "Amount (₹)"]]
    for i, item in enumerate(getattr(invoice, "items", []) or [], 1):
        description = getattr(item, "product_name", "")
        if getattr(item, "description", None):
            description += f"\n{item.description}"
        items_data.append([str(i), description, str(getattr(item, "quantity", "")), f"₹{float(getattr(item, 'rate', 0.0)):.2f}", f"₹{float(getattr(item, 'amount', 0.0)):.2f}"])

    items_table = Table(items_data, colWidths=[0.5 * inch, 3 * inch, 0.8 * inch, 1 * inch, 1.2 * inch])
    items_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.grey),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("ALIGN", (1, 1), (1, -1), "LEFT"),
                ("ALIGN", (3, 1), (-1, -1), "RIGHT"),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 10),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
                ("BACKGROUND", (0, 1), (-1, -1), colors.beige),
                ("GRID", (0, 0), (-1, -1), 1, colors.black),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]
        )
    )
    story.append(items_table)
    story.append(Spacer(1, 20))

    cgst = float(getattr(invoice, "tax_amount", 0.0)) / 2 if getattr(invoice, "tax_amount", None) else 0.0
    sgst = float(getattr(invoice, "tax_amount", 0.0)) / 2 if getattr(invoice, "tax_amount", None) else 0.0

    totals_data = [
        ["Subtotal:", f"₹{float(getattr(invoice, 'subtotal', 0.0)):.2f}"],
        [f"CGST ({(float(getattr(invoice, 'tax_rate', 0.0))/2):.1f}%):", f"₹{cgst:.2f}"],
        [f"SGST ({(float(getattr(invoice, 'tax_rate', 0.0))/2):.1f}%):", f"₹{sgst:.2f}"],
        ["Total Amount:", f"₹{float(getattr(invoice, 'total_amount', 0.0)):.2f}"],
    ]
    totals_table = Table(totals_data, colWidths=[4 * inch, 1.5 * inch])
    totals_table.setStyle(
        TableStyle(
            [
                ("ALIGN", (0, 0), (-1, -1), "RIGHT"),
                ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
                ("FONTSIZE", (0, -1), (-1, -1), 12),
                ("BACKGROUND", (0, -1), (-1, -1), colors.lightgrey),
                ("GRID", (0, 0), (-1, -1), 1, colors.black),
            ]
        )
    )
    story.append(totals_table)
    story.append(Spacer(1, 20))

    if getattr(invoice, "notes", None):
        story.append(Paragraph("<b>Notes:</b>", heading_style))
        story.append(Paragraph(getattr(invoice, "notes", "")), )
        story.append(Spacer(1, 12))

    if getattr(invoice, "business_profile", None):
        story.append(Paragraph("<b>Bank Details:</b>", heading_style))
        bp = invoice.business_profile
        bank_info = f"""
        Bank: {getattr(bp, 'bank_name', '')}<br/>
        Account No: {getattr(bp, 'account_number', '')}<br/>
        IFSC: {getattr(bp, 'ifsc_code', '')}<br/>
        Account Holder: {getattr(bp, 'account_holder', '')}
        """
        story.append(Paragraph(bank_info, normal_style))
        story.append(Spacer(1, 20))

    story.append(Paragraph("<i>This is a computer generated invoice and does not require signature.</i>", normal_style))
    story.append(Paragraph("<i>Thank you for your business!</i>", normal_style))

    doc.build(story)
    buffer.seek(0)
    return buffer

@api_router.get("/invoices/{invoice_id}/pdf")
async def download_invoice_pdf(invoice_id: str, current_user: User = Depends(get_current_user)):
    """
    Generate and return invoice PDF bytes.
    Integrate with your actual DB: replace the invoice fetch section with your db call (db.invoices.find_one).
    """
    try:
        # If you have a db and parse function, use them:
        if db is not None:
            invoice_data = await db.invoices.find_one({"id": invoice_id})
            if not invoice_data:
                raise HTTPException(status_code=404, detail="Invoice not found")
            invoice = Invoice(**parse_from_mongo(invoice_data))
        else:
            # Fallback/test invoice (replace with real DB fetch)
            invoice = Invoice(
                id=invoice_id,
                invoice_number=f"INV-{invoice_id}",
                invoice_date=datetime.now(),
                customer=getattr(Invoice, "customer", None) or {},
                business_profile=getattr(Invoice, "business_profile", None) or {},
                items=[{"product_name": "Sample Item", "description": "", "quantity": 1, "rate": 100.0, "amount": 100.0}],
                subtotal=100.0,
                tax_rate=18.0,
                tax_amount=18.0,
                total_amount=118.0,
                notes="",
                created_at=datetime.now(timezone.utc).isoformat(),
            )

        pdf_buffer = generate_invoice_pdf(invoice)
        pdf_bytes = pdf_buffer.getvalue()  # ensure raw bytes are returned

        if not pdf_bytes:
            logger.error("Generated PDF is empty")
            raise HTTPException(status_code=500, detail="Generated PDF is empty")

        filename = f"invoice_{getattr(invoice, 'invoice_number', invoice_id)}.pdf"
        headers = {
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Type": "application/pdf",
            "Content-Length": str(len(pdf_bytes)),
        }

        return Response(content=pdf_bytes, media_type="application/pdf", headers=headers)

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"PDF generation failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate PDF")

app.include_router(api_router)
