-- AlterTable: Add imagenes column to Producto
ALTER TABLE "Producto" ADD COLUMN IF NOT EXISTS "imagenes" TEXT[] DEFAULT ARRAY[]::TEXT[];
