"use client"

import { Component, ReactNode } from 'react'
import { Result, Button } from 'antd'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: any
}

/**
 * ErrorBoundary global para capturar errores de React
 * Previene que toda la app crashee por un error en un componente
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    // Log solo en desarrollo
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught:', error, errorInfo)
    }

    // En producción, enviar a servicio de logging (Sentry, LogRocket, etc.)
    if (process.env.NODE_ENV === 'production') {
      // TODO: Integrar con servicio de logging
      // Example: Sentry.captureException(error, { extra: errorInfo })
    }

    // Guardar en state para mostrar UI
    this.setState({ errorInfo })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  render() {
    if (this.state.hasError) {
      // Usar fallback personalizado si se proporciona
      if (this.props.fallback) {
        return this.props.fallback
      }

      // UI por defecto
      return (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          minHeight: '100vh',
          padding: '24px'
        }}>
          <Result
            status="error"
            title="Algo salió mal"
            subTitle="Ocurrió un error inesperado. Por favor recarga la página o contacta a soporte si el problema persiste."
            extra={[
              <Button type="primary" key="reload" onClick={() => window.location.reload()}>
                Recargar Página
              </Button>,
              <Button key="reset" onClick={this.handleReset}>
                Intentar de Nuevo
              </Button>,
            ]}
          >
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div style={{ 
                textAlign: 'left', 
                marginTop: '24px',
                padding: '16px',
                background: '#f5f5f5',
                borderRadius: '4px',
                maxWidth: '600px',
                overflow: 'auto'
              }}>
                <strong>Error:</strong>
                <pre style={{ fontSize: '12px', marginTop: '8px' }}>
                  {this.state.error.toString()}
                </pre>
                {this.state.errorInfo && (
                  <>
                    <strong style={{ marginTop: '16px', display: 'block' }}>Stack Trace:</strong>
                    <pre style={{ fontSize: '11px', marginTop: '8px' }}>
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </>
                )}
              </div>
            )}
          </Result>
        </div>
      )
    }

    return this.props.children
  }
}
