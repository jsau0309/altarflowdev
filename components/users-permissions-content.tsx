"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { useTranslation } from "react-i18next"

type User = {
  id: string
  name: string
  email: string
  role: "admin" | "editor" | "viewer"
  isMainAdmin?: boolean
}

export function UsersPermissionsContent() {
  const { t } = useTranslation(['settings', 'common'])
  const { showToast } = useToast()
  const [users, setUsers] = useState<User[]>([
    { id: "1", name: "John Doe", email: "john@example.com", role: "admin", isMainAdmin: true },
    { id: "2", name: "Jane Smith", email: "jane@example.com", role: "editor" },
    { id: "3", name: "Bob Johnson", email: "bob@example.com", role: "viewer" },
  ])

  const [newUser, setNewUser] = useState<{ name: string; email: string; role: "admin" | "editor" | "viewer" }>({ name: "", email: "", role: "viewer" })
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  const handleAddUser = () => {
    if (!newUser.name || !newUser.email) return

    const newId = (users.length + 1).toString()
    setUsers([...users, { ...newUser, id: newId }])
    setNewUser({ name: "", email: "", role: "viewer" })
    setIsAddDialogOpen(false)

    showToast(
      t('settings:userPermissions.toast.userAdded', '{{name}} has been added as a {{role}}', { name: newUser.name, role: newUser.role }),
      "success",
    )
  }

  const handleEditUser = () => {
    if (!editingUser) return

    setUsers(users.map((user) => (user.id === editingUser.id ? editingUser : user)))
    setEditingUser(null)
    setIsEditDialogOpen(false)

    showToast(
      t('settings:userPermissions.toast.userUpdated', "{{name}}\'s information has been updated", { name: editingUser.name }),
      "success",
    )
  }

  const handleDeleteUser = () => {
    if (!userToDelete) return

    if (userToDelete.isMainAdmin) {
      showToast(
        t('settings:userPermissions.toast.cannotDeleteAdmin', 'The main admin account cannot be deleted as it holds the license.'),
        "error",
      )
      return
    }

    setUsers(users.filter((user) => user.id !== userToDelete.id))
    setUserToDelete(null)
    setIsDeleteDialogOpen(false)

    showToast(
      t('settings:userPermissions.toast.userRemoved', '{{name}} has been removed', { name: userToDelete.name }),
      "success",
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>{t('settings:userPermissions.title', 'Users & Permissions')}</CardTitle>
            <CardDescription>{t('settings:userPermissions.subtitle', 'Manage user access and roles')}</CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="mt-4 sm:mt-0">{t('settings:userPermissions.addUserButton', 'Add User')}</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{t('settings:userPermissions.addUserDialog.title', 'Add New User')}</DialogTitle>
                <DialogDescription>
                  {t('settings:userPermissions.addUserDialog.description', 'Enter the details of the new user. They will receive an email invitation.')}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">{t('settings:userPermissions.addUserDialog.nameLabel', 'Name')}</Label>
                  <Input
                    id="name"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">{t('settings:userPermissions.addUserDialog.emailLabel', 'Email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="role">{t('settings:userPermissions.addUserDialog.roleLabel', 'Role')}</Label>
                  <Select
                    value={newUser.role}
                    onValueChange={(value: "admin" | "editor" | "viewer") => setNewUser({ ...newUser, role: value })}
                  >
                    <SelectTrigger id="role">
                      <SelectValue placeholder={t('settings:userPermissions.addUserDialog.rolePlaceholder', 'Select a role')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">{t('common:roles.admin', 'Admin')}</SelectItem>
                      <SelectItem value="editor">{t('common:roles.editor', 'Editor')}</SelectItem>
                      <SelectItem value="viewer">{t('common:roles.viewer', 'Viewer')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>{t('common:cancel', 'Cancel')}</Button>
                <Button onClick={handleAddUser}>{t('settings:userPermissions.addUserDialog.addButton', 'Add User')}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('settings:userPermissions.table.headerName', 'Name')}</TableHead>
                  <TableHead>{t('settings:userPermissions.table.headerEmail', 'Email')}</TableHead>
                  <TableHead>{t('settings:userPermissions.table.headerRole', 'Role')}</TableHead>
                  <TableHead className="text-right">{t('common:actions', 'Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.name}
                      {user.isMainAdmin && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                          {t('settings:userPermissions.mainAdminBadge', 'Main Admin')}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <span
                        className={`capitalize ${user.role === "admin" ? "text-blue-600" : user.role === "editor" ? "text-green-600" : "text-gray-600"}`}
                      >
                        {t(`common:roles.${user.role}`, user.role.charAt(0).toUpperCase() + user.role.slice(1))}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Dialog
                        open={isEditDialogOpen && editingUser?.id === user.id}
                        onOpenChange={(open) => {
                          setIsEditDialogOpen(open)
                          if (!open) setEditingUser(null)
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingUser(user)
                              setIsEditDialogOpen(true)
                            }}
                          >
                            {t('common:edit', 'Edit')}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                          <DialogHeader>
                            <DialogTitle>{t('settings:userPermissions.editUserDialog.title', 'Edit User')}</DialogTitle>
                            <DialogDescription>{t('settings:userPermissions.editUserDialog.description', 'Update user information and permissions.')}</DialogDescription>
                          </DialogHeader>
                          {editingUser && (
                            <div className="grid gap-4 py-4">
                              <div className="grid gap-2">
                                <Label htmlFor="edit-name">{t('settings:userPermissions.editUserDialog.nameLabel', 'Name')}</Label>
                                <Input
                                  id="edit-name"
                                  value={editingUser.name}
                                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label htmlFor="edit-email">{t('settings:userPermissions.editUserDialog.emailLabel', 'Email')}</Label>
                                <Input
                                  id="edit-email"
                                  type="email"
                                  value={editingUser.email}
                                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label htmlFor="edit-role">{t('settings:userPermissions.editUserDialog.roleLabel', 'Role')}</Label>
                                <Select
                                  value={editingUser.role}
                                  onValueChange={(value: "admin" | "editor" | "viewer") =>
                                    setEditingUser({ ...editingUser, role: value })
                                  }
                                  disabled={editingUser.isMainAdmin}
                                >
                                  <SelectTrigger id="edit-role">
                                    <SelectValue placeholder={t('settings:userPermissions.editUserDialog.rolePlaceholder', 'Select a role')} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="admin">{t('common:roles.admin', 'Admin')}</SelectItem>
                                    <SelectItem value="editor">{t('common:roles.editor', 'Editor')}</SelectItem>
                                    <SelectItem value="viewer">{t('common:roles.viewer', 'Viewer')}</SelectItem>
                                  </SelectContent>
                                </Select>
                                {editingUser.isMainAdmin && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {t('settings:userPermissions.editUserDialog.cannotChangeAdminRole', 'The main admin role cannot be changed.')}
                                  </p>
                                )}
                              </div>

                              {!editingUser.isMainAdmin && (
                                <div className="border-t pt-4 mt-2">
                                  <Button
                                    variant="destructive"
                                    className="w-full"
                                    onClick={() => {
                                      setUserToDelete(editingUser)
                                      setIsEditDialogOpen(false)
                                      setIsDeleteDialogOpen(true)
                                    }}
                                  >
                                    {t('settings:userPermissions.editUserDialog.deleteUserButton', 'Delete User')}
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>{t('common:cancel', 'Cancel')}</Button>
                            <Button onClick={handleEditUser}>{t('settings:userPermissions.editUserDialog.saveButton', 'Save Changes')}</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('settings:userPermissions.deleteDialog.title', 'Are you sure?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('settings:userPermissions.deleteDialog.description', 'This will permanently delete the user {{name}} and remove their access to the system.', { name: userToDelete?.name || t('common.thisUser', 'this user') })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToDelete(null)}>{t('common:cancel', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-red-600 hover:bg-red-700">
              {t('common:delete', 'Delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
