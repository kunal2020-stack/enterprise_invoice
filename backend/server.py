from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import bcrypt
import jwt
from enum import Enum
import io
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="InvoiceApp", description="Subscription-based Invoicing Application")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')

# Enums
class UserRole(str, Enum):
    ADMIN = "admin"
    USER = "user"

class InvoiceStatus(str, Enum):
    DRAFT = "draft"
    SENT = "sent"
    PAID = "paid"
    OVERDUE = "overdue"

# User Business Profile Model
class BusinessProfile(BaseModel):
    company_name: str = "Your Company Name"
    gst_number: str = "22AAAAA0000A1Z5"
    pan_number: Optional[str] = "AAAAA0000A"
    address_line1: str = "123 Business Street"
    address_line2: Optional[str] = "Suite 456"
    city: str = "Business City"
    state: str = "Business State"
    state_code: str = "22"
    pincode: str = "123456"
    country: str = "India"
    phone: str = "+91 98765 43210"
    email: EmailStr = "business@example.com"
    website: Optional[str] = "www.yourbusiness.com"
    bank_name: str = "State Bank of India"
    account_number: str = "1234567890"
    ifsc_code: str = "SBIN0001234"
    account_holder: str = "Your Company Name"

class BusinessProfileUpdate(BaseModel):
    company_name: Optional[str] = None
    gst_number: Optional[str] = None
    pan_number: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    state_code: Optional[str] = None
    pincode: Optional[str] = None
    country: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    website: Optional[str] = None
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    ifsc_code: Optional[str] = None
    account_holder: Optional[str] = None

# Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: EmailStr
    full_name: str
    role: UserRole = UserRole.USER
    is_active: bool = True
    business_profile: Optional[BusinessProfile] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    full_name: str
    role: UserRole = UserRole.USER

class UserLogin(BaseModel):
    username: str
    password: str

