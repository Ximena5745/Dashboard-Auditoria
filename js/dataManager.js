/**
 * DATA MANAGER - Gestión de datos Excel
 * Lectura, consolidación y transformación de datos
 */

class DataManager {
    constructor() {
        this.rawData = [];
        this.consolidatedData = [];
        this.excelFile = 'data/Matriz_Seguimiento_Hallazgos.xlsx';
        
        // Mapeo de nombres de columnas entre hojas
        this.columnMapping = {
            'Base Hallazgos SIG': {
                'codigo': 'Código Hallazgo',
                'fecha_deteccion': 'Fecha de Detección',
                'auditoria': 'Auditoría',
                'proceso': 'Proceso / Subproceso Auditado',
                'responsable_proceso': 'Responsable del Proceso',
                'criticidad': 'Criticidad',
                'criterio_incumplido': 'Criterio Incumplido',
                'descripcion': 'Descripción del Hallazgo',
                'evidencia': 'Evidencia',
                'causa_raiz': 'Causa Raíz',
                'riesgos': 'Riesgos Asociados',
                'accion_correctiva': 'Acción Correctiva',
                'avance_original': 'Avance',
                'tipo_accion': 'Tipo de Acción',
                'responsable_accion': 'Responsable de la Acción',
                'area_responsable': 'Área Responsable',
                'fecha_compromiso': 'Fecha Compromiso',
                'evidencia_esperada': 'Evidencia Esperada',
                'indicador_cumplimiento': 'Indicador de Cumplimiento',
                'estado_automatico': 'Estado Automático',
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
                'proceso': 'Proceso / Subproceso Auditado',
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
                'estado_automatico': 'Estado Automático',
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
    }

    /**
     * Cargar datos desde Excel
     */
    async loadData() {
        try {
            console.log(`🔎 Intentando cargar archivo Excel: ${this.excelFile}`);
            const response = await fetch(this.excelFile);
            console.log('🔁 Fetch response:', response);
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

            console.log('📑 Hojas detectadas en el workbook:', workbook.SheetNames);
            console.log('📑 Hojas (visibles con delimitadores):', workbook.SheetNames.map(s => `[${s}]`).join(', '));
            
            // Hojas a procesar
            const sheetsToProcess = ['Base Hallazgos SIG', 'Base Hallazgos Aseguramiento'];
            
            sheetsToProcess.forEach((sheetName, index) => {
                const exists = workbook.SheetNames.includes(sheetName);
                console.log(`🔍 Comprobando hoja esperada: [${sheetName}] -> existe: ${exists}`);
                if (!exists) {
                    console.warn(`⚠ Hoja no encontrada: ${sheetName}`);
                    console.log('📑 Hojas disponibles:', workbook.SheetNames.map(s => `[${s}]`).join(', '));
                    return;
                }
                
                const worksheet = workbook.Sheets[sheetName];
                const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
                console.log(`📄 Hoja '${sheetName}' - filas detectadas: ${data.length}`);
                if (data.length > 0) {
                    console.log('📌 Ejemplo fila 0:', data[0]);
                    console.log('🔤 Encabezados detectados (fila 0):', Object.keys(data[0]));

                    const codigoKey = 'Código Hallazgo';
                    const nonEmptyCodigo = data.filter(r => String(r[codigoKey] || '').trim() !== '').length;
                    console.log(`🔎 Filas con '${codigoKey}' no vacío: ${nonEmptyCodigo}`);

                    const possibleCodigoKeys = Object.keys(data[0]).filter(k => /codigo|código/i.test(k));
                    console.log('🔎 Posibles nombres de columna que contienen "codigo":', possibleCodigoKeys);
                }

                // Procesar registros (generar código si falta)
                let generatedCount = 0;
                data.forEach((row, rowIndex) => {
                    const record = this.normalizeRecord(row, sheetName);

                    // Si no tiene código, generamos uno para poder incluir el registro
                    if (!record.codigo || String(record.codigo).trim() === '') {
                        const shortSheet = sheetName.replace(/\s+/g, '').substring(0, 8);
                        record.codigo = `GEN-${shortSheet}-${index + 1}-${rowIndex + 1}`;
                        record._generatedCodigo = true;
                        generatedCount++;
                    }

                    if (record.codigo) {
                        record.origen = index === 0 ? 'SIG' : 'Aseguramiento';
                        this.rawData.push(record);
                    }
                });
                if (generatedCount > 0) console.log(`⚙️ Códigos generados en hoja '${sheetName}': ${generatedCount}`);
            });
            
            // Consolidar y procesar datos
            this.consolidateData();
            console.log(`✓ Raw rows agregadas: ${this.rawData.length}`);
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
    normalizeRecord(row, sheetName) {
        const mapping = this.columnMapping[sheetName];
        const normalized = {};
        
        Object.keys(mapping).forEach(key => {
            const excelColumnName = mapping[key];
            normalized[key] = row[excelColumnName] || '';
        });
        
        // Procesar valores
        normalized.criticidad = String(normalized.criticidad).trim();
        normalized.estado = this.determineState(normalized);
        normalized.avance_porcentaje = this.parsePercentage(normalized.avance_porcentaje);
        normalized.dias_vencidos = this.calculateDaysOverdue(normalized.fecha_compromiso);
        normalized.semaforo = this.calculateTrafficLight(normalized);
        normalized.es_reincidente = String(normalized.reincidencia).toLowerCase().includes('si') || 
                                   String(normalized.reincidencia).toLowerCase().includes('yes');
        
        return normalized;
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
     * Determinar estado
     */
    determineState(record) {
        const estado = String(record.estado_automatico).toLowerCase();
        
        if (estado.includes('cerrado')) return 'Cerrado';
        if (estado.includes('vencido')) return 'Vencido';
        if (estado.includes('ejecución') || estado.includes('execution')) return 'En ejecución';
        if (estado.includes('abierto')) return 'Abierto';
        
        // Lógica alternativa por fecha
        const diasVencidos = this.calculateDaysOverdue(record.fecha_compromiso);
        if (diasVencidos > 0) return 'Vencido';
        if (record.avance_porcentaje === 100 || record.avance_porcentaje === '100') return 'Cerrado';
        if (record.avance_porcentaje > 0) return 'En ejecución';
        
        return 'Abierto';
    }

    /**
     * Calcular semáforo de gestión
     */
    calculateTrafficLight(record) {
        const diasVencidos = this.calculateDaysOverdue(record.fecha_compromiso);
        
        if (diasVencidos > 0) return 'Vencido'; // 🔴
        if (diasVencidos > -5) return 'Próximo a vencer'; // 🟡
        return 'En término'; // 🟢
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
        
        // Si es número (formato Excel)
        if (typeof dateString === 'number') {
            const excelDate = new Date((dateString - 25569) * 86400 * 1000);
            return excelDate;
        }
        
        // String
        dateString = String(dateString).trim();
        
        const formats = [
            /(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
            /(\d{2})\/(\d{2})\/(\d{4})/, // DD/MM/YYYY
            /(\d{2})-(\d{2})-(\d{4})/, // DD-MM-YYYY
            /(\d{4})\/(\d{2})\/(\d{2})/ // YYYY/MM/DD
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
        if (!value) return 0;
        
        const str = String(value).replace('%', '').trim();
        const num = parseFloat(str);
        
        return isNaN(num) ? 0 : Math.min(100, Math.max(0, num));
    }

    /**
     * Calcular score de prioridad
     * Fórmula: Criticidad × Días vencidos × (100 - % Avance)
     */
    calculatePriorityScore(record) {
        const criticidadMap = { 'Alto': 3, 'Medio': 2, 'Bajo': 1 };
        const criticidad = criticidadMap[record.criticidad] || 1;
        const diasVencidos = Math.max(0, record.dias_vencidos + 1); // +1 para evitar 0
        const avanceRestante = 100 - record.avance_porcentaje;
        
        return criticidad * diasVencidos * avanceRestante;
    }

    /**
     * Obtener único de valores en un campo
     */
    getUniqueProcesos() {
        const procesos = new Set();
        this.consolidatedData.forEach(record => {
            if (record.proceso) {
                procesos.add(record.proceso);
            }
        });
        return Array.from(procesos).sort();
    }

    /**
     * Obtener subprocesos por proceso
     */
    getSubprocesos(proceso) {
        if (!proceso) {
            const subprocesos = new Set();
            this.consolidatedData.forEach(record => {
                if (record.proceso) {
                    subprocesos.add(record.proceso);
                }
            });
            return Array.from(subprocesos).sort();
        }
        
        // Si el campo contiene ambos proceso/subproceso separados
        const subprocesos = new Set();
        this.consolidatedData.forEach(record => {
            if (record.proceso && record.proceso.includes(proceso)) {
                subprocesos.add(record.proceso);
            }
        });
        return Array.from(subprocesos).sort();
    }

    /**
     * Obtener auditorías únicas
     */
    getAuditorias() {
        const auditorias = new Set();
        this.consolidatedData.forEach(record => {
            if (record.auditoria) {
                auditorias.add(record.auditoria);
            }
        });
        return Array.from(auditorias).sort();
    }

    /**
     * Filtrar datos según criterios
     */
    filterData(filters) {
        return this.consolidatedData.filter(record => {
            if (filters.proceso && record.proceso !== filters.proceso) return false;
            if (filters.subproceso && record.proceso !== filters.subproceso) return false;
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

        // Excluir registros cuyos códigos fueron generados automáticamente
        const records = allRecords.filter(r => !r._generatedCodigo);

        const stats = {
            total: records.length,
            criticos: records.filter(r => r.criticidad === 'Alto').length,
            medios: records.filter(r => r.criticidad === 'Medio').length,
            bajos: records.filter(r => r.criticidad === 'Bajo').length,
            cerrados: records.filter(r => r.estado === 'Cerrado').length,
            vencidos: records.filter(r => r.estado === 'Vencido').length,
            sin_avance: records.filter(r => r.avance_porcentaje === 0).length,
            reincidentes: records.filter(r => r.es_reincidente).length,
        };
        
        // Porcentajes
        stats.pct_cumplimiento = stats.total > 0 ? Math.round((stats.cerrados / stats.total) * 100) : 0;
        stats.avance_promedio = records.length > 0 ? Math.round(records.reduce((sum, r) => sum + r.avance_porcentaje, 0) / records.length) : 0;
        stats.pct_reincidencia = stats.total > 0 ? Math.round((stats.reincidentes / stats.total) * 100) : 0;
        
        // Debug: mostrar comparación entre total raw y total usado en estadísticas
        if ((allRecords.length - records.length) > 0) {
            console.log(`ℹ️ Estadísticas calculadas: ${records.length} registros válidos (excluidos ${allRecords.length - records.length} con códigos generados).`);
        }

        return stats;
    }

    /**
     * Obtener resumen por auditoría
     */
    getSummaryByAuditoria(data = null) {
        const records = data || this.consolidatedData;
        const summary = {};
        
        records.forEach(record => {
            if (!summary[record.auditoria]) {
                summary[record.auditoria] = {
                    auditoria: record.auditoria,
                    total: 0,
                    altos: 0,
                    medios: 0,
                    bajos: 0,
                    avance_sum: 0
                };
            }
            
            summary[record.auditoria].total++;
            if (record.criticidad === 'Alto') summary[record.auditoria].altos++;
            if (record.criticidad === 'Medio') summary[record.auditoria].medios++;
            if (record.criticidad === 'Bajo') summary[record.auditoria].bajos++;
            summary[record.auditoria].avance_sum += record.avance_porcentaje;
        });
        
        // Calcular porcentaje promedio
        Object.values(summary).forEach(item => {
            item.avance_promedio = Math.round(item.avance_sum / item.total);
        });
        
        return Object.values(summary);
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
        
        // Scoring: criticos (peso 3) + vencidos (peso 2) + reincidentes (peso 1.5) - avance (peso 0.01)
        const score = (criticos * 3) + (vencidos * 2) + (reincidentes * 1.5) - (promedio_avance * 0.01);
        const normalized_score = (score / records.length) * 10;
        
        if (normalized_score > 6) return 'Alto';
        if (normalized_score > 3) return 'Medio';
        return 'Bajo';
    }

    /**
     * Obtener datos agrupados por criticidad
     */
    getByCluster(groupBy, data = null) {
        const records = data || this.consolidatedData;
        const clusters = {};
        
        records.forEach(record => {
            const key = record[groupBy] || 'Sin especificar';
            if (!clusters[key]) clusters[key] = [];
            clusters[key].push(record);
        });
        
        return clusters;
    }
}

// Exportar instancia global
const dataManager = new DataManager();
