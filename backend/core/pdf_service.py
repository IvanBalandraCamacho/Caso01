"""
Servicio para generación de PDFs con formato profesional usando ReportLab.
"""
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from io import BytesIO
from datetime import datetime
from typing import List, Dict


class PDFExportService:
    """
    Servicio para exportar conversaciones y documentos a PDF con formato profesional.
    """
    
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._create_custom_styles()
    
    def _create_custom_styles(self):
        """Crea estilos personalizados para el PDF."""
        # Estilo para título principal
        self.styles.add(ParagraphStyle(
            name='CustomTitle',
            parent=self.styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#1a1a1a'),
            spaceAfter=30,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        ))
        
        # Estilo para subtítulos
        self.styles.add(ParagraphStyle(
            name='CustomHeading',
            parent=self.styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#2563eb'),
            spaceAfter=12,
            spaceBefore=12,
            fontName='Helvetica-Bold'
        ))
        
        # Estilo para mensajes de usuario
        self.styles.add(ParagraphStyle(
            name='UserMessage',
            parent=self.styles['Normal'],
            fontSize=11,
            textColor=colors.HexColor('#1f2937'),
            spaceAfter=8,
            leftIndent=20,
            fontName='Helvetica'
        ))
        
        # Estilo para mensajes del asistente
        self.styles.add(ParagraphStyle(
            name='AssistantMessage',
            parent=self.styles['Normal'],
            fontSize=11,
            textColor=colors.HexColor('#374151'),
            spaceAfter=8,
            leftIndent=20,
            alignment=TA_JUSTIFY,
            fontName='Helvetica'
        ))
        
        # Estilo para metadata
        self.styles.add(ParagraphStyle(
            name='Metadata',
            parent=self.styles['Normal'],
            fontSize=9,
            textColor=colors.HexColor('#6b7280'),
            spaceAfter=4,
            fontName='Helvetica-Oblique'
        ))
    
    def export_conversation_to_pdf(
        self,
        workspace_name: str,
        conversation_title: str,
        messages: List[Dict],
        conversation_id: str = None
    ) -> BytesIO:
        """
        Exporta una conversación a PDF con formato profesional.
        
        Args:
            workspace_name: Nombre del workspace
            conversation_title: Título de la conversación
            messages: Lista de mensajes [{"role": "user/assistant", "content": "...", "created_at": "..."}]
            conversation_id: ID de la conversación (opcional)
            
        Returns:
            BytesIO con el contenido del PDF
        """
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=18,
        )
        
        # Contenedor para los elementos del PDF
        story = []
        
        # Título principal
        title = Paragraph(f"Conversación: {conversation_title}", self.styles['CustomTitle'])
        story.append(title)
        story.append(Spacer(1, 0.2 * inch))
        
        # Información del workspace
        workspace_info = Paragraph(f"<b>Workspace:</b> {workspace_name}", self.styles['Metadata'])
        story.append(workspace_info)
        
        # Fecha de exportación
        export_date = Paragraph(
            f"<b>Exportado:</b> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            self.styles['Metadata']
        )
        story.append(export_date)
        
        if conversation_id:
            conv_id = Paragraph(f"<b>ID:</b> {conversation_id}", self.styles['Metadata'])
            story.append(conv_id)
        
        story.append(Spacer(1, 0.3 * inch))
        
        # Línea separadora
        line_data = [['', '']]
        line_table = Table(line_data, colWidths=[6.5 * inch])
        line_table.setStyle(TableStyle([
            ('LINEABOVE', (0, 0), (-1, 0), 2, colors.HexColor('#2563eb')),
        ]))
        story.append(line_table)
        story.append(Spacer(1, 0.2 * inch))
        
        # Agregar mensajes
        for i, msg in enumerate(messages):
            role = msg.get('role', 'user')
            content = msg.get('content', '')
            created_at = msg.get('created_at', '')
            
            # Timestamp formateado
            if created_at:
                try:
                    dt = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                    timestamp = dt.strftime('%Y-%m-%d %H:%M:%S')
                except:
                    timestamp = created_at
            else:
                timestamp = ''
            
            # Etiqueta del rol
            if role == 'user':
                role_label = f"<b style='color: #2563eb;'>👤 USUARIO</b>"
                style = self.styles['UserMessage']
                bg_color = colors.HexColor('#eff6ff')
            else:
                role_label = f"<b style='color: #16a34a;'>🤖 ASISTENTE</b>"
                style = self.styles['AssistantMessage']
                bg_color = colors.HexColor('#f0fdf4')
            
            # Crear tabla para el mensaje (con fondo de color)
            msg_header = Paragraph(f"{role_label} <i>({timestamp})</i>", self.styles['Metadata'])
            msg_content = Paragraph(content.replace('\n', '<br/>'), style)
            
            msg_data = [[msg_header], [msg_content]]
            msg_table = Table(msg_data, colWidths=[6.5 * inch])
            msg_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), bg_color),
                ('PADDING', (0, 0), (-1, -1), 12),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('TOPPADDING', (0, 0), (-1, 0), 8),
                ('BOTTOMPADDING', (0, 1), (-1, 1), 8),
            ]))
            
            story.append(msg_table)
            story.append(Spacer(1, 0.15 * inch))
        
        # Pie de página
        story.append(Spacer(1, 0.3 * inch))
        footer = Paragraph(
            f"<i>Total de mensajes: {len(messages)} | Generado por Sistema RAG Velvet</i>",
            self.styles['Metadata']
        )
        story.append(footer)
        
        # Construir PDF
        doc.build(story)
        
        buffer.seek(0)
        return buffer
    
    def export_multiple_conversations_to_pdf(
        self,
        workspace_name: str,
        conversations: List[Dict]
    ) -> BytesIO:
        """
        Exporta múltiples conversaciones a un único PDF.
        
        Args:
            workspace_name: Nombre del workspace
            conversations: Lista de conversaciones con sus mensajes
            
        Returns:
            BytesIO con el contenido del PDF
        """
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=18,
        )
        
        story = []
        
        # Portada
        title = Paragraph(f"Historial de Conversaciones", self.styles['CustomTitle'])
        story.append(title)
        story.append(Spacer(1, 0.2 * inch))
        
        workspace_info = Paragraph(f"<b>Workspace:</b> {workspace_name}", self.styles['Metadata'])
        story.append(workspace_info)
        
        export_date = Paragraph(
            f"<b>Exportado:</b> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            self.styles['Metadata']
        )
        story.append(export_date)
        
        total_convs = Paragraph(
            f"<b>Total de conversaciones:</b> {len(conversations)}",
            self.styles['Metadata']
        )
        story.append(total_convs)
        
        story.append(PageBreak())
        
        # Agregar cada conversación
        for i, conv in enumerate(conversations):
            conv_title = conv.get('title', f'Conversación {i+1}')
            messages = conv.get('messages', [])
            
            # Título de la conversación
            story.append(Paragraph(f"{i+1}. {conv_title}", self.styles['CustomHeading']))
            story.append(Spacer(1, 0.1 * inch))
            
            # Mensajes
            for msg in messages:
                role = msg.get('role', 'user')
                content = msg.get('content', '')
                
                if role == 'user':
                    role_label = "👤 Usuario:"
                    style = self.styles['UserMessage']
                else:
                    role_label = "🤖 Asistente:"
                    style = self.styles['AssistantMessage']
                
                msg_para = Paragraph(f"<b>{role_label}</b> {content}", style)
                story.append(msg_para)
                story.append(Spacer(1, 0.08 * inch))
            
            # Separador entre conversaciones
            if i < len(conversations) - 1:
                story.append(Spacer(1, 0.2 * inch))
                story.append(PageBreak())
        
        doc.build(story)
        buffer.seek(0)
        return buffer


    def export_text_to_pdf(
        self,
        title: str,
        content: str
    ) -> BytesIO:
        """
        Exporta contenido de texto (Markdown simple) a PDF.
        
        Args:
            title: Título del documento
            content: Contenido en texto/markdown
            
        Returns:
            BytesIO con el contenido del PDF
        """
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=18,
        )
        
        story = []
        
        # Título
        story.append(Paragraph(title, self.styles['CustomTitle']))
        story.append(Spacer(1, 0.2 * inch))
        
        # Fecha
        date_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        story.append(Paragraph(f"<b>Generado:</b> {date_str}", self.styles['Metadata']))
        story.append(Spacer(1, 0.3 * inch))
        
        # Procesar contenido (Markdown simplificado)
        # Separar por líneas para procesar encabezados y párrafos
        lines = content.split('\n')
        
        current_text_block = []
        
        for line in lines:
            line = line.strip()
            if not line:
                # Si hay texto acumulado, agregarlo como párrafo
                if current_text_block:
                    text = " ".join(current_text_block)
                    story.append(Paragraph(text, self.styles['Normal']))
                    story.append(Spacer(1, 0.1 * inch))
                    current_text_block = []
                continue
                
            # Detectar encabezados Markdown
            if line.startswith('# '):
                # H1
                if current_text_block:
                    story.append(Paragraph(" ".join(current_text_block), self.styles['Normal']))
                    current_text_block = []
                story.append(Spacer(1, 0.2 * inch))
                story.append(Paragraph(line[2:], self.styles['Heading1']))
                story.append(Spacer(1, 0.1 * inch))
                
            elif line.startswith('## '):
                # H2
                if current_text_block:
                    story.append(Paragraph(" ".join(current_text_block), self.styles['Normal']))
                    current_text_block = []
                story.append(Spacer(1, 0.15 * inch))
                story.append(Paragraph(line[3:], self.styles['CustomHeading']))
                story.append(Spacer(1, 0.1 * inch))
                
            elif line.startswith('### '):
                # H3
                if current_text_block:
                    story.append(Paragraph(" ".join(current_text_block), self.styles['Normal']))
                    current_text_block = []
                story.append(Spacer(1, 0.1 * inch))
                story.append(Paragraph(line[4:], self.styles['Heading3']))
                story.append(Spacer(1, 0.05 * inch))
                
            elif line.startswith('- ') or line.startswith('* '):
                # Listas
                if current_text_block:
                    story.append(Paragraph(" ".join(current_text_block), self.styles['Normal']))
                    current_text_block = []
                
                bullet_text = line[2:]
                # Usar BulletStyle si existiera, o simular con indentación
                story.append(Paragraph(f"• {bullet_text}", self.styles['Normal'], bulletText='•'))
                
            else:
                # Texto normal
                current_text_block.append(line)
        
        # Agregar último bloque
        if current_text_block:
            text = " ".join(current_text_block)
            story.append(Paragraph(text, self.styles['Normal']))
            
        doc.build(story)
        buffer.seek(0)
        return buffer


# Instancia global del servicio
pdf_export_service = PDFExportService()
