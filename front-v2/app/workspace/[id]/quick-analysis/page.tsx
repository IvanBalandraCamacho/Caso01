"use client";

import React, { use } from "react";
import { CopilotKit } from "@copilotkit/react-core";
import ProposalWorkbench from "@/components/proposal/ProposalWorkbench";

export default function AnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <CopilotKit 
      runtimeUrl="/api/copilotkit"
      showDevConsole={false}
      properties={{ workspace_id: id, workspaceId: id }}
    >
      <div className="h-screen w-screen">
        <ProposalWorkbench workspaceId={id} />
      </div>
    </CopilotKit>
  );
}