"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft, CheckCircle, FileText, Sparkles, CreditCard, ShieldCheck, LockKeyhole, X } from "lucide-react";
import Link from "next/link";
import { INDIAN_MOBILE_PATTERN, sanitizeIndianMobile } from "@/lib/phone";

declare global {
  interface Window {
    Razorpay?: new (options: any) => {
      open: () => void;
      on: (event: string, callback: (response: any) => void) => void;
    };
  }
}

const loadRazorpayCheckout = () => new Promise<boolean>((resolve) => {
  if (window.Razorpay) return resolve(true);
  const existing = document.querySelector<HTMLScriptElement>('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
  if (existing) {
    existing.addEventListener("load", () => resolve(true), { once: true });
    existing.addEventListener("error", () => resolve(false), { once: true });
    return;
  }
  const script = document.createElement("script");
  script.src = "https://checkout.razorpay.com/v1/checkout.js";
  script.async = true;
  script.onload = () => resolve(true);
  script.onerror = () => resolve(false);
  document.body.appendChild(script);
});

const readApiError = async (response: Response, fallback: string) => {
  const payload = await response.json().catch(() => null) as { message?: string | string[] } | null;
  if (Array.isArray(payload?.message)) return payload.message.join(" ");
  return payload?.message || fallback;
};

export default function NewApplication() {
  const router = useRouter();
  const [schoolId, setSchoolId] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(1);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);

  // Profile wizard states
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
    
    fatherName: "",
    fatherOccupation: "",
    fatherPhone: "",
    motherName: "",
    motherOccupation: "",
    motherPhone: "",

    guardianName: "",
    guardianOccupation: "",
    guardianPhone: "",
    guardianRelation: "",

    primaryAddress: "",
    city: "",
    state: "",
    zipCode: "",

    allergies: "",
    medicalConditions: "",
    emergencyContactName: "",
    emergencyContactPhone: "",

    previousSchoolName: "",
    previousSchoolGrade: "",
    previousSchoolMarks: "",

    transportRequired: "NO",
    transportRoute: "",

    status: "DRAFT",
  });

  // Track mock uploaded document keys
  const [uploadedDocs, setUploadedDocs] = useState<{ name: string; type: string; url: string }[]>([]);
  const [paymentDone, setPaymentDone] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentFee, setPaymentFee] = useState(1500);
  const [schoolDetails, setSchoolDetails] = useState<any>(null);
  const [demoOrder, setDemoOrder] = useState<{ orderId: string; amount: number; currency: string } | null>(null);
  const [demoPaymentMethod, setDemoPaymentMethod] = useState<"upi" | "card">("upi");
  const [createdAppId, setCreatedAppId] = useState<string | null>(null);

  const [token, setToken] = useState("");

  useEffect(() => {
    document.body.classList.toggle("payment-modal-open", Boolean(demoOrder));
    return () => document.body.classList.remove("payment-modal-open");
  }, [demoOrder]);

  const validateStep = (step: number): string | null => {
    const missing = (fields: Array<[string, string]>) => fields
      .filter(([value]) => !value.trim())
      .map(([, label]) => label);
    let fields: string[] = [];

    if (step === 1) {
      fields = missing([
        [newApp.studentFirstName, "child's first name"],
        [newApp.studentLastName, "child's last name"],
        [newApp.studentDob, "date of birth"],
        [newApp.studentGender, "gender"],
        [newApp.grade, "target grade"],
      ]);
      if (!fields.length && (!/^[\p{L}][\p{L} .'-]{1,49}$/u.test(newApp.studentFirstName.trim()) || !/^[\p{L}][\p{L} .'-]{0,49}$/u.test(newApp.studentLastName.trim()))) {
        return "Enter a valid student name using letters only.";
      }
      if (!fields.length && new Date(newApp.studentDob) >= new Date()) return "Date of birth must be a valid past date.";
    }
    if (step === 2) {
      fields = missing([
        [newApp.fatherName, "father's name"],
        [newApp.fatherOccupation, "father's occupation"],
        [newApp.fatherPhone, "father's contact phone"],
        [newApp.motherName, "mother's name"],
        [newApp.motherOccupation, "mother's occupation"],
        [newApp.motherPhone, "mother's contact phone"],
      ]);
      if (fields.length) return `Complete the required parent information: ${fields.join(", ")}.`;
      const namePattern = /^[\p{L}][\p{L} .'-]{1,49}$/u;
      if (!namePattern.test(newApp.fatherName.trim()) || !namePattern.test(newApp.motherName.trim())) {
        return "Enter valid parent names using letters only (minimum 2 characters).";
      }
      const occupationPattern = /^[\p{L}][\p{L} .,&()/'-]{1,79}$/u;
      if (!occupationPattern.test(newApp.fatherOccupation.trim()) || !occupationPattern.test(newApp.motherOccupation.trim())) {
        return "Enter valid occupations using letters (minimum 2 characters).";
      }
      const phonePattern = /^(?:\+91)?[6-9]\d{9}$/;
      const invalidParentPhone = [newApp.fatherPhone, newApp.motherPhone]
        .some((phone) => !phonePattern.test(phone.replace(/[\s-]/g, "")));
      if (invalidParentPhone) return "Parent phone numbers must be valid 10-digit Indian mobile numbers.";
      const normalizedFatherPhone = newApp.fatherPhone.replace(/\D/g, "").slice(-10);
      const normalizedMotherPhone = newApp.motherPhone.replace(/\D/g, "").slice(-10);
      if (normalizedFatherPhone === normalizedMotherPhone) return "Father's and mother's contact numbers must be different.";
    }
    if (step === 3) {
      const guardianValues = [newApp.guardianName, newApp.guardianRelation, newApp.guardianOccupation, newApp.guardianPhone];
      if (guardianValues.some((value) => value.trim()) && guardianValues.some((value) => !value.trim())) {
        return "Complete all guardian details or leave the entire optional guardian section blank.";
      }
      if (newApp.guardianPhone && !/^(?:\+91)?[6-9]\d{9}$/.test(newApp.guardianPhone.replace(/[\s-]/g, ""))) {
        return "Enter a valid 10-digit Indian guardian phone number.";
      }
    }
    if (step === 4) {
      fields = missing([
        [newApp.primaryAddress, "primary address"],
        [newApp.city, "city"],
        [newApp.state, "state"],
        [newApp.zipCode, "ZIP code"],
      ]);
      if (!fields.length && !/^\d{6}$/.test(newApp.zipCode.trim())) return "ZIP code must contain exactly 6 digits.";
    }
    if (step === 5) {
      fields = missing([
        [newApp.emergencyContactName, "emergency contact name"],
        [newApp.emergencyContactPhone, "emergency phone number"],
      ]);
      if (!fields.length && !/^(?:\+91)?[6-9]\d{9}$/.test(newApp.emergencyContactPhone.replace(/[\s-]/g, ""))) {
        return "Enter a valid 10-digit Indian emergency phone number.";
      }
    }
    if (step === 6) {
      const previousSchoolValues = [newApp.previousSchoolName, newApp.previousSchoolGrade, newApp.previousSchoolMarks];
      if (previousSchoolValues.some((value) => value.trim()) && previousSchoolValues.some((value) => !value.trim())) {
        return "Complete all previous-school details or leave the entire optional section blank.";
      }
    }
    if (step === 7 && newApp.transportRequired === "YES" && !newApp.transportRoute.trim()) {
      fields = ["preferred boarding point / route"];
    }
    if (step === 10 && !paymentDone) return "Complete the registration fee payment before continuing.";
    return fields.length ? `Complete the required fields: ${fields.join(", ")}.` : null;
  };

  const handleContinue = () => {
    const error = validateStep(activeStep);
    if (error) {
      setStepError(error);
      return;
    }
    setStepError(null);
    setActiveStep((previous) => previous + 1);
  };

  useEffect(() => {
    const id = localStorage.getItem("schoolId");
    const tok = localStorage.getItem("token");
    if (!id || !tok) {
      router.push("/login");
      return;
    }
    setSchoolId(id);
    setToken(tok);
  }, [router]);

  useEffect(() => {
    if (!schoolId || !token) return;
    fetch("http://localhost:5001/school/details", {
      headers: { "x-tenant-id": schoolId, "Authorization": `Bearer ${token}` },
    })
      .then((res) => res.ok ? res.json() : null)
      .then((details) => {
        if (!details) return;
        setSchoolDetails(details);
        if (details.settings?.admissionFee) setPaymentFee(Number(details.settings.admissionFee));
      })
      .catch(console.error);
  }, [schoolId, token]);

  // Draft autosave helper
  const handleSaveDraft = async () => {
    setActionLoading(true);
    setSaveMessage(null);
    try {
      const res = await fetch("http://localhost:5001/application", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          "x-tenant-id": schoolId,
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ ...newApp, status: "DRAFT" }),
      });
      if (res.ok) {
        const data = await res.json();
        setCreatedAppId(data.id);
        setSaveMessage("Application progress saved as DRAFT successfully!");
        setTimeout(() => setSaveMessage(null), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleClearPayment = async () => {
    setActionLoading(true);
    setPaymentError(null);
    try {
      const requiredFields = [
        [newApp.studentFirstName, "student first name"],
        [newApp.studentLastName, "student last name"],
        [newApp.studentDob, "student date of birth"],
        [newApp.studentGender, "student gender"],
        [newApp.grade, "applied grade"],
      ].filter(([value]) => !value?.trim());
      if (requiredFields.length) {
        setActiveStep(1);
        throw new Error(`Complete the required student details before payment: ${requiredFields.map(([, label]) => label).join(", ")}.`);
      }

      // 1. Create order
      // If application isn't saved as draft yet, save it
      let appId = createdAppId;
      if (!appId) {
        const res = await fetch("http://localhost:5001/application", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json", 
            "x-tenant-id": schoolId,
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ ...newApp, status: "DRAFT" }),
        });
        if (!res.ok) {
          if (res.status === 401) throw new Error("Your login session has expired. Sign in again, then retry the payment.");
          throw new Error(await readApiError(res, "Could not save the application draft before payment."));
        }
        const data = await res.json();
        appId = data.id;
        setCreatedAppId(data.id);
      }

      if (!appId) throw new Error("The application draft was not created. Please retry.");

      const orderRes = await fetch("http://localhost:5001/payment/order", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          "x-tenant-id": schoolId,
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ applicationId: appId }),
      });

      if (!orderRes.ok) {
        if (orderRes.status === 401) throw new Error("Your login session has expired. Sign in again, then retry the payment.");
        throw new Error(await readApiError(orderRes, "Razorpay order creation failed."));
      }
      const orderData = await orderRes.json();

      const verifyPayment = async (paymentResponse: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) => {
        const verifyRes = await fetch("http://localhost:5001/payment/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-tenant-id": schoolId,
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({
            razorpayOrderId: orderData.orderId,
            razorpayPaymentId: paymentResponse.razorpay_payment_id,
            razorpaySignature: paymentResponse.razorpay_signature,
          }),
        });
        if (!verifyRes.ok) {
          const error = await verifyRes.json().catch(() => null);
          throw new Error(error?.message || "Payment verification failed.");
        }
        setPaymentDone(true);
        setPaymentError(null);
      };

      if (orderData.mock) {
        setDemoOrder({ orderId: orderData.orderId, amount: Number(orderData.amount), currency: orderData.currency || "INR" });
        return;
      }

      const checkoutLoaded = await loadRazorpayCheckout();
      if (!checkoutLoaded || !window.Razorpay) throw new Error("Unable to load Razorpay Checkout. Check your internet connection and try again.");

      const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
      const razorpay = new window.Razorpay({
        key: orderData.key,
        amount: Math.round(Number(orderData.amount) * 100),
        currency: orderData.currency || "INR",
        name: schoolDetails?.name || "School Admissions",
        description: `Application processing fee for ${newApp.studentFirstName} ${newApp.studentLastName}`,
        image: schoolDetails?.logo
          ? (schoolDetails.logo.startsWith("/") ? `${window.location.origin}${schoolDetails.logo}` : schoolDetails.logo)
          : undefined,
        order_id: orderData.orderId,
        prefill: {
          name: `${storedUser.firstName || ""} ${storedUser.lastName || ""}`.trim(),
          email: storedUser.email || "",
          contact: storedUser.phone || "",
        },
        notes: { applicationId: appId, schoolId },
        theme: { color: "#009b87" },
        handler: async (response: any) => {
          setActionLoading(true);
          try {
            await verifyPayment(response);
          } catch (error: any) {
            setPaymentError(error.message || "Payment verification failed.");
          } finally {
            setActionLoading(false);
          }
        },
        modal: {
          ondismiss: () => setPaymentError("Payment was cancelled before completion."),
        },
        retry: { enabled: true },
      });
      razorpay.on("payment.failed", (response: any) => {
        setPaymentError(response?.error?.description || "Payment failed. Please try again.");
      });
      razorpay.open();
    } catch (err) {
      console.error(err);
      setPaymentError(err instanceof Error ? err.message : "Unable to initiate payment.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteDemoPayment = async () => {
    if (!demoOrder) return;
    setActionLoading(true);
    setPaymentError(null);
    try {
      await new Promise((resolve) => setTimeout(resolve, 700));
      const verifyRes = await fetch("http://localhost:5001/payment/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": schoolId,
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          razorpayOrderId: demoOrder.orderId,
          razorpayPaymentId: `pay_mock_${Math.random().toString(36).substring(2, 10)}`,
          razorpaySignature: "mock_signature_valid",
        }),
      });
      if (!verifyRes.ok) {
        const error = await verifyRes.json().catch(() => null);
        throw new Error(error?.message || "Demo payment verification failed.");
      }
      setPaymentDone(true);
      setDemoOrder(null);
    } catch (error: any) {
      setPaymentError(error.message || "Demo payment failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleMockUpload = async (docName: string, docType: string) => {
    let appId = createdAppId;
    if (!appId) {
      const res = await fetch("http://localhost:5001/application", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          "x-tenant-id": schoolId,
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ ...newApp, status: "DRAFT" }),
      });
      if (res.ok) {
        const data = await res.json();
        appId = data.id;
        setCreatedAppId(data.id);
      }
    }

    if (!appId) return;

    setActionLoading(true);
    try {
      const mockFileUrl = `https://admissionsos-storage.s3.amazonaws.com/tenants/${schoolId}/apps/${appId}/${docType.toLowerCase()}.pdf`;
      const res = await fetch("http://localhost:5001/document", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          "x-tenant-id": schoolId,
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          applicationId: appId,
          name: docName,
          type: docType,
          url: mockFileUrl,
        }),
      });

      if (res.ok) {
        setUploadedDocs(prev => [...prev, { name: docName, type: docType, url: mockFileUrl }]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      let appId = createdAppId;
      if (appId) {
        // Save as submitted status
        const res = await fetch(`http://localhost:5001/application/${appId}/status`, {
          method: "PATCH",
          headers: { 
            "Content-Type": "application/json", 
            "x-tenant-id": schoolId,
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ status: "SUBMITTED" }),
        });
        if (res.ok) {
          router.push("/parent/dashboard");
        }
      } else {
        // If not saved, create as submitted directly
        const res = await fetch("http://localhost:5001/application", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json", 
            "x-tenant-id": schoolId,
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ ...newApp, status: "SUBMITTED" }),
        });
        if (res.ok) {
          router.push("/parent/dashboard");
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl space-y-8 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/parent/dashboard" className="text-slate-400 hover:text-white">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold text-white">Create Admission Form</h1>
          <p className="text-xs text-slate-400 mt-1">Complete the 11-step interactive student registration wizard.</p>
        </div>
      </div>

      {saveMessage && (
        <div className="bg-emerald-950/25 border border-emerald-800/30 text-emerald-400 p-4 rounded-xl text-xs font-semibold flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" />
          <span>{saveMessage}</span>
        </div>
      )}

      {/* 11 Steps Stepper Wiz Panel */}
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl flex min-h-[520px] flex-col overflow-hidden lg:h-[calc(100vh-11rem)]">
        
        {/* Step Index Progress indicator */}
        <div className="shrink-0 space-y-3 pb-6">
          <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            <span>Step {activeStep} of 11</span>
            <span>{Math.round((activeStep / 11) * 100)}% Completed</span>
          </div>
          <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-850">
            <div style={{ width: `${(activeStep / 11) * 100}%` }} className="bg-indigo-500 h-full rounded-full transition-all" />
          </div>
        </div>

        {/* Steps Content switcher */}
        <div className="min-h-0 flex-1 overflow-y-auto border-t border-slate-850 pt-6 pr-2">
          
          {/* Step 1: Student Information */}
          {activeStep === 1 && (
            <div className="space-y-4 animate-in fade-in">
              <h3 className="font-bold text-sm text-white">Step 1: Student Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-semibold uppercase">Child's First Name *</label>
                  <input required type="text" placeholder="Sarah" value={newApp.studentFirstName} onChange={(e) => setNewApp(prev => ({ ...prev, studentFirstName: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-semibold uppercase">Child's Last Name *</label>
                  <input required type="text" placeholder="Jenkins" value={newApp.studentLastName} onChange={(e) => setNewApp(prev => ({ ...prev, studentLastName: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-semibold uppercase">Date of Birth *</label>
                  <input required type="date" value={newApp.studentDob} onChange={(e) => setNewApp(prev => ({ ...prev, studentDob: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-semibold uppercase">Gender *</label>
                  <select value={newApp.studentGender} onChange={(e) => setNewApp(prev => ({ ...prev, studentGender: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white">
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-semibold uppercase">Target Grade *</label>
                  <select value={newApp.grade} onChange={(e) => setNewApp(prev => ({ ...prev, grade: e.target.value }))} className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white">
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
                  <label className="text-[10px] text-slate-400 font-semibold uppercase">Blood Group</label>
                  <input type="text" placeholder="O+" value={newApp.bloodGroup} onChange={(e) => setNewApp(prev => ({ ...prev, bloodGroup: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-semibold uppercase">Nationality</label>
                  <input type="text" placeholder="Indian" value={newApp.nationality} onChange={(e) => setNewApp(prev => ({ ...prev, nationality: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-semibold uppercase">Religion</label>
                  <input type="text" placeholder="Hindu" value={newApp.religion} onChange={(e) => setNewApp(prev => ({ ...prev, religion: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white" />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Parent Information */}
          {activeStep === 2 && (
            <div className="space-y-4 animate-in fade-in">
              <h3 className="font-bold text-sm text-white">Step 2: Parent Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-semibold uppercase">Father's Name *</label>
                  <input type="text" required minLength={2} maxLength={50} pattern="[A-Za-z][A-Za-z .'-]{1,49}" title="Use letters only (minimum 2 characters)" placeholder="Richard Jenkins" value={newApp.fatherName} onChange={(e) => setNewApp(prev => ({ ...prev, fatherName: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-semibold uppercase">Father's Occupation *</label>
                  <input type="text" required minLength={2} maxLength={80} placeholder="Architect" value={newApp.fatherOccupation} onChange={(e) => setNewApp(prev => ({ ...prev, fatherOccupation: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white" />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-[10px] text-slate-400 font-semibold uppercase">Father's Contact Phone *</label>
                  <input type="tel" required inputMode="numeric" maxLength={13} pattern={INDIAN_MOBILE_PATTERN} title="Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9" placeholder="+919876543210" value={newApp.fatherPhone} onChange={(e) => setNewApp(prev => ({ ...prev, fatherPhone: sanitizeIndianMobile(e.target.value) }))} className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-slate-850 pt-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-semibold uppercase">Mother's Name *</label>
                  <input type="text" required minLength={2} maxLength={50} pattern="[A-Za-z][A-Za-z .'-]{1,49}" title="Use letters only (minimum 2 characters)" placeholder="Maria Jenkins" value={newApp.motherName} onChange={(e) => setNewApp(prev => ({ ...prev, motherName: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-semibold uppercase">Mother's Occupation *</label>
                  <input type="text" required minLength={2} maxLength={80} placeholder="Scientist" value={newApp.motherOccupation} onChange={(e) => setNewApp(prev => ({ ...prev, motherOccupation: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white" />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-[10px] text-slate-400 font-semibold uppercase">Mother's Contact Phone *</label>
                  <input type="tel" required inputMode="numeric" maxLength={13} pattern={INDIAN_MOBILE_PATTERN} title="Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9" placeholder="+919876543209" value={newApp.motherPhone} onChange={(e) => setNewApp(prev => ({ ...prev, motherPhone: sanitizeIndianMobile(e.target.value) }))} className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white" />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Guardian Information */}
          {activeStep === 3 && (
            <div className="space-y-4 animate-in fade-in">
              <h3 className="font-bold text-sm text-white">Step 3: Guardian Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-semibold uppercase">Guardian Full Name</label>
                  <input type="text" placeholder="Uncle Sam Jenkins" value={newApp.guardianName} onChange={(e) => setNewApp(prev => ({ ...prev, guardianName: e.target.value }))} className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-semibold uppercase">Relationship to Student</label>
                  <input type="text" placeholder="Uncle" value={newApp.guardianRelation} onChange={(e) => setNewApp(prev => ({ ...prev, guardianRelation: e.target.value }))} className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-semibold uppercase">Guardian Occupation</label>
                  <input type="text" placeholder="Business Owner" value={newApp.guardianOccupation} onChange={(e) => setNewApp(prev => ({ ...prev, guardianOccupation: e.target.value }))} className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-semibold uppercase">Guardian Phone Number</label>
                  <input type="tel" inputMode="numeric" maxLength={13} pattern={INDIAN_MOBILE_PATTERN} title="Enter a valid 10-digit Indian mobile number" placeholder="+919876543207" value={newApp.guardianPhone} onChange={(e) => setNewApp(prev => ({ ...prev, guardianPhone: sanitizeIndianMobile(e.target.value) }))} className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white" />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Address */}
          {activeStep === 4 && (
            <div className="space-y-4 animate-in fade-in">
              <h3 className="font-bold text-sm text-white">Step 4: Contact Address</h3>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-semibold uppercase">Primary Address Line *</label>
                  <input required type="text" placeholder="Flat 203, Banjara Hills" value={newApp.primaryAddress} onChange={(e) => setNewApp(prev => ({ ...prev, primaryAddress: e.target.value }))} className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-semibold uppercase">City *</label>
                    <input required type="text" placeholder="Hyderabad" value={newApp.city} onChange={(e) => setNewApp(prev => ({ ...prev, city: e.target.value }))} className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-semibold uppercase">State *</label>
                    <input required type="text" placeholder="Telangana" value={newApp.state} onChange={(e) => setNewApp(prev => ({ ...prev, state: e.target.value }))} className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-semibold uppercase">Zip Code *</label>
                    <input required type="text" placeholder="500034" value={newApp.zipCode} onChange={(e) => setNewApp(prev => ({ ...prev, zipCode: e.target.value }))} className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Medical Details */}
          {activeStep === 5 && (
            <div className="space-y-4 animate-in fade-in">
              <h3 className="font-bold text-sm text-white">Step 5: Health & Medical Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-semibold uppercase">Allergies (If any)</label>
                  <input type="text" placeholder="Peanuts, Pollen" value={newApp.allergies} onChange={(e) => setNewApp(prev => ({ ...prev, allergies: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-semibold uppercase">Chronic Medical Conditions</label>
                  <input type="text" placeholder="Mild Asthma" value={newApp.medicalConditions} onChange={(e) => setNewApp(prev => ({ ...prev, medicalConditions: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-semibold uppercase">Emergency Contact Name *</label>
                  <input required type="text" placeholder="Aunt Jenkins" value={newApp.emergencyContactName} onChange={(e) => setNewApp(prev => ({ ...prev, emergencyContactName: e.target.value }))} className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-semibold uppercase">Emergency Phone Number *</label>
                  <input required type="tel" inputMode="numeric" maxLength={13} pattern={INDIAN_MOBILE_PATTERN} title="Enter a valid 10-digit Indian mobile number" placeholder="+919876543208" value={newApp.emergencyContactPhone} onChange={(e) => setNewApp(prev => ({ ...prev, emergencyContactPhone: sanitizeIndianMobile(e.target.value) }))} className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white" />
                </div>
              </div>
            </div>
          )}

          {/* Step 6: Previous School */}
          {activeStep === 6 && (
            <div className="space-y-4 animate-in fade-in">
              <h3 className="font-bold text-sm text-white">Step 6: Previous School History</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1 col-span-2">
                  <label className="text-[10px] text-slate-400 font-semibold uppercase">Previous School Name</label>
                  <input type="text" placeholder="Oakwood Preschool" value={newApp.previousSchoolName} onChange={(e) => setNewApp(prev => ({ ...prev, previousSchoolName: e.target.value }))} className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-semibold uppercase">Grade Completed</label>
                  <input type="text" placeholder="Kindergarten" value={newApp.previousSchoolGrade} onChange={(e) => setNewApp(prev => ({ ...prev, previousSchoolGrade: e.target.value }))} className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white" />
                </div>
                <div className="space-y-1 col-span-3">
                  <label className="text-[10px] text-slate-400 font-semibold uppercase">Marks Obtained / Report feedback</label>
                  <input type="text" placeholder="Grade A+ or 92%" value={newApp.previousSchoolMarks} onChange={(e) => setNewApp(prev => ({ ...prev, previousSchoolMarks: e.target.value }))} className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white" />
                </div>
              </div>
            </div>
          )}

          {/* Step 7: Transport */}
          {activeStep === 7 && (
            <div className="space-y-4 animate-in fade-in">
              <h3 className="font-bold text-sm text-white">Step 7: Transport Service</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-semibold uppercase">Require School Bus Service? *</label>
                  <select value={newApp.transportRequired} onChange={(e) => setNewApp(prev => ({ ...prev, transportRequired: e.target.value }))} className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white">
                    <option value="NO">No, Parent Pickup</option>
                    <option value="YES">Yes, School Bus Route Required</option>
                  </select>
                </div>
                {newApp.transportRequired === "YES" && (
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-semibold uppercase">Preferred Boarding Point / Sector Route *</label>
                    <input required type="text" placeholder="Sector 12, Main Stop" value={newApp.transportRoute} onChange={(e) => setNewApp(prev => ({ ...prev, transportRoute: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 8: Upload Documents */}
          {activeStep === 8 && (
            <div className="space-y-4 animate-in fade-in">
              <h3 className="font-bold text-sm text-white">Step 8: Upload Verification Documents</h3>
              <p className="text-xs text-slate-500">Documents are optional. You can upload them now or continue and provide them later.</p>
              <div className="space-y-3">
                {[
                  { label: "Birth Certificate", type: "BIRTH_CERTIFICATE" },
                  { label: "Transfer Certificate (TC)", type: "TRANSFER_CERTIFICATE" },
                  { label: "Aadhaar Identity Card", type: "AADHAAR" },
                  { label: "Student Passport", type: "PASSPORT" },
                  { label: "Student Passport Size Photograph", type: "STUDENT_PHOTO" },
                  { label: "Parent ID Card Proof", type: "PARENT_ID" },
                  { label: "Medical Fitness Certificate", type: "MEDICAL_CERTIFICATE" },
                ].map((doc, idx) => {
                  const uploaded = uploadedDocs.find(d => d.type === doc.type);
                  return (
                    <div key={idx} className="flex justify-between items-center p-3 rounded bg-slate-950 border border-slate-900">
                      <div>
                        <span className="text-xs font-semibold text-white block">{doc.label}</span>
                        <span className="text-[9px] text-slate-500">{uploaded ? "Successfully cached in cloud storage" : "Optional supporting document"}</span>
                      </div>
                      {uploaded ? (
                        <div className="bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded text-[10px] font-bold">Uploaded ✓</div>
                      ) : (
                        <button 
                          type="button"
                          onClick={() => handleMockUpload(doc.label, doc.type)}
                          className="bg-slate-850 hover:bg-slate-800 text-[10px] text-slate-300 font-bold px-3 py-1 rounded"
                        >
                          Mock Upload
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 9: Review */}
          {activeStep === 9 && (
            <div className="space-y-4 animate-in fade-in">
              <h3 className="font-bold text-sm text-white">Step 9: Review Registration Dossier</h3>
              <div className="space-y-3 text-xs text-slate-400">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-2">
                  <h4 className="font-bold text-white text-xs border-b border-slate-900 pb-1">1. Student Details</h4>
                  <p>Name: <strong className="text-white">{newApp.studentFirstName} {newApp.studentLastName}</strong> ({newApp.studentGender})</p>
                  <p>Applied Grade: <strong className="text-white">{newApp.grade}</strong> | DOB: <strong className="text-white">{newApp.studentDob}</strong></p>
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-2">
                  <h4 className="font-bold text-white text-xs border-b border-slate-900 pb-1">2. Parent & Guardian Details</h4>
                  <p>Father: <strong className="text-white">{newApp.fatherName}</strong> ({newApp.fatherOccupation})</p>
                  <p>Mother: <strong className="text-white">{newApp.motherName}</strong> ({newApp.motherOccupation})</p>
                  {newApp.guardianName && <p>Guardian: <strong className="text-white">{newApp.guardianName}</strong> ({newApp.guardianRelation})</p>}
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-2">
                  <h4 className="font-bold text-white text-xs border-b border-slate-900 pb-1">3. Address & Health</h4>
                  <p>Address: <strong className="text-white">{newApp.primaryAddress}, {newApp.city}, {newApp.state} - {newApp.zipCode}</strong></p>
                  <p>Emergency: <strong className="text-white">{newApp.emergencyContactName} ({newApp.emergencyContactPhone})</strong></p>
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-2">
                  <h4 className="font-bold text-white text-xs border-b border-slate-900 pb-1">4. Verification Documents Cache</h4>
                  <p>Uploaded: <strong className="text-emerald-400">{uploadedDocs.length} of 7 certificates</strong></p>
                </div>
              </div>
            </div>
          )}

          {/* Step 10: Payment */}
          {activeStep === 10 && (
            <div className="space-y-4 animate-in fade-in text-center py-6">
              <h3 className="font-bold text-sm text-white">Step 10: Settle Application Processing Fee</h3>
              <div className="bg-slate-950 border border-slate-850 p-8 rounded-2xl max-w-sm mx-auto space-y-4">
                <CreditCard className="h-10 w-10 mx-auto text-indigo-500 animate-pulse" />
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total fee payment due:</span>
                  <h4 className="text-3xl font-extrabold text-white">₹{paymentFee.toLocaleString("en-IN")}</h4>
                </div>
                <p className="text-[11px] text-slate-400">
                  Submit transaction processing fees online via our Razorpay payment gateway to authorize dossier submission.
                </p>
                {paymentDone ? (
                  <div className="bg-emerald-950/50 border border-emerald-900/30 text-emerald-400 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5">
                    <CheckCircle className="h-4 w-4" /> Fee Cleared Successful
                  </div>
                ) : (
                  <button 
                    type="button" 
                    disabled={actionLoading}
                    onClick={handleClearPayment}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed py-2.5 rounded-lg text-xs font-bold text-white shadow-lg active:scale-95 transition-all"
                  >
                    {actionLoading ? "Opening Razorpay..." : "Pay Securely with Razorpay"}
                  </button>
                )}
                {paymentError && <p className="text-[11px] font-semibold text-[#b91c1c] bg-[#fef2f2] border border-[#fecaca] rounded-lg px-3 py-2">{paymentError}</p>}
              </div>
            </div>
          )}

          {/* Step 11: Submit */}
          {activeStep === 11 && (
            <div className="space-y-4 animate-in fade-in text-center py-10">
              <Sparkles className="h-12 w-12 text-indigo-500 mx-auto animate-spin" />
              <h3 className="font-extrabold text-lg text-white">Dossier Completed & Ready!</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-normal">
                You have cleared the application processing fee and successfully compiled your child's 11-step registration wizard. Click the button below to submit the application to Greenwood School Admissions board.
              </p>
            </div>
          )}

        </div>

        {/* Stepper Action Buttons */}
        <div className="shrink-0 bg-slate-900 pt-4">
        {stepError && (
          <div role="alert" className="mb-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
            {stepError}
          </div>
        )}
        <div className="flex items-center justify-between border-t border-slate-800 pt-4">
          <button
            type="button"
            disabled={activeStep === 1}
            onClick={() => { setStepError(null); setActiveStep(prev => prev - 1); }}
            className="inline-flex items-center gap-2 bg-transparent hover:bg-slate-800 disabled:opacity-40 text-slate-350 font-semibold px-4 py-2 rounded-lg text-xs transition-colors"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back Step
          </button>
          
          <div className="flex items-center gap-4">
            {activeStep < 10 && (
              <button 
                type="button"
                onClick={handleSaveDraft}
                className="bg-transparent hover:bg-slate-800 border border-slate-800 text-slate-350 px-4 py-2 rounded-lg text-xs font-bold"
              >
                Save as Draft
              </button>
            )}

            {activeStep < 11 ? (
              <button
                type="button"
                onClick={handleContinue}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-2 rounded-lg text-xs transition-colors"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={handleFinalSubmit}
                disabled={actionLoading}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white font-bold px-6 py-2 rounded-lg text-xs transition-all shadow-md"
              >
                {actionLoading ? "Submitting Application..." : "Final Submit Portfolio"}
              </button>
            )}
          </div>
        </div>
        </div>

      </div>

      {demoOrder && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#071633]/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-[#0b1f3a] px-5 py-4 text-white">
              <div className="flex items-center gap-3">
                {schoolDetails?.logo ? <img src={schoolDetails.logo} alt="" className="h-9 w-9 rounded-lg bg-white object-contain p-1" /> : <CreditCard className="h-7 w-7" />}
                <div>
                  <p className="text-sm font-extrabold keep-white">{schoolDetails?.name || "School Admissions"}</p>
                  <p className="text-[11px] font-semibold keep-white opacity-90">Razorpay Demo Checkout</p>
                </div>
              </div>
              <button type="button" onClick={() => setDemoOrder(null)} className="rounded-lg p-1.5 text-white hover:bg-white/10" aria-label="Close demo checkout"><X className="h-5 w-5 keep-white" /></button>
            </div>

            <div className="space-y-5 p-6">
              <div className="rounded-xl bg-[#f0fdfa] p-4 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#607080]">Application processing fee</p>
                <p className="mt-1 text-3xl font-extrabold text-[#071633]">₹{demoOrder.amount.toLocaleString("en-IN")}</p>
                <p className="mt-1 font-mono text-[9px] text-[#71818d]">{demoOrder.orderId}</p>
              </div>

              <div>
                <p className="mb-2 text-xs font-bold text-[#071633]">Choose a demo payment method</p>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setDemoPaymentMethod("upi")} className={`rounded-xl border p-3 text-left transition ${demoPaymentMethod === "upi" ? "border-[#009b87] bg-[#e6f7f2]" : "border-[#dceae6] bg-white"}`}>
                    <span className="block text-xs font-bold text-[#071633]">UPI</span>
                    <span className="text-[10px] text-[#607080]">Demo UPI payment</span>
                  </button>
                  <button type="button" onClick={() => setDemoPaymentMethod("card")} className={`rounded-xl border p-3 text-left transition ${demoPaymentMethod === "card" ? "border-[#009b87] bg-[#e6f7f2]" : "border-[#dceae6] bg-white"}`}>
                    <span className="block text-xs font-bold text-[#071633]">Card</span>
                    <span className="text-[10px] text-[#607080]">Demo card payment</span>
                  </button>
                </div>
              </div>

              <div className="rounded-lg border border-[#fde68a] bg-[#fffbeb] px-3 py-2 text-[10px] font-semibold text-[#92400e]">
                Demo mode only — no bank, UPI app, card, or real money is involved.
              </div>

              <button type="button" disabled={actionLoading} onClick={handleCompleteDemoPayment} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#009b87] px-4 py-3 text-sm font-extrabold text-white hover:bg-[#007f70] disabled:opacity-60">
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin keep-white" /> : <LockKeyhole className="h-4 w-4 keep-white" />}
                <span className="keep-white">{actionLoading ? "Processing Demo Payment..." : `Pay ₹${demoOrder.amount.toLocaleString("en-IN")} (Demo)`}</span>
              </button>
              <p className="text-center text-[9px] text-[#71818d]">Secured demo checkout · Powered by AdmissionsOS</p>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
