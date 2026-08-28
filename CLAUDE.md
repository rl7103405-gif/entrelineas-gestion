# Entre Líneas — app de gestión (pedidos, cobros, inventario)

App interna del taller **Entre Líneas** (@entrelineas.myg), de Puebla. La usan tres
personas: **Gaby Linares** (dueña), su tía **Marcela** ("Marse") y **Elita**. No es una
app personal de finanzas: es la operación de un micronegocio real, con clientes, dinero
de terceros e inventario.

**No confundir con `Desktop\ENTRELINEAS\pagina-web`**, que es la *página pública* de pedidos. Esta
app es lo que Gaby pidió **primero**; la página se hizo antes a propósito, para tener algo
que enseñar. Las dos se conectan por el bloque `[EL:v1]` que la página deja al final del
mensaje de WhatsApp.

## Lo que Gaby pidió, en sus palabras

Todo lo de aquí sale de una entrevista grabada de 42 minutos (27-ago-2026). **Nada de
esto es suposición.** Lo que ella no dijo está listado más abajo como hueco, y no se
inventa.

1. **Cobrar es el dolor #1.** *"Lo principal que tengo tema es con lo de las cuentas, o
   sea llevo un registro en papel... hay dos que se nos pasan, o a lo mejor el que no le
   hemos cobrado porque ya hacen nuestras papás."*
2. **Priorizar pedidos.** *"Tengo un Excel pero nunca supe cómo ponerlo por orden de
   prioridad; quiero algo que me diga: esto es lo más importante."* Único dato duro de
   logística que dio: **los envíos fuera de Puebla piden 2 días hábiles de paquetería, y
   ella prefiere 3 de colchón.**
3. **Inventario que avise del faltante.** Su ejemplo: *"te llegan 10 marcos con dos legos
   cada uno, pero en tu inventario tienes 9 marcos y 8 legos... el chiste es que te diga:
   oye, no vas a poder completar estos pedidos, tienes que ir por marcos."*
4. **El dinero entra a cuentas de personas distintas.** *"A veces son en mi tarjeta, a
   veces son las de Marce."*
5. **Cierre semanal.** *"A lo mejor que lo podamos hacer semanal, todo semanal, para que
   todo cuadre."*
6. **Gasto por material y fugas.** *"En promedio estás gastando tanto al mes de marcos o
   de legos"*; *"no sé exactamente en qué me estoy yendo más, o si hay alguna fuga."*
7. **Tres roles con tareas asignadas.** *"Que va a entrar Elita, entonces Elita, Marse y
   yo... dividirlo para que le salgan tareas asignadas, que cada quien tenga un rol y que
   juntos se vinculen."*

## Reglas duras heredadas de las otras apps

Estas ya costaron caro en `mi-cartera` y en las apps de la fábrica. No re-descubrirlas.

1. **Un aviso NUNCA bloquea.** Si falta material, la app lo dice y deja seguir. Es regla
   explícita del autor: *"no es restrictivo ninguna de las aplicaciones; no le va a dejar
   de hacer la tarea, le va a hacer un aviso."* Eso es UI — la seguridad va en las reglas
   de Firestore, que sí bloquean.
2. **Todo movimiento de dinero pasa por una transacción con deltas parciales.** Nunca
   `set()` del documento completo desde memoria: eso fue el bug del 27-ago en `mi-cartera`
   (una pestaña vieja pisando al servidor, $1,380 perdidos). Aquí el riesgo es mayor
   porque hay **tres personas escribiendo a la vez**, no una.
3. **Ningún saldo se guarda si se puede derivar.** Lo que se debe de un pedido se calcula
   desde sus cobros; no hay un campo `pagado` que se pueda descuadrar.
4. **Validar todo lo que viene de Firestore** (`Number.isFinite`, arrays, regex): un dato
   corrupto no debe romper la app ni propagar `NaN`.
5. **`escapeHtml()` en todo texto de usuario** que se interpole en `innerHTML`. Aquí hay
   nombres de clientes y notas libres: superficie amplia.
6. **Un solo commit por tanda** — GitHub Pages atasca su cola de deploys.
7. **El letrero de versión sale de `document.lastModified`**, nunca de un texto a mano.

## Huecos reales — preguntar, no inventar

| Hueco | Por qué detiene |
|---|---|
| **Cómo registra hoy sus ventas** | Quedó en mandar un ejemplo y no ha llegado. Sin eso, el catálogo de piezas y de materiales lo estaría inventando yo |
| **Precios por tipo de pieza y tamaño** | Sin precio no hay total, y sin total no hay "cuánto me deben" |
| **Tiempo de elaboración por pieza** | Es lo que falta para que la prioridad sea real y no una estimación |
| **Anticipo: si lo pide y de cuánto** | Ella misma dijo que a veces no cobra |
| **Lista real de materiales y cuánto lleva cada pieza** | Es la receta de la que sale el aviso de faltante |
| **Correos de Gaby y de Marcela** | Hacen falta para crear sus usuarios |

## Estado

🔴 **En construcción.** Junta con Gaby y Marcela el **miércoles 2 de septiembre de 2026,
5 de la tarde**.
