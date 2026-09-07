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
| ~~**Cómo registra hoy sus ventas**~~ | **Resuelto el 7-sep-2026**: llegaron fotos del cuaderno. Cobros como *monto · clienta · fecha (+ hora del comprobante)* bajo "Banbajío depósitos"; gastos como *monto · concepto · fecha*, mezclando material con pagos a personas (Vic, Eli, Gaby); cierre periódico *entró − gastos = entregado a Gaby Nu*. Detalle en la nota SAGA del proyecto |
| **Precios por tipo de pieza y tamaño** | Sin precio no hay total, y sin total no hay "cuánto me deben" |
| **Tiempo de elaboración por pieza** | Es lo que falta para que la prioridad sea real y no una estimación |
| **Anticipo: si lo pide y de cuánto** | Ella misma dijo que a veces no cobra |
| **Lista real de materiales y cuánto lleva cada pieza** | Es la receta de la que sale el aviso de faltante |
| **Correos de Gaby y de Marcela** | Hacen falta para crear sus usuarios |

## Estado

✅ **En producción y vendida** (5-sep-2026, $3,500, gestión sola). Empiezan a usarla el lunes
7 de septiembre de 2026.

## Elita pasó de `apoyo` a `socia` (7-sep-2026)

El primer día de uso Elita mandó un video: no encontraba dónde meter en "salió" la compra
de servilletas ni dónde registrar el anticipo de una clienta ("sale debe 750 y no veo
dónde poner que ya pagó"). No era una falta de la app —los pagos parciales y los gastos
existen— sino el rol: `apoyo` no ve "registrar pago" ni "+ gasto". En la práctica ella sí
opera cobros y compras, así que se le dio `socia` (en `sembrar-miembros.mjs`; se aplica con
`node sembrar-miembros.mjs`). El rol se lee al entrar (`getDoc` en el login): hay que cerrar
sesión y volver a entrar para que aparezcan los botones. Con esto el hueco
"[POR CONFIRMAR] si Elita ve el dinero" queda resuelto por los hechos: sí lo ve y lo mueve.

## La pestaña "mi página" (31-ago-2026)

Esta app también es el **editor de la página pública**. Gaby y Marcela cambian
ahí los textos y las fotos del sitio y le dan a publicar; el rol `apoyo` (hoy nadie; Elita fue `apoyo` hasta el 7-sep) no ve
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
- **La interfaz espeja los roles** (`operaDinero()`, `esDuena()` del cliente): un `apoyo` no ve
  "registrar pago", "+ gasto", "corregir" ni el costo de una compra. No es seguridad —eso son
  las reglas—, es no enseñar un botón que va a fallar.
- **Origen del pedido** (`origen`: instagram · anuncio · recomendacion · pagina · repite ·
  otro) en el alta, prellenado con "la página web" cuando viene pegado, y una tarjeta "De
  dónde llegaron" en el resumen. Es lo que Marcela pidió para saber si el anuncio se paga.
- Barato pero real: "cargando" ya no se ve como "no hay nada"; `pintarTodo()` atrapa un dato
  corrupto y lo dice en pantalla; al volver la señal se reengancha `escuchar()`; `.btn` con
  `min-height:44px`.

## Envío cobrado, anticipo en el alta y corrección del pedido (7-sep-2026)

Primer día de uso real. Beto pidió tres cosas el mismo día y las tres entraron juntas
porque son el mismo momento de captura: *"cuando es con envío, esos ciento cincuenta pesos
están dados"*, *"que pueda decir que el adelanto... pedimos cincuenta por ciento de
anticipo, y decidan a qué cuenta se lo envían"*, y *"que los mismos pedidos los puedas
EDITAR"*. Lo que quedó, para no re-discutirlo:

- **El envío que paga la clienta es `envioCobradoCent`, y NO es el gasto de la guía.** Son
  dos cifras distintas: la guía sigue siendo un gasto de categoría `envio`. Va dentro de
  `totalCent` (es lo que ella debe) pero guardado aparte, para poder decir después cuánto
  fue trabajo y cuánto paquetería trasladada.
- **La tarifa no se prellena y NO está escrita en el código.** Ganó Codex el argumento de
  no prellenarla; el mismo día se vio por qué: Beto dijo $150 por la mañana y $250 por la
  tarde, porque cambia con el destino. `envioSugerido()` ofrece **el último envío que de
  verdad cobraron** (el pedido con envío más reciente por `creadoEn`) y solo cae a
  `ENVIO_INICIAL_CENT` ($150) mientras no exista ninguno. Así la sugerencia se ajusta sola
  cuando suba la paquetería y nadie tiene que venir a tocar el código.
- **El envío NO depende del tipo de entrega** *(corregido la misma tarde)*. La primera
  versión solo mostraba el campo en pedidos foráneos y las reglas exigían que un pedido
  `local` llevara envío cero. Beto lo cazó al capturar un pedido de Puebla que sí llevaba
  envío: **también mandan dentro de la ciudad**. "Foráneo" solo significa que hay que
  restar los días de paquetería a la fecha de entrega (`fechaOperativa()`); llevar envío es
  otra cosa. Hoy el campo está siempre visible y vacío, y al elegir "foráneo" se rellena
  solo si está vacío, porque ahí seguro se cobra.
- **El anticipo se captura en el alta**, con su cuenta y su fecha (editable: si el depósito
  llegó ayer, forzarlo a hoy falsea el cierre de la semana). Se guarda como un pago normal
  en `cobros`, así que se corrige con la reversión de siempre. **Va en la MISMA
  transacción que el pedido**: o quedan los dos o ninguno, porque un pedido guardado sin su
  anticipo se cobra dos veces. Por eso `pedidoExiste()` en las reglas pasó de `exists()` a
  `existsAfter()`.
- **El 50% sugerido es la mitad del total, envío incluido**, redondeada con `Math.round`.
  El botón lo pone; el campo nunca se llena solo.
- **Vacío no es lo mismo que inválido.** Un anticipo vacío o en cero significa que no dio
  nada; un `-50` o un `abc` es un error de captura y se avisa. Con `montoEnCentavos()` a
  secas los tres casos eran `null` y el pedido se guardaba sin el anticipo, en silencio.
- **`totalCent` y `renglones` ya NO son inmutables: son corregibles CON RASTRO.** El caso
  que ganó Codex el 4-sep sigue siendo real (bajar el total deja el pedido sobrepagado),
  pero ya no es invisible. Cada corrección escribe un documento en `pedidosCambios` con el
  antes, el después, el motivo, quién, cuándo y cuánto se había pagado, **en la misma tanda
  que el cambio**, y las reglas rechazan el update sin él.
- **La auditoría tiene que ser NUEVA y tiene que cuadrar.** `!exists() && existsAfter()`
  prueba que nació en esa tanda: sin eso se podía sembrar una auditoría hoy y usarla
  mañana, o reusar la de un ida y vuelta $100 → $200 → $100 (hallazgo crítico de Codex).
  Y `auditoriaCuadra()` amarra en las dos direcciones total, envío, renglones y cliente.
  La reciprocidad se cierra desde `pedidosCambios`: el pedido tiene que quedar apuntando a
  esa auditoría y con su mismo total.
- **Listas blancas en el update de pedidos.** La rama de todos los días solo deja tocar
  `estado` y `fechaComprometida`; la de corrección, los cinco campos del dinero más
  `correccionOpId`. Antes, por SDK, cualquier miembro podía cambiar el cliente, las notas o
  `creadoPor`.
- **`subtotalPiezasCent`** existe solo para que las reglas puedan exigir
  `total == piezas + envío`: no saben sumar una lista de renglones de largo variable.
- **La corrección edita un solo renglón** y rechaza los pedidos que tengan varios, porque
  reemplazaría el arreglo entero y perdería los demás con sus recetas. El alta hoy siempre
  crea uno.
- **"Vendiste" incluye el envío** —es lo que la clienta debe— pero la tarjeta lo dice y
  muestra aparte cuánto fue de piezas. Un mes con muchos foráneos inflaba la cifra sin que
  se notara.

**El envío cobrado es el PRECIO, no la ganancia** *(duda de Elita, 7-sep)*. Preguntó si
en ese campo va lo que le cobran a la clienta o los $250 menos lo que cuesta la guía. Va el
precio completo: los $250. Las guías las compran **por paquete** (en el cuaderno de Marcela
aparece "guías 1,940"), así que ese desembolso se registra una vez como gasto el día que
compran el paquete, no partido pedido por pedido. La ganancia del envío sale sola de restar
las dos cosas en el resumen; si se capturara la ganancia en vez del precio, el total del
pedido dejaría de ser lo que la clienta debe y el saldo saldría mal.

**Riesgo aceptado:** no se exige `creadoEn == request.time` en la auditoría. Amarrarlo
evitaría fechar el rastro en otro día, pero si `serverTimestamp()` no resolviera exactamente
a `request.time` toda corrección quedaría bloqueada, y eso no se puede comprobar sin
emulador. Falsear esa fecha exige un cliente manipulado por una de las tres personas del
negocio, y el cambio en sí ya no se puede ocultar.

## Etapas del proceso y filtros de la lista (7-sep-2026, noche)

Elita, en un audio del primer día: *"poder poner fondo listo, marco listo, figuras listas…
etiquetas al mismo pedido para saber cómo va"*. Y Beto, después: *"filtrar por varios: de
dónde son, cuándo se entrega, en qué urgencia, si son de Puebla o de otro estado"*. Codex
cambió el diseño de las etapas antes de escribirlo, y no se re-discute:

- **Las etapas viven EN CADA PEDIDO, no en un catálogo global.** Unas servilletas no llevan
  "marco listo"; un "3 de 5" contra un catálogo ajeno sería mentira. `config/etapas` es
  solo la plantilla que se copia al pedido al crearlo (`plantillaEtapas()`); desde ahí cada
  pedido es dueño de las suyas y se agregan o quitan una por una. Los pedidos que ya
  existían no tienen etapas: en su detalle hay un botón *poner las etapas de siempre*.
- **Cada etapa tiene un ID ESTABLE** (`e_fondo`, `e_` + opId para las nuevas), nunca su
  nombre ni su posición. Renombrarla en el catálogo no desconecta las marcas viejas. El
  pedido guarda también el nombre como respaldo: una etapa borrada del catálogo **sigue
  contando** en los pedidos que ya la tenían.
- **Se guarda campo por campo**: `etapas.<id>.hecha` con `updateDoc`, `deleteField()` para
  quitar, nunca el mapa entero. Dos personas marcando etapas distintas del mismo pedido se
  fusionan. Cada marca se guarda al instante, sin "guardar cambios".
- **El detalle solo manda lo que cambió** (`estado`, `fechaComprometida`). Hallazgo de Codex
  sobre un bug viejo: si Elita abría el pedido en "nuevo", Gaby lo pasaba a "proceso" y
  Elita solo movía la fecha, el guardado lo regresaba a "nuevo".
- **Todas las etapas hechas NO cambia el estado solo.** Aparece un aviso dentro del diálogo
  con un botón que mueve el `<select>` a "listo"; guardar sigue siendo de la persona. Un
  pedido "listo" al que le desmarcan una etapa muestra la inconsistencia, no se degrada.
- **`etapasDe()` sanea al leer**: las reglas solo pueden exigir que `etapas` sea un mapa de
  hasta 12 (`etapasValidas()`), no mirar dentro. Una entrada sin nombre, con `hecha` que no
  sea exactamente `true`, o un arreglo en vez de mapa, se ignoran sin tronar.
- **El catálogo se edita por renglones** (input + quitar + agregar), no con el textarea de
  cuentas: un textarea no distingue "renombré" de "borré una y agregué otra", y aquí el id
  importa. Cualquier miembro marca etapas (es trabajo de taller, no dinero); el catálogo lo
  cambia la dueña. Borrar `config/etapas` equivale a volver a las cinco de siempre.
- **El repintado de etapas comprueba la generación del diálogo.** El `<dialog>` es único y
  `#etapas-pedido` existe en cualquier pedido abierto: marcar una etapa en A, cerrar y abrir
  B antes de que respondiera el servidor repintaba el cuerpo de B con las etapas de A y
  reenganchaba las casillas contra A — la siguiente palomita escribía en el pedido
  equivocado, sin error visible. Lo cazaron Codex y `code-reviewer` por separado.
  `engancharEtapas()` guarda `generacionDialogo`, el nodo y el `pedidoId`, y exige los tres.
- **`etapasDe()` valida el id con `/^e_[A-Za-z0-9]{1,30}$/` y recorta el nombre a 60 al
  LEER.** Un `e_mala.ruta` escrito por SDK se leería bien, pero al marcarlo
  `etapas.e_mala.ruta.hecha` tocaría otra cosa (el punto separa rutas en Firestore); y un
  nombre de varios KB rompería la pantalla de las tres. Las reglas no pueden mirar dentro
  del mapa, así que el saneo al leer es la única defensa.
- **Corregir el tipo de entrega y la ciudad** *(Elita, 7-sep: capturó como Puebla un pedido
  que era para la Ciudad de México)*. Va por el camino auditado: no es dinero, pero cambia
  la urgencia por los días de paquetería, y la auditoría amarra `entrega` y `ciudad` en las
  dos direcciones igual que el total.
- **Filtros**: `filtrarPedidos(items, f, hoy)` es puro y recibe `hoy` para probarse. Seis
  `<select>` (estado · Puebla/foráneo · urgencia · cuándo se entrega · origen · etapa), y
  el valor vive en `filtrosPedidos`, no en el DOM, para sobrevivir al repintado. Con
  "estado" en algo distinto de *abiertos* se incluyen entregados y cancelados. "Urgentes"
  son los rangos 0–3 de `urgencia()`, así que **un foráneo para dentro de 3 días es
  urgente**, no próximo: la paquetería le come los días.
- **"Vencidos" es la fecha PROMETIDA, no la operativa.** Usar `u.dias` (que a un foráneo le
  resta los 3 días) hacía salir como vencido un pedido que se entrega en tres días solo
  porque ya debió salir del taller. Eso es urgencia, y para eso está el otro filtro.

**Riesgos aceptados a conciencia:** el reintento tras recargar la página no es idempotente
(el `opId` se pierde con la recarga); `fechaValida` de las reglas deja pasar el 31 de febrero
(la app lo frena); las credenciales de `verificar-reglas.mjs` viven en claro en el disco de
Beto (gitignored) — Codex sugiere rotarlas; es decisión suya.
