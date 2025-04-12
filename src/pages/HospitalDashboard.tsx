import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/utils/auth-context';
import { useDb, Patient, MedicalRecord, ConsentRequest } from '@/utils/db-context';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { 
  Hospital, 
  LogOut, 
  UserPlus, 
  FileUp, 
  Search,
  FileText,
  Download
} from 'lucide-react';

const HospitalDashboard = () => {
  const { currentUser, logout, generateHealthId } = useAuth();
  const db = useDb();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  useEffect(() => {
    if (!currentUser || currentUser.type !== 'hospital') {
      navigate('/');
    }
  }, [currentUser, navigate]);

  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientGender, setPatientGender] = useState<'male' | 'female' | 'other'>('male');
  const [patientPassword, setPatientPassword] = useState('');
  const [generatedHealthId, setGeneratedHealthId] = useState('');
  
  const [uploadHealthId, setUploadHealthId] = useState('');
  const [recordType, setRecordType] = useState('Prescription');
  const [recordNotes, setRecordNotes] = useState('');
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState('');
  const [patientFound, setPatientFound] = useState<Patient | null>(null);
  
  const [accessHealthId, setAccessHealthId] = useState('');
  const [accessPatient, setAccessPatient] = useState<Patient | null>(null);
  const [accessibleRecords, setAccessibleRecords] = useState<MedicalRecord[]>([]);
  
  const [hospitalRecords, setHospitalRecords] = useState<MedicalRecord[]>([]);

  useEffect(() => {
    if (currentUser) {
      const records = db.getMedicalRecordsByHospital(currentUser.id);
      setHospitalRecords(records);
    }
  }, [currentUser, db]);

  const handleGenerateHealthId = () => {
    if (!patientName || !patientGender || !patientPhone || !patientPassword) {
      toast({
        title: 'Error',
        description: 'Please fill all required fields including password',
        variant: 'destructive',
      });
      return;
    }
    
    const newHealthId = generateHealthId(patientName, patientPhone, patientGender);
    setGeneratedHealthId(newHealthId);
    
    if (!db.checkHealthIdExists(newHealthId)) {
      db.addUser({
        id: `patient_${Date.now()}`,
        type: 'patient',
        name: patientName,
        healthId: newHealthId,
        gender: patientGender,
        phoneNumber: patientPhone,
        password: patientPassword,
      });
      
      toast({
        title: 'Patient Registered',
        description: `Patient registered with Health ID: ${newHealthId}`,
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setFileType(file.type);

    const reader = new FileReader();
    reader.onload = (event) => {
      setFileContent(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleVerifyPatient = () => {
    if (!uploadHealthId) {
      toast({
        title: 'Error',
        description: 'Please enter a Health ID',
        variant: 'destructive',
      });
      return;
    }

    const patient = db.getUserByHealthId(uploadHealthId);
    if (patient) {
      setPatientFound(patient as Patient);
      toast({
        title: 'Patient Found',
        description: `Name: ${patient.name}`,
      });
    } else {
      setPatientFound(null);
      toast({
        title: 'Patient Not Found',
        description: 'No patient with this Health ID exists',
        variant: 'destructive',
      });
    }
  };

  const handleUploadRecord = () => {
    if (!currentUser || !patientFound || !fileContent || !recordType) {
      toast({
        title: 'Error',
        description: 'Please fill all required fields and verify patient',
        variant: 'destructive',
      });
      return;
    }

    const record: MedicalRecord = {
      id: `record_${Date.now()}`,
      patientHealthId: patientFound.healthId,
      hospitalId: currentUser.id,
      recordType,
      fileContent,
      fileName,
      fileType,
      notes: recordNotes,
      createdAt: new Date().toISOString(),
      isApproved: false,
    };

    const recordId = db.addMedicalRecord(record);

    const consentRequest: ConsentRequest = {
      id: `request_${Date.now()}`,
      type: "upload",
      patientHealthId: patientFound.healthId,
      hospitalId: currentUser.id,
      hospitalName: currentUser.name,
      requestDate: new Date().toISOString(),
      status: 'pending',
      recordId,
    };

    db.addConsentRequest(consentRequest);

    toast({
      title: 'Record Uploaded',
      description: 'Waiting for patient consent',
    });

    setUploadHealthId('');
    setRecordType('Prescription');
    setRecordNotes('');
    setFileContent(null);
    setFileName('');
    setFileType('');
    setPatientFound(null);
  };

  const handleRequestAccess = () => {
    if (!currentUser || !accessHealthId) {
      toast({
        title: 'Error',
        description: 'Please enter a Health ID',
        variant: 'destructive',
      });
      return;
    }

    const patient = db.getUserByHealthId(accessHealthId);
    if (patient) {
      setAccessPatient(patient as Patient);

      const consentRequest: ConsentRequest = {
        id: `request_${Date.now()}`,
        type: "access",
        patientHealthId: patient.healthId,
        hospitalId: currentUser.id,
        hospitalName: currentUser.name,
        requestDate: new Date().toISOString(),
        status: 'pending',
      };

      db.addConsentRequest(consentRequest);

      toast({
        title: 'Access Requested',
        description: 'Waiting for patient consent',
      });
    } else {
      setAccessPatient(null);
      toast({
        title: 'Patient Not Found',
        description: 'No patient with this Health ID exists',
        variant: 'destructive',
      });
    }
  };

  const handleViewApprovedRecords = () => {
    if (!currentUser || !accessHealthId) return;

    const records = db.getApprovedMedicalRecordsByHospitalAndPatient(
      currentUser.id,
      accessHealthId
    );

    console.log("Fetched accessible records:", records);
    setAccessibleRecords(records);
    
    if (records.length === 0) {
      toast({
        title: 'No Records Found',
        description: 'No approved medical records are available for this patient',
      });
    } else {
      toast({
        title: 'Records Retrieved',
        description: `Found ${records.length} medical records`,
      });
    }
  };

  const downloadRecord = (record: MedicalRecord) => {
    const link = document.createElement('a');
    link.href = record.fileContent;
    link.download = record.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!currentUser || currentUser.type !== 'hospital') {
    return null;
  }

  return (
    <div className="min-h-screen bg-health-light">
      <header className="bg-health-primary text-white p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Hospital className="h-8 w-8" />
            <div>
              <h1 className="text-xl font-bold">Health Record Nexus</h1>
              <p className="text-sm opacity-90">Hospital Dashboard</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <p className="text-sm mr-4">
              <span className="opacity-90">Logged in as:</span>{' '}
              <span className="font-medium">{currentUser.name}</span>
            </p>
            <Button variant="outline" size="sm" onClick={() => logout()} className="bg-white/10 hover:bg-white/20 text-white">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto p-4 md:p-6">
        <Tabs defaultValue="generate" className="w-full">
          <TabsList className="grid grid-cols-3 mb-6">
            <TabsTrigger value="generate" className="flex items-center">
              <UserPlus className="h-4 w-4 mr-2" />
              Generate Health ID
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center">
              <FileUp className="h-4 w-4 mr-2" />
              Upload Medical Record
            </TabsTrigger>
            <TabsTrigger value="access" className="flex items-center">
              <Search className="h-4 w-4 mr-2" />
              Access Records
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="generate">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Generate Patient Health ID</CardTitle>
                  <CardDescription>
                    Create a new Health ID for a patient
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="patientName">Full Name</Label>
                    <Input 
                      id="patientName" 
                      value={patientName} 
                      onChange={(e) => setPatientName(e.target.value)} 
                      placeholder="Patient's full name" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="patientPhone">Phone Number</Label>
                    <Input 
                      id="patientPhone" 
                      value={patientPhone} 
                      onChange={(e) => setPatientPhone(e.target.value)} 
                      placeholder="Phone number" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="patientGender">Gender</Label>
                    <Select 
                      value={patientGender} 
                      onValueChange={(value) => setPatientGender(value as 'male' | 'female' | 'other')}
                    >
                      <SelectTrigger id="patientGender">
                        <SelectValue placeholder="Select Gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="patientPassword">Password</Label>
                    <Input
                      id="patientPassword"
                      type="password"
                      value={patientPassword}
                      onChange={(e) => setPatientPassword(e.target.value)}
                      placeholder="Set a password for the patient"
                    />
                  </div>
                </CardContent>
                
                <CardFooter>
                  <Button 
                    onClick={handleGenerateHealthId} 
                    className="w-full bg-health-primary hover:bg-cyan-700"
                  >
                    Generate Health ID
                  </Button>
                </CardFooter>
              </Card>
              
              {generatedHealthId && (
                <Card>
                  <CardHeader>
                    <CardTitle>Generated Health ID</CardTitle>
                    <CardDescription>
                      Share this ID with the patient
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="p-4 bg-accent rounded-md flex flex-col items-center justify-center space-y-2">
                      <p className="text-sm text-gray-500">Health ID</p>
                      <p className="text-2xl font-mono font-bold text-health-primary">{generatedHealthId}</p>
                      <p className="text-sm text-gray-500 mt-4">Patient Information</p>
                      <p className="font-medium">{patientName}</p>
                      <p className="text-sm text-gray-500">{patientPhone}</p>
                      <p className="text-sm text-gray-500 capitalize">{patientGender}</p>
                    </div>
                  </CardContent>
                  
                  <CardFooter className="flex justify-center">
                    <p className="text-sm text-gray-500">
                      This Health ID can be used to log in to the patient portal.
                    </p>
                  </CardFooter>
                </Card>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="upload">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Upload Medical Record</CardTitle>
                  <CardDescription>
                    Upload a new medical record for a patient
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="uploadHealthId">Patient Health ID</Label>
                    <div className="flex space-x-2">
                      <Input 
                        id="uploadHealthId" 
                        value={uploadHealthId} 
                        onChange={(e) => setUploadHealthId(e.target.value)} 
                        placeholder="Enter patient's Health ID" 
                      />
                      <Button onClick={handleVerifyPatient} type="button" variant="secondary">
                        Verify
                      </Button>
                    </div>
                    
                    {patientFound && (
                      <div className="mt-2 p-2 bg-accent rounded text-sm">
                        <p><span className="font-medium">Name:</span> {patientFound.name}</p>
                        <p><span className="font-medium">Gender:</span> {patientFound.gender}</p>
                        <p><span className="font-medium">Phone:</span> {patientFound.phoneNumber}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="recordType">Record Type</Label>
                    <Select 
                      value={recordType} 
                      onValueChange={setRecordType}
                    >
                      <SelectTrigger id="recordType">
                        <SelectValue placeholder="Select Record Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Prescription">Prescription</SelectItem>
                        <SelectItem value="Lab Report">Lab Report</SelectItem>
                        <SelectItem value="Discharge Summary">Discharge Summary</SelectItem>
                        <SelectItem value="Radiology Report">Radiology Report</SelectItem>
                        <SelectItem value="Consultation Note">Consultation Note</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="recordFile">Upload File</Label>
                    <div className="border-2 border-dashed border-gray-300 rounded-md p-4 text-center">
                      <Input
                        id="recordFile"
                        type="file"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <Label
                        htmlFor="recordFile"
                        className="cursor-pointer flex flex-col items-center justify-center text-gray-500"
                      >
                        <FileUp className="h-8 w-8 mb-2" />
                        <span className="text-sm font-medium">Click to upload file</span>
                        <span className="text-xs mt-1">PDF, JPG, PNG, etc.</span>
                      </Label>
                      {fileName && (
                        <div className="mt-2 text-sm text-gray-700 bg-gray-100 p-2 rounded">
                          {fileName}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="recordNotes">Notes (Optional)</Label>
                    <Textarea 
                      id="recordNotes" 
                      value={recordNotes} 
                      onChange={(e) => setRecordNotes(e.target.value)} 
                      placeholder="Additional notes about the record" 
                    />
                  </div>
                </CardContent>
                
                <CardFooter>
                  <Button 
                    onClick={handleUploadRecord} 
                    disabled={!patientFound || !fileContent}
                    className="w-full bg-health-primary hover:bg-cyan-700"
                  >
                    Upload Record
                  </Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Records Uploaded by This Hospital</CardTitle>
                  <CardDescription>
                    Medical records uploaded for patients
                  </CardDescription>
                </CardHeader>
                
                <CardContent>
                  {hospitalRecords.length > 0 ? (
                    <div className="space-y-2">
                      {hospitalRecords.map((record) => (
                        <div key={record.id} className="border rounded-md p-3 flex justify-between items-center">
                          <div>
                            <p className="font-medium">{record.recordType}</p>
                            <p className="text-sm text-gray-500">Patient ID: {record.patientHealthId}</p>
                            <p className="text-xs text-gray-400">
                              {new Date(record.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              record.isApproved 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {record.isApproved ? 'Approved' : 'Pending'}
                            </span>
                            {record.isApproved && (
                              <Button size="sm" variant="outline" onClick={() => downloadRecord(record)}>
                                <Download className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="h-12 w-12 mx-auto mb-2 opacity-20" />
                      <p>No records uploaded yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="access">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Request Access to Patient Records</CardTitle>
                  <CardDescription>
                    Request permission to view a patient's medical records
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="accessHealthId">Patient Health ID</Label>
                    <Input 
                      id="accessHealthId" 
                      value={accessHealthId} 
                      onChange={(e) => setAccessHealthId(e.target.value)} 
                      placeholder="Enter patient's Health ID" 
                    />
                  </div>
                </CardContent>
                
                <CardFooter className="flex justify-between">
                  <Button 
                    onClick={handleRequestAccess} 
                    variant="outline"
                    className="flex-1 mr-2"
                  >
                    Request Access
                  </Button>
                  <Button 
                    onClick={handleViewApprovedRecords} 
                    className="flex-1 ml-2 bg-health-primary hover:bg-cyan-700"
                  >
                    View Approved Records
                  </Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Accessible Records</CardTitle>
                  <CardDescription>
                    Medical records you have been granted access to
                  </CardDescription>
                </CardHeader>
                
                <CardContent>
                  {accessibleRecords.length > 0 ? (
                    <div className="space-y-2">
                      {accessibleRecords.map((record) => (
                        <div key={record.id} className="border rounded-md p-3 flex justify-between items-center">
                          <div>
                            <p className="font-medium">{record.recordType}</p>
                            <p className="text-sm text-gray-500">Patient ID: {record.patientHealthId}</p>
                            <p className="text-xs text-gray-400">
                              {new Date(record.createdAt).toLocaleDateString()}
                            </p>
                            {record.notes && <p className="text-xs italic mt-1">{record.notes}</p>}
                          </div>
                          <Button size="sm" variant="outline" onClick={() => downloadRecord(record)}>
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="h-12 w-12 mx-auto mb-2 opacity-20" />
                      <p>No accessible records</p>
                      <p className="text-sm mt-1">Request access or check approved records</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default HospitalDashboard;
