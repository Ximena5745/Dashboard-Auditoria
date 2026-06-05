/**
 * DATA MANAGER - Gestión de datos Excel
 * Lectura, consolidación y transformación de datos
 */

class DataManager {
    constructor() {
        this.rawData = [];
        this.consolidatedData = [];
        this.excelFile = 'data/Matriz_Seguimiento_Hallazgos.xlsx';

        // Mapeo de columnas por hoja: clave_interna -> nombre_columna_Excel
        this.columnMapping = {
            'Base Hallazgos SIG': {
                'codigo': 'Código Hallazgo',
                'fecha_deteccion': 'Fecha de Detección',
                'auditoria': 'Auditoría',
                'proceso': 'Proceso',
                'subproceso': 'Subproceso',
                'responsable_proceso': 'Responsable del Proceso',
                'criterio_incumplido': 'Criterio Incumplido',
                'descripcion': 'Descripción del Hallazgo',
                'evidencia': 'Evidencia',
                'causa_raiz': 'Causa Raíz',
                'riesgos': 'Riesgos Asociados',
                'accion_correctiva': 'Acción Correctiva',
                'avance_raw': 'Avance',
                'tipo_accion': 'Tipo de Acción',
                'responsable_accion': 'Responsable de la Acción',
                'area_responsable': 'Área Responsable',
                'fecha_compromiso': 'Fecha Compromiso',
                'evidencia_esperada': 'Evidencia Esperada',
                'indicador_cumplimiento': 'Indicador de Cumplimiento',
                'avance_porcentaje': '% Avance',
                'fecha_ultimo_seguimiento': 'Fecha Último Seguimiento',
                'observaciones': 'Observaciones de Seguimiento',
                'escalado_direccion': 'Escalado a Dirección',
                'fecha_escalamiento': 'Fecha de Escalamiento',
                'fecha_implementacion': 'Fecha Implementación Real',
                'tipo_validacion': 'Tipo de Validación',
                'resultado_validacion': 'Resultado de Validación',
                'auditor_valida': 'Auditor que Valida',
                'fecha_cierre': 'Fecha Cierre Oficial',
                'reincidencia': 'Reincidencia',
                'impacto_mitigado': 'Impacto Mitigado',
                'comentarios_cierre': 'Comentarios de Cierre'
            },
            'Base Hallazgos Aseguramiento': {
                'codigo': 'Código Hallazgo',
                'fecha_deteccion': 'Fecha de Cierre',
                'auditoria': 'Auditoría',
                'proceso': 'Proceso',
                'subproceso': 'Subproceso',
                'responsable_proceso': 'Responsable del Proceso',
                'criticidad': 'Criticidad',
                'criterio_incumplido': 'Criterio Incumplido',
                'descripcion': 'Descripción del Hallazgo',
                'riesgos': 'Riesgos Asociados',
                'accion_correctiva': 'Acciones / Actividades',
                'tipo_accion': 'Tipo de Acción',
                'responsable_accion': 'Responsable de la Acción',
                'area_responsable': 'Área Responsable',
                'fecha_compromiso': 'Fecha Compromiso',
                'evidencia_esperada': 'Evidencia Esperada',
                'indicador_cumplimiento': 'Indicador de Cumplimiento',
                'avance_porcentaje': '% Avance',
                'fecha_ultimo_seguimiento': 'Fecha Último Seguimiento',
                'observaciones': 'Observaciones de Seguimiento',
                'escalado_direccion': 'Escalado a Dirección',
                'fecha_escalamiento': 'Fecha de Escalamiento',
                'fecha_implementacion': 'Fecha Implementación Real',
                'tipo_validacion': 'Tipo de Validación',
                'resultado_validacion': 'Resultado de Validación',
                'auditor_valida': 'Auditor que Valida',
                'fecha_cierre': 'Fecha Cierre Oficial',
                'reincidencia': 'Reincidencia',
                'impacto_mitigado': 'Impacto Mitigado',
                'comentarios_cierre': 'Comentarios de Cierre'
            }
        };

        // Columnas clave para determinar si una fila tiene datos reales
        this.keyColumns = ['codigo', 'auditoria', 'proceso', 'descripcion'];
    }

