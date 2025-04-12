import { useState, useEffect } from 'react';
import { useAuth } from '@/utils/auth-context';
import { useDb, MedicalRecord, ConsentRequest } from '@/utils/db-context';
import { 
  Card, 
  CardContent, 
  CardDescription, 
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
import { useToast } from '@/components/ui/use-toast';
import { 
  User, 
  LogOut, 
  FileText, 
  Bell,
  Download,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Hospital as HospitalIcon
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const PatientDashboard = () => {
  const { currentUser, logout } = useAuth();
  const db = useDb();
  const { toast } = useToast();
  
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [consentRequests, setConsentRequests] = useState<ConsentRequest[]>([]);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (currentUser && currentUser.type === 'patient') {
      const records = db.getMedicalRecordsByPatient(currentUser.healthId);
      setMedicalRecords(records);
      
      const pending = db.getPendingConsentRequests(currentUser.healthId);
      setConsentRequests(pending);
      setPendingCount(pending.length);
    }
  }, [currentUser, db]);

  const handleApproveRequest = (request: ConsentRequest) => {
    if (request.type === 'upload' && request.recordId) {
      db.updateMedicalRecord(request.recordId, { isApproved: true });
      db.updateConsentRequest(request.id, 'approved');
      
      toast({
        title: 'Request Approved',
        description: 'Medical record has been approved and is now accessible',
      });
    } else if (request.type === 'access') {
      db.updateConsentRequest(request.id, 'approved');
      
      toast({
        title: 'Access Granted',
        description: `${request.hospitalName} can now access your medical records`,
      });
    }
    
    if (currentUser && currentUser.type === 'patient') {
      const records = db.getMedicalRecordsByPatient(currentUser.healthId);
      setMedicalRecords(records);
      
      const pending = db.getPendingConsentRequests(currentUser.healthId);
      setConsentRequests(pending);
      setPendingCount(pending.length);
    }
  };

  const handleRejectRequest = (request: ConsentRequest) => {
    db.updateConsentRequest(request.id, 'rejected');
    
    if (request.type === 'upload' && request.recordId) {
      toast({
        title: 'Request Rejected',
        description: 'Medical record upload has been rejected',
      });
    } else if (request.type === 'access') {
      toast({
        title: 'Access Denied',
        description: `Access request from ${request.hospitalName} has been denied`,
      });
    }
    
    if (currentUser && currentUser.type === 'patient') {
      const pending = db.getPendingConsentRequests(currentUser.healthId);
      setConsentRequests(pending);
      setPendingCount(pending.length);
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

  return (
    <div className="min-h-screen bg-health-light">
      <header className="bg-health-primary text-white p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <User className="h-8 w-8" />
            <div>
              <h1 className="text-xl font-bold">Health Record by Code Blooded</h1>
              <p className="text-sm opacity-90">Patient Dashboard</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="font-medium">{currentUser?.name}</p>
              <p className="text-xs opacity-90">Health ID: {currentUser?.healthId}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => logout()} className="bg-white/10 hover:bg-white/20 text-white">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto p-4 md:p-6">
        <Tabs defaultValue="records" className="w-full">
          <TabsList className="grid grid-cols-2 mb-6">
            <TabsTrigger value="records" className="flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              My Medical Records
            </TabsTrigger>
            <TabsTrigger value="requests" className="flex items-center">
              <Bell className="h-4 w-4 mr-2" />
              Consent Requests
              {pendingCount > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center rounded-full">
                  {pendingCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="records">
            <div className="grid grid-cols-1 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>My Medical Records</CardTitle>
                  <CardDescription>
                    View and download your approved medical records
                  </CardDescription>
                </CardHeader>
                
                <CardContent>
                  {medicalRecords.length > 0 ? (
                    <div className="space-y-4">
                      {medicalRecords.map((record) => {
                        const hospital = db.getHospitalById(record.hospitalId);
                        
                        return (
                          <div key={record.id} className="border rounded-lg p-4 shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h3 className="font-medium text-lg">{record.recordType}</h3>
                                <p className="text-sm text-gray-500 flex items-center">
                                  <HospitalIcon className="h-3 w-3 mr-1" />
                                  {hospital?.name || 'Unknown Hospital'}
                                </p>
                              </div>
                              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                                Approved
                              </Badge>
                            </div>
                            
                            <div className="text-sm space-y-2">
                              <p className="text-gray-600">
                                <span className="font-medium">Date:</span>{' '}
                                {new Date(record.createdAt).toLocaleDateString()}
                              </p>
                              
                              {record.notes && (
                                <div>
                                  <p className="font-medium text-gray-600">Notes:</p>
                                  <p className="text-gray-600 italic">{record.notes}</p>
                                </div>
                              )}
                              
                              <div className="flex justify-end mt-4">
                                <Button 
                                  onClick={() => downloadRecord(record)} 
                                  variant="outline"
                                  size="sm"
                                  className="flex items-center"
                                >
                                  <Download className="h-4 w-4 mr-1" />
                                  Download
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <FileText className="h-16 w-16 mx-auto mb-4 opacity-20" />
                      <p className="text-lg font-medium">No Medical Records Yet</p>
                      <p className="mt-1">
                        Your approved medical records will appear here
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="requests">
            <div className="grid grid-cols-1 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Pending Consent Requests</CardTitle>
                  <CardDescription>
                    Approve or reject requests from healthcare providers
                  </CardDescription>
                </CardHeader>
                
                <CardContent>
                  {consentRequests.length > 0 ? (
                    <div className="space-y-4">
                      {consentRequests.map((request) => {
                        let recordDetails = null;
                        if (request.type === 'upload' && request.recordId) {
                          recordDetails = db.getMedicalRecordById(request.recordId);
                        }
                        
                        return (
                          <div key={request.id} className="border rounded-lg p-4 shadow-sm">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h3 className="font-medium text-lg flex items-center">
                                  {request.type === 'upload' ? (
                                    <>
                                      <FileText className="h-4 w-4 mr-2" />
                                      Upload Request
                                    </>
                                  ) : (
                                    <>
                                      <AlertCircle className="h-4 w-4 mr-2" />
                                      Access Request
                                    </>
                                  )}
                                </h3>
                                <p className="text-sm text-gray-500 flex items-center">
                                  <HospitalIcon className="h-3 w-3 mr-1" />
                                  {request.hospitalName}
                                </p>
                              </div>
                              <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                                Pending
                              </Badge>
                            </div>
                            
                            <div className="text-sm space-y-2">
                              <p className="text-gray-600">
                                <span className="font-medium">Date:</span>{' '}
                                {new Date(request.requestDate).toLocaleDateString()}
                              </p>
                              
                              {request.type === 'upload' && recordDetails && (
                                <div className="mt-2 p-3 rounded-md bg-gray-50">
                                  <p className="font-medium mb-1">Record Details:</p>
                                  <p><span className="font-medium text-gray-600">Type:</span> {recordDetails.recordType}</p>
                                  {recordDetails.notes && (
                                    <p className="mt-1"><span className="font-medium text-gray-600">Notes:</span> {recordDetails.notes}</p>
                                  )}
                                </div>
                              )}
                              
                              <div className="flex justify-end space-x-2 mt-4">
                                <Button 
                                  onClick={() => handleRejectRequest(request)} 
                                  variant="outline"
                                  size="sm"
                                  className="flex items-center text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Reject
                                </Button>
                                <Button 
                                  onClick={() => handleApproveRequest(request)} 
                                  variant="outline"
                                  size="sm"
                                  className="flex items-center text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <Bell className="h-16 w-16 mx-auto mb-4 opacity-20" />
                      <p className="text-lg font-medium">No Pending Requests</p>
                      <p className="mt-1">
                        Requests from healthcare providers will appear here
                      </p>
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

export default PatientDashboard;
