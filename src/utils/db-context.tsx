
import React, { createContext, useContext, useState, useEffect } from 'react';

// Define types for our database entities
export interface User {
  id: string;
  type: 'hospital' | 'patient';
  email?: string;
  password: string;
  name: string;
  phoneNumber?: string;
  gender?: 'male' | 'female' | 'other';
  healthId?: string;
}

export interface Hospital extends User {
  type: 'hospital';
  email: string;
}

export interface Patient extends User {
  type: 'patient';
  healthId: string;
  gender: 'male' | 'female' | 'other';
  phoneNumber: string;
}

export interface MedicalRecord {
  id: string;
  patientHealthId: string;
  hospitalId: string;
  recordType: string;
  fileContent: string; // Base64 encoded file content
  fileName: string;
  fileType: string;
  notes?: string;
  createdAt: string;
  isApproved: boolean;
}

export interface ConsentRequest {
  id: string;
  type: 'upload' | 'access';
  patientHealthId: string;
  hospitalId: string;
  hospitalName: string;
  requestDate: string;
  status: 'pending' | 'approved' | 'rejected';
  recordId?: string; // Only for upload requests
}

interface DbContextType {
  users: User[];
  medicalRecords: MedicalRecord[];
  consentRequests: ConsentRequest[];
  addUser: (user: User) => void;
  getUserByEmail: (email: string) => Hospital | undefined;
  getUserByHealthId: (healthId: string) => Patient | undefined;
  addMedicalRecord: (record: MedicalRecord) => string;
  getMedicalRecordsByHospital: (hospitalId: string) => MedicalRecord[];
  getMedicalRecordsByPatient: (healthId: string) => MedicalRecord[];
  addConsentRequest: (request: ConsentRequest) => string;
  updateConsentRequest: (requestId: string, status: 'approved' | 'rejected') => void;
  getPendingConsentRequests: (healthId: string) => ConsentRequest[];
  updateMedicalRecord: (recordId: string, updates: Partial<MedicalRecord>) => void;
  getMedicalRecordById: (recordId: string) => MedicalRecord | undefined;
  checkHealthIdExists: (healthId: string) => boolean;
  getApprovedMedicalRecordsByHospitalAndPatient: (hospitalId: string, patientHealthId: string) => MedicalRecord[];
  getHospitalById: (hospitalId: string) => Hospital | undefined;
}

const DbContext = createContext<DbContextType | undefined>(undefined);

export const useDb = () => {
  const context = useContext(DbContext);
  if (!context) {
    throw new Error('useDb must be used within a DbProvider');
  }
  return context;
};

