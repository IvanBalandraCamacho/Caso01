"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Spin, Modal, Input, Button, Form, message } from "antd"
import { useWorkspaceContext, type Workspace } from "@/context/WorkspaceContext"
import { useUser } from "@/hooks/useUser"
import { PlusOutlined, FolderOpenOutlined, RightOutlined } from "@ant-design/icons"
import { ModernButton } from "@/components/ui/ModernButton"

export default function WorkspacePage() {
  const router = useRouter()
  const { workspaces, isLoadingWorkspaces, createWorkspace, fetchWorkspaces } = useWorkspaceContext()
  const { user, isLoading: userLoading } = useUser()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [form] = Form.useForm()

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login')
    }
  }, [user, userLoading, router])

  // Refrescar workspaces al montar para asegurar datos frescos
  useEffect(() => {
    fetchWorkspaces()
  }, [fetchWorkspaces])

  const handleCreate = async (values: { name: string; description?: string }) => {
    setIsCreating(true)
    try {
      const newWorkspace = await createWorkspace(values)
      message.success("Workspace creado exitosamente")
      setIsModalOpen(false)
      form.resetFields()
      router.push(`/workspace/${newWorkspace.id}`)
    } catch (error) {
      message.error("Error al crear el workspace")
    } finally {
      setIsCreating(false)
    }
  }

  // Generar un color de fondo aleatorio suave basado en el nombre
  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-red-500/10 text-red-500',
      'bg-orange-500/10 text-orange-500',
      'bg-blue-500/10 text-blue-500',
      'bg-green-500/10 text-green-500',
      'bg-purple-500/10 text-purple-500',
      'bg-pink-500/10 text-pink-500',
    ]
    const index = name.length % colors.length
    return colors[index]
  }

  if (userLoading || isLoadingWorkspaces) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#131314]">
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#131314] text-zinc-900 dark:text-white pt-24 pb-12 px-4 sm:px-8 font-sans">
      <div className="max-w-6xl mx-auto animate-fade-in-up">
        
        {/* Header */}
        <div className="mb-10 text-center sm:text-left">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
            Tus Espacios
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-lg">
            Gestiona tus proyectos y documentos en un solo lugar.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Card: Crear Nuevo (Primera Posición) */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="group relative flex flex-col items-center justify-center h-64 border-2 border-dashed border-slate-300 dark:border-zinc-700 rounded-2xl p-6 transition-all duration-300 hover:border-[#E31837] hover:bg-red-50 dark:hover:bg-[#E31837]/5"
          >
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center mb-4 transition-colors group-hover:bg-[#E31837]/10 group-hover:text-[#E31837]">
              <PlusOutlined style={{ fontSize: '24px' }} />
            </div>
            <h3 className="text-lg font-semibold text-zinc-600 dark:text-zinc-400 group-hover:text-[#E31837]">
              Crear nuevo espacio
            </h3>
          </button>

          {/* Cards: Workspaces Existentes */}
          {workspaces.map((workspace) => (
            <div
              key={workspace.id}
              onClick={() => router.push(`/workspace/${workspace.id}`)}
              className="group cursor-pointer bg-white dark:bg-[#1E1F20] border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 h-64 flex flex-col shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl ${getAvatarColor(workspace.name)}`}>
                  {workspace.name.charAt(0).toUpperCase()}
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400">
                  <RightOutlined />
                </div>
              </div>

              <div className="flex-1">
                <h3 className="text-xl font-bold mb-2 line-clamp-2 text-zinc-900 dark:text-white group-hover:text-[#E31837] transition-colors">
                  {workspace.name}
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-3">
                  {workspace.description || "Sin descripción"}
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-zinc-700/50 flex items-center gap-2 text-xs text-zinc-400">
                <FolderOpenOutlined />
                <span>Espacio de trabajo</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Crear Workspace - Rediseñado */}
      <Modal
        title={null}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        centered
        width={500}
        styles={{
          content: {
            background: "#1E1F20",
            borderRadius: "24px", // Más redondeado estilo Material 3
            padding: "32px", // Más padding interno
            border: "1px solid rgba(255, 255, 255, 0.08)",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
            color: "white"
          },
          mask: {
            backdropFilter: "blur(8px)", // Más blur
            background: "rgba(0, 0, 0, 0.8)"
          }
        }}
        closeIcon={<span className="text-zinc-500 hover:text-white transition-colors text-xl">×</span>}
      >
        <div className="mb-8">
            <div className="w-12 h-12 rounded-2xl bg-[#E31837]/10 flex items-center justify-center mb-4 text-[#E31837]">
                <PlusOutlined style={{ fontSize: '20px' }} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Nuevo Espacio</h2>
            <p className="text-zinc-400 text-sm">Crea un entorno dedicado para tus documentos y análisis.</p>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreate}
          requiredMark={false}
          className="flex flex-col gap-2"
        >
          <Form.Item
            name="name"
            label={<span className="text-zinc-300 font-medium text-sm ml-1">Nombre del espacio</span>}
            rules={[{ required: true, message: 'Por favor ingresa un nombre' }]}
          >
            <Input 
              placeholder="Ej. Licitación Gobierno 2024" 
              className="bg-[#131314] border-transparent focus:border-[#E31837] text-white placeholder-zinc-600 rounded-xl h-12 text-base transition-all shadow-inner focus:bg-[#0a0a0a]"
            />
          </Form.Item>

          <Form.Item
            name="description"
            label={<span className="text-zinc-300 font-medium text-sm ml-1">Descripción <span className="text-zinc-500 font-normal">(Opcional)</span></span>}
          >
            <Input.TextArea 
              rows={4}
              placeholder="¿Cuál es el objetivo de este espacio?"
              className="bg-[#131314] border-transparent focus:border-[#E31837] text-white placeholder-zinc-600 rounded-xl text-base transition-all shadow-inner focus:bg-[#0a0a0a] py-3"
            />
          </Form.Item>

          <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-white/5">
            <Button 
              onClick={() => setIsModalOpen(false)}
              className="h-11 px-6 rounded-xl border-transparent text-zinc-400 hover:text-white hover:bg-white/5 bg-transparent font-medium transition-colors"
            >
              Cancelar
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={isCreating}
              className="h-11 px-8 rounded-xl bg-[#E31837] hover:bg-[#c41530] border-none font-semibold shadow-lg shadow-[#E31837]/20 transition-all hover:scale-[1.02]"
            >
              Crear Espacio
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  )
}