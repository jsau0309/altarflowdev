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

type User = {
  id: string
  name: string
  email: string
  role: "admin" | "editor" | "viewer"
  isMainAdmin?: boolean
}

export function UsersPermissionsContent() {
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
      `${newUser.name} has been added as a ${newUser.role}`,
      "success",
    )
  }

  const handleEditUser = () => {
    if (!editingUser) return

    setUsers(users.map((user) => (user.id === editingUser.id ? editingUser : user)))
    setEditingUser(null)
    setIsEditDialogOpen(false)

    showToast(
      `${editingUser.name}'s information has been updated`,
      "success",
    )
  }

  const handleDeleteUser = () => {
    if (!userToDelete) return

    if (userToDelete.isMainAdmin) {
      showToast(
        "The main admin account cannot be deleted as it holds the license.",
        "error",
      )
      return
    }

    setUsers(users.filter((user) => user.id !== userToDelete.id))
    setUserToDelete(null)
    setIsDeleteDialogOpen(false)

    showToast(
      `${userToDelete.name} has been removed`,
      "success",
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Users & Permissions</CardTitle>
            <CardDescription>Manage user access and roles</CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="mt-4 sm:mt-0">Add User</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
                <DialogDescription>
                  Enter the details of the new user. They will receive an email invitation.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={newUser.role}
                    onValueChange={(value: "admin" | "editor" | "viewer") => setNewUser({ ...newUser, role: value })}
                  >
                    <SelectTrigger id="role">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddUser}>Add User</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.name}
                      {user.isMainAdmin && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                          Main Admin
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <span
                        className={`capitalize ${user.role === "admin" ? "text-blue-600" : user.role === "editor" ? "text-green-600" : "text-gray-600"}`}
                      >
                        {user.role}
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
                            Edit
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                          <DialogHeader>
                            <DialogTitle>Edit User</DialogTitle>
                            <DialogDescription>Update user information and permissions.</DialogDescription>
                          </DialogHeader>
                          {editingUser && (
                            <div className="grid gap-4 py-4">
                              <div className="grid gap-2">
                                <Label htmlFor="edit-name">Name</Label>
                                <Input
                                  id="edit-name"
                                  value={editingUser.name}
                                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label htmlFor="edit-email">Email</Label>
                                <Input
                                  id="edit-email"
                                  type="email"
                                  value={editingUser.email}
                                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label htmlFor="edit-role">Role</Label>
                                <Select
                                  value={editingUser.role}
                                  onValueChange={(value: "admin" | "editor" | "viewer") =>
                                    setEditingUser({ ...editingUser, role: value })
                                  }
                                  disabled={editingUser.isMainAdmin}
                                >
                                  <SelectTrigger id="edit-role">
                                    <SelectValue placeholder="Select a role" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="editor">Editor</SelectItem>
                                    <SelectItem value="viewer">Viewer</SelectItem>
                                  </SelectContent>
                                </Select>
                                {editingUser.isMainAdmin && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    The main admin role cannot be changed.
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
                                    Delete User
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button onClick={handleEditUser}>Save Changes</Button>
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
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the user {userToDelete?.name} and remove their access to the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
