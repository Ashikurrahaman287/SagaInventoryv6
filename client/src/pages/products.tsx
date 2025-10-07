import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ProductTable } from "@/components/product-table";
import { ProductFormDialog } from "@/components/product-form-dialog";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { SearchBar } from "@/components/search-bar";
import { Button } from "@/components/ui/button";
import { Plus, Download, Upload } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { exportToCSV } from "@/lib/export";
import { parseCSV, validateRequired, validateNumber, validateInteger } from "@/lib/import";
import type { InsertProduct, Supplier, Product } from "@shared/schema";

export default function Products() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertProduct) =>
      apiRequest("POST", "/api/products", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Product created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create product", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InsertProduct> }) =>
      apiRequest("PATCH", `/api/products/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Product updated successfully" });
      setEditingProduct(null);
    },
    onError: () => {
      toast({ title: "Failed to update product", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Product deleted successfully" });
      setDeletingProduct(null);
    },
    onError: () => {
      toast({ title: "Failed to delete product", variant: "destructive" });
    },
  });

  const handleSubmit = async (data: InsertProduct) => {
    if (editingProduct) {
      await updateMutation.mutateAsync({ id: editingProduct.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    setDeletingProduct(id);
  };

  const confirmDelete = () => {
    if (deletingProduct) {
      deleteMutation.mutate(deletingProduct);
    }
  };

  const handleExport = () => {
    exportToCSV(
      products.map(p => ({
        stockCode: p.stockCode,
        name: p.name,
        category: p.category,
        buyingPrice: p.buyingPrice,
        sellingPrice: p.sellingPrice,
        quantity: p.quantity,
        supplierId: p.supplierId || "",
      })),
      "products",
      [
        { key: "stockCode", label: "Stock Code" },
        { key: "name", label: "Product Name" },
        { key: "category", label: "Category" },
        { key: "buyingPrice", label: "Buying Price" },
        { key: "sellingPrice", label: "Selling Price" },
        { key: "quantity", label: "Quantity" },
        { key: "supplierId", label: "Supplier ID" },
      ]
    );
    toast({ title: "Products exported successfully" });
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const result = await parseCSV<InsertProduct>(
        file,
        [
          { csvHeader: "Stock Code", field: "stockCode" },
          { csvHeader: "Product Name", field: "name" },
          { csvHeader: "Category", field: "category" },
          { csvHeader: "Buying Price", field: "buyingPrice" },
          { csvHeader: "Selling Price", field: "sellingPrice" },
          { csvHeader: "Quantity", field: "quantity" },
          { csvHeader: "Supplier ID", field: "supplierId" },
        ],
        (row) => ({
          stockCode: validateRequired(row["Stock Code"], "Stock Code"),
          name: validateRequired(row["Product Name"], "Product Name"),
          category: validateRequired(row["Category"], "Category"),
          buyingPrice: validateNumber(row["Buying Price"], "Buying Price").toString(),
          sellingPrice: validateNumber(row["Selling Price"], "Selling Price").toString(),
          quantity: validateInteger(row["Quantity"], "Quantity"),
          supplierId: row["Supplier ID"]?.trim() || null,
        })
      );

      if (result.errors.length > 0) {
        toast({
          title: "Import errors",
          description: result.errors.slice(0, 3).join(", "),
          variant: "destructive",
        });
        return;
      }

      // Import products one by one
      let successCount = 0;
      let failCount = 0;
      for (const product of result.data) {
        try {
          await apiRequest("POST", "/api/products", product);
          successCount++;
        } catch (error) {
          failCount++;
        }
      }

      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Import complete",
        description: `${successCount} products imported successfully${failCount > 0 ? `, ${failCount} failed` : ""}`,
      });
    } catch (error) {
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.stockCode.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === "all" || product.category === category;
    return matchesSearch && matchesCategory;
  });

  const categories = ["all", ...Array.from(new Set(products.map(p => p.category)))];

  if (isLoading) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="text-muted-foreground">Manage your product inventory</p>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
            data-testid="input-import-file"
          />
          <Button 
            variant="outline" 
            onClick={handleImportClick} 
            disabled={isImporting}
            data-testid="button-import-products"
          >
            <Upload className="mr-2 h-4 w-4" />
            {isImporting ? "Importing..." : "Import CSV"}
          </Button>
          <Button variant="outline" onClick={handleExport} data-testid="button-export-products">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={() => setIsFormOpen(true)} data-testid="button-add-product">
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <SearchBar
            placeholder="Search by name or stock code..."
            value={search}
            onChange={setSearch}
            testId="input-search-products"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-48" data-testid="select-category">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat === "all" ? "All Categories" : cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ProductTable
        products={filteredProducts}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <ProductFormDialog
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setEditingProduct(null);
        }}
        product={editingProduct || undefined}
        suppliers={suppliers}
        onSubmit={handleSubmit}
      />

      <DeleteConfirmDialog
        open={!!deletingProduct}
        onOpenChange={(open) => !open && setDeletingProduct(null)}
        onConfirm={confirmDelete}
        title="Delete Product"
        description="Are you sure you want to delete this product? This action cannot be undone."
      />
    </div>
  );
}
