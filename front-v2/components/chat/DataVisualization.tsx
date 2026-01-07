"use client";

import { Table, Card, Tag, Button, Space, Tooltip, Empty } from "antd";
import {
  DownloadOutlined,
  CopyOutlined,
  ExpandOutlined,
  TableOutlined,
} from "@ant-design/icons";
import { Toast } from "@/components/Toast";

interface DataVisualizationProps {
  title: string;
  data: any[];
  columns: string[];
  type: 'table' | 'summary' | 'comparison';
  onExport?: (format: 'csv' | 'json') => void;
}

export function DataVisualization({
  title,
  data,
  columns,
  type,
  onExport,
}: DataVisualizationProps) {
  if (!data || data.length === 0) {
    return (
      <Card title={title} className="bg-zinc-900/40 border-zinc-800">
        <Empty description="No hay datos disponibles" />
      </Card>
    );
  }

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    Toast.success("Datos copiados al portapapeles");
  };

  const handleExportCSV = () => {
    const headers = columns.join(',');
    const rows = data.map(row => 
      columns.map(col => `"${row[col.toLowerCase()] || ''}"`).join(',')
    ).join('\n');
    
    const csv = `${headers}\n${rows}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_')}.csv`;
    a.click();
    Toast.success("CSV descargado");
  };

  const tableColumns = columns.map(col => ({
    title: col,
    dataIndex: col.toLowerCase(),
    key: col,
    render: (text: any) => {
      if (typeof text === 'boolean') {
        return text ? <Tag color="green">Sí</Tag> : <Tag color="red">No</Tag>;
      }
      if (Array.isArray(text)) {
        return (
          <Space wrap size={[4, 4]}>
            {text.map((item, i) => (
              <Tag key={i} color="blue">{item}</Tag>
            ))}
          </Space>
        );
      }
      if (text === 'ALTO' || text === 'ALTA' || text === 'CRÍTICO') {
        return <Tag color="red">{text}</Tag>;
      }
      if (text === 'MEDIO' || text === 'MEDIA' || text === 'IMPORTANTE') {
        return <Tag color="orange">{text}</Tag>;
      }
      if (text === 'BAJO' || text === 'BAJA' || text === 'NORMAL') {
        return <Tag color="green">{text}</Tag>;
      }
      return text;
    },
  }));

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <TableOutlined className="text-[#E31837]" />
          <span>{title}</span>
          <Tag color="blue">{data.length} registros</Tag>
        </div>
      }
      extra={
        <Space>
          <Tooltip title="Copiar JSON">
            <Button
              type="text"
              icon={<CopyOutlined />}
              onClick={handleCopyToClipboard}
            />
          </Tooltip>
          <Tooltip title="Exportar CSV">
            <Button
              type="text"
              icon={<DownloadOutlined />}
              onClick={handleExportCSV}
            />
          </Tooltip>
        </Space>
      }
      className="bg-zinc-900/40 border-zinc-800"
    >
      <Table
        dataSource={data.map((d, i) => ({ ...d, key: i }))}
        columns={tableColumns}
        size="small"
        pagination={data.length > 10 ? { pageSize: 10 } : false}
        scroll={{ x: 'max-content' }}
        className="dark-table"
      />
    </Card>
  );
}
