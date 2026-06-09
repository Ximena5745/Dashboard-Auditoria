/**
 * DASHBOARD - Renderización de gráficos, KPIs y tablas
 */

class Dashboard {
    constructor() {
        this.charts = {};
        this.currentData = [];
        this.detalladoPage = 1;
        this.detalladoPerPage = 25;
        this.detalladoSearch = '';
    }

    /**
     * Inicializar dashboard
     * Nota: diligenciaService ya hizo el merge antes de llamar a init()
     */
    init() {
        this.currentData = dataManager.getData();
        this.updateDashboard(this.currentData);
        console.log('✓ Dashboard inicializado');
    }

    /**
     * Actualizar dashboard completo
     */
    updateDashboard(filteredData) {
        this.currentData = filteredData;
        
        this.updateKPIs(filteredData);
        this.updateCharts(filteredData);
        this.updateTables(filteredData);
        this.updateAlerts(filteredData);
        this.renderGestionOperativa(filteredData);
        
        // Actualizar hora de última actualización
        const now = new Date();
        document.getElementById('lastUpdate').textContent = 
            now.toLocaleString('es-ES', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    /**
     * Actualizar KPIs
     */
    updateKPIs(data) {
        const stats = dataManager.getStatistics(data);
        
        document.getElementById('kpiTotalHallazgos').textContent = stats.total;
        document.getElementById('kpiCriticos').textContent = stats.criticos;
        document.getElementById('kpiMedios').textContent = stats.medios;
        document.getElementById('kpiBajos').textContent = stats.bajos;
        document.getElementById('kpiCerrados').textContent = stats.cerrados;
        document.getElementById('kpiVencidos').textContent = stats.vencidos;
        document.getElementById('kpiCumplimiento').textContent = stats.pct_cumplimiento + '%';
        document.getElementById('kpiAvancePromedio').textContent = stats.avance_promedio + '%';
    }

    /**
     * Actualizar gráficos
     */
    updateCharts(data) {
        this.updateChartCriticidad(data);
        this.updateChartProcesos(data);
        this.updateChartEstados(data);
    }

    /**
     * Gráfico: Criticidad (Donut)
     */
    updateChartCriticidad(data) {
        const stats = dataManager.getStatistics(data);
        
        const ctx = document.getElementById('chartCriticidad').getContext('2d');
        
        // Destruir gráfico anterior si existe
        if (this.charts.criticidad) {
            this.charts.criticidad.destroy();
        }

        this.charts.criticidad = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Alto', 'Medio', 'Bajo'],
                datasets: [{
                    data: [stats.criticos, stats.medios, stats.bajos],
                    backgroundColor: ['#dc3545', '#ffc107', '#28a745'],
                    borderColor: ['#a02834', '#e0a800', '#1e8449'],
                    borderWidth: 2,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            font: { weight: 'bold', size: 12 },
                            padding: 15,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((context.parsed / total) * 100);
                                return `${context.label}: ${context.parsed} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Gráfico: Procesos (Bar Chart) - Ordenado mayor a menor, sin números en eje X, con valor en barra
     */
    updateChartProcesos(data) {
        const clusters = dataManager.getByCluster('proceso', data);

        // Construir pares [label, count] y ordenar de mayor a menor
        const pairs = Object.entries(clusters)
            .map(([key, records]) => ({
                key,
                label: records[0].proceso_display || records[0].proceso || key,
                count: records.length
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        const labels = pairs.map(p => p.label.length > 35 ? p.label.substring(0, 35) + '...' : p.label);
        const values = pairs.map(p => p.count);

        const ctx = document.getElementById('chartProcesos').getContext('2d');

        if (this.charts.procesos) {
            this.charts.procesos.destroy();
        }

        this.charts.procesos = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Cantidad de Hallazgos',
                    data: values,
                    backgroundColor: '#0066cc',
                    borderColor: '#003d99',
                    borderWidth: 2,
                    borderRadius: 5,
                    hoverBackgroundColor: '#003d99'
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: true,
                layout: {
                    padding: { right: 30 }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Hallazgos: ${context.parsed.x}`;
                            }
                        }
                    },
                    datalabels: {
                        display: true,
                        anchor: 'end',
                        align: 'end',
                        color: '#333',
                        font: { weight: 'bold', size: 12 },
                        formatter: function(value) { return value; }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        display: false,
                        grid: { display: false }
                    },
                    y: {
                        grid: { display: false },
                        ticks: {
                            font: { size: 11, weight: '600' },
                            color: '#374151'
                        }
                    }
                }
            },
            plugins: [{
                id: 'barValue',
                afterDatasetsDraw: function(chart) {
                    const ctx = chart.ctx;
                    chart.data.datasets.forEach(function(dataset, datasetIndex) {
                        const meta = chart.getDatasetMeta(datasetIndex);
                        meta.data.forEach(function(bar, index) {
                            const value = dataset.data[index];
                            ctx.fillStyle = '#333';
                            ctx.font = 'bold 12px Segoe UI';
                            ctx.textAlign = 'left';
                            ctx.textBaseline = 'middle';
                            ctx.fillText(value, bar.x + 5, bar.y);
                        });
                    });
                }
            }]
        });
    }

    /**
     * Gráfico: Estado de Acciones (Stacked Bar por Proceso × Estado)
     */
    updateChartEstados(data) {
        const ctx = document.getElementById('chartEstados').getContext('2d');

        if (this.charts.estados) {
            this.charts.estados.destroy();
        }

        // Agrupar por proceso y contar estados
        const procesosMap = {};
        const estados = ['Abierto', 'En ejecución', 'Cerrado', 'Vencido'];
        const colors = {
            'Abierto': '#0d47a1',
            'En ejecución': '#e65100',
            'Cerrado': '#1b5e20',
            'Vencido': '#b71c1c'
        };

        data.forEach(record => {
            const proc = record.proceso_display || record.proceso || 'Sin especificar';
            const procShort = proc.length > 25 ? proc.substring(0, 25) + '...' : proc;
            if (!procesosMap[procShort]) {
                procesosMap[procShort] = { 'Abierto': 0, 'En ejecución': 0, 'Cerrado': 0, 'Vencido': 0 };
            }
            const estado = record.estado || 'Abierto';
            if (procesosMap[procShort][estado] !== undefined) {
                procesosMap[procShort][estado]++;
            } else {
                procesosMap[procShort]['Abierto']++;
            }
        });

        // Ordenar procesos por total descendente
        const sortedProcs = Object.entries(procesosMap)
            .map(([name, counts]) => ({
                name,
                total: Object.values(counts).reduce((a, b) => a + b, 0),
                counts
            }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 10);

        const labels = sortedProcs.map(p => p.name);

        this.charts.estados = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: estados.map(estado => ({
                    label: estado,
                    data: sortedProcs.map(p => p.counts[estado]),
                    backgroundColor: colors[estado],
                    borderColor: colors[estado],
                    borderWidth: 1
                }))
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: true,
                layout: {
                    padding: { right: 10 }
                },
                scales: {
                    x: {
                        stacked: true,
                        beginAtZero: true,
                        ticks: { stepSize: 1, font: { size: 10 } },
                        grid: { display: false }
                    },
                    y: {
                        stacked: true,
                        grid: { display: false },
                        ticks: {
                            font: { size: 10, weight: '600' },
                            color: '#374151'
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            font: { weight: 'bold', size: 10 },
                            padding: 10,
                            usePointStyle: true,
                            pointStyle: 'rectRounded'
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${context.parsed.x}`;
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Actualizar tablas
     */
    updateTables(data) {
        this.updateTableSumariaAuditoria(data);
        this.updateTableSeguimientoDetallado(data);
        this.updateTableTop10(data);
    }

    /**
     * Tabla: Resumen por Auditoría
     */
    updateTableSumariaAuditoria(data) {
        const summary = dataManager.getSummaryByAuditoria(data);
        const tbody = document.getElementById('tbodySumariaAuditoria');
        tbody.innerHTML = '';

        summary.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${this.escape(item.auditoria)}</strong></td>
                <td class="text-center"><strong>${item.total}</strong></td>
                <td class="text-center"><span class="badge bg-danger">${item.altos}</span></td>
                <td class="text-center"><span class="badge bg-warning text-dark">${item.medios}</span></td>
                <td class="text-center"><span class="badge bg-success">${item.bajos}</span></td>
                <td class="text-center">
                    <div class="progress" style="height: 20px;">
                        <div class="progress-bar" style="width: ${item.avance_promedio}%">${item.avance_promedio}%</div>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    /**
     * Tabla: Seguimiento Detallado
     */
    updateTableSeguimientoDetallado(data) {
        this._detalladoData = data;
        this.detalladoPage = 1;
        this.renderDetalladoTable();

        // Search event
        const searchInput = document.getElementById('searchDetallado');
        if (searchInput && !searchInput._bound) {
            searchInput._bound = true;
            searchInput.addEventListener('input', (e) => {
                this.detalladoSearch = e.target.value.toLowerCase();
                this.detalladoPage = 1;
                this.renderDetalladoTable();
            });
        }
    }

    renderDetalladoTable() {
        const data = this._detalladoData || [];
        const tbody = document.getElementById('tbodyDetallado');
        if (!tbody) return;
        tbody.innerHTML = '';

        // Filter by search
        let filtered = data;
        if (this.detalladoSearch) {
            filtered = data.filter(item =>
                (item.auditoria || '').toLowerCase().includes(this.detalladoSearch) ||
                (item.subproceso || '').toLowerCase().includes(this.detalladoSearch) ||
                (item.criticidad || '').toLowerCase().includes(this.detalladoSearch) ||
                (item.descripcion || '').toLowerCase().includes(this.detalladoSearch) ||
                (item.responsable_proceso || item.responsable_accion || '').toLowerCase().includes(this.detalladoSearch) ||
                (item.estado || '').toLowerCase().includes(this.detalladoSearch)
            );
        }

        // Pagination
        const total = filtered.length;
        const totalPages = Math.ceil(total / this.detalladoPerPage) || 1;
        if (this.detalladoPage > totalPages) this.detalladoPage = totalPages;
        const start = (this.detalladoPage - 1) * this.detalladoPerPage;
        const pageData = filtered.slice(start, start + this.detalladoPerPage);

        // Render rows
        pageData.forEach((item) => {
            const idx = data.indexOf(item);
            const estadoClass = this.getEstadoClass(item.estado);
            const criticidadClass = this.getCriticidadClass(item.criticidad);
            const desc = item.descripcion || '';
            const descShort = desc.length > 50 ? desc.substring(0, 50) + '...' : desc;
            const tipoAccion = item.tipo_accion || '';
            const avance = dataManager.getOmAvance(item, tipoAccion);

            const row = document.createElement('tr');
            row.style.cursor = 'pointer';
            row.innerHTML = `
                <td>${this.escape(item.auditoria)}</td>
                <td>${this.escape(item.subproceso || '')}</td>
                <td><span class="${criticidadClass}">${this.escape(item.criticidad)}</span></td>
                <td title="${this.escape(desc)}">${this.escape(descShort)}</td>
                <td>${this.escape(item.responsable_proceso || item.responsable_accion || '')}</td>
                <td><span class="${estadoClass}">${this.escape(item.estado)}</span></td>
                <td>
                    <select class="form-select form-select-sm tipo-accion-select" data-index="${idx}" onchange="dashboard.onTipoAccionChange(${idx}, this.value)">
                        <option value="" ${!tipoAccion ? 'selected' : ''}>-- Selec. --</option>
                        <option value="Acción Correctiva" ${tipoAccion === 'Acción Correctiva' ? 'selected' : ''}>Acción Correctiva</option>
                        <option value="Corrección" ${tipoAccion === 'Corrección' ? 'selected' : ''}>Corrección</option>
                        <option value="Acción de Mejora" ${tipoAccion === 'Acción de Mejora' ? 'selected' : ''}>Acción de Mejora</option>
                    </select>
                </td>
                ${this.buildCondCells(idx, tipoAccion, item)}
                <td>
                    <div class="d-flex align-items-center gap-1">
                        <div class="progress flex-grow-1" style="height: 6px; min-width: 40px;">
                            <div class="progress-bar ${avance >= 100 ? 'bg-success' : avance > 0 ? 'bg-primary' : 'bg-secondary'}" style="width: ${avance}%"></div>
                        </div>
                        <small class="fw-semibold text-nowrap">${avance}%</small>
                    </div>
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" data-index="${idx}" onclick="event.stopPropagation(); dashboard.showDetail(${idx})" title="Ver detalle">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });

        this.updateConditionalHeaders(data);

        // Update counts
        const countEl = document.getElementById('totalRegistros');
        if (countEl) countEl.textContent = `${data.length} registros`;
        const infoEl = document.getElementById('detalladoInfo');
        if (infoEl) infoEl.textContent = `Mostrando ${start + 1}–${Math.min(start + this.detalladoPerPage, total)} de ${total}${this.detalladoSearch ? ' (filtrado)' : ''}`;

        // Render pagination
        this.renderDetalladoPagination(totalPages);
    }

    renderDetalladoPagination(totalPages) {
        const ul = document.getElementById('detalladoPagination');
        if (!ul) return;
        ul.innerHTML = '';

        const addPage = (label, page, disabled, active) => {
            const li = document.createElement('li');
            li.className = `page-item${disabled ? ' disabled' : ''}${active ? ' active' : ''}`;
            li.innerHTML = `<a class="page-link" href="#" style="font-size:0.75rem;padding:0.25rem 0.5rem;">${label}</a>`;
            if (!disabled && !active) {
                li.querySelector('a').addEventListener('click', (e) => {
                    e.preventDefault();
                    this.detalladoPage = page;
                    this.renderDetalladoTable();
                });
            }
            ul.appendChild(li);
        };

        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) addPage(i, i, false, i === this.detalladoPage);
        } else {
            addPage('«', this.detalladoPage - 1, this.detalladoPage === 1, false);
            addPage('1', 1, false, this.detalladoPage === 1);
            if (this.detalladoPage > 3) addPage('...', 0, true, false);
            for (let i = Math.max(2, this.detalladoPage - 1); i <= Math.min(totalPages - 1, this.detalladoPage + 1); i++) {
                addPage(i, i, false, i === this.detalladoPage);
            }
            if (this.detalladoPage < totalPages - 2) addPage('...', 0, true, false);
            addPage(totalPages, totalPages, false, this.detalladoPage === totalPages);
            addPage('»', this.detalladoPage + 1, this.detalladoPage === totalPages, false);
        }
    }

    /**
     * Construir celdas condicionales según tipo de acción.
     * Cada tipo muestra sus campos específicos + un botón fa-save al final.
     * Column indices: 7=cond-ac, 8=cond-pct, 9=cond-val
     */
    /**
     * Filas del textarea según longitud del texto (visualización completa)
     */
    _textareaRows(text) {
        const t = String(text || '');
        const lines = t.split('\n').length;
        return Math.max(2, Math.min(10, lines + Math.ceil(t.length / 70)));
    }

    buildCondCells(idx, tipo, item) {
        const codigo = this.escape(item.codigo || '');

        if (!tipo) {
            return '<td class="cond-col cond-col-ac"></td><td class="cond-col cond-col-pct"></td><td class="cond-col cond-col-val"></td>';
        }

        const omText = dataManager.getOmActividad(item, tipo);
        const avance = dataManager.getOmAvance(item, tipo);
        const rows = this._textareaRows(omText);
        const placeholder = tipo === 'Acción de Mejora'
            ? 'N° de OM / descripción (Acción Correctiva)...'
            : 'N° de OM / descripción (Acciones / Actividades)...';

        const cond1 = `<td class="cond-col cond-col-ac">
            <div class="cond-cell-actions cond-cell-actions--stack">
                <textarea class="cond-cell-textarea cond-cell-textarea-full" id="ac_om_${idx}"
                    rows="${rows}" placeholder="${placeholder}">${this.escape(omText)}</textarea>
                <button class="btn-save-diligencia" title="Guardar" onclick="event.stopPropagation(); dashboard.guardarDiligencia('${codigo}', ${idx})">
                    <i class="fas fa-save"></i>
                </button>
            </div>
        </td>`;

        const cond2 = `<td class="cond-col cond-col-pct">
            <span class="cond-cell-label">% Avance</span>
            <input type="number" class="cond-cell-input cond-cell-input-pct" id="ac_avance_${idx}"
                value="${avance}" min="0" max="100">
        </td>`;

        let cond3 = '<td class="cond-col cond-col-val"></td>';
        if (tipo === 'Acción Correctiva') {
            cond3 = `<td class="cond-col cond-col-val">
                <span class="cond-cell-label">Tipo validación</span>
                <input type="text" class="cond-cell-input" id="ac_tipoval_${idx}"
                    value="${this.escape(item.tipo_validacion || '')}"
                    placeholder="Tipo...">
                <span class="cond-cell-label" style="margin-top:3px;">Resultado</span>
                <input type="text" class="cond-cell-input" id="ac_resval_${idx}"
                    value="${this.escape(item.resultado_validacion || '')}"
                    placeholder="Resultado...">
            </td>`;
        }

        return cond1 + cond2 + cond3;
    }

    /**
     * Mostrar/ocultar headers de columnas condicionales
     */
    updateConditionalHeaders(data) {
        const tipos = new Set(data.map(d => d.tipo_accion).filter(Boolean));
        const table = document.getElementById('tablaSeguimientoDetallado');
        const hasCorrectiva = tipos.has('Acción Correctiva');

        table.classList.toggle('show-col-ac', tipos.size > 0);
        table.classList.toggle('show-col-pct', tipos.size > 0);
        table.classList.toggle('show-col-val', hasCorrectiva);

        const th1 = document.getElementById('thCond1');
        if (tipos.size > 0) {
            th1.textContent = 'N° de OM / Descrip de Actividad';
        }
    }

    /**
     * Manejar cambio de Tipo de Acción.
     * Actualiza en memoria y reconstruye las celdas condicionales de esa fila.
     * No guarda en Supabase — el usuario debe pulsar el botón guardar.
     */
    onTipoAccionChange(idx, value) {
        const record = this.currentData[idx];
        if (!record) return;

        record.tipo_accion = value;

        const select = document.querySelector(`.tipo-accion-select[data-index="${idx}"]`);
        if (!select) return;

        const row = select.closest('tr');
        if (!row) return;

        // Reemplazar las 3 celdas condicionales (índices 7, 8, 9) con el nuevo HTML.
        // Corrección/Mejora usan colspan=3, por lo que hay que eliminar las 3 celdas
        // existentes e insertar solo 1 nueva.
        const cells = row.querySelectorAll('td');
        const newHtml = this.buildCondCells(idx, value, record);

        // Crear fila temporal para parsear el HTML
        const temp = document.createElement('tbody');
        const tempRow = document.createElement('tr');
        tempRow.innerHTML = newHtml;
        temp.appendChild(tempRow);
        const newCells = Array.from(tempRow.querySelectorAll('td'));

        // Eliminar celdas 7, 8, 9 actuales (de atrás hacia adelante para no desplazar índices)
        for (let i = 9; i >= 7; i--) {
            if (cells[i]) cells[i].remove();
        }

        // Insertar las nuevas celdas antes de la celda de % Avance (posición 7 tras la eliminación)
        // La celda de referencia es el TD de la barra de avance (ahora en posición 7)
        const refCell = row.querySelectorAll('td')[7]; // barra de avance
        newCells.reverse().forEach(td => {
            row.insertBefore(td, refCell);
        });

        this.updateConditionalHeaders(this.currentData);
    }

    /**
     * Tabla: Top 10 Críticos
     */
    updateTableTop10(data) {
        const top10 = dataManager.getTopCritical(10, data);
        const tbody = document.getElementById('tbodyTop10');
        tbody.innerHTML = '';

        top10.forEach((item, idx) => {
            const criticidadClass = this.getCriticidadClass(item.criticidad);
            const desc = item.descripcion || '';
            const descShort = desc.length > 60 ? desc.substring(0, 60) + '...' : desc;
            const origenBadge = item.origen === 'SIG'
                ? '<span class="badge bg-primary">SIG</span>'
                : '<span class="badge bg-secondary">Aseguramiento</span>';

            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="text-center fw-bold">${idx + 1}</td>
                <td>${this.escape(item.subproceso || item.proceso_display || item.proceso || '')}</td>
                <td title="${this.escape(desc)}">${this.escape(descShort)}</td>
                <td><span class="${criticidadClass}">${this.escape(item.criticidad)}</span></td>
                <td class="text-center">${origenBadge}</td>
                <td class="text-center">
                    <span class="badge bg-danger">${Math.max(0, item.dias_vencidos)} días</span>
                </td>
                <td class="text-center">${item.avance_porcentaje}%</td>
            `;
            tbody.appendChild(row);
        });
    }

    /**
     * Actualizar alertas
     */
    updateAlerts(data) {
        const stats = dataManager.getStatistics(data);
        
        // Riesgo global
        const riesgo = dataManager.calculateProcessRisk(data);
        document.getElementById('alertRiesgoGlobal').textContent = riesgo;

        // Reincidentes
        document.getElementById('alertReincidencia').textContent = stats.reincidentes;
        document.getElementById('alertReincidenciaPorc').textContent = `${stats.pct_reincidencia}%`;

        // Sin avance
        document.getElementById('alertSinAvance').textContent = stats.sin_avance;

        // Vencidos
        document.getElementById('alertVencidos').textContent = stats.vencidos;
    }

    /**
     * Renderizar pestaña de Gestión Operativa
     */
    renderGestionOperativa(data) {
        this.renderSemaforo(data);
        this.renderAlertasAutomaticas(data);
        this.renderRiesgoPorProceso(data);
        this.renderReincidentes(data);
    }

    /**
     * Renderizar Semáforo de Gestión
     */
    renderSemaforo(data) {
        const sem = dataManager.getSemaforoData(data);
        document.getElementById('semVencidos').textContent = sem.vencidos;
        document.getElementById('semProximos').textContent = sem.proximos;
        document.getElementById('semTermino').textContent = sem.enTermino;
        document.getElementById('semCerrados').textContent = sem.cerrados;
        document.getElementById('semSinResponsable').textContent = sem.sinResponsable;
        document.getElementById('semSinValidacion').textContent = sem.sinValidacion;
    }

    /**
     * Renderizar Alertas Automáticas
     */
    renderAlertasAutomaticas(data) {
        const alertas = dataManager.getAlertasAutomaticas(data);
        const container = document.getElementById('alertasAutomaticas');
        container.innerHTML = '';

        alertas.forEach(alerta => {
            const div = document.createElement('div');
            let claseExtra = '';
            if (alerta.tipo === 'critica') claseExtra = 'alerta-critica';
            else if (alerta.tipo === 'ok') claseExtra = 'alerta-ok';
            else claseExtra = 'alerta-info';

            div.className = `alerta-item ${claseExtra}`;
            div.innerHTML = `
                <span class="alerta-icon"><i class="${alerta.icono}"></i></span>
                <div class="alerta-texto">
                    <div>${alerta.texto}</div>
                    <div class="alerta-detalle">${alerta.detalle}</div>
                </div>
            `;
            container.appendChild(div);
        });
    }

    /**
     * Renderizar Nivel de Riesgo por Proceso
     */
    renderRiesgoPorProceso(data) {
        const riesgos = dataManager.getProcessRiskData(data);
        const container = document.getElementById('riesgoPorProceso');
        container.innerHTML = '';

        if (riesgos.length === 0) {
            container.innerHTML = '<p class="text-muted text-center">Sin datos disponibles</p>';
            return;
        }

        const grid = document.createElement('div');
        grid.className = 'riesgo-grid';

        riesgos.forEach(proc => {
            const card = document.createElement('div');
            card.className = `riesgo-card riesgo-${proc.nivel.toLowerCase()}`;
            card.innerHTML = `
                <div class="riesgo-nombre">${this.escape(proc.proceso)}</div>
                <span class="riesgo-badge riesgo-badge-${proc.nivel.toLowerCase()}">${proc.nivel}</span>
                <div class="riesgo-stats">${proc.total} hal. · ${proc.vencidos} venc.</div>
            `;
            grid.appendChild(card);
        });

        container.appendChild(grid);
    }

    /**
     * Renderizar Hallazgos Reincidentes
     */
    renderReincidentes(data) {
        const rein = dataManager.getReincidentData(data);
        const container = document.getElementById('reincidenciaDetalle');
        container.innerHTML = '';

        const statsDiv = document.createElement('div');
        statsDiv.innerHTML = `
            <div class="row text-center mb-3">
                <div class="col-6">
                    <div class="reincidencia-label">Total reincidentes</div>
                    <div class="reincidencia-valor">${rein.totalReincidentes}</div>
                </div>
                <div class="col-6">
                    <div class="reincidencia-label">% Tasa reincidencia</div>
                    <div class="reincidencia-pct">${rein.pct}%</div>
                </div>
            </div>
            <div class="reincidencia-label mb-2">Procesos con mayor reincidencia</div>
        `;
        container.appendChild(statsDiv);

        if (rein.procesos.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'reincidencia-empty';
            empty.textContent = 'Sin reincidentes registrados';
            container.appendChild(empty);
        } else {
            const lista = document.createElement('div');
            lista.className = 'reincidencia-procesos';
            rein.procesos.forEach(p => {
                const item = document.createElement('div');
                item.textContent = '• ' + p;
                item.style.marginBottom = '4px';
                lista.appendChild(item);
            });
            container.appendChild(lista);
        }
    }

    /**
     * Mostrar detalle de hallazgo - Diseño profesional
     */
    showDetail(index) {
        const record = this.currentData[index];
        if (!record) return;

        const offcanvas = new bootstrap.Offcanvas(document.getElementById('panelDetalleHallazgo'));
        const origenBadge = record.origen === 'SIG'
            ? '<span class="badge bg-primary">SIG</span>'
            : '<span class="badge bg-secondary">Aseguramiento</span>';

        // Estado con color
        const estadoColor = {
            'Abierto': '#0d47a1',
            'En ejecución': '#e65100',
            'Cerrado': '#1b5e20',
            'Vencido': '#b71c1c'
        }[record.estado] || '#6c757d';

        // Semáforo
        const semaforoColor = {
            'Vencido': '#dc3545',
            'Próximo a vencer': '#ffc107',
            'En término': '#28a745'
        }[record.semaforo] || '#6c757d';

        // Línea de tiempo
        const timeline = this.buildTimeline(record);

        // Gestión de la acción según tipo
        const gestionAccion = this.buildGestionAccion(record, index);

        let html = `
            <!-- Header -->
            <div class="detail-header-bar">
                <div>
                    <div class="detail-header-title">${this.escape(record.codigo)}</div>
                    <div class="detail-header-subtitle">${origenBadge} · ${this.escape(record.origen)}</div>
                </div>
            </div>

            <!-- Estado + Avance -->
            <div class="detail-status-bar" style="border-left: 4px solid ${semaforoColor}; background: ${semaforoColor}10;">
                <span style="color: ${semaforoColor}; font-weight: 700; font-size: 1rem;">
                    <i class="fas fa-circle" style="font-size: 0.6rem; vertical-align: middle;"></i> ${record.semaforo}
                </span>
            </div>
            <div class="px-3 py-2">
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <small class="text-muted fw-semibold">% Avance de la acción</small>
                    <small class="fw-bold" style="color: ${estadoColor};">${record.avance_porcentaje}%</small>
                </div>
                <div class="progress" style="height: 8px;">
                    <div class="progress-bar" style="width: ${record.avance_porcentaje}%; background-color: ${estadoColor};"></div>
                </div>
            </div>

            <!-- IDENTIFICACIÓN -->
            <div class="detail-section-group">
                <div class="detail-section-title"><i class="fas fa-info-circle me-1"></i> IDENTIFICACIÓN</div>
                <div class="detail-grid">
                    <div class="detail-field">
                        <div class="detail-field-label">AUDITORÍA</div>
                        <div class="detail-field-value">${this.escape(record.auditoria)}</div>
                    </div>
                    <div class="detail-field">
                        <div class="detail-field-label">FECHA DETECCIÓN</div>
                        <div class="detail-field-value">${this.formatDate(record.fecha_deteccion)}</div>
                    </div>
                    <div class="detail-field">
                        <div class="detail-field-label">PROCESO</div>
                        <div class="detail-field-value">${this.escape(record.proceso || '')}</div>
                    </div>
                    <div class="detail-field">
                        <div class="detail-field-label">SUBPROCESO</div>
                        <div class="detail-field-value">${this.escape(record.subproceso || '')}</div>
                    </div>
                    <div class="detail-field">
                        <div class="detail-field-label">CRITICIDAD</div>
                        <div class="detail-field-value"><span class="detail-badge detail-badge-${record.criticidad === 'Alto' ? 'alto' : record.criticidad === 'Medio' ? 'medio' : 'bajo'}">${this.escape(record.criticidad)}</span></div>
                    </div>
                    <div class="detail-field">
                        <div class="detail-field-label">ESTADO</div>
                        <div class="detail-field-value" style="color: ${estadoColor}; font-weight: 600;">${this.escape(record.estado)}</div>
                    </div>
                </div>
            </div>

            <!-- CRITERIO INCUMPLIDO -->
            <div class="detail-section-group">
                <div class="detail-section-title">CRITERIO INCUMPLIDO</div>
                <div class="detail-text-box">${this.escape(record.criterio_incumplido) || '—'}</div>
            </div>

            <!-- DESCRIPCIÓN DEL HALLAZGO -->
            <div class="detail-section-group">
                <div class="detail-section-title">DESCRIPCIÓN DEL HALLAZGO</div>
                <div class="detail-text-box">${this.escape(record.descripcion) || '—'}</div>
            </div>

            <!-- CAUSA RAÍZ -->
            <div class="detail-section-group">
                <div class="detail-section-title">CAUSA RAÍZ</div>
                <div class="detail-text-box">${this.escape(record.causa_raiz) || '—'}</div>
            </div>

            <!-- RIESGOS ASOCIADOS -->
            <div class="detail-section-group">
                <div class="detail-section-title">RIESGOS ASOCIADOS</div>
                <div class="detail-text-box">${this.escape(record.riesgos) || '—'}</div>
            </div>

            <!-- RESPONSABILIDAD -->
            <div class="detail-section-group">
                <div class="detail-section-title"><i class="fas fa-user me-1"></i> RESPONSABILIDAD</div>
                <div class="detail-grid">
                    <div class="detail-field">
                        <div class="detail-field-label">RESPONSABLE DEL PROCESO</div>
                        <div class="detail-field-value">${this.escape(record.responsable_proceso) || '—'}</div>
                    </div>
                    <div class="detail-field">
                        <div class="detail-field-label">RESPONSABLE DE LA ACCIÓN</div>
                        <div class="detail-field-value">${this.escape(record.responsable_accion) || '—'}</div>
                    </div>
                    <div class="detail-field">
                        <div class="detail-field-label">ÁREA RESPONSABLE</div>
                        <div class="detail-field-value">${this.escape(record.area_responsable) || '—'}</div>
                    </div>
                    <div class="detail-field">
                        <div class="detail-field-label">FECHA COMPROMISO</div>
                        <div class="detail-field-value">${this.formatDate(record.fecha_compromiso)}</div>
                    </div>
                </div>
            </div>

            <!-- GESTIÓN DE LA ACCIÓN -->
            <div class="detail-section-group">
                <div class="detail-section-title"><i class="fas fa-tools me-1"></i> GESTIÓN DE LA ACCIÓN</div>
                ${gestionAccion}
            </div>

            <!-- VALIDACIÓN Y CIERRE -->
            <div class="detail-section-group">
                <div class="detail-section-title"><i class="fas fa-check-circle me-1"></i> VALIDACIÓN Y CIERRE</div>
                <div class="detail-grid">
                    <div class="detail-field">
                        <div class="detail-field-label">TIPO DE VALIDACIÓN</div>
                        <div class="detail-field-value">${this.escape(record.tipo_validacion) || '—'}</div>
                    </div>
                    <div class="detail-field">
                        <div class="detail-field-label">RESULTADO DE VALIDACIÓN</div>
                        <div class="detail-field-value">${this.escape(record.resultado_validacion) || '—'}</div>
                    </div>
                    <div class="detail-field">
                        <div class="detail-field-label">REINCIDENCIA</div>
                        <div class="detail-field-value">${record.es_reincidente ? '<span class="detail-badge detail-badge-alto">SÍ</span>' : '<span class="detail-badge detail-badge-bajo">No</span>'}</div>
                    </div>
                    <div class="detail-field">
                        <div class="detail-field-label">IMPACTO MITIGADO</div>
                        <div class="detail-field-value">${this.escape(record.impacto_mitigado) || '—'}</div>
                    </div>
                </div>
                <div class="detail-field mt-3">
                    <div class="detail-field-label">OBSERVACIONES DE SEGUIMIENTO</div>
                    <div class="detail-text-box">${this.escape(record.observaciones) || '—'}</div>
                </div>
            </div>

            <!-- LÍNEA DE TIEMPO -->
            <div class="detail-section-group">
                <div class="detail-section-title"><i class="fas fa-clock me-1"></i> LÍNEA DE TIEMPO</div>
                ${timeline}
            </div>
        `;

        document.getElementById('contenidoDetalleHallazgo').innerHTML = html;
        offcanvas.show();
    }

    /**
     * Construir gestión de la acción según tipo
     */
    buildGestionAccion(record, index) {
        const tipo = record.tipo_accion || '';

        if (tipo === 'Acción Correctiva') {
            return `
                <div class="detail-action-box">
                    <div class="detail-grid">
                        <div class="detail-field">
                            <div class="detail-field-label">NÚMERO / DESCRIPCIÓN ACCIÓN CORRECTIVA</div>
                            <div class="detail-field-value">${this.escape(record.accion_correctiva) || '—'}</div>
                        </div>
                        <div class="detail-field">
                            <div class="detail-field-label">% AVANCE</div>
                            <div class="detail-field-value">${record.avance_porcentaje}%</div>
                        </div>
                        <div class="detail-field">
                            <div class="detail-field-label">TIPO DE VALIDACIÓN</div>
                            <div class="detail-field-value">${this.escape(record.tipo_validacion) || '—'}</div>
                        </div>
                        <div class="detail-field">
                            <div class="detail-field-label">RESULTADO DE VALIDACIÓN</div>
                            <div class="detail-field-value">${this.escape(record.resultado_validacion) || '—'}</div>
                        </div>
                    </div>
                </div>
            `;
        } else if (tipo === 'Corrección') {
            return `
                <div class="detail-action-box">
                    <div class="detail-field">
                        <div class="detail-field-label">DESCRIPCIÓN DE LA CORRECCIÓN</div>
                        <textarea class="form-control form-control-sm" rows="3" placeholder="Describa la corrección realizada..."
                            id="campoCorreccion_${index}"
                            onchange="dashboard.saveCampoTexto(${index}, 'correccion_descripcion', this.value)">${this.escape(record.correccion_descripcion || '')}</textarea>
                    </div>
                    <button class="btn btn-sm btn-outline-primary mt-2" onclick="dashboard.saveCampoTexto(${index}, 'correccion_descripcion', document.getElementById('campoCorreccion_${index}').value)">
                        <i class="fas fa-save me-1"></i> Guardar
                    </button>
                </div>
            `;
        } else if (tipo === 'Acción de Mejora') {
            return `
                <div class="detail-action-box">
                    <div class="detail-field">
                        <div class="detail-field-label">DESCRIPCIÓN DE LA MEJORA</div>
                        <textarea class="form-control form-control-sm" rows="3" placeholder="Describa la mejora implementada..."
                            id="campoMejora_${index}"
                            onchange="dashboard.saveCampoTexto(${index}, 'mejora_descripcion', this.value)">${this.escape(record.mejora_descripcion || '')}</textarea>
                    </div>
                    <button class="btn btn-sm btn-outline-primary mt-2" onclick="dashboard.saveCampoTexto(${index}, 'mejora_descripcion', document.getElementById('campoMejora_${index}').value)">
                        <i class="fas fa-save me-1"></i> Guardar
                    </button>
                </div>
            `;
        } else {
            return `
                <div class="detail-action-box text-muted text-center py-3">
                    <i class="fas fa-info-circle me-1"></i> Seleccione un Tipo de Acción en la tabla de Seguimiento Detallado
                </div>
            `;
        }
    }

    /**
     * Construir línea de tiempo
     */
    buildTimeline(record) {
        const fechas = [
            { label: 'Detección', value: record.fecha_deteccion, color: '#28a745' },
            { label: 'Último seguimiento', value: record.fecha_ultimo_seguimiento, color: '#6c757d' },
            { label: 'Compromiso', value: record.fecha_compromiso, color: '#0d47a1' },
            { label: 'Implementación real', value: record.fecha_implementacion, color: '#e65100' },
            { label: 'Cierre oficial', value: record.fecha_cierre, color: '#1b5e20' }
        ];

        let html = '<div class="detail-timeline">';
        fechas.forEach((f, i) => {
            const fecha = this.formatDate(f.value);
            const isLast = i === fechas.length - 1;
            html += `
                <div class="timeline-item ${isLast ? 'timeline-last' : ''}">
                    <div class="timeline-dot" style="background-color: ${f.color};"></div>
                    <div class="timeline-line"></div>
                    <div class="timeline-content">
                        <div class="timeline-label">${f.label}</div>
                        <div class="timeline-value">${fecha}</div>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        return html;
    }

    /**
     * Guardar diligenciamiento de un hallazgo en Supabase.
     * Lee los valores del DOM de la fila correspondiente y llama a diligenciaService.save().
     * @param {string} codigo - Código del hallazgo (PK en Supabase)
     * @param {number} idx    - Índice del registro en currentData (para actualizar memoria y UI)
     */
    async guardarDiligencia(codigo, idx) {
        const record = this.currentData[idx];
        if (!record) return;

        // Leer valores actuales de los inputs/textareas de la fila
        const tipo = record.tipo_accion || '';
        const payload = { tipo_accion: tipo };

        const elOm     = document.getElementById(`ac_om_${idx}`);
        const elAvance = document.getElementById(`ac_avance_${idx}`);
        const avanceVal = elAvance ? parseInt(elAvance.value, 10) : dataManager.getOmAvance(record, tipo);

        if (tipo === 'Acción Correctiva') {
            const elTipoV = document.getElementById(`ac_tipoval_${idx}`);
            const elResV  = document.getElementById(`ac_resval_${idx}`);
            payload.accion_correctiva    = elOm ? elOm.value : (record.accion_correctiva || '');
            payload.avance_porcentaje    = isNaN(avanceVal) ? 0 : avanceVal;
            payload.tipo_validacion      = elTipoV ? elTipoV.value : (record.tipo_validacion || '');
            payload.resultado_validacion = elResV  ? elResV.value  : (record.resultado_validacion || '');
        } else if (tipo === 'Corrección') {
            payload.correccion_descripcion = elOm ? elOm.value : (record.correccion_descripcion || '');
            payload.avance_porcentaje = isNaN(avanceVal) ? 0 : avanceVal;
        } else if (tipo === 'Acción de Mejora') {
            payload.mejora_descripcion = elOm ? elOm.value : (record.mejora_descripcion || '');
            payload.avance_porcentaje = isNaN(avanceVal) ? 0 : avanceVal;
        }

        // Actualizar registro en memoria y en el dataset consolidado
        Object.assign(record, payload);
        dataManager.syncRecordByCodigo(codigo, payload);

        // Feedback visual inmediato: cambiar icono a spinner
        const btn = this._findSaveButton(idx);
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        }

        const ok = await diligenciaService.save(codigo, payload);

        if (btn) {
            if (ok) {
                btn.innerHTML = '<i class="fas fa-check"></i>';
                btn.classList.add('saved');
                setTimeout(() => {
                    btn.innerHTML = '<i class="fas fa-save"></i>';
                    btn.classList.remove('saved');
                    btn.disabled = false;
                }, 1800);
            } else {
                btn.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
                btn.classList.add('error');
                setTimeout(() => {
                    btn.innerHTML = '<i class="fas fa-save"></i>';
                    btn.classList.remove('error');
                    btn.disabled = false;
                }, 2500);
            }
        }

        this._refreshAvanceBadge(idx, dataManager.getOmAvance(record, tipo));
    }

    /**
     * Localizar el botón guardar de una fila por índice.
     */
    _findSaveButton(idx) {
        const select = document.querySelector(`.tipo-accion-select[data-index="${idx}"]`);
        if (!select) return null;
        const row = select.closest('tr');
        if (!row) return null;
        return row.querySelector('.btn-save-diligencia');
    }

    /**
     * Refrescar visualmente la barra de avance en la fila del hallazgo.
     */
    _refreshAvanceBadge(idx, avance) {
        const select = document.querySelector(`.tipo-accion-select[data-index="${idx}"]`);
        if (!select) return;
        const row = select.closest('tr');
        if (!row) return;
        const bar = row.querySelector('.progress-bar');
        const label = row.querySelector('.progress-bar + small');
        if (bar) {
            bar.style.width = `${avance}%`;
            bar.className = `progress-bar ${avance >= 100 ? 'bg-success' : avance > 0 ? 'bg-primary' : 'bg-secondary'}`;
        }
        if (label) label.textContent = `${avance}%`;
    }

    /**
     * Utilidades de formato
     */
    formatDate(dateInput) {
        if (!dateInput && dateInput !== 0) return 'N/A';

        let date = null;

        // Número (posible fecha Excel serial)
        if (typeof dateInput === 'number') {
            date = dataManager.parseDate(dateInput);
        } else if (typeof dateInput === 'string') {
            date = dataManager.parseDate(dateInput);
        } else if (dateInput instanceof Date) {
            date = dateInput;
        } else if (dateInput && typeof dateInput === 'object' && dateInput.getTime) {
            // In case a Date-like object is passed
            date = dateInput;
        } else {
            return 'N/A';
        }

        if (!date) return 'N/A';

        // Si getTime es una función, validar su valor
        if (typeof date.getTime === 'function') {
            if (isNaN(date.getTime())) return 'N/A';
        } else {
            // intentar convertir objetos no Date a Date (por ejemplo objeto plain con valor numérico)
            console.warn('⚠ formatDate: valor inesperado para fecha, intentando conversión:', date);
            try {
                const converted = new Date(date);
                if (isNaN(converted.getTime())) return 'N/A';
                date = converted;
            } catch (e) {
                return 'N/A';
            }
        }

        if (typeof date.toLocaleDateString !== 'function') {
            // último recurso: convertir a Date
            try {
                date = new Date(date);
            } catch (e) {
                return 'N/A';
            }
        }

        return date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    escape(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    getEstadoClass(estado) {
        const classes = {
            'Abierto': 'estado-abierto',
            'En ejecución': 'estado-ejecucion',
            'Cerrado': 'estado-cerrado',
            'Vencido': 'estado-vencido'
        };
        return 'estado-badge ' + (classes[estado] || 'estado-abierto');
    }

    getCriticidadClass(criticidad) {
        const classes = {
            'Alto': 'criticidad-alto',
            'Medio': 'criticidad-medio',
            'Bajo': 'criticidad-bajo'
        };
        return classes[criticidad] || 'criticidad-bajo';
    }

    getSemaforoIcon(semaforo) {
        const icons = {
            'Vencido': '🔴',
            'Próximo a vencer': '🟡',
            'En término': '🟢'
        };
        return icons[semaforo] || '⚪';
    }
}

// Exportar instancia global
const dashboard = new Dashboard();
