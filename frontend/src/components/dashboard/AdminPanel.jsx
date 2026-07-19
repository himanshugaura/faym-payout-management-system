import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';

export function AdminPanel({ userId, onAdminAction, refreshTrigger }) {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userId) loadSales();
  }, [userId, refreshTrigger]);

  const loadSales = async () => {
    try {
      const res = await api.getSalesByUser(userId);
      setSales(res.data);
    } catch (err) {
      toast.error('Failed to load sales for admin view');
    }
  };

  const handleReconcile = async (saleId, status) => {
    try {
      await api.reconcileSale(saleId, status);
      toast.success(`Sale marked as ${status}`);
      await loadSales();
      onAdminAction();
    } catch (err) {
      toast.error(err.message || 'Failed to reconcile sale');
    }
  };

  const handleAdvancePayout = async () => {
    setLoading(true);
    try {
      const res = await api.triggerAdvancePayout(userId);
      if (res.data.salesProcessed > 0) {
        toast.success(`Processed ${res.data.salesProcessed} sales for ₹${(Number(res.data.totalAdvancePaise) / 100).toFixed(2)}`);
      } else {
        toast.info('No pending sales eligible for advance payout');
      }
      await loadSales();
      onAdminAction();
    } catch (err) {
      toast.error(err.message || 'Advance payout failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResetCooldown = async () => {
    setLoading(true);
    try {
      await api.resetWithdrawalCooldown(userId);
      toast.success('24-hour withdrawal limit has been reset for testing!');
      onAdminAction();
    } catch (err) {
      toast.error('Failed to reset cooldown');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full gap-6">
      <Card className="flex-1">
        <CardHeader>
          <CardTitle>Admin Sales Management</CardTitle>
          <CardDescription>Review pending sales and reconcile them.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Brand</TableHead>
                  <TableHead>Earning</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Advance Paid?</TableHead>
                  <TableHead className="text-right">Admin Actions</TableHead>
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
                    <TableCell className="text-right space-x-2">
                      {sale.status === 'PENDING' && (
                        <>
                          <Button size="sm" variant="outline" className="text-green-600 hover:text-green-700" onClick={() => handleReconcile(sale.id, 'APPROVED')}>Approve</Button>
                          <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => handleReconcile(sale.id, 'REJECTED')}>Reject</Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="border-orange-500/30 bg-orange-500/5 dark:bg-orange-500/10">
        <CardHeader>
          <CardTitle className="text-lg text-orange-600 dark:text-orange-400">System Jobs / Operations</CardTitle>
          <CardDescription>
            These controls simulate background processes or administrative overrides.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Button onClick={handleAdvancePayout} disabled={loading} className="bg-orange-600 hover:bg-orange-700 text-white">
            Simulate Advance Payout Job
          </Button>
          <Button variant="outline" onClick={handleResetCooldown} disabled={loading} className="border-orange-600/50 text-orange-600 dark:text-orange-400 hover:bg-orange-600/10">
            Reset 24h Withdrawal Limit
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
