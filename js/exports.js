/**
 * EXPORTS - Exportación de datos a Excel, PDF y CSV
 */

class ExportManager {
    constructor() {
        this.filename = `Dashboard_Auditoria_${new Date().toISOString().split('T')[0]}`;
    }

    /**
     * Inicializar botones de exportación
     */
    initExportButtons() {
        document.getElementById('btnExportExcel').addEventListener('click', () => this.exportToExcel());
        document.getElementById('btnExportPdf').addEventListener('click', () => this.exportToPDF());
    }

    /**
     * Exportar a Excel
     */
    exportToExcel() {
        try {
            const data = dashboard.currentData;
            if (data.length === 0) {
                alert('No hay datos para exportar');
                return;
            }

            // Preparar datos para Excel
            const exportData = data.map(record => ({
                'Código': record.codigo,
                'Auditoría': record.auditoria,
                'Origen': record.origen,
                'Proceso': record.proceso_display || record.proceso,
                'Criticidad': record.criticidad,
                'Estado': record.estado,
                'Descripción': record.descripcion,
                'Responsable': record.responsable_proceso,
                'Tipo Acción': record.tipo_accion,
                'Avance %': record.avance_porcentaje,
                'Fecha Detección': this.formatDateForExport(record.fecha_deteccion),
                'Fecha Compromiso': this.formatDateForExport(record.fecha_compromiso),
                'Fecha Cierre': this.formatDateForExport(record.fecha_cierre),
                'Validación': record.resultado_validacion,
                'Reincidente': record.es_reincidente ? 'Sí' : 'No',
                'Días Vencidos': record.dias_vencidos
            }));

            // Crear workbook
            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Hallazgos');

            // Ajustar anchos de columna
            const colWidths = [
                { wch: 15 }, // Código
                { wch: 20 }, // Auditoría
                { wch: 15 }, // Origen
                { wch: 25 }, // Proceso
                { wch: 12 }, // Criticidad
                { wch: 15 }, // Estado
                { wch: 30 }, // Descripción
                { wch: 20 }, // Responsable
                { wch: 18 }, // Tipo Acción
                { wch: 10 }, // Avance
                { wch: 15 }, // Fecha Detección
                { wch: 15 }, // Fecha Compromiso
                { wch: 15 }, // Fecha Cierre
                { wch: 15 }, // Validación
                { wch: 12 }, // Reincidente
                { wch: 15 }  // Días Vencidos
            ];
            ws['!cols'] = colWidths;

            // Formato de encabezado
            const range = XLSX.utils.decode_range(ws['!ref']);
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const address = XLSX.utils.encode_col(C) + '1';
                if (!ws[address]) continue;
                ws[address].s = {
                    font: { bold: true, color: { rgb: 'FFFFFF' } },
                    fill: { fgColor: { rgb: '0066CC' } },
                    alignment: { horizontal: 'center', vertical: 'center' }
                };
            }

            // Descargar
            XLSX.writeFile(wb, `${this.filename}.xlsx`);
            console.log('✓ Datos exportados a Excel');
            this.showNotification('Archivo Excel descargado correctamente');
        } catch (error) {
            console.error('✗ Error al exportar Excel:', error);
            alert('Error al exportar a Excel: ' + error.message);
        }
    }

    /**
     * Exportar a PDF
     */
    exportToPDF() {
        try {
            const data = dashboard.currentData;
            if (data.length === 0) {
                alert('No hay datos para exportar');
                return;
            }

            // Crear contenido HTML para PDF
            let html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        h1 { color: #0066cc; text-align: center; margin-bottom: 30px; }
                        .metadata { background: #f0f0f0; padding: 10px; margin-bottom: 20px; border-radius: 5px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th { background-color: #0066cc; color: white; padding: 10px; text-align: left; font-weight: bold; }
                        td { padding: 8px; border-bottom: 1px solid #ddd; }
                        tr:nth-child(even) { background-color: #f9f9f9; }
                        .page-break { page-break-after: always; margin: 20px 0; }
                        .footer { text-align: center; margin-top: 30px; font-size: 10px; color: #999; }
                    </style>
                </head>
                <body>
                    <h1>Dashboard de Auditoría - Seguimiento de Hallazgos</h1>
                    
                    <div class="metadata">
                        <p><strong>Fecha de Generación:</strong> ${new Date().toLocaleString('es-ES')}</p>
                        <p><strong>Total de Registros:</strong> ${data.length}</p>
                        <p><strong>Filtros Aplicados:</strong> ${this.getAppliedFiltersText()}</p>
                    </div>

                    <h2>Resumen Ejecutivo</h2>
                    <table>
                        <tr>
                            <th>Métrica</th>
                            <th>Valor</th>
                        </tr>
            `;

            // Agregar KPIs
            const stats = dataManager.getStatistics(data);
            html += `
                        <tr><td>Total Hallazgos</td><td>${stats.total}</td></tr>
                        <tr><td>Hallazgos Críticos (Alto)</td><td>${stats.criticos}</td></tr>
                        <tr><td>Hallazgos Medios</td><td>${stats.medios}</td></tr>
                        <tr><td>Hallazgos Bajos</td><td>${stats.bajos}</td></tr>
                        <tr><td>Hallazgos Cerrados</td><td>${stats.cerrados}</td></tr>
                        <tr><td>Hallazgos Vencidos</td><td>${stats.vencidos}</td></tr>
                        <tr><td>% Cumplimiento Global</td><td>${stats.pct_cumplimiento}%</td></tr>
                        <tr><td>% Avance Promedio</td><td>${stats.avance_promedio}%</td></tr>
                    </table>

                    <div class="page-break"></div>

                    <h2>Detalle de Hallazgos</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Código</th>
                                <th>Auditoría</th>
                                <th>Origen</th>
                                <th>Proceso</th>
                                <th>Criticidad</th>
                                <th>Estado</th>
                                <th>Avance %</th>
                                <th>Responsable</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            // Agregar registros
            data.slice(0, 100).forEach(record => {
                html += `
                            <tr>
                                <td>${this.escapeHtml(record.codigo)}</td>
                                <td>${this.escapeHtml(record.auditoria)}</td>
                                <td>${this.escapeHtml(record.origen)}</td>
                                <td>${this.escapeHtml(record.proceso_display || record.proceso).substring(0, 30)}</td>
                                <td>${this.escapeHtml(record.criticidad)}</td>
                                <td>${this.escapeHtml(record.estado)}</td>
                                <td>${record.avance_porcentaje}%</td>
                                <td>${this.escapeHtml(record.responsable_proceso)}</td>
                            </tr>
                `;
            });

            if (data.length > 100) {
                html += `<tr><td colspan="8" style="text-align: center; font-style: italic;">... y ${data.length - 100} registros más</td></tr>`;
            }

            html += `
                        </tbody>
                    </table>

                    <div class="footer">
                        <p>Este documento fue generado automáticamente por el Dashboard de Auditoría</p>
                        <p>Politécnico Grancolombiano - ${new Date().getFullYear()}</p>
                    </div>
                </body>
                </html>
            `;

            // Usar html2pdf para generar PDF
            const element = document.createElement('div');
            element.innerHTML = html;

            const opt = {
                margin: 10,
                filename: `${this.filename}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { orientation: 'landscape', unit: 'mm', format: 'a4' }
            };

            html2pdf().set(opt).from(element).save();
            console.log('✓ Datos exportados a PDF');
            this.showNotification('Archivo PDF descargado correctamente');
        } catch (error) {
            console.error('✗ Error al exportar PDF:', error);
            alert('Error al exportar a PDF: ' + error.message);
        }
    }

    /**
     * Exportar a CSV
     */
    exportToCSV() {
        try {
            const data = dashboard.currentData;
            if (data.length === 0) {
                alert('No hay datos para exportar');
                return;
            }

            // Preparar CSV
            const headers = [
                'Código',
                'Auditoría',
                'Origen',
                'Proceso',
                'Criticidad',
                'Estado',
                'Descripción',
                'Responsable',
                'Tipo Acción',
                'Avance %',
                'Fecha Detección',
                'Fecha Compromiso',
                'Validación',
                'Reincidente'
            ];

            let csv = headers.map(h => `"${h}"`).join(',') + '\n';

            data.forEach(record => {
                const row = [
                    this.escapeCSV(record.codigo),
                    this.escapeCSV(record.auditoria),
                    this.escapeCSV(record.origen),
                    this.escapeCSV(record.proceso_display || record.proceso),
                    this.escapeCSV(record.criticidad),
                    this.escapeCSV(record.estado),
                    this.escapeCSV(record.descripcion),
                    this.escapeCSV(record.responsable_proceso),
                    this.escapeCSV(record.tipo_accion),
                    record.avance_porcentaje,
                    this.formatDateForExport(record.fecha_deteccion),
                    this.formatDateForExport(record.fecha_compromiso),
                    this.escapeCSV(record.resultado_validacion),
                    record.es_reincidente ? 'Sí' : 'No'
                ];
                csv += row.map(cell => `"${cell}"`).join(',') + '\n';
            });

            // Descargar
            this.downloadFile(csv, `${this.filename}.csv`, 'text/csv');
            console.log('✓ Datos exportados a CSV');
            this.showNotification('Archivo CSV descargado correctamente');
        } catch (error) {
            console.error('✗ Error al exportar CSV:', error);
            alert('Error al exportar a CSV: ' + error.message);
        }
    }

    /**
     * Utilidades
     */
    formatDateForExport(dateInput) {
        if (!dateInput) return '';
        const date = dataManager.parseDate(dateInput);
        if (!date) return '';
        return date.toLocaleDateString('es-ES');
    }

    escapeCSV(str) {
        if (!str) return '';
        return String(str).replace(/"/g, '""');
    }

    escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    getAppliedFiltersText() {
        const filters = filterManager.getCurrentFilters();
        const parts = [];

        if (filters.proceso) parts.push(`Proceso: ${filters.proceso}`);
        if (filters.auditoria) parts.push(`Auditoría: ${filters.auditoria}`);
        if (filters.criticidad) parts.push(`Criticidad: ${filters.criticidad}`);
        if (filters.estado) parts.push(`Estado: ${filters.estado}`);
        if (filters.origen) parts.push(`Origen: ${filters.origen}`);

        return parts.length > 0 ? parts.join(' | ') : 'Ninguno';
    }

    downloadFile(content, filename, type) {
        const blob = new Blob([content], { type: type });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }

    showNotification(message) {
        const toast = document.createElement('div');
        toast.className = 'position-fixed bottom-0 end-0 m-3 alert alert-success alert-dismissible fade show';
        toast.style.zIndex = '9999';
        toast.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

// Exportar instancia global
const exportManager = new ExportManager();
