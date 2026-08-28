# Arranque — estado y cómo se hizo

## Lo que ya está hecho

| Paso | Estado |
|---|---|
| Proyecto Firebase `entrelineas-gestion` | ✅ creado (plan Spark, sin costo) |
| App web registrada | ✅ `gestion` |
| `firebaseConfig` puesto en `index.html` | ✅ |
| API de Firestore habilitada y base creada | ✅ región `nam5` |
| Reglas de seguridad publicadas | ✅ desde `firestore.rules` |
| Cuentas en Authentication (4) | ✅ Gaby, Marcela, Elita, Roberto |
| Documentos de miembro | ⏳ ver abajo |
| Repo y GitHub Pages | ⏳ pendiente |

Casi todo se hizo con el CLI de Firebase, que ya estaba instalado y con la sesión de
Roberto abierta. Los comandos quedan aquí por si hay que repetirlo en otro proyecto:

```bash
firebase apps:create web gestion --project entrelineas-gestion
firebase apps:sdkconfig WEB <appId> --project entrelineas-gestion
firebase auth:export usuarios.json --format=json --project entrelineas-gestion
firebase deploy --only firestore:rules --project entrelineas-gestion
```

El `deploy` de reglas hace más de lo que parece: si la API de Firestore no está
habilitada la habilita, y si no hay base de datos la crea. Por eso no hizo falta entrar a
la consola a darle clic a nada.

## Los documentos de miembro, y por qué son un paso aparte

Estar en Authentication **no basta** para entrar. Cada persona necesita además su
documento en `negocios/entrelineas/miembros/<su UID>` con `nombre`, `rol` y `activo`.

Es a propósito: así se le quita el acceso a alguien sin borrarle la cuenta, y el día que
el negocio se entregue, Gaby saca a quien quiera sin tocar Authentication.

Eso crea un huevo y la gallina el primer día: las reglas dicen que solo un miembro con rol
`duena` administra miembros, y al principio no hay ninguno. Se resuelve así:

1. `firestore.arranque.rules` — reglas **temporales** que dejan escribir la colección de
   miembros a **un solo correo** y cierran todo lo demás.
2. `node sembrar-miembros.mjs` — crea los cuatro documentos con los UID reales, que
   salieron de `auth:export` y no se teclearon a mano. Habla por HTTP con las mismas APIs
   que usa el navegador, autenticado como una persona: **pasa por las reglas igual que la
   app**, así que si algo está mal, falla aquí.
3. Volver a `firestore.rules` y desplegar.
4. `node sembrar-miembros.mjs --leer` para comprobar que los cuatro quedaron.

> ⚠️ **Las reglas de arranque no se dejan puestas.** El paso 3 no es opcional.
> Para volver: en `firebase.json`, `"rules": "firestore.rules"`, y desplegar.

## Roles

| | dueña | socia | apoyo |
|---|---|---|---|
| Ver el negocio | sí | sí | sí *(por confirmar)* |
| Capturar pedidos y pendientes | sí | sí | sí |
| Registrar pagos y gastos | sí | sí | **no** |
| Movimientos de inventario | sí | sí | sí |
| Dar y quitar accesos, cambiar roles | sí | no | no |

Gaby y Roberto son `duena`; Marcela, `socia`; Elita, `apoyo`.

🔴 **Falta que Gaby confirme si Elita debe ver el dinero.** Hoy los tres leen todo. Si no
debe, cobros y gastos tienen que vivir en otro lado: Firestore no puede esconder campos
sueltos de un documento que ya dejó leer. **Decidirlo antes de que haya datos.**

## Publicar la app

Repo nuevo en GitHub y **Settings → Pages → Deploy from a branch → main**.

`CREDENCIALES.txt` y `sembrar-miembros.mjs` están en `.gitignore` porque llevan
contraseñas: **el repo va a ser público**, igual que el de la página.

Un solo commit por tanda: GitHub Pages atasca su cola de despliegues si se suben varios
seguidos.

## Probar

```
node test-logica.mjs
```

32 pruebas de lo que decide dinero y prioridad, sin Firebase ni internet, contra el
`index.html` real: saldos derivados de los cobros, el envío foráneo que sale tres días
antes, y el ejemplo de Gaby de los diez marcos con dos figuras cada uno.
