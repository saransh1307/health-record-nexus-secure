
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/utils/auth-context';
import { Hospital } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const { login, register, generateHealthId } = useAuth();
  const navigate = useNavigate();
  
  // Login state
  const [loginType, setLoginType] = useState<'hospital' | 'patient'>('hospital');
  const [email, setEmail] = useState('');
  const [healthId, setHealthId] = useState('');
  const [password, setPassword] = useState('');
  
  // Hospital registration state
  const [hospitalName, setHospitalName] = useState('');
  const [hospitalEmail, setHospitalEmail] = useState('');
  const [hospitalPassword, setHospitalPassword] = useState('');
  
  // Patient registration state
  const [patientName, setPatientName] = useState('');
  const [patientGender, setPatientGender] = useState<'male' | 'female' | 'other'>('male');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientHealthId, setPatientHealthId] = useState('');
  const [patientPassword, setPatientPassword] = useState('');

  const handleLogin = async () => {
    console.log("Login attempt:", loginType, loginType === 'hospital' ? email : healthId);
    const loginIdentifier = loginType === 'hospital' ? email : healthId;
    const success = await login(loginIdentifier, password);
    if (success) {
      navigate(loginType === 'hospital' ? '/hospital' : '/patient');
    }
  };

  const handleHospitalRegister = async () => {
    if (!hospitalName || !hospitalEmail || !hospitalPassword) {
      return; // Form validation will handle this
    }
    
    const success = await register({
      type: 'hospital',
      name: hospitalName,
      email: hospitalEmail,
      password: hospitalPassword
    });
    
    if (success) {
      navigate('/hospital');
    }
  };

  const handlePatientRegister = async () => {
    if (!patientName || !patientPhone || !patientGender || !patientPassword) {
      return; // Form validation will handle this
    }
    
    // Generate Health ID if not provided
    let healthIdToUse = patientHealthId;
    if (!healthIdToUse) {
      healthIdToUse = generateHealthId(patientName, patientPhone, patientGender);
      setPatientHealthId(healthIdToUse);
    }
    
    console.log("Registering patient with healthId:", healthIdToUse);
    const success = await register({
      type: 'patient',
      name: patientName,
      healthId: healthIdToUse,
      password: patientPassword,
      gender: patientGender,
      phoneNumber: patientPhone
    });
    
    if (success) {
      navigate('/patient');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-health-light">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-2 text-center">
          <div className="flex justify-center mb-4">
            <Hospital className="h-12 w-12 text-health-primary" />
          </div>
          <CardTitle className="text-2xl font-bold text-health-primary">Health Record by Code Blooded</CardTitle>
          <CardDescription>Secure Health Record Exchange System</CardDescription>
        </CardHeader>
        
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="hospital">Hospital Register</TabsTrigger>
            <TabsTrigger value="patient">Patient Register</TabsTrigger>
          </TabsList>
          
          {/* Login Tab */}
          <TabsContent value="login">
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Tabs value={loginType} onValueChange={(value) => setLoginType(value as 'hospital' | 'patient')} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="hospital">Hospital</TabsTrigger>
                    <TabsTrigger value="patient">Patient</TabsTrigger>
                  </TabsList>
                  
                  {/* Hospital Login */}
                  <TabsContent value="hospital">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input 
                        id="email" 
                        type="email" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        placeholder="hospital@example.com" 
                        required 
                      />
                    </div>
                  </TabsContent>
                  
                  {/* Patient Login */}
                  <TabsContent value="patient">
                    <div className="space-y-2">
                      <Label htmlFor="healthId">Health ID</Label>
                      <Input 
                        id="healthId" 
                        value={healthId} 
                        onChange={(e) => setHealthId(e.target.value)} 
                        placeholder="14-digit Health ID" 
                        required 
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                />
              </div>
            </CardContent>
            
            <CardFooter>
              <Button onClick={handleLogin} className="w-full bg-health-primary hover:bg-cyan-700">
                Login
              </Button>
            </CardFooter>
          </TabsContent>
          
          {/* Hospital Registration Tab */}
          <TabsContent value="hospital">
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="hospitalName">Hospital Name</Label>
                <Input 
                  id="hospitalName" 
                  value={hospitalName} 
                  onChange={(e) => setHospitalName(e.target.value)} 
                  placeholder="Hospital Name" 
                  required 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="hospitalEmail">Email</Label>
                <Input 
                  id="hospitalEmail" 
                  type="email" 
                  value={hospitalEmail} 
                  onChange={(e) => setHospitalEmail(e.target.value)} 
                  placeholder="hospital@example.com" 
                  required 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="hospitalPassword">Password</Label>
                <Input 
                  id="hospitalPassword" 
                  type="password" 
                  value={hospitalPassword} 
                  onChange={(e) => setHospitalPassword(e.target.value)} 
                  required 
                />
              </div>
            </CardContent>
            
            <CardFooter>
              <Button onClick={handleHospitalRegister} className="w-full bg-health-primary hover:bg-cyan-700">
                Register Hospital
              </Button>
            </CardFooter>
          </TabsContent>
          
          {/* Patient Registration Tab */}
          <TabsContent value="patient">
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="patientName">Full Name</Label>
                <Input 
                  id="patientName" 
                  value={patientName} 
                  onChange={(e) => setPatientName(e.target.value)} 
                  placeholder="Full Name" 
                  required 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="patientPhone">Phone Number</Label>
                <Input 
                  id="patientPhone" 
                  value={patientPhone} 
                  onChange={(e) => setPatientPhone(e.target.value)} 
                  placeholder="Phone Number" 
                  required 
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
                <div className="flex justify-between items-center">
                  <Label htmlFor="patientHealthId">Health ID</Label>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      if (patientName && patientPhone && patientGender) {
                        const newHealthId = generateHealthId(patientName, patientPhone, patientGender);
                        setPatientHealthId(newHealthId);
                      } else {
                        alert("Please fill name, phone and gender first");
                      }
                    }}
                    type="button"
                  >
                    Generate ID
                  </Button>
                </div>
                <Input 
                  id="patientHealthId" 
                  value={patientHealthId} 
                  onChange={(e) => setPatientHealthId(e.target.value)} 
                  placeholder="14-digit Health ID" 
                  readOnly
                />
                <p className="text-xs text-gray-500">Health ID will be generated based on your information</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="patientPassword">Password</Label>
                <Input 
                  id="patientPassword" 
                  type="password" 
                  value={patientPassword} 
                  onChange={(e) => setPatientPassword(e.target.value)} 
                  required 
                />
              </div>
            </CardContent>
            
            <CardFooter>
              <Button onClick={handlePatientRegister} className="w-full bg-health-primary hover:bg-cyan-700">
                Register Patient
              </Button>
            </CardFooter>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default Login;
