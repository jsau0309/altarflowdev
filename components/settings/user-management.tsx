"use client";

import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { useTranslation } from 'react-i18next';
import { PlusCircle } from 'lucide-react';

// Define the shape of the user data we expect from the API
interface ManagedUser {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  role: 'ADMIN' | 'STAFF'; // Assuming these are the only roles from schema
}

export function UserManagementContent() {
  const { t } = useTranslation(['settings', 'common']);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/settings/users');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      const data: ManagedUser[] = await response.json();
      setUsers(data);
    } catch (err) {
      console.error("Failed to fetch users:", err);
      const message = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(t('settings:userManagement.fetchError', `Failed to load users: ${message}`));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []); // Remove t from dependency array if only used in error fallback

  const handleInviteSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsInviting(true);
    setInviteError(null);
    setInviteSuccess(null);

    try {
      const response = await fetch('/api/settings/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP error! Status: ${response.status}`);
      }
      
      setInviteSuccess(result.message || 'Invitation sent successfully!');
      setInviteEmail(""); // Clear input on success
      // Optional: Close dialog on success after a delay?
      // setTimeout(() => setIsInviteDialogOpen(false), 1500);
      fetchUsers(); // Refresh the user list (though the new user won't appear until they accept)

    } catch (err) {
      console.error("Failed to send invite:", err);
      const message = err instanceof Error ? err.message : 'An unknown error occurred';
      setInviteError(t('settings:userManagement.inviteError', `Failed to send invitation: ${message}`));
    } finally {
      setIsInviting(false);
    }
  };

  const renderLoadingSkeleton = () => (
    <TableBody>
      {[...Array(3)].map((_, i) => (
        <TableRow key={`skeleton-${i}`}>
          <TableCell><Skeleton className="h-5 w-24" /></TableCell>
          <TableCell><Skeleton className="h-5 w-40" /></TableCell>
          <TableCell className="text-right"><Skeleton className="h-6 w-16 inline-block" /></TableCell>
        </TableRow>
      ))}
    </TableBody>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{t('settings:userManagement.title', 'User Management')}</CardTitle>
          <CardDescription>{t('settings:userManagement.description', 'Invite and manage staff members.')}</CardDescription>
        </div>
        {/* --- Invite User Dialog --- */}
        <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <PlusCircle className="h-4 w-4" />
              {t('settings:userManagement.inviteButton', 'Invite User')}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleInviteSubmit}>
              <DialogHeader>
                <DialogTitle>{t('settings:userManagement.inviteDialog.title', 'Invite Staff Member')}</DialogTitle>
                <DialogDescription>
                  {t('settings:userManagement.inviteDialog.description', 'Enter the email address of the user you want to invite. They will receive an email with instructions to sign up and join.')}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="invite-email" className="text-right">
                    {t('common:email')}
                  </Label>
                  <Input
                    id="invite-email"
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="col-span-3"
                    placeholder="name@example.com"
                  />
                </div>
                {/* Display Success/Error messages */}
                {inviteError && <p className="text-sm text-destructive col-span-4 text-center">{inviteError}</p>}
                {inviteSuccess && <p className="text-sm text-green-600 col-span-4 text-center">{inviteSuccess}</p>}
              </div>
              <DialogFooter>
                 {/* Add Close button */}
                 <DialogClose asChild>
                    <Button type="button" variant="outline">
                        {t('common:cancel', 'Cancel')}
                    </Button>
                </DialogClose>
                <Button type="submit" disabled={isInviting}>
                  {isInviting ? t('common:sending', 'Sending...') : t('settings:userManagement.inviteDialog.sendButton', 'Send Invitation')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        {/* --- End Invite User Dialog --- */}
      </CardHeader>
      <CardContent>
        {error && (
          <div className="text-destructive text-center p-4">
            {error}
          </div>
        )}
        {!error && (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common:name')}</TableHead>
                  <TableHead>{t('common:email')}</TableHead>
                  <TableHead className="text-right">{t('common:role')}</TableHead>
                </TableRow>
              </TableHeader>
              {isLoading ? renderLoadingSkeleton() : (
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">
                        {t('settings:userManagement.noUsers', 'No users found.')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.firstName || ''} {user.lastName || ''} {!user.firstName && !user.lastName ? '-' : ''}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {user.email || t('common:noEmailAddress', 'No Email')}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>
                            {t(`common:roles.${user.role}`, user.role)}
                          </Badge>
                        </TableCell>
                        {/* Add actions (e.g., Edit Role, Remove) later */}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              )}
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 