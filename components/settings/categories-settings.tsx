"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useOrganization } from "@clerk/nextjs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Edit2, Trash2, Save, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Category {
  id: string;
  name: string;
  color: string;
  isSystemCategory?: boolean;
  isDeletable: boolean;
}

interface PaymentMethod {
  id: string;
  name: string;
  color: string;
  isSystemMethod?: boolean;
  isDeletable: boolean;
}

const COLOR_PRESETS = [
  { name: "Red", value: "#EF4444" },
  { name: "Orange", value: "#F97316" },
  { name: "Amber", value: "#F59E0B" },
  { name: "Yellow", value: "#EAB308" },
  { name: "Lime", value: "#84CC16" },
  { name: "Green", value: "#10B981" },
  { name: "Emerald", value: "#059669" },
  { name: "Teal", value: "#14B8A6" },
  { name: "Cyan", value: "#06B6D4" },
  { name: "Sky", value: "#0EA5E9" },
  { name: "Blue", value: "#3B82F6" },
  { name: "Indigo", value: "#6366F1" },
  { name: "Violet", value: "#8B5CF6" },
  { name: "Purple", value: "#A855F7" },
  { name: "Fuchsia", value: "#D946EF" },
  { name: "Pink", value: "#EC4899" },
  { name: "Rose", value: "#F43F5E" },
  { name: "Gray", value: "#6B7280" },
];

