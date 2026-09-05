// Pruebas de la lógica que decide cosas de dinero y de prioridad en Entre Líneas.
//
// Extrae las funciones del index.html REAL (no las reimplementa) y las ejercita fuera del
// navegador, igual que test-dinero.mjs en mi-cartera. Cubre los tres puntos donde una
// falla se traduce en un problema de negocio: cobrar de menos, trabajar el pedido
// equivocado, y comprar material que no hacía falta.
//
//   node test-logica.mjs

import fs from 'fs';

const APP = process.env.APP || 'C:/Users/elita/Desktop/ENTRELINEAS/gestion/index.html';
const HTML = fs.readFileSync(APP, 'utf8');

// ── se extrae el bloque de funciones puras del archivo real ────
function extrae(desde, hasta) {
  const i = HTML.indexOf(desde);
  if (i < 0) throw new Error('no encontrado: ' + desde);
  const j = HTML.indexOf(hasta, i);
  if (j < 0) throw new Error('fin no encontrado: ' + hasta);
  return HTML.slice(i, j);
}

const fuente =
  extrae('const aCent =', '// ═══════════════════════════════════════════════════════════════\n//  ESTADO') +
  // hasta antes de `const estado`: ese lo inyecta la prueba como parámetro
  extrae("const ESTADOS =", 'const estado = {') +
  extrae('function cobrosDe', '// ═══════════════════════════════════════════════════════════════\n//  PANTALLAS');

const api = new Function('estado', fuente + `
  return {aCent, dinero, esFechaValida, habilesEntre, restaHabiles, hoyISO,
          saldoDe, pagadoDe, fechaOperativa, urgencia, pedidosOrdenados,
          existencia, consumido, faltantes, semanaActual, enSemana, DIAS_PAQUETERIA,
          parseBloqueEL, PIEZAS_EL, rangoPeriodo,
          // indicadores (4-sep-2026)
          fechaCivilDe, fechaAltaDe, fmtCorto, compararPeriodos, totalesEn, deltaPct,
          textoDelta, textoBalance, gastosParaPastel, rebanadas, arcosDonut,
          movimientosDe, agruparPorDia, limitarPorDias, montoCobro, porCuentaDe};
`);

// ── utilidades de prueba ───────────────────────────────────────
let fallos = 0, total = 0;
function chk(nombre, cond, detalle = '') {
  total++;
  if (cond) console.log('  PASA  ' + nombre);
  else { fallos++; console.log('  FALLA ' + nombre + (detalle ? '  -> ' + detalle : '')); }
}
const nuevoEstado = () => ({pedidos: [], cobros: [], materiales: [], invMovs: [],
                            gastos: [], tareas: [], miembros: []});
