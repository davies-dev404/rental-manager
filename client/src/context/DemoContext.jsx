import React, { createContext, useContext, useState, useEffect } from "react";

const DemoContext = createContext(undefined);

export const sampleMakaziData = {
  stats: {
    tenantArrears: 539259.0,
    tenantsWithArrearsCount: 13,
    advancePayments: 0.0,
    tenantsWithAdvanceCount: 0,
    totalBilled: 78850.0,
    totalPaid: 0.0,
    paymentCollectionRate: 0,
    dateRange: {
      from: "2026-10-01",
      to: "2026-10-17",
      fromDisplay: "01 Oct 2026",
      toDisplay: "17 Oct 2026"
    },
    vacantUnits: 4,
    occupiedUnits: 13,
    totalUnits: 17,
    occupancyRate: 76,
    subscriptionBalance: 0.0,
    subscriptionExpiry: "24/10/2026",
    smsBalance: 0.0,
    lastSmsPurchase: "N/A"
  },
  arrearsList: [
    { id: "1", unit: "G1", name: "Catherine Wabweire", amount: 60915.0, phone: "+254 712 345 678" },
    { id: "2", unit: "G4", name: "Elizabeth Mwangi", amount: 58700.0, phone: "+254 722 987 654" },
    { id: "3", unit: "1B", name: "Robert Kimani", amount: 57900.0, phone: "+254 733 112 233" },
    { id: "4", unit: "1A", name: "Emmanuel Mwanzia", amount: 54774.0, phone: "+254 701 445 566" },
    { id: "5", unit: "G3", name: "Brian Kioko", amount: 48750.0, phone: "+254 799 887 766" },
    { id: "6", unit: "2A", name: "Grace Ndung'u", amount: 45200.0, phone: "+254 711 223 344" },
    { id: "7", unit: "2B", name: "David Ochieng", amount: 42300.0, phone: "+254 720 334 455" },
    { id: "8", unit: "3A", name: "Mercy Wanjiku", amount: 39500.0, phone: "+254 735 556 677" },
    { id: "9", unit: "3B", name: "Kevin Otieno", amount: 36200.0, phone: "+254 718 998 877" },
    { id: "10", unit: "4A", name: "Faith Chebet", amount: 33120.0, phone: "+254 702 331 122" },
    { id: "11", unit: "4B", name: "John Karanja", amount: 28400.0, phone: "+254 724 667 788" },
    { id: "12", unit: "5A", name: "Hellen Auma", amount: 18400.0, phone: "+254 715 889 900" },
    { id: "13", unit: "5B", name: "Samuel Mutua", amount: 15000.0, phone: "+254 790 123 456" }
  ],
  monthlyFinancials: [
    { month: "Apr", payments: 48000, invoices: 79150, expenses: 310000 },
    { month: "May", payments: 3500, invoices: 79150, expenses: 195000 },
    { month: "Jun", payments: 0, invoices: 79150, expenses: 180000 },
    { month: "Jul", payments: 0, invoices: 79150, expenses: 216000 },
    { month: "Aug", payments: 0, invoices: 79150, expenses: 175000 },
    { month: "Sep", payments: 0, invoices: 79150, expenses: 182000 },
    { month: "Oct", payments: 0, invoices: 79150, expenses: 190000 }
  ]
};

// Backward-compatible alias
export const sampleBomahutData = sampleMakaziData;

export function DemoProvider({ children }) {
  const [isDemoMode, setIsDemoMode] = useState(() => {
    const saved = localStorage.getItem("makaziflow_demo_mode") || localStorage.getItem("bomahut_demo_mode");
    return saved === null ? true : saved === "true";
  });

  useEffect(() => {
    localStorage.setItem("makaziflow_demo_mode", String(isDemoMode));
  }, [isDemoMode]);

  const toggleDemoMode = () => {
    setIsDemoMode((prev) => !prev);
  };

  return (
    <DemoContext.Provider value={{ isDemoMode, setIsDemoMode, toggleDemoMode, sampleData: sampleMakaziData }}>
      {children}
    </DemoContext.Provider>
  );
}

export function useDemoMode() {
  const context = useContext(DemoContext);
  if (!context) {
    throw new Error("useDemoMode must be used within a DemoProvider");
  }
  return context;
}
