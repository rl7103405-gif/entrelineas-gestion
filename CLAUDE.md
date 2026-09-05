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

## La pestaña "mi página" (31-ago-2026)

Esta app también es el **editor de la página pública**. Gaby y Marcela cambian
ahí los textos y las fotos del sitio y le dan a publicar; Elita (`apoyo`) no ve
esa pestaña, y las reglas la bloquean aunque intentara escribir por SDK.

Cómo está armado, para no re-discutirlo:

- Los textos de fábrica viven en el HTML de `pagina-web/index.html`, marcados con
  `data-ed`. Aquí solo se guarda **lo que alguien cambió**. Si Firestore falla, la
  página se ve como está escrita: es imposible dejarla en blanco desde aquí.
- `contenido-defecto.js` es **generado** — sale de `node extraer-defectos.mjs` en
  `pagina-web/`. No se edita a mano. Después de cambiar un texto del HTML hay que
  volver a correrlo o el botón de "restaurar" restaura algo que ya no existe.
- Dos documentos: `sitio/borrador` (privado) y `sitio/publico` (lectura abierta a
  internet). Publicar hace `setDoc` **sin merge**, para que una clave borrada del
  borrador desaparezca de la página de verdad.
- Los textos viajan como **un string de JSON**, no como un mapa. Las reglas de
  Firestore no saben recorrer los valores de un mapa pero sí medir un string: así
  el tope de tamaño es real.
- Las fotos son documentos `sitioFotos/foto-00` … `foto-19`, con la imagen en
  `bytes` (no base64: pesa 33% menos) y tope de 280 KB. Los ids son fijos porque
  es la única forma de que las reglas pongan un techo al número de fotos.
- No se usó Firebase Storage: desde febrero de 2026 exige plan Blaze y este
  proyecto está en Spark.

**La regla que no se puede romper:** la página pública arma **nodos del DOM**
para pintar lo editado, nunca `innerHTML`. El texto lo escribe una persona de
confianza, pero se muestra a todo internet, y las reglas de Firestore no pueden
revisar lo que dice. Si alguien cambia eso por `innerHTML`, abre un XSS.

## Resumen e indicadores (4-sep-2026)

Lo que Gaby y Marcela pidieron en la junta del 2 de septiembre, textual: *"gráfica de pastel
de gastos, 20% marcos, 30% impresión"* y *"un resumen del mes con comparación contra el mes
anterior: este mes ganaste 20% más y gastaste 15% más"*. Decisiones que no hay que re-discutir:

- **La venta nace cuando se captura el pedido** (`creadoEn` → fecha civil), no en
  `fechaSolicitada`, que es cuándo la clienta quiere la pieza. Antes el resumen contaba por
  esa fecha y un pedido capturado hoy para diciembre se "vendía" en diciembre. Función
  `fechaAltaDe()`; cae a `fechaSolicitada` solo si no hay `creadoEn` (datos viejos).
- **La comparación es pareja o lo dice.** Si el periodo es el corriente, se compara "hasta
  hoy" contra los mismos días del anterior (`compararPeriodos()`). Si el mes pasado tuvo
  menos días que los transcurridos (31 de marzo contra febrero), se compara contra el mes
  completo y la leyenda lo dice: la bandera `parejo` decide el texto. Nunca se finge.
- **Porcentaje solo con base positiva.** Sin base, se enseña el monto anterior. El balance
  —y el cobrado, que puede ser negativo por reversiones— cruzan de signo, y ahí el
  porcentaje miente (de −$100 a +$100 daría −200%): `textoBalance()` lo dice con palabras.
- **Texto neutro, sin verde ni rojo en los deltas.** "Gastaste más" puede ser inventario para
  crecer y "cobraste más" puede ser una venta vieja que por fin pagaron. El color solo marca
  el signo del saldo, no juzga la tendencia.
- **El pastel agrupa las compras por NOMBRE de material** (vía `materialId`) y lo demás por
  categoría. Es lo que hace posible "20% marcos" sin cambiar el modelo. Lo que pesa menos del
  3% se junta en "otros", y si ya existe un material llamado así, se fusiona.
- **Una reversión no es un gasto.** En movimientos va dentro de "entró", en negativo y
  rotulada "corrección de pago". Nunca cae en el filtro "salió".
- **Solo se pinta la pestaña activa**, coalescido con `requestAnimationFrame` (`PINTORES`).
  Antes cada snapshot repintaba las siete pantallas y perdía lo que el usuario tenía elegido.
  `irA()` repinta al cambiar, así que la pestaña que se abre siempre llega fresca.