// una fecha futura estable, para no depender del día en que se corran las pruebas
function enDias(n) {
  const d = new Date(); d.setDate(d.getDate() + n);
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

// ═══════════ 1. LO QUE LE DEBEN — el dolor #1 de Gaby ═══════════
console.log('\n1. Saldo de un pedido: se deriva de los cobros, nunca se guarda');
{
  const e = nuevoEstado();
  e.pedidos = [{id:'p1', totalCent: 150000, estado:'nuevo'}];       // $1,500
  const t = api(e);
  chk('sin pagos, debe todo', t.saldoDe(e.pedidos[0]) === 150000);

  e.cobros.push({id:'c1', pedidoId:'p1', tipo:'pago', montoCent: 50000});
  chk('con un anticipo de $500 debe $1,000', t.saldoDe(e.pedidos[0]) === 100000);

  e.cobros.push({id:'c2', pedidoId:'p1', tipo:'pago', montoCent: 100000});
  chk('pagado completo queda en cero', t.saldoDe(e.pedidos[0]) === 0);

  // El caso que motivó el libro inmutable: alguien se equivocó y hay que corregir SIN
  // borrar, para que el historial siga contando lo que de verdad pasó.
  e.cobros.push({id:'c3', pedidoId:'p1', tipo:'reversion', montoCent: 100000, refCobroId:'c2'});
  chk('una corrección devuelve el saldo, no rompe nada', t.saldoDe(e.pedidos[0]) === 100000);
  chk('y los cobros siguen ahí para poder auditar', t.pagadoDe('p1') === 50000);

  e.cobros.push({id:'c4', pedidoId:'p1', tipo:'pago', montoCent: 120000});
  chk('un sobrepago se ve en negativo, no se esconde en cero',
      t.saldoDe(e.pedidos[0]) === -20000, 'dio ' + t.saldoDe(e.pedidos[0]));
}

console.log('\n2. Los centavos son enteros: nada de 0.1 + 0.2');
{
  const t = api(nuevoEstado());
  chk('$0.10 + $0.20 da exactamente $0.30', t.aCent(0.1) + t.aCent(0.2) === t.aCent(0.3));
  chk('$1,234.56 se guarda como 123456', t.aCent(1234.56) === 123456);
  chk('y se muestra de vuelta igual', t.dinero(123456) === '$1,234.56', t.dinero(123456));
  chk('un negativo lleva el signo ANTES del símbolo: "−$50.00", no "$-50.00"',
      t.dinero(-5000) === '−$50.00', t.dinero(-5000));
}

// ═══════════ 3. PRIORIDAD — lo que hoy lleva en papel ═══════════
console.log('\n3. Un envío foráneo tiene que estar listo ANTES: 3 días de paquetería');
{
  const e = nuevoEstado();
  const t = api(e);
  const entrega = '2026-09-18';                    // viernes
  const local = {id:'a', estado:'nuevo', entrega:'local',   fechaComprometida: entrega};
  const fuera = {id:'b', estado:'nuevo', entrega:'foraneo', fechaComprometida: entrega};
  chk('el local se trabaja hasta la fecha de entrega', t.fechaOperativa(local) === entrega);
  chk('el foráneo tiene que salir 3 días hábiles antes (martes 15)',
      t.fechaOperativa(fuera) === '2026-09-15', 'dio ' + t.fechaOperativa(fuera));
  chk('son los días que ella dio, ni más ni menos', t.DIAS_PAQUETERIA === 3);
}

console.log('\n4. Los días hábiles no cuentan sábado ni domingo');
{
  const t = api(nuevoEstado());
  chk('de viernes a lunes hay 1 día hábil',
      t.habilesEntre('2026-09-18','2026-09-21') === 1, 'dio ' + t.habilesEntre('2026-09-18','2026-09-21'));
  chk('de lunes a viernes hay 4', t.habilesEntre('2026-09-14','2026-09-18') === 4);
  chk('restar 3 hábiles a un lunes cae en el miércoles anterior',
      t.restaHabiles('2026-09-21', 3) === '2026-09-16', 'dio ' + t.restaHabiles('2026-09-21',3));
}

console.log('\n5. La cola pone arriba lo que se pierde, no lo que se ve bonito');
{
  const e = nuevoEstado();
  e.pedidos = [
    {id:'tranquilo', folio:'F5', estado:'nuevo',  entrega:'local',   fechaComprometida: enDias(40)},
    {id:'sinfecha',  folio:'F1', estado:'nuevo',  entrega:'local',   fechaComprometida: null},
    {id:'vencido',   folio:'F2', estado:'proceso',entrega:'local',   fechaComprometida: enDias(-5)},
    {id:'porenviar', folio:'F3', estado:'listo',  entrega:'foraneo', fechaComprometida: enDias(20)},
    {id:'entregado', folio:'F9', estado:'entregado', entrega:'local',fechaComprometida: enDias(1)},
    {id:'cancelado', folio:'F8', estado:'cancelado', entrega:'local',fechaComprometida: enDias(1)}
  ];
  const t = api(e);
  const orden = t.pedidosOrdenados().map(x => x.p.id);
  chk('1º el que no tiene fecha confirmada', orden[0] === 'sinfecha', orden.join(' > '));
  chk('2º el que ya se pasó', orden[1] === 'vencido', orden.join(' > '));
  chk('3º el que está listo y falta enviarlo', orden[2] === 'porenviar', orden.join(' > '));
  chk('al final el que tiene tiempo', orden[orden.length-1] === 'tranquilo');
  chk('los entregados y cancelados salen de la cola',
      !orden.includes('entregado') && !orden.includes('cancelado'));
  chk('un pedido sin fecha se explica, no se inventa una',
      t.urgencia(e.pedidos[1]).texto.includes('confirmar'));
}

// ═══════════ 6. MATERIAL — el ejemplo que dio ella ═══════════
console.log('\n6. El ejemplo de Gaby: 10 marcos con 2 legos cada uno, y no alcanza');
{
  const e = nuevoEstado();
  e.materiales = [{id:'marco', nombre:'marcos', unidad:'piezas'},
                  {id:'lego',  nombre:'figuras LEGO', unidad:'piezas'}];
  e.pedidos = [{id:'p1', folio:'F1', estado:'nuevo', renglones:[
    {id:'r1', nombre:'cuadro LEGO', cantidad:10,
     receta:[{materialId:'marco', cantidad:1}, {materialId:'lego', cantidad:2}]}
  ]}];
  // en el almacén hay 9 marcos y 8 legos, justo como en su ejemplo
  e.invMovs = [{materialId:'marco', tipo:'compra', cantidad:9},
               {materialId:'lego',  tipo:'compra', cantidad:8}];
  const t = api(e);
  chk('existencia sale de los movimientos, no de un campo guardado',
      t.existencia('marco') === 9 && t.existencia('lego') === 8);
  const f = t.faltantes();
  const marco = f.find(x => x.material.id === 'marco');
  const lego  = f.find(x => x.material.id === 'lego');
  chk('avisa que falta 1 marco', marco && marco.falta === 1, JSON.stringify(marco));
  chk('y que faltan 12 figuras (20 que pide, 8 que hay)', lego && lego.falta === 12);
  chk('y dice para qué pedido es', marco.pedidos.includes('F1'));
}

console.log('\n7. El material ya entregado no se cuenta dos veces');
{
  const e = nuevoEstado();
  e.materiales = [{id:'marco', nombre:'marcos', unidad:'piezas'}];
  e.pedidos = [{id:'p1', folio:'F1', estado:'proceso', renglones:[
    {id:'r1', nombre:'cuadro', cantidad:10, receta:[{materialId:'marco', cantidad:1}]}]}];
  // se compraron 10 y ya se usaron 6 en ese mismo pedido: quedan 4 en almacén y faltan 4
  e.invMovs = [{materialId:'marco', tipo:'compra', cantidad:10},
               {materialId:'marco', tipo:'consumo', cantidad:-6, pedidoId:'p1'}];
  const t = api(e);
  chk('en almacén quedan 4', t.existencia('marco') === 4);
  chk('ya se le entregaron 6 a ese pedido', t.consumido('p1','marco') === 6);
  chk('no falta nada: lo que resta pedir (4) es justo lo que hay',
      t.faltantes().length === 0, JSON.stringify(t.faltantes()));
}

console.log('\n8. Un pedido cancelado deja de pedir material');
{
  const e = nuevoEstado();
  e.materiales = [{id:'m', nombre:'marcos', unidad:'piezas'}];
  e.pedidos = [{id:'p1', folio:'F1', estado:'cancelado', renglones:[
    {id:'r1', nombre:'cuadro', cantidad:100, receta:[{materialId:'m', cantidad:1}]}]}];
  const t = api(e);
  chk('un cancelado no genera faltante fantasma', t.faltantes().length === 0);
}

// ═══════════ 9. LA SEMANA — como ella quiere cuadrar ═══════════
console.log('\n9. La semana va de lunes a domingo');
{
  const t = api(nuevoEstado());
  const s = t.semanaActual();
  chk('empieza en lunes', s.desde.getDay() === 1, 'día ' + s.desde.getDay());
  chk('dura 7 días', Math.round((s.hasta - s.desde) / 86400000) === 7);
  chk('hoy cae dentro', t.enSemana(t.hoyISO(), s));
}

// ═══════════ 10. EL BLOQUE [EL:v1] — el puente con la página ═══════════
console.log('\n10. Un pedido pegado de la página se lee entero');
{
  const t = api(nuevoEstado());
  // un mensaje como el que arma la página de verdad, con texto libre arriba
  const msg = ['Hola! Me llamo Ana López.', 'Quiero un cuadro para mi aniversario.',
    'Les mando fotos de referencia por aquí.', '',
    '[EL:v1]', 'id=EL-260827-K4M9', 'pieza=lego', 'ocasion=Aniversario', 'figuras=2',
    'entrega=foraneo', 'ciudad=Guadalajara, Jalisco', 'fecha=2026-09-10',
    'margen_habiles=10', 'urgencia=comoda', '[/EL]'].join('\n');
  const d = t.parseBloqueEL(msg);
  chk('encuentra el bloque entre el texto libre', d !== null);
  chk('folio tal cual lo tiene la clienta', d.folio === 'EL-260827-K4M9');
  chk('el código de pieza se traduce a nombre legible', d.pieza === 'cuadro LEGO');
  chk('2 figuras → cantidad 2', d.cantidad === 2);
  chk('foráneo con su ciudad', d.entrega === 'foraneo' && d.ciudad === 'Guadalajara, Jalisco');
  chk('la fecha entra como SOLICITADA (no como compromiso)', d.fechaSolicitada === '2026-09-10');

  // la clienta editó el texto de arriba antes de mandar: el bloque sobrevive
  const editado = 'hola cambie todo el texto jeje\n' + msg.slice(msg.indexOf('[EL:v1]'));
  chk('sobrevive aunque el cliente edite el mensaje', t.parseBloqueEL(editado) !== null);

  chk('un mensaje sin bloque devuelve null', t.parseBloqueEL('hola quiero un cuadro') === null);
  chk('un bloque sin folio devuelve null', t.parseBloqueEL('[EL:v1]\npieza=lego\n[/EL]') === null);
  const caja = t.parseBloqueEL('[EL:v1]\nid=EL-1\npieza=cajas\ncantidad=12\nentrega=local\n[/EL]');
  chk('cajas usa cantidad, no figuras', caja.cantidad === 12 && caja.pieza === 'caja de regalo');
  const rara = t.parseBloqueEL('[EL:v1]\nid=EL-2\npieza=lego\nfecha=2026-99-99\n[/EL]');
  chk('una fecha inválida se descarta en vez de colarse', rara.fechaSolicitada === null);
}

console.log('\n11. Los periodos del resumen');
{
  const t = api(nuevoEstado());
  const s = t.rangoPeriodo('semana', 0);
  chk('la semana actual se titula "esta semana"', s.titulo === 'esta semana');
  chk('empieza en lunes', s.desde.getDay() === 1);
  const s1 = t.rangoPeriodo('semana', -1);
  chk('la anterior dura también 7 días', Math.round((s1.hasta - s1.desde)/86400000) === 7);
  chk('y termina donde empieza la actual', s1.hasta.getTime() === s.desde.getTime());
  const m = t.rangoPeriodo('mes', 0);
  chk('el mes actual se titula "este mes"', m.titulo === 'este mes');
  chk('el mes empieza en día 1', m.desde.getDate() === 1);
  const m2 = t.rangoPeriodo('mes', -2);
  chk('dos meses atrás trae nombre y año', /^[a-z]+ \d{4}$/.test(m2.titulo), m2.titulo);
}

// ═══════════ 12. FECHAS QUE JAVASCRIPT "ARREGLA" EN SILENCIO ═══════════
console.log('\n12. Una fecha imposible se rechaza, no se corre al mes siguiente');
{
  const t = api(nuevoEstado());
  chk('31 de febrero NO es válida', t.esFechaValida('2026-02-31') === false);
  chk('31 de abril NO es válida', t.esFechaValida('2026-04-31') === false);
  chk('28 de febrero sí', t.esFechaValida('2026-02-28') === true);
  chk('29 de febrero bisiesto sí', t.esFechaValida('2024-02-29') === true);
  chk('29 de febrero no bisiesto NO', t.esFechaValida('2026-02-29') === false);
  chk('basura no es fecha', t.esFechaValida('hoy') === false && t.esFechaValida(null) === false);
}

// ═══════════ 13. COMPARAR CONTRA EL PERIODO ANTERIOR, PAREJO ═══════════
console.log('\n13. La comparación recorta el anterior a los mismos días');
{
  const t = api(nuevoEstado());
  const iso = d => d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');

  // sábado 5 de septiembre: van 5 días del mes
  const c = t.compararPeriodos('mes', 0, new Date(2026, 8, 5, 15, 30));
  chk('el actual va del 1 al 6 (mañana a medianoche, hoy incluido)',
      iso(c.actual.desde) === '2026-09-01' && iso(c.actual.hasta) === '2026-09-06');
  chk('el anterior son los primeros 5 días de agosto',
      iso(c.anterior.desde) === '2026-08-01' && iso(c.anterior.hasta) === '2026-08-06');
  chk('y la leyenda lo dice', c.leyenda === 'los primeros 5 días de agosto' && c.parcial === true);
  chk('5 de septiembre: agosto tiene sobra de días, sí es parejo', c.parejo === true);

  // 31 de marzo: febrero solo tuvo 28 → se compara contra febrero completo y se avisa
  const f = t.compararPeriodos('mes', 0, new Date(2026, 2, 31, 9));
  chk('día 31 contra febrero: el anterior es febrero entero',
      iso(f.anterior.desde) === '2026-02-01' && iso(f.anterior.hasta) === '2026-03-01');
  chk('y la leyenda dice "completo", no finge mismos días', f.leyenda === 'febrero completo');
  chk('31 de marzo: NO son los mismos días, parejo es false', f.parejo === false);

  // lunes 7 de septiembre: la semana lleva un solo día
  const l = t.compararPeriodos('semana', 0, new Date(2026, 8, 7, 8));
  chk('semana en lunes: un día contra el lunes pasado', l.n === 1 && l.nAnt === 1
      && iso(l.anterior.desde) === '2026-08-31' && iso(l.anterior.hasta) === '2026-09-01');
  chk('leyenda en singular', l.leyenda === 'el primer día de la semana pasada');

  // jueves 10: cuatro días, la semana pasada cruzó de agosto a septiembre
  const j = t.compararPeriodos('semana', 0, new Date(2026, 8, 10, 23, 59));
  chk('semana que cruza de mes: lunes 31 de agosto a viernes 4', j.n === 4
      && iso(j.anterior.desde) === '2026-08-31' && iso(j.anterior.hasta) === '2026-09-04');

  // un periodo ya cerrado se compara completo contra completo
  const p = t.compararPeriodos('mes', -1, new Date(2026, 8, 5));
  chk('agosto completo contra julio completo', p.parcial === false
      && iso(p.actual.desde) === '2026-08-01' && iso(p.actual.hasta) === '2026-09-01'
      && iso(p.anterior.desde) === '2026-07-01' && iso(p.anterior.hasta) === '2026-08-01');
  chk('con nombre y año', p.leyenda === 'julio 2026');

  // a medianoche exacta, hoy sigue contando como un día
  const m = t.compararPeriodos('mes', 0, new Date(2026, 8, 1, 0, 0, 0));
  chk('día 1 a las 00:00 cuenta como 1 día', m.n === 1 && iso(m.actual.hasta) === '2026-09-02');
}

// ═══════════ 14. LOS TEXTOS DE LA COMPARACIÓN NO MIENTEN ═══════════
console.log('\n14. Porcentajes solo cuando tienen base; el balance se dice con palabras');
{
  const t = api(nuevoEstado());
  chk('20% más', t.deltaPct(120, 100) === 20 && t.textoDelta(20) === '▲ +20%');
  chk('15% menos', t.textoDelta(-15) === '▼ −15%');
  chk('sin base no hay porcentaje', t.deltaPct(500, 0) === null && t.textoDelta(null) === null);
  chk('un cambio menor a medio punto es "igual"', t.textoDelta(0.3) === 'igual que antes');
  chk('un actual no finito no produce "−NaN%"', t.deltaPct(NaN, 100) === null && t.deltaPct(undefined, 100) === null);
  chk('nada contra nada es "igual que antes", no "+$0.00"', t.textoBalance(0, 0) === 'igual que antes');
  chk('de pérdida a positivo se dice, no se calcula (daría −200%)',
      t.textoBalance(10000, -10000) === 'pasaste de pérdida a saldo positivo');
  chk('a pérdida también', t.textoBalance(-5000, 10000) === 'pasaste a pérdida');
  chk('los dos positivos: porcentaje', t.textoBalance(20000, 10000) === '▲ +100%');
  chk('los dos negativos: diferencia en pesos', t.textoBalance(-20000, -10000) === '−$100.00 contra el anterior');
  chk('nada de NaN', !/NaN|Infinity/.test(String(t.textoBalance(0, 0))));

  // totales: la venta nace cuando se captura, no cuando la clienta la quiere
  const e = nuevoEstado();
  const ts = d => ({toDate: () => d});
  e.pedidos = [
    {id:'a', totalCent: 100000, estado:'nuevo', creadoEn: ts(new Date(2026, 7, 15)), fechaSolicitada:'2026-12-01'},
    {id:'b', totalCent: 50000,  estado:'nuevo', fechaSolicitada:'2026-08-20'},   // viejo, sin creadoEn
    {id:'c', totalCent: 999999, estado:'cancelado', creadoEn: ts(new Date(2026, 7, 16))}
  ];
  e.cobros = [
    {pedidoId:'a', tipo:'pago', montoCent: 30000, fecha:'2026-08-15'},
    {pedidoId:'a', tipo:'reversion', montoCent: 30000, fecha:'2026-08-16'}
  ];
  const t2 = api(e);
  const ago = t2.totalesEn(e, new Date(2026, 7, 1), new Date(2026, 8, 1));
  chk('el pedido para diciembre se vendió en AGOSTO', ago.vendidos.some(p => p.id === 'a'));
  chk('sin creadoEn cae a la fecha solicitada', ago.vendidos.some(p => p.id === 'b'));
  chk('el cancelado no cuenta', !ago.vendidos.some(p => p.id === 'c') && ago.vendido === 150000);
  chk('pago y reversión se anulan pero SÍ hubo datos', ago.cobrado === 0 && ago.hayDatos === true);
  const dic = t2.totalesEn(e, new Date(2026, 11, 1), new Date(2027, 0, 1));
  chk('y en diciembre no aparece como venta nueva', dic.vendidos.length === 0);
}

// ═══════════ 15. EL PASTEL ═══════════
console.log('\n15. El pastel se arma por nombre de material y no se rompe con una rebanada');
{
  const t = api(nuevoEstado());
  const materiales = [{id:'m1', nombre:'marcos'}, {id:'m2', nombre:'legos'}];
  const gastos = [
    {categoria:'material', materialId:'m1', montoCent: 20000},
    {categoria:'material', materialId:'m1', montoCent: 10000},
    {categoria:'material', materialId:'m2', montoCent: 30000},
    {categoria:'envio', montoCent: 5000},
    {categoria:'publicidad', montoCent: 100},       // 0.15%: va a "otros"
    {categoria:'material', montoCent: 0}             // cero: no aparece
  ];
  const lista = t.gastosParaPastel(gastos, materiales);
  // marcos y legos empatan en $300: el orden entre ellos no importa, la agrupación sí
  const porNombre = Object.fromEntries(lista.map(x => [x.nombre, x.monto]));
  chk('las compras se agrupan por nombre de material', porNombre.marcos === 30000 && porNombre.legos === 30000
      && lista.slice(0, 2).every(x => x.monto === 30000));
  chk('lo demás por categoría legible', lista.some(x => x.nombre === 'envío'));
  chk('un gasto en cero no sale', !lista.some(x => x.monto === 0));
  const rebs = t.rebanadas(lista);
  chk('lo menor al 3% se junta en otros y dice qué incluye',
      rebs.at(-1).nombre === 'otros' && rebs.at(-1).incluye.includes('publicidad'));
  chk('los porcentajes suman 100', Math.abs(rebs.reduce((s,x) => s + x.pct, 0) - 100) < 0.01);
  chk('sin gastos, sin rebanadas', t.rebanadas([]).length === 0);

  // el nombre de material es texto libre: alguien podría llamar a un material "otros" de
  // verdad, y eso NO debe duplicar la rebanada sintética
  const conOtrosReal = [
    {nombre:'otros', monto: 50000},               // >= 3%: rebanada real, grande
    {nombre:'marcos', monto: 940000},
    {nombre:'publicidad', monto: 100}              // < 3%: va al bucket sintético "otros"
  ];
  const rebsColision = t.rebanadas(conOtrosReal);
  const otrosFusionado = rebsColision.filter(x => x.nombre === 'otros');
  chk('no se duplica la rebanada "otros": se fusiona en una sola',
      otrosFusionado.length === 1, JSON.stringify(rebsColision));
  chk('el monto fusionado suma la rebanada real más lo sintético',
      otrosFusionado[0].monto === 50100, otrosFusionado[0].monto);
  chk('el desglose incluye lo que se juntó por chico',
      otrosFusionado[0].incluye.includes('publicidad'));

  const uno = t.arcosDonut([{nombre:'marcos', monto: 100}]);
  chk('una sola rebanada es un círculo, no un arco degenerado', uno.length === 1 && uno[0].circulo === true);
  const dos = t.arcosDonut([{nombre:'a', monto: 50}, {nombre:'b', monto: 50}]);
  chk('dos mitades: dos arcos que empiezan arriba', dos.length === 2 && dos[0].d.startsWith('M 60.00 10.00'));
  const grande = t.arcosDonut([{nombre:'a', monto: 90}, {nombre:'b', monto: 10}]);
  chk('la rebanada de 90% marca el arco grande', / 1 1 /.test(grande[0].d) && / 0 1 /.test(grande[1].d));

  chk('formato corto', t.fmtCorto(123456) === '$1.2k' && t.fmtCorto(1500000) === '$15k'
      && t.fmtCorto(98000) === '$980' && t.fmtCorto(250000000) === '$2.5M' && t.fmtCorto(-123456) === '−$1.2k');
}

// ═══════════ 16. MOVIMIENTOS POR DÍA ═══════════
console.log('\n16. El historial agrupa por día y una reversión no es un gasto');
{
  const e = nuevoEstado();
  e.pedidos = [{id:'p', folio:'EL-1', cliente:{nombre:'Isa'}}];
  e.cobros = [
    {pedidoId:'p', tipo:'pago', montoCent: 100000, cuenta:'nu', fecha:'2026-09-08'},
    {pedidoId:'p', tipo:'reversion', montoCent: 20000, cuenta:'nu', fecha:'2026-09-08'},
    {pedidoId:'p', tipo:'pago', montoCent: 5000, cuenta:'efectivo', fecha:'2026-09-01'}
  ];
  e.gastos = [{concepto:'cinta', categoria:'material', montoCent: 30000, fecha:'2026-09-08'}];
  const t = api(e);
  const movs = t.movimientosDe(e, new Date(2026, 8, 1), new Date(2026, 9, 1));
  chk('la reversión va en "entró", en negativo', movs.find(m => m.titulo.startsWith('corrección')).grupo === 'entro'
      && movs.find(m => m.titulo.startsWith('corrección')).monto === -20000);
  chk('lo más nuevo primero', movs[0].fecha === '2026-09-08' && movs.at(-1).fecha === '2026-09-01');
  const dias = t.agruparPorDia(movs);
  chk('dos días', dias.length === 2 && dias[0].fecha === '2026-09-08');
  chk('el subtotal del día separa lo que entró de lo que salió',
      dias[0].entro === 80000 && dias[0].salio === 30000 && dias[0].movs.length === 3);
  const fuera = t.movimientosDe(e, new Date(2026, 9, 1), new Date(2026, 10, 1));
  chk('fuera del periodo no hay nada', fuera.length === 0);
}

// ═══════════ 17. UNA REVERSIÓN RESTA — un solo lugar ═══════════
console.log('\n17. montoCobro y porCuentaDe: la regla vive en un solo sitio');
{
  const t = api(nuevoEstado());
  chk('un pago cuenta completo', t.montoCobro({tipo:'pago', montoCent: 10000}) === 10000);
  chk('una reversión resta', t.montoCobro({tipo:'reversion', montoCent: 10000}) === -10000);
  const cobros = [
    {tipo:'pago', montoCent: 10000, cuenta:'nu'},
    {tipo:'reversion', montoCent: 4000, cuenta:'nu'},
    {tipo:'pago', montoCent: 5000, cuenta:'efectivo'},
    {tipo:'pago', montoCent: 2000}   // sin cuenta especificada
  ];
  const porCuenta = t.porCuentaDe(cobros);
  chk('agrupa y resta por cuenta', porCuenta.get('nu') === 6000 && porCuenta.get('efectivo') === 5000);
  chk('lo sin cuenta cae en "sin especificar"', porCuenta.get('sin especificar') === 2000);
}

// ═══════════ 18. EL TOPE DEL HISTORIAL CORTA POR DÍAS COMPLETOS ═══════════
console.log('\n18. El tope de movimientos nunca parte un día a la mitad');
{
  const t = api(nuevoEstado());
  const dia = (fecha, n) => ({fecha, movs: Array.from({length:n}, () => ({}))});
  const dias = [dia('2026-09-10', 120), dia('2026-09-09', 90), dia('2026-09-08', 50)];
  const r = t.limitarPorDias(dias, 200);
  chk('se queda con los días completos que caben (120+90=210 > 200 → solo el primero)',
      r.dias.length === 1 && r.dias[0].fecha === '2026-09-10', JSON.stringify(r));
  chk('dice cuántos movimientos quedaron fuera', r.ocultos === 140, r.ocultos);

  const cabenDosDias = [dia('2026-09-10', 80), dia('2026-09-09', 90), dia('2026-09-08', 50)];
  const r2 = t.limitarPorDias(cabenDosDias, 200);
  chk('si caben completos varios días, se quedan todos los que quepan',
      r2.dias.length === 2 && r2.ocultos === 50, JSON.stringify(r2));

  const unDiaEnorme = [dia('2026-09-10', 500)];
  const r3 = t.limitarPorDias(unDiaEnorme, 200);
  chk('un solo día que ya rebasa el tope se queda completo: nunca queda vacío',
      r3.dias.length === 1 && r3.ocultos === 0, JSON.stringify(r3));

  const pocos = [dia('2026-09-10', 5), dia('2026-09-09', 3)];
  const r4 = t.limitarPorDias(pocos, 200);
  chk('si todo cabe, no se oculta nada', r4.dias.length === 2 && r4.ocultos === 0);
}

// ═══════════ 19. LAS REGLAS Y LA APP DEBEN DECIR CASI LO MISMO ═══════════
console.log('\n19. fechaValida() de las reglas coincide con esFechaValida(), salvo el hueco documentado');
{
  const t = api(nuevoEstado());
  // Copia EXACTA del regex de fechaValida() en gestion/firestore.rules. Si alguien cambia
  // uno de los dos sin el otro, esta prueba se rompe.
  const REGEX_REGLAS = /^[0-9]{4}-((0[13578]|1[02])-(0[1-9]|[12][0-9]|3[01])|(0[469]|11)-(0[1-9]|[12][0-9]|30)|02-(0[1-9]|1[0-9]|2[0-9]))$/;
  // 17 casos con el mes y el día en rango: las reglas y la app tienen que coincidir en
  // TODOS estos, porque ninguno depende de si el año es bisiesto.
  const casos = [
    ['2026-01-31', true],    // enero tiene 31
    ['2026-03-31', true],    // marzo tiene 31
    ['2026-05-31', true],    // mayo tiene 31
    ['2026-07-31', true],    // julio tiene 31
    ['2026-08-31', true],    // agosto tiene 31
    ['2026-10-31', true],    // octubre tiene 31
    ['2026-04-30', true],    // abril tiene 30
    ['2026-04-31', false],   // abril NO tiene 31 — el caso que motivó R2
    ['2026-06-30', true],    // junio tiene 30
    ['2026-06-31', false],   // junio NO tiene 31
    ['2026-09-30', true],    // septiembre tiene 30
    ['2026-09-31', false],   // septiembre NO tiene 31
    ['2026-11-30', true],    // noviembre tiene 30
    ['2026-11-31', false],   // noviembre NO tiene 31
    ['2026-02-28', true],    // febrero, año no bisiesto
    ['2026-02-30', false],   // 30 de febrero: nunca existe
    ['2026-02-31', false],   // 31 de febrero: el caso original que motivó fechaValida()
  ];
  chk('son 17 casos', casos.length === 17);
  casos.forEach(([f, esperado]) => {
    chk('regex de las reglas — ' + f, REGEX_REGLAS.test(f) === esperado,
        'esperaba ' + esperado + ', dio ' + REGEX_REGLAS.test(f));
    chk('esFechaValida — ' + f, t.esFechaValida(f) === esperado,
        'esperaba ' + esperado + ', dio ' + t.esFechaValida(f));
  });
  // El único desacuerdo PERMITIDO: 29 de febrero de un año NO bisiesto. El regex de las
  // reglas no sabe calcular bisiestos (documentado en firestore.rules y en CLAUDE.md) y lo
  // deja pasar; esFechaValida() sí reconstruye la fecha y lo rechaza. Si cualquiera de las
  // dos líneas de abajo cambia de resultado, hay que revisar que siga siendo el ÚNICO hueco.
  chk('29 feb no bisiesto: las reglas SÍ lo dejan pasar (hueco documentado)',
      REGEX_REGLAS.test('2026-02-29') === true);
  chk('29 feb no bisiesto: la app SÍ lo rechaza', t.esFechaValida('2026-02-29') === false);
  chk('29 feb bisiesto: las dos coinciden en aceptarlo',
      REGEX_REGLAS.test('2024-02-29') === true && t.esFechaValida('2024-02-29') === true);
}

console.log('\n' + (fallos === 0 ? 'TODO PASA — ' + total + '/' + total
                                 : fallos + ' FALLAS de ' + total));
process.exit(fallos ? 1 : 0);
