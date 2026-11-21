# ControlCell

Panel privado para administrar ventas financiadas de teléfonos Android, clientes y cuotas mensuales.

## Funciones conectadas

- Inicio de sesión de administrador mediante Supabase Auth.
- Lectura y escritura de clientes, equipos, ventas, cuotas y pagos en Supabase.
- Generación de cuotas mensuales de hasta 48 períodos.
- Búsqueda de clientes y equipos.
- Registro de pagos y actualización del estado de las cuotas.
- Resumen de ventas, saldo pendiente y cobros.
- Interfaz adaptable a celular y computadora.

## Configuración

La aplicación usa la URL del proyecto Supabase y una clave publicable en el frontend. La clave publicable está diseñada para aplicaciones cliente; nunca colocar claves `service_role` ni secretos en estos archivos.

En Supabase, mantener habilitada la protección RLS de todas las tablas. Para que el acceso sea exclusivamente del administrador, desactivar los registros públicos de nuevos usuarios en Authentication y crear manualmente las cuentas autorizadas desde el panel de Supabase.

## Importante: estado de desarrollo

La integración inicial con Supabase está implementada, pero todavía debe probarse con la cuenta real del administrador. Antes de usarla para administrar cobros reales faltan pruebas completas de login, ventas, cuotas y pagos; manejo transaccional ante errores parciales; copias de seguridad; auditoría y endurecimiento de seguridad; y pruebas en distintos navegadores y celulares.

No considerar esta versión lista para producción ni para publicar como aplicación Android hasta completar esas verificaciones.

## Seguridad y cumplimiento

Cualquier restricción funcional del dispositivo deberá ser transparente, contar con autorización expresa e informada del comprador, cumplir las políticas de Android y la legislación aplicable, incluir avisos previos y un mecanismo de reclamo y restablecimiento al regularizar la deuda. No implementar vigilancia oculta ni acceso a datos personales ajenos al funcionamiento del servicio.