export const DbProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load from localStorage if available
  const [users, setUsers] = useState<User[]>(() => {
    const savedUsers = localStorage.getItem('healthapp_users');
    console.log("Loaded users from localStorage:", savedUsers);
    return savedUsers ? JSON.parse(savedUsers) : [];
  });

  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>(() => {
    const savedRecords = localStorage.getItem('healthapp_records');
    return savedRecords ? JSON.parse(savedRecords) : [];
  });

  const [consentRequests, setConsentRequests] = useState<ConsentRequest[]>(() => {
    const savedRequests = localStorage.getItem('healthapp_requests');
    return savedRequests ? JSON.parse(savedRequests) : [];
  });

  // Save to localStorage whenever state changes
  useEffect(() => {
    console.log("Saving users to localStorage:", users);
    localStorage.setItem('healthapp_users', JSON.stringify(users));
    localStorage.setItem('healthapp_records', JSON.stringify(medicalRecords));
    localStorage.setItem('healthapp_requests', JSON.stringify(consentRequests));
  }, [users, medicalRecords, consentRequests]);

  const addUser = (user: User) => {
    console.log("Adding user to database:", user);
    setUsers((prev) => [...prev, user]);
    return user.id;
  };

  const getUserByEmail = (email: string) => {
    const user = users.find((user) => user.type === 'hospital' && user.email === email) as Hospital | undefined;
    console.log("getUserByEmail:", email, "result:", user);
    return user;
  };

  const getUserByHealthId = (healthId: string) => {
    console.log("Looking for user with healthId:", healthId);
    console.log("All users:", users);
    const user = users.find((user) => user.healthId === healthId) as Patient | undefined;
    console.log("getUserByHealthId result:", user);
    return user;
  };

  const checkHealthIdExists = (healthId: string) => {
    return users.some((user) => user.healthId === healthId);
  };

  const addMedicalRecord = (record: MedicalRecord) => {
    setMedicalRecords((prev) => [...prev, record]);
    return record.id;
  };

  const updateMedicalRecord = (recordId: string, updates: Partial<MedicalRecord>) => {
    setMedicalRecords((prev) => 
      prev.map((record) => 
        record.id === recordId ? { ...record, ...updates } : record
      )
    );
  };

  const getMedicalRecordById = (recordId: string) => {
    return medicalRecords.find((record) => record.id === recordId);
  };

  const getMedicalRecordsByHospital = (hospitalId: string) => {
    return medicalRecords.filter(
      (record) => record.hospitalId === hospitalId && record.isApproved
    );
  };

  const getMedicalRecordsByPatient = (healthId: string) => {
    return medicalRecords.filter(
      (record) => record.patientHealthId === healthId && record.isApproved
    );
  };

  const getApprovedMedicalRecordsByHospitalAndPatient = (hospitalId: string, patientHealthId: string) => {
    console.log("Checking accessible records for hospital:", hospitalId, "and patient:", patientHealthId);
    
    // First get records directly uploaded by this hospital for this patient
    const directRecords = medicalRecords.filter(
      (record) => 
        record.hospitalId === hospitalId && 
        record.patientHealthId === patientHealthId && 
        record.isApproved
    );
    
    console.log("Direct records:", directRecords);
    
    // Check if the hospital has approved access request
    const hasApprovedAccess = consentRequests.some(req => 
      req.hospitalId === hospitalId && 
      req.patientHealthId === patientHealthId && 
      req.type === 'access' && 
      req.status === 'approved'
    );
    
    console.log("Has approved access:", hasApprovedAccess);
    
    // If the hospital has approved access, include all records for this patient
    const accessRecords = hasApprovedAccess 
      ? medicalRecords.filter(record => 
          record.patientHealthId === patientHealthId &&
          record.isApproved
        )
      : [];
    
    console.log("Access records:", accessRecords);
    
    // Combine both sets of records, removing duplicates
    const allRecordIds = new Set();
    const combinedRecords: MedicalRecord[] = [];
    
    // Add direct records first
    directRecords.forEach(record => {
      allRecordIds.add(record.id);
      combinedRecords.push(record);
    });
    
    // Add access records that aren't already included
    accessRecords.forEach(record => {
      if (!allRecordIds.has(record.id)) {
        allRecordIds.add(record.id);
        combinedRecords.push(record);
      }
    });
    
    console.log("Combined records:", combinedRecords);
    return combinedRecords;
  };

  const addConsentRequest = (request: ConsentRequest) => {
    setConsentRequests((prev) => [...prev, request]);
    return request.id;
  };

  const updateConsentRequest = (requestId: string, status: 'approved' | 'rejected') => {
    console.log("Updating consent request:", requestId, "to status:", status);
    
    // Update consent request status
    setConsentRequests((prev) => {
      const updatedRequests = prev.map((request) => {
        if (request.id === requestId) {
          const updatedRequest = { ...request, status };
          console.log("Updated request:", updatedRequest);
          return updatedRequest;
        }
        return request;
      });
      return updatedRequests;
    });
    
    // If status is approved and it's an upload request, update the medical record
    const request = consentRequests.find(req => req.id === requestId);
    if (status === 'approved' && request && request.type === 'upload' && request.recordId) {
      updateMedicalRecord(request.recordId, { isApproved: true });
    }
  };

  const getPendingConsentRequests = (healthId: string) => {
    return consentRequests.filter(
      (request) => request.patientHealthId === healthId && request.status === 'pending'
    );
  };

  const getHospitalById = (hospitalId: string) => {
    return users.find((user) => user.id === hospitalId && user.type === 'hospital') as Hospital | undefined;
  };

  const value: DbContextType = {
    users,
    medicalRecords,
    consentRequests,
    addUser,
    getUserByEmail,
    getUserByHealthId,
    addMedicalRecord,
    getMedicalRecordsByHospital,
    getMedicalRecordsByPatient,
    addConsentRequest,
    updateConsentRequest,
    getPendingConsentRequests,
    updateMedicalRecord,
    getMedicalRecordById,
    checkHealthIdExists,
    getApprovedMedicalRecordsByHospitalAndPatient,
    getHospitalById,
  };

  return <DbContext.Provider value={value}>{children}</DbContext.Provider>;
};
