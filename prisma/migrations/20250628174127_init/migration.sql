/*
  Warnings:

  - The `variant_id` column on the `OrderItem` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `ProductVariant` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[id]` on the table `ProductVariant` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_variant_id_fkey";

-- AlterTable
ALTER TABLE "OrderItem" DROP COLUMN "variant_id",
ADD COLUMN     "variant_id" INTEGER;

-- AlterTable
ALTER TABLE "ProductVariant" DROP CONSTRAINT "ProductVariant_pkey",
ADD COLUMN     "variant_id" SERIAL NOT NULL,
ADD CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("variant_id");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_id_key" ON "ProductVariant"("id");

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "ProductVariant"("variant_id") ON DELETE SET NULL ON UPDATE CASCADE;
