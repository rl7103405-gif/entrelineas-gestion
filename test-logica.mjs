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
          parseBloqueEL, PIEZAS_EL, rangoPeriodo};
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

console.log('\n' + (fallos === 0 ? 'TODO PASA — ' + total + '/' + total
                                 : fallos + ' FALLAS de ' + total));
process.exit(fallos ? 1 : 0);
