Hola mirai del futuro, no te olvides de colocar:

          <Button
            variant="outline"
            className="text-gray-300 border-gray-700 hover:bg-gray-800"
            onClick={() =>
              activeWorkspace && exportChatToPdf(activeWorkspace.id)
            }
            disabled={!activeWorkspace}
          >
            Export to PDF
          </Button>
          
En la linea 170 en chat-area.tsx cuando reimplementen el endpoint de PDF, gracias