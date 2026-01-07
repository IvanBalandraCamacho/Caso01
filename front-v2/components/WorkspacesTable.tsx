"use client"

import React, { useState } from 'react'
import { Table, Tag, Space, Input, Button } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { SearchOutlined, FilterOutlined } from '@ant-design/icons'
import { useWorkspaces } from '@/hooks/useWorkspaces'
import { WorkspacePublic } from '@/types/api'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export const WorkspacesTable: React.FC = () => {
  const { data: workspaces, isLoading } = useWorkspaces()
  const [searchText, setSearchText] = useState('')

  const columns: ColumnsType<WorkspacePublic> = [
    {
      title: 'Operación',
      dataIndex: 'operation_name',
      key: 'operation_name',
      render: (text, record) => text || record.name,
      sorter: (a, b) => (a.operation_name || a.name).localeCompare(b.operation_name || b.name),
      fixed: 'left',
      width: 180,
    },
    {
      title: 'Cliente',
      dataIndex: 'client_company',
      key: 'client_company',
      sorter: (a, b) => (a.client_company || '').localeCompare(b.client_company || ''),
      width: 150,
    },
    {
      title: 'País',
      dataIndex: 'country',
      key: 'country',
      width: 100,
      filters: [
        { text: 'Brasil', value: 'Brasil' },
        { text: 'Chile', value: 'Chile' },
        { text: 'Colombia', value: 'Colombia' },
        { text: 'México', value: 'México' },
        { text: 'Panamá', value: 'Panamá' },
        { text: 'Perú', value: 'Perú' },
      ],
      onFilter: (value, record) => record.country === value,
    },
    {
      title: 'TVT (USD)',
      dataIndex: 'tvt',
      key: 'tvt',
      width: 120,
      render: (value) => value ? `$${value.toLocaleString()}` : '-',
      sorter: (a, b) => (a.tvt || 0) - (b.tvt || 0),
    },
    {
      title: 'Stack',
      dataIndex: 'tech_stack',
      key: 'tech_stack',
      width: 180,
      render: (stack: string[] | null) => {
        if (!stack || stack.length === 0) return '-';
        const displayStack = stack.slice(0, 3);
        const remaining = stack.length - 3;
        return (
          <Space size={[0, 4]} wrap>
            {displayStack.map((tech, i) => (
              <Tag key={i} color="blue" className="text-xs">{tech}</Tag>
            ))}
            {remaining > 0 && <Tag color="default">+{remaining}</Tag>}
          </Space>
        );
      },
    },
    {
      title: 'Tipo',
      dataIndex: 'opportunity_type',
      key: 'opportunity_type',
      width: 100,
      render: (type) => {
        let color = 'default'
        if (type === 'RFP') color = 'volcano'
        if (type === 'RFI') color = 'geekblue'
        if (type === 'Intención de Compra') color = 'green'
        return <Tag color={color}>{type || 'N/A'}</Tag>
      },
      filters: [
        { text: 'RFP', value: 'RFP' },
        { text: 'RFI', value: 'RFI' },
        { text: 'Intención de Compra', value: 'Intención de Compra' },
      ],
      onFilter: (value, record) => record.opportunity_type === value,
    },
    {
      title: 'Tiempo',
      dataIndex: 'estimated_time',
      key: 'estimated_time',
      width: 100,
      render: (time) => time || '-',
    },
    {
      title: 'Personas',
      dataIndex: 'resource_count',
      key: 'resource_count',
      width: 90,
      render: (count) => count ? `${count} pers.` : '-',
      sorter: (a, b) => (a.resource_count || 0) - (b.resource_count || 0),
    },
    {
      title: 'Categoría',
      dataIndex: 'category',
      key: 'category',
      width: 120,
    },
    {
      title: 'Fecha',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 110,
      render: (date) => format(new Date(date), 'dd MMM yyyy', { locale: es }),
      sorter: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    },
  ]

  const filteredData = workspaces?.filter(item => 
    (item.operation_name || item.name).toLowerCase().includes(searchText.toLowerCase()) ||
    (item.client_company || '').toLowerCase().includes(searchText.toLowerCase())
  )

  return (
    <div className="bg-[#1E1F20] p-6 rounded-2xl border border-white/5 shadow-xl">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-white">Oportunidades Estratégicas</h3>
        <div className="flex gap-4">
          <Input
            placeholder="Buscar por operación o cliente..."
            prefix={<SearchOutlined className="text-zinc-500" />}
            onChange={e => setSearchText(e.target.value)}
            className="w-80 bg-[#131314] border-zinc-800 text-white hover:border-[#E31837] focus:border-[#E31837]"
            variant="filled"
          />
        </div>
      </div>
      
      <Table
        columns={columns}
        dataSource={filteredData}
        loading={isLoading}
        rowKey="id"
        scroll={{ x: 1400 }}
        pagination={{
          pageSize: 5,
          className: "ant-table-pagination-custom",
        }}
        className="custom-antd-table"
        onRow={(record) => ({
          onClick: () => {
            // Navegar al workspace al hacer clic en la fila
            window.location.href = `/workspace/${record.id}`
          },
          className: 'cursor-pointer hover:bg-white/5 transition-colors'
        })}
      />

      <style jsx global>{`
        .custom-antd-table .ant-table {
          background: transparent !important;
          color: white !important;
        }
        .custom-antd-table .ant-table-thead > tr > th {
          background: #131314 !important;
          color: #a1a1aa !important;
          border-bottom: 1px solid #27272a !important;
        }
        .custom-antd-table .ant-table-tbody > tr > td {
          border-bottom: 1px solid #27272a !important;
          color: white !important;
        }
        .custom-antd-table .ant-table-tbody > tr:hover > td {
          background: rgba(255, 255, 255, 0.05) !important;
        }
        .custom-antd-table .ant-pagination-item {
          background: #131314 !important;
          border-color: #27272a !important;
        }
        .custom-antd-table .ant-pagination-item a {
          color: #a1a1aa !important;
        }
        .custom-antd-table .ant-pagination-item-active {
          border-color: #E31837 !important;
        }
        .custom-antd-table .ant-pagination-item-active a {
          color: #E31837 !important;
        }
        .custom-antd-table .ant-pagination-prev .ant-pagination-item-link,
        .custom-antd-table .ant-pagination-next .ant-pagination-item-link {
          background: #131314 !important;
          border-color: #27272a !important;
          color: #a1a1aa !important;
        }
      `}</style>
    </div>
  )
}
