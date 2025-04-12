
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useDb, User, Hospital, Patient } from './db-context';
import { useToast } from '@/components/ui/use-toast';

interface AuthContextType {
  currentUser: User | null;
  login: (emailOrHealthId: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  isHospital: boolean;
  isPatient: boolean;
  register: (userData: Partial<User>) => Promise<boolean>;
  generateHealthId: (
    name: string,
    phoneNumber: string,
    gender: 'male' | 'female' | 'other'
  ) => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const db = useDb();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('healthapp_currentUser');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('healthapp_currentUser', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('healthapp_currentUser');
    }
  }, [currentUser]);

  const login = async (emailOrHealthId: string, password: string): Promise<boolean> => {
    console.log("Login attempt with:", emailOrHealthId);
    
    // Check if it's a hospital (login with email)
    const hospital = db.getUserByEmail(emailOrHealthId);
    if (hospital && hospital.password === password) {
      setCurrentUser(hospital);
      toast({
        title: 'Login Successful',
        description: `Welcome, ${hospital.name}!`,
      });
      return true;
    }

    // Check if it's a patient (login with healthId)
    const patient = db.getUserByHealthId(emailOrHealthId);
    console.log("Found patient by healthId:", patient);
    
    if (patient && patient.password === password) {
      setCurrentUser(patient);
      toast({
        title: 'Login Successful',
        description: `Welcome, ${patient.name}!`,
      });
      return true;
    }

    toast({
      title: 'Login Failed',
      description: 'Invalid credentials. Please try again.',
      variant: 'destructive',
    });
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    toast({
      title: 'Logged Out',
      description: 'You have been successfully logged out.',
    });
  };

  const generateHealthId = (
    name: string,
    phoneNumber: string,
    gender: 'male' | 'female' | 'other'
  ): string => {
    // First check if a health ID already exists for this person
    const existingUser = db.users.find(
      user => 
        user.name.toLowerCase() === name.toLowerCase() && 
        user.phoneNumber === phoneNumber
    );

    if (existingUser && existingUser.healthId) {
      toast({
        title: 'Health ID Already Exists',
        description: `Health ID for ${name} already exists: ${existingUser.healthId}`,
      });
      return existingUser.healthId;
    }

    // Generate a new health ID - use consistent algorithm
    // Use deterministic approach based on name and phone for consistency
    const nameHash = name.toLowerCase().split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    const phoneHash = phoneNumber.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    const genderCode = gender === 'male' ? '1' : gender === 'female' ? '2' : '3';
    
    const timestamp = Date.now().toString().slice(-6);
    const uniqueId = (nameHash + phoneHash).toString().padStart(5, '0').slice(0, 5);
    const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    
    // 14-digit Health ID format: yyyymmxxxxxggr (year-month-uniqueid-gender-random)
    const today = new Date();
    const year = today.getFullYear().toString();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    
    const healthId = year + month + uniqueId + genderCode + random;
    
    return healthId;
  };

  const register = async (userData: Partial<User>): Promise<boolean> => {
    try {
      console.log("Registering user with data:", userData);
      
      if (userData.type === 'hospital') {
        if (!userData.email || !userData.password || !userData.name) {
          toast({
            title: 'Registration Failed',
            description: 'Please fill all required fields',
            variant: 'destructive',
          });
          return false;
        }

        // Check if hospital with this email already exists
        const existingHospital = db.getUserByEmail(userData.email);
        if (existingHospital) {
          toast({
            title: 'Registration Failed',
            description: 'A hospital with this email already exists',
            variant: 'destructive',
          });
          return false;
        }

        const hospital: Hospital = {
          id: `hospital_${Date.now()}`,
          type: 'hospital',
          email: userData.email,
          password: userData.password,
          name: userData.name,
        };

        db.addUser(hospital);
        setCurrentUser(hospital);
        toast({
          title: 'Registration Successful',
          description: `Welcome, ${hospital.name}!`,
        });
        return true;
      } else if (userData.type === 'patient') {
        if (!userData.healthId || !userData.password || !userData.name || !userData.gender || !userData.phoneNumber) {
          toast({
            title: 'Registration Failed',
            description: 'Please fill all required fields',
            variant: 'destructive',
          });
          return false;
        }

        // Check if patient with this Health ID already exists
        const existingPatient = db.getUserByHealthId(userData.healthId);
        if (existingPatient) {
          toast({
            title: 'Registration Failed',
            description: 'A patient with this Health ID already exists',
            variant: 'destructive',
          });
          return false;
        }

        const patient: Patient = {
          id: `patient_${Date.now()}`,
          type: 'patient',
          healthId: userData.healthId,
          password: userData.password,
          name: userData.name,
          gender: userData.gender,
          phoneNumber: userData.phoneNumber,
        };

        console.log("Adding patient to database:", patient);
        db.addUser(patient);
        setCurrentUser(patient);
        toast({
          title: 'Registration Successful',
          description: `Welcome, ${patient.name}!`,
        });
        return true;
      }

      return false;
    } catch (error) {
      console.error('Registration error:', error);
      toast({
        title: 'Registration Failed',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        login,
        logout,
        isAuthenticated: !!currentUser,
        isHospital: currentUser?.type === 'hospital',
        isPatient: currentUser?.type === 'patient',
        register,
        generateHealthId,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
