/**
 * FILTERS - Gestión de filtros globales
 * Filtros: Proceso, Subproceso, Auditoría
 */

class FilterManager {
    constructor() {
        this.currentFilters = {
            proceso: '',
            subproceso: '',
            auditoria: ''
        };
        this.storageKey = 'dashboard_filters';
    }

    /**
     * Inicializar filtros
     */
    initFilters() {
        this.attachEventListeners();
        this.populateFilterOptions();
        this.loadFilters();
        this.applyFilters();
        console.log('✓ Filtros inicializados');
    }

    /**
     * Adjuntar event listeners
     */
    attachEventListeners() {
        document.getElementById('filterProceso').addEventListener('change', (e) => {
            this.currentFilters.proceso = e.target.value;
            this.updateSubprocesoOptions();
            this.currentFilters.subproceso = '';
            document.getElementById('filterSubproceso').value = '';
            this.applyFilters();
        });

        document.getElementById('filterSubproceso').addEventListener('change', (e) => {
            this.currentFilters.subproceso = e.target.value;
            this.applyFilters();
        });

        document.getElementById('filterAuditoria').addEventListener('change', (e) => {
            this.currentFilters.auditoria = e.target.value;
            this.applyFilters();
        });

        document.getElementById('btnLimpiarFiltros').addEventListener('click', () => {
            this.clearFilters();
        });
    }

    /**
     * Llenar opciones de filtros
     */
    populateFilterOptions() {
        // Procesos únicos (solo columna Proceso, sin subproceso concatenado)
        const procesos = dataManager.getUniqueProcesos();
        const selectProceso = document.getElementById('filterProceso');
        selectProceso.innerHTML = '<option value="">-- Todos los Procesos --</option>';
        procesos.forEach(proceso => {
            const option = document.createElement('option');
            option.value = proceso;
            option.textContent = proceso;
            selectProceso.appendChild(option);
        });

        // Subprocesos (todos inicialmente)
        this.updateSubprocesoOptions();

        // Auditorías
        const auditorias = dataManager.getAuditorias();
        const selectAuditoria = document.getElementById('filterAuditoria');
        selectAuditoria.innerHTML = '<option value="">-- Todas las Auditorías --</option>';
        auditorias.forEach(auditoria => {
            const option = document.createElement('option');
            option.value = auditoria;
            option.textContent = auditoria;
            selectAuditoria.appendChild(option);
        });
    }

    /**
     * Actualizar opciones de subproceso según proceso seleccionado
     */
    updateSubprocesoOptions() {
        const selectSubproceso = document.getElementById('filterSubproceso');
        selectSubproceso.innerHTML = '<option value="">-- Todos los Subprocesos --</option>';

        const subprocesos = dataManager.getSubprocesosFiltrados(this.currentFilters.proceso);
        subprocesos.forEach(subproceso => {
            const option = document.createElement('option');
            option.value = subproceso;
            option.textContent = subproceso;
            selectSubproceso.appendChild(option);
        });
    }

    /**
     * Aplicar filtros
     */
    applyFilters() {
        let filteredData = dataManager.filterData(this.currentFilters);

        // Guardar en localStorage
        this.saveFilters();

        // Actualizar dashboard
        dashboard.updateDashboard(filteredData);

        console.log(`✓ Filtros aplicados: ${filteredData.length} registros`);
    }

    /**
     * Limpiar filtros
     */
    clearFilters() {
        this.currentFilters = {
            proceso: '',
            subproceso: '',
            auditoria: ''
        };

        document.getElementById('filterProceso').value = '';
        document.getElementById('filterSubproceso').value = '';
        document.getElementById('filterAuditoria').value = '';

        this.updateSubprocesoOptions();
        this.applyFilters();
    }

    /**
     * Guardar filtros en localStorage
     */
    saveFilters() {
        const filters = {
            ...this.currentFilters,
            timestamp: new Date().toISOString()
        };
        localStorage.setItem(this.storageKey, JSON.stringify(filters));
    }

    /**
     * Cargar filtros desde localStorage
     */
    loadFilters() {
        const stored = localStorage.getItem(this.storageKey);
        if (!stored) return;

        try {
            const filters = JSON.parse(stored);
            const procesosValidos = new Set(dataManager.getUniqueProcesos());
            const auditoriasValidas = new Set(dataManager.getAuditorias());

            if (filters.proceso && procesosValidos.has(filters.proceso)) {
                this.currentFilters.proceso = filters.proceso;
            } else if (filters.proceso) {
                console.warn('⚠ Filtro de proceso obsoleto descartado:', filters.proceso);
            }

            if (filters.auditoria && auditoriasValidas.has(filters.auditoria)) {
                this.currentFilters.auditoria = filters.auditoria;
            }

            document.getElementById('filterProceso').value = this.currentFilters.proceso;
            this.updateSubprocesoOptions();

            const subprocesosValidos = new Set(
                dataManager.getSubprocesosFiltrados(this.currentFilters.proceso)
            );
            if (filters.subproceso && subprocesosValidos.has(filters.subproceso)) {
                this.currentFilters.subproceso = filters.subproceso;
            }
            document.getElementById('filterSubproceso').value = this.currentFilters.subproceso;
            document.getElementById('filterAuditoria').value = this.currentFilters.auditoria;

            if (this.currentFilters.proceso || this.currentFilters.subproceso || this.currentFilters.auditoria) {
                console.log('✓ Filtros restaurados desde localStorage');
            }
        } catch (error) {
            console.warn('⚠ Error al restaurar filtros:', error);
        }
    }

    /**
     * Obtener filtros actuales
     */
    getCurrentFilters() {
        return { ...this.currentFilters };
    }
}

// Exportar instancia global
const filterManager = new FilterManager();
