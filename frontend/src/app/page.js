'use client';

import { useState } from 'react';
import { UserSelector } from '@/components/dashboard/UserSelector';
import { SalesPanel } from '@/components/dashboard/SalesPanel';
import { WalletPanel } from '@/components/dashboard/WalletPanel';
import { AdminPanel } from '@/components/dashboard/AdminPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Shield, User } from 'lucide-react';

export default function DashboardPage() {
  const [userId, setUserId] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleDataAction = () => {
    // Increment trigger to force panels to reload data
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Payout Management System</h1>
            <p className="text-muted-foreground mt-1">E2E Flow Demonstration (Mock Gateway Included)</p>
          </div>
          
          <Dialog>
            <DialogTrigger render={<Button variant="outline" className="border-primary/50 text-primary hover:bg-primary/10 transition-colors" />}>
              <BookOpen className="w-4 h-4 mr-2" />
              View Project Guide
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl flex items-center gap-2">
                  🚀 Project Demonstration Guide
                </DialogTitle>
                <DialogDescription className="text-base mt-2">
                  Welcome to the Payout Management System! This UI was built exclusively to demonstrate the complete, end-to-end architecture of the assignment.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 mt-4 text-sm">
                {/* Architecture Overview */}
                <section>
                  <h3 className="text-lg font-bold text-foreground border-b pb-2 mb-3">🏗️ Architecture Overview</h3>
                  <p className="text-muted-foreground">
                    This system features a robust backend built with Node.js, Express, and Prisma (PostgreSQL), strictly adhering to atomicity and idempotency constraints. We handle high concurrency gracefully using Prisma Transactions (`$transaction`) preventing dirty reads or race conditions during payouts.
                  </p>
                </section>

                {/* Role Separation */}
                <section>
                  <h3 className="text-lg font-bold text-foreground border-b pb-2 mb-3">🎭 Role Separation (The Tabs)</h3>
                  <p className="text-muted-foreground mb-4">
                    In a real-world scenario, standard users and system administrators operate on completely different platforms. We simulate this separation using the two main tabs:
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-primary/5 p-4 rounded-md border border-primary/20">
                      <h4 className="font-bold flex items-center gap-2"><User className="w-4 h-4"/> User Dashboard</h4>
                      <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
                        <li><strong>Add Sales:</strong> Simulates a new affiliate sale entering the system.</li>
                        <li><strong>Wallet:</strong> Displays real-time balance and immutable ledger.</li>
                        <li><strong>Withdrawals:</strong> Enforces the 24-hour frequency limit and handles simulated gateway failures/refunds.</li>
                        <li><em>Constraint:</em> Users cannot approve/reject their own sales.</li>
                      </ul>
                    </div>

                    <div className="bg-orange-500/5 p-4 rounded-md border border-orange-500/20">
                      <h4 className="font-bold flex items-center gap-2 text-orange-600 dark:text-orange-400"><Shield className="w-4 h-4"/> Admin Dashboard</h4>
                      <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
                        <li><strong>Reconciliation:</strong> Admins can Approve or Reject pending sales.</li>
                        <li><strong>Final Calculations:</strong> Automatically calculates final payout by deducting any previously paid 10% advances.</li>
                        <li><strong>Clawbacks:</strong> Automatically deducts funds from the wallet if a sale with a paid advance is Rejected.</li>
                      </ul>
                    </div>
                  </div>
                </section>

                {/* Background Jobs Simulation */}
                <section>
                  <h3 className="text-lg font-bold text-foreground border-b pb-2 mb-3">⚙️ Background Jobs Simulation</h3>
                  <p className="text-muted-foreground mb-2">
                    Production systems rely on asynchronous CRON jobs for processing bulk payouts. We provide <strong>Admin Override Buttons</strong> to instantly trigger these jobs for easy testing:
                  </p>
                  <ul className="space-y-3 mt-3 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <Badge variant="outline" className="bg-orange-500/10 text-orange-600 shrink-0 mt-0.5">Advance Payout Job</Badge>
                      <span>Simulates the sweeping job that finds all <code>PENDING</code> sales and pays out a 10% advance. The backend guarantees <strong>Idempotency</strong> (a sale is never double-paid, even if you click this multiple times).</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Badge variant="outline" className="bg-orange-500/10 text-orange-600 shrink-0 mt-0.5">Reset Cooldown</Badge>
                      <span>Bypasses the strict 24-hour withdrawal constraint so you can test multiple withdrawal edge-cases (like gateway failures) in a single sitting.</span>
                    </li>
                  </ul>
                </section>
              </div>
            </DialogContent>
          </Dialog>
        </header>

        {/* User Context */}
        <section>
          <UserSelector onUserSelect={setUserId} />
        </section>

        {/* Main Dashboard (Requires User) */}
        {userId && (
          <Tabs defaultValue="user" className="mt-6">
            <TabsList className="mb-4">
              <TabsTrigger value="user">User Dashboard</TabsTrigger>
              <TabsTrigger value="admin">Admin Dashboard</TabsTrigger>
            </TabsList>
            
            <TabsContent value="user">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <section className="h-full">
                  <SalesPanel userId={userId} onSaleAction={handleDataAction} refreshTrigger={refreshTrigger} />
                </section>
                
                <section className="h-full">
                  <WalletPanel userId={userId} refreshTrigger={refreshTrigger} />
                </section>
              </div>
            </TabsContent>

            <TabsContent value="admin">
              <div className="grid grid-cols-1 gap-6">
                <AdminPanel userId={userId} onAdminAction={handleDataAction} refreshTrigger={refreshTrigger} />
              </div>
            </TabsContent>
          </Tabs>
        )}

      </div>
    </div>
  );
}
