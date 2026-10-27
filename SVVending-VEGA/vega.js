(() => {
  const modules = [
    { id: 'rutas', group: 'Operación diaria', name: 'Rutas y visitas', desc: 'Planifica recorridos, operadores, vehículos y frecuencias.', fields: [['name','Nombre de la ruta','text'],['date','Fecha','date'],['operator','Operador','text'],['vehicle','Vehículo','text'],['stops','Paradas previstas','number'],['status','Estado','select',['Planificada','En curso','Completada','Reasignar']]] },
    { id: 'reposicion', group: 'Operación diaria', name: 'Reposición móvil', desc: 'Escaneo de máquina y productos, cierre de visita y bolsa.', target: 'reposicion' },
    { id: 'almacenes', group: 'Operación diaria', name: 'Almacenes y furgonetas', desc: 'Consulta y ajusta stock de nave, máquinas y ubicaciones.', target: 'almacen' },
    { id: 'recaudacion', group: 'Operación diaria', name: 'Recaudación y auditorías', desc: 'Bolsas, importes contados y cierre contable mensual.', target: 'bolsas' },
    { id: 'recuento', group: 'Operación diaria', name: 'Recuento de stock', desc: 'Registra el stock real y conserva los ajustes en el historial.', target: 'recuento' },
    { id: 'compras', group: 'Operación diaria', name: 'Compras y MRP', desc: 'Detecta faltas según stock mínimo y prepara pedidos de compra.', target: 'almacen' },
    { id: 'pedidos', group: 'Operación diaria', name: 'Pedidos de clientes', desc: 'Registra pedidos, importes, entrega y estado de preparación.', fields: [['reference','N.º de pedido','text'],['clientId','Cliente','client'],['date','Fecha del pedido','date'],['deliveryDate','Entrega prevista','date'],['total','Importe (€)','number'],['status','Estado','select',['Recibido','Preparando','En ruta','Entregado','Cancelado']]] },
    { id: 'maquinas', group: 'Puntos de venta', name: 'Máquinas y puntos de venta', desc: 'Ficha de máquinas, clientes, códigos y precios.', target: 'maquinas' },
    { id: 'servicio', group: 'Servicio y calidad', name: 'Asistencia técnica', desc: 'Incidencias, prioridad, asignación y resolución.', fields: [['machineId','Máquina','machine'],['issue','Avería o tarea','text'],['priority','Prioridad','select',['Baja','Normal','Alta','Urgente']],['operator','Asignado a','text'],['date','Fecha de aviso','date'],['status','Estado','select',['Abierta','Asignada','En curso','Resuelta']]] },
    { id: 'telemetria', group: 'Puntos de venta', name: 'Telemetría', desc: 'Registra alarmas y lecturas; importa los informes compatibles.', importTelemetry: true, fields: [['machineId','Máquina','machine'],['metric','Lectura o alarma','text'],['value','Valor','text'],['date','Fecha','date'],['status','Estado','select',['Normal','Aviso','Alarma','Revisada']]] },
    { id: 'planogramas', group: 'Puntos de venta', name: 'Planogramas', desc: 'Asigna productos y capacidades a bandejas y posiciones.', fields: [['machineId','Máquina','machine'],['shelf','Bandeja','text'],['slot','Espiral / posición','text'],['productId','Producto','product'],['capacity','Capacidad','number'],['status','Estado','select',['Activo','Revisar','Pendiente de carga']]] },
    { id: 'calidad', group: 'Servicio y calidad', name: 'Calidad e inspecciones', desc: 'Checklists, resultados de visita e inspecciones de máquina.', fields: [['machineId','Máquina','machine'],['checklist','Inspección','text'],['date','Fecha','date'],['operator','Responsable','text'],['result','Resultado','select',['Correcto','Con observaciones','No conforme']],['status','Estado','select',['Pendiente','Realizada','Revisar']]] },
    { id: 'contratos', group: 'Gestión comercial', name: 'Contratos y facturación', desc: 'Controla contratos, vencimientos, alquileres y facturas.', fields: [['clientId','Cliente','client'],['reference','Referencia del contrato','text'],['kind','Tipo','select',['Explotación','Alquiler','Servicio','Comisión']],['startDate','Inicio','date'],['endDate','Vencimiento','date'],['amount','Importe mensual (€)','number'],['status','Estado','select',['Borrador','Activo','Por renovar','Finalizado']]] },
    { id: 'crm', group: 'Gestión comercial', name: 'CRM y clientes', desc: 'Prospectos, llamadas, contactos y próximas acciones.', fields: [['clientId','Cliente relacionado','client'],['contact','Contacto / prospecto','text'],['nextDate','Próxima acción','date'],['channel','Canal','select',['Llamada','Visita','Correo','Otro']],['notes','Notas','textarea'],['status','Estado','select',['Pendiente','Contactado','Seguimiento','Cerrado']]] },
    { id: 'empleados', group: 'Equipo y flota', name: 'Empleados y permisos', desc: 'Directorio del equipo, función y permisos previstos.', fields: [['name','Nombre','text'],['role','Función','select',['Administrador','Operador','Técnico','Contabilidad']],['scope','Tiendas / zona asignada','text'],['availability','Disponibilidad','select',['Disponible','Ausente','Vacaciones']],['status','Estado','select',['Activo','Inactivo']]] },
    { id: 'flota', group: 'Equipo y flota', name: 'Flota y seguimiento', desc: 'Vehículos, asignaciones, kilometraje y ubicación anotada.', fields: [['vehicle','Vehículo','text'],['operator','Operador','text'],['location','Ubicación anotada','text'],['odometer','Kilometraje','number'],['date','Última actualización','date'],['status','Estado','select',['En ruta','Disponible','En taller','Fuera de servicio']]] },
    { id: 'preparacion', group: 'Operación diaria', name: 'Preparación y montaje', desc: 'Tareas de preparación, pre-kitting, ensamblaje e instalación.', fields: [['reference','N.º de orden','text'],['machineId','Máquina','machine'],['productId','Producto / material','product'],['quantity','Cantidad','number'],['dueDate','Fecha prevista','date'],['status','Estado','select',['Pendiente','Preparando','Lista','Instalada']]] },
    { id: 'reclamaciones', group: 'Servicio y calidad', name: 'Reclamaciones y llamadas', desc: 'Seguimiento de reclamaciones, respuesta y resolución.', fields: [['clientId','Cliente','client'],['reference','Referencia','text'],['reason','Motivo','textarea'],['date','Fecha recibida','date'],['owner','Responsable','text'],['status','Estado','select',['Abierta','En revisión','Respondida','Cerrada']]] },
    { id: 'documentos', group: 'Gestión comercial', name: 'Documentos comerciales', desc: 'Índice de contratos, ofertas, tarifas y documentos asociados.', fields: [['name','Nombre del documento','text'],['kind','Tipo','select',['Contrato','Oferta','Tarifa','Factura','Otro']],['related','Cliente / máquina / referencia','text'],['dueDate','Vencimiento o revisión','date'],['status','Estado','select',['Vigente','Pendiente','Caducado']]] },
    { id: 'clientes', group: 'Gestión comercial', name: 'Clientes y ubicaciones', desc: 'Datos de clientes y puntos de instalación.', target: 'clientes' },
    { id: 'facturas', group: 'Gestión comercial', name: 'Facturas', desc: 'Registra compras y controla entradas al almacén.', target: 'facturas' },
    { id: 'comisiones', group: 'Gestión comercial', name: 'Comisiones', desc: 'Consulta reglas, ventas y liquidaciones por máquina.', target: 'comisiones' },
    { id: 'informes', group: 'Análisis', name: 'Informes y conexiones', desc: 'Ventas, compras, actividad y datos exportables.', target: 'informes' }
  ];
  let activeForm = null;

  function store() {
    if (!db.vegaRecords || typeof db.vegaRecords !== 'object') db.vegaRecords = {};
    return db.vegaRecords;
  }
  function rows(moduleId) { return store()[moduleId] || (store()[moduleId] = []); }
  function getModule(id) { return modules.find(m => m.id === id); }
  function goModule(id) {
    const item = getModule(id);
    if (!item) return;
    if (item.target) { activeForm = null; go(item.target); return; }
    page = 'vega:' + id;
    activeForm = null;
    render();
  }
  function home() {
    const activeTickets = rows('servicio').filter(x => !['Resuelta','Cerrada'].includes(x.status)).length;
    const activeRoutes = rows('rutas').filter(x => ['Planificada','En curso'].includes(x.status)).length;
    const pendingOrders = rows('pedidos').filter(x => !['Entregado','Cancelado'].includes(x.status)).length;
    const groups = [...new Set(modules.map(m => m.group))];
    return `${title('Centro VEGA','Operación integral de SV Vending · abre un área para consultar o registrar actividad')}
      <div class="grid">${stat('Rutas activas',activeRoutes,'Planificadas o en curso')}${stat('Pedidos pendientes',pendingOrders,'Por preparar o entregar')}${stat('Avisos técnicos',activeTickets,'Sin resolver')}</div>
      ${groups.map(group => `<section class="section"><h3>${esc(group)}</h3><div class="vega-module-grid">${modules.filter(m => m.group === group).map(m => `<button type="button" class="vega-module" onclick="SVVega.goModule('${m.id}')"><strong>${esc(m.name)}</strong><span>${esc(m.desc)}</span><b aria-hidden="true">›</b></button>`).join('')}</div></section>`).join('')}
      <div class="notice vega-note"><b>Servicios externos</b><br>La aplicación conserva el escaneo, el stock y la sincronización de SV Vending. La telemetría de equipos, el GPS en directo y el envío de invitaciones necesitan conexión con el proveedor o servicio correspondiente.</div>`;
  }
  function optionsFor(field) {
    if (field[2] === 'client') return [['','Seleccionar cliente'], ...(db.clients || []).map(x => [x.id, x.name || x.business || 'Cliente'])];
    if (field[2] === 'machine') return [['','Seleccionar máquina'], ...(db.machines || []).map(x => [x.id, x.name || x.number || 'Máquina'])];
    if (field[2] === 'product') return [['','Seleccionar producto'], ...(db.products || []).map(x => [x.id, x.name || 'Producto'])];
    return [['','Seleccionar'], ...(field[3] || []).map(x => [x,x])];
  }
  function fieldHTML(field, record) {
    const [key,label,type] = field;
    const value = record?.[key] ?? (type === 'date' && /date|Date/.test(key) ? today() : '');
    if (type === 'select' || ['client','machine','product'].includes(type)) {
      const opts = optionsFor(field);
      return `<label>${esc(label)}<select name="${esc(key)}" ${key === 'status' ? 'required' : ''}>${opts.map(([v,t]) => `<option value="${esc(v)}" ${String(value)===String(v)?'selected':''}>${esc(t)}</option>`).join('')}</select></label>`;
    }
    if (type === 'textarea') return `<label>${esc(label)}<textarea name="${esc(key)}" rows="3">${esc(value)}</textarea></label>`;
    return `<label>${esc(label)}<input name="${esc(key)}" type="${type}" ${type==='number'?'min="0" step="0.01"':''} value="${esc(value)}" ${['text','date'].includes(type) && ['name','reference','issue','checklist','vehicle','contact'].includes(key) ? 'required' : ''}></label>`;
  }
  function formHTML(module, record) {
    return `<div class="card vega-form"><h3>${record ? 'Editar registro' : 'Nuevo registro'} · ${esc(module.name)}</h3><form class="form" onsubmit="SVVega.saveRecord(event,'${module.id}','${record?.id || ''}')"><div class="two">${module.fields.map(f => fieldHTML(f,record)).join('')}</div><div class="actions"><button type="submit">Guardar</button><button class="secondary" type="button" onclick="SVVega.closeForm()">Cancelar</button></div></form></div>`;
  }
  function displayValue(field, value) {
    if (['client','machine','product'].includes(field[2]) && value) {
      const collection = field[2] === 'client' ? db.clients : field[2] === 'machine' ? db.machines : db.products;
      const match = (collection || []).find(x => x.id === value);
      return match?.name || match?.business || match?.number || value;
    }
    return value;
  }
  function modulePage(id) {
    const module = getModule(id);
    if (!module || module.target) return home();
    const list = [...rows(id)].sort((a,b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
    const form = activeForm?.moduleId === id ? formHTML(module,list.find(x => x.id === activeForm.recordId) || null) : '';
    return `${title(module.name,module.desc,`<button class="secondary" onclick="SVVega.homePage()">← Todas las áreas</button>`)}
      <div class="actions"><button onclick="SVVega.openForm('${id}')">＋ Nuevo registro</button>${module.importTelemetry ? '<button class="secondary" onclick="document.getElementById(\'telemetryFile\').click()">Importar informe Frekuent</button>' : ''}</div>${form}
      <section class="section"><h3>Registros · ${list.length}</h3>${list.length ? list.map(record => {
        const primary = module.fields.find(f => ['name','reference','issue','checklist','metric','vehicle','contact'].includes(f[0]));
        const sub = module.fields.filter(f => f[0] !== primary?.[0] && f[0] !== 'status').slice(0,3).map(f => `${esc(f[1])}: ${esc(displayValue(f,record[f[0]]) || '—')}`).join(' · ');
        return `<article class="card vega-record"><div class="item-head"><div><h3>${esc(displayValue(primary,record[primary?.[0]]) || module.name)}</h3><p>${sub || esc(record.createdAt ? new Date(record.createdAt).toLocaleString('es-ES') : '')}</p></div><span class="pill">${esc(record.status || 'Abierto')}</span></div>${record.notes || record.reason ? `<p class="sub">${esc(record.notes || record.reason)}</p>` : ''}<div class="actions"><button class="secondary" onclick="SVVega.cycleStatus('${id}','${record.id}')">Cambiar estado</button><button class="secondary" onclick="SVVega.openForm('${id}','${record.id}')">Editar</button><button class="danger" onclick="SVVega.remove('${id}','${record.id}')">Eliminar</button></div></article>`;
      }).join('') : '<div class="empty"><b>Sin registros</b>Usa «Nuevo registro» para empezar.</div>'}</section>`;
  }
  function saveRecord(event,moduleId,recordId) {
    event.preventDefault();
    const module = getModule(moduleId);
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    const list = rows(moduleId), existing = list.find(x => x.id === recordId);
    const record = {...(existing || {}),...values,id:existing?.id || id(),createdAt:existing?.createdAt || new Date().toISOString(),updatedAt:new Date().toISOString()};
    if (!record.status) record.status = module.fields.find(f => f[0] === 'status')?.[3]?.[0] || 'Abierto';
    if (existing) list[list.indexOf(existing)] = record; else list.unshift(record);
    activeForm = null;
    save();
  }
  function openForm(moduleId,recordId='') { activeForm = {moduleId,recordId}; page='vega:'+moduleId; render(); }
  function closeForm() { activeForm = null; render(); }
  function cycleStatus(moduleId,recordId) {
    const module=getModule(moduleId),record=rows(moduleId).find(x=>x.id===recordId),field=module?.fields.find(f=>f[0]==='status');
    if (!record || !field) return;
    const values=field[3]||['Abierto','En curso','Cerrado'], index=values.indexOf(record.status);
    record.status=values[(index+1)%values.length];record.updatedAt=new Date().toISOString();save();
  }
  function remove(moduleId,recordId) {
    const record=rows(moduleId).find(x=>x.id===recordId);
    if (!record || !confirm('¿Eliminar este registro?')) return;
    store()[moduleId]=rows(moduleId).filter(x=>x.id!==recordId);save();
  }
  window.SVVega = {home,homePage:()=>{activeForm=null;page='vega';render()},modulePage,goModule,openForm,closeForm,saveRecord,cycleStatus,remove};
})();
