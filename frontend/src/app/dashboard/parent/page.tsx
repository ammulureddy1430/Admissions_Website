"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  School, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  FileText, 
  Calendar, 
  CreditCard, 
  MessageSquare, 
  LogOut, 
  Send, 
  AlertCircle, 
  BookOpen,
  ArrowRight,
  Sparkles
} from "lucide-react";
import Link from "next/link";

export default function ParentDashboard() {
  const router = useRouter();
  
  // Local contexts
  const [schoolId, setSchoolId] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [user, setUser] = useState<any>(null);

  // States
  const [applications, setApplications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AI Chat states
  const [chatMessages, setChatMessages] = useState<any[]>([
    { role: "assistant", content: "Hello! I am the Admissions OS AI Assistant. Ask me anything about the admission process, school syllabus, curriculum, or fees structure." }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Form states for new application
  const [isAppFormOpen, setIsAppFormOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(1);
  const [newApp, setNewApp] = useState({
    studentFirstName: "",
    studentLastName: "",
    studentDob: "",
    studentGender: "MALE",
    grade: "Grade 1",
    bloodGroup: "O+",
    nationality: "Indian",
    religion: "Hindu",
    motherTongue: "English",
    primaryAddress: "",
    city: "",
    state: "",
    zipCode: "",
    fatherName: "",
    fatherOccupation: "",
    fatherPhone: "",
    motherName: "",
    motherOccupation: "",
    motherPhone: "",
    previousSchoolName: "",
    previousSchoolGrade: "",
    previousSchoolMarks: "",
    allergies: "",
    medicalConditions: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
  });

  // Load context on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedSchoolId = localStorage.getItem("schoolId");
    const storedSchoolName = localStorage.getItem("schoolName");
    const storedSubdomain = localStorage.getItem("subdomain");

    if (!storedUser || !storedSchoolId) {
      router.push("/login");
      return;
    }

    setUser(JSON.parse(storedUser));
    setSchoolId(storedSchoolId);
    setSchoolName(storedSchoolName || "Greenwood International School");
    setSubdomain(storedSubdomain || "demo");
  }, [router]);

  // Fetch parent applications
  useEffect(() => {
    if (!schoolId) return;

    async function fetchApplications() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch("http://localhost:5001/application/parent", {
          headers: { "x-tenant-id": schoolId },
        });
        if (!res.ok) throw new Error("Failed to load applications.");
        const data = await res.json();
        setApplications(data);
      } catch (err: any) {
        setError(err.message || "Failed to load page.");
      } finally {
        setIsLoading(false);
      }
    }
    fetchApplications();
  }, [schoolId]);

  const handleCreateApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch("http://localhost:5001/application", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          "x-tenant-id": schoolId 
        },
        body: JSON.stringify(newApp),
      });

      if (res.ok) {
        // Reload applications list
        const appsRes = await fetch("http://localhost:5001/application/parent", {
          headers: { "x-tenant-id": schoolId }
        });
        if (appsRes.ok) setApplications(await appsRes.json());
        setIsAppFormOpen(false);
        setNewApp({
          studentFirstName: "",
          studentLastName: "",
          studentDob: "",
          studentGender: "MALE",
          grade: "Grade 1",
          bloodGroup: "O+",
          nationality: "Indian",
          religion: "Hindu",
          motherTongue: "English",
          primaryAddress: "",
          city: "",
          state: "",
          zipCode: "",
          fatherName: "",
          fatherOccupation: "",
          fatherPhone: "",
          motherName: "",
          motherOccupation: "",
          motherPhone: "",
          previousSchoolName: "",
          previousSchoolGrade: "",
          previousSchoolMarks: "",
          allergies: "",
          medicalConditions: "",
          emergencyContactName: "",
          emergencyContactPhone: "",
        });
        setActiveStep(1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePayFee = async (appId: string) => {
    setActionLoading(true);
    try {
      // 1. Create order
      const orderRes = await fetch("http://localhost:5001/payment/order", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          "x-tenant-id": schoolId 
        },
        body: JSON.stringify({ applicationId: appId }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error("Order creation failed.");

      // 2. Mock payment confirmation verification immediately
      const verifyRes = await fetch("http://localhost:5001/payment/verify", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          "x-tenant-id": schoolId 
        },
        body: JSON.stringify({
          razorpayOrderId: orderData.orderId,
          razorpayPaymentId: `pay_mock_${Math.random().toString(36).substring(2, 10)}`,
          razorpaySignature: "mock_signature_valid",
        }),
      });

      if (verifyRes.ok) {
        // Reload applications list
        const appsRes = await fetch("http://localhost:5001/application/parent", {
          headers: { "x-tenant-id": schoolId }
        });
        if (appsRes.ok) setApplications(await appsRes.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUploadDocument = async (appId: string, name: string, type: string) => {
    setActionLoading(true);
    try {
      // Mock File Upload directly creating the document url
      const mockFileUrl = `https://admissionsos-storage.s3.amazonaws.com/tenants/${schoolId}/apps/${appId}/${name.toLowerCase().replace(' ', '_')}.pdf`;
      const res = await fetch("http://localhost:5001/document", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          "x-tenant-id": schoolId 
        },
        body: JSON.stringify({
          applicationId: appId,
          name,
          type,
          url: mockFileUrl,
        }),
      });

      if (res.ok) {
        // Reload applications list
        const appsRes = await fetch("http://localhost:5001/application/parent", {
          headers: { "x-tenant-id": schoolId }
        });
        if (appsRes.ok) setApplications(await appsRes.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userMessage = inputMessage;
    setInputMessage("");
    setChatMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsAiLoading(true);

    try {
      const response = await fetch("http://localhost:5001/ai/chat", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          "x-tenant-id": schoolId 
        },
        body: JSON.stringify({ message: userMessage }),
      });

      const data = await response.json();
      if (response.ok) {
        setChatMessages((prev) => [...prev, { role: "assistant", content: data.response }]);
      } else {
        setChatMessages((prev) => [...prev, { role: "assistant", content: "I encountered an error connecting to my AI logic. Please try again." }]);
      }
    } catch (err) {
      console.error(err);
      setChatMessages((prev) => [...prev, { role: "assistant", content: "Network error. Try checking your backend." }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center font-sans">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-500 mx-auto" />
          <p className="text-xs text-slate-400">Loading Parent Portal Context...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col h-screen overflow-hidden">
      
      {/* Portal Header */}
      <header className="bg-slate-900 border-b border-slate-800/80 px-8 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg text-white">
            <School className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-white">{schoolName}</h2>
            <span className="text-[10px] text-slate-500">Parent Admission Portal</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-400 font-medium hidden sm:inline">
            Logged in: <b className="text-indigo-400">{user?.email}</b>
          </span>
          <button 
            onClick={handleLogout}
            className="border border-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" /> Log Out
          </button>
        </div>
      </header>

      {/* Main Split Layout */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Side: Parent Workspace */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          
          {error && (
            <div className="bg-rose-950/20 border border-rose-800/50 text-rose-300 p-4 rounded-xl text-xs font-semibold flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Intro Section */}
          <div className="flex justify-between items-center bg-slate-900/40 p-6 rounded-2xl border border-slate-900">
            <div>
              <h1 className="text-xl font-bold text-white mb-1">Hello, {user?.firstName}!</h1>
              <p className="text-xs text-slate-400">Track and manage your children's admission applications.</p>
            </div>
            <button
              onClick={() => setIsAppFormOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg text-xs font-bold text-white flex items-center gap-1.5 shadow-lg shadow-indigo-600/10 transition-all active:scale-95"
            >
              Start New Application <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Applications list */}
          <div className="space-y-6">
            <h3 className="font-bold text-sm text-slate-400 uppercase tracking-wider">Active Applications</h3>
            
            {applications.length === 0 ? (
              <div className="text-center p-12 bg-slate-900/10 border border-slate-900 rounded-2xl">
                <p className="text-sm text-slate-500">You have no active admissions applications. Click the button above to begin.</p>
              </div>
            ) : (
              applications.map((app) => (
                <div key={app.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
                  
                  {/* Row 1: Student details & status */}
                  <div className="flex justify-between items-start border-b border-slate-800/50 pb-4">
                    <div>
                      <h4 className="font-extrabold text-base text-white">{app.studentFirstName} {app.studentLastName}</h4>
                      <span className="text-xs text-slate-500">{app.grade} • DOB: {new Date(app.studentDob).toLocaleDateString()}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 font-mono block mb-1">Status</span>
                      <span className="bg-indigo-950 text-indigo-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-indigo-900/30">
                        {app.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  {/* Row 2: Status stages tracker */}
                  <div className="grid grid-cols-4 gap-4 text-center">
                    {[
                      { step: "Applied", active: true },
                      { step: "Documents Upload", active: app.documents.length > 0 },
                      { step: "Registration Payment", active: app.paymentStatus === "PAID" },
                      { step: "Interview Assessment", active: app.status === "INTERVIEW_SCHEDULED" || app.status === "APPROVED" },
                    ].map((st, i) => (
                      <div key={i} className="space-y-2">
                        <div className={`h-1.5 rounded-full ${st.active ? "bg-emerald-500" : "bg-slate-800"}`} />
                        <span className={`text-[10px] block font-semibold ${st.active ? "text-emerald-400" : "text-slate-500"}`}>{st.step}</span>
                      </div>
                    ))}
                  </div>

                  {/* Row 3: Action panels */}
                  <div className="grid md:grid-cols-2 gap-6 pt-4">
                    
                    {/* Action 1: Upload Documents */}
                    <div className="bg-slate-950/40 p-4 border border-slate-850 rounded-xl space-y-4">
                      <h5 className="font-bold text-xs text-white flex items-center gap-1.5">
                        <FileText className="h-4 w-4 text-indigo-400" /> Documents Checklist
                      </h5>
                      <div className="space-y-2.5 text-xs">
                        {[
                          { name: "Birth Certificate", type: "BIRTH_CERTIFICATE" },
                          { name: "Previous School Transcript", type: "TRANSCRIPT" },
                          { name: "Parent ID Proof", type: "ID_PROOF" },
                        ].map((doc, idx) => {
                          const uploaded = app.documents.find((d: any) => d.type === doc.type);
                          return (
                            <div key={idx} className="flex justify-between items-center p-2 rounded bg-slate-900/50">
                              <div>
                                <span className="font-medium text-slate-300">{doc.name}</span>
                                {uploaded && (
                                  <span className={`block text-[9px] font-bold ${
                                    uploaded.status === "APPROVED" ? "text-emerald-400" : "text-amber-400"
                                  }`}>{uploaded.status}</span>
                                )}
                              </div>
                              {uploaded ? (
                                <CheckCircle className="h-4 w-4 text-emerald-500" />
                              ) : (
                                <button 
                                  onClick={() => handleUploadDocument(app.id, doc.name, doc.type)}
                                  className="text-[10px] bg-slate-800 hover:bg-slate-700 hover:text-white px-2 py-1 rounded transition-all"
                                >
                                  Mock Upload
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Action 2: Registration Payments */}
                    <div className="bg-slate-950/40 p-4 border border-slate-850 rounded-xl flex flex-col justify-between">
                      <div className="space-y-2">
                        <h5 className="font-bold text-xs text-white flex items-center gap-1.5">
                          <CreditCard className="h-4 w-4 text-indigo-400" /> Registration Fee Payment
                        </h5>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          To finalize application review, pay the school registration processing fee.
                        </p>
                      </div>
                      
                      <div className="flex justify-between items-center mt-4">
                        <div>
                          <span className="text-[9px] text-slate-500 font-mono block">Amount due:</span>
                          <span className="text-base font-extrabold text-white">₹1,500</span>
                        </div>
                        {app.paymentStatus === "PAID" ? (
                          <div className="bg-emerald-950 text-emerald-400 px-3 py-1 rounded text-xs font-bold flex items-center gap-1">
                            <Check className="h-3.5 w-3.5" /> Paid Success
                          </div>
                        ) : (
                          <button
                            onClick={() => handlePayFee(app.id)}
                            disabled={actionLoading}
                            className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg text-xs font-bold text-white shadow-md active:scale-95 transition-all"
                          >
                            Pay Registration Fee
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Interactive AI Assistant Sidebar */}
        <div className="w-80 bg-slate-900 border-l border-slate-800 shrink-0 flex flex-col">
          <div className="p-4 border-b border-slate-800/80 flex items-center gap-2 bg-slate-950/50">
            <Sparkles className="h-4 w-4 text-indigo-400 animate-pulse" />
            <h3 className="font-bold text-xs text-white uppercase tracking-wider">Pehchaan AI Assistant</h3>
          </div>
          
          {/* Chat Messages Log */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            {chatMessages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`max-w-[85%] rounded-xl p-3 leading-relaxed ${
                  msg.role === "user" 
                    ? "bg-indigo-600 text-white ml-auto rounded-tr-none" 
                    : "bg-slate-950 border border-slate-850 text-slate-300 mr-auto rounded-tl-none"
                }`}
              >
                {msg.content}
              </div>
            ))}
            {isAiLoading && (
              <div className="flex items-center gap-2 text-[10px] text-slate-500 italic pl-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Thinking...
              </div>
            )}
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-800/85 bg-slate-950/50 flex gap-2">
            <input 
              type="text" 
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask about curriculum, K-12 fees..."
              className="flex-1 bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 placeholder:text-slate-650"
            />
            <button 
              type="submit" 
              className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-lg transition-colors active:scale-90"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>

      {/* Application Creation Modal Overlay */}
      {isAppFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-2xl space-y-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div>
                <h3 className="font-bold text-lg text-white">Admissions Application Wizard</h3>
                <span className="text-xs text-slate-500">Step {activeStep} of 3</span>
              </div>
              <button type="button" onClick={() => { setIsAppFormOpen(false); setActiveStep(1); }} className="text-slate-400 hover:text-white"><XCircle className="h-5 w-5" /></button>
            </div>

            {/* Stepper Progress Visualizer */}
            <div className="flex justify-between items-center text-xs font-semibold px-2">
              <span className={activeStep >= 1 ? "text-indigo-400" : "text-slate-500"}>1. Student Profile</span>
              <div className={`h-0.5 flex-1 mx-4 ${activeStep >= 2 ? "bg-indigo-500" : "bg-slate-800"}`} />
              <span className={activeStep >= 2 ? "text-indigo-400" : "text-slate-500"}>2. Parent Details</span>
              <div className={`h-0.5 flex-1 mx-4 ${activeStep >= 3 ? "bg-indigo-500" : "bg-slate-800"}`} />
              <span className={activeStep >= 3 ? "text-indigo-400" : "text-slate-500"}>3. History & Medical</span>
            </div>

            {/* Step Content */}
            <div className="space-y-4">
              {activeStep === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400">Child's First Name *</label>
                      <input required type="text" placeholder="Sarah" value={newApp.studentFirstName} onChange={(e) => setNewApp(prev => ({ ...prev, studentFirstName: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400">Child's Last Name *</label>
                      <input required type="text" placeholder="Jenkins" value={newApp.studentLastName} onChange={(e) => setNewApp(prev => ({ ...prev, studentLastName: e.target.value }))} className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400">Date of Birth *</label>
                      <input required type="date" value={newApp.studentDob} onChange={(e) => setNewApp(prev => ({ ...prev, studentDob: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400">Blood Group</label>
                      <input type="text" placeholder="O+" value={newApp.bloodGroup} onChange={(e) => setNewApp(prev => ({ ...prev, bloodGroup: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500" />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400">Gender *</label>
                      <select value={newApp.studentGender} onChange={(e) => setNewApp(prev => ({ ...prev, studentGender: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500">
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400">Grade Level *</label>
                      <select value={newApp.grade} onChange={(e) => setNewApp(prev => ({ ...prev, grade: e.target.value }))} className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500">
                        <option value="Grade 1">Grade 1</option>
                        <option value="Grade 2">Grade 2</option>
                        <option value="Grade 3">Grade 3</option>
                        <option value="Grade 4">Grade 4</option>
                        <option value="Grade 5">Grade 5</option>
                        <option value="Grade 6">Grade 6</option>
                        <option value="Grade 7">Grade 7</option>
                        <option value="Grade 8">Grade 8</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400">Nationality</label>
                      <input type="text" placeholder="Indian" value={newApp.nationality} onChange={(e) => setNewApp(prev => ({ ...prev, nationality: e.target.value }))} className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Primary Address</label>
                    <input type="text" placeholder="123 Main St" value={newApp.primaryAddress} onChange={(e) => setNewApp(prev => ({ ...prev, primaryAddress: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500" />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400">City</label>
                      <input type="text" placeholder="Mumbai" value={newApp.city} onChange={(e) => setNewApp(prev => ({ ...prev, city: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400">State</label>
                      <input type="text" placeholder="MH" value={newApp.state} onChange={(e) => setNewApp(prev => ({ ...prev, state: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400">Zip Code</label>
                      <input type="text" placeholder="400001" value={newApp.zipCode} onChange={(e) => setNewApp(prev => ({ ...prev, zipCode: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500" />
                    </div>
                  </div>
                </div>
              )}

              {activeStep === 2 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400">Father's Full Name</label>
                      <input type="text" placeholder="Richard Jenkins" value={newApp.fatherName} onChange={(e) => setNewApp(prev => ({ ...prev, fatherName: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400">Father's Occupation</label>
                      <input type="text" placeholder="Architect" value={newApp.fatherOccupation} onChange={(e) => setNewApp(prev => ({ ...prev, fatherOccupation: e.target.value }))} className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500" />
                    </div>
                    <div className="space-y-1 col-span-2">
                      <label className="text-xs text-slate-400">Father's Phone Number</label>
                      <input type="text" placeholder="+919876543210" value={newApp.fatherPhone} onChange={(e) => setNewApp(prev => ({ ...prev, fatherPhone: e.target.value }))} className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-slate-850 pt-4">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400">Mother's Full Name</label>
                      <input type="text" placeholder="Maria Jenkins" value={newApp.motherName} onChange={(e) => setNewApp(prev => ({ ...prev, motherName: e.target.value }))} className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400">Mother's Occupation</label>
                      <input type="text" placeholder="Software Engineer" value={newApp.motherOccupation} onChange={(e) => setNewApp(prev => ({ ...prev, motherOccupation: e.target.value }))} className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500" />
                    </div>
                    <div className="space-y-1 col-span-2">
                      <label className="text-xs text-slate-400">Mother's Phone Number</label>
                      <input type="text" placeholder="+919876543209" value={newApp.motherPhone} onChange={(e) => setNewApp(prev => ({ ...prev, motherPhone: e.target.value }))} className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500" />
                    </div>
                  </div>
                </div>
              )}

              {activeStep === 3 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1 col-span-2">
                      <label className="text-xs text-slate-400">Previous School Name</label>
                      <input type="text" placeholder="St. Mary's Preschool" value={newApp.previousSchoolName} onChange={(e) => setNewApp(prev => ({ ...prev, previousSchoolName: e.target.value }))} className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400">Marks / Grade</label>
                      <input type="text" placeholder="A+" value={newApp.previousSchoolMarks} onChange={(e) => setNewApp(prev => ({ ...prev, previousSchoolMarks: e.target.value }))} className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-slate-850 pt-4">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400">Allergies (If any)</label>
                      <input type="text" placeholder="Peanuts, Dust" value={newApp.allergies} onChange={(e) => setNewApp(prev => ({ ...prev, allergies: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400">Medical Conditions</label>
                      <input type="text" placeholder="Mild Asthma" value={newApp.medicalConditions} onChange={(e) => setNewApp(prev => ({ ...prev, medicalConditions: e.target.value }))} className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-slate-850 pt-4">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400">Emergency Contact Name *</label>
                      <input required type="text" placeholder="Grandmother Jenkins" value={newApp.emergencyContactName} onChange={(e) => setNewApp(prev => ({ ...prev, emergencyContactName: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400">Emergency Phone *</label>
                      <input required type="text" placeholder="+919876543208" value={newApp.emergencyContactPhone} onChange={(e) => setNewApp(prev => ({ ...prev, emergencyContactPhone: e.target.value }))} className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Stepper Actions footer */}
            <div className="flex justify-between items-center border-t border-slate-800 pt-4">
              <button
                type="button"
                disabled={activeStep === 1}
                onClick={() => setActiveStep(prev => prev - 1)}
                className="bg-transparent hover:bg-slate-800 disabled:opacity-40 text-slate-300 font-semibold px-4 py-2 rounded-lg text-xs transition-colors"
              >
                Back
              </button>
              {activeStep < 3 ? (
                <button
                  type="button"
                  onClick={() => setActiveStep(prev => prev + 1)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-2 rounded-lg text-xs transition-colors animate-in"
                >
                  Continue
                </button>
              ) : (
                <button
                  onClick={handleCreateApplication}
                  disabled={actionLoading}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white font-bold px-6 py-2 rounded-lg text-xs transition-all shadow-md"
                >
                  {actionLoading ? "Submitting..." : "Submit Application"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Simple inline helper
function Check(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
