# Sistema Dinámico de Horarios (Schedule System)

El sistema de agendamiento y reserva de PatyNails ahora utiliza una configuración dinámica desde Firestore, permitiendo al administrador cambiar el horario de operación y el intervalo de los turnos sin depender de código estático.

## Arquitectura de Datos

La configuración del salón se almacena en Firebase Firestore.
- **Colección:** `settings`
- **Documento:** `business`
- **Estructura (Ejemplo):**
  ```json
  {
    "openingTime": "07:00",
    "closingTime": "19:00",
    "slotInterval": 30,
    "minimumAppointmentDuration": 30,
    "timezone": "America/Asuncion",
    "createdAt": "Timestamp",
    "updatedAt": "Timestamp"
  }
  ```

## Componentes Clave

### 1. `scheduleService.js` (Única Fuente de Lógica)
Es el único responsable de calcular las disponibilidades, bloqueos y validaciones. Ningún componente debe realizar operaciones matemáticas directas (e.g., `start + 30`) sobre horas. 

**Funciones principales:**
- `generateTimeSlots(openingTime, closingTime, slotInterval)`: Retorna un array con cada bloque horario disponible.
- `calculateAvailableSlots(appointments, serviceDuration, businessSettings, isToday, now)`: Retorna los bloques realmente disponibles para reservar.
- `checkAvailability(...)`: Valida si una hora específica está disponible.

### 2. Reglas de Disponibilidad
Para que el cliente o el admin vean un horario como "disponible" para un servicio, se cumplen las siguientes reglas:
1. **Disponibilidad de bloques:** El sistema divide la duración del servicio por el `slotInterval`. Ejemplo: Servicio de 90min e intervalo de 30min requieren **3 bloques continuos** libres.
2. **Validación de cierre:** Ningún servicio puede terminar después del `closingTime`. Si el servicio dura 2 horas y el cierre es 19:00, el último turno permitido será las 17:00.
3. **No traslapos:** El bloque buscado no debe superponerse con ningún turno ya registrado (se filtran turnos "cancelado" o "no asistió").

### 3. Migración y Compatibilidad
Para mantener la compatibilidad con turnos o modales preexistentes, se conservó temporalmente la constante `DEPRECATED_BUSINESS_HOURS` en `app.js`. Todos los nuevos componentes de agenda utilizan el hook `useBusinessSettings()` para acceder dinámicamente a esta configuración.