class Product(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    current_price: float
    unit: str = "pcs"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProductCreate(BaseModel):
    name: str
    description: Optional[str] = None
    current_price: float
    unit: str = "pcs"

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    current_price: Optional[float] = None
    unit: Optional[str] = None

class PriceHistory(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    product_id: str
    old_price: float
    new_price: float
    changed_by: str
    changed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class InvoiceItem(BaseModel):
    product_id: str
    product_name: str
    description: Optional[str] = None
    quantity: float
    rate: float
    amount: float

class Customer(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    gst_number: Optional[str] = None

class BankDetails(BaseModel):
    bank_name: str
    account_number: str
    ifsc_code: str
    account_holder: str

class Invoice(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    invoice_number: str
    customer: Customer
    items: List[InvoiceItem]
    subtotal: float
    tax_rate: float = 18.0  # Default GST rate
    tax_amount: float
    total_amount: float
    bank_details: Optional[BankDetails] = None
    notes: Optional[str] = None
    status: InvoiceStatus = InvoiceStatus.DRAFT
    created_by: str
    business_profile: Optional[BusinessProfile] = None
    invoice_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    due_date: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class InvoiceCreate(BaseModel):
    customer: Customer
    items: List[InvoiceItem]
    tax_rate: float = 18.0
    bank_details: Optional[BankDetails] = None
    notes: Optional[str] = None
    due_date: Optional[datetime] = None

class DashboardStats(BaseModel):
    total_invoices: int
    total_revenue: float
    monthly_revenue: float
    top_products: List[Dict[str, Any]]

# Utility functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(data: dict) -> str:
    return jwt.encode(data, SECRET_KEY, algorithm="HS256")

def verify_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return payload
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    payload = verify_token(credentials.credentials)
    username = payload.get("sub")
    if not username:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = await db.users.find_one({"username": username})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return User(**user)

async def get_admin_user(current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

# Helper functions for MongoDB serialization
def prepare_for_mongo(data):
    if isinstance(data, dict):
        for key, value in data.items():
            if isinstance(value, datetime):
                data[key] = value.isoformat()
            elif isinstance(value, dict):
                data[key] = prepare_for_mongo(value)
    return data

def parse_from_mongo(item):
    if isinstance(item, dict):
        for key, value in item.items():
            if isinstance(value, str) and key.endswith('_at'):
                try:
                    item[key] = datetime.fromisoformat(value.replace('Z', '+00:00'))
                except:
                    pass
            elif isinstance(value, dict):
                item[key] = parse_from_mongo(value)
    return item

# Auth routes
@api_router.post("/auth/login")
async def login(user_data: UserLogin):
    user = await db.users.find_one({"username": user_data.username})
    if not user or not verify_password(user_data.password, user['password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user.get('is_active', True):
        raise HTTPException(status_code=401, detail="Account is inactive")
    
    token = create_access_token({"sub": user['username'], "role": user['role']})
    return {"access_token": token, "token_type": "bearer", "user": User(**user)}

@api_router.post("/auth/create-user")
async def create_user(user_data: UserCreate, admin: User = Depends(get_admin_user)):
    # Check if user exists
    existing_user = await db.users.find_one({"$or": [{"username": user_data.username}, {"email": user_data.email}]})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username or email already exists")
    
    # Create user with default business profile
    hashed_password = hash_password(user_data.password)
    user_dict = user_data.dict()
    user_dict['password'] = hashed_password
    user_dict['business_profile'] = BusinessProfile().dict()
    user_obj = User(**{k: v for k, v in user_dict.items() if k != 'password'})
    
    user_mongo_data = prepare_for_mongo(user_obj.dict())
    user_mongo_data['password'] = hashed_password
    
    await db.users.insert_one(user_mongo_data)
    return {"message": "User created successfully", "user": user_obj}

@api_router.get("/auth/me")
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user

# Profile routes
@api_router.get("/profile/business", response_model=BusinessProfile)
async def get_business_profile(current_user: User = Depends(get_current_user)):
    user = await db.users.find_one({"username": current_user.username})
    if not user or not user.get('business_profile'):
        # Return default business profile
        return BusinessProfile()
    return BusinessProfile(**user['business_profile'])

@api_router.put("/profile/business", response_model=BusinessProfile)
async def update_business_profile(profile_data: BusinessProfileUpdate, current_user: User = Depends(get_current_user)):
    # Get current profile
    user = await db.users.find_one({"username": current_user.username})
    current_profile = user.get('business_profile', BusinessProfile().dict())
    
    # Update with new data
    update_data = {k: v for k, v in profile_data.dict().items() if v is not None}
    current_profile.update(update_data)
    
    # Update in database
    await db.users.update_one(
        {"username": current_user.username},
        {"$set": {"business_profile": current_profile}}
    )
    
    return BusinessProfile(**current_profile)

# Product routes
@api_router.post("/products", response_model=Product)
async def create_product(product_data: ProductCreate, current_user: User = Depends(get_current_user)):
    product_obj = Product(**product_data.dict())
    product_mongo_data = prepare_for_mongo(product_obj.dict())
    await db.products.insert_one(product_mongo_data)
    return product_obj

@api_router.get("/products", response_model=List[Product])
async def get_products(current_user: User = Depends(get_current_user)):
    products = await db.products.find().to_list(1000)
    return [Product(**parse_from_mongo(product)) for product in products]

@api_router.get("/products/search")
async def search_products(q: str, current_user: User = Depends(get_current_user)):
    products = await db.products.find({
        "name": {"$regex": q, "$options": "i"}
    }).to_list(10)
    return [{"id": p["id"], "name": p["name"], "current_price": p["current_price"], "description": p.get("description", "")} 
            for p in products]

@api_router.put("/products/{product_id}", response_model=Product)
async def update_product(product_id: str, product_data: ProductUpdate, current_user: User = Depends(get_current_user)):
    existing_product = await db.products.find_one({"id": product_id})
    if not existing_product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    update_data = {k: v for k, v in product_data.dict().items() if v is not None}
    
    # If price is being updated, record price history
    if "current_price" in update_data and update_data["current_price"] != existing_product.get("current_price"):
        price_history = PriceHistory(
            product_id=product_id,
            old_price=existing_product["current_price"],
            new_price=update_data["current_price"],
            changed_by=current_user.username
        )
        await db.price_history.insert_one(prepare_for_mongo(price_history.dict()))
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.products.update_one({"id": product_id}, {"$set": update_data})
    
    updated_product = await db.products.find_one({"id": product_id})
    return Product(**parse_from_mongo(updated_product))

# Invoice routes
@api_router.post("/invoices", response_model=Invoice)
async def create_invoice(invoice_data: InvoiceCreate, current_user: User = Depends(get_current_user)):
    # Generate invoice number
    count = await db.invoices.count_documents({})
    invoice_number = f"INV-{count + 1:04d}"
    
    # Get user's business profile
    user = await db.users.find_one({"username": current_user.username})
    business_profile = user.get('business_profile')
    if business_profile:
        business_profile = BusinessProfile(**business_profile)
    else:
        business_profile = BusinessProfile()
    
    # Calculate totals
    subtotal = sum(item.amount for item in invoice_data.items)
    tax_amount = subtotal * (invoice_data.tax_rate / 100)
    total_amount = subtotal + tax_amount
    
    invoice_obj = Invoice(
        invoice_number=invoice_number,
        customer=invoice_data.customer,
        items=invoice_data.items,
        subtotal=subtotal,
        tax_rate=invoice_data.tax_rate,
        tax_amount=tax_amount,
        total_amount=total_amount,
        bank_details=invoice_data.bank_details,
        notes=invoice_data.notes,
        created_by=current_user.username,
        business_profile=business_profile,
        due_date=invoice_data.due_date
    )
    
    invoice_mongo_data = prepare_for_mongo(invoice_obj.dict())
    await db.invoices.insert_one(invoice_mongo_data)
    return invoice_obj

@api_router.get("/invoices", response_model=List[Invoice])
async def get_invoices(current_user: User = Depends(get_current_user)):
    invoices = await db.invoices.find().sort("created_at", -1).to_list(1000)
    return [Invoice(**parse_from_mongo(invoice)) for invoice in invoices]

@api_router.get("/invoices/{invoice_id}", response_model=Invoice)
async def get_invoice(invoice_id: str, current_user: User = Depends(get_current_user)):
    invoice = await db.invoices.find_one({"id": invoice_id})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return Invoice(**parse_from_mongo(invoice))

@api_router.put("/invoices/{invoice_id}/status")
async def update_invoice_status(invoice_id: str, status: InvoiceStatus, current_user: User = Depends(get_current_user)):
    result = await db.invoices.update_one(
        {"id": invoice_id}, 
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return {"message": "Invoice status updated successfully"}

# Dashboard routes
# PDF Generation Function
def generate_invoice_pdf(invoice: Invoice) -> io.BytesIO:
    """Generate PDF for invoice using ReportLab"""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=18)
    
    # Get styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=18,
        spaceAfter=30,
        alignment=1  # Center alignment
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=12,
        spaceAfter=12,
        textColor=colors.black
    )
    
    normal_style = styles['Normal']
    
    # Build PDF content
    story = []
    
    # Company Header
    company_name = invoice.business_profile.company_name if invoice.business_profile else "Your Company Name"
    story.append(Paragraph(f"<b>{company_name}</b>", title_style))
    
    if invoice.business_profile:
        company_info = f"""
        {invoice.business_profile.address_line1}<br/>
        {invoice.business_profile.address_line2 or ''}<br/>
        {invoice.business_profile.city}, {invoice.business_profile.state} - {invoice.business_profile.pincode}<br/>
        GST No: {invoice.business_profile.gst_number} | PAN: {invoice.business_profile.pan_number or ''}<br/>
        Phone: {invoice.business_profile.phone} | Email: {invoice.business_profile.email}
        """
        story.append(Paragraph(company_info, normal_style))
    
    story.append(Spacer(1, 20))
    
    # Invoice Header
    story.append(Paragraph("<b>TAX INVOICE</b>", heading_style))
    
    # Invoice details table
    invoice_details_data = [
        ['Invoice No:', invoice.invoice_number, 'Date:', invoice.invoice_date.strftime('%d/%m/%Y')],
        ['Status:', invoice.status.upper(), 'State Code:', invoice.business_profile.state_code if invoice.business_profile else '00']
    ]
    
    invoice_details_table = Table(invoice_details_data, colWidths=[1*inch, 1.5*inch, 1*inch, 1.5*inch])
    invoice_details_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    
    story.append(invoice_details_table)
    story.append(Spacer(1, 20))
    
    # Customer details
    story.append(Paragraph("<b>Bill To:</b>", heading_style))
    customer_info = f"""
    <b>{invoice.customer.name}</b><br/>
    {invoice.customer.address or ''}<br/>
    {invoice.customer.city or ''}, {invoice.customer.state or ''} - {invoice.customer.pincode or ''}<br/>
    {f'GST No: {invoice.customer.gst_number}<br/>' if invoice.customer.gst_number else ''}
    {f'Phone: {invoice.customer.phone}<br/>' if invoice.customer.phone else ''}
    {f'Email: {invoice.customer.email}' if invoice.customer.email else ''}
    """
    story.append(Paragraph(customer_info, normal_style))
    story.append(Spacer(1, 20))
    
    # Items table
    items_data = [['S.No', 'Description', 'Qty', 'Rate (₹)', 'Amount (₹)']]
    
    for i, item in enumerate(invoice.items, 1):
        description = f"{item.product_name}"
        if item.description:
            description += f"\n{item.description}"
        
        items_data.append([
            str(i),
            description,
            str(item.quantity),
            f"₹{item.rate:.2f}",
            f"₹{item.amount:.2f}"
        ])
    
    items_table = Table(items_data, colWidths=[0.5*inch, 3*inch, 0.8*inch, 1*inch, 1.2*inch])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('ALIGN', (1, 1), (1, -1), 'LEFT'),  # Description left aligned
        ('ALIGN', (3, 1), (-1, -1), 'RIGHT'),  # Amount columns right aligned
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'TOP')
    ]))
    
    story.append(items_table)
    story.append(Spacer(1, 20))
    
    # Totals table
    cgst = invoice.tax_amount / 2
    sgst = invoice.tax_amount / 2
    
    totals_data = [
        ['Subtotal:', f"₹{invoice.subtotal:.2f}"],
        [f'CGST ({invoice.tax_rate/2:.1f}%):', f"₹{cgst:.2f}"],
        [f'SGST ({invoice.tax_rate/2:.1f}%):', f"₹{sgst:.2f}"],
        ['Total Amount:', f"₹{invoice.total_amount:.2f}"]
    ]
    
    totals_table = Table(totals_data, colWidths=[4*inch, 1.5*inch])
    totals_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, -1), (-1, -1), 12),
        ('BACKGROUND', (0, -1), (-1, -1), colors.lightgrey),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    
    story.append(totals_table)
    story.append(Spacer(1, 20))
    
    # Notes
    if invoice.notes:
        story.append(Paragraph("<b>Notes:</b>", heading_style))
        story.append(Paragraph(invoice.notes, normal_style))
        story.append(Spacer(1, 12))
    
    # Bank details
    if invoice.business_profile:
        story.append(Paragraph("<b>Bank Details:</b>", heading_style))
        bank_info = f"""
        Bank: {invoice.business_profile.bank_name}<br/>
        Account No: {invoice.business_profile.account_number}<br/>
        IFSC: {invoice.business_profile.ifsc_code}<br/>
        Account Holder: {invoice.business_profile.account_holder}
        """
        story.append(Paragraph(bank_info, normal_style))
        story.append(Spacer(1, 20))
    
    # Footer
    story.append(Paragraph("<i>This is a computer generated invoice and does not require signature.</i>", normal_style))
    story.append(Paragraph("<i>Thank you for your business!</i>", normal_style))
    
    # Build PDF
    doc.build(story)
    buffer.seek(0)
    return buffer

