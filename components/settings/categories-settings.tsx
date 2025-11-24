"use client";


import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useOrganization } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Edit2, Trash2, Save, XCircle, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import LoaderOne from "@/components/ui/loader-one";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ColorPicker } from "@/components/settings/color-picker";

interface Category {
  id: string;
  name: string;
  color: string;
  isSystemCategory?: boolean;
  isDeletable: boolean;
  isHidden?: boolean;
}

interface PaymentMethod {
  id: string;
  name: string;
  color: string;
  isSystemMethod?: boolean;
  isDeletable: boolean;
  isHidden?: boolean;
}

export function CategoriesSettings() {
  const { t } = useTranslation();
  const { organization } = useOrganization();

  // Helper function to translate system categories
  const getTranslatedName = (name: string, type: 'expense' | 'payment'): string => {
    const key = type === 'expense'
      ? `settings:systemCategories.expenseCategories.${name}`
      : `settings:systemCategories.paymentMethods.${name}`;
    const translated = t(key, name);
    // If translation returns the key itself, it means no translation exists (user-created category)
    return translated === key ? name : translated;
  };

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organization?.id]);

  const fetchCategories = async () => {
    try {
      const response = await fetch(`/api/churches/${organization?.id}/expense-categories?includeHidden=true`);
      if (response.ok) {
        const data = await response.json();
        setExpenseCategories(data);
      }
    } catch {
      console.error('Error fetching expense categories:', { operation: 'ui.error' }, error instanceof Error ? error : new Error(String(error)));
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      const response = await fetch(`/api/churches/${organization?.id}/donation-payment-methods?includeHidden=true`);
      if (response.ok) {
        const data = await response.json();
        setPaymentMethods(data);
      }
    } catch {
      console.error('Error fetching payment methods:', { operation: 'ui.error' }, error instanceof Error ? error : new Error(String(error)));
    }
  };

  const handleAddExpenseCategory = async () => {
    if (!newExpenseName.trim()) {
      toast.error(t("settings:categories.nameRequired", "Name is required"));
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
        toast.success(t("settings:categories.categoryAdded", "Category added successfully"));
        setNewExpenseName("");
        setNewExpenseColor("#6B7280");
        setIsAddExpenseOpen(false);
        fetchCategories();
      } else {
        throw new Error("Failed to add category");
      }
    } catch {
      toast.error(t("settings:categories.failedToAddCategory", "Failed to add category"));
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
        toast.success(t("settings:categories.categoryUpdated", "Category updated successfully"));
        setEditingExpense(null);
        fetchCategories();
      } else {
        throw new Error("Failed to update category");
      }
    } catch {
      toast.error(t("settings:categories.failedToUpdateCategory", "Failed to update category"));
    }
  };

  const handleDeleteExpenseCategory = async (categoryId: string) => {
    try {
      const response = await fetch(
        `/api/churches/${organization?.id}/expense-categories/${categoryId}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        toast.success(t("settings:categories.categoryDeleted", "Category deleted successfully"));
        fetchCategories();
      } else {
        const data = await response.json();
        // Check if category is in use
        if (data.inUse) {
          toast.error(t("settings:categories.categoryInUse", "Cannot delete category that is currently in use by expenses. Hide it instead to prevent future use."));
        } else {
          throw new Error(data.error || "Failed to delete category");
        }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }
    } catch (error: any) {
      toast.error(error.message || t("settings:categories.failedToDeleteCategory", "Failed to delete category"));
    }
  };

  const handleToggleHideExpenseCategory = async (categoryId: string, currentlyHidden: boolean) => {
    try {
      const response = await fetch(
        `/api/churches/${organization?.id}/expense-categories/${categoryId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isHidden: !currentlyHidden }),
        }
      );

      if (response.ok) {
        toast.success(
          currentlyHidden
            ? t("settings:categories.categoryShown", "Category shown successfully")
            : t("settings:categories.categoryHidden", "Category hidden successfully")
        );
        fetchCategories();
      } else {
        throw new Error("Failed to toggle category visibility");
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t("settings:categories.failedToToggleCategory", "Failed to toggle category"));
    }
  };

  const handleToggleHidePaymentMethod = async (methodId: string, currentlyHidden: boolean) => {
    try {
      const response = await fetch(
        `/api/churches/${organization?.id}/donation-payment-methods/${methodId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isHidden: !currentlyHidden }),
        }
      );

      if (response.ok) {
        toast.success(
          currentlyHidden
            ? t("settings:categories.paymentMethodShown", "Payment method shown successfully")
            : t("settings:categories.paymentMethodHidden", "Payment method hidden successfully")
        );
        fetchPaymentMethods();
      } else {
        throw new Error("Failed to toggle payment method visibility");
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t("settings:categories.failedToTogglePaymentMethod", "Failed to toggle donation method"));
    }
  };

  const handleAddPaymentMethod = async () => {
    if (!newPaymentMethodName.trim()) {
      toast.error(t("settings:categories.nameRequired", "Name is required"));
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
        toast.success(t("settings:categories.paymentMethodAdded", "Payment method added successfully"));
        setNewPaymentMethodName("");
        setNewPaymentMethodColor("#10B981");
        setIsAddPaymentMethodOpen(false);
        fetchPaymentMethods();
      } else {
        throw new Error("Failed to add payment method");
      }
    } catch {
      toast.error(t("settings:categories.failedToAddPaymentMethod", "Failed to add donation method"));
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
        toast.success(t("settings:categories.paymentMethodUpdated", "Payment method updated successfully"));
        setEditingPaymentMethod(null);
        fetchPaymentMethods();
      } else {
        throw new Error("Failed to update payment method");
      }
    } catch {
      toast.error(t("settings:categories.failedToUpdatePaymentMethod", "Failed to update donation method"));
    }
  };

  const handleDeletePaymentMethod = async (methodId: string) => {
    try {
      const response = await fetch(
        `/api/churches/${organization?.id}/donation-payment-methods/${methodId}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        toast.success(t("settings:categories.paymentMethodDeleted", "Payment method deleted successfully"));
        fetchPaymentMethods();
      } else {
        const data = await response.json();
        // Check if payment method is in use
        if (data.inUse) {
          toast.error(t("settings:categories.paymentMethodInUse", "Cannot delete donation method that is currently in use by donations. Hide it instead to prevent future use."));
        } else {
          throw new Error(data.error || "Failed to delete payment method");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }
      }
    } catch (error: any) {
      toast.error(error.message || t("settings:categories.failedToDeletePaymentMethod", "Failed to delete donation method"));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoaderOne />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Expense Categories */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("settings:categories.expenseCategories", "Expense Categories")}</CardTitle>
            </div>
            <Dialog open={isAddExpenseOpen} onOpenChange={setIsAddExpenseOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("settings:categories.addExpenseCategory", "Add Expense Category")}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="expense-name">{t("settings:categories.name", "Name")}</Label>
                    <Input
                      id="expense-name"
                      value={newExpenseName}
                      onChange={(e) => setNewExpenseName(e.target.value)}
                      placeholder={t("settings:categories.namePlaceholder", "e.g., Office Supplies")}
                    />
                  </div>
                  <ColorPicker
                    label={t("settings:categories.color", "Color")}
                    color={newExpenseColor}
                    onChange={setNewExpenseColor}
                  />
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
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 dark:border-gray-700"
              >
                {editingExpense?.id === category.id ? (
                  <div className="flex items-center gap-3 flex-1">
                    <Input
                      value={
                        editingExpense.isSystemCategory || !editingExpense.isDeletable
                          ? getTranslatedName(editingExpense.name, 'expense')
                          : editingExpense.name
                      }
                      onChange={(e) =>
                        setEditingExpense({ ...editingExpense, name: e.target.value })
                      }
                      className="flex-1"
                      disabled={editingExpense.isSystemCategory || !editingExpense.isDeletable}
                    />
                    <ColorPicker
                      color={editingExpense.color}
                      onChange={(color) =>
                        setEditingExpense({ ...editingExpense, color })
                      }
                    />
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
                        className="w-8 h-8 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="font-medium">{getTranslatedName(category.name, 'expense')}</span>
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
                      {category.isSystemCategory || !category.isDeletable ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggleHideExpenseCategory(category.id, category.isHidden || false)}
                          title={category.isHidden ? t("settings:categories.show", "Show") : t("settings:categories.hide", "Hide")}
                        >
                          {category.isHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </Button>
                      ) : (
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
            </div>
            <Dialog open={isAddPaymentMethodOpen} onOpenChange={setIsAddPaymentMethodOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("settings:categories.addPaymentMethod", "Add Donation Method")}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="payment-method-name">{t("settings:categories.name", "Name")}</Label>
                    <Input
                      id="payment-method-name"
                      value={newPaymentMethodName}
                      onChange={(e) => setNewPaymentMethodName(e.target.value)}
                      placeholder={t("settings:categories.paymentMethodNamePlaceholder", "e.g., Zelle, Cash, Check")}
                    />
                  </div>
                  <ColorPicker
                    label={t("settings:categories.color", "Color")}
                    color={newPaymentMethodColor}
                    onChange={setNewPaymentMethodColor}
                  />
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
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 dark:border-gray-700"
              >
                {editingPaymentMethod?.id === paymentMethod.id ? (
                  <div className="flex items-center gap-3 flex-1">
                    <Input
                      value={
                        editingPaymentMethod.isSystemMethod || !editingPaymentMethod.isDeletable
                          ? getTranslatedName(editingPaymentMethod.name, 'payment')
                          : editingPaymentMethod.name
                      }
                      onChange={(e) =>
                        setEditingPaymentMethod({ ...editingPaymentMethod, name: e.target.value })
                      }
                      className="flex-1"
                      disabled={editingPaymentMethod.isSystemMethod || !editingPaymentMethod.isDeletable}
                    />
                    <ColorPicker
                      color={editingPaymentMethod.color}
                      onChange={(color) =>
                        setEditingPaymentMethod({ ...editingPaymentMethod, color })
                      }
                    />
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
                        className="w-8 h-8 rounded-full"
                        style={{ backgroundColor: paymentMethod.color }}
                      />
                      <span className="font-medium">{getTranslatedName(paymentMethod.name, 'payment')}</span>
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
                      {paymentMethod.isSystemMethod || !paymentMethod.isDeletable ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggleHidePaymentMethod(paymentMethod.id, paymentMethod.isHidden || false)}
                          title={paymentMethod.isHidden ? t("settings:categories.show", "Show") : t("settings:categories.hide", "Hide")}
                        >
                          {paymentMethod.isHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </Button>
                      ) : (
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
