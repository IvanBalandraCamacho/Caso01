"use client";

import { useCopilotContext } from "@copilotkit/react-core";
import { Tag, Tooltip } from "antd";
import { RobotOutlined, LoadingOutlined, CheckCircleOutlined } from "@ant-design/icons";

export function CopilotStatus() {
  const { isLoading } = useCopilotContext();

  return (
    <Tooltip title={isLoading ? "El copiloto está pensando..." : "Copiloto listo"}>
      <Tag
        icon={isLoading ? <LoadingOutlined spin /> : <RobotOutlined />}
        color={isLoading ? "processing" : "success"}
        className="cursor-pointer"
      >
        {isLoading ? "Analizando..." : "Copiloto Activo"}
      </Tag>
    </Tooltip>
  );
}