@api_router.get("/invoices/{invoice_id}/pdf")
async def download_invoice_pdf(invoice_id: str, current_user: User = Depends(get_current_user)):
    """Generate and download invoice PDF"""
    try:
        # Get invoice
        invoice_data = await db.invoices.find_one({"id": invoice_id})
        if not invoice_data:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        invoice = Invoice(**parse_from_mongo(invoice_data))
        
        # Generate PDF
        pdf_buffer = generate_invoice_pdf(invoice)
        
        # Return PDF as streaming response
        return StreamingResponse(
            io.BytesIO(pdf_buffer.read()),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=invoice_{invoice.invoice_number}.pdf"}
        )
        
    except Exception as e:
        logger.error(f"PDF generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate PDF")

@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
    # Get total invoices
    total_invoices = await db.invoices.count_documents({})
    
    # Get total revenue
    revenue_pipeline = [
        {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}}
    ]
    revenue_result = await db.invoices.aggregate(revenue_pipeline).to_list(1)
    total_revenue = revenue_result[0]["total"] if revenue_result else 0
    
    # Get monthly revenue (current month)
    current_month_start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    monthly_pipeline = [
        {"$match": {"created_at": {"$gte": current_month_start.isoformat()}}},
        {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}}
    ]
    monthly_result = await db.invoices.aggregate(monthly_pipeline).to_list(1)
    monthly_revenue = monthly_result[0]["total"] if monthly_result else 0
    
    # Get top products
    top_products_pipeline = [
        {"$unwind": "$items"},
        {"$group": {
            "_id": "$items.product_name",
            "total_quantity": {"$sum": "$items.quantity"},
            "total_amount": {"$sum": "$items.amount"}
        }},
        {"$sort": {"total_amount": -1}},
        {"$limit": 5}
    ]
    top_products_result = await db.invoices.aggregate(top_products_pipeline).to_list(5)
    top_products = [
        {
            "name": item["_id"],
            "quantity": item["total_quantity"],
            "amount": item["total_amount"]
        }
        for item in top_products_result
    ]
    
    return DashboardStats(
        total_invoices=total_invoices,
        total_revenue=total_revenue,
        monthly_revenue=monthly_revenue,
        top_products=top_products
    )

# Initialize admin user on startup
@app.on_event("startup")
async def create_admin_user():
    admin_user = await db.users.find_one({"role": "admin"})
    if not admin_user:
        admin_data = {
            "id": str(uuid.uuid4()),
            "username": "admin",
            "email": "admin@invoiceapp.com",
            "full_name": "System Administrator",
            "role": "admin",
            "is_active": True,
            "business_profile": BusinessProfile().dict(),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "password": hash_password("admin123")  # Change this in production
        }
        await db.users.insert_one(admin_data)
        logging.info("Admin user created: admin/admin123")

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()