"use client";

import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from 'react-i18next';

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

  const fetchUsers = useCallback(async () => {
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
  }, [t]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

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
      <CardHeader>
        <div>
          <CardTitle>{t('settings:userManagement.title', 'User Management')}</CardTitle>
          <CardDescription>{t('settings:userManagement.description', 'Manage staff members.')}</CardDescription>
        </div>
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