- **Todo es derivación en el cliente.** Ni un campo nuevo ni una regla tocada. La lógica vive
  antes del letrero PANTALLAS para que `test-logica.mjs` la extraiga (hoy 96 pruebas).
- `esFechaValida()` reconstruye año/mes/día: `new Date('2026-02-31')` no falla, JavaScript
  lo corre al 3 de marzo, y antes esa fecha pasaba.

**Lo que la junta pidió y NO entró, por la regla de una feature por sesión, está en
`IDEAS.md`** (ignorado por git: trae detalles del trato). Lo más urgente ahí: capturar el
**origen del pedido** antes del lunes 7, que es cuando empiezan a usarla.

## El flujo de pagos, endurecido antes del arranque (4-sep-2026, tarde)

Beto pidió *"que los pagos estén bien"* antes del lunes 7. Codex auditó el flujo de punta a
punta y esto es lo que quedó, para no re-discutirlo:

- **Cada movimiento de dinero e inventario usa su `opId` como id del documento** (`setDoc`,
  no `addDoc`), y las reglas exigen `opId == id`. El `opId` se genera **al abrir el diálogo**,
  no al tocar el botón: si el primer intento sí llegó y la respuesta se perdió, el reintento
  choca con el primero y `escribirIdempotente()` lo reconoce como "ya estaba". Nunca hay dos.
- **La única corrección de un pago es revertirlo completo, una vez.** Botón *corregir* en el
  detalle del pedido; el documento se llama `rev-<idDelPago>` y las reglas exigen que
  coincida en pedido, monto y cuenta con el original (`reversionValida`). Nada de
  reversiones parciales: se revierte y se registra el pago bueno. La reversión lleva la
  fecha de hoy, no la del pago.
- **El folio es el id del pedido**, creado dentro de `runTransaction`: dos personas pegando
  el mismo WhatsApp a la vez no pueden duplicarlo. Las reglas exigen `folio == id`.
- **`totalCent` y `renglones` son inmutables en las reglas.** Codex lo ganó con un caso: pedido
  de $1,500 con $500 pagados, alguien baja el total a $500 y el pedido desaparece de "cuentas"
  con $1,000 sin cobrar. Si un precio se capturó mal: cancelar, volver a capturar, corregir el
  pago y registrarlo en el nuevo. Un "corregir precio" con auditoría está en `IDEAS.md`.
- **Compra de material + su gasto van en un `writeBatch`** con ids `op` y `op-g`. Antes eran
  dos escrituras y la segunda podía fallar sola. El gasto exige cuenta (las reglas también).
- **Las cuentas de cobro son un catálogo** en `config/cuentas` que edita la dueña (botón en
  "cuentas"), con default Nu · Gaby, Banbajío · Marce y efectivo — lo que dijeron en la
  junta. Antes el selector ofrecía los NOMBRES de los miembros, que no son cuentas. El pago
  guarda el nombre tal cual: renombrar una cuenta no toca el historial.
- **Gastos: `update` cerrado, `delete` solo dueña y con lápida** en `gastosBorrados` (misma
  tanda atómica). No son libro inmutable por decisión ya escrita arriba, pero borrar sin
  rastro descuadraba cierres ya vistos.
- **La interfaz espeja los roles** (`operaDinero()`, `esDuena()` del cliente): Elita no ve
  "registrar pago", "+ gasto", "corregir" ni el costo de una compra. No es seguridad —eso son
  las reglas—, es no enseñar un botón que va a fallar.
- **Origen del pedido** (`origen`: instagram · anuncio · recomendacion · pagina · repite ·
  otro) en el alta, prellenado con "la página web" cuando viene pegado, y una tarjeta "De
  dónde llegaron" en el resumen. Es lo que Marcela pidió para saber si el anuncio se paga.
- Barato pero real: "cargando" ya no se ve como "no hay nada"; `pintarTodo()` atrapa un dato
  corrupto y lo dice en pantalla; al volver la señal se reengancha `escuchar()`; `.btn` con
  `min-height:44px`.

**Riesgos aceptados a conciencia:** el reintento tras recargar la página no es idempotente
(el `opId` se pierde con la recarga); `fechaValida` de las reglas deja pasar el 31 de febrero
(la app lo frena); las credenciales de `verificar-reglas.mjs` viven en claro en el disco de
Beto (gitignored) — Codex sugiere rotarlas; es decisión suya.