    /**
     * Cargar datos desde Excel
     */
    async loadData() {
        try {
            console.log(`🔎 Intentando cargar archivo Excel: ${this.excelFile}`);
            const response = await fetch(this.excelFile);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status} ${response.statusText} al solicitar ${this.excelFile}`);
            }
            const buffer = await response.arrayBuffer();

            let workbook;
            try {
                workbook = XLSX.read(buffer, { type: 'array' });
            } catch (e) {
                console.error('✗ Error leyendo el workbook con SheetJS:', e);
                throw new Error('SheetJS no pudo leer el archivo: ' + (e.message || e));
            }

            console.log('📑 Hojas detectadas:', workbook.SheetNames);

            this.rawData = [];

            // Hojas a procesar
            const sheetsToProcess = ['Base Hallazgos SIG', 'Base Hallazgos Aseguramiento'];

            sheetsToProcess.forEach((sheetName, index) => {
                const exists = workbook.SheetNames.includes(sheetName);
                if (!exists) {
                    console.warn(`⚠ Hoja no encontrada: ${sheetName}`);
                    return;
                }

                const worksheet = workbook.Sheets[sheetName];
                const allData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
                console.log(`📄 Hoja '${sheetName}' - filas totales en Excel: ${allData.length}`);

                // Filtrar filas completamente vacías (sin datos en columnas clave)
                const data = allData.filter(row => {
                    return this.keyColumns.some(key => {
                        const mapping = this.columnMapping[sheetName];
                        const excelCol = mapping[key];
                        const val = row[excelCol];
                        return val !== undefined && val !== null && String(val).trim() !== '';
                    });
                });

                console.log(`📄 Hoja '${sheetName}' - filas con datos reales: ${data.length} (filtradas ${allData.length - data.length} vacías)`);

                if (data.length > 0) {
                    console.log('📌 Ejemplo fila:', JSON.stringify(data[0]).substring(0, 300));
                    console.log('🔤 Encabezados Excel:', Object.keys(data[0]));
                }

                // Procesar registros
                data.forEach((row, rowIndex) => {
                    const record = this.normalizeRecord(row, sheetName, index);

                    // Si no tiene código, generamos uno
                    if (!record.codigo || String(record.codigo).trim() === '') {
                        const shortSheet = sheetName.replace(/\s+/g, '').substring(0, 8);
                        record.codigo = `GEN-${shortSheet}-${index + 1}-${rowIndex + 1}`;
                        record._generatedCodigo = true;
                    }

                    record.origen = index === 0 ? 'SIG' : 'Aseguramiento';
                    this.rawData.push(record);
                });
            });

            // Consolidar y procesar datos
            this.consolidateData();
            console.log(`✓ Registros totales válidos: ${this.rawData.length}`);
            console.log(`✓ Datos consolidados: ${this.consolidatedData.length} registros`);
            return true;
        } catch (error) {
            console.error('✗ Error al cargar Excel:', error);
            alert('Error al cargar el archivo Excel. Verifica que esté en /data/Matriz_Seguimiento_Hallazgos.xlsx');
            return false;
        }
    }

    /**
     * Normalizar registro (mapear columnas)
     */
    normalizeRecord(row, sheetName, sheetIndex) {
        const mapping = this.columnMapping[sheetName];
        const normalized = {};

        Object.keys(mapping).forEach(key => {
            const excelColumnName = mapping[key];
            normalized[key] = row[excelColumnName] !== undefined ? row[excelColumnName] : '';
        });

        // Construir proceso combinando Proceso + Subproceso si ambos existen
        const proceso = String(normalized.proceso || '').trim();
        const subproceso = String(normalized.subproceso || '').trim();
        if (proceso && subproceso && proceso !== subproceso) {
            normalized.proceso_display = `${proceso} - ${subproceso}`;
        } else if (proceso) {
            normalized.proceso_display = proceso;
        } else if (subproceso) {
            normalized.proceso_display = subproceso;
        } else {
            normalized.proceso_display = '';
        }

        // Criticidad: para SIG no existe la columna, intentar inferir
        normalized.criticidad = this.inferCriticidad(normalized, sheetName);

        // Avance: manejar tanto decimal (0.4) como porcentaje (40) como string ("40%")
        normalized.avance_porcentaje = this.parseAvance(normalized);

        // Estado: determinar lógicamente ya que las fórmulas de Excel no se evalúan
        normalized.estado = this.determineState(normalized);

        // Días vencidos
        normalized.dias_vencidos = this.calculateDaysOverdue(normalized.fecha_compromiso);

        // Semáforo
        normalized.semaforo = this.calculateTrafficLight(normalized);

        // Reincidencia
        normalized.es_reincidente = String(normalized.reincidencia || '').toLowerCase().includes('si') ||
                                   String(normalized.reincidencia || '').toLowerCase().includes('yes');

        return normalized;
    }

    /**
     * Inferir criticidad cuando no existe la columna
     * Para SIG no hay columna Criticidad; inferimos del Criterio Incumplido o默认 'Medio'
     */
    inferCriticidad(record, sheetName) {
        // Si ya tiene criticidad válida (ASEG la tiene)
        const crit = String(record.criticidad || '').trim();
        if (['Alto', 'Medio', 'Bajo'].includes(crit)) {
            return crit;
        }

        // Para SIG: no hay columna Criticidad, usar lógica de inferencia
        // Si el avance es 100% => Bajo (resuelto)
        // Si el avance es 0% => Alto (no iniciado)
        // Si tiene avance parcial => Medio
        const avance = record.avance_porcentaje || 0;
        if (avance >= 1) return 'Bajo';
        if (avance === 0) return 'Alto';
        return 'Medio';
    }

    /**
     * Parsear avance desde múltiples formatos posibles
     * - Decimal: 0.4 -> 40%
     * - Porcentaje directo: 40 -> 40%
     * - String: "40%" -> 40%
     */
    parseAvance(record) {
        // Intentar con % Avance primero
        let val = record.avance_porcentaje;
        let num = this.parsePercentage(val);
        if (num > 0) return num;

        // Si % Avance está vacío, usar columna "Avance" (decimal)
        val = record.avance_raw;
        if (val === undefined || val === null || val === '') return 0;

        const str = String(val).replace('%', '').trim();
        const parsed = parseFloat(str);
        if (isNaN(parsed)) return 0;

        // Si el valor es decimal (0-1), convertir a porcentaje
        if (parsed >= 0 && parsed <= 1) {
            return Math.round(parsed * 100);
        }
        // Si ya es porcentaje (>1)
        return Math.min(100, Math.max(0, Math.round(parsed)));
    }

    /**
     * Consolidar y procesar datos
     */
    consolidateData() {
        this.consolidatedData = this.rawData.map(record => ({
            ...record,
            score_prioridad: this.calculatePriorityScore(record)
        }));
    }

    /**
     * Determinar estado basado en los datos disponibles
     */
    determineState(record) {
        // Si ya tiene un estado Automático válido
        const estado = String(record.estado_automatico || '').toLowerCase();
        if (estado.includes('cerrado')) return 'Cerrado';
        if (estado.includes('vencido')) return 'Vencido';
        if (estado.includes('ejecución') || estado.includes('execution')) return 'En ejecución';
        if (estado.includes('abierto')) return 'Abierto';

        // Determinar por lógica de negocio
        const avance = record.avance_porcentaje || 0;
        const diasVencidos = this.calculateDaysOverdue(record.fecha_compromiso);

        if (avance >= 100) return 'Cerrado';
        if (diasVencidos > 0) return 'Vencido';
        if (avance > 0) return 'En ejecución';
        return 'Abierto';
    }

    /**
     * Calcular semáforo de gestión
     */
    calculateTrafficLight(record) {
        const diasVencidos = this.calculateDaysOverdue(record.fecha_compromiso);
        if (diasVencidos > 0) return 'Vencido';
        if (diasVencidos > -5) return 'Próximo a vencer';
        return 'En término';
    }

    /**
     * Calcular días vencidos
     */
    calculateDaysOverdue(dateString) {
        if (!dateString) return 0;
        const date = this.parseDate(dateString);
        if (!date) return 0;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const diffTime = today - date;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    }

    /**
     * Parsear fecha (acepta múltiples formatos)
     */
    parseDate(dateString) {
        if (!dateString) return null;

        // Si es número (formato Excel serial)
        if (typeof dateString === 'number') {
            const excelDate = new Date((dateString - 25569) * 86400 * 1000);
            return excelDate;
        }

        // Si es Date
        if (dateString instanceof Date) {
            return isNaN(dateString.getTime()) ? null : dateString;
        }

        // String
        dateString = String(dateString).trim();
        if (!dateString) return null;

        const formats = [
            /(\d{4})-(\d{2})-(\d{2})/,  // YYYY-MM-DD
            /(\d{2})\/(\d{2})\/(\d{4})/, // DD/MM/YYYY
            /(\d{2})-(\d{2})-(\d{4})/,   // DD-MM-YYYY
            /(\d{4})\/(\d{2})\/(\d{2})/  // YYYY/MM/DD
        ];

        for (let format of formats) {
            const match = dateString.match(format);
            if (match) {
                let year, month, day;
                if (match[1].length === 4) {
                    year = parseInt(match[1]);
                    month = parseInt(match[2]) - 1;
                    day = parseInt(match[3]);
                } else {
                    day = parseInt(match[1]);
                    month = parseInt(match[2]) - 1;
                    year = parseInt(match[3]);
                }
                return new Date(year, month, day);
            }
        }

        return null;
    }

    /**
     * Parsear porcentaje
     */
    parsePercentage(value) {
        if (value === undefined || value === null || value === '') return 0;
        const str = String(value).replace('%', '').trim();
        const num = parseFloat(str);
        return isNaN(num) ? 0 : Math.min(100, Math.max(0, num));
    }

    /**
     * Calcular score de prioridad
     */
    calculatePriorityScore(record) {
        const criticidadMap = { 'Alto': 3, 'Medio': 2, 'Bajo': 1 };
        const criticidad = criticidadMap[record.criticidad] || 1;
        const diasVencidos = Math.max(0, record.dias_vencidos + 1);
        const avanceRestante = 100 - record.avance_porcentaje;
        return criticidad * diasVencidos * avanceRestante;
    }

    /**
     * Obtener procesos únicos
     */
    getUniqueProcesos() {
        const procesos = new Set();
        this.consolidatedData.forEach(record => {
            const proc = record.proceso_display || record.proceso;
            if (proc) procesos.add(proc);
        });
        return Array.from(procesos).sort();
    }

    /**
     * Obtener auditorías únicas
     */
    getAuditorias() {
        const auditorias = new Set();
        this.consolidatedData.forEach(record => {
            if (record.auditoria) auditorias.add(record.auditoria);
        });
        return Array.from(auditorias).sort();
    }

    /**
     * Filtrar datos según criterios
     */
    filterData(filters) {
        return this.consolidatedData.filter(record => {
            if (filters.proceso) {
                const proc = record.proceso_display || record.proceso;
                if (proc !== filters.proceso) return false;
            }
            if (filters.auditoria && record.auditoria !== filters.auditoria) return false;
            if (filters.criticidad && record.criticidad !== filters.criticidad) return false;
            if (filters.estado && record.estado !== filters.estado) return false;
            if (filters.origen && record.origen !== filters.origen) return false;
            return true;
        });
    }

    /**
     * Búsqueda global
     */
    globalSearch(keyword, data = this.consolidatedData) {
        const kw = keyword.toLowerCase();
        return data.filter(record => {
            return JSON.stringify(record).toLowerCase().includes(kw);
        });
    }

    /**
     * Obtener datos consolidados
     */
    getData() {
        return this.consolidatedData;
    }

    /**
     * Obtener estadísticas
     */
    getStatistics(data = null) {
        const allRecords = data || this.consolidatedData;
        const stats = {
            total: allRecords.length,
            criticos: allRecords.filter(r => r.criticidad === 'Alto').length,
            medios: allRecords.filter(r => r.criticidad === 'Medio').length,
            bajos: allRecords.filter(r => r.criticidad === 'Bajo').length,
            cerrados: allRecords.filter(r => r.estado === 'Cerrado').length,
            vencidos: allRecords.filter(r => r.estado === 'Vencido').length,
            sin_avance: allRecords.filter(r => r.avance_porcentaje === 0).length,
            reincidentes: allRecords.filter(r => r.es_reincidente).length,
        };

        stats.pct_cumplimiento = stats.total > 0 ? Math.round((stats.cerrados / stats.total) * 100) : 0;
        stats.avance_promedio = stats.total > 0 ? Math.round(allRecords.reduce((sum, r) => sum + r.avance_porcentaje, 0) / stats.total) : 0;
        stats.pct_reincidencia = stats.total > 0 ? Math.round((stats.reincidentes / stats.total) * 100) : 0;

        return stats;
    }

    /**
     * Obtener resumen por auditoría
     */
    getSummaryByAuditoria(data = null) {
        const records = data || this.consolidatedData;
        const summary = {};

        records.forEach(record => {
            const aud = record.auditoria || 'Sin Auditoría';
            if (!summary[aud]) {
                summary[aud] = {
                    auditoria: aud,
                    total: 0,
                    altos: 0,
                    medios: 0,
                    bajos: 0,
                    avance_sum: 0
                };
            }

            summary[aud].total++;
            if (record.criticidad === 'Alto') summary[aud].altos++;
            if (record.criticidad === 'Medio') summary[aud].medios++;
            if (record.criticidad === 'Bajo') summary[aud].bajos++;
            summary[aud].avance_sum += record.avance_porcentaje;
        });

        Object.values(summary).forEach(item => {
            item.avance_promedio = item.total > 0 ? Math.round(item.avance_sum / item.total) : 0;
        });

        return Object.values(summary).sort((a, b) => b.total - a.total);
    }

    /**
     * Obtener top N hallazgos críticos
     */
    getTopCritical(n = 10, data = null) {
        const records = data || this.consolidatedData;
        return records
            .sort((a, b) => b.score_prioridad - a.score_prioridad)
            .slice(0, n);
    }

    /**
     * Calcular nivel de riesgo del proceso
     */
    calculateProcessRisk(data = null) {
        const records = data || this.consolidatedData;
        if (records.length === 0) return 'Bajo';

        const criticos = records.filter(r => r.criticidad === 'Alto').length;
        const vencidos = records.filter(r => r.estado === 'Vencido').length;
        const reincidentes = records.filter(r => r.es_reincidente).length;
        const promedio_avance = records.reduce((sum, r) => sum + r.avance_porcentaje, 0) / records.length;

        const score = (criticos * 3) + (vencidos * 2) + (reincidentes * 1.5) - (promedio_avance * 0.01);
        const normalized_score = (score / records.length) * 10;

        if (normalized_score > 6) return 'Alto';
        if (normalized_score > 3) return 'Medio';
        return 'Bajo';
    }

    /**
     * Obtener datos agrupados por campo
     */
    getByCluster(groupBy, data = null) {
        const records = data || this.consolidatedData;
        const clusters = {};

        records.forEach(record => {
            let key = record[groupBy] || 'Sin especificar';
            // Para proceso, usar proceso_display
            if (groupBy === 'proceso') {
                key = record.proceso_display || record.proceso || 'Sin especificar';
            }
            if (!clusters[key]) clusters[key] = [];
            clusters[key].push(record);
        });

        return clusters;
    }
}

// Exportar instancia global
const dataManager = new DataManager();
