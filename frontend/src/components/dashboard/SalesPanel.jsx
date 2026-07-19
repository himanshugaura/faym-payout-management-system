import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';

export function SalesPanel({ userId, onSaleAction, refreshTrigger }) {
  const [sales, setSales] = useState([]);
  const [brand, setBrand] = useState('Acme Corp');
  const [earning, setEarning] = useState(100); 
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userId) loadSales();
  }, [userId, refreshTrigger]);

  const loadSales = async () => {
    try {
      const res = await api.getSalesByUser(userId);
      setSales(res.data);
    } catch (err) {
      toast.error('Failed to load sales');
    }
  };

  const handleCreateSale = async (e) => {
    e.preventDefault();
    if (!brand || earning <= 0) return toast.error('Valid brand and earnings required');
    setLoading(true);
    try {
      await api.createSale({ userId, brand, earningPaise: earning * 100 });
      toast.success('Sale created');
      setBrand('');
      setEarning(100);
      await loadSales();
      onSaleAction(); // notify parent to refresh wallet/history
    } catch (err) {
      toast.error(err.message || 'Failed to create sale');
    } finally {
      setLoading(false);
    }
  };


  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle>Sales Management</CardTitle>
        <CardDescription>Create new affiliate sales and reconcile them.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col space-y-6">
        <form onSubmit={handleCreateSale} className="grid grid-cols-1 gap-4 sm:grid-cols-3 items-end p-4 border rounded-lg bg-muted/50">
          <div className="space-y-2">
            <Label>Brand</Label>
            <Input value={brand} onChange={e => setBrand(e.target.value)} placeholder="Nike, Apple..." />
          </div>
          <div className="space-y-2">
            <Label>Earnings (₹)</Label>
            <Input type="number" min="1" value={earning} onChange={e => setEarning(Number(e.target.value))} />
          </div>
          <Button type="submit" disabled={loading} variant="secondary">Add Sale</Button>
        </form>

        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Brand</TableHead>
                <TableHead>Earning</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Advance Paid?</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">No sales found</TableCell>
                </TableRow>
              )}
              {sales.map(sale => (
                <TableRow key={sale.id}>
                  <TableCell className="font-medium">{sale.brand}</TableCell>
                  <TableCell>₹{(Number(sale.earningPaise) / 100).toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={sale.status === 'APPROVED' ? 'default' : sale.status === 'REJECTED' ? 'destructive' : 'outline'}>
                      {sale.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{sale.isAdvancePaid ? '✅ Yes' : '❌ No'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
