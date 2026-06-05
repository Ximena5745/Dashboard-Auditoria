/**
 * DASHBOARD - Renderización de gráficos, KPIs y tablas
 */

class Dashboard {
    constructor() {
        this.charts = {};
        this.currentData = [];
    }

    /**
     * Inicializar dashboard
     */
    init() {
        this.updateDashboard(dataManager.getData());
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
     * Gráfico: Procesos (Bar Chart)
     */
    updateChartProcesos(data) {
        const clusters = dataManager.getByCluster('proceso', data);
        // Usar proceso_display para etiquetas más descriptivas
        const processLabels = {};
        data.forEach(record => {
            const clusterKey = record.proceso || 'Sin especificar';
            const displayKey = record.proceso_display || record.proceso || 'Sin especificar';
            if (!processLabels[clusterKey]) processLabels[clusterKey] = displayKey;
        });

        const labels = Object.keys(clusters).slice(0, 10);
        const displayLabels = labels.map(l => {
            const display = processLabels[l] || l;
            return display.length > 35 ? display.substring(0, 35) + '...' : display;
        });
        const values = labels.map(label => clusters[label].length);
        
        const ctx = document.getElementById('chartProcesos').getContext('2d');
        
        if (this.charts.procesos) {
            this.charts.procesos.destroy();
        }

        this.charts.procesos = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: displayLabels,
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
                plugins: {
                    legend: {
                        display: true,
                        labels: { font: { weight: 'bold' } }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Hallazgos: ${context.parsed.x}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: { stepSize: 1 },
                        grid: { drawBorder: false }
                    },
                    y: {
                        grid: { drawBorder: false }
                    }
                }
            }
        });
    }

    /**
     * Gráfico: Estados (Stacked Bar)
     */
    updateChartEstados(data) {
        const clusters = dataManager.getByCluster('estado', data);
        const estados = ['Abierto', 'En ejecución', 'Cerrado', 'Vencido'];
        const values = estados.map(estado => (clusters[estado] || []).length);
        
        const ctx = document.getElementById('chartEstados').getContext('2d');
        
        if (this.charts.estados) {
            this.charts.estados.destroy();
        }

        const colors = {
            'Abierto': '#0d47a1',
            'En ejecución': '#e65100',
            'Cerrado': '#1b5e20',
            'Vencido': '#b71c1c'
        };

        this.charts.estados = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Estados'],
                datasets: estados.map((estado, idx) => ({
                    label: estado,
                    data: [values[idx]],
                    backgroundColor: colors[estado],
                    borderColor: colors[estado],
                    borderWidth: 1
                }))
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    x: {
                        stacked: true,
                        beginAtZero: true,
                        ticks: { stepSize: 1 }
                    },
                    y: {
                        stacked: true
                    }
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { font: { weight: 'bold' }, padding: 15 }
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
        const tbody = document.getElementById('tbodyDetallado');
        tbody.innerHTML = '';

        data.forEach((item, idx) => {
            const estadoClass = this.getEstadoClass(item.estado);
            const criticidadClass = this.getCriticidadClass(item.criticidad);
            
            const row = document.createElement('tr');
            row.style.cursor = 'pointer';
            row.innerHTML = `
                <td><strong>${this.escape(item.codigo)}</strong></td>
                <td>${this.escape(item.auditoria)}</td>
                <td>${this.formatDate(item.fecha_deteccion)}</td>
                <td>${this.escape(item.proceso_display || item.proceso).substring(0, 30)}...</td>
                <td><span class="${criticidadClass}">${this.escape(item.criticidad)}</span></td>
                <td>${this.escape(item.descripcion).substring(0, 40)}...</td>
                <td>${this.escape(item.responsable_proceso)}</td>
                <td>
                    <div style="min-width: 60px;">
                        <small>${item.avance_porcentaje}%</small>
                    </div>
                </td>
                <td><span class="${estadoClass}">${this.escape(item.estado)}</span></td>
                <td>${this.escape(item.resultado_validacion)}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" data-index="${idx}" onclick="dashboard.showDetail(${idx})">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            `;
            row.addEventListener('click', () => this.showDetail(idx));
            tbody.appendChild(row);
        });

        // Inicializar DataTable si no existe
        if (!$.fn.DataTable.isDataTable('#tablaSeguimientoDetallado')) {
            $('#tablaSeguimientoDetallado').DataTable({
                paging: true,
                pageLength: 25,
                lengthMenu: [10, 25, 50, 100],
                searching: true,
                ordering: true,
                responsive: true,
                language: {
                    url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json'
                }
            });
        } else {
            $('#tablaSeguimientoDetallado').DataTable().clear().rows.add($(tbody.querySelectorAll('tr'))).draw();
        }
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
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="text-center fw-bold">${idx + 1}</td>
                <td><strong>${this.escape(item.codigo)}</strong></td>
                <td>${this.escape(item.proceso_display || item.proceso).substring(0, 25)}...</td>
                <td><span class="${criticidadClass}">${this.escape(item.criticidad)}</span></td>
                <td class="text-center">
                    <span class="badge bg-danger">${Math.max(0, item.dias_vencidos)} días</span>
                </td>
                <td class="text-center">${item.avance_porcentaje}%</td>
                <td class="text-center"><strong>${Math.round(item.score_prioridad)}</strong></td>
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
     * Mostrar detalle de hallazgo
     */
    showDetail(index) {
        const record = this.currentData[index];
        if (!record) return;

        const offcanvas = new bootstrap.Offcanvas(document.getElementById('panelDetalleHallazgo'));
        
        let html = `
            <div class="detail-section">
                <div class="detail-label">Código Hallazgo</div>
                <div class="detail-value">${this.escape(record.codigo)}</div>
            </div>

            <div class="detail-section">
                <div class="detail-label">Auditoría</div>
                <div class="detail-value">${this.escape(record.auditoria)}</div>
                <div class="detail-label mt-2">Origen</div>
                <div class="detail-value"><span class="badge bg-info">${this.escape(record.origen)}</span></div>
            </div>

            <div class="detail-section">
                <div class="detail-label">Proceso / Subproceso</div>
                <div class="detail-value">${this.escape(record.proceso_display || record.proceso)}</div>
            </div>

            <div class="detail-section">
                <div class="detail-label">Criticidad</div>
                <div class="detail-value"><span class="${this.getCriticidadClass(record.criticidad)}">${this.escape(record.criticidad)}</span></div>
                <div class="detail-label mt-2">Estado</div>
                <div class="detail-value"><span class="${this.getEstadoClass(record.estado)}">${this.escape(record.estado)}</span></div>
            </div>

            <div class="detail-section">
                <div class="detail-label">Descripción del Hallazgo</div>
                <div class="detail-value">${this.escape(record.descripcion)}</div>
            </div>

            <div class="detail-section">
                <div class="detail-label">Criterio Incumplido</div>
                <div class="detail-value">${this.escape(record.criterio_incumplido)}</div>
            </div>

            <div class="detail-section">
                <div class="detail-label">Riesgos Asociados</div>
                <div class="detail-value">${this.escape(record.riesgos) || 'N/A'}</div>
            </div>

            <div class="detail-section">
                <div class="detail-label">Causa Raíz</div>
                <div class="detail-value">${this.escape(record.causa_raiz) || 'No especificada'}</div>
            </div>

            <div class="detail-section">
                <div class="detail-label">Responsable del Proceso</div>
                <div class="detail-value">${this.escape(record.responsable_proceso)}</div>
            </div>

            <div class="detail-section">
                <div class="detail-label">Fechas Clave</div>
                <div class="detail-value">
                    <strong>Detección:</strong> ${this.formatDate(record.fecha_deteccion)}<br>
                    <strong>Compromiso:</strong> ${this.formatDate(record.fecha_compromiso)}<br>
                    <strong>Implementación:</strong> ${this.formatDate(record.fecha_implementacion)}<br>
                    <strong>Cierre:</strong> ${this.formatDate(record.fecha_cierre)}
                </div>
            </div>

            <div class="detail-section">
                <div class="detail-label">Línea de Tiempo - Semáforo</div>
                <div class="detail-value">
                    ${this.getSemaforoIcon(record.semaforo)} ${record.semaforo}
                </div>
            </div>

            <div class="detail-section">
                <div class="detail-label">Avance de Acción</div>
                <div class="detail-value">
                    <div class="progress" style="height: 25px;">
                        <div class="progress-bar" style="width: ${record.avance_porcentaje}%">
                            ${record.avance_porcentaje}%
                        </div>
                    </div>
                </div>
            </div>

            <div class="detail-section">
                <div class="detail-label">Tipo de Acción</div>
                <div class="detail-value">${this.escape(record.tipo_accion)}</div>
                <div class="detail-label mt-2">Responsable de Acción</div>
                <div class="detail-value">${this.escape(record.responsable_accion)}</div>
            </div>

            <div class="detail-section">
                <div class="detail-label">Acción Correctiva / Mejora</div>
                <div class="detail-value">${this.escape(record.accion_correctiva)}</div>
            </div>

            <div class="detail-section">
                <div class="detail-label">Validación</div>
                <div class="detail-value">
                    <strong>Tipo:</strong> ${this.escape(record.tipo_validacion)}<br>
                    <strong>Resultado:</strong> ${this.escape(record.resultado_validacion)}<br>
                    <strong>Auditor:</strong> ${this.escape(record.auditor_valida)}
                </div>
            </div>

            <div class="detail-section">
                <div class="detail-label">Reincidencia</div>
                <div class="detail-value">
                    ${record.es_reincidente ? 
                        '<span class="badge bg-warning text-dark">SÍ - Reincidente</span>' : 
                        '<span class="badge bg-success">No</span>'}
                </div>
            </div>

            <div class="detail-section">
                <div class="detail-label">Observaciones</div>
                <div class="detail-value">${this.escape(record.observaciones) || 'Sin observaciones'}</div>
            </div>

            <div class="detail-section">
                <div class="detail-label">Comentarios de Cierre</div>
                <div class="detail-value">${this.escape(record.comentarios_cierre) || 'N/A'}</div>
            </div>
        `;

        document.getElementById('contenidoDetalleHallazgo').innerHTML = html;
        offcanvas.show();
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
