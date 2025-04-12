
import { useState, useEffect } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Hospital, 
  LogOut, 
  UserPlus, 
  FileUp, 
  Search,
  FileText,
  Download,
  CheckCircle,
  XCircle,
  Loader2,
  Users,
  ShieldCheck,
  Clipboard
} from 'lucide-react';

const HospitalDashboard = () => {
  const { currentUser, logout, generateHealthId } = useAuth();
  const db = useDb();
  const { toast } = useToast();
  
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
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Refresh accessible records list whenever consent requests change
    if (currentUser && accessHealthId) {
      handleViewApprovedRecords();
    }
  }, [db.consentRequests]);

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

      // Check if request already exists
      const existingRequest = db.consentRequests.find(
        req => req.hospitalId === currentUser.id && 
              req.patientHealthId === patient.healthId && 
              req.type === 'access' &&
              (req.status === 'pending' || req.status === 'approved')
      );

      if (existingRequest) {
        if (existingRequest.status === 'approved') {
          toast({
            title: 'Access Already Granted',
            description: 'You already have access to this patient\'s records',
          });
          handleViewApprovedRecords();
          return;
        } else {
          toast({
            title: 'Request Pending',
            description: 'Your request is already pending approval',
          });
          return;
        }
      }

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

    setIsLoading(true);

    setTimeout(() => {
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

      setIsLoading(false);
    }, 1000); // Simulate loading for better UX
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
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-blue-50">
      <header className="bg-gradient-to-r from-cyan-700 to-blue-800 text-white p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Hospital className="h-8 w-8" />
            <div>
              <h1 className="text-xl font-bold">Health Record by Code Blooded</h1>
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
            <TabsTrigger value="generate" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Generate Health ID
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <FileUp className="h-4 w-4" />
              Upload Medical Record
            </TabsTrigger>
            <TabsTrigger value="access" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Access Records
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="generate" className="animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-cyan-200 shadow-md hover:shadow-lg transition-shadow duration-300">
                <CardHeader className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-t-lg border-b border-cyan-100">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-cyan-100 rounded-full">
                      <Users className="h-5 w-5 text-cyan-700" />
                    </div>
                    <div>
                      <CardTitle>Generate Patient Health ID</CardTitle>
                      <CardDescription>
                        Create a new Health ID for a patient
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4 pt-5">
                  <div className="space-y-2">
                    <Label htmlFor="patientName">Full Name</Label>
                    <Input 
                      id="patientName" 
                      value={patientName} 
                      onChange={(e) => setPatientName(e.target.value)} 
                      placeholder="Patient's full name" 
                      className="border-cyan-200 focus:border-cyan-500"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="patientPhone">Phone Number</Label>
                    <Input 
                      id="patientPhone" 
                      value={patientPhone} 
                      onChange={(e) => setPatientPhone(e.target.value)} 
                      placeholder="Phone number" 
                      className="border-cyan-200 focus:border-cyan-500"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="patientGender">Gender</Label>
                    <Select 
                      value={patientGender} 
                      onValueChange={(value) => setPatientGender(value as 'male' | 'female' | 'other')}
                    >
                      <SelectTrigger id="patientGender" className="border-cyan-200 focus:border-cyan-500">
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
                      className="border-cyan-200 focus:border-cyan-500"
                    />
                  </div>
                </CardContent>
                
                <CardFooter>
                  <Button 
                    onClick={handleGenerateHealthId} 
                    className="w-full bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-700 hover:to-blue-800 transition-all shadow-lg"
                  >
                    Generate Health ID
                  </Button>
                </CardFooter>
              </Card>
              
              {generatedHealthId && (
                <Card className="border-green-200 shadow-md bg-white">
                  <CardHeader className="bg-gradient-to-r from-green-50 to-teal-50 rounded-t-lg border-b border-green-100">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-green-100 rounded-full">
                        <ShieldCheck className="h-5 w-5 text-green-700" />
                      </div>
                      <div>
                        <CardTitle>Generated Health ID</CardTitle>
                        <CardDescription>
                          Share this ID with the patient
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-6">
                    <div className="p-6 bg-green-50 rounded-lg flex flex-col items-center justify-center space-y-4 border border-green-100">
                      <p className="text-sm text-gray-500">Health ID</p>
                      <p className="text-2xl font-mono font-bold text-green-700 tracking-wider bg-white px-6 py-3 rounded-lg shadow-sm border border-green-200">
                        {generatedHealthId}
                      </p>
                      <div className="w-full border-t border-green-200 my-2"></div>
                      <p className="text-sm text-gray-500 mt-4">Patient Information</p>
                      <p className="font-medium text-lg">{patientName}</p>
                      <div className="flex space-x-4 text-sm text-gray-600">
                        <p>{patientPhone}</p>
                        <p className="capitalize">{patientGender}</p>
                      </div>
                    </div>
                  </CardContent>
                  
                  <CardFooter className="flex justify-center">
                    <p className="text-sm text-gray-500 italic">
                      This Health ID can be used to log in to the patient portal
                    </p>
                  </CardFooter>
                </Card>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="upload" className="animate-fade-in">
            <Card className="border-cyan-200 shadow-md hover:shadow-lg transition-shadow duration-300">
              <CardHeader className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-t-lg border-b border-cyan-100">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-cyan-100 rounded-full">
                    <FileUp className="h-5 w-5 text-cyan-700" />
                  </div>
                  <div>
                    <CardTitle>Upload Medical Record</CardTitle>
                    <CardDescription>
                      Upload a new medical record for a patient
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4 pt-5">
                <div className="space-y-2">
                  <Label htmlFor="uploadHealthId">Patient Health ID</Label>
                  <div className="flex space-x-2">
                    <Input 
                      id="uploadHealthId" 
                      value={uploadHealthId} 
                      onChange={(e) => setUploadHealthId(e.target.value)} 
                      placeholder="Enter patient's Health ID" 
                      className="border-cyan-200 focus:border-cyan-500"
                    />
                    <Button 
                      onClick={handleVerifyPatient} 
                      type="button" 
                      variant="outline"
                      className="border-cyan-300 hover:bg-cyan-50"
                    >
                      Verify
                    </Button>
                  </div>
                  
                  {patientFound && (
                    <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200 text-sm animate-fade-in">
                      <div className="flex items-center space-x-2 mb-2 text-green-700">
                        <CheckCircle className="h-4 w-4" />
                        <p className="font-semibold">Patient Verified</p>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 pl-6">
                        <p className="text-gray-600">Name:</p>
                        <p className="font-medium">{patientFound.name}</p>
                        <p className="text-gray-600">Gender:</p>
                        <p className="capitalize">{patientFound.gender}</p>
                        <p className="text-gray-600">Phone:</p>
                        <p>{patientFound.phoneNumber}</p>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="recordType">Record Type</Label>
                  <Select 
                    value={recordType} 
                    onValueChange={setRecordType}
                  >
                    <SelectTrigger id="recordType" className="border-cyan-200 focus:border-cyan-500">
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
                  <div className="border-2 border-dashed border-cyan-200 hover:border-cyan-400 transition-colors rounded-lg p-6 text-center">
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
                      <FileUp className="h-10 w-10 mb-3 text-cyan-500" />
                      <span className="text-sm font-medium text-cyan-700">Click to upload file</span>
                      <span className="text-xs mt-1 text-gray-500">PDF, JPG, PNG, etc.</span>
                    </Label>
                    {fileName && (
                      <div className="mt-3 text-sm font-medium text-cyan-700 bg-cyan-50 p-2 rounded-md border border-cyan-200 inline-block">
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
                    className="border-cyan-200 focus:border-cyan-500 min-h-[80px]"
                  />
                </div>
              </CardContent>
              
              <CardFooter className="pt-2">
                <Button 
                  onClick={handleUploadRecord} 
                  disabled={!patientFound || !fileContent}
                  className="w-full bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-700 hover:to-blue-800 transition-all shadow-lg"
                >
                  Upload Record
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="access" className="animate-fade-in">
            <div className="grid grid-cols-1 gap-6">
              <Card className="border-cyan-200 shadow-md hover:shadow-lg transition-shadow duration-300">
                <CardHeader className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-t-lg border-b border-cyan-100">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-cyan-100 rounded-full">
                      <Search className="h-5 w-5 text-cyan-700" />
                    </div>
                    <div>
                      <CardTitle>Access Patient Records</CardTitle>
                      <CardDescription>
                        Request permission to view a patient's medical records
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4 pt-5">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-blue-800 text-sm">
                    <p className="flex items-center">
                      <Clipboard className="h-4 w-4 mr-2" />
                      Enter a patient's Health ID to request access to their records. Once approved, you'll be able to view and download them.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="accessHealthId">Patient Health ID</Label>
                    <div className="flex space-x-2">
                      <Input 
                        id="accessHealthId" 
                        value={accessHealthId} 
                        onChange={(e) => setAccessHealthId(e.target.value)} 
                        placeholder="Enter patient's Health ID" 
                        className="border-cyan-200 focus:border-cyan-500"
                      />
                      <Button 
                        onClick={handleRequestAccess} 
                        variant="outline"
                        className="border-cyan-300 hover:bg-cyan-50 whitespace-nowrap"
                      >
                        Request Access
                      </Button>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button 
                      onClick={handleViewApprovedRecords} 
                      disabled={!accessHealthId || isLoading}
                      className="w-full bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-700 hover:to-blue-800 transition-all shadow-lg"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Loading Records...
                        </>
                      ) : (
                        <>
                          View Approved Records
                        </>
                      )}
                    </Button>
                  </div>
                  
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <h3 className="text-lg font-medium mb-4">Accessible Records</h3>
                    
                    {accessibleRecords.length > 0 ? (
                      <div className="border border-cyan-200 rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader className="bg-cyan-50">
                            <TableRow>
                              <TableHead className="text-cyan-900">Type</TableHead>
                              <TableHead className="text-cyan-900">Date</TableHead>
                              <TableHead className="text-cyan-900">Notes</TableHead>
                              <TableHead className="text-cyan-900 text-right">Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {accessibleRecords.map((record) => (
                              <TableRow key={record.id} className="hover:bg-cyan-50/50">
                                <TableCell className="font-medium">{record.recordType}</TableCell>
                                <TableCell className="text-sm">
                                  {new Date(record.createdAt).toLocaleDateString()}
                                </TableCell>
                                <TableCell className="text-sm max-w-[300px] truncate">
                                  {record.notes || "-"}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={() => downloadRecord(record)}
                                    className="text-cyan-700 border-cyan-300"
                                  >
                                    <Download className="h-4 w-4 mr-1" />
                                    Download
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-10 border border-dashed border-gray-200 rounded-lg bg-gray-50">
                        <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-gray-500 mb-1">No accessible records</p>
                        <p className="text-sm text-gray-400">
                          {accessHealthId 
                            ? "Request access or check approved records" 
                            : "Enter a Patient Health ID above"}
                        </p>
                      </div>
                    )}
                  </div>
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
