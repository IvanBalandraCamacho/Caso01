"use client";

import React, { use, useEffect, useState } from "react";
import ProposalWorkbench from "@/components/proposal/ProposalWorkbench";
import { fetchWorkspaceDetails } from "@/lib/api";
import { Spin } from "antd";

export default function ProposalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [initialData, setInitialData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const workspace = await fetchWorkspaceDetails(id);
        
        let data = null;
        
        // 1. Try to get full analysis from instructions (JSON)
        if (workspace.instructions) {
            try {
                const parsed = JSON.parse(workspace.instructions);
                // Check if it looks like our analysis object
                if (parsed.cliente || parsed.empresa_cliente) {
                    data = parsed;
                }
            } catch (e) {
                console.warn("Could not parse workspace instructions as JSON", e);
            }
        }

        // 2. Fallback/Augment with strategic fields if structured data is missing
        if (!data) {
             data = {
                 empresa_cliente: workspace.client_company,
                 pais: workspace.country,
                 tvt: workspace.tvt,
                 nombre_operacion: workspace.operation_name,
                 stack_tecnologico: Array.isArray(workspace.tech_stack) ? workspace.tech_stack.join(", ") : workspace.tech_stack,
                 oportunidad: workspace.opportunity_type,
                 precio: workspace.estimated_price,
                 tiempo_aproximado: workspace.estimated_time,
                 nro_recursos: workspace.resource_count,
                 categoria: workspace.category,
                 objetivo: workspace.objective
             };
        }
        
        setInitialData(data);
      } catch (error) {
        console.error("Error loading workspace data", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  if (loading) {
      return (
        <div className="h-screen w-full flex items-center justify-center bg-[#131314]">
            <Spin size="large" tip="Cargando entorno de trabajo..." />
        </div>
      );
  }

  return <ProposalWorkbench workspaceId={id} initialData={initialData} />;
}
