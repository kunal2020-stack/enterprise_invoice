import React, { useState, useEffect } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Badge } from "./components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./components/ui/dialog";
import { Label } from "./components/ui/label";
import { Textarea } from "./components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { Separator } from "./components/ui/separator";
import { toast } from "./hooks/use-toast";
import { Toaster } from "./components/ui/toaster";
import { 
  LogOut, 
  Plus, 
  Search, 
  FileText, 
  Package, 
  DollarSign, 
  TrendingUp,
  Users,
  Eye,
  Edit,
  Download,
  User,
  Mail,
  Send,
  Building,
  MapPin,
  Phone,
  Globe,
  CreditCard,
  Printer,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = React.createContext();

const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchCurrentUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      const response = await axios.post(`${API}/auth/login`, { username, password });
      const { access_token, user: userData } = response.data;
      
      setToken(access_token);
      setUser(userData);
      localStorage.setItem('token', access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      toast({
        title: "Login Successful",
        description: `Welcome back, ${userData.full_name}!`,
      });
      
      return true;
    } catch (error) {
      toast({
        title: "Login Failed",
        description: error.response?.data?.detail || "Invalid credentials",
        variant: "destructive",
      });
      return false;
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Login Component
const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    await login(username, password);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center pb-8">
          <CardTitle className="text-3xl font-bold text-slate-800">InvoiceApp</CardTitle>
          <p className="text-slate-600 mt-2">Professional Invoicing Solution</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="username" className="text-slate-700">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-slate-700">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="mt-1"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-slate-800 hover:bg-slate-900 transition-colors"
              disabled={isLoading}
            >
              {isLoading ? "Signing In..." : "Sign In"}
            </Button>
          </form>
          <div className="mt-6 p-4 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-600 font-medium">Demo Credentials:</p>
            <p className="text-sm text-slate-500">Username: admin</p>
            <p className="text-sm text-slate-500">Password: admin123</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Profile Component
const Profile = () => {
  const [profile, setProfile] = useState({
    company_name: '',
    gst_number: '',
    pan_number: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    state_code: '',
    pincode: '',
    country: 'India',
    phone: '',
    email: '',
    website: '',
    bank_name: '',
    account_number: '',
    ifsc_code: '',
    account_holder: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await axios.get(`${API}/profile/business`);
      setProfile(response.data);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      await axios.put(`${API}/profile/business`, profile);
      toast({
        title: "Success",
        description: "Business profile updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-slate-800">Business Profile</h2>
        <Badge variant="outline" className="px-3 py-1">
          <Building className="w-4 h-4 mr-2" />
          Business Settings
        </Badge>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building className="w-5 h-5 mr-2" />
              Company Information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="company_name">Company Name *</Label>
              <Input
                id="company_name"
                value={profile.company_name}
                onChange={(e) => handleChange('company_name', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="gst_number">GST Number *</Label>
              <Input
                id="gst_number"
                value={profile.gst_number}
                onChange={(e) => handleChange('gst_number', e.target.value)}
                placeholder="22AAAAA0000A1Z5"
                required
              />
            </div>
            <div>
              <Label htmlFor="pan_number">PAN Number</Label>
              <Input
                id="pan_number"
                value={profile.pan_number}
                onChange={(e) => handleChange('pan_number', e.target.value)}
                placeholder="AAAAA0000A"
              />
            </div>
            <div>
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={profile.website}
                onChange={(e) => handleChange('website', e.target.value)}
                placeholder="www.yourcompany.com"
              />
            </div>
          </CardContent>
        </Card>

        {/* Address Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MapPin className="w-5 h-5 mr-2" />
              Address Information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="address_line1">Address Line 1 *</Label>
              <Input
                id="address_line1"
                value={profile.address_line1}
                onChange={(e) => handleChange('address_line1', e.target.value)}
                required
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="address_line2">Address Line 2</Label>
              <Input
                id="address_line2"
                value={profile.address_line2}
                onChange={(e) => handleChange('address_line2', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                value={profile.city}
                onChange={(e) => handleChange('city', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="state">State *</Label>
              <Input
                id="state"
                value={profile.state}
                onChange={(e) => handleChange('state', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="state_code">State Code *</Label>
              <Input
                id="state_code"
                value={profile.state_code}
                onChange={(e) => handleChange('state_code', e.target.value)}
                placeholder="22"
                required
              />
            </div>
            <div>
              <Label htmlFor="pincode">Pincode *</Label>
              <Input
                id="pincode"
                value={profile.pincode}
                onChange={(e) => handleChange('pincode', e.target.value)}
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Phone className="w-5 h-5 mr-2" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                value={profile.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="+91 98765 43210"
                required
              />
            </div>
            <div>
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={profile.email}
                onChange={(e) => handleChange('email', e.target.value)}
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Bank Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CreditCard className="w-5 h-5 mr-2" />
              Bank Details
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="bank_name">Bank Name *</Label>
              <Input
                id="bank_name"
                value={profile.bank_name}
                onChange={(e) => handleChange('bank_name', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="account_holder">Account Holder Name *</Label>
              <Input
                id="account_holder"
                value={profile.account_holder}
                onChange={(e) => handleChange('account_holder', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="account_number">Account Number *</Label>
              <Input
                id="account_number"
                value={profile.account_number}
                onChange={(e) => handleChange('account_number', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="ifsc_code">IFSC Code *</Label>
              <Input
                id="ifsc_code"
                value={profile.ifsc_code}
                onChange={(e) => handleChange('ifsc_code', e.target.value)}
                placeholder="SBIN0001234"
                required
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSaving} className="bg-slate-800 hover:bg-slate-900">
            {isSaving ? "Saving..." : "Save Profile"}
          </Button>
        </div>
      </form>
    </div>
  );
};
const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/dashboard/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard statistics",
        variant: "destructive",
      });
    }
  };

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-slate-800">Dashboard</h2>
        <Badge variant="outline" className="px-3 py-1">
          Welcome, {user?.full_name}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 text-sm font-medium">Total Invoices</p>
                <p className="text-3xl font-bold text-blue-800">{stats.total_invoices}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 text-sm font-medium">Total Revenue</p>
                <p className="text-3xl font-bold text-green-800">₹{stats.total_revenue.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-600 text-sm font-medium">Monthly Revenue</p>
                <p className="text-3xl font-bold text-purple-800">₹{stats.monthly_revenue.toLocaleString()}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-600 text-sm font-medium">Top Products</p>
                <p className="text-3xl font-bold text-orange-800">{stats.top_products.length}</p>
              </div>
              <Package className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {stats.top_products.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Selling Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.top_products.map((product, index) => (
                <div key={product.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Badge variant="secondary">{index + 1}</Badge>
                    <div>
                      <p className="font-medium text-slate-800">{product.name}</p>
                      <p className="text-sm text-slate-600">Qty: {product.quantity}</p>
                    </div>
                  </div>
                  <p className="font-bold text-slate-800">₹{product.amount.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Products Component
const Products = () => {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    current_price: '',
    unit: 'pcs'
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API}/products`);
      setProducts(response.data);
    } catch (error) {
      console.error('Failed to fetch products:', error);
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/products`, {
        ...formData,
        current_price: parseFloat(formData.current_price)
      });
      
      toast({
        title: "Success",
        description: "Product created successfully",
      });
      
      setShowAddProduct(false);
      setFormData({ name: '', description: '', current_price: '', unit: 'pcs' });
      fetchProducts();
    } catch (error) {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to create product",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Loading products...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-slate-800">Products</h2>
        <Dialog open={showAddProduct} onOpenChange={setShowAddProduct}>
          <DialogTrigger asChild>
            <Button className="bg-slate-800 hover:bg-slate-900">
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Product Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="price">Price (₹)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.current_price}
                  onChange={(e) => setFormData({ ...formData, current_price: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="unit">Unit</Label>
                <Select value={formData.unit} onValueChange={(value) => setFormData({ ...formData, unit: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pcs">Pieces</SelectItem>
                    <SelectItem value="kg">Kilogram</SelectItem>
                    <SelectItem value="ltr">Litre</SelectItem>
                    <SelectItem value="hr">Hour</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full">Create Product</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <Card key={product.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-800 text-lg">{product.name}</h3>
                  {product.description && (
                    <p className="text-slate-600 text-sm mt-1">{product.description}</p>
                  )}
                </div>
                <Badge variant="outline">{product.unit}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-2xl font-bold text-slate-800">₹{product.current_price}</p>
                <Button variant="outline" size="sm">
                  <Edit className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {products.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-600 mb-2">No products found</h3>
            <p className="text-slate-500 mb-4">Get started by adding your first product.</p>
            <Button onClick={() => setShowAddProduct(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Invoice Viewer Component
const InvoiceViewer = ({ invoice, onClose, onStatusUpdate }) => {
  const [isUpdating, setIsUpdating] = useState(false);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'paid': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'sent': return <Mail className="w-5 h-5 text-blue-600" />;
      case 'overdue': return <AlertCircle className="w-5 h-5 text-red-600" />;
      default: return <Clock className="w-5 h-5 text-yellow-600" />;
    }
  };

  const updateStatus = async (newStatus) => {
    setIsUpdating(true);
    try {
      await axios.put(`${API}/invoices/${invoice.id}/status?status=${newStatus}`);
      toast({
        title: "Success",
        description: `Invoice status updated to ${newStatus}`,
      });
      onStatusUpdate && onStatusUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update invoice status",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const generatePDF = () => {
    const printWindow = window.open('', '_blank');
    const invoiceHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice ${invoice.invoice_number}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
          .invoice-header { display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
          .company-info h1 { margin: 0; color: #333; font-size: 24px; }
          .company-info p { margin: 2px 0; font-size: 12px; }
          .invoice-meta { text-align: right; }
          .invoice-meta h2 { margin: 0; color: #333; font-size: 20px; }
          .invoice-meta p { margin: 2px 0; font-size: 12px; }
          .billing-section { display: flex; justify-content: space-between; margin: 30px 0; }
          .billing-info { width: 48%; }
          .billing-info h3 { margin-bottom: 10px; color: #333; font-size: 14px; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
          .billing-info p { margin: 2px 0; font-size: 12px; }
          .items-table { width: 100%; border-collapse: collapse; margin: 30px 0; }
          .items-table th, .items-table td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
          .items-table th { background-color: #f8f9fa; font-weight: bold; }
          .items-table .amount { text-align: right; }
          .totals { margin-top: 20px; }
          .totals table { width: 300px; margin-left: auto; border-collapse: collapse; }
          .totals td { padding: 5px 10px; font-size: 12px; border-bottom: 1px solid #eee; }
          .totals .total-row { font-weight: bold; border-top: 2px solid #333; }
          .notes { margin-top: 30px; }
          .notes h3 { margin-bottom: 10px; color: #333; font-size: 14px; }
          .bank-details { margin-top: 20px; }
          .bank-details h3 { margin-bottom: 10px; color: #333; font-size: 14px; }
          .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #666; border-top: 1px solid #eee; padding-top: 20px; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="invoice-header">
          <div class="company-info">
            <h1>${invoice.business_profile?.company_name || 'Your Company Name'}</h1>
            <p>${invoice.business_profile?.address_line1 || 'Your Address'}</p>
            ${invoice.business_profile?.address_line2 ? `<p>${invoice.business_profile.address_line2}</p>` : ''}
            <p>${invoice.business_profile?.city || 'City'}, ${invoice.business_profile?.state || 'State'} - ${invoice.business_profile?.pincode || '000000'}</p>
            <p>GST No: ${invoice.business_profile?.gst_number || 'GSTIN'}</p>
            <p>PAN No: ${invoice.business_profile?.pan_number || 'PAN'}</p>
            <p>Phone: ${invoice.business_profile?.phone || 'Phone'}</p>
            <p>Email: ${invoice.business_profile?.email || 'Email'}</p>
          </div>
          <div class="invoice-meta">
            <h2>TAX INVOICE</h2>
            <p><strong>Invoice No:</strong> ${invoice.invoice_number}</p>
            <p><strong>Date:</strong> ${new Date(invoice.invoice_date).toLocaleDateString()}</p>
            ${invoice.due_date ? `<p><strong>Due Date:</strong> ${new Date(invoice.due_date).toLocaleDateString()}</p>` : ''}
            <p><strong>State Code:</strong> ${invoice.business_profile?.state_code || '00'}</p>
          </div>
        </div>

        <div class="billing-section">
          <div class="billing-info">
            <h3>Bill To:</h3>
            <p><strong>${invoice.customer.name}</strong></p>
            ${invoice.customer.address ? `<p>${invoice.customer.address}</p>` : ''}
            ${invoice.customer.city ? `<p>${invoice.customer.city}, ${invoice.customer.state || ''} - ${invoice.customer.pincode || ''}</p>` : ''}
            ${invoice.customer.gst_number ? `<p>GST No: ${invoice.customer.gst_number}</p>` : ''}
            ${invoice.customer.phone ? `<p>Phone: ${invoice.customer.phone}</p>` : ''}
            ${invoice.customer.email ? `<p>Email: ${invoice.customer.email}</p>` : ''}
          </div>
          <div class="billing-info">
            <h3>Ship To:</h3>
            <p><strong>${invoice.customer.name}</strong></p>
            ${invoice.customer.address ? `<p>${invoice.customer.address}</p>` : ''}
            ${invoice.customer.city ? `<p>${invoice.customer.city}, ${invoice.customer.state || ''} - ${invoice.customer.pincode || ''}</p>` : ''}
          </div>
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
            ${invoice.items.map((item, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>
                  <strong>${item.product_name}</strong>
                  ${item.description ? `<br><small>${item.description}</small>` : ''}
                </td>
                <td>${item.quantity}</td>
                <td class="amount">₹${item.rate.toFixed(2)}</td>
                <td class="amount">₹${item.amount.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="totals">
          <table>
            <tr>
              <td>Subtotal:</td>
              <td class="amount">₹${invoice.subtotal.toFixed(2)}</td>
            </tr>
            <tr>
              <td>CGST (${(invoice.tax_rate / 2)}%):</td>
              <td class="amount">₹${(invoice.tax_amount / 2).toFixed(2)}</td>
            </tr>
            <tr>
              <td>SGST (${(invoice.tax_rate / 2)}%):</td>
              <td class="amount">₹${(invoice.tax_amount / 2).toFixed(2)}</td>
            </tr>
            <tr class="total-row">
              <td><strong>Total Amount:</strong></td>
              <td class="amount"><strong>₹${invoice.total_amount.toFixed(2)}</strong></td>
            </tr>
          </table>
        </div>

        ${invoice.notes ? `
          <div class="notes">
            <h3>Notes:</h3>
            <p>${invoice.notes}</p>
          </div>
        ` : ''}

        ${invoice.bank_details || invoice.business_profile ? `
          <div class="bank-details">
            <h3>Bank Details:</h3>
            <p><strong>Bank:</strong> ${invoice.bank_details?.bank_name || invoice.business_profile?.bank_name || 'Bank Name'}</p>
            <p><strong>Account No:</strong> ${invoice.bank_details?.account_number || invoice.business_profile?.account_number || 'Account Number'}</p>
            <p><strong>IFSC:</strong> ${invoice.bank_details?.ifsc_code || invoice.business_profile?.ifsc_code || 'IFSC Code'}</p>
            <p><strong>Account Holder:</strong> ${invoice.bank_details?.account_holder || invoice.business_profile?.account_holder || 'Account Holder'}</p>
          </div>
        ` : ''}

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
    printWindow.print();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-bold text-slate-800">Invoice {invoice.invoice_number}</h2>
            <div className="flex items-center space-x-2">
              {getStatusIcon(invoice.status)}
              <Badge 
                variant="outline"
                className={
                  invoice.status === 'paid' ? 'border-green-200 bg-green-50 text-green-700' :
                  invoice.status === 'sent' ? 'border-blue-200 bg-blue-50 text-blue-700' :
                  invoice.status === 'overdue' ? 'border-red-200 bg-red-50 text-red-700' :
                  'border-yellow-200 bg-yellow-50 text-yellow-700'
                }
              >
                {invoice.status.toUpperCase()}
              </Badge>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Select onValueChange={updateStatus} disabled={isUpdating}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Update Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={generatePDF} variant="outline">
              <Printer className="w-4 h-4 mr-2" />
              Print/PDF
            </Button>
            <Button onClick={onClose} variant="outline">
              <XCircle className="w-4 h-4 mr-2" />
              Close
            </Button>
          </div>
        </div>

        <div className="p-6">
          {/* Invoice Content */}
          <div className="bg-white border border-slate-200 rounded-lg p-8">
            {/* Header */}
            <div className="flex justify-between items-start mb-8 pb-6 border-b-2 border-slate-800">
              <div>
                <h1 className="text-2xl font-bold text-slate-800 mb-2">
                  {invoice.business_profile?.company_name || 'Your Company Name'}
                </h1>
                <div className="text-sm text-slate-600 space-y-1">
                  <p>{invoice.business_profile?.address_line1 || 'Your Address'}</p>
                  {invoice.business_profile?.address_line2 && <p>{invoice.business_profile.address_line2}</p>}
                  <p>{invoice.business_profile?.city || 'City'}, {invoice.business_profile?.state || 'State'} - {invoice.business_profile?.pincode || '000000'}</p>
                  <p>GST No: {invoice.business_profile?.gst_number || 'GSTIN'}</p>
                  <p>Phone: {invoice.business_profile?.phone || 'Phone'} | Email: {invoice.business_profile?.email || 'Email'}</p>
                </div>
              </div>
              <div className="text-right">
                <h2 className="text-xl font-bold text-slate-800 mb-2">TAX INVOICE</h2>
                <div className="text-sm text-slate-600 space-y-1">
                  <p><span className="font-medium">Invoice No:</span> {invoice.invoice_number}</p>
                  <p><span className="font-medium">Date:</span> {new Date(invoice.invoice_date).toLocaleDateString()}</p>
                  {invoice.due_date && <p><span className="font-medium">Due Date:</span> {new Date(invoice.due_date).toLocaleDateString()}</p>}
                  <p><span className="font-medium">State Code:</span> {invoice.business_profile?.state_code || '00'}</p>
                </div>
              </div>
            </div>

            {/* Billing Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="font-semibold text-slate-800 mb-3 pb-2 border-b border-slate-200">Bill To:</h3>
                <div className="text-sm text-slate-600 space-y-1">
                  <p className="font-medium text-slate-800">{invoice.customer.name}</p>
                  {invoice.customer.address && <p>{invoice.customer.address}</p>}
                  {invoice.customer.city && <p>{invoice.customer.city}, {invoice.customer.state} - {invoice.customer.pincode}</p>}
                  {invoice.customer.gst_number && <p>GST No: {invoice.customer.gst_number}</p>}
                  {invoice.customer.phone && <p>Phone: {invoice.customer.phone}</p>}
                  {invoice.customer.email && <p>Email: {invoice.customer.email}</p>}
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 mb-3 pb-2 border-b border-slate-200">Ship To:</h3>
                <div className="text-sm text-slate-600 space-y-1">
                  <p className="font-medium text-slate-800">{invoice.customer.name}</p>
                  {invoice.customer.address && <p>{invoice.customer.address}</p>}
                  {invoice.customer.city && <p>{invoice.customer.city}, {invoice.customer.state} - {invoice.customer.pincode}</p>}
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="mb-8">
              <table className="w-full border border-slate-300">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="border border-slate-300 p-3 text-left text-sm font-semibold">S.No</th>
                    <th className="border border-slate-300 p-3 text-left text-sm font-semibold">Description</th>
                    <th className="border border-slate-300 p-3 text-center text-sm font-semibold">Qty</th>
                    <th className="border border-slate-300 p-3 text-right text-sm font-semibold">Rate</th>
                    <th className="border border-slate-300 p-3 text-right text-sm font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item, index) => (
                    <tr key={index}>
                      <td className="border border-slate-300 p-3 text-sm">{index + 1}</td>
                      <td className="border border-slate-300 p-3 text-sm">
                        <div className="font-medium">{item.product_name}</div>
                        {item.description && <div className="text-slate-600 text-xs mt-1">{item.description}</div>}
                      </td>
                      <td className="border border-slate-300 p-3 text-sm text-center">{item.quantity}</td>
                      <td className="border border-slate-300 p-3 text-sm text-right">₹{item.rate.toFixed(2)}</td>
                      <td className="border border-slate-300 p-3 text-sm text-right">₹{item.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end mb-8">
              <div className="w-80">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>₹{invoice.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>CGST ({(invoice.tax_rate / 2)}%):</span>
                    <span>₹{(invoice.tax_amount / 2).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>SGST ({(invoice.tax_rate / 2)}%):</span>
                    <span>₹{(invoice.tax_amount / 2).toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total Amount:</span>
                    <span>₹{invoice.total_amount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            {invoice.notes && (
              <div className="mb-8">
                <h3 className="font-semibold text-slate-800 mb-3">Notes:</h3>
                <p className="text-sm text-slate-600">{invoice.notes}</p>
              </div>
            )}

            {/* Bank Details */}
            {(invoice.bank_details || invoice.business_profile) && (
              <div className="mb-8">
                <h3 className="font-semibold text-slate-800 mb-3">Bank Details:</h3>
                <div className="text-sm text-slate-600 space-y-1">
                  <p><span className="font-medium">Bank:</span> {invoice.bank_details?.bank_name || invoice.business_profile?.bank_name || 'Bank Name'}</p>
                  <p><span className="font-medium">Account No:</span> {invoice.bank_details?.account_number || invoice.business_profile?.account_number || 'Account Number'}</p>
                  <p><span className="font-medium">IFSC:</span> {invoice.bank_details?.ifsc_code || invoice.business_profile?.ifsc_code || 'IFSC Code'}</p>
                  <p><span className="font-medium">Account Holder:</span> {invoice.bank_details?.account_holder || invoice.business_profile?.account_holder || 'Account Holder'}</p>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="text-center text-xs text-slate-500 pt-6 border-t border-slate-200">
              <p>This is a computer generated invoice and does not require signature.</p>
              <p className="mt-1">Thank you for your business!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
const CreateInvoice = ({ onClose, onSuccess }) => {
  const [customer, setCustomer] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: ''
  });
  const [items, setItems] = useState([{
    product_id: '',
    product_name: '',
    description: '',
    quantity: 1,
    rate: 0,
    amount: 0
  }]);
  const [taxRate, setTaxRate] = useState(18);
  const [notes, setNotes] = useState('');
  const [bankDetails, setBankDetails] = useState({
    bank_name: '',
    account_number: '',
    ifsc_code: '',
    account_holder: ''
  });
  const [productSuggestions, setProductSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const searchProducts = async (query, itemIndex) => {
    if (query.length < 2) {
      setProductSuggestions([]);
      return;
    }
    
    try {
      const response = await axios.get(`${API}/products/search?q=${query}`);
      setProductSuggestions(response.data.map(p => ({ ...p, itemIndex })));
    } catch (error) {
      console.error('Product search failed:', error);
    }
  };

  const selectProduct = (product, itemIndex) => {
    const newItems = [...items];
    newItems[itemIndex] = {
      ...newItems[itemIndex],
      product_id: product.id,
      product_name: product.name,
      description: product.description || '',
      rate: product.current_price,
      amount: newItems[itemIndex].quantity * product.current_price
    };
    setItems(newItems);
    setProductSuggestions([]);
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    
    if (field === 'quantity' || field === 'rate') {
      newItems[index].amount = newItems[index].quantity * newItems[index].rate;
    }
    
    if (field === 'product_name') {
      searchProducts(value, index);
    }
    
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, {
      product_id: '',
      product_name: '',
      description: '',
      quantity: 1,
      rate: 0,
      amount: 0
    }]);
  };

  const removeItem = (index) => {
    if (items.length > 1) {
      const newItems = items.filter((_, i) => i !== index);
      setItems(newItems);
    }
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;
    return { subtotal, taxAmount, total };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const { subtotal, taxAmount, total } = calculateTotals();
      
      const invoiceData = {
        customer,
        items,
        tax_rate: taxRate,
        bank_details: bankDetails.bank_name ? bankDetails : null,
        notes
      };
      
      await axios.post(`${API}/invoices`, invoiceData);
      
      toast({
        title: "Success",
        description: "Invoice created successfully",
      });
      
      onSuccess && onSuccess();
      onClose && onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to create invoice",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const { subtotal, taxAmount, total } = calculateTotals();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Create Invoice</h2>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Details */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="customer-name">Customer Name *</Label>
              <Input
                id="customer-name"
                value={customer.name}
                onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="customer-email">Email</Label>
              <Input
                id="customer-email"
                type="email"
                value={customer.email}
                onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="customer-phone">Phone</Label>
              <Input
                id="customer-phone"
                value={customer.phone}
                onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="customer-city">City</Label>
              <Input
                id="customer-city"
                value={customer.city}
                onChange={(e) => setCustomer({ ...customer, city: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="customer-address">Address</Label>
              <Textarea
                id="customer-address"
                value={customer.address}
                onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Invoice Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Invoice Items
              <Button type="button" onClick={addItem} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-start p-4 border rounded-lg relative">
                  <div className="col-span-3">
                    <Label>Product Name *</Label>
                    <div className="relative">
                      <Input
                        value={item.product_name}
                        onChange={(e) => updateItem(index, 'product_name', e.target.value)}
                        placeholder="Start typing product name..."
                        required
                      />
                      {productSuggestions.length > 0 && productSuggestions[0]?.itemIndex === index && (
                        <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-md shadow-lg z-10 max-h-40 overflow-y-auto">
                          {productSuggestions.map((product) => (
                            <div
                              key={product.id}
                              className="p-2 hover:bg-slate-50 cursor-pointer"
                              onClick={() => selectProduct(product, index)}
                            >
                              <div className="font-medium">{product.name}</div>
                              <div className="text-sm text-slate-500">₹{product.current_price}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="col-span-3">
                    <Label>Description</Label>
                    <Input
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                      placeholder="Item description"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Quantity *</Label>
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Rate (₹) *</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.rate}
                      onChange={(e) => updateItem(index, 'rate', parseFloat(e.target.value) || 0)}
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Amount (₹)</Label>
                    <Input
                      value={item.amount.toFixed(2)}
                      readOnly
                      className="bg-slate-50"
                    />
                  </div>
                  {items.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeItem(index)}
                      className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full"
                    >
                      ×
                    </Button>
                  )}
                </div>
              ))}
            </div>
            
            {/* Totals */}
            <div className="mt-6 space-y-2">
              <Separator />
              <div className="flex justify-end space-x-6">
                <div className="text-right space-y-2">
                  <div className="flex justify-between items-center w-48">
                    <span>Subtotal:</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Tax ({taxRate}%):</span>
                    <span>₹{taxAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total:</span>
                    <span>₹{total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tax Rate */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tax-rate">Tax Rate (%)</Label>
                <Input
                  id="tax-rate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={taxRate}
                  onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes for the invoice"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Creating..." : "Create Invoice"}
          </Button>
        </div>
      </form>
    </div>
  );
};

// Placeholder components for other sections
const InvoicesPage = () => {
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateInvoice, setShowCreateInvoice] = useState(false);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const response = await axios.get(`${API}/invoices`);
      setInvoices(response.data);
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
      toast({
        title: "Error",
        description: "Failed to load invoices",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvoiceCreated = () => {
    fetchInvoices();
    setShowCreateInvoice(false);
  };

  if (showCreateInvoice) {
    return (
      <CreateInvoice 
        onClose={() => setShowCreateInvoice(false)}
        onSuccess={handleInvoiceCreated}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Loading invoices...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-slate-800">Invoices</h2>
        <Button onClick={() => setShowCreateInvoice(true)} className="bg-slate-800 hover:bg-slate-900">
          <Plus className="w-4 h-4 mr-2" />
          Create Invoice
        </Button>
      </div>

      {invoices.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-600 mb-2">No invoices found</h3>
            <p className="text-slate-500 mb-4">Create your first invoice to get started.</p>
            <Button onClick={() => setShowCreateInvoice(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Invoice
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {invoices.map((invoice) => (
            <Card key={invoice.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-slate-800">{invoice.invoice_number}</h3>
                    <p className="text-slate-600">{invoice.customer.name}</p>
                  </div>
                  <Badge 
                    variant="outline"
                    className={
                      invoice.status === 'paid' ? 'border-green-200 bg-green-50 text-green-700' :
                      invoice.status === 'sent' ? 'border-blue-200 bg-blue-50 text-blue-700' :
                      invoice.status === 'overdue' ? 'border-red-200 bg-red-50 text-red-700' :
                      'border-yellow-200 bg-yellow-50 text-yellow-700'
                    }
                  >
                    {invoice.status}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <p className="text-2xl font-bold text-slate-800">₹{invoice.total_amount.toLocaleString()}</p>
                  <p className="text-sm text-slate-500">
                    {new Date(invoice.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-slate-600">{invoice.items.length} items</p>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

const UsersPage = () => (
  <div className="space-y-6">
    <h2 className="text-3xl font-bold text-slate-800">Users</h2>
    <Card>
      <CardContent className="p-12 text-center">
        <Users className="w-12 h-12 text-slate-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-600 mb-2">User management coming soon</h3>
        <p className="text-slate-500">Manage user accounts and permissions.</p>
      </CardContent>
    </Card>
  </div>
);

// Main Layout Component
const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const [currentTab, setCurrentTab] = useState("dashboard");

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <h1 className="text-2xl font-bold text-slate-800">InvoiceApp</h1>
            <Tabs value={currentTab} onValueChange={setCurrentTab}>
              <TabsList className="bg-slate-100">
                <TabsTrigger value="dashboard" className="data-[state=active]:bg-white">Dashboard</TabsTrigger>
                <TabsTrigger value="products" className="data-[state=active]:bg-white">Products</TabsTrigger>
                <TabsTrigger value="invoices" className="data-[state=active]:bg-white">Invoices</TabsTrigger>
                {user?.role === 'admin' && (
                  <TabsTrigger value="users" className="data-[state=active]:bg-white">Users</TabsTrigger>
                )}
              </TabsList>
            </Tabs>
          </div>
          <div className="flex items-center space-x-4">
            <Badge variant="secondary" className="px-3 py-1">
              {user?.role === 'admin' ? 'Admin' : 'User'}
            </Badge>
            <Button variant="outline" onClick={logout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <Tabs value={currentTab} onValueChange={setCurrentTab}>
          <TabsContent value="dashboard">
            <Dashboard />
          </TabsContent>
          <TabsContent value="products">
            <Products />
          </TabsContent>
          <TabsContent value="invoices">
            <InvoicesPage />
          </TabsContent>
          {user?.role === 'admin' && (
            <TabsContent value="users">
              <UsersPage />
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
};

// Main App Component
const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="App">
          <Routes>
            <Route path="/login" element={<LoginWrapper />} />
            <Route path="/*" element={<ProtectedRoute />} />
          </Routes>
          <Toaster />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
};

const LoginWrapper = () => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }
  
  if (user) {
    return <Navigate to="/" replace />;
  }
  
  return <Login />;
};

const ProtectedRoute = () => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <Layout />;
};

export default App;