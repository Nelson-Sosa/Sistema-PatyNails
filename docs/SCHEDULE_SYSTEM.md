# Sistema Dinámico de Horarios (Schedule System)

El sistema de agendamiento y reserva de PatyNails utiliza una configuración dinámica desde Firestore, permitiendo al administrador definir bloques de atención por día de la semana y el intervalo de los turnos sin depender de código estático.

## Arquitectura de Datos

La configuración del salón se almacena en Firebase Firestore.
- **Colección:** `settings`
- **Documento:** `business`
- **Estructura (Ejemplo):**
  ```json
  {
    "openingTime": "07:00",
    "closingTime": "20:00",
    "workingDays": [1, 2, 3, 4, 5, 6],
    "slotInterval": 30,
    "minimumAppointmentDuration": 30,
    "timezone": "America/Asuncion",
    "weeklySchedule": {
      "monday": {
        "enabled": true,
        "blocks": [
          { "start": "07:00", "end": "12:00" },
          { "start": "13:30", "end": "20:00" }
        ]
      },
      "sunday": { "enabled": false, "blocks": [] }
    },
    "createdAt": "Timestamp",
    "updatedAt": "Timestamp"
  }
  ```

`weeklySchedule` es el modelo principal de horarios: cada día (`monday` ... `sunday`)
tiene `enabled` (Abierto/Cerrado) y una lista de `blocks` de atención. Los campos
`openingTime`, `closingTime` y `workingDays` se mantienen por compatibilidad y se
recalculan automáticamente al guardar la configuración.

## Migración Automática

Si el documento aún no contiene `weeklySchedule` (solo `openingTime`/`closingTime`
y `workingDays`), el servicio `getBusinessSettings()` lo genera automáticamente:
cada día marcado como laborable recibe un único bloque `openingTime → closingTime`.
No se pierde información y el administrador no tiene que reconfigurar todo.

## Componentes Clave

### 1. `scheduleService.js` (Única Fuente de Lógica)
Es el único responsable de calcular las disponibilidades, bloqueos y validaciones. Ningún componente debe realizar operaciones matemáticas directas (e.g., `start + 30`) sobre horas.

**Funciones principales:**
- `getWeeklySchedule(settings)`: Normaliza el horario semanal (7 días).
- `getDaySchedule(settings, date)`: Devuelve `{ enabled, blocks }` para una fecha.
- `generateTimeSlotsFromBlocks(blocks, interval)`: Genera los horarios de inicio dentro de los bloques (omite las pausas).
- `calculateAvailableSlots(appointments, serviceDuration, businessSettings, isToday, now, date)`: Retorna los bloques realmente disponibles para reservar, garantizando que el servicio entre completo dentro de un bloque.
- `canStartServiceAt(settings, date, time, duration)`: Valida un horario puntual (día abierto, dentro de un bloque, alineado al intervalo y servicio contenido).
- `getScheduleErrorMessage(reason)`: Mensaje claro para el usuario según el motivo de rechazo.

### 2. Reglas de Disponibilidad
Para que el cliente o el admin vean un horario como "disponible" para un servicio, se cumplen las siguientes reglas:
1. **Bloques de atención:** El día debe estar habilitado y el servicio debe caber completo dentro de uno de sus bloques. Los horarios solo se generan a partir del inicio de cada bloque, con el intervalo configurado (p. ej. bloque `07:00-12:00` con intervalo 30 genera `07:00`, `07:30`, ..., `11:30`).
2. **Pausas:** No se generan horarios durante las pausas entre bloques.
3. **Validación de cierre del bloque:** Ningún servicio puede terminar después del fin de su bloque. Ejemplo: bloque hasta las 12:00 y servicio de 2 horas → el último turno permitido es las 10:00.
4. **No traslapos:** El bloque buscado no debe superponerse con ningún turno ya registrado (se filtran turnos "cancelado" o "no asistió").

### 3. Migración y Compatibilidad
Para mantener la compatibilidad con turnos o modales preexistentes, se conservó la constante `DEPRECATED_BUSINESS_HOURS` en `app.js` y los campos planos `openingTime`/`closingTime`/`workingDays`. Todos los componentes de agenda utilizan el hook `useBusinessSettings()` y el motor `scheduleService`.
