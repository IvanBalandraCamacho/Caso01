"use client";

import React, { use } from "react";
import ProposalWorkbench from "@/components/proposal/ProposalWorkbench";

export default function AnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <div className="h-screen w-screen">
      <ProposalWorkbench workspaceId={id} />
    </div>
  );
}