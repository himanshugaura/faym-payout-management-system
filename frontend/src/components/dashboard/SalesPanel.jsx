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
      onSaleAction();
    } catch (err) {
      toast.error(err.message || 'Failed to create sale');
    } finally {
      setLoading(false);
    }
  };

  const getAdvanceAmount = (sale) => {
    const advanceTx = sale.walletTransactions?.filter(tx => tx.type === 'ADVANCE_CREDIT') || [];
    return advanceTx.reduce((sum, tx) => sum + Number(tx.amountPaise), 0);
  };

  const pendingCount = sales.filter(s => s.status === 'PENDING').length;
  const approvedCount = sales.filter(s => s.status === 'APPROVED').length;
  const rejectedCount = sales.filter(s => s.status === 'REJECTED').length;
  const totalEarnings = sales.reduce((sum, s) => sum + Number(s.earningPaise), 0);
  const totalAdvancePaid = sales.reduce((sum, s) => sum + getAdvanceAmount(s), 0);

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle>Sales Management</CardTitle>
        <CardDescription>Create new affiliate sales and track their lifecycle.</CardDescription>
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

        {sales.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-muted/50 rounded-lg p-3 text-center border">
              <p className="text-2xl font-bold">{sales.length}</p>
              <p className="text-xs text-muted-foreground">Total Sales</p>
            </div>
            <div className="bg-yellow-500/10 rounded-lg p-3 text-center border border-yellow-500/20">
              <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
            <div className="bg-green-500/10 rounded-lg p-3 text-center border border-green-500/20">
              <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
              <p className="text-xs text-muted-foreground">Approved</p>
            </div>
            <div className="bg-red-500/10 rounded-lg p-3 text-center border border-red-500/20">
              <p className="text-2xl font-bold text-red-600">{rejectedCount}</p>
              <p className="text-xs text-muted-foreground">Rejected</p>
            </div>
          </div>
        )}

        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Brand</TableHead>
                <TableHead>Earning</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Advance (10%)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">No sales found. Create one above to begin the demo.</TableCell>
                </TableRow>
              )}
              {sales.map(sale => {
                const advanceAmt = getAdvanceAmount(sale);
                return (
                  <TableRow key={sale.id}>
                    <TableCell className="font-medium">{sale.brand}</TableCell>
                    <TableCell>₹{(Number(sale.earningPaise) / 100).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={sale.status === 'APPROVED' ? 'default' : sale.status === 'REJECTED' ? 'destructive' : 'outline'}>
                        {sale.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {sale.isAdvancePaid 
                        ? <span className="text-green-600 font-medium">₹{(advanceAmt / 100).toFixed(2)}</span>
                        : <span className="text-muted-foreground">Not paid</span>
                      }
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {sales.length > 0 && (
          <div className="bg-muted/30 rounded-lg p-4 border text-sm space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Total Earnings</span><span className="font-semibold">₹{(totalEarnings / 100).toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Total Advance Paid (10%)</span><span className="font-semibold text-green-600">₹{(totalAdvancePaid / 100).toFixed(2)}</span></div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
