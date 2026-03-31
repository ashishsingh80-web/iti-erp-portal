-- CreateTable
CREATE TABLE "AgentCollection" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "collectionDate" TIMESTAMP(3) NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "allocatedAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "unallocatedAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "paymentMode" TEXT NOT NULL,
    "referenceNo" TEXT,
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentCollectionAllocation" (
    "id" TEXT NOT NULL,
    "agentCollectionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "amountAllocated" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentCollectionAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentCollection_agentId_collectionDate_idx" ON "AgentCollection"("agentId", "collectionDate");

-- CreateIndex
CREATE INDEX "AgentCollectionAllocation_agentCollectionId_studentId_idx" ON "AgentCollectionAllocation"("agentCollectionId", "studentId");

-- AddForeignKey
ALTER TABLE "AgentCollection" ADD CONSTRAINT "AgentCollection_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentCollectionAllocation" ADD CONSTRAINT "AgentCollectionAllocation_agentCollectionId_fkey" FOREIGN KEY ("agentCollectionId") REFERENCES "AgentCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentCollectionAllocation" ADD CONSTRAINT "AgentCollectionAllocation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
