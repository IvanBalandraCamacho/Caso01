# FIX_ANALYSIS_FLOW.md

## 🚨 Estado Actual: "Cerebro sin Memoria"
El análisis de RFP funciona (extrae datos), pero **no guarda nada en la base de datos**.
- **Resultado:** El usuario ve los datos en el popup del momento, pero al ir al Dashboard, la tabla está vacía.
- **Objetivo:** Persistir automáticamente el resultado del análisis como un nuevo `Workspace`.

---

## 🛠 Tarea 1: Backend - Persistencia Automática

### 1.1 Modificar `backend/api/service/impl/proposals_service_impl.py`
El método `analyze` actualmente solo retorna un diccionario. Debe recibir la sesión de BD y guardar el registro.

**Instrucción:**
Modificar la firma de `analyze` para aceptar `db: Session` y `user: User`.

```python
# Pseudo-código para la implementación
async def analyze(self, file: UploadFile, db: Session, user: User) -> Dict[str, Any]:
    # 1. Ejecutar lógica actual de extracción (PDF -> Texto -> LLM)
    analysis_result = ... # (Diccionario con tvt, cliente, pais, etc.)

    # 2. CREAR EL WORKSPACE AUTOMÁTICAMENTE
    new_workspace = Workspace(
        name=f"Análisis RFP: {file.filename}",
        description=f"Auto-generado del archivo {file.filename}",
        owner_id=user.id,
        is_active=True,
        # Mapeo de campos estratégicos extraídos por la IA
        client_company=analysis_result.get("cliente"),
        country=analysis_result.get("pais"),
        tvt=analysis_result.get("tvt"), # Asegurar conversión a float si es string
        operation_name=analysis_result.get("nombre_operacion"),
        tech_stack=analysis_result.get("stack_tecnologico"), # Convertir lista a JSON/String
        opportunity_type="RFP", 
        category=analysis_result.get("categoria"),
        # Guardar el contenido crudo o resumen en 'instructions' para contexto futuro
        instructions=str(analysis_result) 
    )

    db.add(new_workspace)
    db.commit()
    db.refresh(new_workspace)

    # 3. Retornar el ID junto con el análisis para que el front sepa a dónde redirigir
    return {
        "analysis": analysis_result,
        "workspace_id": str(new_workspace.id)
    }´´´
1.2 Actualizar Controlador backend/api/routes/intention_task.py
Inyectar la dependencia de base de datos y usuario actual en el endpoint.

´´´Python

@router.post("/task/analyze")
async def analyze_document(
    file: UploadFile = File(...),
    db: Session = Depends(database.get_db), # <-- Nuevo
    current_user: User = Depends(get_current_active_user) # <-- Nuevo
):
    # Pasar db y user al servicio
    result = await service.analyze(file=file, db=db, user=current_user)
    return result
    ´´´
🖥 Tarea 2: Frontend - Conexión Real
2.1 Reemplazar Mock en front-v2/app/quick-analysis/page.tsx
Eliminar la función customRequest simulada (setTimeout) y usar una llamada real a la API.

Lógica requerida en handleUpload:

Crear FormData y adjuntar el archivo.

POST a /api/v1/task/analyze (asegurar Token Bearer).

Mostrar Spinner de "Analizando con IA..." (puede tardar 10-30 seg).

Al recibir éxito:

Guardar workspace_id recibido.

Redirigir al usuario: router.push(/workspace/${response.workspace_id}) O mostrar botón "Ver en Dashboard".

📊 Tarea 3: Verificación del Dashboard
3.1 Revisar front-v2/components/WorkspacesTable.tsx
Asegurarse de que las columnas coincidan con los datos guardados:

La columna "TVT" debe leer row.original.tvt.

La columna "Cliente" debe leer row.original.client_company.

✅ Definition of Done
Subo un PDF en "Análisis Rápido".

Espero el procesamiento.

El sistema me redirige (o me avisa).

Voy al inicio (/) y veo una nueva fila en la tabla con el "Cliente", "TVT" y "País" correctos.