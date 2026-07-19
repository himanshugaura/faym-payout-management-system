import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export function UserSelector({ onUserSelect }) {
  const [users, setUsers] = useState([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const res = await api.getAllUsers();
      setUsers(res.data);
    } catch (err) {
      toast.error('Failed to load users');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!name || !email) return toast.error('Name and email required');
    setLoading(true);
    try {
      const res = await api.registerUser({ name, email });
      toast.success('User registered successfully');
      setName('');
      setEmail('');
      await loadUsers();
      
      const newUserId = res.data.id;
      setSelectedUserId(newUserId);
      onUserSelect(newUserId);
    } catch (err) {
      toast.error(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (val) => {
    setSelectedUserId(val);
    onUserSelect(val);
  };

  const getSelectedUserLabel = () => {
    const user = users.find(u => u.id === selectedUserId);
    return user ? `${user.name} (${user.email})` : 'Select a user to emulate...';
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>User Context</CardTitle>
        <CardDescription>Select an existing user or register a new one to simulate the flow.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Select User</Label>
          <Select value={selectedUserId} onValueChange={handleSelect}>
            <SelectTrigger>
              <SelectValue placeholder="Select a user to emulate...">
                {getSelectedUserLabel()}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {users.map(u => (
                <SelectItem key={u.id} value={u.id}>{u.name} ({u.email})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="relative">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Or</span></div>
        </div>

        <form onSubmit={handleRegister} className="grid grid-cols-1 gap-4 sm:grid-cols-3 items-end">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="John Doe" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="john@example.com" />
          </div>
          <Button type="submit" disabled={loading}>Register</Button>
        </form>
      </CardContent>
    </Card>
  );
}
