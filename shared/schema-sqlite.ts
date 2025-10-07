import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const suppliers = sqliteTable("suppliers", {
  id: text("id").primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  createdAt: integer("created_at", { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});

export const customers = sqliteTable("customers", {
  id: text("id").primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  createdAt: integer("created_at", { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});

export const sellers = sqliteTable("sellers", {
  id: text("id").primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  name: text("name").notNull(),
  email: text("email").notNull(),
  createdAt: integer("created_at", { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});

export const products = sqliteTable("products", {
  id: text("id").primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  stockCode: text("stock_code").notNull().unique(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  buyingPrice: real("buying_price").notNull(),
  sellingPrice: real("selling_price").notNull(),
  quantity: integer("quantity").notNull().default(0),
  supplierId: text("supplier_id").references(() => suppliers.id),
  createdAt: integer("created_at", { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});

export const sales = sqliteTable("sales", {
  id: text("id").primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  receiptNumber: text("receipt_number").notNull().unique(),
  customerId: text("customer_id").references(() => customers.id).notNull(),
  sellerId: text("seller_id").references(() => sellers.id).notNull(),
  subtotal: real("subtotal").notNull(),
  discount: real("discount").notNull().default(0),
  discountType: text("discount_type").notNull().default("percentage"),
  total: real("total").notNull(),
  paymentMethod: text("payment_method").notNull(),
  createdAt: integer("created_at", { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});

export const saleItems = sqliteTable("sale_items", {
  id: text("id").primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  saleId: text("sale_id").references(() => sales.id).notNull(),
  productId: text("product_id").references(() => products.id).notNull(),
  productName: text("product_name").notNull(),
  stockCode: text("stock_code").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: real("unit_price").notNull(),
  buyingPrice: real("buying_price").notNull(),
  subtotal: real("subtotal").notNull(),
});

// Insert schemas
export const insertSupplierSchema = createInsertSchema(suppliers).omit({
  id: true,
  createdAt: true,
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
});

export const insertSellerSchema = createInsertSchema(sellers).omit({
  id: true,
  createdAt: true,
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
}).extend({
  buyingPrice: z.string(),
  sellingPrice: z.string(),
  quantity: z.number().int().min(0),
  supplierId: z.string().nullable().optional(),
});

export const insertSaleItemSchema = createInsertSchema(saleItems).omit({
  id: true,
  saleId: true,
}).extend({
  unitPrice: z.string(),
  buyingPrice: z.string(),
  subtotal: z.string(),
});

export const insertSaleSchema = createInsertSchema(sales).omit({
  id: true,
  createdAt: true,
  receiptNumber: true,
}).extend({
  subtotal: z.string(),
  discount: z.string(),
  total: z.string(),
  items: z.array(insertSaleItemSchema),
});

// Select types
export type Supplier = typeof suppliers.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type Seller = typeof sellers.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Sale = typeof sales.$inferSelect;
export type SaleItem = typeof saleItems.$inferSelect;

// Insert types
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type InsertSeller = z.infer<typeof insertSellerSchema>;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type InsertSale = z.infer<typeof insertSaleSchema>;
export type InsertSaleItem = z.infer<typeof insertSaleItemSchema>;
