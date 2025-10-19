-- CreateEnum
CREATE TYPE "InStock" AS ENUM ('AVILABLE', 'FEWAVILABLE', 'OUTOFSTCOK');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "inStock" "InStock";