export function CategoriesSettings() {
  const { t } = useTranslation();
  const { organization } = useOrganization();
  const { toast } = useToast();

  const [expenseCategories, setExpenseCategories] = useState<Category[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);

  // For adding new items
  const [newExpenseName, setNewExpenseName] = useState("");
  const [newExpenseColor, setNewExpenseColor] = useState("#6B7280");
  const [newPaymentMethodName, setNewPaymentMethodName] = useState("");
  const [newPaymentMethodColor, setNewPaymentMethodColor] = useState("#10B981");

  // For editing items
  const [editingExpense, setEditingExpense] = useState<Category | null>(null);
  const [editingPaymentMethod, setEditingPaymentMethod] = useState<PaymentMethod | null>(null);

  // Dialogs
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isAddPaymentMethodOpen, setIsAddPaymentMethodOpen] = useState(false);

  useEffect(() => {
    if (organization?.id) {
      fetchCategories();
      fetchPaymentMethods();
    }
  }, [organization?.id]);

  const fetchCategories = async () => {
    try {
      const response = await fetch(`/api/churches/${organization?.id}/expense-categories`);
      if (response.ok) {
        const data = await response.json();
        setExpenseCategories(data);
      }
    } catch (error) {
      console.error("Error fetching expense categories:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      const response = await fetch(`/api/churches/${organization?.id}/donation-payment-methods`);
      if (response.ok) {
        const data = await response.json();
        setPaymentMethods(data);
      }
    } catch (error) {
      console.error("Error fetching payment methods:", error);
    }
  };

  const handleAddExpenseCategory = async () => {
    if (!newExpenseName.trim()) {
      toast({
        title: t("settings:categories.error", "Error"),
        description: t("settings:categories.nameRequired", "Name is required"),
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(`/api/churches/${organization?.id}/expense-categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newExpenseName,
          color: newExpenseColor,
        }),
      });

      if (response.ok) {
        toast({
          title: t("settings:categories.success", "Success"),
          description: t("settings:categories.categoryAdded", "Category added successfully"),
        });
        setNewExpenseName("");
        setNewExpenseColor("#6B7280");
        setIsAddExpenseOpen(false);
        fetchCategories();
      } else {
        throw new Error("Failed to add category");
      }
    } catch (error) {
      toast({
        title: t("settings:categories.error", "Error"),
        description: t("settings:categories.failedToAdd", "Failed to add category"),
        variant: "destructive",
      });
    }
  };

  const handleUpdateExpenseCategory = async (category: Category) => {
    try {
      const response = await fetch(
        `/api/churches/${organization?.id}/expense-categories/${category.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: category.name,
            color: category.color,
          }),
        }
      );

      if (response.ok) {
        toast({
          title: t("settings:categories.success", "Success"),
          description: t("settings:categories.categoryUpdated", "Category updated successfully"),
        });
        setEditingExpense(null);
        fetchCategories();
      } else {
        throw new Error("Failed to update category");
      }
    } catch (error) {
      toast({
        title: t("settings:categories.error", "Error"),
        description: t("settings:categories.failedToUpdate", "Failed to update category"),
        variant: "destructive",
      });
    }
  };

  const handleDeleteExpenseCategory = async (categoryId: string) => {
    try {
      const response = await fetch(
        `/api/churches/${organization?.id}/expense-categories/${categoryId}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        toast({
          title: t("settings:categories.success", "Success"),
          description: t("settings:categories.categoryDeleted", "Category deleted successfully"),
        });
        fetchCategories();
      } else {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete category");
      }
    } catch (error: any) {
      toast({
        title: t("settings:categories.error", "Error"),
        description: error.message || t("settings:categories.failedToDelete", "Failed to delete category"),
        variant: "destructive",
      });
    }
  };

  const handleAddPaymentMethod = async () => {
    if (!newPaymentMethodName.trim()) {
      toast({
        title: t("settings:categories.error", "Error"),
        description: t("settings:categories.nameRequired", "Name is required"),
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(`/api/churches/${organization?.id}/donation-payment-methods`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newPaymentMethodName,
          color: newPaymentMethodColor,
        }),
      });

      if (response.ok) {
        toast({
          title: t("settings:categories.success", "Success"),
          description: t("settings:categories.paymentMethodAdded", "Payment method added successfully"),
        });
        setNewPaymentMethodName("");
        setNewPaymentMethodColor("#10B981");
        setIsAddPaymentMethodOpen(false);
        fetchPaymentMethods();
      } else {
        throw new Error("Failed to add payment method");
      }
    } catch (error) {
      toast({
        title: t("settings:categories.error", "Error"),
        description: t("settings:categories.failedToAdd", "Failed to add payment method"),
        variant: "destructive",
      });
    }
  };

  const handleUpdatePaymentMethod = async (paymentMethod: PaymentMethod) => {
    try {
      const response = await fetch(
        `/api/churches/${organization?.id}/donation-payment-methods/${paymentMethod.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: paymentMethod.name,
            color: paymentMethod.color,
          }),
        }
      );

      if (response.ok) {
        toast({
          title: t("settings:categories.success", "Success"),
          description: t("settings:categories.paymentMethodUpdated", "Payment method updated successfully"),
        });
        setEditingPaymentMethod(null);
        fetchPaymentMethods();
      } else {
        throw new Error("Failed to update payment method");
      }
    } catch (error) {
      toast({
        title: t("settings:categories.error", "Error"),
        description: t("settings:categories.failedToUpdate", "Failed to update payment method"),
        variant: "destructive",
      });
    }
  };

  const handleDeletePaymentMethod = async (methodId: string) => {
    try {
      const response = await fetch(
        `/api/churches/${organization?.id}/donation-payment-methods/${methodId}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        toast({
          title: t("settings:categories.success", "Success"),
          description: t("settings:categories.paymentMethodDeleted", "Payment method deleted successfully"),
        });
        fetchPaymentMethods();
      } else {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete payment method");
      }
    } catch (error: any) {
      toast({
        title: t("settings:categories.error", "Error"),
        description: error.message || t("settings:categories.failedToDelete", "Failed to delete payment method"),
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Expense Categories */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("settings:categories.expenseCategories", "Expense Categories")}</CardTitle>
              <CardDescription>
                {t("settings:categories.expenseCategoriesDesc", "Manage categories for tracking expenses")}
              </CardDescription>
            </div>
            <Dialog open={isAddExpenseOpen} onOpenChange={setIsAddExpenseOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  {t("settings:categories.add", "Add")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("settings:categories.addExpenseCategory", "Add Expense Category")}</DialogTitle>
                  <DialogDescription>
                    {t("settings:categories.addExpenseCategoryDesc", "Create a new category for expenses")}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="expense-name">{t("settings:categories.name", "Name")}</Label>
                    <Input
                      id="expense-name"
                      value={newExpenseName}
                      onChange={(e) => setNewExpenseName(e.target.value)}
                      placeholder={t("settings:categories.namePlaceholder", "e.g., Office Supplies")}
                    />
                  </div>
                  <div>
                    <Label>{t("settings:categories.color", "Color")}</Label>
                    <div className="grid grid-cols-6 gap-2 mt-2">
                      {COLOR_PRESETS.map((preset) => (
                        <button
                          key={preset.value}
                          className={`w-10 h-10 rounded-md border-2 ${
                            newExpenseColor === preset.value ? "border-black" : "border-gray-200"
                          }`}
                          style={{ backgroundColor: preset.value }}
                          onClick={() => setNewExpenseColor(preset.value)}
                          title={preset.name}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddExpenseOpen(false)}>
                    {t("common:cancel", "Cancel")}
                  </Button>
                  <Button onClick={handleAddExpenseCategory}>
                    {t("settings:categories.add", "Add")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {expenseCategories.map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
              >
                {editingExpense?.id === category.id ? (
                  <div className="flex items-center gap-3 flex-1">
                    <Input
                      value={editingExpense.name}
                      onChange={(e) =>
                        setEditingExpense({ ...editingExpense, name: e.target.value })
                      }
                      className="flex-1"
                    />
                    <div className="grid grid-cols-6 gap-1">
                      {COLOR_PRESETS.slice(0, 6).map((preset) => (
                        <button
                          key={preset.value}
                          className={`w-6 h-6 rounded border ${
                            editingExpense.color === preset.value ? "border-black border-2" : "border-gray-200"
                          }`}
                          style={{ backgroundColor: preset.value }}
                          onClick={() =>
                            setEditingExpense({ ...editingExpense, color: preset.value })
                          }
                        />
                      ))}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleUpdateExpenseCategory(editingExpense)}
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingExpense(null)}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-md"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="font-medium">{category.name}</span>
                      {(category.isSystemCategory || !category.isDeletable) && (
                        <Badge variant="secondary" className="text-xs">
                          {t("settings:categories.system", "System")}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingExpense(category)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      {category.isDeletable && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteExpenseCategory(category.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Donation Payment Methods */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("settings:categories.paymentMethods", "Donation Payment Methods")}</CardTitle>
              <CardDescription>
                {t("settings:categories.paymentMethodsDesc", "Manage payment methods for manual donation entry")}
              </CardDescription>
            </div>
            <Dialog open={isAddPaymentMethodOpen} onOpenChange={setIsAddPaymentMethodOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  {t("settings:categories.add", "Add")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("settings:categories.addPaymentMethod", "Add Payment Method")}</DialogTitle>
                  <DialogDescription>
                    {t("settings:categories.addPaymentMethodDesc", "Create a new payment method for donations")}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="payment-method-name">{t("settings:categories.name", "Name")}</Label>
                    <Input
                      id="payment-method-name"
                      value={newPaymentMethodName}
                      onChange={(e) => setNewPaymentMethodName(e.target.value)}
                      placeholder={t("settings:categories.paymentMethodNamePlaceholder", "e.g., Zelle, Cash, Check")}
                    />
                  </div>
                  <div>
                    <Label>{t("settings:categories.color", "Color")}</Label>
                    <div className="grid grid-cols-6 gap-2 mt-2">
                      {COLOR_PRESETS.map((preset) => (
                        <button
                          key={preset.value}
                          className={`w-10 h-10 rounded-md border-2 ${
                            newPaymentMethodColor === preset.value ? "border-black" : "border-gray-200"
                          }`}
                          style={{ backgroundColor: preset.value }}
                          onClick={() => setNewPaymentMethodColor(preset.value)}
                          title={preset.name}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddPaymentMethodOpen(false)}>
                    {t("common:cancel", "Cancel")}
                  </Button>
                  <Button onClick={handleAddPaymentMethod}>
                    {t("settings:categories.add", "Add")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {paymentMethods.map((paymentMethod) => (
              <div
                key={paymentMethod.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
              >
                {editingPaymentMethod?.id === paymentMethod.id ? (
                  <div className="flex items-center gap-3 flex-1">
                    <Input
                      value={editingPaymentMethod.name}
                      onChange={(e) =>
                        setEditingPaymentMethod({ ...editingPaymentMethod, name: e.target.value })
                      }
                      className="flex-1"
                    />
                    <div className="grid grid-cols-6 gap-1">
                      {COLOR_PRESETS.slice(0, 6).map((preset) => (
                        <button
                          key={preset.value}
                          className={`w-6 h-6 rounded border ${
                            editingPaymentMethod.color === preset.value ? "border-black border-2" : "border-gray-200"
                          }`}
                          style={{ backgroundColor: preset.value }}
                          onClick={() =>
                            setEditingPaymentMethod({ ...editingPaymentMethod, color: preset.value })
                          }
                        />
                      ))}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleUpdatePaymentMethod(editingPaymentMethod)}
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingPaymentMethod(null)}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-md"
                        style={{ backgroundColor: paymentMethod.color }}
                      />
                      <span className="font-medium">{paymentMethod.name}</span>
                      {(paymentMethod.isSystemMethod || !paymentMethod.isDeletable) && (
                        <Badge variant="secondary" className="text-xs">
                          {t("settings:categories.system", "System")}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingPaymentMethod(paymentMethod)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      {paymentMethod.isDeletable && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeletePaymentMethod(paymentMethod.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
