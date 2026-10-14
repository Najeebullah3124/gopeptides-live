-- CreateTable
CREATE TABLE "LabelVariant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "dosage" TEXT NOT NULL,
    "batchNumber" TEXT,
    "storageUnopened" TEXT,
    "storageReconstituted" TEXT,
    "storageNote" TEXT,
    "shelfLifeDate" TEXT,
    "languageDefault" TEXT NOT NULL DEFAULT 'nl',
    "labelWidthMm" INTEGER NOT NULL DEFAULT 40,
    "labelHeightMm" INTEGER NOT NULL DEFAULT 20,
    "qrMode" TEXT NOT NULL DEFAULT 'auto',
    "manualQrUrl" TEXT,
    "csvQrUrl" TEXT,
    "imageFileName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LabelVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LabelAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "labelVariantId" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "widthPx" INTEGER NOT NULL,
    "heightPx" INTEGER NOT NULL,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LabelAsset_labelVariantId_fkey" FOREIGN KEY ("labelVariantId") REFERENCES "LabelVariant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LabelPrintLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "labelVariantId" TEXT NOT NULL,
    "printedByUserId" TEXT,
    "printerTarget" TEXT,
    "printerProfile" TEXT NOT NULL,
    "copies" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LabelPrintLog_labelVariantId_fkey" FOREIGN KEY ("labelVariantId") REFERENCES "LabelVariant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "LabelVariant_productId_dosage_key" ON "LabelVariant"("productId", "dosage");

-- CreateIndex
CREATE INDEX "LabelVariant_productId_idx" ON "LabelVariant"("productId");

-- CreateIndex
CREATE INDEX "LabelAsset_labelVariantId_generatedAt_idx" ON "LabelAsset"("labelVariantId", "generatedAt");

-- CreateIndex
CREATE INDEX "LabelPrintLog_labelVariantId_createdAt_idx" ON "LabelPrintLog"("labelVariantId", "createdAt");

